# Restore product and vendor-logo uploads under CommonJS

## Objective and problem

Restore working product-photo uploads and prevent the same failure for vendor-logo uploads. A real product upload returned HTTP 500; the products-service log showed `TypeError: (0 , sharp_1.default) is not a function` at `UploadService.saveImage`. Both upload services compile their default Sharp import to `require('sharp').default`, but the installed Sharp 0.33.5 CommonJS entry point exports a callable function directly. `allowSyntheticDefaultImports` does not change runtime emission.

## Authorized scope and constraints

- Work locally on `fix/upload-sharp-commonjs`, created from `main` at `888397a`. The gateway route-order fix `447d1d1` is already in this base; do not change gateway routing for this 500.
- Change only the Sharp import and focused real-conversion tests in `MicroServices/products-service/src/common/upload/` and `MicroServices/usuario-service/src/common/upload/`, plus this task document. Keep service-owned tests with each service's fix.
- Preserve all unrelated untracked files (`.agents/`, `packages/frontend/`, and the other two `odd/tasks` documents). No frontend, schema, database, seeds, service configuration, dependency upgrades, remote access, push, PR, merge, or deployment is authorized.
- Do not skip commit hooks. Product and logo uploads are separate coherent work units. Generated `dist/` output is verification evidence, not authored source to stage.

## Acceptance criteria

- Both services convert a valid small PNG buffer to WebP via the real installed Sharp module and return an image ID in their respective `products/` and `logos/` directories. Tests use isolated temporary directories and remove only their own files.
- Rebuilt CommonJS output calls Sharp without `.default`; existing upload-controller tests and complete Jest suites for each affected service pass, as do their builds and `git diff --check`.
- No runtime or VPS upload success is claimed without a separate authorized deployment and authenticated end-to-end check. Other upload limitations and profile-update behavior stay unchanged.

## Route, test mode, and delivery

- **Implementation route:** delegated direct. Mapping spans both services, their tests, compiler output and gateway context (4+ files); two nontrivial service/test pairs trigger one bounded writer, sequential work units.
- **TDD:** no active ODD/backend strict-TDD setting was found. `odd/tasks/bug-002-cart-catalog-503.md` records no explicit setting and ordinary functional checks. Use ordinary Jest checks, not an invented RED phase; retain Jest as the runner. The local `dbs` executable is unavailable, so use a manual pre-test structural check if it remains unavailable.
- **Verification (each affected service directory):** `./node_modules/.bin/jest --runInBand src/common/upload/upload.service.spec.ts src/tcp/upload-tcp.controller.spec.ts`; `./node_modules/.bin/jest --runInBand`; `./node_modules/.bin/nest build`. From the repo root: `git diff --check` (and staged check before each commit). Inspect the emitted `dist/common/upload/upload.service.js` for an ordinary callable Sharp import; do not stage generated output.
- **Forecast:** approximately 150–220 authored additions/deletions across both work units including tests and this document; the ~400-line ODD task heuristic is advisory. Delivery strategy `ask-on-risk`; no PR is currently authorized. Receipt-driven development is clone-local **off**; do not enable it or claim native review.

## Tasks and evidence

- [x] **SHARP-001 — Product image upload.** Correct the CommonJS Sharp import in products-service, add a real PNG-to-WebP regression test with isolated cleanup, run the focused and full Jest suites, build, and whitespace check; create a local Conventional Commit with tests and update progress. Route: delegated direct (multi-file preparation and write). Rollback: the product UploadService import and its new focused spec only.
- [x] **SHARP-002 — Vendor logo upload.** Apply the same minimal correction and independent real-conversion test in usuario-service; run its focused and full Jest suites, build, and whitespace check; create a second local Conventional Commit with tests and update progress. Route: same bounded delegated writer, sequentially after SHARP-001. Rollback: the usuario UploadService import and its new focused spec only.

### SHARP-001 verification

- Before the import fix, the new test reproduced `TypeError: (0 , sharp_1.default) is not a function` in `saveImage`. Jest cannot parse nanoid 5's ESM entry, so the test mocks only `nanoid`; it uses real Sharp for PNG creation, conversion, and output inspection.
- From `MicroServices/products-service`: `./node_modules/.bin/jest --runInBand src/common/upload/upload.service.spec.ts src/tcp/upload-tcp.controller.spec.ts` passed (2 suites, 3 tests); `./node_modules/.bin/jest --runInBand` passed (10 suites, 90 tests); `./node_modules/.bin/nest build` passed (exit 0).
- From the repository root: `git diff --check` and `git diff --cached --check` passed (exit 0). The emitted `dist/common/upload/upload.service.js` uses `const sharp = require("sharp");` and `sharp(buffer)`, without `.default`; generated files are not staged.
- `dbs` is unavailable. Manual pre-test and post-change structural checks found no blocking issues (C01–C05, W03, W05); `ConfigService` directs the test's filesystem writes to its isolated temporary directory, which is removed after the test.
- Runtime boundary: the Jest test exercises the real native Sharp conversion and local file write. No deployed or authenticated end-to-end upload is claimed. Rollback boundary: the products-service UploadService import and its focused spec (with this task progress note).
- Commit: `786c3df60ea36182fe953342483674edf48fc733` (`fix(products): restore Sharp image upload under CommonJS`). Parent spot-check reran the focused Jest command after commit: 2 suites and 3 tests passed. Native risk assessment was unassessable because unrelated untracked files lack an explicit inventory; an independent read-only validator inspected the import, real conversion test, and rollback boundary but did not rerun commands. No RDD review was started (clone-local off).

### SHARP-002 verification

- The usuario-service upload service shared the same `import sharp from 'sharp'` failure mode under CommonJS; the correction is `import sharp = require('sharp')` with no broad tsconfig change. The new test mocks only `nanoid` (Jest cannot parse its ESM entry) and uses real Sharp for PNG creation, conversion, and output inspection.
- From `MicroServices/usuario-service`: `./node_modules/.bin/jest --runInBand src/common/upload/upload.service.spec.ts src/tcp/upload-tcp.controller.spec.ts` passed (2 suites, 3 tests); `./node_modules/.bin/jest --runInBand` passed (32 suites, 304 tests); `./node_modules/.bin/nest build` passed (exit 0).
- From the repository root: `git diff --check` and `git diff --cached --check` passed (exit 0). The emitted `dist/common/upload/upload.service.js` uses `const sharp = require("sharp");` and `sharp(buffer)`, without `.default`; generated files are not staged.
- `dbs` is unavailable. Manual pre-test and post-change structural checks found no blocking issues (C01–C05, W03, W05); `ConfigService` directs the test's filesystem writes to its isolated temporary directory under `logos`, removed after the test.
- Runtime boundary: the Jest test exercises the real native Sharp conversion and local file write. No deployed or authenticated end-to-end upload is claimed. Rollback boundary: the usuario-service UploadService import and its focused spec (with this task progress note).

## Current state and next step

- SHARP-001 and SHARP-002 are both locally verified and committed. The unrelated untracked files from branch creation remain untouched.
- Next: the two service fixes are complete; no further work unit is authorized. Do not merge, push, or deploy without separate authorization.
