# Design: Orders BullMQ Resilience

## Technical Approach

`orders.create` becomes the only async pilot path. Gateway keeps auth, role checks, request normalization, idempotency-key validation, and BullMQ enqueue. `orders-service` owns durable command tracking, idempotency, worker execution, business rules, final order persistence, and status lookup. Existing TCP mappings remain for reads and lifecycle actions.

No `openspec/config.yaml` exists, so only repository and AGENTS rules apply.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Transport split | Add gateway queue module/service beside `TcpDispatcherService` | Put BullMQ in `TcpDispatcherService` | Preserves SRP: TCP dispatch and queue enqueue change for different reasons. |
| Tracking owner | Persist tracking/idempotency in `orders-service` DB | Gateway pre-registers tracking | Keeps business-command state with order creation owner and avoids gateway business persistence. |
| Idempotency | Deterministic BullMQ `jobId = orders.create:{clienteId}:{idempotencyKey}` plus DB unique `(cliente_id, idempotency_key)` | Random job IDs only | Protects both duplicate enqueue and duplicate business creation. |
| Worker boundary | Worker calls `OrdersService.create()` through a command service; repository handles state transitions | Duplicate order rules in processor | Protects DIP/SRP and avoids two order-creation implementations. |
| Failure model | Retry transient failures; terminal validation/business failures become `FAILED`; exhausted retry moves to `DEAD_LETTER` | Retry every error forever | Prevents poison jobs while keeping transient dependency outages recoverable. |

## Data Flow

```text
POST /api/v1/orders/create
  └─ GatewayController builds TcpCommandPayload + reads Idempotency-Key
     └─ OrdersCreateQueueService.add(jobId, payload)
        └─ Redis/BullMQ orders.create queue
           └─ orders-service OrdersCreateWorker
              ├─ OrderCommandTrackingService: PENDING/PROCESSING/RETRYING
              ├─ OrdersService.create(): rules + repository transaction
              └─ OrderCommandTrackingService: COMPLETED/FAILED/DEAD_LETTER

GET /api/v1/orders/job-status?id={trackingId|jobId}
  └─ TCP orders.job_status ──→ orders-service tracking lookup
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/contracts/src/enums.ts` | Modify | Add `OrderJobStatus` enum: `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, `DEAD_LETTER`. |
| `packages/contracts/src/dto/orders.dto.ts` | Modify | Add `AsyncAcceptedResponse`, `OrderJobStatusResponse`, `CreateOrderJobData`, idempotency metadata DTOs; keep flat interfaces. |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modify | Mark `orders.create` as async queue action without affecting TCP actions. |
| `MicroServices/gateway/src/queues/*` | Create | `OrdersQueueModule`, queue provider, `OrdersCreateQueueService`, deterministic job-id builder. |
| `MicroServices/gateway/src/gateway.controller.ts` | Modify | Route only POST `orders/create` to queue service and return 202. Other actions stay TCP. |
| `MicroServices/gateway/src/config/env.config.ts` | Modify | Validate `REDIS_URL`, queue name, attempts/backoff defaults. |
| `MicroServices/orders-service/prisma/schema.prisma` | Modify | Add `OrderCommandJob` model mapped to `ORDER_COMMAND_JOB`. |
| `MicroServices/orders-service/src/orders/jobs/*` | Create | Worker, processor, failure classifier, tracking service. |
| `MicroServices/orders-service/src/orders/orders.controller.ts` | Modify | Add `orders.job_status`; remove/deprecate sync `orders.create` after gateway cutover. |
| `MicroServices/orders-service/src/orders/orders.repository.ts` | Modify | Add tracking/idempotency methods and atomic state updates. |
| `docker-compose.yml`, `.env.example` | Modify | Wire Redis/queue env to gateway and orders-service. |

## Interfaces / Contracts

Use existing enum style in contracts. `AsyncAcceptedResponse` returns `jobId`, `trackingId`, `status`, `statusUrl`, `acceptedAt`. `OrderJobStatusResponse` returns IDs, `status`, optional `orderId`, `errorCode`, `errorMessage`, `attempts`, ISO `createdAt/updatedAt`. Request idempotency comes from `Idempotency-Key` header or body `idempotencyKey`; gateway must reject missing/mismatched values.

Prisma tracking shape: `id @default(uuid())`, `tracking_id @unique`, `job_id @unique`, `cliente_id`, `idempotency_key`, `payload_hash`, `status`, `order_id?`, `error_code?`, `error_message?`, `attempts`, timestamps, `@@unique([cliente_id, idempotency_key])`, `@@map("ORDER_COMMAND_JOB")`.

## BullMQ Configuration

Queue: `orders.create`. Gateway sets `jobId`, `attempts` default 3, exponential backoff, `removeOnComplete` bounded count, `removeOnFail: false`. Worker concurrency starts at 1 for the pilot. On BullMQ `failed`, tracking service maps retryable attempts to `RETRYING`; final exhausted failures become `DEAD_LETTER`. DLQ is represented by durable `DEAD_LETTER` rows plus retained failed BullMQ jobs; a future admin re-drive can be added out of scope.

## Testing Strategy

| Layer | What to Test | Command |
|---|---|---|
| Contracts | DTO/enum exports compile | `pnpm --filter @agua/contracts build` |
| Gateway unit/http | idempotency validation, 202 response, enqueue service mocked, TCP unchanged | `pnpm --filter @agua/gateway test` |
| Orders unit | tracking transitions, duplicate idempotency, failure classifier, worker calls `OrdersService` | `pnpm --filter @agua/orders-service test` |
| Prisma | schema validity/client generation | `pnpm --filter @agua/orders-service prisma:validate && pnpm --filter @agua/orders-service prisma:generate` |

## Migration / Rollout

Use additive schema changes first. Deploy contracts/env, then gateway enqueue, then orders tracking/worker. Keep TCP reads/lifecycle untouched. Rollback by restoring `orders.create` TCP mapping and disabling worker; tracking table can remain unused.

## Chained PR Slices

Force chained PRs under 400 changed lines: (1) contracts/env/deps, (2) gateway enqueue path/tests, (3) orders tracking schema/repository/tests, (4) worker/status/failure tests, (5) integration polish/docs only if needed.

## Status Route Decision

- [x] Use gateway action route `GET /api/v1/orders/job-status?id={trackingId}` for public status lookup. This matches the existing `/api/v1/{service}/{action}` action-router model and avoids introducing a separate dynamic REST alias for the pilot.
