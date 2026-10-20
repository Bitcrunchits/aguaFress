# Frontend MVP base

## Objective

Build the first Angular MVP foundation for AguaFress without attempting the full frontend. The deliverable starts with the project base, visual system, routing shell, authentication/session foundation, and the first login path needed by the MVP slice.

## Problem

The repository is backend-first and currently has no Angular app. The frontend docs now define the MVP slice, screen models, and visual direction, but implementation needs a recoverable task trail before source changes begin.

## Why

A small vertical MVP prevents scope creep while still proving the product flow: login, role-based navigation, admin/vendor/customer shells, vendor catalog, customer catalog/cart/orders.

## Authorized scope

- Create the Angular app under `packages/frontend/`.
- Configure the frontend MVP foundation only.
- Use Angular + Tailwind + PrimeNG + Heroicons.
- Consume the backend only through the gateway contract when API integration starts.
- Do not modify backend microservices unless a future explicit authorization names that change.

## References

- `packages/documentacion/frontend-implementation-map.md`
- `packages/documentacion/frontend-screen-blueprints.md`
- `packages/documentacion/frontend-mvp-slice.md`
- `packages/documentacion/frontend-visual-direction.md`

## TDD / checks

- TDD mode: not explicitly configured for ODD frontend work in this session.
- Required checks per work unit: package install/generation result, `pnpm --filter @agua/frontend build`, and any generated test/lint command available in the Angular project.

## Delivery strategy

- Strategy: `ask-on-risk` by default.
- Current FMVP-004 work unit exceeds the 400-line review budget; keep login, session behavior, and their tests together as one coherent unit. PR sizing remains a separate decision before publication.
- Chain strategy: `feature-branch-chain`, chosen by the user; keep work on `frontend-angular` and integrate toward `develop` only. Do not target `main`, create PRs, or merge without separate authorization.
- Commit style: Conventional Commits, one work-unit commit per coherent unit.

## Tasks

- [x] FMVP-001 — Create Angular workspace app in `packages/frontend/`.
  - Route: delegated direct.
  - Trigger evidence: generator/configuration affects multiple files and should stay bounded in a writer task.
  - Acceptance: Angular app exists inside the pnpm workspace with routing and SCSS; no backend files changed.
  - Checks: generation command result; dependency install result; initial build if available.
  - Evidence: Angular CLI latest was rejected by local Node `v22.16.0` because it requires at least `v22.22.3`; generated with `@angular/cli@20`, installed with pnpm `12.3.4`, and built successfully with `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`.

- [x] FMVP-002 — Configure Tailwind, PrimeNG, Heroicons, and MVP visual tokens.
  - Route: delegated direct.
  - Trigger evidence: touches Angular styles/config/package setup across multiple files.
  - Acceptance: visual tokens reflect `frontend-visual-direction.md`; app builds.
  - Checks: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`; `git diff --check`; DBS check/manual scan; structural readback.
  - Evidence: added Tailwind v4 PostCSS config in `packages/frontend/postcss.config.mjs`; imported Tailwind and defined AguaFress MVP CSS custom properties plus Tailwind `@theme` tokens in `packages/frontend/src/styles.scss`; configured PrimeNG v20 Aura with `provideAnimationsAsync()` and `providePrimeNG()` in `packages/frontend/src/app/app.config.ts`; documented Heroicons as installed for future concrete icon imports with no runtime provider required.

- [x] FMVP-002A — Configure VPS gateway API base for the Angular frontend.
  - Route: delegated direct.
  - Trigger evidence: prepares the integration seam before real auth/services and touches Angular environment configuration, core config, and frontend docs without backend changes.
  - Acceptance: production/default and development Angular builds resolve the API base URL to `https://api-aguafress.eadev.cloud`; future services can import a small core API config instead of importing environments everywhere; documentation no longer implies localhost-only integration.
  - Checks: structural readback completed; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully; DBS CLI unavailable, manual DBS scan completed with no critical findings.
  - Evidence: added `src/environments/environment.ts`, `src/environments/environment.development.ts`, and `src/app/core/config/api.config.ts`; configured development file replacement in `angular.json`; updated frontend README and implementation map with VPS gateway target and live docs URL candidates.

