# Design: Client Multi-Provider Selection

## Technical Approach

Make active `RELACION_CARTERA` rows the canonical cliente↔proveedor membership. Keep `CLIENTE.vendedor_id` as a V1 compatibility/default pointer only. Mobile receives available providers, keeps the selected `vendedorId` in app/session state, and sends provider context to provider-scoped catalog/cart/order flows. No code is implemented in this phase.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|----------|-------------------------|-----------|
| Canonical relation is `RELACION_CARTERA.activo=true` | Remove `CLIENTE.vendedor_id`; keep direct pointer authoritative | Supports multi-provider without destructive migration and matches existing cartera table. |
| `CLIENTE.vendedor_id` means default provider | Rename now; remove now | Preserves V1 compatibility while making docs/tests prevent it from becoming the sole relationship again. |
| Provider selection is mobile/session state | Persist selected provider on `CLIENTE`; infer from cart | Avoids adding a mutable “current UI state” column to domain profile. Server validates selected `vendedorId` against active cartera. |
| Cart becomes provider-scoped | One global active cart per cliente | Switching providers must not corrupt or block carts from another proveedor. Use provider-scoped active cart keys. |

## Data Flow

```text
JWT userId/role ──→ gateway action ──→ usuario-service TCP
                         │                 │
                         │                 └─ AuthUser.id → CLIENTE.id → active RELACION_CARTERA
                         │
mobile selected vendedorId ──→ cart/orders ──→ validate provider scope before mutation/order
```

Identity rule: `userId` is always `AUTH_USER.id`; `clienteId`/`vendedorId` are profile/domain IDs; audit actors use `actorUserId`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docs/documentacion/modelo-datos.md` | Modify | State cartera is canonical; mark `CLIENTE.vendedor_id` compatibility/default. |
| `openspec/specs/cliente-provider-selection/spec.md` | Create | Cliente provider list/select requirements. |
| `openspec/specs/cliente-admin/spec.md` | Modify | Replace reassign-only language with provider relation/default management. |
| `openspec/specs/cliente-vendedor/spec.md` | Modify | Require `cartera.some({ vendedor_id, activo: true })` scoping. |
| `openspec/specs/cart-management/spec.md` | Modify | Define one active cart per `(clienteUserId, vendedorId)`. |
| `openspec/specs/order-management/spec.md` | Modify | Require order creation from provider-scoped active cart. |
| `packages/contracts/src/dto/user.dto.ts` | Modify | Add plural provider DTOs; keep `MiVendedorResponse` as compatibility only if needed. |
| `MicroServices/usuario-service/src/clientes/clientes.service.ts` | Modify | Add provider list/select/default methods; centralize cartera/default writes. |
| `MicroServices/usuario-service/src/tcp/usuario-domain-tcp.controller.ts` | Modify | Add TCP patterns for cliente provider list/select and admin relation/default actions. |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modify | Add cliente provider-selection actions. |
| `MicroServices/gateway/src/docs/openapi-spec.service.ts` | Modify | Document gateway contract schemas/actions. |
| `MicroServices/orders-service/prisma/schema.prisma` | Modify | Add provider-scoped active cart uniqueness without cross-service FK. |
| `MicroServices/orders-service/src/cart/*` | Modify | Resolve active cart by `clienteUserId + vendedorId`; validate selected provider. |
| `MicroServices/orders-service/src/orders/*` | Modify | Create from selected provider cart and preserve V1 `clienteUserId` naming compatibility. |

## Interfaces / Contracts

Gateway actions should follow the existing `/api/v1/{service}/{action}` dispatcher:

- `GET /api/v1/clientes/providers` → TCP `clientes.providers`
- `POST /api/v1/clientes/providers/select` → TCP `clientes.providers_select`

Contract shape direction:

```ts
interface ClienteProviderResponse { id: string; nombre: string; apellido?: string; empresa?: string; logo?: string; telefono?: string; ciudad?: string; isDefault: boolean; }
interface ClienteProvidersResponse { providers: readonly ClienteProviderResponse[]; defaultVendedorId?: string; requiresSelection: boolean; }
interface SelectClienteProviderRequest { vendedorId: string; }
interface SelectClienteProviderResponse { selectedProvider: ClienteProviderResponse; }
```

Cart/order requests SHOULD include `vendedorId` for provider scope while ownership remains JWT-derived. `userId` MUST NOT come from body.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Cartera filters, provider validation, default sync, cart provider keys | Jest service/repository tests. |
| Integration | TCP provider actions and gateway registry/OpenAPI | Existing controller/action tests. |
| E2E/manual | Mobile flow: one provider auto-selects; many require chooser | Contract-driven smoke path. |

## Migration / Rollout

Backfill/verify active cartera rows for every existing `CLIENTE.vendedor_id`. Add tests preventing direct `vendedor_id` authority drift. For carts, introduce provider-scoped active uniqueness and migrate active rows to `(clienteUserId, vendedorId)` semantics; keep existing `usuario_id` as V1 `clienteUserId`.

Review slicing: chained PRs recommended. PR1 specs/docs/contracts, PR2 usuario-service, PR3 gateway/OpenAPI, PR4 orders/cart. This change has high >400-line risk.

## Open Questions

- [ ] Confirm whether cliente onboarding creates cartera through QR/link in this branch or must be deferred to a later SDD change.
