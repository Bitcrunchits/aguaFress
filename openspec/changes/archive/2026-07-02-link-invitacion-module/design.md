# Design: LinkInvitacionModule + QrCode auth_user_id Fix

## Technical Approach

Two-part change:

1. **Bug fix**: `QrCodesVendorController` passes `AuthUser.id` (from JWT `userId`) directly as `vendedor_id` to `QrCodesService`, but Prisma FK references `Vendedor.id`, not `AuthUser.id`. Create a shared `VendedorResolver` provider that resolves `auth_user_id → Vendedor.id` via `prisma.vendedor.findUnique({ where: { auth_user_id } })`.

2. **New module**: `LinkInvitacionModule` mirrors the existing `QrCodesModule` exactly — dual-controller architecture (vendor self-service + admin management), same CRUD pattern (create with token gen retry, list with pagination, deactivate with ownership check), but 48h expiration instead of 7 days. The `LinkInvitacion` model already exists in the Prisma schema.

## Architecture Decisions

| Decision | Option | Chosen | Rationale |
|----------|--------|--------|-----------|
| **VendedorResolver placement** | Inline in each controller vs shared utility vs injected provider | **Injectable `VendedorResolverService` in `common/prisma/`** | Both QrCodeService fix AND LinkInvitacionService need it. An injectable class follows NestJS DI patterns, is testable, and avoids duplicating the resolve logic. Placed in `common/` because it's used across modules. |
| **QrCode fix approach** | Modify service to accept `authUserId` vs resolve in controller | **Resolve in controller, pass `vendedorId` to service** | Service methods already have correct signatures — they expect `Vendedor.id`. The bug is the controller passing the wrong value. Changing the controller is lower risk and doesn't touch tested service code. |
| **Controller split** | Single vs dual | **Dual** | Same pattern as `QrCodesModule` — vendor (`link-invitacion-vendor.controller.ts`) and admin (`link-invitacion-admin.controller.ts`). Different guards, routes, and scoping. |
| **Token generation** | `crypto.randomUUID().slice(0,8)` | **Same as QrCode** | Already proven in `QrCodesService.generateCodigo()`. 8-char from UUID hex = ~4.3B space. Same 3-retry on P2002. |
| **Expiration** | 48 hours (matches `GenerarLinkResponse.expires_in`) | **Chosen** | Per proposal. Different from QrCode (7 days) because links are intentionally shorter-lived for client-facing invitation flow. |
| **Route ordering** | Same as QR | **Vendor controller first, then admin** | Vendor controller registered first so POST/GET `/link-invitacion` win before admin paths. Follows `QrCodesModule` comment. |
| **Pagination** | Reuse `ListQrCodesDto` or create new | **Reuse `ListQrCodesDto`** | Same structure (page, limit, vendedorId). Creates unnecessary duplication to re-declare. Import directly from `qr-codes/dto/` or move pagination DTO to `common/dto/` — for now, referencing the existing DTO is pragmatic. |
| **Response DTOs** | New `LinkInvitacionResponse` vs reuse `GenerarLinkResponse` | **Use `GenerarLinkResponse` from contracts for create, Prisma shape for list** | `GenerarLinkResponse` already exists at `packages/contracts/src/dto/user.dto.ts:157` with `{ linkUrl, token, expiresAt }`. List returns raw `LinkInvitacion` fields from Prisma (same as QrCode). |

## Data Flow

### Part 1: QrCode Bug Fix (existing flow, ONE change)

```
BEFORE (broken):
  QrCodesVendorController.create(@CurrentUser('userId') userId)
    → userId = AuthUser.id = "auth-user-abc"
    → QrCodesService.create("auth-user-abc")
    → Prisma: INSERT INTO QR_CODE (vendedor_id) VALUES ('auth-user-abc') ❌ FK violation

AFTER (fixed):
  QrCodesVendorController.create(@CurrentUser('userId') userId)
    → resolver.resolve(authUserId) → prisma.vendedor.findUnique({ where: { auth_user_id } })
    → returns Vendedor.id = "vendedor-xyz"
    → QrCodesService.create("vendedor-xyz")
    → Prisma: INSERT INTO QR_CODE (vendedor_id) VALUES ('vendedor-xyz') ✅
```

### Part 2: LinkInvitacion Vendor Flow

