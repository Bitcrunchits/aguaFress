# Design: AG-162 — BullMQ Async Processing para Entregas-Service

## Technical Approach

Misma estructura que orders.create (AG-161): gateway enqueue + entregas-service worker con tracking de estados, retry y failure classifier. El gateway valida JWT, rol, idempotency key, y enqueues a `deliveries.update_status`. El worker llama `DeliveriesService.updateStatus()` — sin duplicar lógica de negocio.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Queue name | `deliveries.update_status` | `deliveries.status-update` | Coincide con TCP pattern existente para trazabilidad |
| Job files location | `src/common/jobs/` | `src/deliveries/jobs/` | Instrucción explícita; evita crear sub-módulo en dominio pequeño |
| Tracking unique | `(deliveryId, idempotencyKey)` | `(vendedorId, idempotencyKey)` | El deliveryId ya identifica el contexto del vendedor; más simple que orders |
| PATCH async check | Agregar `if (mapping.asyncQueue === 'deliveries.update_status')` en `handlePatchAction` | Refactor a handler genérico | Mínimo cambio; mismo patrón que POST handler existente |
| Tracking repository | Nuevos métodos en `PrismaDeliveriesRepository` | Repositorio separado Sigue el patrón de orders, donde tracking vive en el mismo repositorio que la entidad principal |
| `DeliveryJobStatus` enum | Reusar `DeliveryJobStatus` (mismos valores que `OrderJobStatus`) | Reusar `OrderJobStatus` directamente | Tipos separados por dominio evita acoplamiento; OCP-friendly |

## Data Flow

```text
PATCH /api/v1/deliveries/update-status
  └─ GatewayController.handlePatchAction()
     ├─ valida JWT + rol vendedor
     ├─ lee Idempotency-Key (header o body)
     ├─ mapping.asyncQueue === 'deliveries.update_status'
     └─ DeliveriesQueueService.enqueue()
        └─ BullMQ deliveries.update_status queue (Redis)
           └─ entregas-service DeliveryStatusUpdateWorker
              ├─ DeliveryCommandTrackingService.registerPending()
              │  └─ upsert DELIVERY_COMMAND_JOB (idempotent, race-safe)
              ├─ transitionStatus: PENDING → PROCESSING
              ├─ DeliveriesService.updateStatus() ← existing business logic
              │  ├─ valida entrega existe + vendedor owns delivery + transición válida
              │  ├─ actualiza delivery en DB
              │  └─ publica eventos (DeliveryStarted / DeliveryCompleted / DeliveryStatusChanged)
              └─ transitionStatus: PROCESSING → COMPLETED / FAILED / DEAD_LETTER

GET /api/v1/deliveries/job-status?id={trackingId}
  └─ TCP deliveries.job_status ──→ entregas-service
       └─ DeliveryCommandTrackingService.findByTrackingId()
```

## File Changes

### Contracts — New types

| File | Action | Description |
|---|---|---|
| `packages/contracts/src/enums.ts` | Modify | Add `DeliveryJobStatus` enum (PENDING, PROCESSING, RETRYING, COMPLETED, FAILED, DEAD_LETTER) |
| `packages/contracts/src/dto/deliveries.dto.ts` | Modify | Add `UpdateDeliveryStatusJobData`, `DeliveryJobStatusResponse`, `DeliveryAsyncAcceptedResponse` (or reuse `AsyncAcceptedResponse`) |

### Workstream 1: Gateway Async Enqueue

| File | Action | Description |
|---|---|---|
| `MicroServices/gateway/src/queues/deliveries-queue.provider.ts` | Create | BullMQ Queue provider — symbol `DELIVERIES_UPDATE_STATUS_QUEUE`, `BullMqDeliveriesQueue`, factory provider |
| `MicroServices/gateway/src/queues/deliveries-queue.module.ts` | Create | Module: providers + exports `DeliveriesQueueService` |
| `MicroServices/gateway/src/queues/deliveries-queue.service.ts` | Create | `enqueue()` with deterministic `jobId = deliveries.update_status:{deliveryId}:{idempotencyKey}` |
| `MicroServices/gateway/src/gateway.controller.ts` | Modify | Add `asyncQueue` check in `handlePatchAction` (lines 131): `if (mapping.asyncQueue === 'deliveries.update_status')` — returns 202 |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modify | `ASYNC_QUEUE_NAMES.DELIVERIES_UPDATE_STATUS = 'deliveries.update_status'`; `deliveries.update-status` action adds `asyncQueue` |
| `MicroServices/gateway/src/config/env.config.ts` | Modify | Add `DELIVERIES_QUEUE_NAME`, `_ATTEMPTS`, `_BACKOFF_MS`, `_REMOVE_ON_COMPLETE` defaults + validation |
| `MicroServices/gateway/src/app.module.ts` | Modify | Import `DeliveriesQueueModule` |

### Workstream 2: Entregas Worker + Tracking

