# Design: AuditLogModule

## Technical Approach

Hybrid audit module: `AuditLogService.record()` for complex state transitions in services + `@AuditLog(action)` SetMetadata decorator + NestInterceptor for automatic controller-level logging. `@Global()` module registered once in `app.module.ts`. All 12 actions as `AuditAction` enum in `@agua/contracts`.

## Architecture Decisions

### Decision: @Global() vs Per-Module Import

| Opción | Tradeoffs | Decisión |
|--------|-----------|----------|
| `@Global()` module | + No need to import in 7 modules — each requires a constructor injection change anyway | ✅ **Elegido**. Audit is cross-cutting infrastructure, same rationale as `CommonModule`. `@Global()` reduces surface area at registration. |
| Per-module imports | + Explicit dependency graph — each module must opt in | ❌ Descartado. 7 modules would need to import AuditLogModule AND add the injection. The import is noise — every service truly needs it. |

### Decision: Decorator Implementation (SetMetadata + Interceptor)

| Opción | Tradeoffs | Decisión |
|--------|-----------|----------|
| Method decorator wrapping handler | + Simple to implement — wraps function in a try/finally that calls record() | ❌ Descartado. Can't easily access NestJS injection context (`@CurrentUser`, `ExecutionContext`) from a plain method decorator. |
| `SetMetadata` decorator + NestInterceptor | + Can access `ExecutionContext`, `request.user`, `request.ip` via `ArgumentsHost` | ✅ **Elegido**. Follows NestJS patterns — the `@AuditLog(action)` decorator just stores metadata, an interceptor reads it after handler success and calls `record()`. |

The interceptor is registered as a **provider in AuditLogModule** (NOT global `APP_INTERCEPTOR`). Each route that wants audit must be in a controller that's inside the module's controllers array.

### Decision: AuditAction Enum Location

| Opción | Tradeoffs | Decisión |
|--------|-----------|----------|
| Local to audit-log module | + No dependency on contracts package | ❌ Descartado. Other modules need to reference the action when calling `record()` manually. |
| `@agua/contracts` | + Single source of truth, same pattern as UserRole, VendedorEstado | ✅ **Elegido**. Add `AuditAction` enum to `packages/contracts/src/enums.ts`. Matches existing pattern. |

### Decision: IP Extraction Strategy

| Estrategia | Comportamiento | Decisión |
|------------|----------------|----------|
| `req.ip` only | Depends on trust proxy setting | ❌ Descartado. Behind reverse proxy (Docker), `req.ip` may be the proxy IP. |
| `x-forwarded-for` first, fallback `req.ip` | Parse first IP from `x-forwarded-for` header, fall back to `req.ip` | ✅ **Elegido**. Standard approach for containerized apps. `x-forwarded-for` can contain comma-separated list — take the first entry (client IP). |

### Decision: Admin Endpoint Response Shape

| Campo | Fuente | Notas |
|-------|--------|-------|
| `id` | AuditLog.id | UUID |
| `accion` | AuditLog.accion | AuditAction string |
| `usuarioId` | AuditLog.usuario_id | For filtering/frontend |
| `usuarioEmail` | JOIN AuthUser.email | Relación actor |
| `usuarioRole` | JOIN AuthUser.role | Relación actor |
| `targetId` | AuditLog.target_id | Nullable |
| `detalle` | AuditLog.detalle | Nullable JSON |
| `ip` | AuditLog.ip | Nullable |
| `createdAt` | AuditLog.created_at | ISO string |

The JOIN to `AuthUser` is done via Prisma's `actor` relation — single query, no N+1.

## Data Flow

