# Tasks: API Gateway

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1300 total; target <400 per chained PR |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Foundation → PR 2 Security → PR 3 TCP routing → PR 4 Contract/Docker/tests |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |
| Tracker branch | `adrian/api-gateway` |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Never merge to `develop` without explicit user order; only child branches may merge into tracker branch `adrian/api-gateway`.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Bootstrap `/api`, config validation, health | PR 1 | Base = `adrian/api-gateway`; tests included. |
| 2 | Auth/security boundaries and AG-100 controls | PR 2 | Base = PR 1 branch; tests included. |
| 3 | Explicit TCP action registry and dispatcher | PR 3 | Base = PR 2 branch; no HTTP proxy behavior. |
| 4 | Contract JSON, Docker/env, e2e verification | PR 4 | Base = PR 3 branch; final alignment slice. |

## Phase 1: PR 1 — Foundation, Config, Health

- [x] 1.1 RED: Add Jest specs for `GET /api/health`, `/api/v1/:service/:action` routing shape, and env fail-fast for JWT, TCP hosts/ports, timeouts, rate limits, payload limit.
- [x] 1.2 GREEN: Replace `MicroServices/gateway/src/main.ts` with `/api` prefix, strict `ValidationPipe`, CORS, body limit wiring, Logger, and port `3000`.
- [x] 1.3 GREEN: Create `src/app.module.ts`, `src/config/env.config.ts`, `nest-cli.json`, `tsconfig.json`, and package deps for config, JWT, throttler, microservices, validation, contracts.
- [x] 1.4 GREEN: Create `src/health/*` public `GET /api/health` with sanitized readiness only; PR1 review fix deleted stale comment-only route stubs.

## Phase 2: PR 2 — Security, Auth, Abuse Controls

- [ ] 2.1 RED: Add tests for helmet headers, CORS, oversized body rejection, missing/invalid JWT, role denial, public `auth.login`, and no TCP dispatch on rejection.
- [ ] 2.2 GREEN: Add `helmet`, body/payload limit, global throttling, request timeout middleware, and sensitive action throttle policies in `src/security/*`.
- [ ] 2.3 GREEN: Create `src/auth/*` JWT payload/context types `{ sub, email, role, jti? }`, `JwtAuthGuard`, `RolesGuard`, decorators, using `UserRole` from `@agua/contracts`.
- [ ] 2.4 GREEN: Add explicit public action declarations and role metadata hooks consumed before dispatch; REFACTOR auth/security modules to keep SRP boundaries.

## Phase 3: PR 3 — TCP Action Routing

- [ ] 3.1 RED: Add unit/integration tests for const-object registry lookup, missing mapping client error, typed command payload, TCP timeout, bounded retry, and absence of `HttpModule`/axios/raw `/api/*` proxy.
- [ ] 3.2 GREEN: Create `src/actions/action-registry.ts` with const-object first/type extraction pattern for live usuario actions and planned unavailable families.
- [ ] 3.3 GREEN: Create `src/actions/action.controller.ts` for `/api/v1/:service/:action` and `action-resolver.service.ts` with controlled unmapped/unavailable errors.
- [ ] 3.4 GREEN: Create `src/tcp/tcp-clients.module.ts` and `tcp-dispatcher.service.ts` using Nest `ClientProxy`, typed `{ body, query, params, user, requestId }`, timeout, and bounded retry/no unbounded work.
- [ ] 3.5 REFACTOR: Stale `src/routes/*.routes.ts` cleanup was completed during PR1 review fixes; remaining PR3 work is TCP-only action dispatch verification.

## Phase 4: PR 4 — Contracts, Docker, Verification

- [ ] 4.1 RED: Add contract/e2e tests for spec scenarios: health, versioned action accepted, legacy paths non-canonical, protected action rejection, throttle, oversized payload, timeout.
- [ ] 4.2 GREEN: Update `contratosDTOs/api-gateway.json` to `/api/v1/{service}/{action}` families and remove stale `/auth/*` or raw `/api/*` proxy framing.
- [ ] 4.3 GREEN: Add `MicroServices/gateway/Dockerfile`, compose gateway service on `3000:3000`, and env examples for TCP target hosts/ports, JWT, timeouts, rate limits, payload size.
- [ ] 4.4 REFACTOR/VERIFY: Keep `SPEC.md` and OpenSpec aligned if implementation changes; run gateway Jest unit/integration/e2e suite and build per PR slice.
