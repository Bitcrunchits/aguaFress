# Verify Report — frontend-admin-flujos

Date: 2026-08-07
Branch: `feature/frontend-admin-flujos/pr6-vendedor-clients`
Mode: SDD verify executor, frontend-only
Verdict: FAIL

## Executive Summary

The implementation is functionally broad and the required frontend suite is green, but SDD verification cannot pass because two QR/invitation-link scenarios are implemented without passing covering tests. Per `sdd-verify`, a spec scenario is compliant only when covered by a test that passed at runtime.

No backend, gateway, contracts, Prisma, seed, or generated OpenAPI files are included in the tracker-to-PR6 diff. The only non-frontend paths in the diff are SDD tracking artifacts.

## Command Evidence

| Command | Result | Evidence |
|---|---:|---|
| `pnpm --filter @agua/frontend test` | PASS | 40 test files, 177/177 tests passed. Stderr includes React Router v7 future warnings and jsdom navigation noise from existing auth/api tests, but Vitest exited successfully. |
| `pnpm --filter @agua/frontend lint` | PASS_WITH_WARNING | 0 errors, 1 pre-existing `react-refresh/only-export-components` warning in `packages/frontend/src/context/AuthContext.tsx`. |
| `pnpm --filter @agua/frontend build` | PASS | `tsc -b && vite build` completed successfully; 234 modules transformed. |
| `dbs check` | NOT_RUN | `dbs: orden no encontrada`; manual DBS scan found no `any`, `unknown[]`, `console.log`, or `console.error` in new admin/client/cart/catalog slices. |

## Scope Verification

`git diff --name-only feature/frontend-admin-flujos-tracker...HEAD` includes only:

- `packages/frontend/**`
- `openspec/changes/frontend-admin-flujos/apply-progress.md`
- `openspec/changes/frontend-admin-flujos/tasks.md`

No backend/gateway/contracts files are touched by the implementation diff.

Worktree note: there are unrelated untracked paths (`packages/PRS AG-1.txt`, `packages/frontend-docu-adrian/`) that were not touched by verification and are not part of the tracker-to-PR6 diff.

## Requirement Coverage Matrix

| Requirement area | Verdict | Evidence |
|---|---:|---|
| Frontend-only scope and identity boundaries | PASS | Diff scope is frontend + openspec only. Grep found `userId`/`actorUserId` only in assertions proving absence from request bodies. New request bodies use domain `clienteId`/`vendedorId` where required. |
| Super Admin navigation and route access | PASS | `/admin/*` children are guarded by `ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}` under `DashboardLayout`; SUPER_ADMIN nav includes dashboard, vendors, pending vendors, clients, audit, QR codes, invitation links, and profile. Route tests passed. |
| Admin vendor management | PASS | Service/page tests cover `GET /vendedores/list`, pending filter with `VendedorEstado.PENDIENTE`, detail route, typed `PATCH /vendedores/change-estado/{id}`, refresh/error behavior, and no identity fields. |
| Admin vendor registration | PASS | Tests cover `POST /auth/register` with forced `UserRole.VENDEDOR`, validation/backend duplicate errors, pending-success copy, preserved non-sensitive values, and no editable IDs. |
| Admin client management | PASS | Tests cover list/detail/update/reassign/provider-add endpoints, selected domain `vendedorId`, disabled/empty provider selector states, backend errors, refresh behavior, and absence of `userId`/`actorUserId`. |
| Admin QR codes and invitation links | FAIL | Prerequisite and vendor-scoped list tests pass, but deactivation scenarios and backend required-parameter error visibility lack passing covering tests. |
| Admin audit and profile | PASS | Tests cover activity-log list/detail, profile read/update, validation/backend errors, timestamp/action rendering, and no identity fields in profile update. |
| Cliente provider, cart, checkout, and job tracking | PASS | Tests cover provider load/select, provider-scoped catalog gating, add-to-cart/refetch, provider-scoped cart, checkout prerequisites, `CreateOrderV2Request`, `Idempotency-Key`, no `userId`, and job polling to terminal states. |
| Vendedor client flow completion | PASS | Tests cover `/clientes/cartera`, `/clientes/own/get-by-id/{id}`, `/clientes/own/update/{id}`, direct registration via `/auth/register-client/by-vendor`, error preservation, and no `vendedorId`/`userId`/`actorUserId` body fields. |
| Explicit out-of-scope backend-dependent behavior | PASS | Admin routes do not add impersonation or vendedor-only mutation flows; dashboard no longer queries vendor-scoped QR/link endpoints without selected `vendedorId`. |
| Tasks 7.1 frontend-only diff | PASS | Tracker-to-HEAD diff touches only `packages/frontend/**` and SDD artifacts. |
| Task 7.3 no develop merge | PASS | Current branch remains `feature/frontend-admin-flujos/pr6-vendedor-clients`; no merge to `develop` was performed. |

