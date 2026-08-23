# Proposal: Frontend Admin Flows

## Intent

Expose `packages/PRS AG-1.txt`: super-admin vendor registration/enablement plus missing vendedor and cliente screens. Frontend-only; reflect live `/api/v1` capabilities honestly.

## Scope

### In Scope
- Add `SUPER_ADMIN` routes under `/admin/*` for vendors, clients, audit, QR/links, profile, dashboard.
- Add vendor registration through `POST /auth/register`; new vendors remain pending until enabled.
- Complete admin enablement with `VendedorEstado`, admin clients, vendor client flows, cliente provider/cart/checkout.
- Fix `admin.service.ts` QR/link listing to require `vendedorId` and stop masking parameter failures.

### Out of Scope
- Backend, gateway, contracts, database, seeds, OpenAPI generator, or docs changes.
- Making `SUPER_ADMIN` perform vendedor-only product/order/delivery mutations; gateway rejects those roles, so impersonation would create identity bugs.
- Using stale `docs/` routes instead of live `/api/v1` registry/OpenAPI paths.

## Capabilities

### New Capabilities
- `frontend-admin-flujos`: frontend role-flow completion for PRS AG-1.

### Modified Capabilities
- `frontend-api-integration`: extend from read-first integration to mutation-capable admin, vendedor, and cliente flows.

## Approach

Use separate nested admin pages under `/admin/*`, not reused vendedor/cliente protected pages. Keep `page -> hook -> service`, typed DTOs/contracts, role enums, and identity boundaries: JWT `userId` is never form input; forms pass domain IDs only where APIs require them.

- Admin vendors: `/admin/vendors`, `/admin/vendors/pending`, `/admin/vendors/:vendedorId`.
- Admin clients: `/admin/clients`, `/admin/clients/:clienteId`.
- Admin audit/profile/QR-links: `/admin/audit`, `/admin/profile`, vendor-scoped QR/links.
- Cliente flow: provider switch, add-to-cart, checkout, job tracking.
- Vendedor flow: own client detail/update, direct client registration.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/frontend/src/config/routes.tsx` | Modified | Admin child/missing role routes. |
| `packages/frontend/src/shared/Layout/DashboardLayout.tsx` | Modified | Admin menus. |
| `packages/frontend/src/features/admin/*` | Modified/New | Pages/hooks/services; QR/link `vendedorId` fix. |
| `packages/frontend/src/features/clientes/*`, `catalogo/*`, `cart/*`, `ordenes/*` | Modified/New | Vendedor/cliente flows. |
| `packages/frontend/src/services/auth.service.ts` | Modified | Registration endpoints. |

## Delivery Note

Deliver as chained PRs (`force-chained`, `feature-branch-chain`) under a tracker branch, max 800 changed lines per slice. Slices: 1) admin nav/routes + vendor pending/status, 2) vendor registration, 3) admin clients, 4) QR/link/audit/profile, 5) cliente provider/cart/checkout, 6) vendedor client flows.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| "admin can do everything" mismatch | High | Scope UI to real gateway permissions. |
| Oversized frontend diff | High | Force chained PR slices under 800 lines. |
| Checkout address/provider gaps | Med | Require real provider/address data before submit. |

## Rollback Plan

Revert frontend slices independently; backend remains unchanged.

## Dependencies

- Existing gateway `/api/v1` endpoints, `@agua/contracts`, and seeded role users.

## Success Criteria

- [ ] PRS AG-1 frontend menus and flows are reachable by the correct role.
- [ ] Admin QR/link lists require selected `vendedorId` and no longer hide parameter failures.
- [ ] No backend files are modified.
