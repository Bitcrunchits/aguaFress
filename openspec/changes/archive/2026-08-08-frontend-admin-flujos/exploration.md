# Exploration: frontend-admin-flujos

## Problem Statement

`packages/PRS AG-1.txt` asks the frontend to expose the backend-complete flows that are still missing in the web UI: super-admin menus to register and enable pending vendors, verify what a super-admin can actually do, and complete vendedor/cliente flow screens. This change is frontend-only. Backend, gateway, contracts, and docs under `docs/` must not be modified.

## Current-State Findings

- `packages/PRS AG-1.txt` requests: vendor registration/enablement menus for super-admin, validation of "super-admin can do everything", and completion of vendor/client flow screens.
- `packages/frontend/src/config/routes.tsx` only exposes `/admin` for `SUPER_ADMIN`; admin has no nested routes for vendors, pending vendors, clients, audit, QR/links, or profile.
- `packages/frontend/src/shared/Layout/DashboardLayout.tsx` only shows one `SUPER_ADMIN` nav item: `/admin`.
- `packages/frontend/src/features/admin/pages/AdminDashboardPage.tsx` is a dashboard overview only. It previews recent vendors, clients, audit, QR, and links, but does not provide full list/detail/filter workflows, pending approval, vendor registration, client edit/reassign/provider-add, or admin profile edit.
- `packages/frontend/src/features/admin/services/admin.service.ts` already calls dashboard, vendors, clients, audit, QR, and link endpoints, but QR/link listing is currently malformed because it omits required `vendedorId`.
- `packages/frontend/src/features/clientes/pages/ClientesPage.tsx` shows the vendor client portfolio but has no detail/edit screen and uses `/clientes/list`, which is super-admin-only in the live registry; vendor-owned flows should use `/clientes/cartera`, `/clientes/own/get-by-id/{id}`, and `/clientes/own/update/{id}`.
- `packages/frontend/src/features/catalogo/pages/CatalogoPage.tsx` shows providers and products, but does not expose provider switching despite `useCatalogo` already having `selectProvider`, and does not expose add-to-cart actions despite cart services existing.
- `packages/frontend/src/features/cart/pages/CartPage.tsx` supports quantity update/delete for an existing cart, but has no checkout/create-order action.
- `packages/frontend/src/features/ordenes/pages/OrdenesPage.tsx` lists/detail orders and supports vendor confirm/in-transit plus client cancel, but explicitly blocks client checkout UI because it lacks real delivery address and selected vendor inputs.
- `packages/frontend/src/features/productos/pages/ProductosPage.tsx`, `packages/frontend/src/features/qr/pages/QRPage.tsx`, and `packages/frontend/src/features/deliveries/pages/DeliveriesPage.tsx` already cover the core vendedor product, QR/link, and delivery operational screens.
- `packages/frontend/src/services/auth.service.ts` has login/logout/profile only. There is no frontend service for `POST /auth/register`, `POST /auth/register-client`, or `POST /auth/register-client/by-vendor`.
- `packages/frontend/src/context/AuthContext.tsx` still uses `useMemo`/`useCallback`; future React work should avoid adding more manual memoization per the loaded React 19 skill, but this exploration does not modify code.

## Validated Endpoint Inventory

Source of truth used: `MicroServices/gateway/src/actions/action-registry.ts`, `MicroServices/gateway/src/docs/openapi-spec.service.ts`, `MicroServices/usuario-service/src/tcp/usuario-domain-tcp.controller.ts`, and `packages/contracts`.

### Public / Auth

- `POST /api/v1/auth/login` — public login.
- `POST /api/v1/auth/register` — public vendor registration (`RegisterRequest`), creates a `VENDEDOR` user; backend keeps new vendors pending.
- `POST /api/v1/auth/register-client` — public client registration via invitation token.
- `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` — session lifecycle.
- `GET /api/v1/users/profile` and `PATCH /api/v1/users/profile/update` — authenticated own profile.

### SUPER_ADMIN

