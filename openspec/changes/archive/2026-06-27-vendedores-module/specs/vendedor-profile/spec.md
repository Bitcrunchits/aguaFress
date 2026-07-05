# Vendedor Profile Specification

## Purpose

Self-service profile retrieval and update for authenticated VENDEDOR users. All endpoints use `@CurrentUser('userId')` to scope operations to the authenticated user's own record. Guarded by `AuthGuard('jwt')`.

## Requirements

### R1: Get Own Profile (VENDEDOR)

MUST return the authenticated vendedor's profile, combining AuthUser email + Vendedor data into a `UserProfile` with `VendedorProfile`.

#### Scenario: Existing vendedor

- GIVEN valid VENDEDOR JWT for userId `u1` linked to vendedor `v1` with estado=activo
- WHEN GET /vendedores/me
- THEN 200 with `UserProfile { email, role: "vendedor", profile: { empresa, estado, logo, ciudadDefault, zonaEntrega, ... } }`

#### Scenario: Not a vendedor role

- GIVEN valid CLIENTE JWT
- WHEN GET /vendedores/me
- THEN 403

#### Scenario: Vendedor inactivo or bloqueado

- GIVEN valid VENDEDOR JWT but vendedor `v1` has estado=inactivo
- WHEN GET /vendedores/me
- THEN 403

### R2: Update Own Profile (VENDEDOR)

MUST allow authenticated vendedor to update own profile fields. Editable fields: `nombre`, `apellido`, `telefono`, `empresa`, `logo`, `ciudad_default`, `zona_entrega`. Partial update only.

#### Scenario: Update profile fields

- GIVEN valid VENDEDOR JWT for vendedor `v1` with estado=activo
- WHEN PATCH /vendedores/me with `{ telefono: "11-5555-0199", empresa: "Mi Empresa" }`
- THEN 200 with updated profile
- AND telefono and empresa persisted, other fields unchanged

#### Scenario: Cannot change estado

- GIVEN valid VENDEDOR JWT for vendedor `v1`
- WHEN PATCH /vendedores/me with `{ estado: "activo" }`
- THEN `estado` is silently ignored (not in update DTO)
- AND profile updated without estado change

#### Scenario: Not a vendedor

- GIVEN valid CLIENTE JWT
- WHEN PATCH /vendedores/me
- THEN 403

#### Scenario: Inactivo or bloqueado

- GIVEN valid VENDEDOR JWT but vendedor has estado=bloqueado
- WHEN PATCH /vendedores/me
- THEN 403

#### Scenario: Validation failure

- GIVEN valid VENDEDOR JWT
- WHEN PATCH /vendedores/me with `{ telefono: 12345 }` (wrong type)
- THEN 400 with validation errors

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| UpdateVendedorProfileDTO | nombre | `@IsString() @MaxLength(100)`, optional |
| | apellido | `@IsString() @MaxLength(100)`, optional |
| | telefono | `@IsString() @MaxLength(20)`, optional |
| | empresa | `@IsString() @MaxLength(255)`, optional |
| | logo | `@IsString() @MaxLength(500)`, optional |
| | ciudad_default | `@IsString() @MaxLength(100)`, optional |
| | zona_entrega | `@IsString() @MaxLength(100)`, optional |

## Business Rules

1. `@CurrentUser('userId')` MUST scope queries to the authenticated user's vendedor record.
2. `estado` MUST NOT be present in `UpdateVendedorProfileDTO` — only admin can change it.
3. Inactivo/bloqueado vendedores SHALL receive 403, not 401 (auth passes, but access denied).
4. Profile routes SHALL be at `/vendedores/me` (not under `/vendedores/:id` to avoid conflict with admin routes).
5. `@CurrentUser()` decorator already exists from AuthModule — pass userId, not vendedorId.
6. Profile response SHOULD use `UserProfile` with `VendedorProfile` nested shape from contracts.
