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

#### Scenario: Orders route

- GIVEN a configured `/api/v1/orders/{action}` call
- WHEN gateway authorization succeeds
- THEN gateway MUST dispatch mapped TCP to orders-service

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

#### Scenario: Unknown

- GIVEN no mapping exists for a cart/order action
- WHEN a client calls it
- THEN the gateway MUST return a controlled client error
