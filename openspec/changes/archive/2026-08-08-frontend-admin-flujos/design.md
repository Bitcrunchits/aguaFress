# Design: Frontend Admin Flows

## Technical Approach

Implement the missing PRS AG-1 frontend flows as feature-based React vertical slices on top of the existing API Gateway client. The change stays frontend-only: routes, pages, hooks, services, types, and tests may change; backend, gateway, contracts, Prisma schemas, seeds, and generated OpenAPI files are out of scope.

The architecture keeps the existing page -> hook -> service -> `services/api.ts` flow. Admin screens are nested under `/admin/*` and guarded with `ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}` inside `DashboardLayout`. Vendedor and cliente flow completion remains in their own role routes and MUST NOT be reused as super-admin impersonation.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Admin routing | Add nested `/admin/*` children below the existing SUPER_ADMIN protected route and `DashboardLayout` | Reuse `/clientes`, `/productos`, `/ordenes`, `/qr` with SUPER_ADMIN allowed | Reusing vendedor/cliente pages would call role-restricted endpoints with the wrong JWT role and create identity bugs. |
| Admin navigation | Expand `NAV_ITEMS_BY_ROLE[UserRole.SUPER_ADMIN]` with direct links for dashboard, vendors, pending vendors, clients, audit, QR codes, invitation links, and profile | Keep one admin menu item and link from dashboard cards | The spec requires all reachable admin sections in navigation and reduces hidden workflows. |
| Feature boundaries | Keep each capability in `src/features/<area>/{pages,hooks,services,components,types.ts,__tests__}` | Central admin mega-feature for every flow | SRP: admin vendor management, admin clients, QR/links, cliente checkout, and vendedor clients have different reasons to change. |
| Data layer | Feature services call `/api/v1` routes through shared `api`; hooks use TanStack Query for cache, mutation, invalidation, and polling | Call Axios from pages or duplicate API clients | Preserves token refresh/error behavior and prevents endpoint knowledge leaking into UI components. |
| DTOs and enums | Import DTOs/enums from `@agua/contracts` where available; use local flat interfaces only for missing UI wrappers | `unknown[]`, `any`, or ad-hoc string states | Matches repo rules: no `unknown[]` responses, no string status literals, typed `VendedorEstado`. |
| QR/link admin fix | Require selected `vendedorId` before querying `/super-admin/qr-codes` or `/super-admin/link-invitacion`; surface backend errors | Keep dashboard all-settled fallback to empty pagination | The current service masks required-parameter failures and falsely reports empty data. |
| React patterns | Add named React imports only and avoid new `useMemo`/`useCallback` unless the existing codebase specifically requires it | Manually memoize handlers and derived lists by default | Aligns with the loaded React 19 skill while preserving the current React 18/Vite app. |

## Route And Navigation Architecture

`packages/frontend/src/config/routes.tsx` should keep the existing top-level `/admin` protected route and add admin children under its `DashboardLayout` child:

| Route | Page | Role | Purpose |
|---|---|---|---|
| `/admin` | `AdminDashboardPage` | `SUPER_ADMIN` | Dashboard metrics and honest links to detailed workflows. |
| `/admin/vendors` | `AdminVendorsPage` | `SUPER_ADMIN` | Vendor list with `estado`, `page`, `limit`, and `search`. |
| `/admin/vendors/pending` | `AdminPendingVendorsPage` | `SUPER_ADMIN` | Pending vendor approval queue using `VendedorEstado.PENDIENTE`. |
| `/admin/vendors/new` | `AdminVendorRegistrationPage` | `SUPER_ADMIN` | Vendor registration through `POST /auth/register` with role `VENDEDOR`. |
| `/admin/vendors/:vendedorId` | `AdminVendorDetailPage` | `SUPER_ADMIN` | Vendor profile and status changes. |
| `/admin/clients` | `AdminClientsPage` | `SUPER_ADMIN` | Client list with pagination/search. |
| `/admin/clients/:clienteId` | `AdminClientDetailPage` | `SUPER_ADMIN` | Client profile update, reassign, add provider relation. |
| `/admin/audit` | `AdminAuditPage` | `SUPER_ADMIN` | Audit/activity log list. |
| `/admin/audit/:auditId` | `AdminAuditDetailPage` | `SUPER_ADMIN` | Optional detail when linked from audit list. |
| `/admin/qr-codes` | `AdminQrCodesPage` | `SUPER_ADMIN` | Vendor-scoped QR listing and admin deactivate action. |
| `/admin/invitation-links` | `AdminInvitationLinksPage` | `SUPER_ADMIN` | Vendor-scoped invitation-link listing and admin deactivate action. |
| `/admin/profile` | `AdminProfilePage` | `SUPER_ADMIN` | Super-admin profile read/update. |

