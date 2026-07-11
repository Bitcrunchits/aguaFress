# Exploration: api-gateway

## Scope

Build the `api-gateway` microservice (port 3000) as the single HTTP entry point for clients. Today the gateway is a stub: `MicroServices/gateway/src/main.ts` is a 1-line comment and `src/routes/*.routes.ts` are 6 comment-only files. No controller, no real routing, no auth, no rate limit, no env config, no Dockerfile, no `tsconfig.json`, no `nest-cli.json`, no `@agua/contracts` dependency.

The gateway must: (1) authenticate incoming requests using the same JWT secret as `usuario-service`, (2) forward them to the right downstream service under the `/api/*` prefix, (3) inject `userId` (and minimal identity) into forwarded requests so downstream services don't need to re-validate, (4) rate-limit sensitive endpoints (login, register, refresh, validate, QR create) per spec, and (5) expose a public health endpoint.

## Current State

### What's in the gateway today

```
MicroServices/gateway/
├── dist/                          # leftover build from old attempt
├── node_modules/                  # installed, no @agua/contracts
├── package.json                   # @agua/gateway, nest 10, has @nestjs/microservices
├── {src/                          # malformed dir from shell glob mistake (empty)
│   └── health/                    # literally named `health}` (empty)
└── src/
    ├── main.ts                    # // API Gateway — Puerto 3000
    └── routes/                    # 6 files, each 1–2 lines of comments
        ├── activity-logs.routes.ts
        ├── auth.routes.ts
        ├── deliveries.routes.ts
        ├── orders.routes.ts
        ├── products.routes.ts
        └── users.routes.ts
```

The 6 `routes/*.routes.ts` files document the intended target MS and module but contain no logic. There is no `app.module.ts`, no `main.ts` bootstrap, no auth guard, no proxy implementation.

### What's complete in the wider system (input for the gateway)

- **`usuario-service` (port 3001)** — fully implemented, 12 controllers, 38 endpoints, 355+ tests passing. Sets `setGlobalPrefix('api')` in `main.ts`. JWT via `@nestjs/passport` + `passport-jwt`, secret from `JWT_SECRET`, refresh secret from `JWT_REFRESH_SECRET`, expiry `1d` / `7d`. Global `JwtAuthGuard` (registered as `APP_GUARD`) with `@Public()` opt-out, plus a `RolesGuard` driven by `@Roles(UserRole.*)` metadata. `@CurrentUser('userId')` extracts the userId after `JwtStrategy.validate()` does a DB hit. `JwtPayload = { sub, email, role, jti? }`.
- **`packages/contracts`** — full enum and DTO set, builds via `pnpm --filter @agua/contracts build`. Already imported by `usuario-service` as `@agua/contracts`.
- **Other 4 MS** — `package.json` + empty `src/<feature>/<feature>.module.ts` (1-line comment). No controllers, no services, no Prisma schema. Their `contratosDTOs/*.json` files describe intended endpoints but nothing is built.
- **docker-compose.yml** — has `postgres`, `redis`, and `usuario-service` only. No gateway service, no Kafka, no MongoDB.
- **TCP / Kafka** — there is NO working MS-to-MS transport yet. The only `@nestjs/microservices` reference in the repo is the `RpcExceptionFilter` in `usuario-service` (unused, "Planned for Kafka microservice integration"). The architecture decision (27/06) is to use TCP for sync and Kafka for async, but the gateway's job is HTTP ingress — it does NOT need to participate in the TCP/Kafka bus for the MVP. The gateway receives HTTP and forwards HTTP to downstream services; the TCP/Kafka bus is for MS-to-MS communication that hasn't been implemented anywhere yet.

### Routes the gateway MUST route (full inventory)

Every `usuario-service` route below is what the gateway must accept on `:3000/api/*` and forward to `:3001/api/*` (preserving path, method, headers, body, query). The "Auth" column is what the gateway needs to enforce BEFORE forwarding — `Public` means the gateway passes through; `Bearer` means the gateway validates the JWT and injects identity; `Bearer+Role` means the gateway must additionally enforce the role (or at minimum re-validate downstream).

