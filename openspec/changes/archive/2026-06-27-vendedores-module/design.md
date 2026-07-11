# Design: Vendedores Module

## Technical Approach

New `VendedoresModule` following the exact patterns of `UsersModule` — a single NestJS module with two controllers (admin + self-service), shared `VendedoresService`, class-validator DTOs, and state-machine validation at the service layer. The module imports `AuthModule` to access the exported `RolesGuard` for admin routes.

## Architecture Decisions

### Decision: Two controllers instead of one

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single controller with mixed routes | Fewer files, but violates ISP — admin and vendedor are different consumers | Split |
| `VendedoresController` (admin) + `VendedorProfileController` (self) | ISP compliant, clear ownership, each controller has one guard strategy | ✅ |

### Decision: VendedorGuard for self-service role check

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline `if (user.role !== 'vendedor')` in each endpoint | Duplicated, violates DRY | Reject |
| `VendedorGuard` checking `user.role === VendedorEstado.VENDEDOR` | Reusable, composable, follows RolesGuard pattern | ✅ |
| Estado check (activo/inactivo) in service layer | Single responsibility — guard checks identity, service checks business rules | ✅ |

### Decision: Import AuthModule for RolesGuard access

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Import AuthModule in VendedoresModule | Follows NestJS DI conventions, RolesGuard available for `@UseGuards()` | ✅ |
| Declare RolesGuard as global | Would need to modify AuthModule, breaking existing pattern | Reject |

### Decision: Prisma query for list with _count

`GET /vendedores` needs `clientesCount`. Use Prisma's `include: { _count: { select: { clientes: true } } }` on VENDEDOR — avoids N+1, matches `SuperAdminVendedorItem.clientesCount`.

## Data Flow

```
Admin JWT ──→ JwtAuthGuard ──→ RolesGuard(SUPER_ADMIN) ──→ VendedoresController
                                                              │
                                                              ▼
Vendedor JWT ──→ JwtAuthGuard ──→ VendedorGuard ──→ VendedorProfileController
                                                              │
                                                              ▼
                                                      VendedoresService
                                                              │
                                                              ▼
                                                      PrismaService → PostgreSQL
```

## Status Machine (in service)

```
pendiente ──→ activo
activo ──→ inactivo | bloqueado
inactivo ──→ activo
bloqueado ──→ inactivo
```

Implemented as `Record<VendedorEstado, VendedorEstado[]>` map. Invalid transitions (including same-estado) throw `BadRequestException`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/vendedores/vendedores.module.ts` | Create | Module, imports AuthModule, registers both controllers + service + VendedorGuard |
| `src/vendedores/vendedores.controller.ts` | Create | Admin routes: list, getById, update, changeEstado. All `@UseGuards(RolesGuard) @Roles(SUPER_ADMIN)` |
| `src/vendedores/vendedor-profile.controller.ts` | Create | Self-service: getProfile, updateProfile. `@UseGuards(VendedorGuard)` |
| `src/vendedores/vendedores.service.ts` | Create | Shared logic — listVendedores (paginated), getById, update, changeEstado (status machine), getProfile, updateProfile |
| `src/vendedores/guards/vendedor.guard.ts` | Create | `canActivate` checks `user.role === VendedorEstado.VENDEDOR` |
| `src/vendedores/dto/list-vendedores.dto.ts` | Create | `@IsInt() @Min(1) page/limit`, `@IsEnum(VendedorEstado) estado?`, `@IsString() search?` |
| `src/vendedores/dto/update-vendedor.dto.ts` | Create | Admin: empresa, telefono, logo, ciudadDefault, zonaEntrega — all optional `@IsString()` |
| `src/vendedores/dto/change-estado.dto.ts` | Create | `@IsEnum(VendedorEstado) estado` (required), `@IsString() @MaxLength(500) motivo?` |
| `src/vendedores/dto/update-vendedor-profile.dto.ts` | Create | Self: nombre, apellido, telefono, empresa, logo, ciudadDefault, zonaEntrega — all optional |
| `src/vendedores/vendedores.controller.spec.ts` | Create | Unit: test delegation to service |
| `src/vendedores/vendedor-profile.controller.spec.ts` | Create | Unit: test delegation + scope |
| `src/vendedores/vendedores.service.spec.ts` | Create | Unit: test status machine, pagination, 404/400/403 |
| `src/vendedores/vendedores.integration.spec.ts` | Create | Integration: full flows with mocked Prisma + real JWT |
| `src/app.module.ts` | Modify | Add `VendedoresModule` to imports |

## Interfaces / Contracts

**Service methods** (all return typed responses from `@agua/contracts`):

```typescript
class VendedoresService {
  async list(filters: SuperAdminVendedorListFilters): Promise<SuperAdminVendedorListResponse>
  async getById(id: string): Promise<VendedorResponse>
  async update(id: string, dto: UpdateVendedorDto): Promise<VendedorResponse>
  async changeEstado(id: string, dto: ChangeEstadoDto): Promise<SuperAdminAccionResponse>
  async getMyProfile(userId: string): Promise<UserProfile>
  async updateMyProfile(userId: string, dto: UpdateVendedorProfileDto): Promise<UserProfile>
}
```

**Response shapes** match `@agua/contracts` exactly:
- List: `{ data: SuperAdminVendedorItem[], pagination: { page, limit, total, totalPages } }`
- Estado change: `{ vendedorId, estadoAnterior, estadoNuevo, updated }`
- Profile: `{ id, email, role, isActive, nombre, apellido, telefono, profile: VendedorProfile }`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (controller) | Delegation to service | Mock VendedoresService, verify each method delegates correctly |
| Unit (service) | Status machine transitions (5 valid, 7+ invalid), pagination/sorting, 404 for missing vendedor, 403 for inactive vendedor on profile | Mock PrismaService, test each transition + error case |
| Integration | Full flow: list → getById → update → changeEstado, auth guard effects (401/403), self-service scoping | Mock Prisma + JWT, real NestJS TestingModule |

## Migration / Rollout

No migration required — VENDEDOR table and VendedorEstado enum already exist in the shared Prisma schema. No new columns. Remove `VendedoresModule` from `AppModule` and delete `src/vendedores/` to roll back.

## Open Questions

None — all decisions resolved by existing code patterns and contract interfaces.
