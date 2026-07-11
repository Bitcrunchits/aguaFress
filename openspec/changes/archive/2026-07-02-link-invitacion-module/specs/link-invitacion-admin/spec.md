# Link Invitación Admin Specification

## Purpose

SUPER_ADMIN management of invitation links for all vendedores. List links by vendedor, deactivate any link. Same pattern as QR Code Admin (`MicroServices/usuario-service/src/qr-codes/qr-codes-admin.controller.ts`). All endpoints guarded by `RolesGuard` + `AuthGuard('jwt')` with `SUPER_ADMIN` role.

## Requirements

### R1: List Links by Vendedor (SUPER_ADMIN)

MUST return paginated list of `LinkInvitacion` records filtered by `vendedorId` query param. `vendedorId` is REQUIRED. SHALL support `page` and `limit` query params.

#### Scenario: With results

- GIVEN authenticated SUPER_ADMIN with valid JWT
- AND Vendedor has 5 LinkInvitacion records
- WHEN GET /api/admin/link-invitacion?vendedorId={uuid}&page=1&limit=10
- THEN 200 with `PaginatedResponse` where `data.length === 5`

#### Scenario: No links for vendedor

- GIVEN Vendedor with no LinkInvitacion records
- WHEN GET /api/admin/link-invitacion?vendedorId={uuid}
- THEN 200 with empty `data` array

#### Scenario: Missing vendedorId

- GIVEN authenticated SUPER_ADMIN
- WHEN GET /api/admin/link-invitacion (without `vendedorId`)
- THEN 400 with `{ message: "vendedorId is required" }`

#### Scenario: Pagination

- GIVEN Vendedor with 15 LinkInvitacion records
- WHEN GET /api/admin/link-invitacion?vendedorId={uuid}&page=2&limit=10
- THEN `data.length === 5`, `totalPages === 2`, `page === 2`

### R2: Deactivate Any Link (SUPER_ADMIN)

MUST set `activo = false` on any LinkInvitacion by id. SHALL NOT enforce ownership — admin can deactivate any vendedor's link. SHALL return 404 if not found. SHALL return 400 if already inactive.

#### Scenario: Happy path

- GIVEN active LinkInvitacion (any vendedor)
- WHEN PATCH /api/admin/link-invitacion/:id/deactivate
- THEN 200 with `{ activo: false }`

#### Scenario: Not found

- GIVEN non-existent LinkInvitacion id
- WHEN PATCH /api/admin/link-invitacion/:id/deactivate
- THEN 404

#### Scenario: Already inactive

- GIVEN LinkInvitacion with `activo: false`
- WHEN PATCH /api/admin/link-invitacion/:id/deactivate
- THEN 400 with `{ message: "Link de invitación is already inactive" }`

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| `ListLinkInvitacionDto` | `page`, `limit`, `vendedorId` | Same as `ListQrCodesDto`: `vendedorId` required (UUID), `page` ≥1 (default 1), `limit` 1-100 (default 10) |

## Business Rules

1. `LinkInvitacionService.listByVendedor(vendedorId, dto)` SHALL delegate to the same private list method used by the vendor controller, mirroring `QrCodesService.listByVendedor` → `QrCodesService.list`.
2. `LinkInvitacionService.deactivateAdmin(id)` SHALL call the same internal deactivation method as vendor, **without** ownership scoping.
3. Admin endpoints SHALL NOT call `resolveVendedorId()` — the `vendedorId` is passed explicitly as a query param.

## Roles Matrix

| Endpoint | VENDEDOR | CLIENTE | SUPER_ADMIN | Public |
|----------|----------|---------|-------------|--------|
| GET /api/admin/link-invitacion | — | — | ✅ | — |
| PATCH /api/admin/link-invitacion/:id/deactivate | — | — | ✅ | — |

## Error Codes

| Code | Condition |
|------|-----------|
| 400 | Already inactive / validation failure / missing vendedorId |
| 401 | Missing or invalid JWT |
| 403 | Not a SUPER_ADMIN (RolesGuard) |
| 404 | LinkInvitacion not found |

## DTOs

### `ListLinkInvitacionDto` (shared with vendor)

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

  @IsOptional()       // Admin requires it, vendor ignores it
  @IsUUID()
  vendedorId?: string;
}
```

Note: Same DTO class used by vendor and admin. Admin controller SHALL validate `vendedorId` presence at runtime (mirroring `QrCodesAdminController`).