- `GET /api/v1/super-admin/dashboard` — consolidated counts.
- `GET /api/v1/super-admin/profile` and `PATCH /api/v1/super-admin/profile/update` — admin profile.
- `GET /api/v1/super-admin/audit-log` and `GET /api/v1/activity-logs/list` — audit list; `GET /api/v1/activity-logs/get-by-id/{id}` for detail.
- `GET /api/v1/vendedores/list?estado=pendiente|activo|inactivo|bloqueado&page=&limit=&search=` — vendor list, including pending filter.
- `GET /api/v1/vendedores/get-by-id/{id}` — vendor detail.
- `PATCH /api/v1/vendedores/change-estado/{id}` with body `{ estado }` — activate, suspend, block, or return vendor to pending using `VendedorEstado` enum values.
- `GET /api/v1/clientes/list?page=&limit=&search=` — admin client list.
- `GET /api/v1/clientes/get-by-id/{id}` — admin client detail.
- `PATCH /api/v1/clientes/update/{id}` — admin client update.
- `PATCH /api/v1/clientes/reassign/{id}` — reassign client's primary/default vendor; audit actor comes from JWT `userId`.
- `POST /api/v1/clientes/providers/add/{id}` — add active provider relation for a client.
- `GET /api/v1/super-admin/qr-codes?vendedorId=&page=&limit=` — list QR codes for a specific vendor.
- `GET /api/v1/super-admin/link-invitacion?vendedorId=&page=&limit=` — list invitation links for a specific vendor.
- `PATCH /api/v1/qr/admin/deactivate/{id}` and `PATCH /api/v1/link-invitacion/admin/deactivate/{id}` — deactivate QR/link as admin.
- `POST /api/v1/auth/admin-generate-reset-token` — super-admin password reset token generation for a user.

### VENDEDOR

- `GET /api/v1/vendedores/profile` and `PATCH /api/v1/vendedores/profile/update` — vendor profile self-management.
- `GET /api/v1/clientes/cartera` — own client portfolio.
- `GET /api/v1/clientes/own/get-by-id/{id}` and `PATCH /api/v1/clientes/own/update/{id}` — own client detail/update.
- `POST /api/v1/auth/register-client/by-vendor` — vendor registers a client directly.
- `POST/PATCH/DELETE /api/v1/products/*`, `/api/v1/categories/*`, `/api/v1/brands/*` — vendor-owned catalog management; `vendedorId` is resolved from JWT.
- `GET /api/v1/orders/list`, `GET /api/v1/orders/get-by-id/{id}`, `POST /api/v1/orders/confirm`, `PATCH /api/v1/orders/status/update` — vendor order operations.
- `GET /api/v1/deliveries/list`, `GET /api/v1/deliveries/get/{id}`, `PATCH /api/v1/deliveries/update-status`, `GET /api/v1/deliveries/job-status` — delivery operations.
- `GET/POST/PATCH /api/v1/qr/vendor/*` and `/api/v1/link-invitacion/vendor/*` — vendor QR/link management.

### CLIENTE

- `GET /api/v1/clientes/providers` and `POST /api/v1/clientes/providers/select` — active vendor/provider selection using domain `vendedorId`.
- `GET /api/v1/products/list`, `GET /api/v1/products/get`, `GET /api/v1/products/search`, `GET /api/v1/categories/list`, `GET /api/v1/brands/list` — catalog browsing scoped by selected `vendedorId`.
- `GET /api/v1/cart/get?vendedorId=`, `POST /api/v1/cart/items/add`, `PATCH /api/v1/cart/items/update`, `DELETE /api/v1/cart/items/delete` — provider-scoped cart.
- `POST /api/v1/orders/create` with `CreateOrderV2Request` and `Idempotency-Key` — async checkout for selected `vendedorId`; `userId` is always JWT-derived.
- `GET /api/v1/orders/list`, `GET /api/v1/orders/get-by-id/{id}`, `GET /api/v1/orders/job-status`, `POST /api/v1/orders/cancel` — client order lifecycle.

## Confirmed Bug List

- `packages/frontend/src/features/admin/services/admin.service.ts` calls `/super-admin/qr-codes` without `vendedorId`; live OpenAPI declares `vendedorId` as a query param and `usuario-domain-tcp.controller.ts` calls `requireVendedorId(dto.vendedorId)`.
- `packages/frontend/src/features/admin/services/admin.service.ts` calls `/super-admin/link-invitacion` without `vendedorId`; live OpenAPI declares `vendedorId` as required and the TCP controller also calls `requireVendedorId(dto.vendedorId)`.
- `getAdminOverview()` hides both QR/link failures with `Promise.allSettled()` and substitutes empty pagination, so the admin dashboard can falsely report no QR/links instead of surfacing the missing `vendedorId` bug.
- `packages/frontend/src/features/clientes/services/clientes.service.ts` defaults `listClientes()` to `/clientes/list`; this endpoint requires `SUPER_ADMIN`, but `ClientesPage` is currently a vendedor route. The vendor flow should call `/clientes/cartera` unless the route is explicitly admin.
- `CatalogoPage` does not render `selectProvider` or `addCartItem`, so client catalog browsing cannot actually switch vendor or add products to cart from the UI.
- `CartPage` does not expose checkout even though `useOrdenes` and `ordenes.service.ts` already support `createOrder` with idempotency.

