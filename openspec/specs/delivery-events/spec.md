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

### Requirement: Publish DeliveryStartedEvent on PENDIENTE → EN_CAMINO

When a delivery transitions from `PENDIENTE` to `EN_CAMINO`, the system MUST publish a `DeliveryStartedEvent` to the `deliveries-stream` **in addition to** the existing `DeliveryStatusChangedEvent`.

The event MUST include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"DeliveryStarted"` | Discriminant |
| `deliveryId` | `string` | Delivery entity ID |
| `orderId` | `string` | Associated order ID |
| `vendedorId` | `string` | Vendedor assigned to the delivery |
| `clienteId` | `string` | Cliente receiving the delivery |
| `actorUserId` | `string` | `AUTH_USER.id` who triggered the transition |
| `timestamp` | `string` (ISO 8601) | When the delivery started |

#### Scenario: Happy path — DeliveryStartedEvent shape on EN_CAMINO

- GIVEN a delivery with estado `PENDIENTE`, `deliveryId: "del-1"`, `orderId: "ord-1"`, `vendedorId: "ven-1"`, `clienteId: "cli-1"`
- WHEN `updateStatus` is called with estado `EN_CAMINO` by a vendedor with `AUTH_USER.id = "user-abc"`
- THEN a `DeliveryStartedEvent` is published with:
  - `type: "DeliveryStarted"`
  - `deliveryId: "del-1"`
  - `orderId: "ord-1"`
  - `vendedorId: "ven-1"`
  - `clienteId: "cli-1"`
  - `actorUserId: "user-abc"`
  - `timestamp` as a valid ISO 8601 string
- AND a `DeliveryStatusChangedEvent` is ALSO published with `estadoAnterior: PENDIENTE`, `estadoNuevo: EN_CAMINO`

### Requirement: Publish DeliveryCompletedEvent on EN_CAMINO → ENTREGADA

When a delivery transitions from `EN_CAMINO` to `ENTREGADA`, the system MUST publish a `DeliveryCompletedEvent` to the `deliveries-stream` **in addition to** the existing `DeliveryStatusChangedEvent`.

The event MUST include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"DeliveryCompleted"` | Discriminant |
| `deliveryId` | `string` | Delivery entity ID |
| `orderId` | `string` | Associated order ID |
| `vendedorId` | `string` | Vendedor who completed the delivery |
| `clienteId` | `string` | Cliente who received the delivery |
| `actorUserId` | `string` | `AUTH_USER.id` who triggered the transition |
| `timestamp` | `string` (ISO 8601) | When the delivery was completed |

#### Scenario: Happy path — DeliveryCompletedEvent shape on ENTREGADA

- GIVEN a delivery with estado `EN_CAMINO`, `deliveryId: "del-1"`, `orderId: "ord-1"`, `vendedorId: "ven-1"`, `clienteId: "cli-1"`
- WHEN `updateStatus` is called with estado `ENTREGADA` by a vendedor with `AUTH_USER.id = "user-abc"`
- THEN a `DeliveryCompletedEvent` is published with:
  - `type: "DeliveryCompleted"`
  - `deliveryId: "del-1"`
  - `orderId: "ord-1"`
  - `vendedorId: "ven-1"`
  - `clienteId: "cli-1"`
  - `actorUserId: "user-abc"`
  - `timestamp` as a valid ISO 8601 string
- AND a `DeliveryStatusChangedEvent` is ALSO published with `estadoAnterior: EN_CAMINO`, `estadoNuevo: ENTREGADA`

### Requirement: Publisher port exposes publishStarted + publishCompleted

The `DeliveryEventPublisher` port interface MUST expose two new methods:

```typescript
publishStarted(event: DeliveryStartedEvent): Promise<void>;
publishCompleted(event: DeliveryCompletedEvent): Promise<void>;
```

The concrete `RedisDeliveryEventPublisher` MUST implement both by publishing to the same `deliveries-stream` Redis stream.

#### Scenario: Implementation follows same pattern as publishStatusChanged

- GIVEN `RedisDeliveryEventPublisher` already implements `publishStatusChanged(event: DeliveryStatusChangedEvent)`
- WHEN `publishStarted` and `publishCompleted` are called
- THEN they use the same Redis `XADD` call pattern targeting `deliveries-stream`
- AND the event payload is serialized as JSON with the correct `type` discriminant

### Requirement: Events extend BaseEvent and are part of DeliveryEvent union

`DeliveryStatusChangedEvent`, `DeliveryStartedEvent`, and `DeliveryCompletedEvent` MUST all extend `BaseEvent` (inherit `timestamp`). All three MUST be part of the `DeliveryEvent` union type in `@agua/contracts`.

#### Scenario: Event satisfies union narrowing for all event types

- GIVEN a `DeliveryEvent` type
- WHEN narrowed on `type === "DeliveryStatusChanged"`
- THEN the resulting type includes `deliveryId`, `orderId`, `estadoAnterior`, `estadoNuevo`, and `actorUserId`
- WHEN narrowed on `type === "DeliveryStarted"`
- THEN the resulting type includes `deliveryId`, `orderId`, `vendedorId`, `clienteId`, and `actorUserId`
- WHEN narrowed on `type === "DeliveryCompleted"`
- THEN the resulting type includes `deliveryId`, `orderId`, `vendedorId`, `clienteId`, and `actorUserId`

### Requirement: Events are published after successful persistence

All delivery events SHALL be published AFTER the database update commits. If any event publishing fails, the status transition SHALL NOT be rolled back — the delivery is already updated, and the failure is logged. This applies to all three event types: `DeliveryStatusChangedEvent`, `DeliveryStartedEvent`, and `DeliveryCompletedEvent`.

#### Scenario: Event publish failure is non-blocking (all event types)

- GIVEN a delivery status transition succeeds in the database
- WHEN any event publishing throws an error (but others succeed)
- THEN the delivery status remains updated
- AND the error is logged but NOT propagated to the caller
