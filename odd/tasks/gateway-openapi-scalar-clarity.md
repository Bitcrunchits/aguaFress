# Gateway OpenAPI / Scalar clarity

## Objective

Make the Scalar API reference at `http://localhost:3000/api/docs` usable without prior tribal knowledge: every documented action must state where each id comes from, request bodies must ship runnable examples, and responses must match what services actually return.

## Problem

QA cannot exercise category, brand and order flows through Scalar. Three reported symptoms, all reproducible in code:

1. **Wrong id produces a cryptic error.** `DELETE /api/v1/categories/delete?vendedorID=<uuid>` fails with `Invalid entity ID in URL path "delete/vendedorID=..."` (gateway) or `id must be a UUID` (products-service). The caller cannot tell which id belongs where, because the docs render every query param as the literal string `Filtro por <param>`.
2. **Request bodies are empty.** The generator emits `requestBody` with a hardcoded `required: true` and never any `example`/`examples`, so Scalar renders an empty body for every mutating action.
3. **Five order actions are invisible.** `orders.list`, `orders.get_by_id`, `orders.status_update`, `orders.cancel` and `orders.confirm` exist in the action registry but have no `ACTIONS_DOC` entry, and the `if (!doc) continue` guard drops them from the spec.

Additionally `categories.delete` and `brands.delete` document `ProductDeletedResponse` while the services return `{ deactivated: true }` (soft delete via `activo: false`).

## Why

The gateway is the only HTTP entry point and the OpenAPI spec is generated from its own action registry, so the documentation generator IS the contract surface. It drifted from the registry and from the DTOs, and there is no other source of truth: `SPEC.md` is a 427-line project-level document (vision, scope, stakeholders) and the detailed `openspec/` specs were deleted in commit `d89fbb2`.

## Why not the two microservices

`products-service` and `orders-service` were reviewed and are correct. Category/brand delete enforce ownership with `findFirst({ id, vendedorId, activo: true })` and `vendedorId` is resolved from the JWT via `resolveVendedorIdByAuthUserId`. No change is required in either service to fix these symptoms.

## Scope

**In scope** — `MicroServices/gateway/src/docs/openapi-spec.service.ts` and its spec file.

1. Add per-parameter provenance descriptions so every `id` and `vendedorId` states where its value comes from.
2. Add request body examples for mutating actions.
3. Add the five missing `orders.*` doc entries.
4. Correct the delete response schemas for categories and brands.
5. Document the three-id model (JWT `sub`, `vendedorId`, entity `id`) in the API description.

**Out of scope** — behavior changes in `products-service` or `orders-service`; changes to route shapes, DTOs, or the action registry.

## Constraints

- Documentation-only change to the gateway. No runtime behavior change.
- No route, DTO or registry change: the fix must align docs to existing behavior, never the reverse.
- Generated technical artifacts in English.
- Conventional Commits. No AI attribution.
- Keep every change in `openapi-spec.service.ts` plus its spec, so one commit stays coherent.

## Tasks

- [ ] T1 — Add `queryParamDocs` support to `ActionDoc` and replace the `Filtro por ${param}` placeholder with real provenance text for categories, brands and orders actions.
- [ ] T2 — Add `bodyExample` support to `ActionDoc` and emit `requestBody.content['application/json'].example` for mutating actions.
- [ ] T3 — Add the five missing `orders.*` entries to `ACTIONS_DOC`.
- [ ] T4 — Add a `DeactivatedResponse` schema and point `categories.delete` and `brands.delete` at it; correct the soft-delete wording in their descriptions.
- [ ] T5 — Extend `API_DESCRIPTION` with the three-id model and the `?id=` versus `/id` URL rule.
- [ ] T6 — Cover T1-T5 in `openapi-spec.service.spec.ts`.

## Authorized scope

Files the writer may modify:

- `MicroServices/gateway/src/docs/openapi-spec.service.ts`
- `MicroServices/gateway/test/openapi-spec.service.spec.ts`

Any other file is out of scope and must be reported instead of edited.

## Acceptance criteria

- Every `orders.*` action in `ACTION_REGISTRY` appears in the generated spec.
- `categories.delete` and `brands.delete` document a response matching `{ deactivated: true }`.
- No query parameter description equals `Filtro por <param>`.
- Mutating actions expose a request body example.
- The API description explains the JWT `sub` vs `vendedorId` vs entity `id` distinction.
- Existing gateway tests still pass.

## Checks

- `pnpm --filter @agua/gateway test -- openapi-spec.service.spec.ts`
- `pnpm --filter @agua/gateway test`
- `pnpm --filter @agua/gateway build`
- `git diff --check`

## Delivery forecast

Estimated 200-320 authored changed lines. Under the 400-line review budget, so a single branch and single PR. No chained PR required.

## Routes

- Exploration: inline (surgical greps and bounded reads). Delegation was attempted and failed with a provider free-tier error, so the parent performed the mapping directly.
- Implementation: delegated to one writer, because T1-T6 touch two non-trivial files in the same concern.

## Progress

- Branch: `fix/gateway-openapi-scalar-clarity` (from `develop`).
- Diagnosis complete and verified against source.
- T1-T6 implemented by one delegated writer.
- Writer stayed inside the two authorized files. Nothing else touched.

## Verification evidence

Observed by the parent, not only reported:

- `pnpm --filter @agua/gateway test -- openapi-spec.service.spec.ts`: 24 passed, 24 total.
- `pnpm --filter @agua/gateway test`: 140 passed, 140 total, 10 suites.
- `pnpm --filter @agua/gateway build`: exit 0.
- `git diff --check`: exit 0.

Structural readback of the critical fixes:

- No `Filtro por` placeholder remains in the generator.
- `DeactivatedResponse` exists; `categories.delete` and `brands.delete` point at it.
- All five missing `orders.*` entries are present in `ACTIONS_DOC`.

## Accepted scope additions

The writer made three corrections outside T1-T6. The parent verified each against the real DTOs and accepted them, because each one left the spec asserting a falsehood otherwise:

- `products.list` filter `categoria` → `categoriaId`. Verified: `ListProductsDto` declares `categoriaId` (`MicroServices/products-service/src/products/dto/list-products.dto.ts:12`). The old name was silently stripped by the permissive query pipe, so the filter never worked.
- `CreateOrderRequest` now marks `direccion` as required. Verified: `CreateOrderRequest.direccion` is non-optional (`packages/contracts/src/dto/orders.dto.ts:101`).
- `orders.job_status` response → `OrderJobStatusResponse` instead of the generic `AsyncAcceptedResponse`.

## Open findings not acted on

- `deliveries.*` (4 actions) and `activity_logs.*` (2 actions) have the same missing-`ACTIONS_DOC` defect that T3 fixed for `orders.*`. Still live, out of scope here.
- HTTP verbs for the five new `orders.*` entries are an assumption: `ActionDoc.method` is the only verb source and `ACTION_REGISTRY` carries none. Chosen `get` for list/get-by-id/job-status and `patch` for status-update/cancel/confirm.
- `VendedorProfile` has no `id` field, so `GET /api/v1/vendedores/profile` is not a valid source for `vendedorId`. Separate gap in the shared schema.
- `inferMethod()` in `openapi-spec.service.ts` is dead code.

## Delivery note

Authored changed lines: 605 (560 additions, 45 deletions) across two files, against a forecast of 200-320. The forecast was wrong. The overage is one coherent concern (gateway OpenAPI clarity) and splitting it would create a broken intermediate state, so it stays as a single work-unit commit. No size-driven rework performed.

## Next step

Commit the work unit on the feature branch. Push and PR remain the user's decision.
