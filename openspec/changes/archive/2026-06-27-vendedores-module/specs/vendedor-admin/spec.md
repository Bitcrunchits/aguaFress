# Vendedor Admin Specification

## Purpose

Admin-only vendedor management — list, view, update profiles, and control estado transitions. All endpoints guarded by `RolesGuard(Role.SUPER_ADMIN)` and JWT authentication.

## Requirements

### R1: List Vendedores (SUPER_ADMIN)

MUST return paginated vendedores with optional filters, sorted by `created_at DESC`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Default 1 |
| `limit` | number | No | Default 20, max 100 |
| `estado` | VendedorEstado | No | Filter: pendiente, activo, inactivo, bloqueado |
| `search` | string | No | Partial match on nombre, apellido, empresa (case-insensitive) |

#### Scenario: List all vendedores with defaults

- GIVEN multiple vendedores with mixed estados
- WHEN SUPER_ADMIN GET /vendedores
- THEN 200 + `SuperAdminVendedorListResponse` with `{ data: [...], pagination: { total, page: 1, limit: 20 } }`
- AND results ordered by `created_at` DESC

#### Scenario: Filter by estado and search

- GIVEN 3 pending vendedores where 2 match "Acme" in empresa
- WHEN SUPER_ADMIN GET /vendedores?estado=pendiente&search=Acme
- THEN 200 with 2 items, `pagination.total = 2`

#### Scenario: Pagination with page/limit

- GIVEN 50 vendedores
- WHEN SUPER_ADMIN GET /vendedores?page=2&limit=10
- THEN 200 with `pagination.page=2, pagination.limit=10, pagination.total=50`

#### Scenario: No auth returns 401

- GIVEN no Authorization header
- WHEN GET /vendedores
- THEN 401

#### Scenario: Non-admin returns 403

- GIVEN valid VENDEDOR JWT
- WHEN GET /vendedores
- THEN 403

### R2: Get Vendedor by ID (SUPER_ADMIN)

MUST return full vendedor profile including AuthUser email + Vendedor data.

#### Scenario: Existing vendedor

- GIVEN vendedor with id `abc-123` exists
- WHEN SUPER_ADMIN GET /vendedores/abc-123
- THEN 200 with `{ id, email, nombre, apellido, empresa, telefono, logo, estado, ciudadDefault, zonaEntrega, createdAt }`

#### Scenario: Non-existent ID

- GIVEN no vendedor with id `nonexistent`
- WHEN SUPER_ADMIN GET /vendedores/nonexistent
- THEN 404

### R3: Update Vendedor Profile (SUPER_ADMIN)

MUST allow updating editable fields: `empresa`, `telefono`, `logo`, `ciudad_default`, `zona_entrega`. Partial update only — omitted fields MUST NOT change.

#### Scenario: Full update

- GIVEN vendedor `abc-123` with default values
- WHEN SUPER_ADMIN PATCH /vendedores/abc-123 with `{ empresa: "Nueva SA", telefono: "11-5555-0100", logo: "https://img.com/logo.png", ciudadDefault: "CABA", zonaEntrega: "Palermo" }`
- THEN 200 with updated VendedorResponse
- AND fields persist in DB

#### Scenario: Partial update

- GIVEN vendedor `abc-123` with existing empresa
- WHEN SUPER_ADMIN PATCH /vendedores/abc-123 with `{ telefono: "11-5555-0199" }`
- THEN 200 — empresa unchanged, telefono updated

#### Scenario: Non-existent vendedor

- GIVEN no vendedor with id `nonexistent`
- WHEN SUPER_ADMIN PATCH /vendedores/nonexistent
- THEN 404

### R4: Change Estado (SUPER_ADMIN)

MUST validate estado transitions against the status machine. Invalid transitions MUST return 400.

**Valid transitions:**

| From | To |
|------|----|
| pendiente | activo |
| activo | inactivo |
| activo | bloqueado |
| inactivo | activo |
| bloqueado | inactivo |

#### Scenario: Activate pending vendedor

- GIVEN vendedor with estado=pendiente
- WHEN SUPER_ADMIN PATCH /vendedores/abc-123/estado with `{ estado: "activo" }`
- THEN 200 + `SuperAdminAccionResponse { estadoAnterior: "pendiente", estadoNuevo: "activo", updated: true }`

#### Scenario: Block active vendedor

- GIVEN vendedor with estado=activo
- WHEN SUPER_ADMIN PATCH /vendedores/abc-123/estado with `{ estado: "bloqueado" }`
- THEN 200 with `estadoNuevo: "bloqueado"`

#### Scenario: Invalid transition returns 400

- GIVEN vendedor with estado=bloqueado
- WHEN SUPER_ADMIN PATCH /vendedores/abc-123/estado with `{ estado: "pendiente" }`
- THEN 400 with message describing invalid transition

#### Scenario: Same estado returns 400

- GIVEN vendedor with estado=activo
- WHEN SUPER_ADMIN PATCH /vendedores/abc-123/estado with `{ estado: "activo" }`
- THEN 400

### R5: No Delete

MUST NOT provide a DELETE endpoint. Soft deletion is via estado=inactivo.

### R6: No ability to change estado from self-service

MUST forbid estado changes via `vendedor-profile` (R4 in profile spec).

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| SuperAdminVendedorListFilters | page, limit | `@IsInt() @Min(1)`, optional |
| | estado | `@IsEnum(VendedorEstado)`, optional |
| | search | `@IsString() @MaxLength(100)`, optional |
| UpdateVendedorDTO | empresa, telefono, logo, ciudad_default, zona_entrega | `@IsString() @MaxLength()`, optional |
| ChangeEstadoDTO | estado | `@IsEnum(VendedorEstado)`, required |
| | motivo | `@IsString() @MaxLength(500)`, optional |

## Business Rules

1. Admin routes SHALL use path prefix `/vendedores` (plural).
2. Estado transitions SHALL be validated in service layer, not controller.
3. Soft delete via `estado=inactivo` — no DELETE endpoint needed.
4. All endpoints MUST include `SuperAdminAccionResponse` shape on estado change.
5. Audit logging of estado changes is deferred (future).
