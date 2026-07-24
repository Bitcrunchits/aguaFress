# SDD Tasks: link-invitacion-module

## Overview

Two-part change:

1. **QrCode Bug Fix**: `QrCodesVendorController` passes `AuthUser.id` (JWT `userId`) as `vendedor_id` to Prisma — FK violation since `Vendedor.id` ≠ `AuthUser.id`. Fix by creating a `VendedorResolver` injectable and resolving `Vendedor.id` in the controller.
2. **New `LinkInvitacionModule`**: Vendedores generate 48h time-limited invitation tokens. Mirrors `QrCodesModule` exactly. Dual-controller pattern (vendor self-service + admin management). Model already exists in Prisma schema — no migrations needed.

## Task List

### Part 1: QrCode Bug Fix (foundational)

| ID | Task | Status | Effort | Dependencies | Files |
|----|------|--------|--------|-------------|-------|
| 1.1 | **Create `VendedorResolver`** | [x] | ~30 lines | None | `src/common/prisma/vendedor-resolver.service.ts` |
| 1.2 | **Register `VendedorResolver` in `CommonModule`** | [x] | ~3 lines | 1.1 | `src/common/common.module.ts` |
| 1.3 | **Fix `QrCodesVendorController`** | [x] | ~10 lines changed | 1.1, 1.2 | `src/qr-codes/qr-codes-vendor.controller.ts` |

**Detailed:**

#### 1.1 — Create VendedorResolver

- File: `src/common/prisma/vendedor-resolver.service.ts`
- Injectable class that depends on `PrismaService`
- Method `resolve(authUserId: string): Promise<string>`:
  - Queries `prisma.vendedor.findUnique({ where: { auth_user_id: authUserId }, select: { id: true } })`
  - Returns `vendedor.id` if found
  - Throws `NotFoundException('Vendedor profile not found')` if no record
- Inject `PrismaService` via constructor

#### 1.2 — Register in CommonModule

- Edit `src/common/common.module.ts`:
  - Import `VendedorResolver`
  - Add to `providers: [...]`
  - Add to `exports: [...]` so consuming modules can inject it

#### 1.3 — Fix QrCodesVendorController

- Inject `VendedorResolver`
- Before each call to `QrCodesService`, call `resolver.resolve(userId)` and pass the resolved `Vendedor.id`:
  - `create()`: `const vendedorId = await this.resolver.resolve(userId);` then `this.qrCodesService.create(vendedorId)`
  - `list()`: same pattern
  - `deactivate()`: same pattern
- No changes to `QrCodesService` — service signatures already expect `Vendedor.id`

---

### Part 2: LinkInvitacionModule

| ID | Task | Effort | Dependencies | Files |
|----|------|--------|-------------|-------|
| 2.1 | **Create `ListLinkInvitacionDto`** | [x] | ~25 lines | None | `src/link-invitacion/dto/list-link-invitacion.dto.ts` |
| 2.2 | **Create `LinkInvitacionService`** | [x] | ~110 lines | None | `src/link-invitacion/link-invitacion.service.ts` |
| 2.3 | **Create `LinkInvitacionVendorController`** | [x] | ~55 lines | 1.1, 1.2, 2.1, 2.2 | `src/link-invitacion/link-invitacion-vendor.controller.ts` |
| 2.4 | **Create `LinkInvitacionAdminController`** | [x] | ~40 lines | 2.1, 2.2 | `src/link-invitacion/link-invitacion-admin.controller.ts` |
| 2.5 | **Create `LinkInvitacionModule`** | [x] | ~15 lines | 2.2, 2.3, 2.4 | `src/link-invitacion/link-invitacion.module.ts` |
| 2.6 | **Register `LinkInvitacionModule` in `AppModule`** | [x] | ~2 lines | 2.5 | `src/app.module.ts` |

**Detailed:**

#### 2.1 — Create ListLinkInvitacionDto

- File: `src/link-invitacion/dto/list-link-invitacion.dto.ts`
- Same structure as `ListQrCodesDto`:
  - `page?: number` — `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)`, default `1`
  - `limit?: number` — `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)`, `@Max(100)`, default `10`
  - `vendedorId?: string` — `@IsOptional()`, `@IsUUID()`
- Used by both vendor and admin controllers

#### 2.2 — Create LinkInvitacionService

- File: `src/link-invitacion/link-invitacion.service.ts`
- Mirror `QrCodesService` exactly:
  - **`create(vendedorId: string)`**: Generate token via `crypto.randomUUID().slice(0, 8)`, 3-retry on P2002, 48h expiration instead of 7 days. Returns Prisma `LinkInvitacion` record.
  - **`list(vendedorId: string, dto: ListLinkInvitacionDto)`**: Paginated `findMany` with `{ vendedor_id: vendedorId }`, ordered by `created_at: 'desc'`. Returns `PaginatedResponse<LinkInvitacion>`.
  - **`listByVendedor(vendedorId: string, dto: ListLinkInvitacionDto)`**: Delegates to `list()` (admin reuse).
  - **`deactivate(id: string, vendedorId: string)`**: `updateMany` with ownership check. 404 if not found/not owned, 400 if already inactive.
  - **`deactivateAdmin(id: string)`**: `updateMany` without ownership check. 404 if not found, 400 if already inactive.
