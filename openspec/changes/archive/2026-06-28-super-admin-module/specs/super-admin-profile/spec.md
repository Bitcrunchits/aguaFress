# Super Admin Profile Specification

## Purpose

Self-service profile read and update for authenticated SUPER_ADMIN users. Guarded by `AuthGuard('jwt')` + `RolesGuard(Role.SUPER_ADMIN)`.

## Requirements

### R1: Get Own Profile (SUPER_ADMIN)

MUST return the authenticated super admin's profile: AuthUser email + SuperAdmin nombre/apellido + role.

#### Scenario: Existing super admin

- GIVEN valid SUPER_ADMIN JWT for userId `u1` linked to super_admin `sa1` with nombre="Admin" apellido="Root"
- WHEN GET /super-admin/me
- THEN 200 with `{ id, email, nombre, apellido, role: "super_admin" }`

#### Scenario: Not a SUPER_ADMIN role

- GIVEN valid VENDEDOR JWT
- WHEN GET /super-admin/me
- THEN 403

#### Scenario: No auth

- GIVEN no Authorization header
- WHEN GET /super-admin/me
- THEN 401

### R2: Update Own Profile (SUPER_ADMIN)

MUST allow authenticated super admin to update own nombre and/or apellido. Partial update only — omitted fields MUST NOT change.

#### Scenario: Update nombre and apellido

- GIVEN valid SUPER_ADMIN JWT for super_admin `sa1` with nombre="Admin" apellido="Root"
- WHEN PATCH /super-admin/me with `{ nombre: "Super", apellido: "Admin" }`
- THEN 200 with updated profile
- AND nombre="Super", apellido="Admin" persisted

#### Scenario: Partial update (one field)

- GIVEN valid SUPER_ADMIN JWT
- WHEN PATCH /super-admin/me with `{ apellido: "Nuevo" }`
- THEN 200 — nombre unchanged, apellido updated

#### Scenario: Empty body

- GIVEN valid SUPER_ADMIN JWT
- WHEN PATCH /super-admin/me with `{}`
- THEN 200 — no fields changed, profile returned

#### Scenario: Not a SUPER_ADMIN

- GIVEN valid CLIENTE JWT
- WHEN PATCH /super-admin/me with `{ nombre: "Hacker" }`
- THEN 403

#### Scenario: Validation failure

- GIVEN valid SUPER_ADMIN JWT
- WHEN PATCH /super-admin/me with `{ nombre: 12345 }` (wrong type)
- THEN 400

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| UpdateSuperAdminProfileDTO | nombre | `@IsString() @MaxLength(100)`, optional |
| | apellido | `@IsString() @MaxLength(100)`, optional |

## Business Rules

1. `@CurrentUser('userId')` MUST scope queries to the authenticated user's SuperAdmin record.
2. email and role MUST NOT be updatable via PATCH — they come from AuthUser and are immutable.
3. Profile routes SHALL be at `/super-admin/me` (not under `/super-admin/:id`).
4. Non-existent internal SuperAdmin record (auth exists but no profile) SHALL return 404 on GET, 500 on PATCH — should never occur if registration creates both.
