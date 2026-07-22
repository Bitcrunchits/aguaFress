# Design: Entregas Service — P2 Cleanup (AG-171)

## Technical Approach

Five independent cleanup items with zero behavior change. Each is a self-contained file edit or addition. No new dependencies, no data migration, no runtime impact.

## Architecture Decisions

### Decision: HealthModule — remove, not import

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Import in AppModule | Keeps HTTP health endpoint alive | ❌ Rejected |
| Remove files | Dead code — service is TCP-only per `main.ts`, HTTP controller never registers | ✅ **Chosen** |

**Rationale**: `main.ts` creates a `Microservice` with `Transport.TCP`, not an HTTP server. The `HealthController` (HTTP `@Get()`) can never be reached. Keeping dead code is worse than removing it — it misleads future devs. The proposal says remove, and the code confirms it's unreachable.

### Decision: Adapter test pattern

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Mock `ClientProxy` directly | Simple, matches existing test style | ✅ **Chosen** |
| Integration test with real TCP | Requires running usuario-service — too heavy for unit | ❌ Rejected |

**Rationale**: Follows the same pattern as `deliveries-tcp.controller.spec.ts` and `delivery-event-publisher.redis.spec.ts` — `Test.createTestingModule`, manual mocks, `jest.clearAllMocks()` in `beforeEach`.

### Decision: `role: string` → `UserRole`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Change type + remove cast | Eliminates `as UserRole` in `tcp-payload-adapter.service.ts` | ✅ **Chosen** |
| Keep `string` + cast | Type-unsafe, defeats purpose | ❌ Rejected |

**Rationale**: `tcp-payload-adapter.service.ts` line 35 already casts `user.role as UserRole`. Changing the source type to `UserRole` makes the cast redundant and the type chain sound. The `TcpPayload` interface is only used internally (TCP controller + adapter), so no external contract breaks.

### Decision: Env sync — service-level `.env` + root `.env.example`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Only root `.env.example` | Single source of truth but no local dev convenience | ❌ Rejected |
| Service `.env` + root section | Both local dev convenience and discoverability | ✅ **Chosen** |

**Rationale**: The proposal says create `MicroServices/entregas-service/.env` and update root `.env.example`. The service already has `.env.example` (stale). We'll create `.env` for local dev and add an ENTREGAS section to root `.env.example`.

## Data Flow

No data flow changes — all items are static code/config edits.

```
Item 1: HealthModule ──→ DELETE src/health/ (dead code)
Item 2: Adapter tests ──→ NEW spec file (no runtime impact)
Item 3: role: string  ──→ UserRole (type-level change only)
Item 4: decimalNumbers ──→ Prisma generator config (generated types change)
Item 5: Env sync       ──→ .env files (config only)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/health/health.controller.ts` | Delete | Dead HTTP controller in TCP-only service |
| `src/health/health.module.ts` | Delete | Dead module, no consumers |
| `src/deliveries/usuario-vendedor-profile-resolver.adapter.spec.ts` | Create | Unit tests: success, timeout, invalid response, connection error |
| `src/tcp/tcp-payload.ts` | Modify | `role: string` → `role: UserRole`; add import from `@agua/contracts` |
| `prisma/schema.prisma` | Modify | Add `decimalNumbers = true` to `generator client {}` |
| `MicroServices/entregas-service/.env` | Create | Dev env vars for local development |
| `MicroServices/entregas-service/.env.example` | Modify | Sync with actual vars (add `USUARIO_SERVICE_HOST`, `USUARIO_SERVICE_TCP_PORT`, `TCP_TIMEOUT_MS`) |
| Root `.env.example` | Modify | Add `# ─── entregas-service ───` section with `ENTREGAS_SERVICE_HOST`, `ENTREGAS_SERVICE_TCP_PORT`, `TCP_TIMEOUT_MS` |

## Interfaces / Contracts

### tcp-payload.ts — type change

```typescript
// Before
export interface TcpAuthenticatedUser {
  readonly role: string;
}

// After
import { UserRole } from '@agua/contracts';
export interface TcpAuthenticatedUser {
  readonly role: UserRole;
}
```

**Impact analysis**: The `as UserRole` cast in `tcp-payload-adapter.service.ts` line 35 becomes redundant but harmless — the type is now sound at the source. No other consumers of `TcpAuthenticatedUser.role` exist in the codebase.

### Prisma generator change

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/prisma"
  decimalNumbers  = true
}
```

This makes `latitud` and `longitud` (both `Decimal?`) return as `number | null` instead of `Decimal | null`. The `delivery.mapper.spec.ts` already passes raw numbers (`-31.4167`, `-64.1833`) — no test changes needed.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `UsuarioVendedorProfileResolverAdapter.resolveVendedorIdByAuthUserId` | Mock `ClientProxy` via `USUARIO_SERVICE_CLIENT` token. 4 scenarios: success, timeout, invalid response shape, connection error. Follow pattern from `delivery-event-publisher.redis.spec.ts` and `deliveries-tcp.controller.spec.ts`. |

### Test scenarios detail

| Scenario | Mock Setup | Assertion |
|----------|-----------|-----------|
| Success | `client.send` returns `{ vendedorId: 'abc-123' }` | Returns `'abc-123'` |
| Timeout | `client.send` pipe throws `TimeoutError` | Throws `ServiceUnavailableException` |
| Invalid response | `client.send` returns `{}` or `null` | Throws `ServiceUnavailableException` |
| Connection error | `client.send` throws `Error('ECONNREFUSED')` | Throws the original error |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `UsuarioVendedorProfileResolverAdapter` | Mock `ClientProxy` via `USUARIO_SERVICE_CLIENT` token. 4 scenarios. Same pattern as existing spec files. |
| Compile | `role: UserRole` change | TypeScript compilation — no runtime test needed |
| Compile | `decimalNumbers = true` | `prisma generate` — generated types change from `Decimal` to `number` |

## Migration / Rollout

No migration required. All changes are code-level or config-level:
- **HealthModule**: Delete files — no DB impact
- **Adapter tests**: New spec file — no runtime impact
- **role type**: Compile-time change only
- **decimalNumbers**: `prisma generate` regenerates types — no DB schema change
- **Env sync**: Config files only

Rollback: revert each file change individually. No data involved.

## Open Questions

None. All items are straightforward with clear code evidence.

<｜DSML｜tool_calls>
<｜DSML｜invoke name="engram_mem_save">
<｜DSML｜parameter name="title" string="true">sdd/entregas-refactor-p2/design