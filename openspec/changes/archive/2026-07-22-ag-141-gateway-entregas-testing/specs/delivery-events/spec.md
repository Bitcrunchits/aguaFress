# Delivery Events Specification

## Delta: DeliveryStarted + DeliveryCompleted

> **Context**: The main `openspec/specs/delivery-events/spec.md` already covers `DeliveryStatusChangedEvent`. This delta adds event publishing for `DeliveryStartedEvent` and `DeliveryCompletedEvent` — both exist in `@agua/contracts` but are never published by `DeliveriesService.updateStatus`.

The existing event (`DeliveryStatusChangedEvent`) continues to be published alongside these new events. They are complementary, not mutually exclusive.

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

Both `DeliveryStartedEvent` and `DeliveryCompletedEvent` MUST extend `BaseEvent` (inherit `timestamp`). They MUST be part of the `DeliveryEvent` union type in `@agua/contracts`.

#### Scenario: Event satisfies union narrowing

- GIVEN a `DeliveryEvent` type
- WHEN narrowed on `type === "DeliveryStarted"`
- THEN the resulting type includes `deliveryId`, `orderId`, `vendedorId`, `clienteId`, and `actorUserId`

### Requirement: Events are published after successful persistence (same rule)

The new events follow the same non-blocking rule as `DeliveryStatusChangedEvent`: published AFTER the database update commits, with failure logged but NOT rolled back.

#### Scenario: New event publish failure is also non-blocking

- GIVEN a PENDIENTE → EN_CAMINO transition succeeds in the database
- WHEN `publishStarted` throws an error (but `publishStatusChanged` succeeds)
- THEN the delivery status remains `EN_CAMINO`
- AND the error is logged but NOT propagated to the caller
