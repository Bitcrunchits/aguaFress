# Order Management Spec

## Purpose

Order behavior.

## Requirements

### Requirement: Create from cart

The system MUST accept order creation as an asynchronous command for the authenticated cliente plus selected provider, then create orders from the matching provider-scoped cart using server product data and clear only that provider cart after successful worker processing.

#### Scenario: Accepted

- GIVEN a cliente has selected provider `v1` and has a valid request and idempotency key
- WHEN the cliente creates an order through the gateway
- THEN the gateway MUST return `202 Accepted` with `jobId`, `trackingId`, and provider context
- AND the order MUST NOT be considered completed until the async job reaches `COMPLETED`

#### Scenario: Created

- GIVEN a cliente has a valid `v1` cart with product data
- WHEN the orders-service worker processes the accepted async command
- THEN the order MUST have `vendedorId = v1`, enum status, and ISO 8601 dates
- AND only the `v1` cart MUST be cleared

#### Scenario: Product missing

- GIVEN product data is unavailable
- WHEN the orders-service worker processes the accepted async command
- THEN the system MUST retry with backoff when the error is recoverable
- AND MUST eventually mark the job `FAILED` or `DEAD_LETTER` if it cannot complete
- AND MUST NOT create an order or clear the cart

#### Scenario: Idempotent retry

- GIVEN the same cliente retries an async create command for the same provider with the same idempotency key
- WHEN the original command already exists
- THEN the system MUST return or preserve the original tracking result
- AND MUST NOT create duplicate orders

### Requirement: Role-scoped reads

The system MUST restrict reads by role and ownership.

#### Scenario: Owner

- GIVEN an order belongs to cliente A
- WHEN cliente A requests it
- THEN the system MUST return it

#### Scenario: Cross-owner

- GIVEN an order belongs to cliente A
- WHEN cliente B requests it
- THEN the system MUST reject access

### Requirement: Lifecycle and history

The system MUST enforce enum transitions and record accepted transitions.

#### Scenario: Confirmation

- GIVEN an order may move from pending to confirmed
- WHEN the owning vendedor confirms it
- THEN status MUST update and history MUST append

### Requirement: Per-vendor numbering

The system MUST assign unique sequential `pedido_numero` per vendedor, including concurrency.

#### Scenario: Concurrent unique

- GIVEN two concurrent orders for one vendedor
- WHEN both succeed
- THEN each MUST have a distinct `pedido_numero`