```
┌─ VENDEDOR ───────────────────────────────────────────────────────────┐
│  POST /api/link-invitacion → VendedorGuard + VendedorResolver        │
│    → LinkInvitacionVendorController                                  │
│    → resolver.resolve(authUserId) → Vendedor.id                      │
│    → LinkInvitacionService.create(vendedorId)                        │
│    → prisma.linkInvitacion.create({ token, expires_at: now+48h })    │
│    → GenerarLinkResponse { linkUrl, token, expiresAt }               │
│                                                                       │
│  GET /api/link-invitacion?page=&limit= → same guard chain            │
│    → service.list(vendedorId, dto)                                   │
│    → prisma.linkInvitacion.findMany({ where: { vendedor_id } })      │
│    → PaginatedResponse<LinkInvitacion>                               │
│                                                                       │
│  PATCH /api/link-invitacion/:id/deactivate → same guard chain        │
│    → service.deactivate(id, vendedorId)                              │
│    → updateMany({ id, vendedor_id, activo: true })                   │
│    → 404 if not found/not owned → 400 if already inactive            │
└──────────────────────────────────────────────────────────────────────┘
```

### Part 3: LinkInvitacion Admin Flow

```
┌─ SUPER_ADMIN ─────────────────────────────────────────────────────────┐
│  GET /api/admin/link-invitacion?vendedorId= → RolesGuard(SUPER_ADMIN) │
│    → LinkInvitacionAdminController → service.listByVendedor()         │
│    → findMany({ where: { vendedor_id } })                             │
│                                                                        │
│  PATCH /api/admin/link-invitacion/:id/deactivate → same chain          │
│    → service.deactivateAdmin(id)                                       │
│    → findUnique → 404 if missing → 400 if !activo                      │
│    → update({ activo: false })  (no ownership check)                   │
└────────────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/common/prisma/vendedor-resolver.service.ts` | **Create** | Injectable `VendedorResolver` with `resolve(authUserId: string): Promise<string>`. Queries `prisma.vendedor.findUnique({ where: { auth_user_id } })`, throws `NotFoundException` if missing. |
| `src/common/common.module.ts` | **Modify** | Register `VendedorResolver` as provider, add to exports |
| `src/qr-codes/qr-codes-vendor.controller.ts` | **Modify** | Inject `VendedorResolver`, call `resolver.resolve(userId)` before passing to service methods (create, list, deactivate) |
| `src/link-invitacion/link-invitacion.module.ts` | **Create** | Module: imports AuthModule + CommonModule, registers both controllers + service |
| `src/link-invitacion/link-invitacion.service.ts` | **Create** | Prisma CRUD: create (with token gen retry), list (paginated, by vendedor), deactivate (with ownership check), deactivateAdmin (no ownership check). Mirror `QrCodesService` exactly. |
| `src/link-invitacion/link-invitacion-vendor.controller.ts` | **Create** | VENDEDOR endpoints with `VendedorGuard`. Injects `VendedorResolver` for authUserId→Vendedor.id resolution. |
| `src/link-invitacion/link-invitacion-admin.controller.ts` | **Create** | SUPER_ADMIN endpoints with `RolesGuard`. Admin manages any vendedor's links — no `VendedorResolver` needed. |
| `src/link-invitacion/link-invitacion.service.spec.ts` | **Create** | Service unit tests: create, list, deactivate, token gen retry, ownership, already-inactive guard |
| `src/link-invitacion/link-invitacion-vendor.controller.spec.ts` | **Create** | Vendor controller: delegation tests with resolved Vendedor.id |
| `src/link-invitacion/link-invitacion-admin.controller.spec.ts` | **Create** | Admin controller: delegation tests |
| `src/link-invitacion/link-invitacion.integration.spec.ts` | **Create** | Full guard chain + happy paths via supertest |
| `src/app.module.ts` | **Modify** | Import `LinkInvitacionModule` |
| `src/common/prisma/vendedor-resolver.service.spec.ts` | **Create** | Unit tests for the resolver: happy path, NotFoundException |

## Interfaces / Contracts

`GenerarLinkResponse` already exists in `@agua/contracts` at `packages/contracts/src/dto/user.dto.ts:157`:

