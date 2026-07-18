# Orders Gateway Routing Spec

## Purpose

Cart/orders routing.

## Requirements

### Requirement: Action mapping

The gateway MUST expose cart/orders only through `/api/v1/{service}/{action}` and MUST NOT expose orders-service HTTP.

#### Scenario: Cart route

- GIVEN a configured `/api/v1/cart/{action}` call
- WHEN gateway authorization succeeds
- THEN gateway MUST dispatch mapped TCP to orders-service

#### Scenario: Orders sync route

- GIVEN a configured synchronous `/api/v1/orders/{action}` call such as list, get-by-id, status update, cancel or confirm
- WHEN gateway authorization succeeds
- THEN gateway MUST dispatch mapped TCP to orders-service

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

### Requirement: JWT context

Protected actions MUST require JWT and forward trusted context, never body `userId`.

#### Scenario: Missing JWT

- GIVEN a protected cart or order action
- WHEN no valid JWT is present
- THEN gateway MUST reject before TCP dispatch

#### Scenario: Body identity

- GIVEN the body includes `userId`
- WHEN the gateway dispatches
- THEN authenticated context MUST be the identity source

### Requirement: Controlled failures

Unmapped/unavailable actions MUST fail predictably and MUST NOT call arbitrary targets.

Synchronous TCP actions MUST return a controlled error, `503`, or timeout when the destination service is unavailable. They MUST NOT be queued implicitly. Async BullMQ commands MUST keep jobs durable in Redis until a worker processes them or marks them failed/dead-letter.

#### Scenario: Unknown

- GIVEN no mapping exists for a cart/order action
- WHEN a client calls it
- THEN the gateway MUST return a controlled client error

#### Scenario: Async tracking

- GIVEN an async order command was accepted
- WHEN the client queries by `trackingId`
- THEN the system MUST return one of `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, or `DEAD_LETTER`
