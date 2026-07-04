## Exploration: AuditLogModule

### Current State

The `AuditLog` model already exists in `prisma/schema.prisma` (line 163) with these fields:
- `id` (UUID PK)
- `usuario_id` (nullable UUID — FK to AuthUser as "actor")
- `target_id` (nullable UUID — FK to AuthUser as "target")
- `accion` (String, VarChar(50))
- `detalle` (nullable JSON)
- `ip` (String, VarChar(45) — nullable)
- `created_at` (DateTime, auto)

Two relations connect it to `AuthUser`: `AuditLogActor` (via `usuario_id`) and `AuditLogTarget` (via `target_id`).

Currently, **nothing writes to this table**. There is no module, no service, no controller, and no integration with existing services.

The existing codebase follows a consistent module pattern:
- Each module imports `AuthModule` (for guards/strategy) and `CommonModule` (for PrismaService)
- `CommonModule` is `@Global()` and provides `PrismaService` + global interceptors (`LoggingInterceptor`, `TransformInterceptor`, `TimeoutInterceptor`)
- `AuthModule` registers `JwtAuthGuard` as a global `APP_GUARD`
- `@CurrentUser('userId')` extracts the authenticated user ID from `request.user`
- Services inject `PrismaService` directly and follow a clean service pattern
- Pagination is consistent: `{ data, pagination: { page, limit, total, totalPages } }`
- Controllers are split by audience: `VendorController` (vendedor-scoped) and `AdminController` (SUPER_ADMIN-scoped)

### Affected Areas

- **New files (audit-log-module)**:
  - `src/audit-log/audit-log.module.ts` — Module definition
  - `src/audit-log/audit-log.service.ts` — Core audit logging service
  - `src/audit-log/audit-log-admin.controller.ts` — Admin query endpoint
  - `src/audit-log/dto/` — DTOs for filtering/querying
  - `src/audit-log/audit-log.service.spec.ts` — Unit tests
  - `src/audit-log/audit-log-admin.controller.spec.ts` — Controller tests

- **Existing files to modify**:
  - `src/app.module.ts` — Register `AuditLogModule`
  - `src/auth/auth.service.ts` — Add audit calls for login and register
  - `src/vendedores/vendedores.service.ts` — Add audit calls for update, changeEstado
  - `src/clientes/clientes.service.ts` — Add audit calls for update, reassign
  - `src/qr-codes/qr-codes.service.ts` — Add audit calls for create, deactivate
  - `src/link-invitacion/link-invitacion.service.ts` — Add audit calls for create, deactivate
  - `src/super-admin/super-admin.service.ts` — Add audit calls for profile update
  - `src/users/users.service.ts` — Add audit calls for profile update

- **Potentially**:
  - `packages/contracts/src/enums.ts` — Add `AuditAction` enum for shared action names

### Approaches

#### 1. Manual injection (recommended) — AuditLogService called explicitly from each service

**How it works**: Create `AuditLogService` with methods like `log(action, userId, { targetId?, detail?, ip? })`. Each existing service imports and calls it at key points. Optionally add a `@AuditLog()` decorator for simple cases.

**Pros**:
- Full control over what gets logged and what detail to include
- Can capture semantic context (before/after state, transition details)
- Explicit — no magic, easy to test
- Follows existing patterns (services call other services)
- Can log ip from request via a separate utility
- Minimal new concepts

**Cons**:
- Requires modifying every service that needs audit logging
- Developers must remember to call it for each action
- No automatic coverage (easy to miss an endpoint)

**Effort**: Medium

#### 2. Pure interceptor — Automatic HTTP request logging

**How it works**: A `NestInterceptor` registered globally that intercepts all requests, executes them, and logs method + path + status + userId to `AuditLog`.

**Pros**:
- Zero changes to existing services
- Automatic coverage of ALL endpoints
- Consistent logging format

**Cons**:
- Cannot capture semantic action names (just HTTP method/PATH)
- Cannot capture business context (before/after state, transition details)
- No way to distinguish "create" from "update" for the same path
- Would log every request including non-auditable ones (health checks, lookups)
- The existing `LoggingInterceptor` already does this for debug — mixing audit into HTTP interceptor is wrong separation of concerns
- Violates SRP and ISP

**Effort**: Low (to implement) but High (to get right — impossible to get business semantics)

#### 3. Hybrid — AuditLogService + decorator helper (recommended)

**How it works**: Core `AuditLogService` for manual calls with full control, plus a lightweight `@AuditLog()` method decorator that auto-logs method calls with action name derived from a parameter. Services use the decorator for standard CRUD and call the service directly for complex cases (status transitions, before/after capture).