- [x] FMVP-003 — Create base app structure and shell routes.
  - Route: delegated direct.
  - Trigger evidence: touches routing, layout, shared/core folders and multiple components.
  - Acceptance: `core`, `layout`, `features`, and `shared` structure exists; public/auth and role shell routes are stubbed.
  - Checks: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`; `git diff --check`; DBS check/manual scan; structural readback.
  - Evidence: added `layout`, `features/auth`, `features/admin`, `features/vendedor`, `features/cliente`, and `shared` structure under `packages/frontend/src/app/`; replaced the generated Angular placeholder with the root router outlet; added standalone route stubs for `/auth/login`, `/admin`, `/vendedor`, and `/cliente`; kept auth/session and backend integration logic out of scope.

- [x] FMVP-004 — Implement login screen foundation and auth/session contracts.
  - Route: delegated direct.
  - Trigger evidence: touches UI, services, guards/interceptors and models.
  - Acceptance: `/auth/login` visual matches MVP direction; auth/session service and API gateway base configuration are prepared without inventing backend contracts.
  - Checks: build; unit tests if generated/applicable.
  - Evidence: session policy confirmed by the user (localStorage under one key `aguafress.session`; bootstrap restore + refresh via gateway `auth.refresh`; multi-tab logout via `storage` events; 401 on protected endpoints → controlled logout). Verified the gateway exposes refresh: `auth.refresh` registered public in `MicroServices/gateway/src/actions/action-registry.ts:42` and reachable as `POST /api/v1/auth/refresh` via the controller's generic `@Post(':action(.*)')` in `MicroServices/gateway/src/gateway.controller.ts:80`; contracts define `RefreshTokenRequest`/`RefreshTokenResponse` in `packages/contracts/src/dto/auth.dto.ts:125-131`. Implemented `core/auth` (auth.models, session-storage.service, auth.service, auth.guard), `core/http/auth.interceptor` (bearer attachment + 401 logout), rewrote the `/auth/login` screen with email/password form, loading and error states per the MVP visual direction, and wired guards/interceptor in `app.routes.ts`/`app.config.ts`. Bootstrap restore refreshes the access token and then validates the session against the authenticated gateway `users.profile` action: its `role`/`isActive` overwrite the stored role, a failed profile call or an inactive account clears the session, and `sessionReady$` settles only after that check, so `authGuard`/`roleGuard` authorize on the server-validated role instead of the editable localStorage copy (`LoginResponse.user.role` from `auth.login` stays authoritative for the login flow). Consumed `@agua/contracts` types (`LoginRequest`, `LoginResponse`, `UserRole`, `UserProfile`, refresh DTOs) via a tsconfig `paths` mapping inside `packages/frontend/` so the root lockfile stays untouched. Inactive vendors are rejected by the backend with 401 (`MicroServices/usuario-service/src/auth/auth.service.ts:246`) and are surfaced as a distinct login error message. Pre-commit review round 3 hardened the same trust boundary: a session installed by another tab re-runs the bootstrap restore (readiness flips back to `false`, then `auth.refresh` + `users.profile`, and a failure clears the session; a cross-tab access-token rotation and a remote logout keep their previous immediate behavior), profile validation now persists the server `id`/`email`/`role` over any stored copy (server values win; a same-principal staleness check keeps them from being discarded by a cross-tab token rotation), and the interceptor's 401 logout clears the session only when the failed request belongs to the session still held. Checks: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` succeeded; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless` passed (46 tests: 2 existing app tests plus focused specs for AuthService — login success/failure/inactive, restore+refresh with profile validation, refresh failure, inactive or failed profile, logout, multi-tab in/out, cross-tab replacement revalidation (including refresh- and profile-rejected logout) and rotation adoption, tampered id/email/role replacement — guards including server-validated role grants, tampered-role denial, and cross-tab replacement gating — and the auth interceptor, including the delayed-401-from-a-superseded-session case); `git diff --check` clean; manual DBS scan found no `any`, `console.*`, god files, tight coupling, dead exports, or `new`-ed injectables.

## Progress

- Created task document before the first source write.
- Recommended app location: `packages/frontend/`, because it fits existing `packages/*` pnpm workspace without changing workspace layout.
- Completed FMVP-001 with a new Angular standalone app using routing and SCSS under `packages/frontend/`.
- Completed FMVP-002A with the VPS gateway API base configuration for Angular environments and core API config.
- Completed FMVP-002 with Tailwind v4, PrimeNG Aura, Heroicons readiness, and MVP visual tokens.
- Completed FMVP-003 with standalone Angular shell routes for login, admin, vendor, and customer workspaces.
- FMVP-004 paused before source changes: login API and roles are confirmed locally, but the session persistence/refresh/logout policy needs an explicit decision before a safe auth implementation.
- FMVP-004 session policy decided by the user: localStorage (single key `aguafress.session`) for access token, refresh token, and user; bootstrap restore with gateway refresh (`auth.refresh`); multi-tab logout via `storage` events; expiry handled as logout-on-401.
- Completed FMVP-004 with the login screen, auth/session services, bearer interceptor, auth/guest guards, role-based redirects, server-validated role on bootstrap restore (`users.profile`), and focused unit tests.

## Verification evidence

- `pnpm dlx @angular/cli@latest new frontend --directory packages/frontend --standalone --routing --style scss --skip-git --package-manager pnpm --defaults --ssr=false` failed before generation because Angular CLI latest requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`; local Node is `v22.16.0`.
- `pnpm dlx @angular/cli@20 new frontend --directory packages/frontend --standalone --routing --style scss --skip-git --package-manager pnpm --defaults --ssr=false` created the Angular files; the generator install step failed because the repository requires pnpm `12.3.4` while ambient pnpm is `11.5.3`.
- `pnpm dlx pnpm@12.3.4 install` completed successfully after allowing Angular native build dependencies `@parcel/watcher` and `lmdb` in `pnpm-workspace.yaml`.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully. Output: `packages/frontend/dist/frontend`.
- FMVP-002A: structural readback completed for Angular environment/core config and docs; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend`; `dbs` CLI was unavailable, so manual DBS scan found no `any`, `console.*`, tight coupling, god object, dead code, duplication, or untestability concerns in the changed frontend config files.
- FMVP-002: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend` and a Dart Sass deprecation warning for Tailwind's required CSS `@import`; `git diff --check` completed successfully; `dbs` CLI was unavailable, so the changed files were scanned manually for DBS critical/warning concerns with no findings.
- FMVP-003: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend` and the existing Dart Sass deprecation warning for Tailwind's required CSS `@import`; `git diff --check` completed successfully; `dbs` CLI was unavailable, so manual DBS scan found no `any`, `console.*`, tight coupling, god object, dead code, duplication, or untestability concerns in the changed frontend shell files; structural readback confirmed app shell routing and standalone components.
- FMVP-004 blocked baseline: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` passed (existing Sass `@import` deprecation warning); `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test -- --watch=false --browsers=ChromeHeadless` failed due to duplicate `--` / schema validation; corrected `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless` passed (2 existing tests); `git diff --check` passed. `command -v dbs` found no CLI; manual DBS critical/pretest scan of this documentation-only change found no source-code violations or untestable new dependencies. No auth/UI tests were added because no source was written.
- FMVP-004 completed: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` succeeded with output `packages/frontend/dist/frontend` (pre-existing Sass `@import` deprecation warning only); `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless` passed with `TOTAL: 48 SUCCESS` (2 existing app tests + 20 AuthService tests + 18 guard tests + 8 interceptor tests); `git diff --check` completed with exit 0; `dbs` CLI still unavailable, so manual DBS scan of all new/changed frontend files found no `any`, no `console.*`, no file over 250 logic lines (largest: `auth.service.ts`, 199 logic lines), no `new`-ed injectables (all via `inject()`), and no dead exports. Gateway refresh endpoint confirmed present, not invented: `MicroServices/gateway/src/actions/action-registry.ts:42` (`refresh` → `auth.refresh`, public) and `MicroServices/gateway/src/gateway.controller.ts:80` (`@Post(':action(.*)')`). Server-validated role confirmed present, not invented: `MicroServices/gateway/src/actions/action-registry.ts:55` (`profile` → `users.profile`, authenticated) reachable as `GET /api/v1/users/profile`, returning `UserProfile` with `role`/`isActive` (`packages/contracts/src/dto/user.dto.ts:83`); the JWT payload carries `role` (`MicroServices/usuario-service/src/auth/token.service.ts:16`) while `RefreshTokenResponse` carries only `token` (`packages/contracts/src/dto/auth.dto.ts:129`), so bootstrap derives the role from the profile response, never from the refresh body or the stored copy, and never by hand-verifying the JWT. FMVP-004 pre-commit review round 3 fixed all three trust-boundary findings and was re-verified: (1) a cross-tab session replacement re-runs the bootstrap restore — `session-storage.service.ts` emits `sessionReplacement$` for any non-rotation change, `AuthService` flips `sessionReady$` back to `false` and re-runs refresh + profile through `switchMap` (a new replacement supersedes the in-flight restore; a failed refresh or profile clears the session and leaves the tab logged out), while remote-logout removal events and same-identity access-token rotations keep their immediate behavior; (2) profile validation persists the server `id`/`email`/`role` via `updateUserIdentity` (server values win over a stored copy; the profile staleness check is principal-level, so a cross-tab token rotation cannot discard the validated identity); (3) the interceptor captures the session at request start and clears only when `isSameSession(current, sentWith)` holds, so a delayed 401 from a superseded request leaves a newer session untouched while the error still propagates. Re-run after the fixes: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` succeeded; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless` passed with `TOTAL: 46 SUCCESS`; `git diff --check` exit 0.

- FMVP-004 follow-up: GGA v2.10.1 flagged presentation messages and role navigation inside `AuthService` as an SRP violation. Moved the messages and post-login navigation into `LoginPage`, kept session/guard behavior in the service, and added focused login-page tests. Frontend build passed; ChromeHeadless reported `TOTAL: 56 SUCCESS`; `git diff --check` passed. The dev-server/browser smoke test remains pending.
- FMVP-004 cross-tab follow-up: GGA identified a synchronous authorization window while publishing an unvalidated remote session. Readiness now becomes false before `session$` publishes the replacement; reentrant storage changes cannot overwrite a newer session. Added guard and reentrancy regression tests; frontend build passed, ChromeHeadless reported `TOTAL: 58 SUCCESS`, and `git diff --check` passed. The pre-commit hook now supplies the full staged task document for review context.

## Next step

FMVP-004 work-unit commit: `86955d1` (`feat(frontend): add validated login session flow`); GGA v2.10.1 passed and the native review of this commit was approved and acknowledged. Native review identified six non-blocking follow-ups about login/refresh timing, route changes after cross-tab replacement, late login responses, duplicated test gateway URLs, and the logout interceptor comment; none was part of the approved correction scope. Manual live-browser smoke testing remains pending. Next slice candidates from the MVP: role shell layouts with logout (`RoleShellLayout`), the `/auth/register-seller` public flow, or the admin vendedores list against `vendedores.list`. Do not push, create a PR, or merge without separate authorization; integration target is `develop`, never `main`.

Engram mirror `odd/frontend-mvp-base/tasks` is pending resynchronization: the current runtime reported multiple active sessions and refused the write. This file is the current recovery source until the mirror can be updated.