`DashboardLayout.tsx` should keep a single role-based menu model but expand the SUPER_ADMIN list:

| Menu item | Target |
|---|---|
| Admin Dashboard | `/admin` |
| Vendors | `/admin/vendors` |
| Pending Vendors | `/admin/vendors/pending` |
| Clients | `/admin/clients` |
| Audit | `/admin/audit` |
| QR Codes | `/admin/qr-codes` |
| Invitation Links | `/admin/invitation-links` |
| Profile | `/admin/profile` |

All admin routes stay behind the existing `ProtectedRoute` role check. Pages should not issue admin queries before the role guard allows rendering.

## Feature Structure

Use the current feature conventions and add only the files needed by each slice.

| Area | Structure | Responsibility |
|---|---|---|
| `features/admin/pages` | Admin dashboard, vendors, clients, audit, QR/link, profile pages | Route-level orchestration and loading/error/empty/success rendering. |
| `features/admin/hooks` | `useAdminVendors`, `useAdminVendorDetail`, `useAdminClients`, `useAdminQrCodes`, `useAdminInvitationLinks`, `useAdminAudit`, `useAdminProfile` | TanStack Query keys, queries, mutations, invalidation, polling where needed. |
| `features/admin/services` | Extend `admin.service.ts` or split by domain when it grows past one responsibility | Gateway calls for super-admin, vendedores, clientes, audit, QR/link endpoints. |
| `features/admin/components` | Vendor selector, status badge/actions, provider selector, shared admin tables/forms | Presentational components with typed props and no HTTP knowledge. |
| `features/admin/types.ts` | Contract aliases plus flat local UI wrappers | No `unknown[]`; no inline nested types. |
| `features/clientes` | Vendedor own client list/detail/update and direct client registration | Vendedor-owned client workflow using `/clientes/cartera` and `/clientes/own/*`. |
| `features/catalogo` | Provider selector and add-to-cart action | Cliente catalog must be provider-scoped by selected `vendedorId`. |
| `features/cart` | Checkout form/action and prerequisite blocking | Provider-scoped cart plus order creation. |
| `features/ordenes` | Async order job status handling | Poll or link to job status after `202 Accepted`. |

Split files when responsibilities diverge. For example, `admin.service.ts` may start as one service file, but vendor/client/QR/profile functions should be grouped clearly and can be split into `admin-vendors.service.ts`, `admin-clients.service.ts`, and `admin-invitations.service.ts` if review size or SRP suffers.

## Data Layer

Services call the existing Axios client from `packages/frontend/src/services/api.ts`. Because `VITE_API_URL` defaults to `/api/v1`, service paths should remain gateway-relative, for example `/vendedores/list` rather than hardcoded absolute URLs.

| Capability | Service call | DTO/type notes |
|---|---|---|
| Admin dashboard | `GET /super-admin/dashboard` | `SuperAdminDashboardResponse`. |
| Vendor list | `GET /vendedores/list` with `estado`, `page`, `limit`, `search` | `PaginatedResponse<SuperAdminVendedorItem>`. |
| Vendor detail | `GET /vendedores/get-by-id/{id}` | Use contract response if exported; otherwise local flat interface matching returned fields. |
| Vendor status | `PATCH /vendedores/change-estado/{id}` body `{ estado }` | `estado` must be `VendedorEstado`, not string literals. |
| Vendor registration | `POST /auth/register` body from register contract with `role: UserRole.VENDEDOR` | Do not include `userId`, `actorUserId`, or database IDs. |
| Admin clients | `GET /clientes/list`, `GET /clientes/get-by-id/{id}`, `PATCH /clientes/update/{id}` | Use contract client DTOs where available. |
| Client reassignment | `PATCH /clientes/reassign/{id}` body with selected domain `vendedorId` | No JWT identity fields in body. |
| Client provider add | `POST /clientes/providers/add/{id}` body with selected domain `vendedorId` | Disable when no eligible vendor exists. |
| QR codes | `GET /super-admin/qr-codes?vendedorId=...`, `PATCH /qr/admin/deactivate/{id}` | Query disabled until a vendor is selected. |
| Invitation links | `GET /super-admin/link-invitacion?vendedorId=...`, `PATCH /link-invitacion/admin/deactivate/{id}` | Query disabled until a vendor is selected. |
| Audit | `GET /super-admin/audit-log` or `GET /activity-logs/list`; detail `GET /activity-logs/get-by-id/{id}` | Pick the live endpoint that matches existing response shape during implementation. |
| Admin profile | `GET /super-admin/profile`, `PATCH /super-admin/profile/update` | Preserve backend validation errors. |
| Vendedor clients | `GET /clientes/cartera`, `GET /clientes/own/get-by-id/{id}`, `PATCH /clientes/own/update/{id}` | Do not use super-admin `/clientes/list` on vendedor route. |
| Vendor client registration | `POST /auth/register-client/by-vendor` | Vendor identity comes from JWT, no editable `vendedorId`. |
| Cliente providers | `GET /clientes/providers`, `POST /clientes/providers/select` | Selected provider is domain `vendedorId`. |
| Cart and checkout | `GET /cart/get?vendedorId=...`, `POST /cart/items/add`, `POST /orders/create` | `CreateOrderV2Request` plus `Idempotency-Key`; no editable `userId`. |
| Order jobs | `GET /orders/job-status` | Poll until terminal state after async accepted responses. |

