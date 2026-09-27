# Catalog soft-delete lifecycle

## Objective

Make catalog soft deletes operationally safe: vendors can recover intentionally deactivated categories/brands, deactivated rows do not permanently block name reuse, and super admins can inspect inactive categories for audit/debugging without exposing them to other roles.

## Problem

Category and brand delete currently set `activo: false`, which preserves rows and avoids deleting sales history. The lifecycle is incomplete:

1. A deactivated category/brand cannot be restored through the API.
2. `@@unique([vendedorId, nombre])` blocks recreating a name after soft delete and currently surfaces as a 500.
3. Deleting an already inactive row reports `404` even though the row exists.
4. Products can still be visible while linked to a deactivated category/brand.
5. Super admins need an audit-only view of inactive categories; vendors, clients and public callers must not see inactive rows.

## Why

Soft delete is the right primitive because order history must not depend on mutable catalog taxonomy. However, soft delete without restore/audit/unique-index design creates operational dead ends.

## Current evidence

- `categories.delete` updates `activo: false` and returns `{ deactivated: true }`.
- `OrderItem` stores product name and unit price snapshots; order history does not FK to categories.
- Products-service schema uses `@@unique([vendedorId, nombre])` on `Categoria` and `Marca`, which includes inactive rows.
- Live repro: create category -> delete -> create same name returned `500 Internal server error`.
- Live repro: product in an inactive category remains visible in `products.list` with the inactive category name.
- No action exists for category/brand reactivation.

## Scope

In scope:

1. Add category and brand reactivation through vendedor-owned endpoints.
2. Replace Prisma schema-level unique constraints with partial unique SQL indexes over active rows only.
3. Return user-facing conflict errors instead of raw Prisma 500 for duplicate active names.
4. Add super-admin-only inactive category audit listing.
5. Keep inactive categories hidden from public/vendor normal list operations.
6. Update Scalar/OpenAPI docs and tests for the new lifecycle.

Out of scope:

- Changing order history schemas.
- Hard deleting categories/brands.
- Exposing inactive brands to super admin unless explicitly added later.
- Creating PRs or pushing remote branches.

## Constraints

- Route changes go through the existing gateway action registry.
- Vendors may mutate only their own categories/brands.
- Super-admin inactive category listing is read-only audit access.
- Conventional Commits only; no AI attribution.
- Keep commits as reviewable work units with behavior and tests together.
- Delegation trigger note: understanding crossed 4+ files, but the OpenCode `task` provider failed with `OpenCode's free tier can only be used from within OpenCode`; work proceeds inline in smaller verified units.

## Tasks

- [x] T1 — Add products-service partial unique migration/schema handling so inactive category/brand names do not block active name reuse.
- [x] T2 — Add friendly duplicate-name conflict handling for category/brand create/update/reactivate.
- [x] T3 — Add vendedor-owned category/brand reactivation endpoints and tests.
- [x] T4 — Add super-admin-only inactive category audit list endpoint and tests.
- [x] T5 — Decide and implement product listing behavior for products linked to inactive categories/brands.
- [x] T6 — Update gateway action registry, Scalar docs, and OpenAPI tests.
- [ ] T7 — Run focused/full checks, rebuild affected services if needed, and commit the work unit.

## Authorized scope

Expected files:

- `MicroServices/products-service/prisma/schema.prisma`
- `MicroServices/products-service/prisma/migrations/**/migration.sql`
- `MicroServices/products-service/src/categories/categories.service.ts`
- `MicroServices/products-service/src/categories/categories.service.spec.ts`
- `MicroServices/products-service/src/tcp/categories-tcp.controller.ts`
- `MicroServices/products-service/src/tcp/categories-tcp.controller.spec.ts`
- `MicroServices/products-service/src/products/products.service.ts`
- `MicroServices/products-service/src/products/products.service.spec.ts`
- `MicroServices/gateway/src/actions/action-registry.ts`
- `MicroServices/gateway/src/docs/openapi-spec.service.ts`
- `MicroServices/gateway/test/openapi-spec.service.spec.ts`

Any extra source file needs a brief rationale in this document.

## Acceptance criteria

- `categories.delete`/`brands.delete` remain soft deletes.
- A deactivated category/brand can be reactivated only by its vendor owner.
- A vendor can create a new active category/brand with the same name as an inactive one without a 500.
- Duplicate active category/brand names return an explicit 409-style conflict.
- Super admin can list inactive categories for audit; non-super-admin roles cannot.
- Normal category list keeps returning only active rows.
- Products linked to inactive categories/brands do not create misleading public catalog state.
- Scalar documents every new action and the lifecycle behavior.

## Checks

- `pnpm --filter @agua/products-service test -- categories.service.spec.ts categories-tcp.controller.spec.ts products.service.spec.ts`
- `pnpm --filter @agua/products-service test`
- `pnpm --filter @agua/products-service build`
- `pnpm --filter @agua/gateway exec jest test/openapi-spec.service.spec.ts`
- `pnpm --filter @agua/gateway test`
- `pnpm --filter @agua/gateway build`
- Runtime smoke: create category, delete, list inactive as super admin, reactivate as vendor, recreate inactive name, verify product listing behavior.
- `git diff --check`

## Delivery forecast

- Estimated authored changed lines: 250-450 depending on migration/tests.
- Actual authored changed lines before commit: 594 additions/deletions across behavior, migration, gateway registry/docs, and tests.
- Delivery strategy: ask-on-risk by default. Actual changed lines exceeded about 400; maintainer selected one coherent local work-unit commit with size exception. No push/PR authorized yet.
- No push/PR authorized yet.

## Progress

- [x] Initial exploration complete; soft delete and history model verified.
- [x] Products-service behavior implemented: partial active unique indexes, category/brand reactivation, idempotent soft delete, inactive category audit listing, active taxonomy validation/filtering for products.
- [x] Gateway behavior/docs implemented: action registry exposes `categories/list-inactive`, `categories/reactivate`, `brands/reactivate`; Scalar/OpenAPI documents lifecycle and role-specific query optionality.
- [x] Maintainer approved one coherent local work-unit commit with size exception.
- [ ] Local work-unit commit pending.

## Verification evidence

- Focused products-service tests: `pnpm --filter @agua/products-service test -- categories.service.spec.ts categories-tcp.controller.spec.ts products.service.spec.ts` → 3 suites passed, 38 tests passed.
- Gateway OpenAPI focused tests: `pnpm --filter @agua/gateway exec jest test/openapi-spec.service.spec.ts` → 1 suite passed, 40 tests passed.
- Products-service full tests: `pnpm --filter @agua/products-service test` → 8 suites passed, 87 tests passed.
- Gateway full tests: `pnpm --filter @agua/gateway test` → 10 suites passed, 156 tests passed.
- Builds: `pnpm --filter @agua/products-service build`, `pnpm --filter @agua/gateway build` → exit 0.
- Docker build: `COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env build products-service gateway` → exit 0.
- Local DB migration: `migrate deploy` could not run because local DB was created by `db push` (`P3005`); applied `0002_catalog_active_unique_indexes/migration.sql` manually to `agua_products` via psql → exit 0.
- Runtime smoke: create category, soft delete, super-admin inactive listing, vendor reactivate, delete again, recreate same name, reject product create in inactive category → passed. Vendor access to inactive audit endpoint returned 403. Live OpenAPI contains `categories/list-inactive`, `categories/reactivate`, `brands/reactivate`.
- `git diff --check` → exit 0.

## Commit evidence

- Pending local commit.

## Next step

Create one coherent local work-unit commit, then run RDD assessment/review as required by repo mode.
