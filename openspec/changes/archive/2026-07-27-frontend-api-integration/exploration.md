# Exploration: frontend-api-integration

## Current State

The frontend is a React 18 + Vite SPA in `packages/frontend` with Axios, TanStack Query, React Router v6, auth/session foundations, and shared state components. It already points to the gateway contract shape through `baseURL: import.meta.env.VITE_API_URL ?? '/api/v1'`, with Vite proxying `/api` to `localhost:3000`.

The gateway currently exposes `/api/v1/{service}/{action}` and `ACTION_REGISTRY` marks all frontend-relevant families as `available`: auth, users, vendedores, clientes, super-admin, qr, link-invitacion, products, categories, brands, orders, cart, deliveries, and activity-logs.

## Required Screens / Routes by Role

| Role | Required frontend routes | Primary real API families |
|------|--------------------------|---------------------------|
| `super_admin` | `/admin`, `/clientes`, `/productos`, `/ordenes`, `/qr`, plus missing focused admin views for vendedores, audit/activity logs, invitation links, QR admin actions | `super-admin`, `activity-logs`, `vendedores`, `clientes`, `products`, `orders`, `qr`, `link-invitacion` |
| `vendedor` | `/dashboard`, `/clientes`, `/productos`, `/ordenes`, `/qr`, plus missing deliveries/link-invitacion/profile screens | `vendedores`, `clientes`, `products`, `categories`, `brands`, `orders`, `deliveries`, `qr`, `link-invitacion` |
| `cliente` | `/catalogo`, plus missing `/carrito`, `/pedidos`, `/perfil`, provider selection | `clientes/providers`, `products`, `cart`, `orders`, `users` |

Current route config only has `/catalogo` for cliente and maps it to `ClientesPage`, which is not a real catalog page.

## Existing Pages: Real vs Placeholder

| Page | Status | Evidence |
|------|--------|----------|
| Login/session | Mostly real | `auth.service.ts` uses `/auth/login`, `/auth/refresh`, `/auth/logout`, `/users/profile`; AuthContext stores token/user. |
| Vendedor dashboard | Partially real | Fetches `/clientes/list` and `/vendedores/profile`, but recent orders and several metrics are hardcoded. |
| Productos | Real first slice | Uses `GET /products/list` typed as `PaginatedResponse<ProductResponse>` with loading/error/empty/success states. |
| Clientes | Placeholder | Static copy says “Listado de clientes — próximamente.” |
| Órdenes | Placeholder | Static copy says “Listado de órdenes — próximamente.” |
| QR | Placeholder | Static copy says “Generación y administración de QR — próximamente.” |
| Admin dashboard | Placeholder/base only | Cards render `—`; no `super-admin/dashboard` call. |
| DashboardLayout quick summary | Placeholder | Sidebar summary has hardcoded `24`, `$45k`, `12`, `8`. |
| Cliente catalog | Incorrect placeholder reuse | `/catalogo` renders `ClientesPage`, not a catalog/cart flow. |

## Endpoints Usable Now from Gateway Registry

Use base URL `/api/v1` from the frontend dev server or `http://localhost:3000/api/v1` direct.

- Public/auth: `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/validate`, `/auth/reset-password`, `/auth/register-client`.
- Authenticated profile: `GET /users/profile`, `PATCH /users/profile/update`, `GET /vendedores/profile`, `PATCH /vendedores/profile/update`.
- Vendedores/clientes: `GET /vendedores/list`, `GET /vendedores/get-by-id`, `PATCH/POST /vendedores/change-estado` depending gateway method usage; `GET /clientes/list`, `/clientes/cartera`, `/clientes/providers`, `/clientes/providers/select`, `/clientes/get-by-id`, `/clientes/own/get-by-id`, update/reassign actions.
- Admin: `GET /super-admin/dashboard`, `/super-admin/audit-log`, `/super-admin/qr-codes`, `/super-admin/link-invitacion`, `/super-admin/vendedores`, `/super-admin/profile`.
- QR/links: `GET/POST /qr/vendor/list`, `/qr/vendor/create`, `/qr/vendor/deactivate`, `/qr/admin/deactivate`; similar for `/link-invitacion/vendor/*` and `/admin/deactivate`.
- Catalog: `GET /products/list`, `/products/get`, `/products/search`, plus vendedor-protected create/update/delete; `GET /categories/list`, `GET /brands/list`, plus vendedor-protected mutations.
- Orders/cart: `GET /orders/list`, `/orders/get-by-id`, `/orders/job-status`; `POST /orders/create` async for `cliente`; `PATCH /orders/status/update`, `POST /orders/confirm` for `vendedor`; `POST /orders/cancel` for `cliente`; `GET /cart/get`, item add/update/delete for `cliente`.
- Deliveries: `GET /deliveries/list`, `/deliveries/get`, `/deliveries/job-status`; `PATCH/POST /deliveries/update-status` async for `vendedor`.
- Activity logs: `GET /activity-logs/list`, `/activity-logs/get-by-id` for `super_admin`.

## Affected Areas