```
Controller handler
  │
  ├─ (no @AuditLog) ──► response directly
  │
  └─ (@AuditLog present) ──► NestInterceptor.onResponse()
       │
       ├─ Success (2xx) ──► AuditLogService.record(action, userId, { targetId, ip })
       │                      └─► Prisma AUDIT_LOG INSERT
       │
       └─ Error (4xx/5xx) ──► skip audit (no log on failure)

Service (manual call):
  service.method() ──► AuditLogService.record(action, userId, { targetId, detail, ip })
                         └─► Prisma AUDIT_LOG INSERT
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/audit-log/audit-log.module.ts` | Create | `@Global()` module definition |
| `src/audit-log/audit-log.service.ts` | Create | Core `record()` method |
| `src/audit-log/audit-log-admin.controller.ts` | Create | GET /admin/audit-logs endpoint |
| `src/audit-log/decorators/audit-log.decorator.ts` | Create | `@AuditLog(action)` SetMetadata decorator |
| `src/audit-log/interceptors/audit-log.interceptor.ts` | Create | Interceptor reads metadata, calls record() on success |
| `src/audit-log/dto/audit-log-entry.dto.ts` | Create | Response DTO for admin endpoint |
| `src/audit-log/dto/list-audit-logs.dto.ts` | Create | Query DTO with filters + pagination |
| `src/audit-log/utils/ip-extractor.ts` | Create | IP extraction utility |
| `src/audit-log/audit-log.service.spec.ts` | Create | Unit tests |
| `src/audit-log/audit-log-admin.controller.spec.ts` | Create | Integration/controller tests |
| `src/app.module.ts` | Modify | Add AuditLogModule to imports |
| `src/auth/auth.service.ts` | Modify | Inject AuditLogService, call record() for USER_REGISTERED, USER_LOGIN |
| `src/vendedores/vendedores.service.ts` | Modify | Inject, call for VENDEDOR_UPDATED, VENDEDOR_STATUS_CHANGED |
| `src/clientes/clientes.service.ts` | Modify | Inject, call for CLIENTE_UPDATED, CLIENTE_REASSIGNED |
| `src/qr-codes/qr-codes.service.ts` | Modify | Inject, call for QR_CREATED, QR_DEACTIVATED |
| `src/link-invitacion/link-invitacion.service.ts` | Modify | Inject, call for LINK_CREATED, LINK_DEACTIVATED |
| `src/super-admin/super-admin.service.ts` | Modify | Inject, call for SUPER_ADMIN_UPDATED |
| `src/users/users.service.ts` | Modify | Inject, call for PROFILE_UPDATED |
| `packages/contracts/src/enums.ts` | Modify | Add AuditAction enum (12 values) |

## Interfaces & Contracts

```typescript
// packages/contracts/src/enums.ts
export enum AuditAction {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  VENDEDOR_UPDATED = 'VENDEDOR_UPDATED',
  VENDEDOR_STATUS_CHANGED = 'VENDEDOR_STATUS_CHANGED',
  CLIENTE_UPDATED = 'CLIENTE_UPDATED',
  CLIENTE_REASSIGNED = 'CLIENTE_REASSIGNED',
  QR_CREATED = 'QR_CREATED',
  QR_DEACTIVATED = 'QR_DEACTIVATED',
  LINK_CREATED = 'LINK_CREATED',
  LINK_DEACTIVATED = 'LINK_DEACTIVATED',
  SUPER_ADMIN_UPDATED = 'SUPER_ADMIN_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
}
```

```typescript
// AuditLogService.record() signature
record(
  action: AuditAction,
  userId: string,
  opts?: {
    targetId?: string;
    detail?: Record<string, unknown>;
    ip?: string;
  },
): Promise<AuditLog>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | AuditLogService.record() | Mock PrismaService, test full insert, null fields, invalid action |
| Unit | IpExtractor utility | Mock req with/without x-forwarded-for |
| Unit | @AuditLog decorator + interceptor | Mock ExecutionContext, test success log, exception skip, missing userId |
| Integration | Admin controller | Use NestJS Test with in-memory or mock DB, test 200/401/403/filter combinations |

## Migration / Rollout

No migration required. `AUDIT_LOG` table already exists in Prisma schema. Audit rows are purely additive — no backfill needed.

## Open Questions

- None resolved. All decisions documented above.
