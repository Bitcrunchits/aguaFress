# QR Code Vendor — Delta Specification (link-invitacion-module)

**Base spec**: `openspec/specs/qr-code-vendor/spec.md`
**Change scope**: Fix `vendedor_id` resolution bug — the controller passes `AuthUser.id` (JWT `userId`) as `vendedor_id` in Prisma queries, but `Vendedor.id` ≠ `AuthUser.id`, causing FK violations.

All sections of the base spec remain unchanged **except** the following amendments.

## Amendments to Requirements

### R4 (NEW): Resolve Vendedor ID

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

## Amendments to Business Rules

**Rule 4** (amended):

> ~~All operations SHALL scope to `vendedor_id` matching the authenticated user's vendedor record.~~
>
> All operations SHALL resolve `Vendedor.id` from the authenticated `AuthUser.id` **before** any data access, using a `resolveVendedorId(authUserId: string)` helper that queries `prisma.vendedor.findUnique({ where: { auth_user_id: authUserId } })`. The resolved `Vendedor.id` SHALL be used as `vendedor_id` for all persistence and query scoping. This is a two-step resolution: `AuthUser.id` → `Vendedor.id` (via `auth_user_id` FK) → data access.

**Rule 7** (NEW):

> `resolveVendedorId()` SHALL throw `NotFoundException('Vendedor profile not found')` if no Vendedor record matches the given `authUserId`. SHALL be implemented as a private method on the service (or shared utility), NOT as a separate injectable.

## Amendments to Error Codes

| Code | Condition | Change |
|------|-----------|--------|
| 404 | Vendedor profile not found | **NEW** — when `resolveVendedorId()` finds no Vendedor record |

## Impact Analysis

| Affected | Impact |
|----------|--------|
| `QrCodesService` | Add `resolveVendedorId()` private method. `create()`, `list()`, `deactivate()` now receive `authUserId` (raw JWT) and resolve internally before use. |
| `QrCodesVendorController` | Remove `userId` → `vendedorId` confusion. Controller still extracts `userId` from JWT. |
| Tests | Existing tests passing `vendedorId` directly still work IF caller has already resolved. Integration tests SHALL test end-to-end resolution path. |