**Pros**:
- Best of both worlds: automatic logging for simple CRUD + explicit control for complex ops
- Decorator reduces boilerplate
- One centralized service to manage
- Easy to add ip extraction at the interceptor/decorator level

**Cons**:
- More code initially (decorator + service + module)
- Still need to retrofit existing services (but less invasive than pure manual)
- Both approaches need to coexist cleanly

**Effort**: Medium

### Recommendation

**Approach 3 — Hybrid, with `@Global()` AuditLogModule**:

1. Create `AuditLogModule` with `@Global()` — since audit is a true cross-cutting concern, every service should have access without explicit imports
2. Core: `AuditLogService` with method `record(action, userId, opts?)`:
   ```ts
   record(action: AuditAction, usuarioId: string, opts?: {
     targetId?: string;
     detail?: Record<string, unknown>;
     ip?: string;
   })
   ```
3. Decorator `@AuditLog(action)` for simple CRUD methods in controllers
4. Extract IP via a utility (from `req.ip` or `req.headers['x-forwarded-for']`)
5. Manual calls from services for state changes (capture before/after in `detalle`)

**Why `@Global()`**: This is one of the few valid cases for `@Global()` — audit logging is infrastructure-level cross-cutting, like logging, not business logic. Every service needs it. Adding imports to every module would be noise. This aligns with how `CommonModule` already handles global interceptors.

**Why hybrid**: The pure interceptor approach loses semantic meaning (SRP violation — can't know "VENDEDOR_STATUS_CHANGED" from a PATCH to `/vendedores/:id/estado`). Pure manual requires touching every method — the decorator handles the 80% simple CRUD cases, and manual calls handle the 20% complex cases.

**Actions to audit**:

| Action | Trigger | Detail captures |
|--------|---------|-----------------|
| USER_REGISTERED | auth.register / auth.registerVendedor | email, role |
| USER_LOGIN | auth.login | email |
| VENDEDOR_UPDATED | vendedores.update | changed fields |
| VENDEDOR_STATUS_CHANGED | vendedores.changeEstado | estadoAnterior, estadoNuevo |
| CLIENTE_UPDATED | clientes.update | changed fields |
| CLIENTE_REASSIGNED | clientes.reassign | vendedorAnteriorId, vendedorNuevoId |
| QR_CREATED | qr-codes.create | codigo |
| QR_DEACTIVATED | qr-codes.deactivate | — |
| LINK_CREATED | link-invitacion.create | token |
| LINK_DEACTIVATED | link-invitacion.deactivate | — |
| SUPER_ADMIN_UPDATED | super-admin.updateProfile | changed fields |
| PROFILE_UPDATED | users.updateProfile | changed fields |

**Admin query endpoint**:

`GET /admin/audit-logs` with filters:
- `usuarioId` (actor)
- `accion` (exact action string)
- `from` / `to` (ISO date range on `created_at`)
- `targetId`
- `page` / `limit` (standard pagination)

Access: SUPER_ADMIN only (via `RolesGuard` + `@Roles(UserRole.SUPER_ADMIN)`)

Response: `{ data: AuditLogEntry[], pagination: PaginationResponse }` where each entry includes serialized `detalle` (JSON), `ip`, `created_at`, and actor info (email, role).

### Risks

- **Performance**: Minimal. Each audit log is a single `INSERT` — negligible under normal load. If the system grows to millions of logs/day, add a cleanup job or TTL (out of scope for MVP).
- **No async fire-and-forget yet**: Currently the service would await the DB write. For MVP this is fine. If latency becomes an issue in the future, switch to `EventEmitterModule` (already installed) + an `@OnEvent` listener to make it async.
- **IP extraction reliability**: Behind a reverse proxy, `req.ip` may not reflect the real client IP. Need to check `x-forwarded-for` header. NestJS has `request.ip` from `@nestjs/platform-express` which handles this, but verify.
- **Regression risk in existing services**: Each injection of `AuditLogService` into an existing service requires adding it to the constructor and calling `record()` — low risk, but each change is a modification to a working file.
- **No retention policy**: The schema has no TTL or cleanup mechanism. For MVP this is acceptable but should be documented as future work.

### Ready for Proposal

Yes. The exploration is complete. Clear picture of:
- What to build (AuditLogModule with hybrid service + decorator approach)
- What actions to audit (12 actions covering auth, CRUD, and state changes)
- Admin querying pattern (standard paginated GET with filters)
- Integration approach (@Global() module, minimal service modifications)
- Risk level (low — straightforward CRUD module, no deep architectural changes)

Next phase: **sdd-propose** to formalize the proposal with scope, approach, and rollback plan.
