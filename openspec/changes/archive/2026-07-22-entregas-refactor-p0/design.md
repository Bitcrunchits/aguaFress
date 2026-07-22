# Design: Entregas Service — P0 Architecture Refactor

## Technical Approach

Mirror established orders-service patterns to fix identity resolution, Docker runtime, and global error handling. No new behavior — pure architecture alignment. Each change mirrors an existing, proven implementation in the same repo.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Resolver injection point | Controller (via `@Inject`) matches proposal | Service layer (orders pattern) | Proposal explicitly targets controller; less service surface area; testable with module-level mock |
| Resolver export scope | Export from `DeliveriesModule`, consumed by `TcpModule` | Register in `TcpModule` | `DeliveriesModule` owns domain identity; `TcpModule` already imports it |
| RpcExceptionFilter | Register existing filter as-is, no upgrade | Upgrade to orders version (with timestamp/path) | P0 scope is registration only; P1 can align payload shape |
| TCP adapter reuse | Use `payloadAdapter.userId()` for authUserId extraction | `user.sub ?? user.userId` inline | Adapter already normalizes sub/userId; one call replaces fallback pattern |

## Data Flow

```text
TCP deliverie.<action>
  └─ DeliveriesTcpController
      ├─ payloadAdapter.requireUser(payload)   → TcpAuthenticatedUser
      ├─ vendedorProfileResolver.resolveVendedorIdByAuthUserId(authUserId)
      │   └─ TCP → usuario-service 'vendedores.resolve_profile_id'
      │   └─ returns vendedorId: string
      └─ deliveriesService.findAll|findOne|updateStatus(..., vendedorId)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `MicroServices/entregas-service/src/deliveries/vendedor-profile-resolver.port.ts` | Create | Port interface + DI token `VENDEDOR_PROFILE_RESOLVER_PORT` |
| `MicroServices/entregas-service/src/deliveries/usuario-vendedor-profile-resolver.adapter.ts` | Create | TCP adapter → usuario-service `vendedores.resolve_profile_id` |
| `MicroServices/entregas-service/src/deliveries/deliveries.module.ts` | Modify | Register adapter + port token; export port |
| `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.ts` | Modify | Inject resolver; replace `user.sub ?? user.userId` with resolved `vendedorId` |
| `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.spec.ts` | Modify | Provide mock resolver; assert resolved vendedorId |
| `MicroServices/entregas-service/src/main.ts` | Modify | `app.useGlobalFilters(new RpcExceptionFilter())` |
| `MicroServices/entregas-service/Dockerfile` | Create | Multi-stage build, node:22-alpine, prisma generate + db push, port 3015 |
| `docker-compose.yml` | Modify | Add `entregas-service` service + `agua_entregas` db init SQL |
| `docker/init-db/create-service-databases.sql` | Modify | Add `agua_entregas` database creation |

## Interfaces / Contracts

**Port** — exact copy of orders-service pattern:

```typescript
// src/deliveries/vendedor-profile-resolver.port.ts
export const VENDEDOR_PROFILE_RESOLVER_PORT = 'VENDEDOR_PROFILE_RESOLVER_PORT';
export interface VendedorProfileResolverPort {
  resolveVendedorIdByAuthUserId(authUserId: string): Promise<string>;
}
```

**Adapter** — mirrors orders `usuario-vendedor-profile-resolver.adapter.ts`:
- `ClientProxyFactory.create` → TCP to `usuario-service:3011`
- Sends `{ user: { sub: authUserId, email: '', role: UserRole.VENDEDOR }, requestId }` to pattern `'vendedores.resolve_profile_id'`
- Validates response shape with `isResolveVendedorProfileResponse` guard
- `OnModuleDestroy` to close TCP client
- `USUARIO_SERVICE_HOST`, `USUARIO_SERVICE_TCP_PORT`, `TCP_TIMEOUT_MS` from env

**Module wiring** — in `DeliveriesModule`:
```typescript
providers: [
  DeliveriesService,
  UsuarioVendedorProfileResolverAdapter,
  { provide: VENDEDOR_PROFILE_RESOLVER_PORT, useExisting: UsuarioVendedorProfileResolverAdapter },
],
exports: [DeliveriesService, VENDEDOR_PROFILE_RESOLVER_PORT],
```

**Controller injection** — in `DeliveriesTcpController`:
```typescript
constructor(
  ...,
  @Inject(VENDEDOR_PROFILE_RESOLVER_PORT)
  private readonly vendedorProfileResolver: VendedorProfileResolverPort,
) {}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (controller) | Controller resolves vendedorId from mocked resolver, passes to service | Provide `mockResolvedValue('vendedor-resolved-1')` for resolver; assert service called with resolved ID |
| Unit (controller) | UnauthorizedException when no user in payload | No resolver mock needed — fails in `payloadAdapter.requireUser()` before resolution |
| Unit (adapter) | TCP client response validation | Type guard test separately; timeout/host config from env |
| Integration | Docker compose up, prisma db push, TCP handler responds | `docker compose up -d` + smoke test TCP pattern |

## Migration / Rollout

No migration required. Change is additive (new files) + controlled edits:
1. New port + adapter + Dockerfile can coexist with existing code
2. Controller edit replaces `user.sub` with resolved call — same service interface
3. Rollback: restore controller to pass `user.sub`, remove Dockerfile, comment out docker-compose block

## Open Questions

- [ ] Does `usuario-service` `vendedores.resolve_profile_id` pattern have any rate-limiting or timeout concerns at scale? Affects TCP_TIMEOUT_MS default.
