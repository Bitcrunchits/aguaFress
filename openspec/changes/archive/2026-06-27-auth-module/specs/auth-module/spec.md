# Auth Module Specification

## Purpose

Authentication and profile management for `usuario-service`. Two domains: **user-auth** (register, login, refresh, validate, logout) and **user-profile** (get/update profile).

---

# Domain: user-auth

## Requirements

### R1: Register (Public)

MUST create AuthUser + role record atomically via Prisma `$transaction`.

- **Cliente register**: GIVEN valid RegisterDTO with CLIENTE role + qrToken, WHEN POST /api/auth/register, THEN 201 + `RegisterResponse { id, email, role }` + AuthUser+Cliente persisted, password bcrypt-hashed.
- **Vendedor register**: GIVEN valid RegisterVendedorDTO, WHEN POST /api/auth/register/vendedor, THEN 201 + `{ status: "pendiente", vendedorId }`.
- **Duplicate email**: GIVEN existing AuthUser, WHEN POST /api/auth/register with same email, THEN 409.

### R2: Login (Public)

MUST authenticate email+password and return access + refresh JWTs.

- **Valid creds**: GIVEN active AuthUser, WHEN POST /api/auth/login with correct email+password, THEN 200 + `LoginResponse { token, refreshToken, user }`.
- **Wrong password**: GIVEN registered user, WHEN wrong password, THEN 401.

### R3: Refresh Token (Public)

MUST return new access JWT from valid refresh JWT.

- **Valid refresh**: GIVEN unexpired refresh JWT, WHEN POST /api/auth/refresh, THEN 200 + `RefreshTokenResponse { token }`.

### R4: Validate Token (Public)

MUST verify JWT validity for gateway use.

- **Valid token**: GIVEN valid access JWT, WHEN POST /api/auth/validate, THEN 200 + `{ valid: true, user }`.
- **Expired**: GIVEN expired JWT, THEN 200 + `{ valid: false, user: null }`.

### R5: Logout (Any Auth)

MUST accept logout (no-op MVP).

- **Auth logout**: GIVEN valid JWT header, WHEN POST /api/auth/logout, THEN 200 + `{ message: "ok" }`.

---

# Domain: user-profile

## Requirements

### R6: Get Profile (Any Auth)

MUST return profile with role-specific data (VendedorProfile or ClienteProfile).

- **Vendedor profile**: GIVEN valid VENDEDOR JWT, WHEN GET /api/users/profile, THEN 200 + UserProfile containing VendedorProfile.
- **Unauthenticated**: GIVEN no Authorization header, THEN 401.

### R7: Update Profile (Any Auth)

MUST allow partial profile updates.

- **Update telefono**: GIVEN valid VENDEDOR JWT, WHEN PATCH /api/users/profile with `{ telefono: "11-5555-0199" }`, THEN 200 + updated UserProfile.

---

## Validation Rules

| DTO | Fields | Rules |
|-----|--------|-------|
| LoginDTO | email, password | @IsEmail(), @IsString()+@MinLength(6) |
| RegisterDTO | email, password, nombre, role | @IsEmail(), @IsString()+@MinLength(8), @IsString(), @IsEnum(UserRole) |
| RegisterVendedorDTO | telefono, ciudad?, zonaEntrega? | @IsString() |
| RefreshTokenDTO | refreshToken | @IsString() |
| UpdateProfileDTO | nombre/apellido/telefono | @IsString(), optional |
| | address.* | @IsString()/@IsNumber(), optional |

## Business Rules

1. Email MUST be unique (409 on conflict).
2. Password MUST be bcrypt-hashed (min 8 chars), never returned.
3. Register SHALL use `$transaction` — AuthUser + role record atomically.
4. Vendedor: `estado: pendiente`. Cliente: requires `vendedor_id` (qrToken or body).
5. Access JWT payload: `{ sub: userId, email, role }`. Expiry: env `JWT_EXPIRES_IN` (default `1d`).
6. Refresh JWT expiry: hardcoded `7d` (MVP, no DB/Redis).
7. JwtStrategy.validate() MUST confirm user `is_active` in DB.
8. `@Public()` bypasses global AuthGuard. All other endpoints guarded.

## Roles Matrix

| Endpoint | Public | Any Auth | VEND | CLIENTE | SUPER_ADMIN |
|---|---|---|---|---|---|
| POST /api/auth/register | ✅ | - | - | - | - |
| POST /api/auth/login | ✅ | - | - | - | - |
| POST /api/auth/refresh | ✅ | - | - | - | - |
| POST /api/auth/validate | ✅ | - | - | - | - |
| POST /api/auth/logout | - | ✅ | ✅ | ✅ | ✅ |
| GET /api/users/profile | - | ✅ | ✅ | ✅ | ✅ |
| PATCH /api/users/profile | - | ✅ | ✅ | ✅ | ✅ |

## Error Codes

| Code | Condition |
|------|-----------|
| 400 | Validation failure (class-validator) |
| 401 | Invalid creds / expired JWT / inactive user |
| 403 | Role not authorized (RolesGuard) |
| 409 | Duplicate email |
