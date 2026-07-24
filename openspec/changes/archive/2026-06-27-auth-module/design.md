# Design: Auth Module + Users Profile

## Technical Approach

NestJS 10 standard patterns: PassportStrategy + `AuthGuard('jwt')` global + `ConfigService`-driven JWT config. SRP split between `AuthService` (user lifecycle) and `TokenService` (JWT lifecycle). Secure-by-default with `@Public()` opt-out. Prisma `$transaction` for atomic register. class-validator DTOs mirroring `@agua/contracts` interfaces.

## Architecture Decisions

| Decision | Options | Tradeoff | Chosen |
|----------|---------|----------|--------|
| Guard strategy | Global guard vs per-route | Global is secure-by-default; per-route needs manual opt-in everywhere | **Global `AuthGuard('jwt')`** with `@Public()` decorator |
| Token storage | DB table vs Redis vs none | DB adds write overhead; Redis is extra infra; none is MVP-viable | **Client-only** (MVP); no DB/Redis for refresh tokens |
| Register atomicity | `$transaction` vs sequential creates | Sequential risks orphan records on partial failure | **`$transaction`** — AuthUser + role record atomically |
| Env config | `@nestjs/config` vs dotenv direct | `@nestjs/config` integrates with `JwtModule.registerAsync`; dotenv doesn't | **`@nestjs/config`** with factory function |
| Vendedor register | Same endpoint vs separate | Separate endpoint isolates admin-only flow, clearer validation | **Separate endpoint** `POST /auth/register/vendedor` |
| Service split | Single AuthService vs AuthService + TokenService | Split respects SRP; token logic is independently testable | **Two services** — AuthService handles user ops, TokenService handles JWT ops |

## Data Flow

```
── Register (public) ──────────────────────────────────

  Client → AuthController.register(dto)
    → AuthService.register(dto)
      → bcrypt.hash(password)
      → Prisma.$transaction([create AuthUser, create Cliente|Vendedor])
      → TokenService.generateTokens(userId, email, role)
    ← { user, token, refreshToken }

── Login (public) ─────────────────────────────────────

  Client → AuthController.login(dto)
    → AuthService.login(dto)
      → prisma.authUser.findUnique({ where: { email } })
      → bcrypt.compare(password, hash)
      → TokenService.generateTokens(user.id, email, role)
    ← { token, refreshToken, user }

── Validate (gateway-facing) ──────────────────────────

  Gateway → AuthController.validate(dto)
    → AuthService.validate(token)
      → jwtService.verifyAsync(token)
      → prisma.authUser.findUnique({ where: { id: payload.sub } })
    ← { valid: true/false, user }

── Guard Chain ────────────────────────────────────────

  Request → AuthGuard('jwt') global → RolesGuard → Controller
               ↑ unless @Public()        ↑ via @Roles()
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/auth/auth.module.ts` | Modify | Wire PassportModule, JwtModule.registerAsync, APP_GUARD, providers |
| `src/auth/auth.controller.ts` | Create | Endpoints: register, login, refresh, validate, logout |
| `src/auth/auth.service.ts` | Create | Core auth logic — register/login, delegates token ops to TokenService |
| `src/auth/token.service.ts` | Create | JWT sign/verify/refresh — no DB dependency |
| `src/auth/jwt.strategy.ts` | Create | PassportStrategy: extracts JWT from Bearer header, validates user in DB |
| `src/auth/dto/login.dto.ts` | Create | `@IsEmail()`, `@IsString() @MinLength(6)` |
| `src/auth/dto/register.dto.ts` | Create | `@IsEmail()`, `@MinLength(8)`, `@IsEnum(UserRole)` |
| `src/auth/dto/register-vendedor.dto.ts` | Create | Admin-only vendedor registration fields |
| `src/auth/dto/refresh-token.dto.ts` | Create | `@IsString()` |
| `src/auth/guards/jwt-auth.guard.ts` | Create | Global guard with `@Public()` reflector check |
| `src/auth/guards/roles.guard.ts` | Create | Reflector-based role matching |
| `src/auth/decorators/current-user.decorator.ts` | Create | `@CurrentUser()` param decorator |
| `src/auth/decorators/public.decorator.ts` | Create | `@Public()` metadata setter |
| `src/auth/decorators/roles.decorator.ts` | Create | `@Roles()` metadata setter |
| `src/auth/auth.service.spec.ts` | Create | Unit tests for register, login, validate, refresh |
| `src/auth/auth.controller.spec.ts` | Create | Unit tests for controller delegation |
| `src/users/users.module.ts` | Modify | Import AuthModule for guards |
| `src/users/users.controller.ts` | Create | `GET /profile`, `PATCH /profile` |
| `src/users/users.service.ts` | Create | Profile retrieval + partial update with role-specific data |
| `src/users/dto/update-profile.dto.ts` | Create | Optional fields for profile patch |
| `src/users/users.service.spec.ts` | Create | Unit tests for profile get/update |
| `src/users/users.controller.spec.ts` | Create | Unit tests for controller delegation |
| `src/common/config/env.config.ts` | Create | `@nestjs/config` factory + validation |
| `.env` | Create | JWT env vars with defaults |

## Interfaces / Contracts

Key service contracts (runtime interfaces, not `@agua/contracts` DTOs):

```typescript
// TokenService — pure JWT operations, injectable, no DB
@Injectable()
class TokenService {
  generateTokens(userId: string, email: string, role: UserRole): Promise<AuthTokenPair>
  generateAccessToken(userId: string, email: string, role: UserRole): Promise<string>
  verifyToken(token: string): Promise<JwtPayload>
}

// AuthService — user lifecycle, delegates token ops
@Injectable()
class AuthService {
  register(dto: RegisterDto): Promise<RegisterResponse>
  registerVendedor(dto: RegisterVendedorDto): Promise<RegisterVendedorResponse>
  login(dto: LoginDto): Promise<LoginResponse>
  refresh(refreshToken: string): Promise<RefreshTokenResponse>
  validate(token: string): Promise<ValidateTokenResponse>
}

// UsersService — profile CRUD
@Injectable()
class UsersService {
  getProfile(userId: string): Promise<UserProfile>
  updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile>
}
```

JWT payload shape:

```typescript
interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `AuthService.register/login` | Mock PrismaService + TokenService; assert transaction calls, bcrypt compare, response shape |
| Unit | `TokenService.generateTokens` | Mock JwtService; assert sign called with correct payload/options |
| Unit | `AuthController` | Mock AuthService; verify HTTP delegation + status codes |
| Unit | `UsersService.getProfile/updateProfile` | Mock PrismaService; test role-specific profile mapping |
| Unit | `JwtAuthGuard` | Mock Reflector; test `@Public()` bypass logic |
| Unit | `RolesGuard` | Mock Reflector + execution context; test role matching |
| Integration | Auth endpoints | NestJS `@nestjs/testing` with real Prisma (test DB or in-memory); full register→login→refresh flow |
| E2E | Full auth flow | HTTP client against running instance; register → login → access protected endpoint |

## Migration / Rollout

No data migration required — Prisma schema already exists. Module is additive (new files, existing empty modules wired in). Rollback: remove `AuthModule`/`UsersModule` from `AppModule`, delete `src/auth/`, `src/users/`, `src/common/config/`, `.env`.

## Dependencies to Add

One new package: `pnpm add @nestjs/config` (not present in `package.json`).

## Open Questions

- None — all decisions scoped per proposal + specs.