- `packages/frontend/src/config/routes.tsx` — route inventory is incomplete for cliente and admin; current shared routes rely on super-admin bypass.
- `packages/frontend/src/shared/Layout/DashboardLayout.tsx` — nav is role-based but has hardcoded mini-dashboard metrics and incomplete cliente navigation.
- `packages/frontend/src/features/vendedor/*` — dashboard should replace mock orders/metrics with orders/deliveries/qr data.
- `packages/frontend/src/features/clientes/pages/ClientesPage.tsx` — replace static placeholder with role-aware clientes/cartera/providers real data.
- `packages/frontend/src/features/ordenes/pages/OrdenesPage.tsx` — connect orders list/detail/actions; handle async creation for cliente in later slice.
- `packages/frontend/src/features/qr/pages/QRPage.tsx` — connect QR and invitation link endpoints.
- `packages/frontend/src/features/admin/pages/AdminDashboardPage.tsx` — connect `super-admin/dashboard` and likely split admin subpages.
- `packages/frontend/src/features/productos/*` — keep as reference implementation; extend with categories/brands/search and role-specific actions.
- `packages/frontend/src/services/api.ts` — verify refresh response shape and central error handling before expanding service count.
- `packages/contracts/src/dto/*.ts` — source for response/request types; avoid local duplicate DTOs.
- `docker/init-db/*.sql` — seed credentials and real data assumptions for local testing.

## Safest Implementation Order

1. Stabilize foundation without broad UI churn: verify `VITE_API_URL`/proxy, auth refresh shape, role redirect, and seed login for all three roles.
2. Replace obvious placeholders with read-only pages first: admin dashboard, clientes/cartera, orders list, QR/list-invitacion list.
3. Complete catalog/client role read path: real `/catalogo` using products/categories/brands, then providers selection for cliente.
4. Add mutations only after read pages are stable: product create/update/delete, QR/link create/deactivate, order status/confirm/cancel.
5. Add async workflows last: `orders/create` and `deliveries/update-status` with idempotency key, `202 Accepted`, status polling, and terminal states.

This order protects the running local environment because read-only endpoints validate contracts without changing seeded data.

## Real-Data Assumptions / Seed Credentials

- Password for seeded users is `admin123`.
- Core users from `seed-admin.sql`: `admin@aguafress.com`, `juan@aguafress.com`, `maria@aguafress.com`, `pedro@aguafress.com`.
- Rich mock users from `seed-mock-data.sql`: vendors `carlos`, `ana`, `luis`, `sofia`, `roberto` at `@aguafress.com`; clients `cliente1@aguafress.com` through `cliente25@aguafress.com`.
- Products seed creates 50 products across 5 vendors in `agua_products`; vendor UUIDs intentionally match usuario-service seed IDs.
- Products/catalog tests should prefer a rich vendor/client seed pair such as `sofia@aguafress.com` / AquaPlus for AguaFress-looking data.

## Biggest Risks and Stale Docs Mismatches

- `docs/frontend-gateway-contract.md` still says Productos is placeholder in the frontend status table, but code already has a real Productos slice.
- `frontend-fix` OpenSpec routes use older `/vendedor/*` paths and stale QR/link endpoints (`generate`) while current app uses `/dashboard`, `/clientes`, `/productos`, `/ordenes`, `/qr` and registry uses `vendor/list`, `vendor/create`.
- `packages/frontend-docu-adrian/01-arquitectura-web.md` says Tailwind CSS 4, but installed frontend dependency is Tailwind 3.4.15.
- `AuthContext` casts login response user into `UserProfile`; this can hide mismatch between login payload and profile payload.
- `api.ts` refresh flow expects `{ token }`; contract agrees, but tests should verify gateway real response before building more auth-sensitive pages.
- Gateway registry uses role strings; frontend must keep using `UserRole` enum values from `@agua/contracts`, not handwritten strings.
- Async order/delivery paths need idempotency and polling; treating `202` as completed would be wrong.

## Approaches

1. **Read-first vertical slices** — connect one role/page at a time using existing feature/hook/service/page pattern.
   - Pros: lowest data mutation risk; easy local verification; keeps review slices small.
   - Cons: client checkout and delivery actions arrive later.
   - Effort: Medium.

2. **Role-complete implementation** — finish all vendedor routes, then all cliente routes, then admin.
   - Pros: clear UX story per role.
   - Cons: likely exceeds 400-line review budget quickly; more coupling between pages.
   - Effort: High.

## Recommendation

Use read-first vertical slices and treat Productos as the reference pattern: service typed from `@agua/contracts`, hook with TanStack Query, page with 4 async states, pure presentational components. Start with admin dashboard + clientes because they validate auth/roles and seeded real data with minimal mutation risk.

## Review Workload Forecast

| Field | Estimate |
|-------|----------|
| Estimated changed lines | ~1200–2200 if all placeholders are replaced |
| 400-line budget risk | High |
| Chained PRs likely | Yes |
| Suggested split | PR 1 auth/foundation + admin/clientes read pages; PR 2 products/catalog/cart read flow; PR 3 orders/deliveries/QR/link mutations + async polling |

Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High

## Ready for Proposal

Yes. The next phase should create a proposal that scopes this as incremental real API integration, explicitly avoids React 19-only APIs, keeps React 18 + Vite, and plans chained PRs because the full placeholder replacement exceeds the review budget.
