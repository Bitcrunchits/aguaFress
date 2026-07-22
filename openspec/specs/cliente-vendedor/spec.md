# Cliente Vendedor Specification

## Purpose

Vendedor-scoped cliente management — list own active cartera, get/update assigned clients. Guarded by `VendedorGuard`.

## Requirements

### R1: List Own Clientes (VENDEDOR)

MUST return paginated clientes from the authenticated vendedor's active `RELACION_CARTERA` rows.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Default 1 |
| limit | number | No | Default 20, max 100 |
| search | string | No | Partial match on nombre, apellido |

#### Scenario: List cartera with defaults

- GIVEN vendedor `v1` with 5 clientes in cartera
- WHEN VENDEDOR GET /clientes
- THEN 200 with `{ data, total: 5, page: 1, limit: 20 }`

#### Scenario: Not a vendedor → 403

- GIVEN valid CLIENTE JWT
- WHEN GET /clientes
- THEN 403

#### Scenario: Vendedor inactivo → 403

- GIVEN valid VENDEDOR JWT with estado=inactivo
- WHEN GET /clientes
- THEN 403

### R2: Get Cliente by ID (VENDEDOR)

MUST return profile ONLY if cliente is in the authenticated vendedor's active cartera.

#### Scenario: Default pointer mismatch

- GIVEN cliente `c1` has `CLIENTE.vendedor_id = v1` but active cartera only for `(v2, c1)`
- WHEN vendedor `v1` requests `c1`
- THEN the system MUST deny access as non-cartera

#### Scenario: Multi-provider cartera

- GIVEN cliente `c1` has active cartera rows for vendedores `v1` and `v2`
- WHEN vendedor `v2` lists own clientes
- THEN `c1` MUST appear

#### Scenario: Existing cliente in cartera

- GIVEN vendedor `v1` with cliente `c1` in cartera
- WHEN VENDEDOR GET /clientes/c1
- THEN 200 with profile (nombre, apellido, telefono, direccion)

#### Scenario: Not in cartera → 404

- GIVEN vendedor `v1` and cliente `c2` NOT in cartera
- WHEN VENDEDOR GET /clientes/c2
- THEN 404

#### Scenario: Cliente does not exist → 404

- GIVEN no cliente with id `nonexistent`
- WHEN VENDEDOR GET /clientes/nonexistent
- THEN 404

### R3: Update Cliente Profile (VENDEDOR)

MUST allow updating own cartera clientes. Editable: nombre, apellido, telefono, direccion fields. MUST NOT allow changing tipo_factura.

#### Scenario: Update cartera cliente

- GIVEN vendedor `v1` with cliente `c1` in cartera
- WHEN VENDEDOR PATCH /clientes/c1 with `{ telefono: "11-5555-0199" }`
- THEN 200 with updated profile

#### Scenario: Not in cartera → 404

- GIVEN vendedor `v1` and cliente `c2` NOT in cartera
- WHEN VENDEDOR PATCH /clientes/c2 with `{ telefono: "11-5555-0100" }`
- THEN 404

#### Scenario: tipo_factura silently ignored

- GIVEN vendedor `v1` with cliente `c1` in cartera
- WHEN VENDEDOR PATCH /clientes/c1 with `{ tipoFactura: "C" }`
- THEN 200 — tipo_factura unchanged (field absent from vendedor DTO)

## Business Rules

1. Vendedor routes at `/clientes` (same prefix, different guard).
2. 404 for non-cartera — do not leak existence.
3. tipo_factura MUST NOT be present in vendedor update DTO.
4. Vendedor authorization MUST use active `RELACION_CARTERA(vendedorId, clienteId)`, not `CLIENTE.vendedor_id` alone.