## Scope Boundaries

### In Scope

- Add super-admin navigation and route structure under `/admin/*` for dashboard, vendors, pending vendors, vendor detail/status, clients, audit, QR/links by selected vendor, and admin profile.
- Add frontend service/hooks/pages for vendor registration via `POST /auth/register` using `UserRole.VENDEDOR`, then show the vendor as pending until activated.
- Add admin vendor enablement from pending list/detail using `VendedorEstado` enum values; no string status literals.
- Add admin client management screens using existing admin endpoints: list/detail/update/reassign/provider-add.
- Fix admin QR/link listing to require a selected `vendedorId` and stop swallowing required-parameter failures.
- Complete client flows: provider selection UI, add-to-cart from catalog, cart checkout using `CreateOrderV2Request`, order job tracking, and use real profile/delivery address data where available.
- Complete vendor flows where missing: own client detail/update and direct client registration by vendor.
- Preserve identity boundaries: `userId` only from JWT; frontend forms pass domain `vendedorId`/`clienteId` only where contracts require domain scoping.

### Out of Scope

- Backend changes, gateway role changes, contract changes, database changes, or OpenAPI generator changes.
- Making `SUPER_ADMIN` perform vendedor-only product/order/delivery actions. The live gateway restricts those actions to `vendedor`; frontend cannot honestly implement "super-admin can do everything everyone can" without backend role support.
- Copying routes from stale docs under `docs/`; live paths must keep `/api/v1/{service}/{action}` via gateway registry/OpenAPI.
- Adding cross-service foreign keys or changing identity semantics.

## Approach Comparison

| Approach | Pros | Cons | Effort |
| --- | --- | --- | --- |
| Single admin mega-dashboard | Minimal routing work; fastest visible surface | Becomes hard to test, hides deep flows, poor cognitive load, repeats current dashboard limitation | Medium |
| Nested admin routes under `/admin/*` with feature-specific pages | Clear navigation, maps to backend capabilities, easier chained PR slices, keeps admin concerns separated | More route/page files and tests | Medium |
| Reuse vendedor/cliente pages by allowing `SUPER_ADMIN` in existing routes | Less UI duplication for lists | Incorrect authorization model for protected actions; risks calling vendedor-only endpoints with super-admin JWT and producing 403s | Medium/High |
| Add an explicit "Act as vendor" frontend mode | Could match the user's "can do everything" wording visually | Backend does not support impersonation; dangerous identity confusion between `userId` and `vendedorId` | High |

## Recommendation

Use nested admin routes under `/admin/*` and keep admin screens separate from vendedor/cliente operational routes. Reuse shared presentational components and low-level service patterns, but do not reuse protected vendedor/cliente pages for super-admin actions. This matches the live gateway role model, keeps SDD slices reviewable, and avoids identity bugs.

Recommended implementation order for chained delivery:

1. Admin navigation/routes plus vendor list, pending filter, vendor detail, and `change-estado`.
2. Admin vendor registration via `POST /auth/register` and pending-state UX.
3. Admin clients list/detail/update/reassign/provider-add.
4. Admin QR/link screens requiring selected `vendedorId`, plus audit/profile screens.
5. Client flow completion: provider switch, add-to-cart, checkout, job tracking, profile delivery address.
6. Vendor flow completion: own client detail/update and direct client registration.

## Risks

- The phrase "super-admin can do everything everyone can" conflicts with the live gateway role matrix. The frontend must explain/surface only real super-admin capabilities unless backend role support changes in a separate backend SDD.
- Admin QR/link pages need a vendor-selection prerequisite; loading them globally will keep failing because `vendedorId` is required.
- Client checkout requires a valid `DireccionEntrega`; if profile lacks it, UI must collect it without sending `userId` or confusing `clienteId` semantics.
- Existing manual React memoization in `AuthContext` should not be expanded in new React work.
- Review size can exceed the 800-line budget if all admin and client/vendor flows land together; force-chained delivery is appropriate.

## Ready for Proposal

Yes. The next phase should create a proposal that explicitly scopes the change as frontend-only, rejects backend impersonation/role expansion, and plans chained frontend slices around admin vendor enablement first.