- Select fields for list: `id`, `token`, `activo`, `expires_at`, `created_at`

#### 2.3 — Create LinkInvitacionVendorController

- File: `src/link-invitacion/link-invitacion-vendor.controller.ts`
- Route: `@Controller('link-invitacion')`
- Guards: `@UseGuards(AuthGuard('jwt'), VendedorGuard)` — same as QrCodesVendorController
- Injects: `LinkInvitacionService` + `VendedorResolver`
- Endpoints:
  - `POST /` — resolve `vendedorId`, call `service.create(vendedorId)`, return `GenerarLinkResponse { linkUrl, token, expiresAt }` from `@agua/contracts`
  - `GET /` — resolve `vendedorId`, call `service.list(vendedorId, dto)`, return paginated result
  - `PATCH /:id/deactivate` — resolve `vendedorId`, call `service.deactivate(id, vendedorId)`

#### 2.4 — Create LinkInvitacionAdminController

- File: `src/link-invitacion/link-invitacion-admin.controller.ts`
- Route: `@Controller('admin/link-invitacion')`
- Guards: `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(UserRole.SUPER_ADMIN)`
- Injects: `LinkInvitacionService` (no resolver — admin works with explicit `vendedorId`)
- Endpoints:
  - `GET /` — validate `vendedorId` required (400 if missing), call `service.listByVendedor(dto.vendedorId, dto)`
  - `PATCH /:id/deactivate` — call `service.deactivateAdmin(id)`

#### 2.5 — Create LinkInvitacionModule

- File: `src/link-invitacion/link-invitacion.module.ts`
- Import: `AuthModule`, `CommonModule`
- Controllers: `[LinkInvitacionVendorController, LinkInvitacionAdminController]` (vendor first for route priority)
- Providers: `[LinkInvitacionService, VendedorGuard]`

#### 2.6 — Register in AppModule

- Edit `src/app.module.ts`:
  - Add `import { LinkInvitacionModule } from './link-invitacion/link-invitacion.module';`
  - Add `LinkInvitacionModule` to `imports: [...]`

---

### Part 3: Tests

| ID | Task | Status | Effort | Dependencies | Files |
|----|------|--------|--------|-------------|-------|
| 3.1 | **Unit tests: VendedorResolver** | [x] | ~50 lines | 1.1 | `src/common/prisma/vendedor-resolver.service.spec.ts` |
| 3.2 | **Unit tests: LinkInvitacionService** | [x] | ~350 lines | 2.2 | `src/link-invitacion/link-invitacion.service.spec.ts` |
| 3.3 | **Unit tests: LinkInvitacionVendorController** | [x] | ~100 lines | 2.3 | `src/link-invitacion/link-invitacion-vendor.controller.spec.ts` |
| 3.4 | **Unit tests: LinkInvitacionAdminController** | [x] | ~80 lines | 2.4 | `src/link-invitacion/link-invitacion-admin.controller.spec.ts` |
| 3.5 | **DTO validation spec** | [x] | ~60 lines | 2.1 | `src/link-invitacion/dto/link-invitacion.dto.spec.ts` |
| 3.6 | **Integration tests** | [x] | ~330 lines | 2.5, 3.1–3.5 | `src/link-invitacion/link-invitacion.integration.spec.ts` |

**Detailed:**

#### 3.1 — VendedorResolver spec

- Mock `PrismaService.vendedor.findUnique`
- Test: `resolve('valid-auth-user-id')` returns `'vendedor-id'`
- Test: `resolve('non-existent-auth-user-id')` throws `NotFoundException` with message `'Vendedor profile not found'`
- Test: `resolve` selects only `{ id: true }` (minimal query)

#### 3.2 — LinkInvitacionService spec

- Mirror `QrCodesService.spec.ts` pattern:
  - **create**: generates 8-char token, sets `expires_at` ~48h (tolerance test), retries on P2002 (2 attempts succeed, all 3 fail), non-P2002 errors propagate, `ConflictException` with clear message
  - **list**: paginated with defaults, empty array, custom page/limit, totalPages calculation
  - **listByVendedor**: delegates to `list()` with same args
  - **deactivate (vendor)**: ownership check via `updateMany`, 404 if not found/not owned (no info leak), 400 if already inactive
  - **deactivateAdmin**: no ownership check, 404 if not found, 400 if already inactive

#### 3.3 — LinkInvitacionVendorController spec

