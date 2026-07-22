# Tasks: Deliveries P1 — Repository, Mapper, Events, Contracts Drift

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~370 (additions + deletions) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full refactor (contracts + repo + mapper + events + wiring + tests) | PR 1 | Base: `entregas-refactor-local`; fits under 400 lines |

## Phase 1: Foundation — Contracts drift

- [x] 1.1 Remove `vendedorId` from `DeliveryListFilters` in `packages/contracts/src/dto/deliveries.dto.ts`
- [x] 1.2 Add `actorUserId: string` to `DeliveryStatusChangedEvent` in `packages/contracts/src/events.ts`

## Phase 2: Foundation — Repository & Mapper

- [x] 2.1 Create `DeliveryRecord` type, `DeliveriesRepository` interface, and `PrismaDeliveriesRepository` impl in `entregas-service/src/deliveries/deliveries.repository.ts`
- [x] 2.2 Create `DeliveryMapper` with `toResponse()` + enum converters in `entregas-service/src/deliveries/delivery.mapper.ts`

## Phase 3: Foundation — Event Publisher & Redis

- [x] 3.1 Create `DeliveryEventPublisher` port interface + `DELIVERY_EVENT_PUBLISHER` token in `entregas-service/src/deliveries/delivery-event-publisher.port.ts`
- [x] 3.2 Create `RedisDeliveryEventPublisher` impl in `entregas-service/src/deliveries/delivery-event-publisher.redis.ts`
- [x] 3.3 Add `Redis` client provider (`IORedis.Redis` from `REDIS_URL`) in `entregas-service/src/common/common.module.ts`

## Phase 4: Core — Service refactor & wiring

- [x] 4.1 Refactor `DeliveriesService` — inject `DeliveriesRepository`, `DeliveryMapper`, `DeliveryEventPublisher`; remove `PrismaService` + private `toResponse`; add `actorUserId` param to `updateStatus`; call `publisher.publishStatusChanged()` on valid transitions
- [x] 4.2 Update `DeliveriesModule` — register repository, mapper, publisher, Redis provider; export repository + publisher
- [x] 4.3 Update `DeliveriesTcpController` — pass `user.sub` as `actorUserId` to `updateStatus`

## Phase 5: Testing

- [x] 5.1 Update `DeliveriesService` tests — mock repo, mapper, publisher; add event publish assertions for valid transitions; verify no publish on invalid transitions
- [x] 5.2 Write unit tests for `DeliveryMapper` — `toResponse()` mapping + enum converters
- [x] 5.3 Write unit tests for `RedisDeliveryEventPublisher` — XADD call, logging on failure (non-blocking)
