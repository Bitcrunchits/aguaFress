# API Gateway Specification

## Purpose

Define the gateway as the only public HTTP ingress on port 3000. The frontend communicates with the gateway over HTTP/JSON using `/api/v1/{service}/{action}`; the gateway communicates with microservices exclusively through configured TCP message patterns. The gateway is not a plain downstream HTTP path proxy.

## Source of Truth

This spec supersedes the earlier plain HTTP proxy `/api/*` framing from exploration/design drafts. AG-101 is the accepted source of truth for gateway architecture: Frontend → Gateway is HTTP/JSON through `/api/v1/{service}/{action}`, while Gateway → Microservices is TCP action routing through explicit mappings/message patterns. The gateway MUST NOT be implemented as an arbitrary raw HTTP path proxy, and MUST NOT use HTTP as the internal gateway-to-microservice transport. AG-100 abuse controls are part of the same gateway contract.

## Requirements

### Requirement: Versioned public action contract

The gateway MUST expose HTTP/JSON application ingress for the frontend on port 3000 under `/api/v1/{service}/{action}`. Legacy paths such as `/auth/login`, `/api/auth/login`, and arbitrary `/api/*` proxy paths MUST NOT be canonical gateway actions.

#### Scenario: Versioned action is accepted

- GIVEN the gateway is running on port 3000
- WHEN a client calls `POST /api/v1/auth/login`
- THEN the gateway MUST evaluate the `auth.login` action contract

#### Scenario: Legacy auth paths are not canonical

- GIVEN a client calls `/auth/login` or `/api/auth/login`
- WHEN the request reaches the gateway
- THEN the gateway MUST NOT treat that path as the canonical login action

### Requirement: TCP action routing

The gateway MUST map `{service, action}` to an explicitly configured TCP client and message pattern. It MUST send body, query, params, and authenticated context as a typed TCP command payload, not by preserving raw HTTP downstream paths. All gateway-to-microservice communication MUST use TCP, not HTTP.

#### Scenario: Mapped action dispatches command

- GIVEN `auth.login` is mapped to a TCP pattern
- WHEN `POST /api/v1/auth/login` includes a valid body
- THEN the gateway MUST send one internal command payload to the configured client

#### Scenario: Internal HTTP is not used

- GIVEN a mapped gateway action targets a microservice
- WHEN the gateway dispatches the action
- THEN dispatch MUST use the configured TCP message pattern
- AND MUST NOT call the microservice through HTTP

#### Scenario: Missing mapping is controlled

- GIVEN no configured mapping exists for `foo.bar`
- WHEN a client calls `/api/v1/foo/bar`
- THEN the gateway MUST return a controlled client error
- AND MUST NOT call an arbitrary downstream target

### Requirement: Authentication and role enforcement

The gateway MUST allow unauthenticated access only for actions explicitly declared public. Protected actions MUST validate JWT before TCP dispatch, enforce declared roles, and preserve JWT payload compatibility with `{ sub, email, role, jti? }`.

#### Scenario: Explicit public action bypasses auth

- GIVEN `auth.login` is declared public
- WHEN a client calls `/api/v1/auth/login` without a token
- THEN auth MUST be bypassed only for that action

#### Scenario: Protected action rejects missing token

- GIVEN `users.profile` is protected
- WHEN a client calls `/api/v1/users/profile` without a valid JWT
- THEN the gateway MUST return an authentication failure
- AND MUST NOT dispatch a TCP command

#### Scenario: Role mismatch is rejected

- GIVEN an action requires an admin role
- WHEN a valid JWT has a non-admin `role`
- THEN the gateway MUST return an authorization failure before TCP dispatch

### Requirement: Abuse controls and bounded work

The gateway MUST apply HTTP security headers, request throttling, downstream TCP timeout limits, and payload/body-size limits. Sensitive actions including auth login/register/refresh/validate, QR creation, and invitation-link creation MUST have stricter throttling. Rejected, throttled, oversized, or timed-out requests MUST NOT create unbounded downstream work.

#### Scenario: Security headers are applied

- GIVEN any HTTP response from the gateway
- WHEN the response is returned
- THEN Helmet-equivalent security headers MUST be present

#### Scenario: Sensitive action is throttled

- GIVEN repeated login requests exceed the configured limit
- WHEN another `/api/v1/auth/login` request arrives in the active window
- THEN the gateway MUST return a throttling response
- AND MUST NOT dispatch that request downstream

#### Scenario: Oversized payload is rejected

- GIVEN a request body exceeds the configured gateway limit
- WHEN the request reaches `/api/v1/{service}/{action}`
- THEN the gateway MUST reject it before TCP dispatch

#### Scenario: TCP timeout is bounded

- GIVEN a downstream TCP call exceeds the configured timeout
- WHEN the gateway handles the action
- THEN the gateway MUST return a timeout response without spawning unbounded retries

### Requirement: Health and readiness

The gateway MUST expose a public health endpoint that reports gateway availability and MAY include downstream readiness. Health output MUST NOT leak secrets, tokens, internal credentials, or raw connection strings.

#### Scenario: Health is public and safe

- GIVEN the gateway is running
- WHEN a client calls `GET /api/health` without credentials
- THEN the response MUST indicate gateway availability without secret data

#### Scenario: Downstream readiness is sanitized

- GIVEN downstream readiness is enabled
- WHEN health is requested
- THEN downstream status MAY be included as sanitized service readiness only

### Requirement: Contract alignment

`contratosDTOs/api-gateway.json` MUST document `/api/v1/{service}/{action}` actions and planned/live service-action families. Stale `/auth/*` entries and old plain `/api/*` proxy contract entries MUST be corrected.

#### Scenario: Contract lists action families

- GIVEN the API gateway contract is reviewed
- WHEN live and planned routes are compared
- THEN the contract MUST list versioned action families for auth, users, vendedores, clientes, super-admin, qr-codes, link-invitacion, products, orders, cart, deliveries, notifications, and health

#### Scenario: Contract excludes stale proxy framing

- GIVEN the contract is reviewed for legacy paths
- WHEN `/auth/*` or arbitrary `/api/*` proxy entries are found
- THEN those entries MUST be corrected to the versioned action contract
