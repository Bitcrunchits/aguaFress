# Tasks: Client Multi-Provider Selection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1,400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 docs/contracts → PR2 usuario-service → PR3 gateway/mobile context → PR4 orders/cart |
| Delivery strategy | chained PRs resolved by SDD apply preflight |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No — feature-branch-chain resolved for PR1
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Decision resolved before apply: PR1 targets the tracker branch `feat/client-multi-provider-selection`; later child PRs target the previous PR branch.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Canonical docs/spec/contracts source of truth | PR 1 | Include docs and contract tests/build. |
| 2 | usuario-service provider list/selection/default compatibility | PR 2 | Depends on PR 1; include service/TCP tests. |
| 3 | gateway/mobile routing/context forwarding | PR 3 | Depends on PR 2; include registry/OpenAPI tests. |
| 4 | orders/cart provider scope | PR 4 | Depends on PR 3; include Prisma and cart/order tests. |

## Phase 1: Docs, Specs, Contracts

- [x] 1.1 Update `docs/documentacion/modelo-datos.md`: active `RELACION_CARTERA` canonical; `CLIENTE.vendedor_id` default/V1 compatibility only.
- [x] 1.2 Add provider-selection DTOs to `packages/contracts/src/dto/user.dto.ts`; keep `MiVendedorResponse` compatibility if still referenced.
- [x] 1.3 Update main OpenSpec specs under `openspec/specs/*` from this change delta after implementation is accepted.

### PR1 Apply Progress

- Branch: `feat/client-multi-provider-selection-pr1`
- Tracker branch: `feat/client-multi-provider-selection`
- Scope completed: docs/contracts/main OpenSpec source-of-truth only.
- Out of scope preserved: usuario-service business logic, gateway routing, orders/cart behavior, DB migrations, notifications-service.
- Strict TDD note: PR1 is docs/contracts-only. No Jest test file exists for `@agua/contracts`; verification uses contract TypeScript build plus manual doc/source expectations.

## Phase 2: usuario-service Provider Membership

- [x] 2.1 Update `MicroServices/usuario-service/src/clientes/clientes.service.ts` to list providers from active cartera and reject inactive selections.
- [x] 2.2 Centralize admin add/default/reassign writes in `clientes.service.ts` so cartera and `CLIENTE.vendedor_id` cannot drift.
- [x] 2.3 Update vendedor-facing cliente reads in `MicroServices/usuario-service/src/clientes/clientes.service.ts` to authorize via active cartera, not default pointer.
- [x] 2.4 Add TCP patterns in `MicroServices/usuario-service/src/tcp/usuario-domain-tcp.controller.ts` for providers list/select and admin relation/default actions.

## Phase 3: Gateway and Mobile Context

- [x] 3.1 Register `/api/v1/clientes/providers` and `/api/v1/clientes/providers/select` in `MicroServices/gateway/src/actions/action-registry.ts`.
- [x] 3.2 Update `MicroServices/gateway/src/docs/openapi-spec.service.ts` with provider-selection schemas and `vendedorId` scope rules.
- [x] 3.3 Ensure gateway forwarding passes trusted `userId`, `role`, and validated `vendedorId`; never body `userId`.

## Phase 4: Orders and Cart Provider Scope

- [x] 4.1 Update `MicroServices/orders-service/prisma/schema.prisma` for active cart uniqueness by `clienteUserId` plus `vendedorId`.
- [x] 4.2 Update `MicroServices/orders-service/src/cart/*` to resolve active carts by authenticated cliente plus selected provider.
- [x] 4.3 Update `MicroServices/orders-service/src/orders/*` to create/clear orders only for the selected provider cart.

## Phase 5: Tests and Verification

- [x] 5.1 Add usuario-service Jest tests for active/empty provider list, valid/invalid selection, default drift, and cartera authorization mismatch.
- [x] 5.2 Add gateway tests for valid forwarding and unauthorized provider rejection before mutation.
- [x] 5.3 Add orders/cart tests for provider-isolated carts, body `userId` ignored, retry identity by cliente/provider/key, and product-missing no-clear.
- [ ] 5.4 Run `pnpm --filter @agua/contracts build`, affected service tests, and verify `docs/documentacion/modelo-datos.md` identity naming.
