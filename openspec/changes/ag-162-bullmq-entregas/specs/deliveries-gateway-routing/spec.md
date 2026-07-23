# Delta for Deliveries Gateway Routing

## ADDED Requirements

### Requirement: Async update-status idempotency contract

The gateway MUST require an idempotency key for `deliveries.update-status` and MUST pass the authenticated actor context plus normalized payload to the async command without trusting body identity.

#### Scenario: Header key accepted

- GIVEN a vendedor sends `Idempotency-Key` header with a valid `deliveries.update-status` payload
- WHEN gateway authorization succeeds
- THEN the gateway MUST enqueue a `deliveries.update_status` BullMQ job
- AND the `202 Accepted` response MUST include `jobId`, `trackingId`, `status: "PENDING"`, and `statusUrl`

#### Scenario: Body key accepted

- GIVEN a vendedor sends `idempotencyKey` in the JSON body with a valid update-status payload
- WHEN gateway authorization succeeds
- THEN the gateway MUST use the body `idempotencyKey` as the async idempotency key
- AND MUST still ignore or strip any body `userId` field

#### Scenario: Missing key rejected

- GIVEN a vendedor calls `/api/v1/deliveries/update-status` without `Idempotency-Key` header or body `idempotencyKey`
- WHEN gateway authorization succeeds
- THEN the gateway MUST reject the request before enqueueing
- AND MUST return `400 Bad Request`

#### Scenario: Idempotency key mismatch

- GIVEN a vendedor sends both `Idempotency-Key` header and body `idempotencyKey` with different values
- WHEN the gateway validates the request
- THEN the gateway MUST reject the request as conflicting
- AND MUST return `400 Bad Request` with a description of the conflict

## MODIFIED Requirements

### Requirement: Action mapping

The gateway MUST expose deliveries only through `/api/v1/deliveries/{action}` and MUST NOT expose entregas-service HTTP directly. The gateway MUST route only `deliveries.update-status` through Redis/BullMQ and MUST keep other delivery operations on mapped TCP.
(Previously: all delivery actions were synchronous TCP.)

#### Scenario: Deliveries list/get remain TCP

- GIVEN a vendedor calls `/api/v1/deliveries/list` or `/api/v1/deliveries/get`
- WHEN gateway authorization succeeds
- THEN the gateway MUST dispatch mapped TCP to entregas-service
- AND MUST NOT enqueue these operations as BullMQ jobs

#### Scenario: Deliveries update-status becomes async

- GIVEN a vendedor calls `/api/v1/deliveries/update-status` with a valid payload and idempotency key
- WHEN gateway authorization succeeds
- THEN the gateway MUST enqueue a `deliveries.update_status` job in Redis/BullMQ
- AND MUST return `202 Accepted` with `jobId`, `trackingId`, `status: "PENDING"`, and `statusUrl`
- AND MUST NOT persist final delivery business data in the gateway

#### Scenario: Vendedor role required

- GIVEN `deliveries.update-status` requires the vendedor role
- WHEN gateway authorization evaluates the actor role
- THEN the gateway MUST allow `vendedor`
- AND MUST reject `cliente` or any other role before enqueueing

### Requirement: Controlled failures

Unmapped/unavailable actions MUST fail predictably. Synchronous TCP actions MUST return a controlled error when unavailable. Async BullMQ commands MUST remain durable until a worker processes them or marks them failed/dead-letter.
(Previously: controlled failures described sync TCP errors but not the async enqueue boundary.)

#### Scenario: Unknown action

- GIVEN no mapping exists for a delivery action (e.g., `/api/v1/deliveries/delete`)
- WHEN a client calls it
- THEN the gateway MUST return `404 Not Found`

#### Scenario: Missing JWT

- GIVEN a request to `/api/v1/deliveries/update-status` without a valid JWT
- WHEN gateway authentication evaluates the request
- THEN the gateway MUST return `401 Unauthorized`

#### Scenario: Wrong role

- GIVEN a client with `cliente` role calls `/api/v1/deliveries/update-status`
- WHEN gateway authorization evaluates the role
- THEN the gateway MUST return `403 Forbidden`

## DELETED Requirements

### Requirement: Synchronous update-status

The `deliveries.update-status` action MUST NOT be processed synchronously via TCP. The TCP fallback does not exist for this action.
(Previously: `deliveries.update-status` was a synchronous TCP action like list/get.)
