# Tasks: Entregas Service — P0 Architecture Refactor

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~205 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full change | Single PR | base=`entregas-refactor-local`; all 12 tasks |

## Phase 1: Foundation

- [ ] 1.1 Create `deliveries/vendedor-profile-resolver.port.ts` — port interface + DI token (mirror orders-service)
- [ ] 1.2 Create `Dockerfile` — multi-stage node:22-alpine, prisma, port 3015 (mirror orders-service)
- [ ] 1.3 Add `agua_entregas` CREATE DATABASE to `docker/init-db/create-service-databases.sql`

## Phase 2: Core Implementation

- [ ] 2.1 Create `deliveries/usuario-vendedor-profile-resolver.adapter.ts` — TCP adapter via ClientProxy (mirror orders-service)

## Phase 3: Integration / Wiring

- [ ] 3.1 Wire adapter + `VENDEDOR_PROFILE_RESOLVER_PORT` token in `DeliveriesModule`; export port
- [ ] 3.2 Inject `VENDEDOR_PROFILE_RESOLVER_PORT` in `DeliveriesTcpController`; replace `user.sub ?? user.userId` with resolved `vendedorId`
- [ ] 3.3 Register `RpcExceptionFilter` globally in `main.ts` via `app.useGlobalFilters`
- [ ] 3.4 Add `entregas-service` service + postgres dependency in root `docker-compose.yml`

## Phase 4: Testing

- [ ] 4.1 Update `deliveries-tcp.controller.spec.ts` — provide mock resolver, assert resolved `vendedorId` in all handlers
- [ ] 4.2 Verify existing `deliveries.service.spec.ts` passes unchanged
- [ ] 4.3 Run full test suite: `pnpm --filter @agua/entregas-service test`
