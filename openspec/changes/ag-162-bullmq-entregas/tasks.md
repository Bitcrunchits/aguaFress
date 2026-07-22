# Tasks: AG-162 — BullMQ Async Processing para Entregas-Service

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–750 (net code-only: ~400–500) |
| Estimated changed files | 20–22 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR1 contracts/env → PR2 gateway → PR3 prisma/tracking → PR4 worker/tests → PR5 verify |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contracts + env config | PR 1 | base = `feat/ag-162-bullmq-async-processing`; additive, no runtime impact |
| 2 | Gateway enqueue + HTTP tests | PR 2 | base = PR 1; gateway-only, worker doesn't exist yet (jobs queue up) |
| 3 | Prisma schema + tracking repository | PR 3 | base = PR 2; entregas-service DB layer |
| 4 | Worker + processor + classifier + unit tests + TCP cleanup | PR 4 | base = PR 3; jobs start processing |
| 5 | Final verification | PR 5 | base = PR 4; contracts build + all tests + Prisma validate |

---

## Phase 1: PR 1 — Contracts + Env Config

- [ ] **T1**: Add `DeliveryJobStatus` enum to `packages/contracts/src/enums.ts` (PENDING, PROCESSING, RETRYING, COMPLETED, FAILED, DEAD_LETTER)
- [ ] **T2**: Add DTOs to `packages/contracts/src/dto/deliveries.dto.ts`: `UpdateDeliveryStatusJobData`, `DeliveryJobStatusResponse` (or reuse `AsyncAcceptedResponse`)
- [ ] **T3**: Add env defaults + `GatewayEnv` fields + `createGatewayEnv` parsing in `MicroServices/gateway/src/config/env.config.ts` for `DELIVERIES_QUEUE_NAME`, `DELIVERIES_QUEUE_ATTEMPTS`, `DELIVERIES_QUEUE_BACKOFF_MS`, `DELIVERIES_QUEUE_REMOVE_ON_COMPLETE`
- [ ] **T4**: Add env helper functions to `MicroServices/entregas-service/src/common/config/env.config.ts` for `DELIVERIES_QUEUE_NAME`, `DELIVERIES_QUEUE_ATTEMPTS`, `DELIVERIES_WORKER_CONCURRENCY`, `REDIS_URL`
- [ ] **VERIFY**: Run `pnpm --filter contracts build` and `pnpm --filter gateway test` (env config tests pass)

## Phase 2: PR 2 — Gateway Queue (Producer) + HTTP Tests

- [ ] **T5**: Create `MicroServices/gateway/src/queues/deliveries-queue.provider.ts` — `BullMqDeliveriesQueue`, symbol `DELIVERIES_UPDATE_STATUS_QUEUE`, factory provider (follow `orders-queue.provider.ts` pattern)
- [ ] **T6**: Create `MicroServices/gateway/src/queues/deliveries-queue.module.ts` — register provider + `DeliveriesQueueService`, export the service
- [ ] **T7**: Create `MicroServices/gateway/src/queues/deliveries-queue.service.ts` — `enqueue()` with deterministic `jobId = deliveries.update_status:{deliveryId}:{idempotencyKey}`, returns `AsyncAcceptedResponse`
- [ ] **T8**: Update `MicroServices/gateway/src/actions/action-registry.ts` — add `ASYNC_QUEUE_NAMES.DELIVERIES_UPDATE_STATUS = 'deliveries.update_status'`, set `asyncQueue` on `deliveries.update-status` mapping with `roles: ['vendedor']`
- [ ] **T9**: Update `MicroServices/gateway/src/gateway.controller.ts` — add `asyncQueue === 'deliveries.update_status'` check in `handlePatchAction()` BEFORE TCP dispatch (parse vendedorId, validate idempotency key, return 202)
- [ ] **T10**: Register `DeliveriesQueueModule` in `MicroServices/gateway/src/app.module.ts`
- [ ] **T11**: Add HTTP tests in `MicroServices/gateway/test/gateway.http.spec.ts` for deliveries async: 202 with header key, 202 with body key, 400 missing key, 400 key mismatch, 403 wrong role, 401 no JWT, list/get remain TCP
- [ ] **VERIFY**: Run `pnpm --filter gateway test` — all existing + new tests pass

