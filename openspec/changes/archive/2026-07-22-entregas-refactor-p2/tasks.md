# Tasks: Entregas Service — P2 Cleanup (AG-171)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~110 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| All | 5 independent cleanup items | PR 1 (single) | No dependencies between items; single commit-safe PR |

## Phase 1: Types & Config

- [x] 1.1 `src/tcp/tcp-payload.ts` — import `UserRole` from `@agua/contracts`, change `role: string` → `role: UserRole`
- [x] 1.2 `prisma/schema.prisma` — add `decimalNumbers = true` to `generator client {}` block; run `npx prisma generate`

## Phase 2: Dead Code Removal

- [x] 2.1 Delete `src/health/health.controller.ts` and `src/health/health.module.ts`
- [x] 2.2 Delete `src/health/` directory (verify AppModule has no import — confirmed: it doesn't)

## Phase 3: Testing

- [x] 3.1 Create `src/deliveries/usuario-vendedor-profile-resolver.adapter.spec.ts` with 5 scenarios:
  - success: valid `{ vendedorId }` response returns `vendedorId`
  - timeout: `ClientProxy.send` throws `TimeoutError`
  - invalid response (`{}`): throws `ServiceUnavailableException`
  - invalid response (`null`): throws `ServiceUnavailableException`
  - connection error: `ClientProxy.send` throws `Error('Connection refused')`

## Phase 4: Environment Sync

- [x] 4.1 Create `MicroServices/entregas-service/.env` with `DATABASE_URL`, `TCP_PORT=3015`, `REDIS_URL`, `USUARIO_SERVICE_HOST`, `USUARIO_SERVICE_TCP_PORT`, `TCP_TIMEOUT_MS`
- [x] 4.2 Sync `MicroServices/entregas-service/.env.example` — add default values matching `.env`
- [x] 4.3 Add `# ─── entregas-service ───` section to root `.env.example` with `ENTREGAS_SERVICE_HOST` and `ENTREGAS_SERVICE_TCP_PORT`
