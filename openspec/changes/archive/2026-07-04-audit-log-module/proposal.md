# Proposal: AuditLogModule

## Intent

AuditLog model exists in Prisma but nothing writes to it. All 7 business services need audit trails. A single module provides consistent infrastructure instead of ad-hoc logging per service.

## Scope

### In Scope

- `@Global()` AuditLogModule + `AuditLogService.record(action, userId, opts)`
- `@AuditLog(action)` decorator for simple CRUD
- Admin `GET /audit-logs` (SUPER_ADMIN only, paginated + 5 filters)
- 12 audit actions across auth, vendedores, clientes, qr-codes, link-invitacion, super-admin, users
- `AuditAction` enum in `packages/contracts/src/enums.ts`
- Unit tests (service + controller, 75%+ coverage)

### Out of Scope

- TTL/cleanup for old logs (defer to post-MVP)
- Async event-based logging (EventEmitter deferred)
- Real-time dashboard / WebSocket pushes
- Pure-interceptor approach (rejected — loses business semantics, violates SRP/ISP)

## Capabilities

### New Capabilities

- `audit-log`: Audit trail writer (service + decorator) + admin query endpoint with filters and pagination

### Modified Capabilities

None — audit calls are implementation details; no spec-level behavior changes in existing capabilities

## Approach

Hybrid: `AuditLogService` for complex ops (state transitions, before/after capture) + `@AuditLog(action)` decorator for standard CRUD. `@Global()` module since audit is cross-cutting infrastructure (same rationale as CommonModule). IP extraction utility: `x-forwarded-for` > `req.ip`. Admin endpoint uses existing pagination pattern. All 12 actions defined as `AuditAction` enum values.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `MicroServices/usuario-service/src/audit-log/` | New | Module, service, decorator, controller, DTOs, tests |
| `MicroServices/usuario-service/src/app.module.ts` | Modified | Register AuditLogModule |
| `.../usuario-service/src/auth/auth.service.ts` | Modified | Add USER_REGISTERED, USER_LOGIN audit calls |
| `.../src/vendedores/vendedores.service.ts` | Modified | Add VENDEDOR_UPDATED, VENDEDOR_STATUS_CHANGED |
| `.../src/clientes/clientes.service.ts` | Modified | Add CLIENTE_UPDATED, CLIENTE_REASSIGNED |
| `.../src/qr-codes/qr-codes.service.ts` | Modified | Add QR_CREATED, QR_DEACTIVATED |
| `.../src/link-invitacion/link-invitacion.service.ts` | Modified | Add LINK_CREATED, LINK_DEACTIVATED |
| `.../src/super-admin/super-admin.service.ts` | Modified | Add SUPER_ADMIN_UPDATED |
| `.../src/users/users.service.ts` | Modified | Add PROFILE_UPDATED |
| `packages/contracts/src/enums.ts` | Modified | Add `AuditAction` enum |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sync DB write adds request latency | Low | Single INSERT; switch to EventEmitter if needed |
| IP extraction behind proxy unreliable | Low | `x-forwarded-for` check before `req.ip` |
| Regression from injecting into 7 services | Low | Additive changes; existing tests guard behavior |
| No retention policy for old logs | Medium (prod) | Document as known gap, defer to future session |

## Rollback Plan

1. Remove `AuditLogModule` from `app.module.ts` imports
2. Revert all `AuditLogService` injections in 7 service files
3. Delete `MicroServices/usuario-service/src/audit-log/` directory
4. Revert `AuditAction` enum from `packages/contracts/src/enums.ts`

All changes are additive — no data migration, no schema changes. Prisma table already exists unused.

## Dependencies

None. `AuditLog` model exists in Prisma schema. No new npm packages.

## Success Criteria

- [ ] `record()` inserts row with all fields (`usuario_id`, `target_id`, `accion`, `detalle`, `ip`)
- [ ] `@AuditLog(action)` decorator logs correct action + userId from `@CurrentUser`
- [ ] All 12 audit actions fire on their respective trigger points
- [ ] Admin endpoint returns filtered, paginated results; 401 for unauthenticated, 403 for non-admin
- [ ] Unit tests pass with 75%+ coverage on new code
