# Gateway Deliveries Routing Spec

## Purpose

Define HTTP routing, authorization, and error handling for the `deliveries` action family in the API gateway. The gateway exposes three deliveries actions (`list`, `get`, `update-status`) via a single `/api/v1/deliveries/:action` endpoint, dispatching to `entregas-service` over TCP.

## Requirements

### Requirement: Action mapping

The gateway MUST expose deliveries only through `/api/v1/deliveries/{action}` and MUST NOT expose `entregas-service` HTTP directly. The following actions MUST be mapped:

| Action | HTTP Method | TCP target | Description |
|--------|-------------|------------|-------------|
| `list` | `GET` / `POST` | `deliveries.list` | List deliveries for authenticated vendedor |
| `get` | `GET` | `deliveries.get` | Get single delivery by ID |
| `update-status` | `PATCH` / `PUT` | `deliveries.update-status` | Update delivery status (PENDIENTE → EN_CAMINO → ENTREGADA) |

#### Scenario: List deliveries via gateway

- GIVEN a configured `/api/v1/deliveries/list` endpoint
- WHEN a vendedor with valid JWT sends a GET request
- THEN gateway MUST dispatch TCP message `deliveries.list` to `entregas-service`
- AND forward the JWT `userId` and `role` as trusted context

#### Scenario: Get single delivery via gateway

- GIVEN a configured `/api/v1/deliveries/get` endpoint
- WHEN a vendedor with valid JWT sends a GET request with `?id=del-123`
- THEN gateway MUST dispatch TCP message `deliveries.get` to `entregas-service`
- AND forward `id: "del-123"` in the TCP payload

#### Scenario: Update delivery status via gateway

- GIVEN a configured `/api/v1/deliveries/update-status` endpoint
- WHEN a vendedor with valid JWT sends a PATCH request with body `{ estado: "EN_CAMINO", notas: "Saliendo" }`
- THEN gateway MUST dispatch TCP message `deliveries.update-status` to `entregas-service`
- AND forward the body fields (`estado`, `notas`) in the TCP payload

### Requirement: JWT required for all deliveries actions

All three deliveries actions are protected. The gateway MUST reject requests without a valid JWT before any TCP dispatch to `entregas-service`.

#### Scenario: Missing JWT returns 401

- GIVEN a request to `/api/v1/deliveries/list` with no `Authorization` header
- WHEN the gateway receives the request
- THEN the gateway MUST return `401 Unauthorized`
- AND MUST NOT dispatch any TCP message to `entregas-service`

#### Scenario: Invalid JWT returns 401

- GIVEN a request to `/api/v1/deliveries/get?id=del-1` with `Authorization: Bearer invalid-token`
- WHEN the gateway validates the JWT
- THEN the gateway MUST return `401 Unauthorized`
- AND MUST NOT dispatch any TCP message to `entregas-service`

### Requirement: Role vendedor enforced for all deliveries actions

Deliveries are a vendedor-only domain. Requests authenticated with `cliente` role MUST be rejected before TCP dispatch.

#### Scenario: Cliente role returns 403

- GIVEN a request to `/api/v1/deliveries/update-status` with a valid JWT for role `cliente`
- WHEN the gateway evaluates the role guard
- THEN the gateway MUST return `403 Forbidden`
- AND MUST NOT dispatch any TCP message to `entregas-service`

#### Scenario: Vendedor role allowed

- GIVEN a request to `/api/v1/deliveries/list` with a valid JWT for role `vendedor`
- WHEN the gateway evaluates the role guard
- THEN the gateway MUST allow the request
- AND dispatch TCP message `deliveries.list` to `entregas-service`

### Requirement: Body identity sanitization

The gateway MUST NOT forward a `userId` field from the request body to `entregas-service`. The authenticated identity source is the JWT token, not the request payload.

#### Scenario: Body userId is stripped before dispatch

- GIVEN a request to `/api/v1/deliveries/update-status` with body `{ estado: "ENTREGADA", userId: "evil-hacker" }`
- WHEN the gateway dispatches the TCP message
- THEN the TCP payload MUST NOT include `userId`
- AND the `actorUserId` forwarded as trusted context MUST be the JWT `sub` claim, NOT the body value

### Requirement: Controlled failures

Unmapped actions and authorization failures MUST return predictable HTTP status codes without leaking internal state or dispatching to unintended targets.

#### Scenario: Unknown action returns 404

- GIVEN a request to `/api/v1/deliveries/unknown-action`
- WHEN no action mapping exists for `unknown-action`
- THEN the gateway MUST return `404 Not Found`
- AND the response body MUST indicate the action is not recognized
- AND MUST NOT dispatch any TCP message

#### Scenario: Unauthenticated request returns 401 before any processing

- GIVEN a protected deliveries action
- WHEN no valid JWT is present
- THEN the gateway MUST reject with `401 Unauthorized`
- AND MUST NOT reveal whether the action exists or not (consistent error message for all protected actions)
