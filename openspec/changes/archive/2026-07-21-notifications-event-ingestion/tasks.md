# Tasks: Notifications Event Ingestion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1 ~280-380; PR2 ~220-330; combined ~500-700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 TCP/service/contracts/tests → PR2 Redis Streams consumer |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Decision needed before apply: choose chain strategy before implementation, and confirm PR2 product scope/event set before Redis Streams work.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Trusted TCP create path with contracts, service create, filter if small, and tests | PR1 | Base: feature/tracker branch; no public gateway create. |
| 2 | Redis Streams mapper/consumer reusing `ActivityLogsService.create()` | PR2 | Base: PR1 branch or tracker branch after PR1; only if product decision accepts PR2. |

## Phase 1: PR1 Contracts and Schema

- [x] 1.1 Update `packages/contracts/src/dto/notifications.dto.ts` with const-object enum values and `CreateActivityLogRequestDTO` request-only contract.
- [x] 1.2 Update `packages/contracts/src/compile-checks/notifications-activity-logs.contract-check.ts` to compile-check create DTO usage without `any`.
- [x] 1.3 Update `MicroServices/notifications-service/src/activity-logs/activity-log.schema.ts` with optional `dedupeKey` and sparse unique Mongo index.

## Phase 2: PR1 Create Use Case and TCP Boundary

- [x] 2.1 Add `ActivityLogsService.create()` in `MicroServices/notifications-service/src/activity-logs/activity-logs.service.ts` for validation, ISO defaults, `requestId ?? eventId` dedupe, and duplicate-key return.
- [x] 2.2 Add `createRequest()` to `MicroServices/notifications-service/src/tcp/tcp-payload-adapter.service.ts`, reading only `payload.body` and never `userId` from body.
- [x] 2.3 Add TCP-only `@MessagePattern('activity_logs.create')` in `MicroServices/notifications-service/src/activity-logs/activity-logs.tcp.controller.ts`; do not add gateway/public create.
- [x] 2.4 If small enough for PR1, add `MicroServices/notifications-service/src/common/filters/rpc-exception.filter.ts` and register it in `MicroServices/notifications-service/src/main.ts`.

## Phase 3: PR1 Tests and Boundary Checks

- [x] 3.1 Add service tests for valid create, invalid enum/timestamp rejection, ISO default, dedupe hit, and duplicate-key race handling.
- [x] 3.2 Add TCP/adapter tests for trusted create success and typed RPC error behavior.
- [x] 3.3 Add/extend boundary regression proving `MicroServices/gateway/src/actions/action-registry.ts` exposes no activity-log create and no `AUDIT_LOG` coupling exists.

## Phase 4: PR2 Redis Streams, Only If Accepted

- [x] 4.1 Add Redis env fields in `MicroServices/notifications-service/src/common/config/env.config.ts` for URL, enabled flag, group, and consumer name.
- [x] 4.2 Create `MicroServices/notifications-service/src/streams/*` mapper/provider/consumer gated by env and mapping typed events into `ActivityLogsService.create()`.
- [x] 4.3 Add PR2 tests for event-to-create mapping, disabled consumer behavior, and idempotency via stream/event id or `requestId`.
