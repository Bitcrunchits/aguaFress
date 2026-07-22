# Exploration: client-multi-provider-selection

## Current State

The current implementation is mixed: the schema has both a single-provider pointer and a many-to-many cartera table, but most cliente workflows still behave as if there is only one active provider.

### Single-provider assumptions found

- `MicroServices/usuario-service/prisma/schema.prisma` keeps `CLIENTE.vendedor_id` as required and defines a direct `Cliente -> Vendedor` relation, documenting one assigned vendor per client.
- `MicroServices/usuario-service/src/clientes/clientes.service.ts` filters admin lists by `Cliente.vendedor_id`, includes a single `vendedor`, and `reassign()` deactivates all active cartera rows before activating the new vendor.
- Vendedor-scoped cliente methods use `where: { vendedor_id: vendedorId }` on `Cliente`, not `cartera.some`, so they currently follow the direct pointer rather than the active cartera relation.
- `openspec/specs/cliente-admin/spec.md` says `reassign` MUST change `vendedor_id`; `docs/documentacion/modelo-datos.md` states `CLIENTE.vendedor_id` is N:1 and “cada cliente tiene 1 vendedor”.
- `packages/contracts/src/dto/user.dto.ts` still has `MiVendedorResponse`, singular, and admin assignment contracts named `AsignarVendedor*` imply one vendor.
- Gateway exposes vendedor/client admin actions, but no cliente-facing provider-selection actions: `MicroServices/gateway/src/actions/action-registry.ts` has `clientes.cartera` for vendors only, not “my providers” for clients.
- Orders/cart currently operate with one active cart per authenticated cliente user, and the cart’s `vendedor_id` is inferred from product snapshot. There is no selected-provider context in cart/order requests.

### Multi-provider support already present

- `RELACION_CARTERA` already models `(vendedor_id, cliente_id, activo)` with a unique pair and can represent several active providers per cliente.
- Dashboard spec already defines `clientesConVendedor` from active cartera rows, not from `CLIENTE.vendedor_id`.
- QR/link modules already resolve and persist `vendedorId` as `VENDEDOR.id`, which is the right domain ID for creating provider-client relations.
- Orders/cart already persist `vendedor_id` per cart/order, which is compatible with provider-scoped ordering once the client-selected provider is made explicit and validated.

## Affected Areas

- `MicroServices/usuario-service/prisma/schema.prisma` — `CLIENTE.vendedor_id` conflicts with multi-provider as canonical source; `RELACION_CARTERA` should become authoritative.
- `MicroServices/usuario-service/src/clientes/clientes.service.ts` — list/get/update/reassign semantics need to move from direct `vendedor_id` to active cartera membership.
- `MicroServices/usuario-service/src/tcp/usuario-domain-tcp.controller.ts` — needs cliente-facing provider endpoints and probably admin “link/unlink provider” actions instead of destructive reassignment.
- `packages/contracts/src/dto/user.dto.ts` and related contract exports — need plural provider-selection DTOs; avoid direct string unions and keep flat interfaces.
- `MicroServices/gateway/src/actions/action-registry.ts` and `src/docs/openapi-spec.service.ts` — need routes/docs for client provider selection.
- `MicroServices/orders-service/src/cart/*` and `src/orders/*` — need provider-scoped cart/order semantics and V1 identity compatibility cleanup strategy.
- `openspec/specs/cliente-admin`, `cliente-vendedor`, `cart-management`, `order-management`, `orders-gateway-routing`, and `docs/documentacion/modelo-datos.md` — currently encode single-provider assumptions.
- Mobile app flow — must store an active provider context after login/profile load and pass/select it before provider-scoped catalog/cart/order screens.

## Approaches

1. **Canonical cartera, keep `CLIENTE.vendedor_id` as temporary compatibility/default** — Treat active `RELACION_CARTERA` rows as the source of truth; keep `CLIENTE.vendedor_id` only as legacy/default provider until a later destructive migration.
   - Pros: smallest migration risk; allows old admin/list screens to keep working during transition; supports staged PRs under the 400-line review budget.
   - Cons: two sources can drift unless writes sync/validate; docs must clearly mark `vendedor_id` as compatibility/default, not authority.
   - Effort: Medium.

2. **Remove `CLIENTE.vendedor_id` now** — Make cartera the only persisted relation immediately.
   - Pros: cleanest domain model; no duplicated truth.
   - Cons: larger Prisma migration, code, tests, docs, contracts, and backfill in one change; likely too large for the review budget.
   - Effort: High.