| # | Method | Path (gateway URL) | Forwarded as | Auth required | Role guard | Source |
|---|--------|-------------------|--------------|---------------|-----------|--------|
| 1 | POST | `/api/auth/register` | `POST /api/auth/register` | Public | — | `AuthController` |
| 2 | POST | `/api/auth/register/vendedor` | `POST /api/auth/register/vendedor` | Public | — | `AuthController` |
| 3 | POST | `/api/auth/login` | `POST /api/auth/login` | Public | — | `AuthController` (rate-limited) |
| 4 | POST | `/api/auth/refresh` | `POST /api/auth/refresh` | Public | — | `AuthController` (rate-limited) |
| 5 | POST | `/api/auth/validate` | `POST /api/auth/validate` | Public | — | `AuthController` (rate-limited) |
| 6 | POST | `/api/auth/logout` | `POST /api/auth/logout` | Bearer | any role | `AuthController` |
| 7 | GET | `/api/users/profile` | `GET /api/users/profile` | Bearer | any role | `UsersController` |
| 8 | PATCH | `/api/users/profile` | `PATCH /api/users/profile` | Bearer | any role | `UsersController` |
| 9 | GET | `/api/vendedores` | `GET /api/vendedores` | Bearer | SUPER_ADMIN | `VendedoresController` |
| 10 | GET | `/api/vendedores/me` | `GET /api/vendedores/me` | Bearer | VENDEDOR (`VendedorGuard`) | `VendedorProfileController` |
| 11 | PATCH | `/api/vendedores/me` | `PATCH /api/vendedores/me` | Bearer | VENDEDOR | `VendedorProfileController` |
| 12 | GET | `/api/vendedores/:id` | `GET /api/vendedores/:id` | Bearer | SUPER_ADMIN | `VendedoresController` |
| 13 | PATCH | `/api/vendedores/:id` | `PATCH /api/vendedores/:id` | Bearer | SUPER_ADMIN | `VendedoresController` |
| 14 | PATCH | `/api/vendedores/:id/estado` | `PATCH /api/vendedores/:id/estado` | Bearer | SUPER_ADMIN | `VendedoresController` |
| 15 | GET | `/api/clientes` | `GET /api/clientes` | Bearer | SUPER_ADMIN | `ClientesController` |
| 16 | GET | `/api/clientes/mios` | `GET /api/clientes/mios` | Bearer | VENDEDOR | `ClienteVendedorController` |
| 17 | GET | `/api/clientes/mios/:id` | `GET /api/clientes/mios/:id` | Bearer | VENDEDOR | `ClienteVendedorController` |
| 18 | PATCH | `/api/clientes/mios/:id` | `PATCH /api/clientes/mios/:id` | Bearer | VENDEDOR | `ClienteVendedorController` |
| 19 | GET | `/api/clientes/:id` | `GET /api/clientes/:id` | Bearer | SUPER_ADMIN | `ClientesController` |
| 20 | PATCH | `/api/clientes/:id` | `PATCH /api/clientes/:id` | Bearer | SUPER_ADMIN | `ClientesController` |
| 21 | PATCH | `/api/clientes/:id/reassign` | `PATCH /api/clientes/:id/reassign` | Bearer | SUPER_ADMIN | `ClientesController` |
| 22 | GET | `/api/super-admin/me` | `GET /api/super-admin/me` | Bearer | SUPER_ADMIN | `SuperAdminController` |
| 23 | PATCH | `/api/super-admin/me` | `PATCH /api/super-admin/me` | Bearer | SUPER_ADMIN | `SuperAdminController` |
| 24 | GET | `/api/super-admin/dashboard` | `GET /api/super-admin/dashboard` | Bearer | SUPER_ADMIN | `SuperAdminController` |
| 25 | POST | `/api/qr-codes` | `POST /api/qr-codes` | Bearer | VENDEDOR | `QrCodesVendorController` (rate-limited) |
| 26 | GET | `/api/qr-codes` | `GET /api/qr-codes` | Bearer | VENDEDOR | `QrCodesVendorController` |
| 27 | PATCH | `/api/qr-codes/:id/deactivate` | `PATCH /api/qr-codes/:id/deactivate` | Bearer | VENDEDOR | `QrCodesVendorController` |
| 28 | GET | `/api/admin/qr-codes` | `GET /api/admin/qr-codes` | Bearer | SUPER_ADMIN | `QrCodesAdminController` |
| 29 | PATCH | `/api/admin/qr-codes/:id/deactivate` | `PATCH /api/admin/qr-codes/:id/deactivate` | Bearer | SUPER_ADMIN | `QrCodesAdminController` |
| 30 | POST | `/api/link-invitacion` | `POST /api/link-invitacion` | Bearer | VENDEDOR | `LinkInvitacionVendorController` (rate-limited) |
| 31 | GET | `/api/link-invitacion` | `GET /api/link-invitacion` | Bearer | VENDEDOR | `LinkInvitacionVendorController` |
| 32 | PATCH | `/api/link-invitacion/:id/deactivate` | `PATCH /api/link-invitacion/:id/deactivate` | Bearer | VENDEDOR | `LinkInvitacionVendorController` |
| 33 | GET | `/api/admin/link-invitacion` | `GET /api/admin/link-invitacion` | Bearer | SUPER_ADMIN | `LinkInvitacionAdminController` |
| 34 | PATCH | `/api/admin/link-invitacion/:id/deactivate` | `PATCH /api/admin/link-invitacion/:id/deactivate` | Bearer | SUPER_ADMIN | `LinkInvitacionAdminController` |
| 35 | GET | `/api/admin/audit-logs` | `GET /api/admin/audit-logs` | Bearer | SUPER_ADMIN | `AuditLogAdminController` |
| 36 | GET | `/api/products` | (forwarded when products-service is built) | Optional | — | planned |
| 37 | GET | `/api/products/:id` | (forwarded) | Public | — | planned |
| 38 | GET | `/api/products/search` | (forwarded) | Public | — | planned |
| 39 | GET | `/api/categories` | (forwarded) | Public | — | planned |
| 40 | GET | `/api/brands` | (forwarded) | Public | — | planned |
| 41 | GET | `/api/orders` | (forwarded when orders-service is built) | Bearer | CLIENTE\|VENDEDOR | planned |
| 42 | POST | `/api/orders` | (forwarded) | Bearer | CLIENTE | planned |
| 43 | GET | `/api/orders/:id` | (forwarded) | Bearer | any auth | planned |
| 44 | PATCH | `/api/orders/:id/status` | (forwarded) | Bearer | VENDEDOR | planned |
| 45 | POST | `/api/orders/:id/cancelar` | (forwarded) | Bearer | CLIENTE | planned |
| 46 | POST | `/api/orders/:id/confirmar` | (forwarded) | Bearer | CLIENTE | planned |
| 47 | GET | `/api/cart` | (forwarded) | Bearer | CLIENTE | planned |
| 48 | POST | `/api/cart/items` | (forwarded) | Bearer | CLIENTE | planned |
| 49 | PATCH | `/api/cart/items/:id` | (forwarded) | Bearer | CLIENTE | planned |
| 50 | DELETE | `/api/cart/items/:id` | (forwarded) | Bearer | CLIENTE | planned |
| 51 | GET | `/api/deliveries` | (forwarded when entregas-service is built) | Bearer | VENDEDOR | planned |
| 52 | GET | `/api/deliveries/:id` | (forwarded) | Bearer | VENDEDOR\|ADMIN | planned |
| 53 | PATCH | `/api/deliveries/:id/status` | (forwarded) | Bearer | VENDEDOR | planned |
| 54 | GET | `/api/activity-logs` | (forwarded when notifications-service is built) | Bearer | ADMIN | planned |
| 55 | GET | `/api/health` | gateway-local health check | Public | — | new |

