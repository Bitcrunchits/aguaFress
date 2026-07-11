# Tasks: QR Code Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~970 |
| 800-line budget risk | **Medium** (~170 over budget) |
| Chained PRs recommended | Consider splitting — see decision below |
| Suggested split | **Chain A** (~430 lines): Module + DTO + DTO spec + Service + Service spec + Auth fix + AppModule wiring |
| | **Chain B** (~540 lines): Vendor controller + spec, Admin controller + spec, Integration spec |
| Delivery strategy | `ask-always` — budget exceeded, user decides before PR |

**Decision needed before apply**: Yes — approve chained PRs or accept the single PR over budget.

---

## Phase 1: Infrastructure (Foundation)

### 1.1 Create DTO — `src/qr-codes/dto/list-qr-codes.dto.ts`

- [x] Create `ListQrCodesDto` with:
  - `page?: number` — `@Type(() => Number)`, `@IsOptional()`, `@IsInt()`, `@Min(1)`, default `1`
  - `limit?: number` — `@Type(() => Number)`, `@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Max(100)`, default `10`
  - `vendedorId?: string` — `@IsOptional()`, `@IsUUID()` (admin list only)
- **Spec**: qr-code-vendor R2 + qr-code-admin R1
- **Design**: § File Changes (dto/list-qr-codes.dto.ts) + § Architecture Decisions (Pagination)

### 1.2 Create Module — `src/qr-codes/qr-codes.module.ts`

- [x] Create `QrCodesModule` with:
  - `imports: [AuthModule, CommonModule]`
  - `controllers: [QrCodesVendorController, QrCodesAdminController]`
  - `providers: [QrCodesService, VendedorGuard]`
  - Route comment: "Vendor controller first so POST/GET /qr-codes wins before /:id routes"
- **Design**: § File Changes (src/qr-codes/qr-codes.module.ts) + § Architecture Decisions (Route ordering)

### 1.3 Wire Module — `src/app.module.ts`

- [x] Import `QrCodesModule` in `AppModule` imports array
  - Insert after `SuperAdminModule`
- **Design**: § File Changes (src/app.module.ts)

---

## Phase 2: DTO Validation Tests (TDD)

### 2.1 RED — Write `src/qr-codes/dto/qr-codes.dto.spec.ts`

- [x] Write DTO validation tests for `ListQrCodesDto`:
  - Empty object → defaults (`page=1`, `limit=10`)
  - Valid page + limit → accepted
  - Non-numeric page → validation error
  - `vendedorId` as valid UUID → accepted
  - `vendedorId` as non-UUID string → validation error
  - `limit > 100` → rejection
  - Follow `src/vendedores/dto/dto.spec.ts` pattern exactly (`plainToInstance` + `validate`)
- **Spec**: qr-code-admin R1 (vendedorId validation)
- **Design**: § Testing Strategy (DTO Validation tests)

✅ GREEN: DTO already exists from 1.1; test should pass on first run.

---

## Phase 3: Service Implementation (TDD)

### 3.1 RED — Write `src/qr-codes/qr-codes.service.spec.ts`

- [x] Write service unit tests for all methods, mocking `PrismaService`:

  **`create(vendedorId)`**:
  - Happy path: generates codigo, creates QrCode with `activo: true`, `expires_at` ~7 days, returns Prisma shape
  - Code gen retry: mocks `UniqueConstraintError` on first attempt, succeeds on second
  - Max retries exceeded: throws after 3 failures with `ConflictException` (see design § Code generation)

  **`list(vendedorId, { page, limit })`**:
  - With results: returns `{ data, pagination: { page, limit, total, totalPages } }`
  - Empty results: returns empty `data` array
  - Pagination: verifies `skip`/`take` calculations, `totalPages` rounding

  **`listByVendedor(vendedorId, { page, limit })`** (admin) — delegates to `list()` with same vendedorId

  **`deactivate(id, vendedorId?)`** (vendor context — includes ownership check):
  - Happy path: `findFirst({ id, vendedor_id })` → update `activo: false`
  - Not found (wrong id): throws `NotFoundException`
  - Not owned (wrong vendedorId): throws `NotFoundException` (no info leak)
  - Already inactive: throws `BadRequestException` with `"QR code is already inactive"`

  **`deactivateAdmin(id)`** (admin — no ownership check):
  - Happy path: `findUnique(id)` → update `activo: false`
  - Not found: throws `NotFoundException`
  - Already inactive: throws `BadRequestException`

