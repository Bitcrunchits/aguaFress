# Proposal: Client Multi-Provider Selection

## Intent

Enable clientes to have multiple proveedores, select one active proveedor in mobile, and access provider-scoped profile/catalog/cart/orders without mixing auth identity with domain IDs.

## Scope

### In Scope
- Make active `RELACION_CARTERA` rows the source of truth for cliente↔proveedor membership.
- Keep `CLIENTE.vendedor_id` only as V1 compatibility/default; document deprecation and sync expectations.
- Define cliente APIs: list providers, expose/select active provider, validate against active cartera.
- Update OpenSpec specs/contracts/docs, especially `docs/documentacion/modelo-datos.md`, to remove canonical “one cliente has one proveedor”.
- Forecast chained PRs because docs/specs/contracts + services likely exceed 400 changed lines.

### Out of Scope
- Destructive removal/rename of `CLIENTE.vendedor_id`.
- Detailed migration scripts/backfill SQL beyond verify/backfill direction.
- Full mobile UI implementation.

## Capabilities

### New Capabilities
- `cliente-provider-selection`: Cliente lists/selects providers and receives provider context.

### Modified Capabilities
- `cliente-admin`: Replace single “reassign” with relation/default management.
- `cliente-vendedor`: Read active `RELACION_CARTERA`, not `CLIENTE.vendedor_id`.
- `cart-management`: Define active cart behavior across provider changes.
- `order-management`: Add provider-scoped ordering without changing JWT ownership.
- `orders-gateway-routing`: Forward/validate provider context.

## Approach

Use the exploration recommendation: cartera is canonical; `CLIENTE.vendedor_id` remains temporary compatibility/default. Auth/current actor comes from JWT (`userId`, `role`); audit uses `actorUserId`; relations use `clienteId`/`vendedorId`. Mobile stores active `vendedorId`, auto-selects one provider, and requires selection for multiple.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/documentacion/modelo-datos.md` | Modified | Document cartera as source of truth and `CLIENTE.vendedor_id` compatibility. |
| `openspec/specs/*` | Modified/New | Add provider-selection and deltas. |
| `packages/contracts/src/dto/user.dto.ts` | Modified | Add plural provider DTO direction. |
| `MicroServices/usuario-service/*` | Modified | Membership/default semantics. |
| `MicroServices/gateway/*` | Modified | Provider-selection routes/OpenAPI docs. |
| `MicroServices/orders-service/*` | Modified | Cart/order provider context. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Drift between cartera and `CLIENTE.vendedor_id` | Medium | Single write path and tests in later phases. |
| Cart scope ambiguity | High | Design must choose global active cart vs per-provider active cart. |
| Review overload | High | Use chained PRs; first PR should be specs/docs/contracts. |

## Rollback Plan

Revert provider-selection specs/contracts/docs and keep existing single-provider behavior using `CLIENTE.vendedor_id`; no destructive schema removal is proposed in this change.

## Dependencies

- Confirm cliente onboarding/profile behavior before design.
- Decide cart active-scope behavior before apply.

## Success Criteria

- [ ] Docs and specs define `RELACION_CARTERA` as canonical multi-provider relation.
- [ ] `CLIENTE.vendedor_id` is clearly marked compatibility/default only.
- [ ] Mobile API direction supports list/select active provider.
- [ ] Review plan recommends chained PRs for >400-line risk.