## Affected Areas

| Area | Why it will change |
|------|--------------------|
| `MicroServices/gateway/` | The whole project: add `tsconfig.json`, `nest-cli.json`, `Dockerfile`, real `src/main.ts`, `src/app.module.ts`, auth, proxy, routes, health, tests. |
| `MicroServices/gateway/package.json` | Add `@agua/contracts: workspace:*`, `@nestjs/axios`, `@nestjs/throttler`, `helmet`, `class-validator`, `class-transformer`, dev deps for testing. |
| `docker-compose.yml` | Add `gateway` service (port 3000), healthcheck, depends_on `usuario-service`. Probably add `kafka` and `mongo` if other MS get built at the same time — but for gateway MVP, only gateway container needed. |
| `MicroServices/usuario-service/Dockerfile` | Reference for the gateway Dockerfile (multi-stage, pnpm 11, node 22-alpine, openssl apk). The gateway has no Prisma so no `prisma generate` step. |
| `.env` and `.env.example` | Add `JWT_SECRET` and `JWT_REFRESH_SECRET` (must match usuario-service!), `USUARIO_SERVICE_URL=http://usuario-service:3001`, `PRODUCTS_SERVICE_URL`, `ORDERS_SERVICE_URL`, `ENTREGAS_SERVICE_URL`, `NOTIFICATIONS_SERVICE_URL`, `RATE_LIMIT_LOGIN_TTL=60`, `RATE_LIMIT_LOGIN_MAX=5`. |
| `contratosDTOs/api-gateway.json` | Drift: declares `/auth/*`, `/users/*`, `/qr/*`, etc. but the real paths are `/api/auth/*`, `/api/users/profile`, `/api/qr-codes`, etc. Plus it omits `/vendedores/*`, `/clientes/*`, `/link-invitacion/*`, `/admin/*` that the gateway MUST route. Update the contract to match real routes before/during implementation. |
| `MicroServices/gateway/src/routes/*.routes.ts` | Delete the comment-only files. Routing goes through a single `ProxyService` + declarative prefix map, not one file per route family. |
| `MicroServices/gateway/{src/health/` | Malformed directory with literal `health}` filename. Cleanup. |
| `MicroServices/notifications-service/{src/health/` | Same shell-glob leftover, not gateway-owned but in the same shape. |
| `packages/contracts/src/index.ts` | Already exports everything the gateway needs (enums, common DTOs). No change required for MVP. |
| `SPEC.md` section 4.1 / 4.3 | Already documents gateway as port 3000, but mentions "HTTP REST vía Gateway" which is the right mental model. Section 3 stack says "Cache (Redis) sesiones JWT" — the gateway won't use Redis for JWT sessions in MVP (validates signature locally with shared secret). Worth a small note. |

