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

- [ ] FMVP-002 — Configure Tailwind, PrimeNG, Heroicons, and MVP visual tokens.
  - Route: delegated direct.
  - Trigger evidence: touches Angular styles/config/package setup across multiple files.
  - Acceptance: visual tokens reflect `frontend-visual-direction.md`; app builds.
  - Checks: build command and any style/config validation available.
  - Evidence: pending.

- [x] FMVP-002A — Configure VPS gateway API base for the Angular frontend.
  - Route: delegated direct.
  - Trigger evidence: prepares the integration seam before real auth/services and touches Angular environment configuration, core config, and frontend docs without backend changes.
  - Acceptance: production/default and development Angular builds resolve the API base URL to `https://api-aguafress.eadev.cloud`; future services can import a small core API config instead of importing environments everywhere; documentation no longer implies localhost-only integration.
  - Checks: structural readback completed; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully; DBS CLI unavailable, manual DBS scan completed with no critical findings.
  - Evidence: added `src/environments/environment.ts`, `src/environments/environment.development.ts`, and `src/app/core/config/api.config.ts`; configured development file replacement in `angular.json`; updated frontend README and implementation map with VPS gateway target and live docs URL candidates.

- [ ] FMVP-003 — Create base app structure and shell routes.
  - Route: delegated direct.
  - Trigger evidence: touches routing, layout, shared/core folders and multiple components.
  - Acceptance: `core`, `layout`, `features`, and `shared` structure exists; public/auth and role shell routes are stubbed.
  - Checks: build and route smoke if available.
  - Evidence: pending.

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
- Completed FMVP-002A with the VPS gateway API base configuration for Angular environments and core API config; FMVP-002 visual tooling remains separate and pending.

## Verification evidence

- `pnpm dlx @angular/cli@latest new frontend --directory packages/frontend --standalone --routing --style scss --skip-git --package-manager pnpm --defaults --ssr=false` failed before generation because Angular CLI latest requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`; local Node is `v22.16.0`.
- `pnpm dlx @angular/cli@20 new frontend --directory packages/frontend --standalone --routing --style scss --skip-git --package-manager pnpm --defaults --ssr=false` created the Angular files; the generator install step failed because the repository requires pnpm `12.3.4` while ambient pnpm is `11.5.3`.
- `pnpm dlx pnpm@12.3.4 install` completed successfully after allowing Angular native build dependencies `@parcel/watcher` and `lmdb` in `pnpm-workspace.yaml`.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully. Output: `packages/frontend/dist/frontend`.
- FMVP-002A: structural readback completed for Angular environment/core config and docs; `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` completed successfully with output `packages/frontend/dist/frontend`; `dbs` CLI was unavailable, so manual DBS scan found no `any`, `console.*`, tight coupling, god object, dead code, duplication, or untestability concerns in the changed frontend config files.

## Next step

Start or continue FMVP-002 by configuring Tailwind, PrimeNG, Heroicons, and the MVP visual tokens from `frontend-visual-direction.md`.
