# Tasks: Clientes Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,050 |
| 500-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation → PR 2: Service → PR 3: Controllers → PR 4: Integration |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Module + all DTOs + DTO validations + AppModule | PR 1 | base: `feature/clientes-module` |
| 2 | ClientesService (admin CRUD + cartera scoping + reassign) | PR 2 | base: PR 1 branch; RED → GREEN |
| 3 | ClientesController (admin) + ClienteVendedorController (vendedor) | PR 3 | base: PR 2 branch; RED → GREEN |
| 4 | Integration tests (full chain, guard scoping, cartera isolation) | PR 4 | base: PR 3 branch |

## Phase 1: Foundation

- [x] 1.1 RED: Write DTO validation spec — `list-clientes.dto.ts`, `update-cliente.dto.ts`, `update-cliente-vendedor.dto.ts`, `reasignar-vendedor.dto.ts`
- [x] 1.2 GREEN: Create `src/clientes/dto/list-clientes.dto.ts` — page(1), limit(20,max100), vendedor_id?, search?
- [x] 1.3 GREEN: Create `src/clientes/dto/update-cliente.dto.ts` — all profile+direccion fields (admin editable)
- [x] 1.4 GREEN: Create `src/clientes/dto/update-cliente-vendedor.dto.ts` — subset, NO tipo_factura, NO dni
- [x] 1.5 GREEN: Create `src/clientes/dto/reasignar-vendedor.dto.ts` — vendedorId required
- [x] 1.6 GREEN: Create `src/clientes/clientes.module.ts` — imports AuthModule+CommonModule, registers VendedorGuard (reused), providers, both controllers (ClienteVendedorController first for route ordering)
- [x] 1.7 GREEN: Add `ClientesModule` to `app.module.ts` imports

## Phase 2: Service Layer

- [x] 2.1 RED: Write service spec — list with pagination + vendedor_id filter + search (nombre/apellido/dni)
- [x] 2.2 RED: Write service spec — getById returns full profile or 404
- [x] 2.3 RED: Write service spec — update partial fields with snake_case mapping, 404 on missing
- [x] 2.4 RED: Write service spec — reassign validates vendedor exists, upserts cartera via $transaction
- [x] 2.5 RED: Write service spec — listMios scoped via `cartera: { some: { vendedor_id, activo: true } }`
- [x] 2.6 RED: Write service spec — getByIdMio returns 404 if not in cartera (no existence leak)
- [x] 2.7 RED: Write service spec — updateMio scoped to cartera, 404 if not in cartera
- [x] 2.8 GREEN: Create `src/clientes/clientes.service.ts` — admin methods + vendedor-scoped methods + reassign $transaction

## Phase 3: Controllers

- [x] 3.1 RED: Write ClientesController spec — delegation for list, getById, update, reassign
- [x] 3.2 GREEN: Create `src/clientes/clientes.controller.ts` — 4 admin routes with RolesGuard(SUPER_ADMIN)
- [x] 3.3 RED: Write ClienteVendedorController spec — delegation for listMios, getByIdMio, updateMio with @CurrentUser
- [x] 3.4 GREEN: Create `src/clientes/cliente-vendedor.controller.ts` — 3 vendedor routes with VendedorGuard, path `mios/`

## Phase 4: Integration

- [x] 4.1 RED: Write integration spec — full admin flow: list → getById → update → reassign
- [x] 4.2 RED: Write integration spec — auth guard chain: 401 no token, 403 wrong role for admin routes
- [x] 4.3 RED: Write integration spec — vendedor scoping: listMios only own cartera, 404 for non-cartera getById
- [x] 4.4 GREEN: Run full test suite, confirm all RED tests pass

## Patterns to Follow (from VendedoresModule)

- `update-cliente.dto.ts` maps `direccionCalle → direccion_calle`, `direccionNumero → direccion_numero` in service (same pattern as `ciudadDefault → ciudad_default`)
- Reassign uses `prisma.$transaction` — validate vendedor exists, update Cliente.vendedor_id, `cartera.upsert` with `vendedor_id_cliente_id` compound key
- Cartera scoped queries use `{ cartera: { some: { vendedor_id: userId, activo: true } } }` in Prisma `where`
- Route ordering: `ClienteVendedorController` first in `controllers[]` so `mios/` matches before `:id`
