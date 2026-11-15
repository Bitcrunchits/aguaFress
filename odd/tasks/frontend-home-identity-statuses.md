# Frontend home identity and status styling

## Objective and problem

Improve identity visibility on home/catalog screens and soften status presentation in the Angular frontend. Vendor home should show the vendor logo and company name (falling back to personal name). Client home should show the client name, and the client catalog should name the provider whose catalog is shown. Products should support re-activating a deactivated product. Status labels (product/client/vendor/order states) should render as plain text with a soft hover instead of squared buttons/badges.

## Authorized scope and constraints

- Frontend only, on `feat/frontend-home-identity-statuses` created from `frontPlanB` at `3214ed2`. Backend stays on `main`; no backend change is needed.
- Reactivation is frontend-only: `products.update` honors `activo` (`MicroServices/products-service/src/products/products.service.ts:218` and `:237`). The UI just has no "Reactivar" action.
- No push, PR, merge, or deploy is authorized by this task. RDD is clone-local off; do not invoke review.
- Preserve unrelated untracked files (`.agents/`, `odd/tasks/perfil-contrasena-pedidos-entregas.md`, `odd/tasks/vendedor-pedidos-navegacion-superadmin-dialogos.md`). Backend stays untouched; branch from `frontPlanB`, never `main` for this work.

## Acceptance criteria

- Vendor home renders the vendor logo next to the company name; when no company name exists it shows the personal name (the `empresa || nombreCompleto` fallback already exists — keep it and add the logo image).
- Products list offers "Reactivar" for inactive products and it sets `activo: true` through the existing `update` service.
- Client home renders the client's name (top-level `nombre`/`apellido`, following the existing narrowing pattern used by `cliente-profile-page.ts`).
- Client catalog heading includes the provider name (vendor `nombre`/`empresa`), not a static "Catálogo del proveedor".
- All estado labels render as plain text (no filled/bordered pill) with a soft hover; prefer a single shared component over editing 9 places independently.

## Tasks and evidence

- [x] **HOME-001 — Vendor home logo.** Commit `d8e738c`. Added logo `<img>` beside `empresaLabel` in `vendedor-page.html`; extracted shared `toUploadUrl` (`shared/upload-url.ts`) reused by `vendedor-profile-page.ts` and `producto-form-page.ts`. `VendedorProfile.logo` already present in the DTO.
- [x] **HOME-002 — Product reactivation.** Commit `427097a`. Added "Reactivar" action for `!product.activo` and `reactivar()` calling `update(id, { activo: true })`; generalized `updateItemActivo(id, activo)`. Backend honors `activo:true` (verified, no backend change).
- [x] **HOME-003 — Client home name.** Commit `caec0e9`. Injected `ClienteProfileService` into `ClienteHomeFacade` and rendered the client name in `cliente-page.html`, with request-generation + current-user guards so a stale profile response cannot leak another user's name (GGA-caught, fixed).
- [x] **HOME-004 — Catalog provider name.** Commit `035800b` (+ route spec `22a06dc`). Fetch the provider name by `vendedorId` via a new `CLIENTE_PROVIDERS_GATEWAY` abstraction (DIP: facade depends on the token, `ClienteProvidersService` bound via `useExisting`), rendered in the heading with static fallback. Stale-response guarded.
- [x] **HOME-005 — Status as plain text + soft hover.** Commits `d411432` (shared `app-status-label` component + `ORDER_ESTADO_TONES`) and `02908c4` (9 badge usages swapped). Plain text only, soft hover, `prefers-reduced-motion` respected.

## Pending clarification

- The vendor list had a third, incomplete item "En " — the user chose to skip it for now (not part of this change).

## Route, test mode, and delivery

- **Route:** delegated direct. Mapping already spans 10+ files across five requirements; implementation touches multiple nontrivial components/templates/styles, so one bounded writer per coherent slice (or one writer for the whole feature if the diff stays reviewable). No SDD.
- **TDD:** no active strict-TDD setting for the frontend; use ordinary checks (Angular unit tests where present + `build`), not an invented RED phase. Runner per `packages/frontend/package.json`.
- **Delivery strategy:** `ask-on-risk`. Forecast: moderate (several small templates/components + one shared component); well under ~400 authored lines heuristic per slice. Branch/review boundary: `3214ed2`.

## Current state and next step

- All five work units implemented and committed on `feat/frontend-home-identity-statuses` (7 commits: `d411432`, `d8e738c`, `427097a`, `caec0e9`, `035800b`, `22a06dc`, `02908c4`). Build green; full frontend suite 576/576 pass; GGA pre-commit passed on each commit.
- Next (separate authorization): push the branch, open a PR from `feat/frontend-home-identity-statuses` into `frontPlanB`, and deploy after review. The skipped vendor item "En " remains open for later.