- **Spec**: qr-code-vendor R1-R3, qr-code-admin R1-R2
- **Design**: § Data Flow (all flows) + § Architecture Decisions (Code generation)

### 3.2 GREEN — Implement `src/qr-codes/qr-codes.service.ts`

- [x] Implement `QrCodesService` with methods:
  - `private generateCodigo(): string` — `crypto.randomUUID().slice(0, 8)`
  - `async create(vendedorId: string): Promise<QrCode>`:
    - `generateCodigo()` in a loop (max 3 attempts)
    - Catch `Prisma.PrismaClientKnownRequestError` with code `P2002` → retry
    - After 3 failures → throw `ConflictException('Could not generate unique QR code')`
    - Default `expires_at`: `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`
  - `async list(vendedorId: string, { page, limit }: ListQrCodesDto)`:
    - `Promise.all([findMany({ skip, take, where: { vendedor_id } }), count({ where: { vendedor_id } })])`
    - Returns `{ data, pagination: { page, limit, total, totalPages } }`
  - `async listByVendedor(vendedorId: string, dto: ListQrCodesDto)` — delegates to `list()`
  - `async deactivate(id: string, vendedorId: string)`:
    - `findFirst({ where: { id, vendedor_id } })` → 404 if null
    - Check `activo` → 400 if already false
    - `update({ where: { id }, data: { activo: false } })`
  - `async deactivateAdmin(id: string)`:
    - `findUnique({ where: { id } })` → 404 if null
    - Check `activo` → 400 if already false
    - `update({ where: { id }, data: { activo: false } })`
  - Follow `VendedoresService` mock pattern exactly (mock `PrismaService` directly)
- **Spec**: qr-code-vendor R1-R3, qr-code-admin R1-R2
- **Design**: § Data Flow + § Architecture Decisions (Code generation, Pagination)

---

## Phase 4: Vendor Controller (TDD)

### 4.1 RED — Write `src/qr-codes/qr-codes-vendor.controller.spec.ts`

- [x] Write controller delegation tests:
  - `POST /qr-codes` → calls `service.create(userId)` con `@CurrentUser('userId')`
  - `GET /qr-codes` → calls `service.list(userId, dto)` con query params
  - `PATCH /qr-codes/:id/deactivate` → calls `service.deactivate(id, userId)` con param + userId
  - Mock `QrCodesService`, follow `vendedor-profile.controller.spec.ts` delegation pattern
- **Spec**: qr-code-vendor R1-R3
- **Design**: § Data Flow (vendor flow) + § File Changes (controller)

### 4.2 GREEN — Implement `src/qr-codes/qr-codes-vendor.controller.ts`

- [x] Implement `QrCodesVendorController`:
  - `@Controller('qr-codes')`, no class-level guard (VendedorGuard at method level per design? Actually design says "Guarded by VendedorGuard" — need AuthGuard too)
  - Class-level: `@UseGuards(AuthGuard('jwt'), VendedorGuard)`
  - `POST @Post()` — body empty (no DTO), calls `service.create(userId)` → maps result to `GenerarQRResponse { qrCode: codigo, url, expiresAt }`
  - `GET @Get()` — `@Query() dto: ListQrCodesDto`, calls `service.list(userId, dto)` → returns paginated response
  - `PATCH @Patch(':id/deactivate')` — calls `service.deactivate(id, userId)`
  - All endpoints use `@CurrentUser('userId') userId: string`
  - URL format: `"https://agua.app/invitar/{codigo}"` (from design § Interfaces)