## Approaches

The core design question: **how does the gateway actually forward an HTTP request to a downstream service?**

### 1. NestJS controllers + HttpService (axios) per route family

Build a `ProxyService` injected with `@nestjs/axios` (or native `fetch`/`undici`). Each route family has a NestJS controller that:
- Validates the JWT (using `@agua/contracts`-shaped logic or a small local strategy that only checks signature against `JWT_SECRET` and decodes the payload — no DB hit, since the gateway's job is to pass identity, not re-fetch it from `usuario-service`).
- Calls `ProxyService.forward(req, targetBaseUrl)` which copies method, headers (minus hop-by-hop), query, body and pipes back the response (status, headers, body).
- Injects `x-user-id`, `x-user-email`, `x-user-role` headers into the forwarded request from the decoded JWT payload.
- Throttles sensitive endpoints with `@nestjs/throttler`.
- Catches downstream errors and emits a clean error envelope (the gateway never leaks downstream stack traces).

Routing config is a single declarative table (path-prefix → base-URL + whether auth is required) used by the controllers, or a wildcard `*` controller that delegates to `ProxyService` based on the prefix map.

- **Pros**: Fully NestJS-idiomatic, easy to test with `Test.createTestingModule`, integrates with `ValidationPipe`, allows NestJS guards/decorators on the gateway's own endpoints (e.g. health), easy to add tracing/logging via interceptors, the same module pattern as the rest of the monorepo.
- **Cons**: Have to manually pipe the response body (works fine for JSON; for streaming/binary it's more code).
- **Effort**: Medium.

### 2. express-http-proxy as Express middleware

Use the `express-http-middleware` package via a `MiddlewareConsumer.apply()` call. The gateway configures one proxy per prefix and lets the middleware do request/response piping.

- **Pros**: Less code, battle-tested for binary streams, well-known pattern.
- **Cons**: Bypasses NestJS — no DI, no guards, no throttler integration, no `ValidationPipe`, harder to test, harder to inject custom headers in a typed way, doesn't match the rest of the monorepo's pattern.
- **Effort**: Low (initially) → grows to Medium when you bolt on auth + rate limiting + custom headers.

### 3. @nestjs/microservices with Transport.TCP as a passthrough

Configure the gateway as a NestJS microservice that receives TCP messages from other MS and proxies them. Doesn't fit — the gateway is an HTTP ingress, not a TCP consumer. The TCP bus is for MS-to-MS sync calls and isn't wired anywhere yet.

- **Pros**: None for this scope. Would be architecturally consistent with the TCP+Kafka decision if the gateway were ALSO an MS bus participant.
- **Cons**: Wrong tool. Adds @nestjs/microservices overhead without benefit. The gateway receives HTTP from browsers/mobile clients — there is no TCP client.
- **Effort**: High (and wrong).

### 4. API Gateway off-the-shelf (Kong, Traefik, NGINX with custom Lua, NestJS hybrid w/ Express gateway layer)

Replace the custom gateway with an infra-level proxy. Kong or Traefik handle routing, JWT, rate limit, observability.

- **Pros**: Production-grade, less custom code, mature.
- **Cons**: Out of scope for MVP. The project is a monorepo with one custom gateway slot; introducing Kong means new infra, new config management, new operational surface. The current `docker-compose.yml` doesn't even have a reverse proxy.
- **Effort**: High (and not what the user asked for).

## Recommendation

**Approach 1 — NestJS controllers + a single `ProxyService` (axios / undici) with a declarative prefix map.**

Concretely:

- One `AppModule` that wires `ConfigModule.forRoot()`, `HttpModule` (`@nestjs/axios`), `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])` and a `ProxyModule`.
- One `JwtAuthGuard` (local, no DB hit) that:
  1. Reads `Authorization: Bearer …` and verifies with the same `JWT_SECRET` as `usuario-service` (`jsonwebtoken` or `@nestjs/jwt`).
  2. Attaches `{ userId, email, role }` to `request.user`.
  3. Skips when `@Public()` is set on the route.
- One `ProxyService.forward(req, target)` that:
  1. Strips hop-by-hop headers (`host`, `connection`, `content-length` etc.).
  2. Adds `x-user-id`, `x-user-email`, `x-user-role` from `req.user` (if present).
  3. Calls downstream with `firstValueFrom(httpService.request({ method, url, data, headers, params, responseType: 'stream' }))` and pipes the response back.
- A declarative ROUTES table consumed by a generic `ProxyController` that:
  - Accepts `ALL` methods for a given prefix and matches against the table.
  - Applies `@Public()` (or `@Throttle({ default: { limit: 5, ttl: 60_000 } })`) per route.
  - Forwards to the configured target.
- Per-MS target URLs come from env (`USUARIO_SERVICE_URL`, `PRODUCTS_SERVICE_URL`, `ORDERS_SERVICE_URL`, `ENTREGAS_SERVICE_URL`, `NOTIFICATIONS_SERVICE_URL`).
- A `HealthController` at `/api/health` (and `/api/health/ready` deep) that returns `{ status: 'ok', upstream: { usuario: 'up', products: 'down' } }` by hitting each MS's own `/api/health` (or 5s timeout).
- `@nestjs/throttler` applied globally with stricter limits on `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/validate`, `POST /api/qr-codes`, `POST /api/link-invitacion` (per the spec: 5 attempts/min for login).
- CORS enabled (origin from env `CORS_ORIGINS`).
- `helmet` for standard security headers.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` for any gateway-side DTOs (e.g. health response).
- `RpcExceptionFilter` reuse or simpler gateway-local equivalent for error envelope.

This stays inside the monorepo's NestJS + patterns, is unit-testable, and matches the AGENTS.md rules (SRP per module, DIP via `@agua/contracts` enums, ISP — each MS route family is a separate concern, OCP — new prefixes added by extending the table).

## Risks

- **JWT secret drift between gateway and `usuario-service`.** The gateway must use the same `JWT_SECRET` and `JWT_REFRESH_SECRET`. If they diverge, every protected request 401s. Mitigation: shared `.env`, fail-fast at boot if secret is missing, document in `.env.example`. The gateway does NOT need access to the refresh secret in MVP — it only validates access tokens.
- **Token replay / staleness.** Without a DB hit, the gateway can't know if a user was deactivated mid-session. The current `JwtStrategy.validate()` in `usuario-service` does a DB check on every request, so the MS still catches that. The gateway trusts the JWT, the MS is the final word. This is the standard "stateless gateway" trade-off; it's fine for MVP because the JWT TTL is 1d and the MS-side guard will reject inactive users.
- **Path-prefix drift.** The `api-gateway.json` contract declares `/auth/*` but the real service is `/api/auth/*`. If the proposal/spec work is sloppy, the gateway will route to non-existent paths. Mitigation: treat `contratosDTOs/api-gateway.json` as the source of truth, fix it BEFORE implementation starts (see "Affected Areas" — it's listed as a target for update).
- **Body / header streaming.** Express' default body parser limits JSON to 100kb. The gateway must NOT re-buffer large bodies. Using `responseType: 'stream'` + piping avoids this. PATCH endpoints with file uploads (if any are added later) need special handling.
- **Downstream timeout.** If `products-service` hangs, the gateway hangs. Mitigation: a configurable per-target timeout (default 10s) via `AbortController` passed into `httpService.request()`.
- **Rate-limit memory vs Redis.** `@nestjs/throttler` defaults to in-memory. Behind a single gateway instance that's fine. If the gateway ever scales horizontally, throttle counters drift. Mitigation: switch to Redis storage in the same Redis we already have running, or accept the trade-off for MVP and document it.
- **Missing controllers in non-usuario MS.** Even if the gateway routes to `products-service:3003`, that service has no controllers. Forwarded requests will get 404. The gateway itself can still come up and route `/auth/*` correctly; the contract is "the gateway is ready when its MS arrive", not "the gateway waits for its MS to be built". This is acceptable but should be explicit in the change so the orchestrator / user doesn't think we're blocking on the other MS.
- **The malformed `{src/health/` directories** in both `gateway` and `notifications-service` are leftover shell-glob artifacts (a `{` was used instead of `/`). Harmless but worth cleaning up so `find src` doesn't trip on them.
- **TCP+Kafka decision does NOT affect the gateway's HTTP ingress path.** If a future iteration wants the gateway to also produce Kafka events (e.g. emit a `GatewayRequest` audit event), that's a separate change. For the MVP, the gateway is HTTP-only.

## Ready for Proposal

**Yes.** The next phase (proposal) can be launched with a clear brief. The orchestrator should tell the user:

- We are about to design the **api-gateway MVP** (port 3000): JWT validation + HTTP proxying + throttling + health.
- The gateway will be ready for `usuario-service` (live) and stubbed for the other 4 MS (forward-only, no waiting).
- We need to fix the `contratosDTOs/api-gateway.json` drift (path prefix `/api`, missing route families) as part of the same change.
- The TCP+Kafka decision is **not** in scope for the gateway MVP — that's MS-to-MS and the gateway is HTTP-internal.
- Effort estimate: **Medium**. Recommend splitting into 3 chained PRs: (1) Foundation — module bootstrap, config, JWT guard, health; (2) Proxy — `ProxyService` + `ProxyController` + declarative route table for `usuario-service` only; (3) Wire-up — rate limiting, docker-compose, throttler, full route table including the planned other MS.

Suggested first question for the user (one at a time, per persona): **"Do you want to fix the `api-gateway.json` contract drift as part of this change, or in a separate prior change?"**
