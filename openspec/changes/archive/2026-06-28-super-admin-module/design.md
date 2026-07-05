# Design: Super Admin Module

## Technical Approach

Module already scaffolded (controller, service, DTO). Design reconciles existing code with spec requirements: update `SuperAdminDashboardResponse` contract, align dashboard response shape, fix DTO validation, remove redundant auth, add tests, wire into AppModule. Single controller — no dual pattern needed.

## Architecture Decisions

### Decision: Dashboard response shape — flat vs nested

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Flat per spec (`totalVendedores`, `clientesConVendedor`, `totalSuperAdmins`) | Spec-aligned, breaks existing nested consumers | ✅ Chosen — spec is source of truth |
| Keep existing nested (`vendedores.total`, `clientes.conVendedor`, `superAdmins`) | Already running | ❌ Rejected — no deployed consumers yet |
| Keep both | Redundant, violates SRP | ❌ Rejected |

### Decision: Contract reconciliation

**Choice**: Update `SuperAdminDashboardResponse` in `@agua/contracts` — replace `ventasMes?`, `pedidosMes?`, `promedioTicket?` with `clientesConVendedor`, `totalSuperAdmins`. No V2 interface needed since no consumer depends on the old shape.

**Rationale**: Spec fields are for MVP dashboard (aggregate entity counts). Sales/ticket metrics belong in orders-service which doesn't exist yet. Adding them later as optional fields is backward-compatible.

### Decision: Redundant auth check in `getDashboard`

**Choice**: Remove the manual role query from `getDashboard()`. The controller already has `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.SUPER_ADMIN)`.

**Rationale**: DIP violation — service depends on auth logic. If guard changes, service doesn't need to. The `userId` param stays for future audit but isn't used for the query.

### Decision: DTO validation

**Choice**: Add `@MaxLength(100)` to both fields. Rename to `UpdateSuperAdminProfileDto` (per spec convention).

**Rationale**: Matches Prisma schema `@db.VarChar(100)`. Keeps `@MinLength(2)` as guard against empty strings.

## Data Flow

```
                         ┌──────────────────┐
                         │  JwtAuthGuard     │
  Request ──→ Router ──→ │  ┌────────────┐   │ ──→ Controller
                         │  │ RolesGuard  │   │
                         │  │ SUPER_ADMIN │   │
                         └──┴────────────┘───┘
                              │
                         @CurrentUser('userId')
                              │
                              ▼
                       SuperAdminService
                              │
                    ┌─────────┼─────────┐
                    │ GET/PATCH /me      │ GET /dashboard
                    │ findUnique         │ Promise.all([
                    │ auth_user_id       │   vendedor.count(),
                    │                    │   cliente.count(),
                    │                    │   ... 4 more
                    │                    │ ])
                    └─────────┬─────────┘
                              │
                              ▼
                       PrismaService ──→ PostgreSQL
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/contracts/src/dto/super-admin.dto.ts` | Modify | Replace dashboard fields per spec — add `clientesConVendedor`, `totalSuperAdmins`; remove `ventasMes?`, `pedidosMes?`, `promedioTicket?` |
| `src/super-admin/super-admin.controller.ts` | No change | Already correct with guards and routes |
| `src/super-admin/super-admin.service.ts` | Modify | Flatten dashboard response; remove redundant `role` query; use `cartera.count` for `clientesConVendedor` per spec |
| `src/super-admin/dto/update-super-admin.dto.ts` | Modify | Add `@MaxLength(100)` to match schema; rename class to `UpdateSuperAdminProfileDto` |
| `src/super-admin/super-admin.module.ts` | No change | Already correctly configured |
| `src/super-admin/dto/dto.spec.ts` | Create | DTO validation unit tests |
| `src/super-admin/super-admin.service.spec.ts` | Create | Unit tests for getProfile, updateProfile, getDashboard |
| `src/super-admin/super-admin.controller.spec.ts` | Create | Controller delegation unit tests |
| `src/super-admin/super-admin.integration.spec.ts` | Create | Supertest integration tests — auth chain, profile CRUD, dashboard |
| `src/app.module.ts` | Modify | Import `SuperAdminModule` |

## Interfaces / Contracts

### Updated `SuperAdminDashboardResponse`

```ts
// Replaces ventasMes/pedidosMes/promedioTicket with entity-count fields
export interface SuperAdminDashboardResponse {
  totalVendedores: number;
  vendedoresActivos: number;
  vendedoresPendientes: number;
  totalClientes: number;
  clientesConVendedor: number;
  totalSuperAdmins: number;
}
```

### Updated `UpdateSuperAdminProfileDto`

```ts
export class UpdateSuperAdminProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (service) | `getProfile` — success, 404 | Mock PrismaService, return expected selects |
| Unit (service) | `updateProfile` — full/partial/empty update, 404 | Mock findUnique + update, verify `cleanUpdateInput` delegation |
| Unit (service) | `getDashboard` — all counts, zero counts | Mock 6 Prisma count() calls in parallel, verify flat shape |
| Unit (controller) | GET/PATCH /me, GET /dashboard delegation | Mock service, verify `@CurrentUser('userId')` passthrough |
| Unit (dto) | Validation — wrong type, empty, empty body | Use `validate()` from `class-validator` |
| Integration | Auth guard chain — 401 no token, 401 bad token, 403 vendedor/cliente, 200 super_admin | Supertest with real JwtService (mock PrismaService) |
| Integration | Profile CRUD — GET/PATCH success, partial update | Supertest with mocked Prisma |
| Integration | Dashboard — returns correct flat shape | Supertest with mocked counts |

Follow vendedores-module pattern: `beforeEach` compiles Nest testing module, mocks PrismaService, signs JWT tokens for role scenarios.

## Migration / Rollout

No migration required. No schema changes. Rollback: remove `SuperAdminModule` from `AppModule`, delete `src/super-admin/`.

## Open Questions

- None. All decisions resolve to the spec as source of truth.
