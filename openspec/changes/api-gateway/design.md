# Design: API Gateway

## Technical Approach

Build `MicroServices/gateway/` as the NestJS public HTTP/JSON facade on port 3000. Canonical actions are `POST|GET|PATCH|DELETE /api/v1/{service}/{action}`, resolved through a typed registry to TCP clients/message patterns. Validate shape, JWT, roles, throttles, body size, and TCP timeout before dispatch. Never preserve arbitrary downstream HTTP paths or call microservices over HTTP.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Boundary split | HTTP external, TCP internal | HTTP proxy, direct frontend-to-service | Matches AG-101 and keeps public API stable. |
| Action routing | Explicit `ActionRegistry` keyed by `{service}.{action}` | Raw `/api/*`, dynamic targets | Prevents target injection, drift, and accidental exposure. |
| Pre-dispatch policy | Validation/auth/roles/limits before TCP | Downstream-only rejection | Fails fast and avoids wasted downstream work. |
| Bounded work | Helmet, throttles, payload limits, TCP timeout, no unbounded retries | Best-effort only | Implements AG-100 at ingress. |
| Error mapping | Controlled HTTP errors for mapping/auth/RPC/timeout failures | Raw TCP/RPC leakage | Keeps the client contract predictable. |

## Data Flow

```text
Frontend HTTP/JSON
  -> GatewayController: /api/v1/:service/:action
  -> body/query/params validation + payload limit + helmet headers
  -> ActionResolver finds explicit registry entry
  -> public? skip JWT : JwtAuthGuard verifies { sub, email, role, jti? }
  -> RolesGuard checks registry roles; Throttler checks global/sensitive policy
  -> TcpDispatcher sends { body, query, params, user, requestId } to pattern
  -> Microservice @MessagePattern handler processes TCP command
  -> RPC result/error maps back to HTTP response/status
```

## File Changes

| File | Action | Description |
|---|---|---|
| `MicroServices/gateway/src/main.ts` | Replace | Bootstrap, `api` prefix, `ValidationPipe`, `helmet`, CORS, body limits, Logger, port 3000. |
| `MicroServices/gateway/src/app.module.ts` | Create | Wire config, TCP clients, throttling, auth, actions, health. |
| `MicroServices/gateway/src/config/env.config.ts` | Create | Validate JWT, TCP hosts/ports, body limit, throttles, TCP timeout. |
| `MicroServices/gateway/src/actions/action-registry.ts` | Create | Const-object action mappings. |
| `MicroServices/gateway/src/actions/action.controller.ts` | Create | Versioned controller and pre-dispatch policy. |
| `MicroServices/gateway/src/actions/action-resolver.service.ts` | Create | Controlled missing mapping; no dynamic targets. |
| `MicroServices/gateway/src/tcp/tcp-clients.module.ts` | Create | Named TCP proxies for all services. |
| `MicroServices/gateway/src/tcp/tcp-dispatcher.service.ts` | Create | Typed command send, timeout, RPC error mapping. |
| `MicroServices/gateway/src/auth/*` | Create | `JwtAuthGuard`, `RolesGuard`, decorators, JWT payload/context types using `UserRole` from `@agua/contracts`. |
| `MicroServices/gateway/src/security/*` | Create | Sensitive-action throttles and limit helpers. |
| `MicroServices/gateway/src/health/*` | Create | Public `GET /api/health`, sanitized optional TCP readiness. |
| `MicroServices/gateway/src/routes/*.routes.ts` | Delete | Comment-only stale HTTP proxy route hints. |
| `MicroServices/gateway/test/**/*.spec.ts` | Create | Jest unit/integration/contract tests. |
| `contratosDTOs/api-gateway.json` | Modify | Document `/api/v1/{service}/{action}` families; remove stale `/auth/*` and raw proxy framing. |
| `MicroServices/gateway/package.json` | Modify | Add `@agua/contracts`, `@nestjs/config`, `@nestjs/jwt`, `@nestjs/throttler`, `helmet`, `class-validator`, `class-transformer`, `supertest`. |
| `MicroServices/gateway/tsconfig.json`, `nest-cli.json`, `Dockerfile` | Create | Strict Nest build and Node 22 Alpine runtime without Prisma. |
| `docker-compose.yml`, `.env.example` | Modify | Add gateway service/env and downstream TCP host/port variables. |

## Interfaces / Contracts

Const objects are the runtime source of truth; extracted types avoid direct literal unions. Interfaces are flat; no `any`.

```ts
export const GATEWAY_SERVICE = { AUTH: 'auth', USERS: 'users' } as const;
export type GatewayService = (typeof GATEWAY_SERVICE)[keyof typeof GATEWAY_SERVICE];

export const TCP_CLIENT = { USUARIO: 'USUARIO_TCP_CLIENT' } as const;
export type TcpClientName = (typeof TCP_CLIENT)[keyof typeof TCP_CLIENT];

export interface GatewayActionDefinition {
  readonly service: GatewayService;
  readonly action: string;
  readonly client: TcpClientName;
  readonly pattern: string;
  readonly isPublic: boolean;
  readonly roles: readonly UserRole[];
  readonly throttlePolicy: ThrottlePolicyName;
}

export interface GatewayCommandPayload {
  readonly body: unknown;
  readonly query: Record<string, string | string[]>;
  readonly params: Record<string, string>;
  readonly user: GatewayUserContext | null;
  readonly requestId: string;
}
```

Initial live mappings target `usuario-service` TCP handlers for auth/users/vendedores/clientes/super-admin/qr-codes/link-invitacion/audit-log. Planned families return controlled unmapped/unavailable responses until TCP handlers are ready.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Const registry lookup, missing mapping, command payload shaping, timeout/error mapper | Jest with mocked `ClientProxy`; no `any`; assert no dynamic URL/HTTP client path exists. |
| Integration | `POST /api/v1/auth/login`, protected `users.profile`, role denial, `/api/health` | `@nestjs/testing` + `supertest`; override TCP clients with deterministic mocks. |
| Security | Helmet headers, global/sensitive rate limits, oversized payload rejection, TCP timeout | Supertest/Jest fake timers; assert no TCP `send` on rejected requests. |
| Contract | `contratosDTOs/api-gateway.json` lists versioned action families and excludes `/auth/*`/raw `/api/*` proxy entries | JSON assertions in gateway contract spec. |
| Regression | Internal HTTP proxy behavior is absent | Tests fail if `HttpModule`, axios proxy service, or arbitrary `/api/*` catch-all is introduced. |

## Migration / Rollout

No DB migration required. Roll out as forced chained PRs: foundation/security/health, action registry + TCP dispatch, contract JSON + Docker/env, then downstream TCP handler readiness. Actions become live only after matching TCP `@MessagePattern` handlers exist.

## Open Questions

None.
