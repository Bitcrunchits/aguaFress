# Dashboard Stats Specification

## Purpose

Aggregate platform statistics for the SUPER_ADMIN dashboard. Read-only endpoint that returns counts across all entity types. Guarded by `AuthGuard('jwt')` + `RolesGuard(Role.SUPER_ADMIN)`.

## Requirements

### R1: Get Dashboard Stats (SUPER_ADMIN)

MUST return aggregate platform counts: total vendedores, vendedores activos, vendedores pendientes, total clientes, clientes con vendedor asignado, and total super admins.

#### Scenario: Platform has mixed data

- GIVEN 10 vendedores (6 activos, 3 pendientes, 1 inactivo), 50 clientes (40 assigned to vendedores), 2 super admins
- WHEN SUPER_ADMIN GET /super-admin/dashboard
- THEN 200 with `{ totalVendedores: 10, vendedoresActivos: 6, vendedoresPendientes: 3, totalClientes: 50, clientesConVendedor: 40, totalSuperAdmins: 2 }`

#### Scenario: No data (fresh platform)

- GIVEN no vendedores, no clientes, 1 super admin
- WHEN SUPER_ADMIN GET /super-admin/dashboard
- THEN 200 with `{ totalVendedores: 0, vendedoresActivos: 0, vendedoresPendientes: 0, totalClientes: 0, clientesConVendedor: 0, totalSuperAdmins: 1 }`

#### Scenario: No auth

- GIVEN no Authorization header
- WHEN GET /super-admin/dashboard
- THEN 401

#### Scenario: Non-admin role

- GIVEN valid VENDEDOR JWT
- WHEN GET /super-admin/dashboard
- THEN 403

## Response Shape

| Field | Type | Description |
|-------|------|-------------|
| totalVendedores | number | All vendedores |
| vendedoresActivos | number | VendedorEstado = activo |
| vendedoresPendientes | number | VendedorEstado = pendiente |
| totalClientes | number | All clientes |
| clientesConVendedor | number | Clientes with active cartera assignment |
| totalSuperAdmins | number | All SuperAdmin records |

## Business Rules

1. Dashboard SHALL return immediately — no pagination, no filters.
2. All counts MUST be derived from Prisma aggregate queries (`count()`), not in-memory iteration.
3. `clientesConVendedor` SHALL count CARTERA records where `activo` is true (clientes with an active cartera assignment).
4. `totalSuperAdmins` SHALL count SuperAdmin table rows.
5. Response MUST NOT expose individual user data — aggregate numbers only.