| File | Action | Description |
|---|---|---|
| `MicroServices/entregas-service/prisma/schema.prisma` | Modify | Add `DeliveryJobStatus` enum + `DeliveryCommandJob` model mapped to `DELIVERY_COMMAND_JOB` |
| `MicroServices/entregas-service/src/common/jobs/delivery-status-update.worker.ts` | Create | BullMQ Worker — `OnModuleInit`/`OnModuleDestroy`, connects to Redis, concurrency 1 |
| `MicroServices/entregas-service/src/common/jobs/delivery-status-update.processor.ts` | Create | Processor: calls `DeliveryCommandTrackingService` + `DeliveriesService.updateStatus()` |
| `MicroServices/entregas-service/src/common/jobs/delivery-command-tracking.service.ts` | Create | `registerPending()`, `transitionStatus()`, `findByTrackingId()` |
| `MicroServices/entregas-service/src/common/jobs/delivery-failure-classifier.ts` | Create | Classify errors: retryable (5xx/network) vs terminal (4xx) vs dead-letter (retries exhausted) |
| `MicroServices/entregas-service/src/common/jobs/jobs.module.ts` | Create | Module importing `CommonModule`, `DeliveriesModule`, providers for all job services |
| `MicroServices/entregas-service/src/deliveries/deliveries.repository.ts` | Modify | Add `DeliveryCommandJob` CRUD methods: `createDeliveryCommandJob`, `findDeliveryCommandByIdempotency`, `findDeliveryCommandByTrackingId`, `updateDeliveryCommandJobStatus` |
| `MicroServices/entregas-service/src/deliveries/deliveries.repository.ts` | Modify | Add `DeliveryCommandJobRecord` interface + `CreateDeliveryCommandJobInput`/`UpdateDeliveryCommandJobStatusInput` |
| `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.ts` | Modify | Remove `deliveries.update_status` handler (lines 33-40) |
| `MicroServices/entregas-service/src/app.module.ts` | Modify | Import `JobsModule` |

### Env / Infra

| File | Action | Description |
|---|---|---|
| `MicroServices/gateway/.env.example` | Modify | Add `DELIVERIES_*` queue env vars |
| `MicroServices/entregas-service/.env.example` | Modify | Add `REDIS_URL`, `DELIVERIES_QUEUE_*` env vars |
| `MicroServices/entregas-service/src/common/config/env.config.ts` | Modify | Add delivery queue env var helpers |

## Interfaces / Contracts

### New in `packages/contracts/src/enums.ts`
```typescript
export enum DeliveryJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RETRYING = 'RETRYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}
```

### New in `packages/contracts/src/dto/deliveries.dto.ts`
```typescript
export interface UpdateDeliveryStatusJobData {
  jobId: string;
  trackingId: string;
  deliveryId: string;
  vendedorId: string;
  actorUserId: string;
  idempotencyKey: string;
  body: { estado: DeliveryEstado.EN_CAMINO | DeliveryEstado.ENTREGADA; notas?: string };
  requestedAt: string;
}

export interface DeliveryJobStatusResponse {
  jobId: string;
  trackingId: string;
  deliveryId: string;
  vendedorId: string;
  status: DeliveryJobStatus;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}
```

### Prisma model
```prisma
enum DeliveryJobStatus {
  PENDING
  PROCESSING
  RETRYING
  COMPLETED
  FAILED
  DEAD_LETTER
}

model DeliveryCommandJob {
  id                String           @id @default(uuid()) @db.Uuid
  tracking_id       String           @unique @db.Uuid
  job_id            String           @unique @db.VarChar(255)
  delivery_id       String           @db.Uuid
  vendedor_id       String           @db.Uuid
  actor_user_id     String           @db.Uuid
  estado            DeliveryEstado
  notas             String?          @db.Text
  estado_anterior   DeliveryEstado?
  status            DeliveryJobStatus @default(PENDING)
  idempotency_key   String           @db.VarChar(255)
  payload_fingerprint String         @db.VarChar(64)
  error_code        String?          @db.VarChar(100)
  error_message     String?          @db.Text
  attempts          Int              @default(0)
  created_at        DateTime         @default(now())
  updated_at        DateTime         @updatedAt

  @@unique([delivery_id, idempotency_key])
  @@index([status])
  @@index([created_at])
  @@map("DELIVERY_COMMAND_JOB")
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Contracts | `DeliveryJobStatus` enum + DTOs compile | `pnpm --filter @agua/contracts build` |
| Gateway unit | idempotency validation, 202 response, enqueue service mocked, TCP unchanged for list/get | `pnpm --filter @agua/gateway test` |
| Entregas unit | tracking transitions, duplicate idempotency, payload conflict, failure classifier | `pnpm --filter @agua/entregas-service test` |
| Prisma | schema validity + client generation | `pnpm --filter @agua/entregas-service prisma:validate && prisma:generate` |

## Migration / Rollout

1. **Contracts + Prisma**: Desplegar schema `DELIVERY_COMMAND_JOB` y tipos primero (additive, no breaking)
2. **Gateway**: Desplegar enqueue + action registry update (aún no hay worker, jobs quedan en cola)
3. **Entregas**: Desplegar worker + tracking + remove TCP handler (jobs empiezan a procesarse)
4. **Rollback**: Restaurar TCP handler `deliveries.update_status`, apagar worker, tabla `DELIVERY_COMMAND_JOB` queda como stub no usado
