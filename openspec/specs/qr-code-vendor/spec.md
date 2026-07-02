# QR Code Vendor Specification

## Purpose

Self-service QR code management for VENDEDOR role. Vendedores create, list, and deactivate their own QR codes so clientes can register with correct vendedor assignment. All endpoints guarded by `VendedorGuard` + `AuthGuard('jwt')`.

## Requirements

### R1: Create QR Code (VENDEDOR)

MUST generate a unique 8-char alphanumeric `codigo` and persist a `QrCode` with `expires_at = now() + 7 days`. MUST respond with `GenerarQRResponse`.

#### Scenario: Happy path

- GIVEN authenticated VENDEDOR with valid JWT
- WHEN POST /api/qr-codes
- THEN 201 with `GenerarQRResponse { qrCode, url, expiresAt }`
- AND QrCode persisted with `activo: true`, `expires_at: now() + 7 days`

#### Scenario: codigo collision

- GIVEN unique constraint violation on `codigo`
- WHEN generating random 8-char code
- THEN service retries up to 3 times with new random value

### R2: List Own QR Codes (VENDEDOR)

MUST return paginated list of own `QrCode` records (filtered by `vendedor_id`). SHALL support `page` and `limit` query params.

#### Scenario: With results

- GIVEN VENDEDOR with 5 QrCodes
- WHEN GET /api/qr-codes?page=1&limit=10
- THEN 200 with `PaginatedResponse` where `data.length === 5`

#### Scenario: No QR codes

- GIVEN VENDEDOR with no QrCodes
- WHEN GET /api/qr-codes
- THEN 200 with empty `data` array

#### Scenario: Pagination

- GIVEN VENDEDOR with 15 QrCodes
- WHEN GET /api/qr-codes?page=2&limit=10
- THEN `data.length === 5`, `totalPages === 2`, `page === 2`

### R3: Deactivate QR Code (VENDEDOR)

MUST set `activo = false` on own QrCode. SHALL return 404 if not found or not owned. SHALL return 400 if already inactive.

#### Scenario: Happy path

- GIVEN own active QrCode with `activo: true`
- WHEN PATCH /api/qr-codes/:id/deactivate
- THEN 200 with `{ activo: false }`
- AND QrCode persisted with `activo: false`

#### Scenario: Not found

- GIVEN non-existent QrCode id
- WHEN PATCH /api/qr-codes/:id/deactivate
- THEN 404

#### Scenario: Not owned

- GIVEN QrCode belonging to different VENDEDOR
- WHEN PATCH /api/qr-codes/:id/deactivate
- THEN 404 (no information leak)

#### Scenario: Already inactive

- GIVEN own QrCode with `activo: false`
- WHEN PATCH /api/qr-codes/:id/deactivate
- THEN 400 with `{ message: "QR code is already inactive" }`

### R4 (ADDED): Resolve Vendedor ID

MUST resolve `Vendedor.id` from the authenticated `AuthUser.id` before any data access. If no `Vendedor` record exists for the given `AuthUser`, SHALL throw 404.

#### Scenario: Vendedor found

- GIVEN authenticated VENDEDOR with valid JWT (`userId` = AuthUser.id)
- AND a Vendedor record exists with `auth_user_id == AuthUser.id`
- WHEN POST /api/qr-codes
- THEN service resolves `Vendedor.id` via `prisma.vendedor.findUnique({ where: { auth_user_id } })`
- AND uses the resolved `Vendedor.id` as `vendedor_id` for persistence

#### Scenario: Vendedor not found

- GIVEN authenticated VENDEDOR with valid JWT
- AND NO Vendedor record exists with `auth_user_id == AuthUser.id`
- WHEN any vendor endpoint is called
- THEN 404 with message `"Vendedor profile not found"`

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| (none) | — | POST body empty; all fields auto-generated |

## Business Rules

1. `codigo` SHALL be 8-char alphanumeric via `crypto.randomUUID().slice(0, 8)`. On `UniqueConstraintError`, retry up to 3 attempts.
2. `expires_at` SHALL default to `now() + 7 days` (ISO 8601 in responses).
3. `activo` SHALL default `true`; set to `false` on deactivation (no reactivation).
4. All operations SHALL resolve `Vendedor.id` from the authenticated `AuthUser.id` **before** any data access, using a `VendedorResolver` injectable service that queries `prisma.vendedor.findUnique({ where: { auth_user_id: authUserId } })`. The resolved `Vendedor.id` SHALL be used as `vendedor_id` for all persistence and query scoping. This is a two-step resolution: `AuthUser.id` → `Vendedor.id` (via `auth_user_id` FK) → data access.
5. Vendedor profile's `qrCode` field — NOT wired in this change. (TODO: future change should return active QrCode codigo/url.)
6. `GenerarQRResponse.qrCode` — MVP returns `codigo` string. TODO: future change should return Base64 PNG image; update contracts type accordingly.
7. `VendedorResolver` SHALL throw `NotFoundException('Vendedor profile not found')` if no Vendedor record matches the given `authUserId`. Implemented as an injectable service in `common/prisma/vendedor-resolver.service.ts` so both `QrCodesModule` and `LinkInvitacionModule` can use it.

## Roles Matrix

| Endpoint | VENDEDOR | CLIENTE | SUPER_ADMIN | Public |
|----------|----------|---------|-------------|--------|
| POST /api/qr-codes | ✅ | — | — | — |
| GET /api/qr-codes | ✅ | — | — | — |
| PATCH /api/qr-codes/:id/deactivate | ✅ | — | — | — |

## Error Codes

| Code | Condition |
|------|-----------|
| 400 | Already inactive / validation failure |
| 401 | Missing or invalid JWT |
| 403 | Not a VENDEDOR (VendedorGuard) |
| 404 | QrCode not found or not owned |
| 404 | Vendedor profile not found — when `VendedorResolver` finds no Vendedor record for the authenticated user |
