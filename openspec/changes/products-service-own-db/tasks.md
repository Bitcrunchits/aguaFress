# Tasks: Products Service Own DB

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~25 (4 files, minor edits) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

## Phase 1: Database Registration

- [x] 1.1 Add `CREATE DATABASE agua_products` to `docker/init-db/create-service-databases.sql` (follows `agua_entregas` pattern with idempotent `WHERE NOT EXISTS` guard)

## Phase 2: Connection Strings

- [x] 2.1 Change `DATABASE_URL` in `docker-compose.yml` L126 from `"/agua"` to `"/agua_products"`
- [x] 2.2 Change `ENV DATABASE_URL` in `MicroServices/products-service/Dockerfile` L10 from `"/agua"` to `"/agua_products"`
- [x] 2.3 Add commented section for products-service in `.env.example` (follows `agua_entregas` pattern, lines 57-63)

## Phase 3: Verification

- [ ] 3.1 Rebuild and restart: `docker compose down && docker compose up -d --build`
- [ ] 3.2 Verify `postgres-init` logs show `CREATE DATABASE agua_products` executed
- [ ] 3.3 Verify `products-service` logs show `prisma db push` creating tables in `agua_products`
- [ ] 3.4 Verify isolation: exec `psql -U postgres -d agua_products -c "\dt"` lists CATEGORIA, MARCA, PRODUCTO
- [ ] 3.5 Verify API: hit products-service health endpoint returns 200

## Phase 4: Cleanup

- [ ] 4.1 No cleanup tasks — pure config change, no dead code or temp files generated