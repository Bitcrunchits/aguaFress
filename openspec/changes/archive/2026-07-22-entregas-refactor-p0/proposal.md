# Proposal: Entregas Service — P0 Architecture Refactor

## Intent

Fix foundational architecture blockers in `entregas-service` so it follows established AguaFress microservice patterns: identity resolution via TCP, Docker/DB runtime, and global error handling. Milagros' PR #18 compiles and passes tests but uses `AUTH_USER.id` directly as `vendedorId`, lacks a Dockerfile, doesn't register its global filter, and is missing from `docker-compose.yml`.

## Scope

### In Scope (P0 — AG-169)
- Vendedor identity resolver port + adapter (mirror orders-service pattern)
- Multi-stage Dockerfile with Prisma setup (mirror orders-service)
- Register `entregas-service` in root `docker-compose.yml` (postgres DB, TCP port 3015)
- Register existing `RpcExceptionFilter` globally in `main.ts`
- Update controller tests to mock identity resolver

### Out of Scope
- Repository/mapper separation (P1 — AG-170)
- Events/notifications stream alignment (P1)
- Contracts drift fixes (P1)
- Gateway dispatch integration (P1)
- Cleanup/debt (P2 — AG-171)

## Capabilities

**None.** Pure architecture refactor — no new specs or behavior changes.

## Approach

1. **Identity Resolver**: Create `deliveries/vendedor-profile-resolver.port.ts` (interface) and `deliveries/usuario-vendedor-profile-resolver.adapter.ts` (TCP adapter → usuario-service `vendedores.resolve_profile_id`). Register via DI token in `DeliveriesModule`. Inject into `DeliveriesTcpController` instead of raw `user.sub`.
2. **Dockerfile**: Multi-stage build (node:22-alpine, pnpm, openssl, prisma generate, `db push` on start). Port 3015.
3. **docker-compose.yml**: Add `entregas-service` service with `postgres` dependency, `DATABASE_URL: "postgresql://postgres:postgres@postgres:5432/agua_entregas"` and init-DB script.
4. **RpcExceptionFilter**: Register via `app.useGlobalFilters(new RpcExceptionFilter())` in `main.ts`.
5. **Tests**: Update `DeliveriesTcpController` spec to provide mock resolver and assert resolved `vendedorId`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `MicroServices/entregas-service/src/deliveries/` | New | Port + adapter for identity resolution |
| `MicroServices/entregas-service/src/deliveries/deliveries.module.ts` | New | Module with DI wiring |
| `MicroServices/entregas-service/src/main.ts` | Modified | Register global RpcExceptionFilter |
| `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.ts` | Modified | Inject resolver, remove raw `user.sub` |
| `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.spec.ts` | Modified | Mock resolver, assert resolved ID |
| `MicroServices/entregas-service/Dockerfile` | New | Multi-stage build |
| `docker-compose.yml` | Modified | Add entregas-service definition |
| `docker/init-db/` | Modified | Add create-entregas-database.sql |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| usuario-service `vendedores.resolve_profile_id` pattern not implemented or returns unexpected shape | Low | Orders-service already consumes it; adapter validates response shape |
| Docker build breaks if contracts package changed | Low | Same pattern as orders-service — works today |
| TCP port 3015 conflicts in local dev | Low | Already reserved in gateway config |

## Rollback Plan

Revert `deliveries-tcp.controller.ts` to pass `user.sub` directly (current behavior). Remove Dockerfile, docker-compose entry, and module changes. No data impact — pure infrastructure.

## Dependencies

- `usuario-service` must expose `vendedores.resolve_profile_id` TCP pattern (already exists, consumed by orders-service).
- `@agua/contracts` must build before entregas-service in Docker pipeline.

## Success Criteria

- [ ] All existing tests pass without modification to service logic
- [ ] Controller tests verify resolved `vendedorId` from mock adapter, not raw `user.sub`
- [ ] `docker compose up -d` starts `entregas-service` without errors
- [ ] `prisma db push` runs on container start, table `DELIVERY` is created
- [ ] Global RpcExceptionFilter catches and formats errors in TCP handlers
