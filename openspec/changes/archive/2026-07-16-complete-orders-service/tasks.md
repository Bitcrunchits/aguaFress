# Tasks: Complete Orders Service

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 foundation → PR 2 cart → PR 3 orders → PR 4 gateway/docs |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Prisma/common/product boundary | PR 1 | Base = feature/tracker branch; include tests/build. |
| 2 | Cart behavior | PR 2 | Base = PR 1 branch; RED/GREEN per scenario. |
| 3 | Order lifecycle/numbering | PR 3 | Base = PR 2 branch; transaction tests included. |
| 4 | Gateway routing/contracts | PR 4 | Base = PR 3 branch; docs included. |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 RED: add Prisma/common/product boundary specs for `MicroServices/orders-service/src/common/prisma.service.ts` and `src/products/product-catalog.port.ts` unavailable behavior.
- [x] 1.2 GREEN: create `common/prisma.service.ts`, `products/product-catalog.port.ts`, provider wiring, and update `cart.module.ts`/`orders.module.ts` imports without concrete cross-service coupling.
- [x] 1.3 Modify `MicroServices/orders-service/prisma/schema.prisma` with `OrderCounter` mapped to `PEDIDO_COUNTER`; validate with `pnpm --filter @agua/orders-service prisma:validate`.

## Phase 2: Cart Capability

- [x] 2.1 RED: add cart unit specs for active cart, JWT-over-body identity, ownership rejection, expiration rejection, server totals, product unavailable, duplicate add increments, and update replaces quantity.
- [x] 2.2 GREEN: implement `MicroServices/orders-service/src/cart/cart.repository.ts`, `cart.service.ts`, `cart.controller.ts`, DTO/mappers, and TCP patterns `cart.get/items_add/items_update/items_delete`; add increments existing item quantity, update replaces it.
- [x] 2.3 REFACTOR: run DBS pre-test/check for cart files; remove `any`, dead code, body `userId`, and string status literals.

## Phase 3: Order Capability

- [x] 3.1 RED: add order specs for create-from-cart rollback, role-scoped reads, state transitions/history, ISO dates, and concurrent `pedido_numero` uniqueness.
- [x] 3.2 GREEN: implement `MicroServices/orders-service/src/orders/orders.repository.ts`, `orders.service.ts`, `orders.controller.ts`, `order-state.ts`, and transaction/counter logic.
- [x] 3.3 REFACTOR: ensure services enforce roles/state, repositories own Prisma, and response DTOs are concrete typed, not `unknown[]`.

## Phase 4: Gateway / Contracts

- [x] 4.1 RED: add gateway specs for `ORDERS_CLIENT`, cart/orders action mapping, JWT rejection, body identity ignored, and unknown action errors.
- [x] 4.2 GREEN: update `MicroServices/gateway/src/actions/action-registry.ts`, `src/tcp/tcp-clients.module.ts`, `src/tcp/tcp-dispatcher.service.ts`, and `src/config/env.config.ts`.
- [x] 4.3 Update `docs/frontend-gateway-contract.md` and `contratosDTOs/*.json`; touch `packages/contracts/src/dto/orders.dto.ts` only if strict flat types require it.

## Phase 5: Verification

- [ ] 5.1 Run `pnpm --filter @agua/orders-service test`, `pnpm --filter @agua/gateway test`, orders Prisma validate, and affected builds.
- [ ] 5.2 Confirm all spec scenarios pass and product-dependent commands return controlled unavailable without writes.
