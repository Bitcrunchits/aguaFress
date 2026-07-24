# Proposal: Entregas Service — P2 Cleanup (AG-171)

## Intent

Clean up technical debt in entregas-service after P0+P1 refactoring: dead code, untested adapter, type drift, Prisma config gaps, and env sync. No behavior changes.

## Scope

### In Scope
1. Remove dead HealthModule (TCP-only service, HTTP controller never registers)
2. Unit tests for `usuario-vendedor-profile-resolver.adapter.ts` (4 scenarios: success, timeout, invalid response, connection error)
3. Fix `role: string` → `role: UserRole` in `tcp-payload.ts`
4. Add `decimalNumbers = true` to Prisma generator (removes `Number()` casts in repository)
5. Create `MicroServices/entregas-service/.env` with required vars; ensure `.env.example` matches

### Out of Scope
- TOCTOU race fix (deferred to P3)
- Gateway dispatch integration
- New features or behavior changes
- `@@map("DELIVERY")` — already fixed in P0/P1

## Capabilities

**None.** Pure technical debt cleanup — no spec-level requirements change.

## Approach

1. **HealthModule**: Remove `src/health/` directory and files. No import needed in AppModule.
2. **Adapter tests**: Create `src/deliveries/usuario-vendedor-profile-resolver.adapter.spec.ts` — mock `ClientProxy`, test `resolveVendedorIdByAuthUserId` with valid response, timeout, shape mismatch, and connection rejection.
3. **tcp-payload.ts**: Import `UserRole` from `@agua/contracts`, change `role: string` → `role: UserRole`.
4. **schema.prisma**: Add `decimalNumbers = true` to generator block; rerun `prisma generate`.
5. **Env**: Create `MicroServices/entregas-service/.env` with `DATABASE_URL`, `TCP_PORT`, `REDIS_URL`. Update `.env.example` to match. Document in root `.env.example` under an ENTREGAS section.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/health/` | Removed | Dead HTTP controller in TCP-only service |
| `src/app.module.ts` | Modified | Remove HealthModule import (or never add) |
| `src/deliveries/usuario-vendedor-profile-resolver.adapter.spec.ts` | New | Unit tests for adapter |
| `src/tcp/tcp-payload.ts` | Modified | `role: string` → `role: UserRole` |
| `prisma/schema.prisma` | Modified | Add `decimalNumbers = true` |
| `MicroServices/entregas-service/.env` | New | Dev env vars |
| `MicroServices/entregas-service/.env.example` | Modified | Sync with actual vars |
| Root `.env.example` | Modified | Add ENTREGAS section |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `decimalNumbers` changes Decimal return type — existing `Number()` casts become redundant but not harmful | Low | Compile-time check; update casts only if needed |
| Prisma migration requires regenerate | Low | `prisma generate` — no DB schema change |
| Removing HealthModule breaks monitoring if something depends on HTTP | Low | Service is TCP-only per `main.ts` — HTTP health was never reachable |

## Rollback Plan

Restore `src/health/` directory, revert `tcp-payload.ts` type, revert Prisma generator, delete `.env` file. No data changes — pure code/config.

## Dependencies

- `@agua/contracts` for `UserRole` import (already a dep)

## Success Criteria

- [ ] All existing tests pass (P0+P1 behavior unchanged, 4 existing spec files green)
- [ ] Adapter has unit tests covering success, timeout, invalid response, connection error
- [ ] `role` is typed as `UserRole` in tcp-payload.ts
- [ ] schema.prisma has `decimalNumbers = true` in generator block
- [ ] entregas-service has `.env` with `DATABASE_URL`, `TCP_PORT`, `REDIS_URL`
- [ ] HealthModule files removed with no runtime impact
- [ ] `prisma generate` runs without errors
