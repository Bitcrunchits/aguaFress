# QR Code Admin Specification

## Purpose

SUPER_ADMIN management of QR codes across all vendedores. List QR codes by vendedor and deactivate any QR code regardless of ownership. All endpoints guarded by `RolesGuard(Role.SUPER_ADMIN)` + `AuthGuard('jwt')`.

## Requirements

### R1: List QR Codes by Vendedor (SUPER_ADMIN)

MUST return paginated `QrCode` records filtered by `vendedorId` (required query param). SHALL support `page` and `limit`.

#### Scenario: With results

- GIVEN SUPER_ADMIN JWT and vendedor `v1` has 3 QrCodes
- WHEN GET /api/admin/qr-codes?vendedorId=v1&page=1&limit=10
- THEN 200 with `PaginatedResponse` where `data.length === 3`

#### Scenario: Missing vendedorId

- GIVEN SUPER_ADMIN JWT
- WHEN GET /api/admin/qr-codes (no `vendedorId` param)
- THEN 400 with validation error

#### Scenario: Vendedor has no QR codes

- GIVEN SUPER_ADMIN JWT and vendedor `v2` has 0 QrCodes
- WHEN GET /api/admin/qr-codes?vendedorId=v2
- THEN 200 with empty `data` array

### R2: Deactivate Any QR (SUPER_ADMIN)

MUST set `activo = false` on any QrCode regardless of vendedor. SHALL return 404 if not found. SHALL return 400 if already inactive.

#### Scenario: Happy path

- GIVEN active QrCode `q1` belonging to any vendedor
- WHEN PATCH /api/admin/qr-codes/q1/deactivate
- THEN 200 with `{ activo: false }`

#### Scenario: Not found

- GIVEN non-existent QrCode id
- WHEN PATCH /api/admin/qr-codes/:id/deactivate
- THEN 404

#### Scenario: Already inactive

- GIVEN QrCode with `activo: false`
- WHEN PATCH /api/admin/qr-codes/:id/deactivate
- THEN 400 with `{ message: "QR code is already inactive" }`

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| (none) | — | Query param `vendedorId` required for list; path param `id` as UUID for deactivate |

## Business Rules

1. `vendedorId` query param in list endpoint is REQUIRED — no "list all" for MVP.
2. Admin deactivation bypasses vendedor ownership check — SUPER_ADMIN can deactivate any QR.
3. Admin SHALL NOT create or edit QR codes — creation is VENDEDOR self-service only.
4. Same `activo: false` idempotency guard as vendor endpoint (400 if already inactive).

## Roles Matrix

| Endpoint | SUPER_ADMIN | VENDEDOR | CLIENTE | Public |
|----------|-------------|----------|---------|--------|
| GET /api/admin/qr-codes?vendedorId= | ✅ | — | — | — |
| PATCH /api/admin/qr-codes/:id/deactivate | ✅ | — | — | — |

## Error Codes

| Code | Condition |
|------|-----------|
| 400 | Missing vendedorId / already inactive |
| 401 | Missing or invalid JWT |
| 403 | Not SUPER_ADMIN (RolesGuard) |
| 404 | QrCode not found |
