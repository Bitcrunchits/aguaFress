# Tasks: Frontend Admin Flows

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,400-3,600 total |
| Slices count | 6 chained PR slices |
| Per-slice estimate | PR1 ~650-780; PR2 ~300-420; PR3 ~550-750; PR4 ~650-790; PR5 ~650-790; PR6 ~450-650 |
| Chained PRs recommended | Yes |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Slice | 400-line budget risk | 800-line hard cap risk | Boundary |
|------|------|------|------|
| PR1 | High | Medium | tracker branch |
| PR2 | Medium | Low | PR1 branch |
| PR3 | High | Medium | PR2 branch |
| PR4 | High | Medium | PR3 branch |
| PR5 | High | Medium | PR4 branch |
| PR6 | High | Low | PR5 branch |

## PR1: Admin Routes, Navigation, and Vendor Enablement

Goal: establish guarded `/admin/*` navigation plus vendor list/detail/status flows.

- [x] 1.1 Update `packages/frontend/src/config/routes.tsx` with admin child routes under `DashboardLayout`. Refs: Super Admin Navigation and Route Access.
- [x] 1.2 Update `packages/frontend/src/shared/Layout/DashboardLayout.tsx` SUPER_ADMIN menu links. Refs: Admin menu contains all reachable sections.
- [x] 1.3 Add admin vendor services/hooks/pages/components for list, pending list, detail, and `change-estado` using `VendedorEstado`. Refs: Admin Vendor Management; Frontend-Only Scope and Identity Boundaries.
- [x] 1.4 Add colocated Vitest coverage for role-gated routes, async states, pagination/filtering, pending empty state, detail, and status errors. Refs: Admin route async states; Admin Vendor Management.
- [x] 1.5 Verify PR1: `pnpm --filter @agua/frontend test`, `pnpm --filter @agua/frontend lint`, `pnpm --filter @agua/frontend build`.

Estimated changed lines: ~650-780. Rollback boundary: remove admin route/menu additions and vendor slice without affecting backend or later slices.

## PR2: Admin Vendor Registration

Goal: add admin-started vendor onboarding through existing public registration.

- [x] 2.1 Extend frontend auth/admin service access for `POST /api/v1/auth/register` with `role: UserRole.VENDEDOR`. Refs: Admin Vendor Registration.
- [x] 2.2 Add `AdminVendorRegistrationPage` form, validation, pending-approval success copy, and no editable IDs. Refs: Registration validation errors; Password and identity boundaries.
- [x] 2.3 Add Vitest service/page tests for success, frontend validation, backend duplicate errors, and preserved non-sensitive values. Refs: Admin Vendor Registration.
- [x] 2.4 Verify PR2: `pnpm --filter @agua/frontend test`, `pnpm --filter @agua/frontend lint`, `pnpm --filter @agua/frontend build`.

Estimated changed lines: ~300-420. Rollback boundary: remove `/admin/vendors/new` flow only; PR1 vendor management remains intact.

## PR3: Admin Client Management

Goal: enable admin client list/detail/update/reassign/provider-add flows.

- [x] 3.1 Add admin client services/hooks/pages for list/detail/update using domain `clienteId`. Refs: Admin Client Management; Frontend-Only Scope and Identity Boundaries.
- [x] 3.2 Add provider selector/actions for reassignment and provider-add using domain `vendedorId`, disabled when no eligible vendors exist. Refs: Reassign client provider; Add provider relation.
- [x] 3.3 Add Vitest tests for loading/error/empty/success, validation/backend errors, refresh, and no `userId`/`actorUserId` bodies. Refs: Admin Client Management; Audit actor identity.
- [x] 3.4 Verify PR3: `pnpm --filter @agua/frontend test`, `pnpm --filter @agua/frontend lint`, `pnpm --filter @agua/frontend build`.

Estimated changed lines: ~550-750. Rollback boundary: remove admin client routes/slice; PR1/PR2 vendor flows remain shippable.

## PR4: Admin QR, Invitation Links, Audit, and Profile

