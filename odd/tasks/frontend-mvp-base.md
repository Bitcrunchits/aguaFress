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
- Current forecast: small MVP foundation work, expected below large-PR threshold if sliced by work unit.
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

- [ ] FMVP-004 — Implement login screen foundation and auth/session contracts.
  - Route: delegated direct.
  - Trigger evidence: touches UI, services, guards/interceptors and models.
  - Acceptance: `/auth/login` visual matches MVP direction; auth/session service and API gateway base configuration are prepared without inventing backend contracts.
  - Checks: build; unit tests if generated/applicable.
  - Evidence: pending.

## Progress

- Created task document before the first source write.
- Recommended app location: `packages/frontend/`, because it fits existing `packages/*` pnpm workspace without changing workspace layout.
- Completed FMVP-001 with a new Angular standalone app using routing and SCSS under `packages/frontend/`.
- Completed FMVP-002A with the VPS gateway API base configuration for Angular environments and core API config.
- Completed FMVP-002 with Tailwind v4, PrimeNG Aura, Heroicons readiness, and MVP visual tokens.
- Completed FMVP-003 with standalone Angular shell routes for login, admin, vendor, and customer workspaces.

## Verification evidence

- `pnpm dlx @angular/cli@latest new frontend --directory packages/frontend --standalone --routing --style scss --skip-git --package-manager pnpm --defaults --ssr=false` failed before generation because Angular CLI latest requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`; local Node is `v22.16.0`.
- `pnpm dlx @angular/cli@20 new frontend --directory packages/frontend --standalone --routing --style scss --skip-git --package-manager pnpm --defaults --ssr=false` created the Angular files; the generator install step failed because the repository requires pnpm `12.3.4` while ambient pnpm is `11.5.3`.
- `pnpm dlx pnpm@12.3.4 install` completed successfully after allowing Angular native build dependencies `@parcel/watcher` and `lmdb` in `pnpm-workspace.yaml`.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully. Output: `packages/frontend/dist/frontend`.
- FMVP-002A: structural readback completed for Angular environment/core config and docs; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend`; `dbs` CLI was unavailable, so manual DBS scan found no `any`, `console.*`, tight coupling, god object, dead code, duplication, or untestability concerns in the changed frontend config files.
- FMVP-002: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend` and a Dart Sass deprecation warning for Tailwind's required CSS `@import`; `git diff --check` completed successfully; `dbs` CLI was unavailable, so the changed files were scanned manually for DBS critical/warning concerns with no findings.
- FMVP-003: `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend` and the existing Dart Sass deprecation warning for Tailwind's required CSS `@import`; `git diff --check` completed successfully; `dbs` CLI was unavailable, so manual DBS scan found no `any`, `console.*`, tight coupling, god object, dead code, duplication, or untestability concerns in the changed frontend shell files; structural readback confirmed app shell routing and standalone components.

## Next step

Start FMVP-004 by implementing the login screen foundation and auth/session contracts without inventing backend contracts.