## Spot-Check Test Quality

| Area | Verdict | Evidence |
|---|---:|---|
| Cart checkout MSW tests | PASS | `CartPage.checkout.test.tsx` asserts real `/api/v1/orders/create` request body, `Idempotency-Key` header, absence of `userId`, prerequisite blocking, and `/api/v1/orders/job-status` polling until terminal states. |
| Vendedor client MSW tests | PASS | `VendedorClientPages.test.tsx` asserts real `/api/v1/clientes/cartera`, `/api/v1/clientes/own/get-by-id/{id}`, `/api/v1/clientes/own/update/{id}`, and `/api/v1/auth/register-client/by-vendor` URLs and bodies. |
| Admin QR/link MSW tests | FAIL | Existing tests assert prerequisite and scoped list URLs, but do not exercise deactivate buttons/endpoints or backend required-parameter failure rendering after a selected/invalid vendor request. |

## Findings

### CRITICAL

1. `UNTESTED`: Admin QR deactivate scenario has no passing covering test.
   - Spec: `Admin QR deactivate` requires `PATCH /api/v1/qr/admin/deactivate/{id}` and refresh of the vendor-scoped QR list.
   - Implementation evidence: `AdminQrLinksPage.tsx` renders `Desactivar` at lines 50-52 and `useAdminQrLinks.ts` calls `deactivateAdminQrCode` with invalidation.
   - Test evidence: no matches for `deactivate`, `Desactivar`, or `/qr/admin/deactivate` under `packages/frontend/src/features/admin/__tests__`.

2. `UNTESTED`: Admin invitation-link deactivate scenario has no passing covering test.
   - Spec: `Admin invitation-link deactivate` requires `PATCH /api/v1/link-invitacion/admin/deactivate/{id}` and refresh of the vendor-scoped invitation-link list.
   - Implementation evidence: `AdminQrLinksPage.tsx` renders `Desactivar` at lines 61-63 and `useAdminQrLinks.ts` calls `deactivateAdminLink` with invalidation.
   - Test evidence: no matches for `deactivate`, `Desactivar`, or `/link-invitacion/admin/deactivate` under `packages/frontend/src/features/admin/__tests__`.

3. `UNTESTED`: Backend required-parameter failure visibility for selected QR/link requests lacks direct coverage.
   - Spec: `Required-parameter failures are visible` requires backend rejection for missing/invalid `vendedorId` to render an error state and not an empty pagination object.
   - Existing coverage proves local missing-selection prevention and dashboard no-query behavior, but not a selected QR/link request returning backend 400/500 and rendering `ErrorState`.

### WARNING

1. DBS executable unavailable during verify.
   - `dbs check` could not run because the command is not installed in PATH. Manual DBS scan was performed, but this is weaker than the intended automated gate.

2. Dashboard still renders empty QR/link management cards without a selected vendor.
   - `getAdminOverview()` correctly avoids querying QR/link endpoints and returns empty pagination, satisfying the explicit no-query requirement.
   - Design guidance preferred omitting global QR/link previews or showing vendor-scoped previews only with selection. Current copy can imply there are no active QR/links globally when the data was intentionally not queried.

3. Test output contains jsdom navigation noise in existing auth/api tests.
   - The suite passes, but stderr includes `Not implemented: navigation (except hash changes)` from redirect behavior in `api.ts`. This is non-blocking but reduces signal quality.

### SUGGESTION

1. Add QR/link deactivation MSW tests that assert the exact PATCH URL and that the selected vendor-scoped list is invalidated/refetched.

2. Add QR/link backend-error MSW tests after vendor selection for both QR and links, asserting backend message rendering instead of empty state.

3. Consider changing the dashboard QR/link cards to navigation-only calls-to-action, or hide them, to avoid presenting intentional empty placeholders as real global data.

## Risks Before Archive/Review

- Archive should wait until the CRITICAL untested QR/link scenarios are covered and the full frontend suite is rerun.
- Reviewers should still give extra attention to PR3 and PR6 size, but those over-budget slices are known/accepted context rather than new verify findings.
- The pre-existing `AuthContext.tsx` fast-refresh warning remains outside this change.

## Final Verdict

FAIL: implementation builds and most requirements are covered, but SDD scenario coverage is incomplete for admin QR/invitation-link deactivation and required-parameter error visibility.
