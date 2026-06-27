# Tasks: Auth Module + Users Profile

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1100 (incl. tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Core logic (T1–T4) → PR 2: HTTP layer (T5–T7) → PR 3: Profile + IT (T8–T9) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + TokenService + AuthService + unit tests | PR 1 | Core logic, no controller yet. Target: main. |
| 2 | JwtStrategy + Guards + AuthController + AuthModule + unit tests | PR 2 | HTTP layer, depends on PR 1. Target: main. |
| 3 | UsersService/Controller/Module + integration test | PR 3 | Profile endpoints + full auth flow IT. Depends on PR 2. Target: main. |

## Phase 1: Foundation

- [x] 1.1 Install `@nestjs/config`, create `src/common/config/env.config.ts` with validation, add `.env` with JWT secrets/expiry
- [x] 1.2 Create class-validator DTOs: `login.dto.ts`, `register.dto.ts`, `register-vendedor.dto.ts`, `refresh-token.dto.ts`, `update-profile.dto.ts`

## Phase 2: Token Service

- [x] 2.1 Create `src/auth/token.service.ts` — `generateTokens()`, `generateAccessToken()`, `verifyToken()`. Test: mock JwtService.

## Phase 3: Auth Core

- [x] 3.1 Create `src/auth/auth.service.ts` — register (`$transaction`), login, validate, refresh, logout. Test: mock PrismaService + TokenService.
- [ ] 3.2 Create `src/auth/jwt.strategy.ts` — PassportStrategy, validates user is_active. Test: mock PrismaService.

## Phase 4: Guards & Decorators

- [ ] 4.1 Create `jwt-auth.guard.ts` (global, `@Public` support) + `roles.guard.ts` (Reflector-based). Test: mock Reflector + ExecutionContext.
- [ ] 4.2 Create `public.decorator.ts`, `roles.decorator.ts`, `current-user.decorator.ts`

## Phase 5: Wiring

- [ ] 5.1 Create `src/auth/auth.controller.ts` — all endpoints (register, login, refresh, validate, logout). Test: mock AuthService.
- [ ] 5.2 Wire `AuthModule` — PassportModule, JwtModule.registerAsync, APP_GUARD, providers. Register ConfigModule in AppModule.

## Phase 6: Users Profile

- [ ] 6.1 Create `src/users/users.service.ts` — getProfile (role-specific data), updateProfile. Test: mock PrismaService.
- [ ] 6.2 Create `src/users/users.controller.ts`, wire `UsersModule`. Test: mock UsersService.

## Phase 7: Integration

- [ ] 7.1 Integration test: `@nestjs/testing` — register → login → refresh → profile full flow.

## Implementation Notes

- 1.1: Register ConfigModule.forRoot() globally in AppModule; env validation with Joi or custom validate function
- 1.2: DTOs map 1:1 to contracts interfaces; use @IsEmail(), @MinLength(), @IsEnum(UserRole) per spec validation rules
- 3.1: Vendedor created with `estado: pendiente`. Cliente requires `vendedor_id` (qrToken lookup or from DTO)
- 5.2: Global guard via `{ provide: APP_GUARD, useClass: JwtAuthGuard }` in AuthModule; UsersModule imports AuthModule for guards
