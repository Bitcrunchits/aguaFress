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

- [ ] FMVP-001 — Create Angular workspace app in `packages/frontend/`.
  - Route: delegated direct.
  - Trigger evidence: generator/configuration affects multiple files and should stay bounded in a writer task.
  - Acceptance: Angular app exists inside the pnpm workspace with routing and SCSS; no backend files changed.
  - Checks: generation command result; dependency install result; initial build if available.
  - Evidence: pending.

- [ ] FMVP-002 — Configure Tailwind, PrimeNG, Heroicons, and MVP visual tokens.
  - Route: delegated direct.
  - Trigger evidence: touches Angular styles/config/package setup across multiple files.
  - Acceptance: visual tokens reflect `frontend-visual-direction.md`; app builds.
  - Checks: build command and any style/config validation available.
  - Evidence: pending.

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

## Verification evidence

- Pending.

## Next step

Start FMVP-001 by creating the Angular app under `packages/frontend/` using the current Node/pnpm workspace constraints.
