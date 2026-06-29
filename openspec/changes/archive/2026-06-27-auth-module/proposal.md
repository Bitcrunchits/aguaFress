# Proposal: Auth Module + Users Profile

## Intent

Implement authentication (register, login, JWT refresh) and user profile management in `usuario-service`. The service has empty modules, Prisma schema ready, and contract DTOs defined in `@agua/contracts`. We need the runtime logic to make auth and profile endpoints functional.

## Scope

### In Scope
- Auth endpoints: register (cliente/vendedor), login, refresh token, validate token, logout
- Admin vendedor registration endpoint
- Users endpoints: GET /profile, PATCH /profile
- JWT auth with access + refresh tokens (no DB table for refresh)
- Global `AuthGuard('jwt')` with `@Public()` opt-out
- `RolesGuard` with `@Roles()` decorator — `@nestjs/passport` + Reflector pattern
- `@CurrentUser()` param decorator
- `JwtModule.registerAsync()` via `ConfigService`
- `@nestjs/config` for env validation (JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN)
- class-validator DTOs in service layer (contracts are interfaces)
- Prisma `$transaction` for atomic user creation (AuthUser + Vendedor/Cliente)
- Unit tests for auth.service, auth.controller, users.service, users.controller

### Out of Scope
- QR code generation, wallet (cartera), invitation links — deferred to future change
- Google OAuth — `@deprecated` in contracts, not for MVP V1
- Password reset flow
- Redis streams (event publishing) — will be added when another service needs to consume
- Super admin user management endpoints
- Token blacklist / refresh token revocation

## Capabilities

### New Capabilities
- `user-auth`: Authentication flow (register, login, refresh, validate, logout) with JWT access + refresh tokens, role-based registration, and atomic user creation via Prisma transactions.
- `user-profile`: Profile retrieval (GET /profile) and partial update (PATCH /profile) with role-specific data (VendedorProfile / ClienteProfile).

### Modified Capabilities
- None

## Approach

NestJS 10 standard patterns: PassportStrategy + AuthGuard('jwt') + ConfigService for env-driven JWT config. Global guard by default (secure-by-default) with `@Public()` for opt-out. RolesGuard for role-restricted endpoints. Prisma `$transaction` to atomically create AuthUser + role-specific record. class-validator DTOs mirror the contract interfaces for `ValidationPipe` compatibility.

**SRP split:** Auth logic separated into two services:
- `AuthService` — register + login (core auth, depends on TokenService)
- `TokenService` — JWT sign + verify + refresh (pure token management, no DB dependency)

This respects Single Responsibility: one service handles user lifecycle, the other handles token lifecycle. Both are easier to test and change independently.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/auth/` | New (15 files) | Module, AuthService, TokenService, controller, strategy, guards, decorators, DTOs, tests |
| `src/users/` | New (6 files) | Module, service, controller, DTOs, tests |
| `src/common/config/` | New (1 file) | `env.config.ts` — env validation with @nestjs/config |
| `.env` | New | JWT secrets, expiry config |
| `package.json` | Modified | No changes needed (deps already present) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Refresh token stored only in client | Med | MVP scope — accept tradeoff; future iterations add DB table or Redis |
| bcrypt on Alpine (Docker) requires lib | Low | Already handled: `openssl` installed in Dockerfile |
| Contract DTOs may diverge from class-validator DTOs | Low | class-validator DTOs map 1:1 to contract interfaces; sync on change |

## Rollback Plan

1. Remove `AuthModule` and `UsersModule` from `AppModule` imports → restore empty modules
2. Revert `.env` file
3. Delete `src/auth/`, `src/users/`, `src/common/config/`
4. No DB migrations involved (Prisma `db push` — schema unchanged)

## Dependencies

- `@nestjs/config` package (not yet in package.json — needs `pnpm add @nestjs/config`)
- No external service dependencies (auth is self-contained in usuario-service)

## Success Criteria

- [ ] All auth endpoints return correct responses per contract DTOs
- [ ] Register creates AuthUser + Vendedor/Cliente atomically (DB in consistent state if any step fails)
- [ ] JWT token with `{ sub, email, role }` payload validates correctly
- [ ] Global guard blocks unauthenticated requests; `@Public()` endpoints bypass
- [ ] RolesGuard restricts endpoints per role
- [ ] `@CurrentUser()` injects user payload into controller methods
- [ ] Unit tests pass for service and controller layers
