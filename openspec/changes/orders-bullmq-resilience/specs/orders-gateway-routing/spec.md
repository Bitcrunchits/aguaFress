# Delta for Orders Gateway Routing

## ADDED Requirements

### Requirement: Async create idempotency contract

The gateway MUST require an idempotency key for `orders.create` and MUST pass the authenticated actor context plus normalized payload to the async command without trusting body identity.

#### Scenario: Header key accepted

- GIVEN a cliente sends `Idempotency-Key` with a valid create payload
- WHEN gateway authorization succeeds
- THEN the gateway MUST enqueue `orders.create`
- AND the accepted response MUST include `jobId` and `trackingId`

#### Scenario: Body key accepted

- GIVEN a cliente sends `idempotencyKey` in the body with a valid create payload
- WHEN gateway authorization succeeds
- THEN the gateway MAY use it as the async idempotency key
- AND MUST still ignore any body `userId`

#### Scenario: Missing key rejected

- GIVEN a cliente calls `/api/v1/orders/create` without `Idempotency-Key` or body `idempotencyKey`
- WHEN gateway authorization succeeds
- THEN the gateway MUST reject the request before enqueueing
- AND MUST NOT dispatch TCP fallback for creation

## MODIFIED Requirements

### Requirement: Action mapping

The gateway MUST expose cart/orders only through `/api/v1/{service}/{action}` and MUST NOT expose orders-service HTTP. The gateway MUST route only `orders.create` through Redis/BullMQ and MUST keep other cart/order operations on mapped TCP.
(Previously: action mapping already allowed async create, but did not explicitly prohibit TCP fallback or queueing other operations.)

#### Scenario: Cart route

- GIVEN a configured `/api/v1/cart/{action}` call
- WHEN gateway authorization succeeds
- THEN gateway MUST dispatch mapped TCP to orders-service

#### Scenario: Orders sync route

- GIVEN a configured synchronous `/api/v1/orders/{action}` call such as list, get-by-id, status update, cancel or confirm
- WHEN gateway authorization succeeds
- THEN gateway MUST dispatch mapped TCP to orders-service
- AND MUST NOT enqueue these immediate operations implicitly

#### Scenario: Orders async create route

- GIVEN a cliente calls `/api/v1/orders/create` with a valid payload and idempotency key
- WHEN gateway authorization succeeds
- THEN gateway MUST enqueue an `orders.create` job in Redis/BullMQ
- AND MUST return `202 Accepted` with `jobId` and `trackingId`
- AND MUST NOT persist final order business data in the gateway

#### Scenario: Lifecycle confirmation role

- GIVEN `orders.confirm` maps to the orders-service lifecycle confirmation handler
- WHEN gateway authorization evaluates the actor role
- THEN the gateway MUST allow `vendedor`
- AND MUST reject `cliente` before TCP dispatch

### Requirement: Controlled failures

Unmapped/unavailable actions MUST fail predictably and MUST NOT call arbitrary targets. Synchronous TCP actions MUST return a controlled error, `503`, or timeout when unavailable and MUST NOT be queued implicitly. Async BullMQ commands MUST remain durable until a worker processes them or marks them failed/dead-letter.
(Previously: controlled failures described async durability, but not the no-final-business-persistence boundary.)

#### Scenario: Unknown

- GIVEN no mapping exists for a cart/order action
- WHEN a client calls it
- THEN the gateway MUST return a controlled client error

#### Scenario: Async tracking

- GIVEN an async order command was accepted
- WHEN the client queries by `trackingId`
- THEN the system MUST return one of `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, or `DEAD_LETTER`

#### Scenario: Gateway persistence boundary

- GIVEN `orders.create` is accepted by the gateway
- WHEN the job is enqueued
- THEN the gateway MUST NOT persist final order, cart, tracking-terminal, or business status data
- AND orders-service MUST own final persistence