## Phase 3: PR 3 — Prisma Schema + Tracking Repository

- [ ] **T12**: Add `DeliveryJobStatus` enum + `DeliveryCommandJob` model to `MicroServices/entregas-service/prisma/schema.prisma` (fields: id, tracking_id, job_id, delivery_id, vendedor_id, actor_user_id, estado, notas, status, idempotency_key, payload_hash, error_code, error_message, attempts, timestamps; unique `(delivery_id, idempotency_key)`)
- [ ] **T13**: Add interfaces + methods to `MicroServices/entregas-service/src/deliveries/deliveries.repository.ts`: `CreateDeliveryCommandJobInput`, `UpdateDeliveryCommandJobStatusInput`, `DeliveryCommandJobRecord`, `createDeliveryCommandJob()`, `findDeliveryCommandByIdempotency()`, `findDeliveryCommandByTrackingId()`, `updateDeliveryCommandJobStatus()`
- [ ] **T14**: Run `pnpm --filter entregas-service exec prisma validate && pnpm --filter entregas-service exec prisma generate`
- [ ] **VERIFY**: Run `pnpm --filter entregas-service test` — repository tests pass (create, find by idempotency, update status, duplicate key)

## Phase 4: PR 4 — Worker + Processor + Classifier + Unit Tests + TCP Cleanup

- [ ] **T15**: Create `MicroServices/entregas-service/src/common/jobs/delivery-status-update.processor.ts` — calls `DeliveryCommandTrackingService` + `DeliveriesService.updateStatus()`, classifies failures (follow `order-create-job.processor.ts` pattern)
- [ ] **T16**: Create `MicroServices/entregas-service/src/common/jobs/delivery-command-tracking.service.ts` — `registerPending()` (with payload fingerprint conflict detection), `transitionStatus()` (atomic optimistic lock via `updateMany`), `findByTrackingId()` (follow `order-command-tracking.service.ts`)
- [ ] **T17**: Create `MicroServices/entregas-service/src/common/jobs/delivery-failure-classifier.ts` — `classifyDeliveryJobFailure()` with retryable (5xx/network) vs terminal (4xx business) vs dead-letter (retries exhausted) classification
- [ ] **T18**: Create `MicroServices/entregas-service/src/common/jobs/delivery-status-update.worker.ts` — BullMQ `Worker`, `OnModuleInit/OnModuleDestroy`, connects to `DELIVERIES_QUEUE_NAME` queue, concurrency from env config
- [ ] **T19**: Create `MicroServices/entregas-service/src/common/jobs/jobs.module.ts` — register worker + processor + tracking service + classifier, import `CommonModule` + `DeliveriesModule`
- [ ] **T20**: Import `JobsModule` in `MicroServices/entregas-service/src/app.module.ts`
- [ ] **T21**: Remove `deliveries.update_status` TCP handler from `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.ts` (lines 33–40), keep `list` and `get` handlers unchanged
- [ ] **T22**: Add unit tests:
  - `delivery-status-update.processor.spec.ts` — happy path, delivery not found, invalid transition, retryable error, duplicate idempotency key
  - `delivery-command-tracking.service.spec.ts` — register + transition state machine (PENDING→PROCESSING→COMPLETED, PROCESSING→FAILED, PROCESSING→RETRYING, RETRYING→PROCESSING, RETRYING→DEAD_LETTER), payload fingerprint conflict, duplicate key detection
  - `delivery-failure-classifier.spec.ts` — 4xx terminal, 5xx retryable, network error retryable, retries exhausted → dead-letter
  - `delivery-status-update.worker.spec.ts` — worker lifecycle (init, destroy), job failure logging
- [ ] **VERIFY**: Run `pnpm --filter entregas-service test` — all new unit tests pass

## Phase 5: PR 5 — Final Verification

- [ ] **T23**: Run full verification: `pnpm --filter contracts build && pnpm --filter gateway test && pnpm --filter entregas-service test && pnpm --filter entregas-service exec prisma validate`
- [ ] **T24**: Confirm no dead code, no `console.log`, no `any`, no `userId` in body, imports are clean
- [ ] **T25**: Confirm `deliveries.job_status` endpoint availability for tracking queries (TCP handler or add if missing)
