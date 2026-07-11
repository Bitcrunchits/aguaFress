# Cliente Admin Specification

## Purpose

Admin-only cliente management — list, view, update profiles, and reassign vendedor. All endpoints guarded by `RolesGuard(Role.SUPER_ADMIN)`.

## Requirements

### R1: List Clientes (SUPER_ADMIN)

MUST return paginated clientes with optional filters, sorted by `created_at DESC`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Default 1 |
| limit | number | No | Default 20, max 100 |
| vendedor_id | string | No | Filter by assigned vendedor |
| search | string | No | Partial match on nombre, apellido, dni |

#### Scenario: List with defaults

- GIVEN multiple clientes with different vendedores
- WHEN SUPER_ADMIN GET /clientes
- THEN 200 with `{ data: [...], total, page: 1, limit: 20 }`

#### Scenario: Filter by vendedor_id and search

- GIVEN 5 clientes where 3 assigned to vendedor `v1` and 2 match "García"
- WHEN SUPER_ADMIN GET /clientes?vendedor_id=v1&search=García
- THEN 200 with filtered results matching both criteria

#### Scenario: No auth → 401

- GIVEN no Authorization header
- WHEN GET /clientes
- THEN 401

#### Scenario: Non-admin → 403

- GIVEN valid VENDEDOR JWT
- WHEN GET /clientes
- THEN 403

### R2: Get Cliente by ID (SUPER_ADMIN)

MUST return full profile: nombre, apellido, dni, telefono, direccion fields, tipo_factura, and assigned vendedor info.

#### Scenario: Existing cliente

- GIVEN cliente `c1` exists with vendedor `v1`
- WHEN SUPER_ADMIN GET /clientes/c1
- THEN 200 with vendedor `{ id, nombre, apellido }` and all profile fields

#### Scenario: Non-existent ID

- GIVEN no cliente with id `nonexistent`
- WHEN SUPER_ADMIN GET /clientes/nonexistent
- THEN 404

### R3: Update Cliente Profile (SUPER_ADMIN)

MUST allow partial update of: nombre, apellido, dni, telefono, tipo_factura, direccion fields.

#### Scenario: Partial update

- GIVEN cliente `c1` with existing nombre
- WHEN SUPER_ADMIN PATCH /clientes/c1 with `{ telefono: "11-5555-0199" }`
- THEN 200 — nombre unchanged, telefono updated

#### Scenario: Non-existent cliente

- GIVEN no cliente with id `nonexistent`
- WHEN SUPER_ADMIN PATCH /clientes/nonexistent with `{ telefono: "11-5555-0100" }`
- THEN 404

### R4: Reassign Vendedor (SUPER_ADMIN)

MUST change `vendedor_id` and upsert the cartera relationship.

#### Scenario: Valid reassignment

- GIVEN cliente `c1` assigned to `v1`, and vendedor `v2` exists
- WHEN SUPER_ADMIN PATCH /clientes/c1/reasignar with `{ vendedorId: "v2" }`
- THEN 200 with `vendedor.id = "v2"`
- AND cartera record upserted for (v2, c1)

#### Scenario: New vendedor does not exist

- GIVEN no vendedor with id `nonexistent`
- WHEN SUPER_ADMIN PATCH /clientes/c1/reasignar with `{ vendedorId: "nonexistent" }`
- THEN 404

## Business Rules

1. Admin routes at `/clientes` (plural).
2. Reassign at `/clientes/:id/reasignar`.
3. No DELETE endpoint — clientes are persistent.
