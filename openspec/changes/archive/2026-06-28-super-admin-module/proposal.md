# Proposal: Super Admin Module

## Intent

Auth creates SuperAdmin records on registration, but no module manages them post-creation. SuperAdmins can't view/edit their own profile, and there's no dashboard to see aggregate platform stats. This fills the gap mirroring VendedoresModule patterns.

## Scope

### In Scope
- SuperAdmin self-service: GET/PATCH own profile (nombre, apellido)
- Dashboard stats: aggregate counts (total vendedores, clientes, activos/pendientes)
- Unit/integration tests (Strict TDD)

### Out of Scope
- QR_CODE, LINK_INVITACION, AUDIT_LOG (deferred)
- CRUD for other super admins (deferred)
- Vendedor/clientes admin CRUD (already exists in VendedoresController/ClientesController with RolesGuard)

## Capabilities

### New Capabilities
- `super-admin-profile`: SuperAdmin self-service — GET/PATCH own nombre/apellido. Guarded by `RolesGuard(Role.SUPER_ADMIN)`.
- `dashboard-stats`: Aggregate platform numbers — total vendedores, clientes, by estado. Guarded by `RolesGuard(Role.SUPER_ADMIN)`.

### Modified Capabilities
- None

## Approach

New `SuperAdminModule` at `src/super-admin/` with a single controller (no dual pattern needed — super admins have no self-vs-admin split). Uses `RolesGuard(Role.SUPER_ADMIN)` for auth, `@CurrentUser()` for userId extraction. Dashboard stats queries Prisma aggregate counts. Reuses existing VendedoresController for admin vendedor operations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/super-admin/` | New | Module, controller, service, DTOs, tests |
| `src/app.module.ts` | Modified | Import SuperAdminModule |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dashboard query perf on large datasets | Low | Simple count queries; no pagination needed for MVP |

## Rollback Plan

Remove `SuperAdminModule` from `AppModule`, delete `src/super-admin/`. No schema changes needed.

## Dependencies

- SUPER_ADMIN table (existing)
- AuthModule guards (JwtAuthGuard, RolesGuard), `@CurrentUser()` decorator
- VENDEDOR + CLIENTE tables for dashboard counts
- `@agua/contracts` for Role enum

## Success Criteria

- [ ] SuperAdmin can GET own profile via `/super-admin/me`
- [ ] SuperAdmin can PATCH own nombre/apellido
- [ ] Dashboard endpoint returns correct aggregate counts
- [ ] All endpoints return 403 for non-SUPER_ADMIN roles
- [ ] Unit + integration tests pass
