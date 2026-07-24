# Delta for Order Management

## ADDED Requirements

### Requirement: Async command tracking and idempotency

The orders-service MUST own durable tracking, idempotency, retries, terminal failure state, and final order persistence for async order creation.

#### Scenario: Duplicate key preserves one order

- GIVEN a cliente submits the same `idempotencyKey` for the same logical create command
- WHEN the async command is accepted or processed more than once
- THEN the orders-service MUST preserve one tracking record and one final order at most
- AND duplicate attempts MUST return or preserve the original tracking result

#### Scenario: Payload conflict

- GIVEN an existing tracking record for `(clienteId, idempotencyKey)` has a different payload fingerprint
- WHEN the cliente retries with incompatible payload data
- THEN the system MUST reject or mark the duplicate as conflicting
- AND MUST NOT create a second order

#### Scenario: Status lookup

- GIVEN an async create command exists
- WHEN status is queried by `trackingId`
- THEN the system MUST return `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, or `DEAD_LETTER`
- AND successful terminal status MUST include the created `orderId`

## MODIFIED Requirements

### Requirement: Create from cart

The system MUST accept order creation as an asynchronous command, then orders-service workers MUST create orders from carts using server product data and clear carts only after successful processing. Gateway acceptance MUST NOT mean the order exists. Final business persistence MUST be owned by orders-service.
(Previously: async creation was described, but worker ownership, terminal tracking, retry semantics, and persistence ownership were less explicit.)

#### Scenario: Accepted

- GIVEN a cliente has a valid request and idempotency key
- WHEN the cliente creates an order through the gateway
- THEN the gateway MUST return `202 Accepted` with `jobId` and `trackingId`
- AND the order MUST NOT be considered completed until the async job reaches `COMPLETED`

#### Scenario: Worker processing

- GIVEN an accepted create command is pending
- WHEN the orders-service worker starts processing it
- THEN tracking status MUST move to `PROCESSING`
- AND business rules MUST be evaluated by the existing order creation use case

#### Scenario: Created

- GIVEN a cliente has a valid cart with product data
- WHEN the orders-service worker processes the accepted async command successfully
- THEN the order MUST have enum status and ISO 8601 dates
- AND tracking MUST move to `COMPLETED` with `orderId`
- AND the cart MUST be cleared

#### Scenario: Product missing

- GIVEN product data is unavailable
- WHEN the orders-service worker processes the accepted async command
- THEN the system MUST retry with backoff when the error is recoverable
- AND MUST eventually mark the job `FAILED` or `DEAD_LETTER` if it cannot complete
- AND MUST NOT create an order or clear the cart

#### Scenario: Retry state

- GIVEN a recoverable failure occurs before attempts are exhausted
- WHEN the worker schedules another attempt
- THEN tracking status SHOULD be `RETRYING`
- AND the command MUST remain observable by `trackingId`

#### Scenario: Idempotent retry

- GIVEN the same cliente retries an async create command with the same idempotency key
- WHEN the original command already exists
- THEN the system MUST return or preserve the original tracking result
- AND MUST NOT create duplicate orders