Goal: fix vendor-scoped QR/link behavior and add audit/profile screens.

- [x] 4.1 Add QR and invitation-link pages/hooks requiring selected `vendedorId` before querying. Refs: Admin QR Codes and Invitation Links.
- [x] 4.2 Update admin QR/link services to surface required-parameter failures and deactivate selected vendor-scoped items. Refs: Required-parameter failures are visible.
- [x] 4.3 Add audit list/detail and profile read/update pages/hooks/services. Refs: Admin Audit and Profile.
- [x] 4.4 Add Vitest tests for prerequisite, error, empty, success, deactivation refresh, audit detail, profile validation, and dashboard not masking QR/link failures. Refs: Admin QR Codes and Invitation Links; Admin Audit and Profile.
- [x] 4.5 Verify PR4: `pnpm --filter @agua/frontend test`, `pnpm --filter @agua/frontend lint`, `pnpm --filter @agua/frontend build`.

Estimated changed lines: ~650-790. Rollback boundary: revert QR/link/audit/profile slice; admin vendor/client slices remain available.

## PR5: Cliente Provider, Cart, Checkout, and Job Tracking

Goal: complete cliente provider-scoped catalog/cart/checkout behavior without backend changes.

- [x] 5.1 Add cliente provider loading/selection state and provider-required catalog gating. Refs: Cliente provider selection; Provider-scoped catalog.
- [x] 5.2 Add add-to-cart and provider-scoped cart refresh behavior. Refs: Add product to cart.
- [x] 5.3 Add checkout form/prerequisite blocking, `CreateOrderV2Request`, `Idempotency-Key`, and no editable `userId`. Refs: Cart checkout; Checkout missing prerequisites.
- [x] 5.4 Add order job pending/polling UI for `202 Accepted`. Refs: Async order job tracking.
- [x] 5.5 Add Vitest tests for provider prerequisites, cart mutation/refetch, checkout validation/body/header, and terminal job polling. Refs: Cliente Provider, Cart, Checkout, and Job Tracking.
- [x] 5.6 Verify PR5: `pnpm --filter @agua/frontend test`, `pnpm --filter @agua/frontend lint`, `pnpm --filter @agua/frontend build`.

Estimated changed lines: ~650-790. Rollback boundary: revert cliente catalog/cart/order additions; admin slices remain isolated.

## PR6: Vendedor Client Flow Completion

Goal: complete vendedor-owned client list/detail/update/direct-registration flows.

- [x] 6.1 Replace vendedor client portfolio calls with `GET /api/v1/clientes/cartera`. Refs: Vendor client portfolio uses own endpoint.
- [x] 6.2 Add vendedor own client detail/update pages/hooks using `/clientes/own/*`. Refs: Vendor client detail; Vendor updates own client.
- [x] 6.3 Add direct client registration by vendor via `POST /api/v1/auth/register-client/by-vendor` without editable `vendedorId`. Refs: Vendor registers client directly.
- [x] 6.4 Add Vitest tests for endpoint usage, loading/error/not-found/success, update errors, and JWT-derived vendor identity. Refs: Vendedor Client Flow Completion.
- [x] 6.5 Verify PR6: `pnpm --filter @agua/frontend test`, `pnpm --filter @agua/frontend lint`, `pnpm --filter @agua/frontend build`.

Estimated changed lines: ~450-650. Rollback boundary: revert vendedor client slice only; cliente/admin slices remain intact.

## Global Constraints for Apply

- [x] 7.1 Confirm every implementation PR modifies only `packages/frontend/**` and SDD tracking files if needed. Refs: Frontend-Only Scope and Identity Boundaries; Explicit Out-of-Scope Backend-Dependent Behavior.
- [x] 7.2 If any slice approaches 800 changed lines, split by route group before adding the next capability. Refs: proposal Delivery Note; design Chained Delivery Plan.
- [ ] 7.3 Do not merge tracker to `develop` without explicit user order. Refs: repo rules.
