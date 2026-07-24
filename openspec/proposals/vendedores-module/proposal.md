# Proposal: Vendedores Module

## Intent

Vendedor registration already works (via auth register, creates record with `estado=pendiente`), but there is no module to manage vendedores after creation. Admins can't activate pending sellers, list them, or change their status; vendedores can't view or update their own profile. This change fills that gap with a dedicated VendedoresModule.

## Scope

### In Scope
- GET /vendedores — list vendedores with filters (estado, search)
- GET /vendedores/:id — full profile (auth user + vendedor data)
- PATCH /vendedores/:id — update profile (empresa, telefono, logo, ciudad_default, zona_entrega)
- PATCH /vendedores/:id/estado — admin-only status transitions (pendiente → activo, activo → inactivo/bloqueado)
- Unit tests + integration tests (Strict TDD)

### Out of Scope
- Cliente CRUD (separate module, deferred)
- Cartera / QrCode / LinkInvitacion (deferred)
- Products, Orders, Deliveries (other services)
- Schema cleanup of external tables (prerequisite, not code)
- SuperAdmin module (deferred)

## Capabilities

### New Capabilities
- `vendedor-admin`: Admin-only vendedor management — list with pagination+filters, get by ID, update profile, change estado with status-machine validation.
- `vendedor-profile`: Self-service profile retrieval and update for authenticated vendedores (mapped through `@CurrentUser()` — vendedor can only edit own record).

### Modified Capabilities
- None

## Approach

New VendedoresModule with `VendedoresController` (admin routes) and `VendedorProfileController` (self-service), sharing a `VendedoresService`. Admin routes guarded by `RolesGuard(Role.SUPER_ADMIN)`, self-service routes by `AuthGuard('jwt')` using `@CurrentUser('userId')` to scope updates. Validation with class-validator DTOs mirroring contract interfaces. Status machine enforced in service layer: invalid transitions (e.g., bloqueado → pendiente) throw `BadRequestException`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/vendedores/` | New | Module, controller (admin), controller (self), service, DTOs, tests |
| `src/app.module.ts` | Modified | Import VendedoresModule |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Status machine grows complex with real workflows | Low | Current spec has 4 states with linear+block transitions; extract validator if extended later |

## Rollback Plan

1. Remove `VendedoresModule` from `AppModule` imports
2. Delete `src/vendedores/` directory
3. No DB schema changes — VENDEDOR table already exists

## Dependencies

- VENDEDOR table and VendedorEstado enum in Prisma schema (already exist)
- AuthModule guards and decorators (`@CurrentUser()`, `RolesGuard`)
- Contract DTOs already defined in `@agua/contracts` (`VendedorResponse`, `VendedorProfile`, `SuperAdminVendedorListFilters`, `SuperAdminAccionResponse`)

## Success Criteria

- [ ] Admin can list vendedores with estado/search filters
- [ ] Admin can view any vendedor's full profile by ID
- [ ] Admin can transition vendedor estado (valid transitions only)
- [ ] Vendedor can view own profile via authenticated endpoint
- [ ] Vendedor can update own empresa, telefono, logo, ciudad_default, zona_entrega
- [ ] Invalid status transitions return 400 with clear message
- [ ] Unit + integration tests pass
