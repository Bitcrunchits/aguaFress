# Agua Fluida frontend visual recovery

## Objective

Finish a consistent light/dark visual treatment across the website. In light mode only, show a water-toned backdrop behind every web route; keep readable solid content surfaces and preserve existing behavior.

## Problem and why

Before RAF-001, `styles.scss` put a blurred photograph on `body::before` with `z-index: -1`, while opaque full-viewport login, registration, and invitation layouts concealed it. Visibility behind the authenticated shell had not been verified. Square controls and inconsistent palette, shadow, and status treatments also needed attention. Users need a cohesive design without changes to auth or business flows. The photograph was later dropped in favor of a water-toned color backdrop (see Progress).

## Authorized scope and constraints

- Frontend visuals only: `packages/frontend/src/styles.scss`, the app shell and public-auth page styles, registration/invitation styles, the existing theme preset/toggle where necessary, and relevant frontend tests. Extend to other frontend page styles only where needed for site-wide consistency.
- Keep routes, guards, authentication, contracts, endpoints, validation, and business behavior intact. Keep focus visibility, contrast, responsive layouts, and accessible theme controls; avoid harsh red/green state styling and square controls.
- Preserve unrelated dirty files. No backend, `.agents`, other ODD tasks, remote operations, push, PR, merge to `develop`, or deploy. RDD clone-local is **OFF**; do not enable it or claim native review.

## Acceptance

- The light backdrop is a water-toned color/gradient visible behind background areas on all public and authenticated web routes; it is replaced by the dark palette in dark mode. Login, registration, and invitation viewport backgrounds do not hide it. Solid cards remain legible.
- Semantic palette, restrained status colors, glass/shadow surfaces, and rounded buttons and fields are consistent across routes and themes. The theme toggle is available where needed on public pages and remains accessible; mode switching/persistence and existing focus, disabled, hover, and error states remain usable.
- No route, auth, or business regression. Build, frontend tests, and whitespace checks pass; a desktop/mobile light/dark visual smoke covers public and role routes if feasible, with any untested boundary recorded.

## Work unit

- [x] **RAF-001 — Complete and verify the cohesive Agua Fluida visual pass.** Route: **delegated direct**. Completed with two local Conventional work-unit commits: `6d9c75b` (visual pass) and `528e046` (photo → water-toned backdrop). Merged into `frontPlanB` as a fast-forward. Rollback boundary: only changes authored in this RAF-001 pass; the three theme-foundation commits and unrelated work preserved.

## TDD mode and checks

- **Mode/source:** No explicit ODD/frontend TDD enable was found in the active project; `odd/tasks/frontend-mvp-base.md` records frontend TDD as not explicitly configured. Use ordinary functional/regression checks and focused tests; do not invent a RED phase.
- **Runner:** `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless`.
- **Required checks:** `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`; the test runner above; `git diff --check`. Observed outcomes recorded below.

## Progress and baseline

- Branch: `feat/rediseno-agua-fluida`, three local theme-foundation commits ahead of `origin`: `03e834f`, `d6ac88b`, `ae0ef07` (theme foundation; 302 additions + 14 deletions).
- RAF-001 closed with two further commits: `6d9c75b` (cohesive visual pass, 31 files, GGA PASSED) and `528e046` (drop photo for water-toned backdrop, 2 files). All five commits merged into `frontPlanB` via fast-forward; `frontPlanB` is now 5 commits ahead of `origin/frontPlanB`, unpushed.

## RAF-001 implementation and evidence

- Light stacking: the fixed blurred `body::before` photo and the `body::after` wash were replaced by a water-toned backdrop on `body` itself (`--agua-bg: #cdebee` plus radial/linear teal gradients in `--agua-bg-gradient`). Dark mode uses its own dark palette. Login, seller registration, and invitation leave the viewport transparent while keeping solid rounded cards; desktop login's right panel is translucent when backdrop filtering is supported, with a solid fallback. The authenticated shell already leaves the viewport transparent.
- Exposed the existing accessible theme toggle on registration and invitation as well as login and the shell. Kept form behavior, routing, auth, and validation intact. Reused the approved teal/cyan palette, semantic primary action and status colors, shadow and radius tokens, and theme-specific focus colors. The installed PrimeUIX theme types require `contrastColor`, not the `inverseColor` shown in the online example.
- Added `packages/frontend/src/app/features/auth/auth-backdrop.spec.ts` (public layout/card/theme states per route) and a focused transparent-shell assertion in `app-shell.spec.ts`. The backdrop spec was updated to assert the water-toned color instead of the removed photo; the decodable-image test was removed with the asset.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`: completed successfully; warnings only: Sass `@import` deprecation, `qrcode` CommonJS, and `vendedor-page.scss` 4 bytes over the 4 kB component-style budget.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless`: **559 SUCCESS, 0 failed** (560 before removing the decodable-image test).
- `git diff --check`: clean, exit 0.
- `packages/frontend/public/images/background-main.jpg` (the 6000×4000, 2.8 MB user photo) was deleted from the working tree; it was never committed (GGA refuses binary diffs by design).

## Review, delivery, and forecast

- RDD clone-local is **OFF**; no native review was run. GGA pre-commit review: `6d9c75b` **PASSED** with no new violations (two nonblocking HEAD-only follow-ups recorded: hardcoded `data-estado` literals in `vendedor-page.scss`, and legacy token references in several SCSS files). `528e046` staged only `.scss` and `.spec.ts`, which are outside GGA's code-review patterns, so it committed without a review verdict.
- Delivery: merged into `frontPlanB` (a tracker branch) via fast-forward. No push, PR, or `develop` merge (standing directive). Commit, push, and PR remain separate human decisions under ordinary repository policy.

## Next step

No open work for RAF-001. If safe test credentials become available, run authenticated light/dark desktop/mobile visual smoke for cliente, vendedor, and admin roles to confirm the water-toned backdrop on role routes. Note that `packages/frontend/public/images/` no longer holds the background asset.
