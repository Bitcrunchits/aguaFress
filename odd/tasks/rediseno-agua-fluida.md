# Agua Fluida frontend visual recovery

## Objective

Finish a consistent light/dark visual treatment across the website. In light mode only, show the user-provided blurred photograph behind every web route; keep readable solid content surfaces and preserve existing behavior.

## Problem and why

Before RAF-001, `styles.scss` put a blurred photo on `body::before` with `z-index: -1`, while opaque full-viewport login, registration, and invitation layouts concealed it. Visibility behind the authenticated shell had not been verified. Square controls and inconsistent palette, shadow, and status treatments also needed attention. Users need a cohesive design without changes to auth or business flows.

## Authorized scope and constraints

- Frontend visuals only: `packages/frontend/src/styles.scss`, the app shell and public-auth page styles, registration/invitation styles, the existing theme preset/toggle where necessary, `packages/frontend/public/images/background-main.jpg`, and relevant frontend tests. Extend to other frontend page styles only where needed for site-wide consistency.
- Keep routes, guards, authentication, contracts, endpoints, validation, and business behavior intact. Keep focus visibility, contrast, responsive layouts, and accessible theme controls; avoid harsh red/green state styling and square controls.
- The photo is user-provided; its content attribution/usage rights have not been verified. Do not claim clearance for publication without confirmation.
- Preserve unrelated dirty files. No backend, `.agents`, other ODD tasks, remote operations, push, PR, merge, or deploy. RDD clone-local is **OFF**; do not enable it or claim native review.

## Acceptance

- The photo loads behind background areas on **all** public and authenticated web routes in light mode, with blur and a readable overlay; it is absent in dark mode. Login, registration, and invitation viewport backgrounds do not hide it. Solid cards remain legible.
- Semantic palette, restrained status colors, glass/shadow surfaces, and rounded buttons and fields are consistent across routes and themes. The theme toggle is available where needed on public pages and remains accessible; mode switching/persistence and existing focus, disabled, hover, and error states remain usable.
- No route, auth, or business regression. Build, frontend tests, and whitespace checks pass; a desktop/mobile light/dark visual smoke covers public and role routes if feasible, with any untested boundary recorded.

## Work unit

- [ ] **RAF-001 — Complete and verify the cohesive Agua Fluida visual pass.** Resolve photo stacking and opaque-layout coverage across routes, unify shared tokens and component styling, add missing public theme controls if needed, and keep focused regression tests with the behavior they cover. Route: **delegated direct, in progress, uncommitted**. Trigger/preparation: read-only mapping identified `styles.scss`, shell, login, registration, invitation, theme styling, and the image across more than two nontrivial frontend files. Rollback boundary: only changes authored in this RAF-001 pass; preserve the initial nine dirty files' pre-existing content, shared toggle, user-supplied image, three theme-foundation commits, and unrelated work. Record a human chain-strategy decision and a local Conventional Commit identity before marking complete.

## TDD mode and checks

- **Mode/source:** No explicit ODD/frontend TDD enable was found in the active project; `odd/tasks/frontend-mvp-base.md` records frontend TDD as not explicitly configured. Use ordinary functional/regression checks and focused tests; do not invent a RED phase. Source of behavior: the current frontend route/theme implementation and the acceptance criteria above.
- **Runner:** `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless`.
- **Required checks:** `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`; the test runner above; `git diff --check`; browser visual smoke for light/dark public and role routes if feasible. Observed outcomes and limits are recorded below; do not infer authenticated visual coverage from public screenshots.

## Progress and baseline

- Branch: `feat/rediseno-agua-fluida`, three local commits ahead of `origin/feat/rediseno-agua-fluida`: `03e834f`, `d6ac88b`, `ae0ef07` (theme foundation; **302 additions + 14 deletions**). These are baseline commits, not evidence that RAF-001 is complete.
- At handoff, nine dirty frontend files had **211 additions + 164 deletions**; the 6000×4000 JPEG `packages/frontend/public/images/background-main.jpg` and shared theme toggle were untracked. This pre-existing work was preserved and extended, not reset. RAF-001 remains open.

