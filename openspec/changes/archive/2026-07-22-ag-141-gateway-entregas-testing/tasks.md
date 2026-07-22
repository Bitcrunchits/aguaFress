# Tasks: AG-141 — Gateway Testing con Entregas-Service

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Gateway HTTP tests (T1) → PR 2: Events + DTO (T2–T9) |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Gateway HTTP coverage for deliveries | PR 1 | `feat/ag-141-gateway-testing` base — tests-only, no prod code changes |
| 2 | Event publishing + DTO alignment | PR 2 | PR 1 branch as parent — contracts, port, publisher, service, DTO |

## Phase 1: Contracts & Types Foundation

- [x] **T1** `packages/contracts/src/events.ts` — Add `clienteId: string` + `actorUserId: string` to `DeliveryStartedEvent` and `DeliveryCompletedEvent`
- [x] **T2** `MicroServices/entregas-service/src/deliveries/dto/query-deliveries.dto.ts` — Add `implements DeliveryListFilters` to `QueryDeliveriesDto` (import from `@agua/contracts`)
- [x] **T3** `MicroServices/entregas-service/src/deliveries/delivery-event-publisher.port.ts` — Add `import type { DeliveryStartedEvent, DeliveryCompletedEvent }` + add `publishStarted(event: DeliveryStartedEvent): Promise<void>` and `publishCompleted(event: DeliveryCompletedEvent): Promise<void>` to interface

> **⚠️ Design gap — clienteId source**: `DeliveryRecord` and the Prisma schema have no `cliente_id` column. The events require `clienteId` at runtime but the service has no source. Resolution options:
> - (A) Add `cliente_id` to Delivery Prisma schema + `clienteId` to `DeliveryRecord` + mapper — needs migration and creation-flow update
> - (B) Pass `clienteId` from the TCP controller payload — needs controller+service signature change
> - This must be resolved before T6–T7 (service wiring). **Recommendation**: option A for DIP compliance.
>
> Task **T9** below covers option A. If option B is chosen, replace T9 accordingly.

## Phase 2: Event Publisher — Implementation

- [x] **T4** `MicroServices/entregas-service/src/deliveries/delivery-event-publisher.redis.ts` — Implement `publishStarted` and `publishCompleted` via `this.redis.xadd(RedisStreams.DELIVERIES, '*', ...)` with all required fields + try/catch + logger.error + throw, matching `publishStatusChanged` pattern

## Phase 3: Event Wiring in Service

- [x] **T5** `MicroServices/entregas-service/src/deliveries/deliveries.service.ts` — In `updateStatus`, after successful `repository.updateStatus()`: if `dto.estado === DeliveryEstado.EN_CAMINO`, call `await this.eventPublisher.publishStarted({...})`; if `dto.estado === DeliveryEstado.ENTREGADA`, call `await this.eventPublisher.publishCompleted({...})`. Both alongside existing `publishStatusChanged` call.

## Phase 4: Tests

- [x] **T6** `MicroServices/entregas-service/src/deliveries/delivery-event-publisher.redis.spec.ts` — Add `publishStarted` describe block (test: correct XADD fields; test: error propagation) + `publishCompleted` describe block (same pattern). Use `jest.clearAllMocks()` and mock `xadd`.
- [x] **T7** `MicroServices/entregas-service/src/deliveries/deliveries.service.spec.ts` — Add `publishStarted` and `publishCompleted` to `mockPublisher`; update `PENDIENTE→EN_CAMINO` test to assert BOTH `publishStarted` AND `publishStatusChanged` called; update `EN_CAMINO→ENTREGADA` test to assert BOTH `publishCompleted` AND `publishStatusChanged` called.
- [x] **T8** `MicroServices/gateway/test/gateway.http.spec.ts` — Add 3 deliveries HTTP tests following activity-logs pattern (lines 447–495):
  - `deliveries.list`: mockDispatch → GET /api/v1/deliveries/list → 401 without JWT, 403 for cliente, 200 for vendedor, verify dispatch `deliveries.list`
  - `deliveries.get`: mockDispatch → GET /api/v1/deliveries/get?id=del-1 → 401/403/200, verify dispatch `deliveries.get`
  - `deliveries.update-status`: mockDispatch → PATCH /api/v1/deliveries/update-status → 401/403/200, verify dispatch `deliveries.update_status`

## Phase 5: Gap Resolution (choose before apply)

- [x] **T9** *(conditional)* Add `cliente_id` source for events:
  - `MicroServices/entregas-service/prisma/schema.prisma` — add `cliente_id String @db.Uuid`
  - `MicroServices/entregas-service/src/deliveries/deliveries.repository.ts` — add `clienteId: string` to `DeliveryRecord`
  - `MicroServices/entregas-service/src/deliveries/delivery.mapper.ts` — map `cliente_id` → `clienteId`
  - Generate Prisma client: `pnpm --filter entregas-service exec prisma generate`
  - **OR** alternative approach if option B chosen

## Phase 6: Verify

- [x] Run `pnpm --filter gateway test` — all existing + 3 new tests pass
- [x] Run `pnpm --filter entregas-service test` — all existing + new publisher + service tests pass
- [x] Run `pnpm --filter contracts build` — tsc compilation passes (DeliveryListFilters + event contract changes)
