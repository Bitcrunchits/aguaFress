# Delivery Events Specification

## Purpose

Define typed event publishing for delivery status transitions, enabling downstream consumers (notifications, audit, analytics) to react to delivery lifecycle changes.

## Requirements

### Requirement: Publish DeliveryStatusChangedEvent on valid transitions

When a delivery status transitions through a valid path (PENDIENTE → EN_CAMINO, EN_CAMINO → ENTREGADA), the system MUST publish a `DeliveryStatusChangedEvent` to the `deliveries-stream`.

The event MUST include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"DeliveryStatusChanged"` | Discriminant |
| `deliveryId` | `string` | Delivery entity ID |
| `orderId` | `string` | Associated order ID |
| `estadoAnterior` | `DeliveryEstado` | Previous state |
| `estadoNuevo` | `DeliveryEstado` | New state |
| `actorUserId` | `string` | `AUTH_USER.id` who triggered the transition |
| `timestamp` | `string` (ISO 8601) | When the transition occurred |

#### Scenario: Happy path — delivery goes EN_CAMINO

- GIVEN a delivery with estado `PENDIENTE`
- WHEN `updateStatus` is called with estado `EN_CAMINO` by an authenticated vendedor
- THEN the delivery estado is updated to `EN_CAMINO`
- AND a `DeliveryStatusChangedEvent` is published with `estadoAnterior: PENDIENTE`, `estadoNuevo: EN_CAMINO`, and `actorUserId` matching the authenticated user

#### Scenario: Happy path — delivery completes

- GIVEN a delivery with estado `EN_CAMINO`
- WHEN `updateStatus` is called with estado `ENTREGADA` by an authenticated vendedor
- THEN the delivery estado is updated to `ENTREGADA`
- AND a `DeliveryStatusChangedEvent` is published with `estadoAnterior: EN_CAMINO`, `estadoNuevo: ENTREGADA`, and `actorUserId` matching the authenticated user

#### Scenario: Invalid transition does NOT publish

- GIVEN a delivery with estado `ENTREGADA`
- WHEN `updateStatus` is called with any estado
- THEN the service throws `BadRequestException`
- AND no `DeliveryStatusChangedEvent` is published

#### Scenario: actorUserId matches authenticated user

- GIVEN a vendedor with `AUTH_USER.id = "user-abc"`
- WHEN they trigger a valid status transition
- THEN the published event's `actorUserId` equals `"user-abc"`

### Requirement: Events extend BaseEvent and are part of DeliveryEvent union

The `DeliveryStatusChangedEvent` MUST extend `BaseEvent` (inherits `timestamp`). It MUST be part of the `DeliveryEvent` union type in `@agua/contracts`.

#### Scenario: Event satisfies union

- GIVEN a `DeliveryEvent` type
- WHEN narrowed on `type === "DeliveryStatusChanged"`
- THEN the resulting type includes `deliveryId`, `orderId`, `estadoAnterior`, `estadoNuevo`, and `actorUserId`

### Requirement: Events are published after successful persistence

The event SHALL be published AFTER the database update commits. If event publishing fails, the status transition SHALL NOT be rolled back — the delivery is already updated, and the event loss is logged.

#### Scenario: Event publish failure is non-blocking

- GIVEN a delivery status transition succeeds in the database
- WHEN event publishing throws an error
- THEN the delivery status remains updated
- AND the error is logged but NOT propagated to the caller
