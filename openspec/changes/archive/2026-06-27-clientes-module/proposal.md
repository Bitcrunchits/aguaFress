# Proposal: Clientes Module

## Intent

Auth creates Cliente records on registration, UsersModule surfaces basic fields — but no module manages them post-creation. Admins can't list/search/update or assign vendedores; vendedores can't see their cartera. This fills that gap mirroring VendedoresModule patterns.

## Scope

### In Scope
- Admin: list clientes (filters: vendedor_id, search by nombre/apellido/dni)
- Admin: get by ID (full profile + vendedor + address), update profile, assign/change vendedor (upserts Cartera)
- Vendedor: list MY clientes, get/update profile (cartera-scoped)
- Unit/integration tests (Strict TDD)

### Out of Scope
- QrCode / LinkInvitacion, AuditLog, SuperAdmin (deferred)
- Self-registration (already in AuthModule), event emission (deferred)

## Capabilities

### New Capabilities
- `cliente-admin`: Admin-only CRUD — list with pagination/filters, get, update, reassign vendedor, manage address.
- `cliente-vendedor`: Vendedor-scoped access — list own cartera, get/update assigned clients.

### Modified Capabilities
- None

## Approach

New `ClientesModule` with dual-controller pattern: `ClientesController` (admin, `RolesGuard`) and `ClienteVendedorController` (vendedor, `VendedorGuard`). Single `ClientesService` shared. Admin routes at `/clientes/:id`, vendedor routes at `/clientes` scoped to `vendedor_id` from JWT. Address validation via class-validator DTOs.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/clientes/` | New | Module, controllers, service, DTOs, tests |
| `src/app.module.ts` | Modified | Import ClientesModule |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stale cartera on reassignment | Low | Flag-based soft deactivate, no hard delete |

## Rollback Plan

Remove `ClientesModule` from `AppModule`, delete `src/clientes/`. No schema changes needed.

## Dependencies

- CLIENTE + RELACION_CARTERA tables (existing)
- AuthModule guards, `@CurrentUser()` decorator
- Contract DTOs from `@agua/contracts`

## Success Criteria

- [ ] Admin CRUD clientes with filters
- [ ] Admin reassign vendedor (upserts Cartera)
- [ ] Vendedor lists/gets/updates own cartera only
- [ ] Vendedor gets 404 for clientes not in cartera
- [ ] Unit + integration tests pass