```ts
export interface GenerarLinkResponse {
  linkUrl: string;
  token: string;
  /** ISO 8601 — el link expira en 48 horas */
  expiresAt: string;
}
```

For list responses, same pattern as QrCode — return `PaginatedResponse<LinkInvitacion>` shape directly from Prisma (no new contract types needed).

The `VendedorResolver` service interface:

```ts
export class VendedorResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(authUserId: string): Promise<string> {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true },
    });
    if (!vendedor) {
      throw new NotFoundException('Vendedor not found for this user');
    }
    return vendedor.id;
  }
}
```

## VendedorResolver — Design Rationale

| Concern | Decision |
|---------|----------|
| **Why injectable, not static function?** | Follows NestJS DI. Testable via `Test.createTestingModule`. Other services/controllers can inject it without importing a util file. |
| **Why in `common/prisma/`, not `common/utils/`?** | It depends on `PrismaService`. Placing it alongside `prisma.service.ts` makes the dependency chain explicit. `utils/` contains pure functions with no DI. |
| **Why register in `CommonModule`?** | `CommonModule` is `@Global()` and already exports `PrismaService`. Adding `VendedorResolver` here means any module can inject it without additional imports. Same pattern as `PrismaService`. |
| **Why NOT in `vendedores/` module?** | The resolver is consumed by `qr-codes/` and `link-invitacion/`, not by `vendedores/`. Putting it in `vendedores/` would create a cross-module dependency. `common/` is the right shared layer. |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit — VendedorResolver | `resolve(authUserId)` returns Vendedor.id; throws 404 if not found | Mock `PrismaService`. Test happy path + missing record. |
| Unit — Service | create, list, deactivate, token gen retry, ownership check, already-inactive guard | Mock `PrismaService`. Mirror `QrCodesService` spec exactly (but 48h expiration instead of 7d). |
| Unit — Vendor Controller | Delegation to resolver + service with correct params | Mock `VendedorResolver` + `LinkInvitacionService`. Verify resolver called first with `userId`, then service called with resolved `vendedorId`. |
| Unit — Admin Controller | Delegation to service with correct params | Mock `LinkInvitacionService`. Follow `qr-codes-admin.controller.spec.ts` exactly. |
| Integration | Guard chain (401/403), happy paths, pagination, admin vs vendor scoping | `supertest` with `overrideProvider(PrismaService)`. Follow `qr-codes.integration.spec.ts` exactly. Add `overrideProvider(VendedorResolver)` to mock authUserId→vendedorId resolution. |

### Key Test Scenarios

**VendedorResolver**:
- `resolve('valid-auth-user-id')` → returns `'vendedor-id'`
- `resolve('non-existent-auth-user-id')` → throws `NotFoundException` with message

**Service — create**:
- Generates 8-char token, sets `expires_at` to ~48h
- Retries on P2002 (max 3 attempts)
- Throws `ConflictException` if all 3 attempts fail
- Does NOT retry non-P2002 errors

**Service — deactivate**:
- Ownership check: `updateMany` with both `id` and `vendedor_id`
- 404 if not found or not owned (no info leak — same message)
- 400 if already inactive

**Integration**:
- Vendor flow: POST → GET → PATCH `/deactivate`
- Admin flow: GET by vendedorId → PATCH any link
- Guard chain: 401 no token, 403 wrong role (cliente, super_admin for vendor routes; vendedor for admin routes)

## Migration / Rollout

**Order of changes**:
1. **Commit 1**: Create `VendedorResolver` + fix `QrCodesVendorController` (deploy ASAP — production bug)
2. **Commit 2**: Create `LinkInvitacionModule` + register in `app.module.ts`
3. **Commit 3**: Tests for both (or include with commits 1-2 per work-unit pattern)

**Rollback**:
- Commit 1 (QrCode fix): revert `common/prisma/vendedor-resolver.service.ts` and `qr-codes-vendor.controller.ts`. Safe — only changes the controller to resolve IDs correctly.
- Commit 2 (LinkInvitacionModule): remove `LinkInvitacionModule` import from `AppModule`, delete `src/link-invitacion/`. Schema table already exists and is unused in prod — no migration rollback needed.

**Schema**: `LinkInvitacion` model already exists at `schema.prisma:150-161`. Running `prisma db push` is a no-op for existing tables. No migration needed.