Query keys should use const objects per feature, for example `ADMIN_QUERY_KEYS.vendors.list(filters)` and `ADMIN_QUERY_KEYS.qrCodes.list(vendedorId, pagination)`. Mutations invalidate the smallest useful key: status changes invalidate vendor detail and vendor lists; QR/link deactivation invalidates only the selected vendor-scoped QR/link list and dashboard summaries if shown there.

## Admin QR And Invitation Link Fix

The current admin overview calls QR/link endpoints without `vendedorId` and then converts failures to empty pagination. The fix should make vendor selection explicit.

Flow:

1. `AdminQrCodesPage` and `AdminInvitationLinksPage` render a vendor selector backed by `GET /vendedores/list`.
2. Before selection, the page shows a prerequisite `EmptyState` explaining that a vendor must be selected and does not run the QR/link query.
3. Once selected, the hook enables the query with `vendedorId`, pagination, and a query key that includes both.
4. If the backend rejects missing/invalid `vendedorId`, the hook normalizes the API error and the page renders `ErrorState`; it must not replace the error with empty data.
5. Deactivate actions call admin endpoints and invalidate the selected vendor-scoped list after success.

The dashboard should either omit QR/link global previews or show a vendor-scoped preview only after a selected vendor exists. It must not use `Promise.allSettled()` to hide these required-parameter failures.

## State, Error, And Loading Patterns

Pages should keep the current async shape:

| State | Pattern |
|---|---|
| Loading route data | `PageSkeleton` for full-page loads. |
| Loading inline mutation | `Spinner` or disabled action button text while mutation is pending. |
| Backend/query error | `ErrorState` with `normalizeApiError(error, fallback).message` and retry where meaningful. |
| Empty result | `EmptyState` with capability-specific copy and action when useful. |
| Missing prerequisite | `EmptyState` or disabled form state explaining the missing vendor/provider/address/cart input. |
| Success | Typed tables/cards/forms using contract DTO fields. |

Do not collapse backend errors into empty states. Empty means a successful request returned no data; error means the request failed.

## SOLID And Repo Compliance

| Rule | Design application |
|---|---|
| SRP | Pages render and coordinate; hooks own query/mutation behavior; services own HTTP; components are presentational. Split admin domains if one file starts changing for unrelated reasons. |
| OCP | Add new route/page/hook/service modules instead of modifying backend contracts or changing existing DTOs. If frontend-only DTO extension is unavoidable, use separate V2/local wrapper types. |
| LSP | Preserve contract event/DTO assumptions; do not narrow response types in a way that breaks existing consumers. |
| ISP | Keep admin, vendedor, and cliente concerns in separate hooks/services; a cliente provider selector must not depend on admin vendor management types. |
| DIP | UI depends on feature service interfaces and `@agua/contracts` abstractions, not backend implementation details. |
| Identity | Forms never collect or send JWT `userId` or `actorUserId`; only domain `clienteId`/`vendedorId` where an endpoint requires it. |
| Enums | Use `UserRole` and `VendedorEstado` from contracts or existing typed exports. No ad-hoc status strings. |
| Dates | Render backend timestamps as ISO strings or format from ISO values; do not invent local date shapes. |
| Dead code | Remove obsolete placeholders in the touched feature slice rather than leaving unused pages/hooks/types. |

