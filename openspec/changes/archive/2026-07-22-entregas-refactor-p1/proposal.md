# Proposal: Entregas Service — P1 Architecture Refactor

## Intent

Complete the entregas-service architecture alignment by separating persistence from business logic, fixing contracts drift, adding event publishing on state transitions, and ensuring gateway dispatch integration — so entregas follows the same patterns as every other production microservice in the repo.

## Scope

### In Scope

1. **Repository/Mapper Separation** — Extract Prisma DB access into `DeliveriesRepository` and entity↔DTO mapping into `DeliveryMapper`. `DeliveriesService` becomes pure business logic (state machine, validation). Mirror orders-service pattern.
2. **Contracts Drift Fixes** — Audit `DeliveryListFilters`, `UpdateDeliveryStatusDto`, and delivery event types in `@agua/contracts`. Align with actual usage.
3. **Events/Notifications Alignment** — On delivery status transitions (PENDIENTE→EN_CAMINO→ENTREGADA), publish typed events to notifications stream. Mirror notifications-service event publishing pattern.
4. **Gateway Dispatch Integration** — Verify/ensure `action-registry.ts`, `tcp-clients.module.ts`, and `tcp-dispatcher.service.ts` route delivery actions to entregas-service:3015.

### Out of Scope
- Identity resolver (P0 — already done)
- Docker/DB runtime (P0 — already done)
- RpcExceptionFilter (P0 — already done)
- Cleanup/debt (P2 — AG-171)

## Capabilities

### New Capabilities
- `delivery-events`: Event publishing on delivery status transitions

### Modified Capabilities
- `deliveries-dto`: Contracts alignment for filters, status updates, and event types

## Approach

1. **Repository/Mapper**: Copy the proven orders-service pattern — `DeliveriesRepository` wraps Prisma, `DeliveryMapper` maps entity↔DTO, `DeliveriesService` orchestrates validation + repository + publisher.
2. **Contracts**: Read current `deliveries.dto.ts` and `events.ts`, identify drift, apply OCP-safe additions (V2 DTOs if needed).
3. **Events**: Create `DeliveryEvent` types in contracts, publish via TCP or Kafka pattern (follow notifications-service).
4. **Gateway**: Read current gateway TCP config for entregas, add any missing routes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `entregas-service/src/deliveries/` | New + Modified | Repository, Mapper, refactored Service |
| `packages/contracts/src/dto/deliveries.dto.ts` | Modified | Fix drift, add V2 if needed |
| `packages/contracts/src/events.ts` | Modified | Add delivery event types |
| `entregas-service/src/common/` | New | Event publisher service |
| `gateway/src/actions/action-registry.ts` | Modified | Ensure deliveries routes registered |
| `gateway/src/tcp/tcp-clients.module.ts` | Modified | Ensure entregas client wired |
| `gateway/src/tcp/tcp-dispatcher.service.ts` | Modified | Ensure dispatch mapping |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Repository extraction changes service interface | Medium | Follow orders pattern exactly; existing tests must pass |
| Event shape undefined/unstable | Low | Start with minimal typed events, extend later |
| Gateway dispatch already working from P0 | Low | Verify before changing anything |

## Rollback Plan

Revert repository/mapper extraction, restore original `DeliveriesService`. Keep events disabled via feature toggle or config. Gateway changes are additive.

## Dependencies

- P0 must be applied first (✅ done)
- `notifications-service` must accept delivery event types

## Success Criteria

- [ ] DeliveriesService no longer imports PrismaService directly
- [ ] All existing tests (15/15) pass with new repository/mapper layer
- [ ] Contracts DTOs match actual usage (zero drift)
- [ ] Delivery status transitions publish typed events
- [ ] Gateway dispatches to entregas-service without errors