## RAF-001 interim implementation and evidence (no commit)

- Fixed light-only stacking with a fixed `body::before` photo (10px blur), a separate non-interactive light wash, and a positioned app root above both. The body gradient remains the fallback; dark mode hides both photo and wash. Login, seller registration, and invitation now leave the viewport transparent while keeping solid rounded cards; desktop login's right panel is translucent when backdrop filtering is supported, with a solid fallback. The authenticated shell already leaves the viewport transparent.
- Exposed the existing accessible theme toggle on registration and invitation as well as login and the shell. Kept form behavior, routing, auth, and validation intact. Reused the approved teal/cyan palette, semantic primary action and status colors, shadow and radius tokens, and theme-specific focus colors. The installed PrimeUIX theme types require `contrastColor`, not the `inverseColor` shown in the online example.
- Added `packages/frontend/src/app/features/auth/auth-backdrop.spec.ts` (all three public layout/card/theme states plus decodable 6000×4000 asset), and a focused transparent-shell assertion in `app-shell.spec.ts`. Manual DBS critical/pre-test scan before tests: `dbs` CLI unavailable; no new `any`, console calls, manual service construction, or changed business logic; the invitation component was already 303 lines before this import-only change, so its existing size is not attributed to RAF-001.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build`: completed successfully after the last source change; warnings: Sass `@import` deprecation, `qrcode` CommonJS, and `vendedor-page.scss` 4 bytes over the 4 kB component-style warning budget. An earlier build rejected `inverseColor` (TS2353); corrected to the installed `contrastColor` contract before the successful build.
- `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless`: **560 SUCCESS, 0 failed** after the last source change. Earlier attempts exposed and fixed spec import/constructor typing errors and an invalid direct-fixture role-content assertion; no failing required test is being treated as a baseline failure.
- Local isolated Chrome 157 + Angular dev server smoke: screenshots and computed-style checks for login, registration, and invitation at 1440×900 and 390×844, each in light and dark mode (12 states, files under `/tmp/opencode/raf-*.png`, outside the repository). The light photo URL rendered with the wash and transparent viewport surfaces; both photo and wash computed `display: none` in dark mode. Cards stayed solid (white/dark teal), toggles updated their labels, and no tested state had horizontal overflow. The actual PrimeNG primary button colors computed as light `#006f83`/`#ffffff` and dark `#71e0e8`/`#071f26`. A separate local Tab-key smoke reached the toggle then email field in both modes; both matched `:focus-visible` with solid outlines and theme-appropriate border colors. **Authenticated browser smoke: N/A** without safe test credentials; the shell's transparency is covered by its ChromeHeadless component assertion, not a live role-route visual check. The asset's usage rights and any performance cost of the supplied 2.7 MB image are not cleared here.
- `git diff --check`: no output, exit 0 after the last source change; rerun after the final documentation update. All changes remain unstaged and uncommitted.

## Review, delivery, and forecast

- Default delivery strategy: `ask-on-risk`. The pre-implementation forecast was **691 authored additions/deletions** (316 committed + 375 dirty); the current tracked source diff alone is **454 additions + 270 deletions across 26 files**, with a new 73-line test, untracked shared toggle/image, this document, and three earlier commits outside that stat. The ~400-line review threshold is advisory: do not omit tests or compress code to meet it. Keep the interleaved visual changes, image, and tests as one cohesive work unit; a chain strategy and slice boundaries require a human decision **before the next commit**, not a preselection here.
- With RDD clone-local off, there is no native review. Inspect the exact local diff, focused checks, browser evidence or explicit N/A, and rollback boundary before closing. Task completion requires observed checks and a local Conventional work-unit commit; do not mark it complete based on the existing three commits. No delivery operation is authorized.

## Next step

Obtain the human `ask-on-risk` chain-strategy decision before the next commit. If safe test credentials become available, run authenticated light/dark desktop/mobile smoke for cliente, vendedor, and admin roles; confirm photo attribution/usage rights before publication. Keep RAF-001 unchecked and all changes uncommitted until the decision and local work-unit commit evidence exist.
