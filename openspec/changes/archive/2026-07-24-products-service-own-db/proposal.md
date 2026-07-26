# Proposal: Products Service Own DB

## Intent

Give products-service its own PostgreSQL database `agua_products`, respecting the "one service, one database" microservices rule. Currently it shares `agua` with usuario-service — an architectural debt that predates the database-per-service convention already enforced by orders-service (`agua_orders`) and entregas-service (`agua_entregas`).

## Scope

### In Scope
- Add `CREATE DATABASE agua_products` to the init SQL script (`docker/init-db/create-service-databases.sql`)
- Update `DATABASE_URL` from `".../agua"` to `".../agua_products"` in:
  - `docker-compose.yml` (products-service section, L126)
  - `MicroServices/products-service/Dockerfile` (placeholder ENV, L10)
  - `.env.example` (commented section for products-service)
- Add commented `.env.example` section for products-service following the pattern of orders-service and entregas-service
- Rebuild and restart: `docker compose down && docker compose up -d --build`

### Out of Scope
- No code changes to products-service business logic
- No changes to contracts, enums, events, or Prisma schema
- No changes to other microservices
- No data migration (no products tables exist in `agua`)

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None. Pure infrastructure/config change — no spec-level behavior changes.

## Approach

1. Add `agua_products` to the init SQL executed by `postgres-init` on compose startup.
2. Change `DATABASE_URL` to `".../agua_products"` in all 3 files that reference it for products-service.
3. Add commented `.env.example` block for products-service (mirrors orders-service and entregas-service patterns).
4. Rebuild images and restart stack.
5. On startup, `prisma db push` in the `CMD` creates CATEGORIA, MARCA, PRODUCTO tables in `agua_products`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docker/init-db/create-service-databases.sql` | Modified | Add `CREATE DATABASE agua_products` |
| `docker-compose.yml` L126 | Modified | `DATABASE_URL: ".../agua"` → `".../agua_products"` |
| `MicroServices/products-service/Dockerfile` L10 | Modified | `ENV DATABASE_URL=".../agua"` → `".../agua_products"` |
| `.env.example` | Modified | Add commented section for products-service |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Zero — no existing data, no cross-FK relations, no code changes | None | N/A |

## Rollback Plan

Revert `DATABASE_URL` in all 4 files back to `".../agua"`, rebuild, restart. Zero data impact since no products-service tables exist in `agua` to orphan.

## Dependencies

- PostgreSQL running in compose (already present)
- `postgres-init` container executes the SQL (already wired)

## Success Criteria

- [ ] `docker compose logs postgres-init` shows `CREATE DATABASE agua_products` executed
- [ ] `docker compose logs products-service` shows `prisma db push` creating tables in `agua_products`
- [ ] `docker compose exec postgres psql -U postgres -d agua_products -c "\dt"` lists CATEGORIA, MARCA, PRODUCTO
- [ ] Products-service API responds normally (no connection errors)