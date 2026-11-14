# Fix product image and vendor logo upload URL

## Objective and problem

Product photo and vendor logo uploads are stored and served correctly by the backend, but the seller UI breaks in two ways. The backend upload returns a storage-relative `imageId` such as `products/<id>.webp` or `logos/<id>.webp` and serves it at `/uploads/<imageId>`. The frontend prepends `/uploads/` to that value and uses it for both the saved field and the `<img>` preview.

- Save: the product backend rejects `imagen: "/uploads/products/<id>.webp"` with `imagen must be a valid http(s) URL or products/<safe-file>.webp`, so product create/update fails.
- Preview: `<img src="/uploads/...">` is a relative URL, so the browser requests it from the frontend origin instead of the API origin, and no preview renders.

## Authorized scope and constraints

- Frontend only, on `fix/upload-image-url` (from `frontPlanB` at `a9563ab`). Do not change backend, gateway, config, dependencies, database, or deployment.
- Change the two upload services to return the raw `imageId`, and the two pages to store the raw `imageId` in the form while rendering the preview from an absolute API URL. Update the affected specs. Preserve unrelated untracked files (`.agents/`, `packages/frontend` build artifacts, other ODD docs).
- Do not skip commit hooks. One coherent work unit with tests and this document.

## Acceptance criteria

- Product create/update sends `imagen` as `products/<id>.webp` (no `/uploads/` prefix) and passes backend validation.
- Product and vendor logo previews render from `https://api-aguafress.eadev.cloud/uploads/<imageId>` in both the fresh-upload and existing-value (prefill/edit) paths.
- Frontend build and tests pass; `git diff --check` is clean.

## Route, test mode, and delivery

- **Route:** delegated direct (8 files including specs). One bounded writer.
- **TDD:** no active ODD/frontend TDD setting; ordinary functional checks with the frontend Jest runner, no invented RED phase.
- **Verification:** `pnpm dlx pnpm@12.3.4 --filter @agua/frontend build` and `pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless`, plus `git diff --check`. Receipt-driven development is clone-local **off**; do not enable it.

## Tasks

- [x] **URL-001 — Restore upload preview and save for product image and vendor logo.** Return raw `imageId` from `VendedorProductosService.uploadImage` and `VendedorProfileService.uploadLogo`; store it in the form and render previews from `${API_CONFIG.baseUrl}/uploads/<imageId>` on both upload and prefill/edit paths. Update the four affected specs. Commit locally with tests.

## Current state and next step

- URL-001 implemented on `fix/upload-image-url`. Both upload services now return the raw storage-relative `imageId`; both pages store it in the form (`imagen` / `logo`) and render the preview from `${API_CONFIG.baseUrl}/uploads/<imageId>` on both the fresh-upload and existing-value (prefill/edit) paths. Evidence: `@agua/frontend` build PASS, Jest + ChromeHeadless 559/559 SUCCESS, `git diff --check` clean. Committed locally with a Conventional Commit (hooks enabled). No backend/gateway/config/deps/DB/deployment changes.