## Testing Strategy

The acceptance text says "Jest 29", but the current `@agua/frontend` package test script is `vitest run`. This design keeps the repository runner as the verification command unless a separate tooling change is approved. Tests should still follow Jest-style unit/component coverage semantics through the existing Vitest + Testing Library setup.

Command:

```bash
pnpm --filter @agua/frontend test
```

Coverage by slice:

| Layer | What to test |
|---|---|
| Services | Correct gateway path, params, bodies, idempotency headers, and typed response mapping. |
| Hooks | Query enablement, error propagation, mutation invalidation, QR/link vendor prerequisite, job polling terminal states. |
| Pages | Loading, error, empty, success, disabled prerequisite states, and role-specific navigation links. |
| Routing/layout | `/admin/*` routes are under `DashboardLayout` and blocked for non-`SUPER_ADMIN` users. |
| Forms | Vendor registration, status changes, client update/reassign/provider-add, checkout validation. |

Prefer colocated feature tests under `features/<area>/__tests__` for new capability-specific coverage, while preserving existing top-level `src/__tests__` conventions when extending current tests.

## Chained Delivery Plan

Delivery strategy is `force-chained` with `feature-branch-chain`. Each PR targets the previous slice branch, except PR1 which targets the tracker branch. Each slice should stay under 800 changed lines and remain independently reviewable and shippable in order.

| PR | Target | Scope | Review notes |
|---|---|---|---|
| PR1: admin routes/nav + vendor enablement | tracker branch | Add nested admin routes/menu, vendor list, pending list, vendor detail, `change-estado`, tests | Establishes route architecture and most important admin lifecycle. |
| PR2: admin vendor registration | PR1 branch | Add register service/hook/page via `POST /auth/register`, success pending UX, validation tests | Depends on vendor routes from PR1; shippable because new vendors remain pending. |
| PR3: admin clients | PR2 branch | Add client list/detail/update/reassign/provider-add, provider selector, tests | Uses vendor list from PR1 for reassignment/provider-add selector. |
| PR4: admin QR/link/audit/profile | PR3 branch | Fix vendor-scoped QR/link pages, stop masking parameter failures, add audit/profile screens, tests | Includes the confirmed QR/link bug fix after vendor selector exists. |
| PR5: cliente provider/cart/checkout | PR4 branch | Provider switching, catalog add-to-cart, checkout prerequisites, `CreateOrderV2Request`, job tracking tests | Shippable cliente flow without backend changes; blocks unsupported checkout prerequisites before submit. |
| PR6: vendedor client completion | PR5 branch | Use `/clientes/cartera`, own detail/update, direct client registration by vendor, tests | Corrects vendedor endpoint usage after admin/client foundations are stable. |

If any PR approaches 800 changed lines, split by route group before adding new capabilities. Do not merge to `develop` unless the user explicitly orders it.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| "Super-admin can do everything" conflicts with live gateway permissions | Frontend could create 403-heavy or misleading UX | Keep admin pages limited to real SUPER_ADMIN endpoints; document backend-dependent behavior as out of scope. |
| QR/link dashboard previews require vendor context | Existing dashboard can lie by showing empty data | Move QR/link management to vendor-scoped pages or require selection before querying. |
| Testing requirement names Jest 29 while repo uses Vitest | Review confusion or failed expectation | Use `pnpm --filter @agua/frontend test` as the repo source of truth; raise tooling migration separately if required. |
| Checkout address/provider prerequisites may be incomplete in current UI state | Invalid order requests | Block submission until provider, cart, and delivery address are present; do not change contracts. |
| Diff size | Review fatigue and missed bugs | Keep forced chained PRs under 800 changed lines and ship in dependency order. |

## Verification Checklist

- [ ] Only frontend files are modified during implementation.
- [ ] Every `/admin/*` route is guarded by `UserRole.SUPER_ADMIN` and rendered under `DashboardLayout`.
- [ ] SUPER_ADMIN menu exposes dashboard, vendors, pending vendors, clients, audit, QR codes, invitation links, and profile.
- [ ] Admin QR/link services require selected `vendedorId` and do not swallow parameter failures.
- [ ] Vendedor client pages use vendedor-owned endpoints, not super-admin client list endpoints.
- [ ] Cliente checkout sends `CreateOrderV2Request` with `Idempotency-Key` and no editable `userId`.
- [ ] Tests pass with `pnpm --filter @agua/frontend test`.
