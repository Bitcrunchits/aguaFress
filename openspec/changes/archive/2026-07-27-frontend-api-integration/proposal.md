# Proposal: Frontend API Integration

## Intent

Replace remaining mock/placeholder frontend experiences with real AguaFress API Gateway data through `/api/v1`, building on the completed and verified Productos list slice instead of redoing it.

## Scope

### In Scope
- Integrate role-by-role screens using `page -> hook -> service`, TanStack Query, Axios, and DTOs from `@agua/contracts` when available.
- `super_admin`: real `/admin` stats plus admin-facing clientes/vendedores/orders/QR/link/audit read views where routes already imply access.
- `vendedor`: replace dashboard metrics/recent orders and connect clientes, órdenes, QR/link invitation, deliveries/profile read flows; keep Productos list as baseline and extend only where needed.
- `cliente`: replace `/catalogo` placeholder with products/categories/brands, provider selection, cart read/update, pedidos/profile read paths.
- Use real local gateway routes under `/api/v1`; verify `VITE_API_URL`/Vite proxy and auth refresh behavior before broad rollout.

### Out of Scope
- Backend/API Gateway changes, Prisma/schema changes, seed rewrites, or contract package redesign.
- Redesigning the full UI/theme, migrating React 18, or adopting React 19-only APIs.
- Reimplementing the already connected Productos list.
- Completing every mutation-heavy flow in the first PR; async order/delivery polling may be later slices.

## Capabilities

### New Capabilities
- `frontend-api-integration`: role-scoped real-data frontend integration against the existing gateway.

### Modified Capabilities
- None — existing backend capabilities such as `dashboard-stats`, `cliente-vendedor`, `cliente-provider-selection`, `cart-management`, `order-management`, QR/link, delivery, and activity-log behavior remain API source-of-truth.

## Approach

Use read-first vertical slices. Each screen owns a typed service, a hook, and a page with loading/error/empty/success states. Keep gateway paths centralized, use `UserRole` enum values, and preserve existing auth/session foundations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/frontend/src/config/routes.tsx` | Modified | Add/fix cliente/admin routes and avoid catalog-to-clientes reuse. |
| `packages/frontend/src/features/*` | Modified/New | Add services/hooks/pages per role using the Productos pattern. |
| `packages/frontend/src/shared/Layout/DashboardLayout.tsx` | Modified | Replace hardcoded summary/navigation gaps with role-aware real data. |
| `packages/frontend/src/services/api.ts` | Modified | Verify gateway base URL and refresh handling only if needed. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large diff | High | Decision needed before apply: Yes; Chained PRs recommended: Yes; 400-line budget risk: High. |
| Contract drift | Med | Use real gateway + `@agua/contracts`; test role seeds. |
| Async flows misread as complete | Med | Treat `202` as pending and poll job status. |

## Review Strategy Forecast

Expected full change: ~1200–2200 lines. Cached strategy is `ask-always`; maintainers must choose chain strategy before apply. Suggested slices under 400 lines where possible: PR1 foundation + admin/clientes reads; PR2 cliente catalog/provider/cart reads; PR3 orders/deliveries/QR/link actions and polling.

## Rollback Plan

Revert frontend slices per PR. Because backend is unchanged, rollback restores previous placeholder screens and existing Productos remains safe.

## Dependencies

- Running local API Gateway on `/api/v1`; seeded role users with `admin123`; existing Productos verification as reference.

## Success Criteria

- [ ] Placeholder screens named above render real local project data per role.
- [ ] Services follow `page -> hook -> service` and avoid `any`/string role literals.
- [ ] Productos list remains connected and passing.
