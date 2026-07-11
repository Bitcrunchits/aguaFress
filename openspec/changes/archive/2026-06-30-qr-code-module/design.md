# Design: QR Code Module

## Technical Approach

New `src/qr-codes/` module following established NestJS patterns from `vendedores/`. Dual-controller architecture mirrors `VendedorProfileController` + `VendedoresController` — one for vendor self-service (guarded by `VendedorGuard`), one for admin management (guarded by `RolesGuard(Role.SUPER_ADMIN)`). Auth fix: single change in `auth.service.ts` register method replacing `findUnique` + manual `activo` check with `findFirst` that includes `expires_at` filter.

## Architecture Decisions

| Decision | Option | Chosen | Rationale |
|----------|--------|--------|-----------|
| Controller split | Single vs dual | **Dual** | Follows existing `vendedores/` pattern — vendor (`qr-codes-vendor.controller.ts`) and admin (`qr-codes-admin.controller.ts`) in separate files. Different guards, routes, and scoping. |
| Code generation | `crypto.randomUUID().slice(0,8)` | **Chosen** | Lightweight, no deps. 8-char from UUID hex = ~4.3B space. Retry on `UniqueConstraintError` (max 3 attempts). |
| Auth fix | `findUnique` + manual filter vs `findFirst` | **`findFirst`** | Atomic query with `activo: true` + `expires_at: { gt: new Date() }`. No race window. Single change. |
| Route ordering | Dynamic before static vs static first | **Static first** | Follows `VendedoresModule` comment: profile controller registered first so `/me` wins over `/:id`. POST `/qr-codes` before PATCH `/:id/deactivate`. |
| Pagination library | Custom vs nest-paginator | **Custom** | Existing `Promise.all([findMany, count])` pattern repeated across all services. No need for new abstraction. |
| Response DTOs | new `QrCodeResponse` vs reuse `GenerarQRResponse` | **Service returns Prisma shape, controller maps** | `GenerarQRResponse` is for create response. List returns `QrCode` fields. Maps at controller layer. |

## Data Flow

```
┌─ VENDEDOR ───────────────────────────────────────────────────────┐
│  POST /api/qr-codes → VendedorGuard → QrCodesVendorController    │
│    → QrCodesService.create(vendedorId) → Prisma.qrCode.create    │
│    → GenerarQRResponse { qrCode: codigo, url, expiresAt }        │
│                                                                   │
│  GET /api/qr-codes?page=&limit= → same chain → service.list()    │
│    → Prisma.qrCode.findMany({ where: { vendedor_id } })          │
│    → PaginatedResponse<QrCode>                                   │
│                                                                   │
│  PATCH /api/qr-codes/:id/deactivate → same chain → deactivate()  │
│    → findFirst({ id, vendedor_id }) → 404 if not owned           │
│    → 400 if !activo → update({ activo: false })                  │
└──────────────────────────────────────────────────────────────────┘

┌─ SUPER_ADMIN ────────────────────────────────────────────────────┐
│  GET /api/admin/qr-codes?vendedorId= → RolesGuard(SUPER_ADMIN)   │
│    → QrCodesAdminController → service.listByVendedor()           │
│    → findMany({ where: { vendedor_id } })                        │
│                                                                   │
│  PATCH /api/admin/qr-codes/:id/deactivate → same chain           │
│    → findUnique(id) → 404 if missing → 400 if !activo            │
│    → update({ activo: false })  (no ownership check)             │
└──────────────────────────────────────────────────────────────────┘

┌─ AUTH FIX (register) ────────────────────────────────────────────┐
│  tx.qrCode.findFirst({                                           │
│    where: { codigo: dto.qrToken, activo: true,                   │
│             expires_at: { gt: new Date() } }                     │
│  }) → if (qr) vendedorId = qr.vendedor_id                        │
└──────────────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/qr-codes/qr-codes.module.ts` | **Create** | Module: imports AuthModule + CommonModule, registers both controllers + service + VendedorGuard |
| `src/qr-codes/qr-codes.service.ts` | **Create** | Prisma CRUD: create (with code gen retry), list (paginated, by vendedor), deactivate |
| `src/qr-codes/qr-codes-vendor.controller.ts` | **Create** | VENDEDOR endpoints: POST `/qr-codes`, GET `/qr-codes`, PATCH `/:id/deactivate` |
| `src/qr-codes/qr-codes-admin.controller.ts` | **Create** | SUPER_ADMIN endpoints: GET `/admin/qr-codes`, PATCH `/admin/qr-codes/:id/deactivate` |
| `src/qr-codes/dto/list-qr-codes.dto.ts` | **Create** | Paginated list DTO: page, limit, optional vendedorId (admin only) |
| `src/qr-codes/dto/qr-codes.dto.spec.ts` | **Create** | DTO validation tests |
| `src/qr-codes/qr-codes.service.spec.ts` | **Create** | Service unit tests: create, list, deactivate, code gen retry, ownership |
| `src/qr-codes/qr-codes-vendor.controller.spec.ts` | **Create** | Vendor controller: delegation tests |
| `src/qr-codes/qr-codes-admin.controller.spec.ts` | **Create** | Admin controller: delegation tests |
| `src/qr-codes/qr-codes.integration.spec.ts` | **Create** | Full guard chain + happy paths via supertest |
| `src/auth/auth.service.ts` | **Modify** | Lines 38-39: replace `findUnique` + `qr?.activo` with `findFirst` including `expires_at: { gt: new Date() }` |
| `src/app.module.ts` | **Modify** | Import `QrCodesModule` |

## Interfaces / Contracts

`GenerarQRResponse` from `@agua/contracts` (already exists at `packages/contracts/src/dto/user.dto.ts:148`):

```ts
export interface GenerarQRResponse {
  qrCode: string;    // MVP: returns codigo (TODO: Base64 PNG in future)
  url: string;       // e.g. "https://agua.app/invitar/{codigo}"
  expiresAt: string; // ISO 8601, now() + 7 days
}
```

List response uses existing `PaginatedResponse<QrCode>` pattern — no new contract types needed. `QrCode` shape returned directly from Prisma.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit — Service | create, list, deactivate, code gen retry, ownership check, already-inactive guard | Mock `PrismaService`. Follow `vendedores.service.spec.ts` exactly. Test each error path (404, 400). |
| Unit — Controller | Delegation to service with correct params | Mock service. Follow `vendedor-profile.controller.spec.ts` exactly. |
| Unit — DTO | Validation rules for `ListQrCodesDto` | `plainToInstance` + `validate`. Follow `dto.spec.ts` pattern. |
| Integration | Guard chain (401/403), happy paths, pagination, admin vs vendor scoping | `supertest` with `overrideProvider(PrismaService)`. Follow `vendedores.integration.spec.ts` exactly. |
| Auth fix | Expired QR returns 401 | Covered in existing auth integration tests — extend to assert `expires_at` enforcement. |

## Migration / Rollout

No migration required — `QrCode` table already exists in Prisma schema (model at `schema.prisma:137`). Rollback: remove `QrCodesModule` from `AppModule`, delete `src/qr-codes/`, revert `auth.service.ts` lines 38-39.
