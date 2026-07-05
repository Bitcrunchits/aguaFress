# Link Invitación Vendor Specification

## Purpose

Self-service invitation link management for VENDEDOR role. Vendedores generate, list, and deactivate their own time-limited invitation tokens (48 hours) so clientes can register with correct vendedor assignment. Follows the same pattern as QR Code Vendor (`openspec/specs/qr-code-vendor/spec.md`). All endpoints guarded by `VendedorGuard` + `AuthGuard('jwt')`.

## Requirements

### R1: Generate Invitation Link (VENDEDOR)

MUST generate a unique 8-char alphanumeric `token` and persist a `LinkInvitacion` with `expires_at = now() + 48 hours`. MUST respond with `GenerarLinkResponse` (from `@agua/contracts`).

MUST resolve `Vendedor.id` from `AuthUser.id` using the same `resolveVendedorId()` helper (shared fix from qr-code-vendor change) before persistence.

#### Scenario: Happy path

- GIVEN authenticated VENDEDOR with valid JWT
- WHEN POST /api/link-invitacion
- THEN 201 with `GenerarLinkResponse { linkUrl, token, expiresAt }`
- AND LinkInvitacion persisted with `activo: true`, `expires_at: now() + 48 hours`

#### Scenario: Token collision

- GIVEN unique constraint violation on `token`
- WHEN generating random 8-char token
- THEN service retries up to 3 times with new random value

#### Scenario: Vendedor not found

- GIVEN authenticated VENDEDOR with valid JWT
- AND NO Vendedor record exists with `auth_user_id == AuthUser.id`
- WHEN POST /api/link-invitacion
- THEN 404 with message `"Vendedor profile not found"`

### R2: List Own Invitation Links (VENDEDOR)

MUST return paginated list of own `LinkInvitacion` records (filtered by resolved `vendedor_id`). SHALL support `page` and `limit` query params. SHALL include `activo` and `expires_at` in each item.

#### Scenario: With results

- GIVEN VENDEDOR with 5 LinkInvitacion records
- WHEN GET /api/link-invitacion?page=1&limit=10
- THEN 200 with `PaginatedResponse` where `data.length === 5`
- AND each item includes `id`, `token`, `activo`, `expires_at`, `created_at`

#### Scenario: No links

- GIVEN VENDEDOR with no LinkInvitacion records
- WHEN GET /api/link-invitacion
- THEN 200 with empty `data` array

#### Scenario: Pagination

- GIVEN VENDEDOR with 15 LinkInvitacion records
- WHEN GET /api/link-invitacion?page=2&limit=10
- THEN `data.length === 5`, `totalPages === 2`, `page === 2`

### R3: Deactivate Invitation Link (VENDEDOR)

MUST set `activo = false` on own LinkInvitacion. SHALL return 404 if not found or not owned. SHALL return 400 if already inactive.

#### Scenario: Happy path

- GIVEN own active LinkInvitacion with `activo: true`
- WHEN PATCH /api/link-invitacion/:id/deactivate
- THEN 200 with `{ activo: false }`
- AND LinkInvitacion persisted with `activo: false`

#### Scenario: Not found

- GIVEN non-existent LinkInvitacion id
- WHEN PATCH /api/link-invitacion/:id/deactivate
- THEN 404

#### Scenario: Not owned

- GIVEN LinkInvitacion belonging to a different VENDEDOR
- WHEN PATCH /api/link-invitacion/:id/deactivate
- THEN 404 (no information leak — same as QrCode pattern)

#### Scenario: Already inactive

- GIVEN own LinkInvitacion with `activo: false`
- WHEN PATCH /api/link-invitacion/:id/deactivate
- THEN 400 with `{ message: "Link de invitación is already inactive" }`

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| (none — POST) | — | POST body empty; all fields auto-generated |
| `ListLinkInvitacionDto` | `page`, `limit` | Same as `ListQrCodesDto`: `page` ≥1 (default 1), `limit` 1-100 (default 10) |

## Business Rules

1. `token` SHALL be 8-char alphanumeric via `crypto.randomUUID().slice(0, 8)`. On `UniqueConstraintError` (P2002), retry up to 3 attempts. If all 3 fail, throw `ConflictException('Could not generate unique invitation link')`.
2. `expires_at` SHALL default to `now() + 48 hours` (ISO 8601 in responses).
3. `activo` SHALL default `true`; set to `false` on deactivation (no reactivation).
4. All operations SHALL resolve `Vendedor.id` from `AuthUser.id` via `resolveVendedorId()`, matching the same shared helper used by `QrCodesService`.
5. `GenerarLinkResponse.linkUrl` SHALL be `https://agua.app/invitar/${token}` (MVP — same URL pattern as QR codes).
6. `GenerarLinkResponse.token` SHALL return the raw 8-char token string.
7. Deactivation SHALL be irreversible — no reactivation endpoint exists.

## Roles Matrix

| Endpoint | VENDEDOR | CLIENTE | SUPER_ADMIN | Public |
|----------|----------|---------|-------------|--------|
| POST /api/link-invitacion | ✅ | — | — | — |
| GET /api/link-invitacion | ✅ | — | — | — |
| PATCH /api/link-invitacion/:id/deactivate | ✅ | — | — | — |

## Error Codes

| Code | Condition |
|------|-----------|
| 400 | Already inactive / validation failure |
| 401 | Missing or invalid JWT |
| 403 | Not a VENDEDOR (VendedorGuard) |
| 404 | LinkInvitacion not found / not owned / Vendedor profile not found |
| 409 | Token collision after 3 retries |

## DTOs

### `ListLinkInvitacionDto`

Same structure as `ListQrCodesDto` but without `vendedorId` field (vendor only sees own links):

```typescript
class ListLinkInvitacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```
