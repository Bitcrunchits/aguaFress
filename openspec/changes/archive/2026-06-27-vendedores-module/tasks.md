# Tasks: Vendedores Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,250 |
| 500-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation → PR 2: Service → PR 3: Admin → PR 4: Profile |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Base |
|------|------|------|------|
| 1 | Module + DTOs + VendedorGuard + AppModule | PR 1 | feature/vendedores-module |
| 2 | VendedoresService (status machine + pagination) | PR 2 | PR 1 branch |
| 3 | VendedoresController (admin) + tests | PR 3 | PR 2 branch |
| 4 | VendedorProfileController (self) + tests | PR 4 | PR 3 branch |

## Phase 1: Foundation

- [x] 1.1 RED: Write VendedorGuard spec — role check returns 403 for non-vendedor, inactive vendedor
- [x] 1.2 GREEN: Create `src/vendedores/guards/vendedor.guard.ts`
- [x] 1.3 RED: Write validation tests for ListVendedoresDto, UpdateVendedorDto, ChangeEstadoDto, UpdateVendedorProfileDto
- [x] 1.4 GREEN: Create `src/vendedores/dto/list-vendedores.dto.ts` (page, limit, estado, search)
- [x] 1.5 GREEN: Create `src/vendedores/dto/update-vendedor.dto.ts` (empresa, telefono, logo, ciudadDefault, zonaEntrega)
- [x] 1.6 GREEN: Create `src/vendedores/dto/change-estado.dto.ts` (estado required, motivo optional)
- [x] 1.7 GREEN: Create `src/vendedores/dto/update-vendedor-profile.dto.ts` (nombre, apellido, telefono, empresa, logo, ciudadDefault, zonaEntrega)
- [x] 1.8 GREEN: Create `src/vendedores/vendedores.module.ts` (import AuthModule, register guard + providers + controllers)
- [x] 1.9 GREEN: Add `VendedoresModule` to `app.module.ts` imports

## Phase 2: Service Layer

- [x] 2.1 RED: Write VendedoresService spec — all 5 valid status transitions + 7+ invalid (400)
- [x] 2.2 RED: Write service spec — list with pagination + estado filter + search + _count clientes
- [x] 2.3 RED: Write service spec — getById returns full profile or 404
- [x] 2.4 RED: Write service spec — update partial fields, 404 on missing vendedor
- [x] 2.5 RED: Write service spec — getMyProfile scoped to userId, 403 if inactive
- [x] 2.6 RED: Write service spec — updateMyProfile partial update, 403 if inactive
- [x] 2.7 GREEN: Create `src/vendedores/vendedores.service.ts` (list, getById, update, changeEstado, getMyProfile, updateMyProfile)

## Phase 3: Admin Controller

- [x] 3.1 RED: Write VendedoresController spec — delegation for list, getById, update, changeEstado
- [x] 3.2 GREEN: Create `src/vendedores/vendedores.controller.ts` (4 admin routes with RolesGuard)

## Phase 4: Profile Controller

- [x] 4.1 RED: Write VendedorProfileController spec — delegation for get/update profile, scoped via @CurrentUser
- [x] 4.2 GREEN: Create `src/vendedores/vendedor-profile.controller.ts` (2 self-service routes with VendedorGuard)

## Phase 5: Integration

- [x] 5.1 RED: Write integration spec — full admin flow (list → getById → update → changeEstado)
- [x] 5.2 RED: Write integration spec — auth guard chain (401 no token, 403 wrong role, 403 inactive)
- [x] 5.3 RED: Write integration spec — self-service scoping (vendedor can only edit own profile)
- [x] 5.4 GREEN: Run full test suite, confirm all RED tests pass
