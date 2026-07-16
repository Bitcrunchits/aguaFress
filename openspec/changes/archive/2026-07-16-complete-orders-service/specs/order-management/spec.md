# Order Management Spec

## Purpose

Order behavior.

## Requirements

### Requirement: Create from cart

The system MUST create orders from carts using server product data and clear carts only after success.

#### Scenario: Created

- GIVEN a cliente has a valid cart with product data
- WHEN the cliente creates an order
- THEN the order MUST have enum status and ISO 8601 dates
- AND the cart MUST be cleared

#### Scenario: Product missing

- GIVEN product data is unavailable
- WHEN the cliente creates an order
- THEN the system MUST return controlled unavailable
- AND MUST NOT create an order or clear the cart

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
