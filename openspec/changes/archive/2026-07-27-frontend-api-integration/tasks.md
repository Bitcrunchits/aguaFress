# Tasks: Frontend API Integration

Baseline: `packages/frontend/src/features/productos` list is already connected and verified; do not reimplement `GET /products/list`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200–2200 total; target ~250–400 per slice |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 foundation/admin/clientes reads → PR2 cliente catalog/provider/cart → PR3 orders/deliveries/QR/link async actions |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation plus admin/clientes reads | PR 1 | Verify routing, MSW tests, build; optional gateway smoke only with known auth. |
| 2 | Cliente catalog, provider selection, and cart read/update | PR 2 | Depends on PR 1 routes/nav; preserve Productos list tests. |
| 3 | Orders, deliveries, QR/link mutations, and async polling | PR 3 | Depends on PR 1/2 query/error patterns; requires chain strategy before apply. |

## Phase 1: Foundation and Routing

- [x] 1.1 Create `packages/frontend/src/shared/api-error.ts` to normalize Axios/API errors for display-safe UI states.
- [x] 1.2 Update `packages/frontend/src/config/routes.tsx`: `UserRole` cliente `/catalogo`, `/carrito`, `/pedidos`, `/perfil`; admin reads; cliente redirect `/catalogo`.
- [x] 1.3 Update `packages/frontend/src/shared/Layout/DashboardLayout.tsx` nav to expose only role routes and avoid fake summary data.
- [x] 1.4 Add route/nav tests covering allowed role access and placeholder-route replacement.

## Phase 2: Admin and Clientes Reads

- [x] 2.1 Add `packages/frontend/src/features/admin/{services,hooks,pages}` for dashboard stats, vendedores, clientes, audit, QR/link reads.
- [x] 2.2 Add/extend `packages/frontend/src/features/clientes/{services,hooks,pages}` for clientes lists and provider selection reads.
- [x] 2.3 Add MSW service/page tests for loading, error, empty, and success states on admin/clientes reads.
- [x] 2.4 Verify slice: `pnpm --filter @agua/frontend test`, build, and `/api/v1` smoke only with discovered seeded auth.

## Phase 3: Cliente Catalog and Cart

- [x] 3.1 Extend `packages/frontend/src/features/productos` only for catalog filters/categories/brands; keep `ProductosPage` behavior intact.
- [x] 3.2 Create `packages/frontend/src/features/catalogo` page/hook/service using products, categories, brands, and selected provider.
- [x] 3.3 Create `packages/frontend/src/features/cart` read/update hooks/services/pages with typed cart DTOs and query invalidation.
- [x] 3.4 Verify slice: MSW catalog/provider/cart tests, existing Productos tests, frontend test/build, optional gateway smoke.

## Phase 4: Orders, Deliveries, QR and Links

- [x] 4.1 Create/extend `packages/frontend/src/features/ordenes` for list/detail/actions and async create tracking with idempotency reuse.
- [x] 4.2 Create `packages/frontend/src/features/deliveries` for delivery list and async status polling until terminal states.
- [x] 4.3 Extend `packages/frontend/src/features/qr` for vendor QR/link list/create/deactivate and admin read/deactivate.
- [x] 4.4 Verify slice: MSW tests for `202 Accepted`, polling terminal/error states, duplicate command protection, plus frontend test/build commands.

## Phase 5: Final Review Cleanup

- [x] 5.1 Remove leftover placeholders only from integrated screens; document missing endpoints instead of changing backend.
- [x] 5.2 Run final `pnpm --filter @agua/frontend lint`, `test`, and `build`; record API smoke evidence in apply notes.
