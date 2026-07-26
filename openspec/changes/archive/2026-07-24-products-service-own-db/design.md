# Design: Products Service Own DB

## Technical Approach

Isolate products-service into its dedicated `agua_products` database by: (1) registering the new database in the init SQL that runs on PostgreSQL container startup, (2) updating the `DATABASE_URL` in all three places that reference it for products-service, and (3) adding developer documentation in `.env.example`. No code, Prisma schema, or migration changes — pure configuration.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Database name | `agua_products` | `products` | Consistent with existing `agua_orders`, `agua_entregas` convention |
| Init mechanism | Append to existing `create-service-databases.sql` | Separate init script | Single entry point for all service DBs; existing `postgres-init` container already runs it |
| Connection override | docker-compose `environment` section | Separate `.env` file for compose | Follows existing pattern for orders-service and all other env vars in compose |
| Build-time URL format | Same pattern with `/agua_products` | Keep `/agua` placeholder | Prisma needs a valid URL during `generate`; changing it ensures consistency even if someone runs outside compose |

## Data Flow

```
postgres-init container
  └─ executes docker/init-db/create-service-databases.sql
       └─ CREATE DATABASE agua_products (if not exists)

products-service container startup
  └─ DATABASE_URL=postgresql://postgres:postgres@postgres:5432/agua_products
       └─ Prisma connection pool opens to agua_products
            └─ prisma db push → creates CATEGORIA, MARCA, PRODUCTO
                 └─ App starts → serves API requests
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docker/init-db/create-service-databases.sql` | Modify | Add `CREATE DATABASE agua_products` block (follows `agua_entregas` pattern) |
| `docker-compose.yml` L126 | Modify | Change `DATABASE_URL: ".../agua"` to `".../agua_products"` |
| `MicroServices/products-service/Dockerfile` L10 | Modify | Change build-time `ENV DATABASE_URL` from `".../agua"` to `".../agua_products"` |
| `.env.example` | Modify | Add commented section for products-service (follows `agua_entregas` pattern) |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Init script creates DB | Run `docker compose up -d`, check `postgres-init` logs, exec psql to verify DB exists |
| Integration | Service connects to correct DB | Check `products-service` logs for successful Prisma connection, exec psql to verify tables in `agua_products` |
| Integration | API works after migration | Hit products-service health endpoint, verify 200 response |

## Migration / Rollout

No data migration required. Products-service tables (CATEGORIA, MARCA, PRODUCTO) are defined in products-service's own Prisma schema and do not exist in the shared `agua` database.

## Rollback Plan

Revert `DATABASE_URL` in all 4 files back to `".../agua"`, run `docker compose down && docker compose up -d --build`. Zero data impact — no tables to orphan in either DB.

## Open Questions

- None.