- **Spec**: qr-code-vendor R1-R3
- **Design**: § Data Flow (vendor flow) + § Route ordering

---

## Phase 5: Admin Controller (TDD)

### 5.1 RED — Write `src/qr-codes/qr-codes-admin.controller.spec.ts`

- [ ] Write controller delegation tests:
  - `GET /admin/qr-codes?vendedorId=` → calls `service.listByVendedor(vendedorId, dto)` with query
  - `PATCH /admin/qr-codes/:id/deactivate` → calls `service.deactivateAdmin(id)` with param
  - Mock `QrCodesService`, delegation pattern
- **Spec**: qr-code-admin R1-R2
- **Design**: § Data Flow (admin flow) + § File Changes (controller)

### 5.2 GREEN — Implement `src/qr-codes/qr-codes-admin.controller.ts`

- [ ] Implement `QrCodesAdminController`:
  - `@Controller('admin/qr-codes')`
  - Class-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`, `@Roles(UserRole.SUPER_ADMIN)`
  - `GET @Get()` — `@Query() dto: ListQrCodesDto`, requires `vendedorId` (validated by DTO), calls `service.listByVendedor(dto.vendedorId, dto)`
  - `PATCH @Patch(':id/deactivate')` — calls `service.deactivateAdmin(id)`
- **Spec**: qr-code-admin R1-R2
- **Design**: § Data Flow (admin flow) + § Route ordering

---

## Phase 6: Auth Fix — `expires_at` Enforcement (TDD)

### 6.1 RED — Update `src/auth/auth.service.spec.ts`

- [ ] Update existing test at `auth.service.spec.ts`:
  - **Change mock**: replace `mockTx.qrCode.findUnique` with `mockTx.qrCode.findFirst` in the `mockTx` object
  - **Update happy path test**: the mock for `findFirst` should return `{ codigo, activo: true, expires_at: futureDate, vendedor_id }` — but since `findFirst` already filters for `activo: true`, the test assertion for the `if (qr?.activo)` dance no longer applies. Update the assertion to `expect(mockTx.qrCode.findFirst).toHaveBeenCalledWith(...)` with `expires_at: { gt: expect.any(Date) }`
  - **Add new test**: "lanza UnauthorizedException si qrToken tiene expires_at vencido" — mock `findFirst` returns `null` (because Prisma filters expired), assert 401 with `"Invalid or expired QR token"`
  - **Keep existing "qrToken inválido o inactivo" test**: mock `findFirst` returns `null`, assert 401
  - Follow existing test structure (the `mockTx` pattern in `$transaction` callback)
- **Spec**: auth-module R1 (BR4 — expires_at delta)
- **Design**: § Auth Fix + § Data Flow (auth fix flow)

### 6.2 GREEN — Fix `src/auth/auth.service.ts` lines 38-39

- [ ] Replace lines 38-39:
  ```ts
  // BEFORE:
  const qr = await tx.qrCode.findUnique({ where: { codigo: dto.qrToken } });
  if (qr?.activo) vendedorId = qr.vendedor_id;

  // AFTER:
  const qr = await tx.qrCode.findFirst({
    where: { codigo: dto.qrToken, activo: true, expires_at: { gt: new Date() } },
  });
  if (qr) vendedorId = qr.vendedor_id;
  ```
  - The `activo` check moves INTO the `where` clause
  - `expires_at: { gt: new Date() }` ensures expired QR codes are rejected atomically
  - No race window (single query, no manual filter)
- **Spec**: auth-module R1 (BR4)
- **Design**: § Auth Fix + § Architecture Decisions (findFirst)

### 6.3 RED — Update `src/auth/auth.integration.spec.ts`

- [ ] Update auth integration test:
  - Change `mockTx.qrCode.findUnique` → `mockTx.qrCode.findFirst` in the `mockTx` object
  - Update mock return in "Cliente full flow" to include `expires_at` in the future
  - Update assertion to check `findFirst` with `expires_at` filter
  - Verify expired QR → register throws 401 (add test case in Scenario 3)
- **Spec**: auth-module R1 (BR4)
- **Design**: § Testing Strategy (Auth fix)

---

## Phase 7: Integration Tests (TDD)

### 7.1 RED — Write `src/qr-codes/qr-codes.integration.spec.ts`

- [ ] Write integration tests via `supertest` with `overrideProvider(PrismaService)`:

  **Setup** (follow `vendedores.integration.spec.ts` exactly):
  - `beforeAll`: set `JWT_SECRET` and `JWT_REFRESH_SECRET`
  - `beforeEach`: create `mockPrisma`, compile `QrCodesModule` (or full `AppModule`?) testing module with `overrideProvider(PrismaService)`
  - Mock users: `superAdmin`, `vendedor`, `cliente`
  - Mock QR records: active, inactive, expired, belonging to different vendedores

  **Guard chain tests**:
  - No token → 401 on vendor endpoints
  - Invalid token → 401 on vendor endpoints
  - CLIENTE token → 403 on vendor endpoints (VendedorGuard)
  - VENDEDOR token → 403 on admin endpoints (RolesGuard)
  - CLIENTE token → 403 on admin endpoints

  **Vendor flow**:
  - POST /api/qr-codes → 201 with `GenerarQRResponse` shape
  - GET /api/qr-codes → 200 with paginated own QR codes
  - PATCH /api/qr-codes/:id/deactivate → 200 own active QR
  - PATCH /api/qr-codes/:id/deactivate → 404 for other vendedor's QR
  - PATCH /api/qr-codes/:id/deactivate → 400 for already inactive

  **Admin flow**:
  - GET /api/admin/qr-codes?vendedorId= → 200 with filtered list
  - GET /api/admin/qr-codes (no vendedorId) → 400 validation error
  - PATCH /api/admin/qr-codes/:id/deactivate → 200 any vendedor's QR
  - PATCH /api/admin/qr-codes/:id/deactivate → 400 for already inactive
  - PATCH /api/admin/qr-codes/:id/deactivate → 404 for non-existent

- **Spec**: qr-code-vendor R1-R3, qr-code-admin R1-R2
- **Design**: § Testing Strategy (Integration) + § Data Flow

### 7.2 GREEN — Run full test suite, fix any issues

- [ ] Run `npm test` from `MicroServices/usuario-service/`
- [ ] Fix any failing tests
- [ ] Confirm no regressions in existing tests
- [ ] Document any gotchas in comments

---

## Phase 8: Build Verification

### 8.1 Final verification

- [ ] Run `npm test` — all tests pass (existing + new)
- [ ] Verify TypeScript compilation (`npx tsc --noEmit` or build script)
- [ ] Check for any lint issues
- [ ] Commit all changes as conventional commits per work unit

---

## Task Summary

| Phase | Tasks | Files | TDD |
|-------|-------|-------|-----|
| 1 — Infrastructure | 1.1 → 1.3 | 3 created, 1 modified | No (boilerplate) |
| 2 — DTO Tests | 2.1 | 1 created | Yes |
| 3 — Service | 3.1 → 3.2 | 2 created | Yes |
| 4 — Vendor Controller | 4.1 → 4.2 | 2 created | Yes |
| 5 — Admin Controller | 5.1 → 5.2 | 2 created | Yes |
| 6 — Auth Fix | 6.1 → 6.3 | 2 modified | Yes |
| 7 — Integration | 7.1 → 7.2 | 1 created | Yes |
| 8 — Verification | 8.1 | — | — |
| **Total** | **15 tasks** | **10 created, 4 modified** | |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Service spec too large (≥350 lines) | Split into `describe` blocks per method during impl |
| Code gen retry flaky in tests | Use `jest.spyOn(crypto, 'randomUUID')` with controlled return values |
| Existing auth tests break after `findUnique` → `findFirst` | Update mock object AND all mockResolvedValue calls in the same commit |
| Integration test setup complex | Follow `vendedores.integration.spec.ts` pattern exactly — copy the structure |
