# Proposal: QR Code Module

## Intent

Vendedores need scannable QR codes so clientes can register via the app with the correct vendedor assignment. Auth already reads `QrCode.codigo` during cliente registration but misses `expires_at` validation. A dedicated module centralizes creation, listing, and deactivation of QR codes with proper expiry enforcement.

## Scope

### In Scope
- VENDEDOR self-service: POST create QR, GET list own QR codes, PATCH deactivate own QR
- SUPER_ADMIN admin: GET list QR codes by vendedor, PATCH deactivate any QR
- Generate unique 8-char alphanumeric codes, default `expires_at = now() + 7 days`
- Fix auth: check `expires_at > now()` alongside `activo` in QR lookup
- Unit + integration tests

### Out of Scope
- QR image generation (Base64 PNG) — deferred; MVP returns `codigo` as `qrCode` string
- LinkInvitacion module (related but separate — deferred)
- QR regeneration or reactivation (create new, don't revive expired)
- Audit logging for QR ops (deferred)

## Capabilities

### New Capabilities
- `qr-code-vendor`: VENDEDOR self-service — create, list, deactivate QR codes. Guarded by `VendedorGuard`.
- `qr-code-admin`: SUPER_ADMIN management — list QR codes by vendedor, deactivate any. Guarded by `RolesGuard(Role.SUPER_ADMIN)`.

### Modified Capabilities
- `auth-module` (user-auth): Add `expires_at > now()` condition in QR lookup during cliente registration.

## Approach

New `src/qr-codes/` module following established module patterns:
- **`qr-codes.module.ts`** — imports AuthModule + CommonModule, registers controllers + service
- **`qr-codes-vendor.controller.ts`** — self-service: `POST /qr-codes`, `GET /qr-codes`, `PATCH /qr-codes/:id/deactivate`
- **`qr-codes-admin.controller.ts`** — admin: `GET /admin/qr-codes?vendedorId=`, `PATCH /admin/qr-codes/:id/deactivate`
- **`qr-codes.service.ts`** — Prisma CRUD, code generation via `crypto.randomUUID().slice(0,8)`, retry on `UniqueConstraintError`
- **`dto/`** — `CreateQrCodeDto`, `QrCodeResponse`, `DeactivateQrCodeDto`
- Reuses `VendedorGuard` (from vendedores module) and `RolesGuard(Role.SUPER_ADMIN)` for admin
- Auth fix: add `expires_at > new Date()` condition in `auth.service.ts` register method
- Contracts: use `GenerarQRResponse` from `@agua/contracts` for response shape

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/qr-codes/` | New | Module, controllers, service, DTOs, tests |
| `src/auth/auth.service.ts` | Modified | Add expires_at check in QR lookup |
| `src/app.module.ts` | Modified | Import QrCodesModule |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| codigo collision on generate | Low | Retry on UniqueConstraintError (max 3 attempts) |
| Legacy `Vendedor.qr_token` unused | Medium | Leave in schema; add TODO to deprecate in future migration |
| Auth fix rejects already-expired QR codes | Low | Intentional — no active QR should be expired; consistent enforcement |

## Rollback Plan

Remove `QrCodesModule` from `AppModule`, delete `src/qr-codes/`, revert `auth.service.ts` expires_at change. No schema changes required.

## Dependencies

- `AuthModule` — JwtAuthGuard, RolesGuard, `@CurrentUser()` decorator
- `VendedorGuard` — from VendedoresModule (scopes vendor ops to own vendedor_id via auth_user_id)
- `CommonModule` — PrismaService
- `@agua/contracts` — `GenerarQRResponse` type
- QrCode table (already exists in Prisma schema)

## Success Criteria

- [ ] VENDEDOR can `POST /qr-codes` → 201 with `{ qrCode, url, expiresAt }`
- [ ] VENDEDOR can `GET /qr-codes` → paginated list of own QR codes
- [ ] VENDEDOR can `PATCH /qr-codes/:id/deactivate` → 200, `activo = false`
- [ ] SUPER_ADMIN can `GET /admin/qr-codes?vendedorId=` → filtered list
- [ ] SUPER_ADMIN can `PATCH /admin/qr-codes/:id/deactivate` → 200
- [ ] Auth rejects expired QR codes with 401 during cliente registration
- [ ] Non-VENDEDOR gets 403 on vendor endpoints
- [ ] Unit + integration tests pass