- Mock `VendedorResolver` + `LinkInvitacionService`
- Test: `POST /` calls `resolver.resolve(userId)` then `service.create(resolvedId)`, returns `GenerarLinkResponse`
- Test: `GET /` calls `resolver.resolve(userId)` then `service.list(resolvedId, dto)`
- Test: `PATCH /:id/deactivate` calls `resolver.resolve(userId)` then `service.deactivate(id, resolvedId)`

#### 3.4 — LinkInvitacionAdminController spec

- Mock `LinkInvitacionService`
- Test: `GET /` delegates to `service.listByVendedor(vendedorId, dto)`
- Test: `PATCH /:id/deactivate` delegates to `service.deactivateAdmin(id)`
- Test: `GET /` without `vendedorId` throws `BadRequestException`

#### 3.5 — DTO validation spec

- Mirror `QrCodesDto.spec.ts` exactly:
  - Default values (page=1, limit=10)
  - Valid custom values
  - Rejects non-numeric page
  - Accepts valid UUID vendedorId
  - Rejects invalid UUID vendedorId
  - Rejects limit > 100

#### 3.6 — Integration tests

- Mirror `QrCodes.integration.spec.ts` exactly, adapted for link-invitacion:
  - **Vendor flow**: POST → GET → PATCH `/deactivate` (happy path)
  - **Admin flow**: GET by vendedorId → PATCH any link
  - **Missing vendedorId**: admin GET without param → 400
  - **Auth guards**: 401 no token, 401 invalid token, 403 cliente on vendor, 403 admin on vendor, 401 no token admin, 403 vendedor on admin, 403 cliente on admin
  - **Error cases**: 404 deactivate non-existent, 400 deactivate already inactive
  - Override `PrismaService` mock with `linkInvitacion` methods
  - Add `overrideProvider(VendedorResolver)` mock returning fixed `vendedor-id`

---

## Workload Forecast

| Metric | Value |
|--------|-------|
| **Total estimated LOC** | ~1,250 |
| **Total tasks** | 12 |
| **Part 1 (bug fix)** | ~45 LOC source + ~50 LOC tests |
| **Part 2 (module)** | ~250 LOC source |
| **Part 3 (tests)** | ~920 LOC |
| **Risk level** | **High** |
| **Decision needed before apply** | **Yes** |
| **Chained PRs recommended** | **Yes** |
| **Chain strategy** | pending |

### Recommended Chain Split

**PR 1 — QrCode Bug Fix** (~95 LOC)
- Tasks: 1.1, 1.2, 1.3, 3.1
- Files: VendedorResolver + CommonModule + QrCodesVendorController fix + Resolver tests
- Why: Standalone fix — deploy ASAP since bug is active in development

**PR 2 — LinkInvitacionModule** (~1,155 LOC)
- Tasks: 2.1–2.6, 3.2–3.6
- Files: Service, controllers, DTO, module, app.module registration + all tests
- Why: New feature — can be reviewed independently of the bug fix

### Key Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| QrCode FK bug in prod with real UUIDs | High (present) | Fix as Commit 1, deploy ASAP |
| Large test file sizes (~330 LOC integration) | Medium | Mirror QrCode integration pattern exactly — minimal cognitive load |
| VendedorResolver adds DB query per request | Low | Single `findUnique` by indexed field — negligible latency |

## Effort Summary

| Task | Est. LOC | Est. Time | Complexity |
|------|----------|-----------|------------|
| 1.1 VendedorResolver | ~30 | 15 min | Low |
| 1.2 Register in CommonModule | ~3 | 5 min | Low |
| 1.3 Fix QrCodesVendorController | ~10 | 10 min | Low |
| 2.1 ListLinkInvitacionDto | ~25 | 10 min | Low |
| 2.2 LinkInvitacionService | ~110 | 30 min | Medium |
| 2.3 LinkInvitacionVendorController | ~55 | 20 min | Low |
| 2.4 LinkInvitacionAdminController | ~40 | 15 min | Low |
| 2.5 LinkInvitacionModule | ~15 | 10 min | Low |
| 2.6 Register in AppModule | ~2 | 5 min | Low |
| 3.1 VendedorResolver spec | ~50 | 15 min | Low |
| 3.2 LinkInvitacionService spec | ~350 | 45 min | Medium |
| 3.3 LinkInvitacionVendorController spec | ~100 | 20 min | Low |
| 3.4 LinkInvitacionAdminController spec | ~80 | 15 min | Low |
| 3.5 DTO spec | ~60 | 10 min | Low |
| 3.6 Integration spec | ~330 | 45 min | Medium |
| **Total** | **~1,250** | **~4.5 hours** | |

## Implementation Order

1. **PR 1**: 1.1 → 1.2 → 1.3 → 3.1
2. **PR 2**: 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6

Within each PR, implement source files before test files for each task (tests verify the code that exists). However, per work-unit-commits skill, tests belong with the behavior — commit unit tests with their source in the same commit where practical.