3. **Rename `CLIENTE.vendedor_id` to `default_vendedor_id` now** — Keep a default provider concept while making the naming honest.
   - Pros: clearer than compatibility naming; useful for first-login/mobile default provider.
   - Cons: still a schema migration plus code updates; can be confused as canonical if not strictly documented.
   - Effort: Medium/High.

## Recommendation

Use **Approach 1** for this change: make `RELACION_CARTERA` the source of truth for provider-client membership, while keeping `CLIENTE.vendedor_id` as a temporary compatibility/default field.

After the change:

- Source of truth: active `RELACION_CARTERA` rows using profile IDs (`clienteId = CLIENTE.id`, `vendedorId = VENDEDOR.id`).
- Auth/current actor: JWT `userId = AUTH_USER.id`, `role = AUTH_USER.role` only.
- `CLIENTE.vendedor_id`: keep for V1 compatibility/default provider only; document as deprecated compatibility and synchronize it when establishing the first/default provider.
- Admin operation should evolve from “reassign” to “manage providers”: add provider relation, deactivate provider relation, optionally set default provider.
- Vendor cartera reads must query `cartera.some({ vendedor_id, activo: true })`, not `Cliente.vendedor_id`.

## API / Contract Direction for Mobile

Minimum provider-selection API surface:

- `GET /api/v1/clientes/providers` — cliente role; returns active providers linked to the authenticated cliente profile.
- `GET /api/v1/clientes/providers/active` or include `activeProviderId` in profile/session response — returns selected/default provider for current app context.
- `POST/PATCH /api/v1/clientes/providers/select` — cliente role; body `{ vendedorId }`; validates active cartera membership before selecting.
- Provider-scoped catalog/cart/orders should accept provider context explicitly where needed, preferably `vendedorId` query/body for domain scope, while still deriving `userId` from JWT for ownership.
- Mobile should store selected provider as app/session state and require selection before showing provider-scoped catalog/cart/orders. If the client has exactly one active provider, auto-select it; if multiple, show a chooser.

Contract naming should avoid `MiVendedorResponse` as the canonical shape. Prefer plural DTOs such as `ClienteProviderResponse`, `ClienteProvidersResponse`, and `SelectClienteProviderRequest`. Keep flat TypeScript interfaces and import runtime enums/constants from shared contracts.

## Risks

- **Data drift**: `CLIENTE.vendedor_id` can diverge from active cartera rows while it remains. Mitigation: write through a single service method and add tests proving synchronization/default rules.
- **Breaking orders authorization**: orders-service still has V1 compatibility where cliente identity is `AUTH_USER.id`, and vendedor lifecycle checks compare `order.vendedorId` to vendor JWT user id in some paths. Provider selection should not silently introduce profile IDs into those legacy fields without an explicit V2 migration.
- **Cart scope ambiguity**: current active cart key is only one per cliente user; if mobile can switch providers, decide whether switching provider clears/archives the active cart or change active cart uniqueness to `(clienteUserId, vendedorId)`.
- **Review size**: schema + usuario-service + contracts + gateway + docs + orders/cart is likely over 400 changed lines. Recommend chained PRs.
- **Stale docs/code mismatch**: docs mention cliente registration via QR/link, but current `AuthService.register()` only creates vendedores on this branch. Proposal/design should verify whether cliente registration is deferred or broken before specifying provider onboarding.

## Migration Steps

1. Backfill/verify active `RELACION_CARTERA` rows for every existing `CLIENTE.vendedor_id`.
2. Change usuario-service read paths to use active cartera membership as canonical.
3. Add cliente provider-list/select contracts and gateway actions.
4. Decide and implement cart active-scope behavior: one active cart per cliente globally vs per selected provider.
5. Update OpenSpec and docs to mark `CLIENTE.vendedor_id` as compatibility/default, not source of truth.
6. Later destructive cleanup: rename/remove `CLIENTE.vendedor_id` only after all clients and services stop depending on it.

## Review-size Estimate

High if implemented as one PR. Recommended chain:

1. Specs/docs/contracts for provider selection and source-of-truth rename/compatibility.
2. Usuario-service cartera canonicalization + provider-list/select endpoints.
3. Gateway/OpenAPI/frontend docs.
4. Orders/cart provider-scope decision and implementation.

## Ready for Proposal

Yes. The proposal should state that the architecture direction is **cartera as canonical multi-provider membership**, `CLIENTE.vendedor_id` retained only as V1 compatibility/default, and mobile provider selection added before provider-scoped catalog/cart/orders.
