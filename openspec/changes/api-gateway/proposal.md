# Proposal: API Gateway

## Intent

Turn `MicroServices/gateway/` from a stub into the versioned HTTP facade on port 3000. AG-101 is the validated source of truth, so this supersedes the earlier HTTP proxy exploration: public routes use `/api/v1/{service}/{action}` and map to downstream TCP message patterns/client proxies.

## Scope

### In Scope
- Implement NestJS gateway endpoints shaped as `/api/v1/{service}/{action}`.
- Map HTTP actions to TCP client proxies/message patterns for `usuario-service` first, then planned services.
- Add app-layer anti-DDoS baseline: `helmet`, throttling/rate limits, request timeouts, payload/body limits, and stricter policies for auth/QR/link endpoints.
- Correct `contratosDTOs/api-gateway.json` to the versioned action facade; remove stale `/auth/*` and plain `/api/*` proxy framing.
- Deliver as forced chained PRs under the 400-line review budget.

### Out of Scope
- Implementing products/orders/entregas/notifications business logic.
- Preserving downstream `usuario-service` `/api/*` paths as the public contract.
- Replacing the custom gateway with Kong/Traefik/NGINX.

## Capabilities

### New Capabilities
- `api-gateway`: versioned HTTP facade, action routing, TCP client dispatch, JWT/role enforcement, anti-DDoS controls, health, and contract alignment.

### Modified Capabilities
- None. Existing service capabilities keep behavior; the gateway adapts public actions to internal message patterns.

## Approach

Use NestJS with `ConfigModule`, `ClientsModule`/TCP proxies, `ThrottlerModule`, `helmet`, strict body limits, request timeout middleware, and `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Define an action registry that maps `POST /api/v1/auth/login`-style public actions to typed TCP patterns. `usuario-service` remains the reference for auth/user behavior, but route preservation is no longer the goal; action mapping is.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `MicroServices/gateway/` | Modified | Bootstrap, versioned controllers, action registry, TCP clients, guards, throttling, health, tests. |
| `MicroServices/gateway/package.json` | Modified | Add contracts, microservices/TCP, throttler, security, validation deps. |
| `docker-compose.yml` | Modified | Add gateway on port 3000 with downstream service connectivity. |
| `.env.example` / env docs | Modified | Add TCP hosts/ports, JWT secret, timeout, body limit, rate-limit config. |
| `contratosDTOs/api-gateway.json` | Modified | Align to `/api/v1/{service}/{action}` contract. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| TCP handlers missing downstream | High | Start with `usuario-service` reference patterns; mark other services forward-ready. |
| Contract drift from AG-101 | Med | Update proposal/spec/design/tasks and `api-gateway.json` before apply. |
| Security limits too strict | Med | Configurable limits with stricter endpoint-specific overrides. |
| Review size exceeds 400 lines | High | Force chained PRs with autonomous slices. |

## Rollback Plan

Revert chained PRs in reverse order. Remove gateway from `docker-compose.yml` first if runtime issues occur, then revert contract/action-routing/security slices. Existing downstream services remain directly reachable during rollback.

## Dependencies

- Jira AG-90/AG-100/AG-101 as planning truth.
- `usuario-service` TCP message handlers/client contract for auth/user actions.
- Shared JWT secret and workspace `@agua/contracts` DTOs/enums.

## Success Criteria

- [ ] Gateway serves `/api/health` on port 3000.
- [ ] Public contract uses `/api/v1/{service}/{action}` only.
- [ ] Versioned HTTP actions dispatch to TCP message patterns/client proxies.
- [ ] Protected actions reject missing/invalid JWT and pass typed identity context.
- [ ] Helmet, rate limits, timeouts, body limits, and stricter sensitive-endpoint policies are active.
- [ ] `contratosDTOs/api-gateway.json` matches AG-101 and contains no stale `/auth/*` or plain proxy framing.
