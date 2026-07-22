# Design: AG-141 — Gateway Testing con Entregas-Service

## Technical Approach

Three independent workstreams, each touching a different layer:

1. **Gateway HTTP tests** — add 3 tests to `gateway.http.spec.ts` mocking `TcpDispatcherService.dispatch()`, following the exact pattern of activity-logs tests (lines 447-495). No controller changes.
2. **Event publishing** — add `publishStarted`/`publishCompleted` to port, implement via `XADD` to `deliveries-stream`, wire into `updateStatus` alongside existing `publishStatusChanged`.
3. **DTO alignment** — add `implements DeliveryListFilters` to `QueryDeliveriesDto`. Pure type-level change.

## Decisiones Importantes

### DeliveryStartedEvent / DeliveryCompletedEvent — corregir contracts ahora

**Contexto**: `DeliveryStartedEvent` y `DeliveryCompletedEvent` existen en `@agua/contracts/src/events.ts` como parte de la unión `DeliveryEvent`, pero **nunca se implementaron**. El port interface solo expone `publishStatusChanged()`. Los eventos tienen definiciones incompletas — les faltan `clienteId` y `actorUserId`.

**Por qué arreglarlo ahora y no postergarlo**:
- Si implementamos `publishStarted()`/`publishCompleted()` usando los contracts actuales, esos eventos se publicarían en Redis con datos incompletos para siempre.
- Como nunca se publicaron antes, **no hay consumidores existentes** — modificar la interfaz es seguro, no hay breaking change real.
- Dejarlo para después = deuda técnica garantizada. Nadie vuelve a tocar eventos que "ya funcionan".

**Decisión**: Modificar `DeliveryStartedEvent` y `DeliveryCompletedEvent` en contracts AGREGANDO `clienteId` y `actorUserId` como campos requeridos. Implementar los métodos en el port y el publisher con los campos completos desde el día 1.

**Impacto**: Un archivo (`events.ts`) — additive, sin breaking change real porque no hay consumidores.

### Duality de eventos en una misma transición

Cuando se actualiza un estado, se publican DOS eventos en el mismo stream:

| Transición | Eventos publicados |
|---|---|
| PENDIENTE → EN_CAMINO | `DeliveryStartedEvent` + `DeliveryStatusChangedEvent` |
| EN_CAMINO → ENTREGADA | `DeliveryCompletedEvent` + `DeliveryStatusChangedEvent` |

Esto permite que consumidores lifecycle (notificaciones) escuchen los eventos específicos mientras que consumidores de auditoría/analytics usan el genérico `DeliveryStatusChangedEvent`. Son dos XADD separados al mismo stream `deliveries-stream`, ambos non-blocking (fallo loggeado, no propaga).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Event contracts: `clienteId` + `actorUserId` | Add to `DeliveryStartedEvent`/`DeliveryCompletedEvent` in contracts | Leave as-is, or add only in service layer | Spec requires both fields; contracts currently lack them. Adding to contracts is DIP-compliant — events are contracts, not service internals. |
| Non-blocking failure for new events | Same as existing: propagate error, service caller catches+logs | Silent swallow | Existing `publishStatusChanged` propagates; the service's controller catches and logs. Consistent. |
| Gateway test pattern | Mock `TcpDispatcherService.dispatch()` at module level | Integration test with real TCP | Follows existing activity-logs pattern. No controller changes. |
| `DeliveryStartedEvent`/`DeliveryCompletedEvent` contracts | Add `clienteId` + `actorUserId` fields | Leave as-is | Spec requires both. Contracts currently lack them. DIP-compliant: events are contracts. |

## Data Flow

### Gateway HTTP Tests

```
supertest → gateway HTTP endpoint
  → JwtAuthGuard (401 if missing/invalid)
  → RolesGuard (403 if not vendedor)
  → GenericActionController
    → TcpDispatcherService.dispatch('deliveries', payload, { tcpPattern, authRequired, roles })
      → mockDispatch (verified via expect)
```

### Event Publishing Flow (updateStatus)

```
updateStatus(id, dto, vendedorId, actorUserId)
  ├── findById → NotFoundException | ForbiddenException
  ├── validate transition → BadRequestException
  ├── repository.updateStatus()  ← DB commit
  ├── if PENDIENTE→EN_CAMINO:
  │     ├── publishStarted({ type, deliveryId, orderId, vendedorId, clienteId, actorUserId, timestamp })
  │     └── publishStatusChanged({ type, deliveryId, orderId, estadoAnterior, estadoNuevo, actorUserId, timestamp })
  ├── if EN_CAMINO→ENTREGADA:
  │     ├── publishCompleted({ type, deliveryId, orderId, vendedorId, clienteId, actorUserId, timestamp })
  │     └── publishStatusChanged({ type, deliveryId, orderId, estadoAnterior, estadoNuevo, actorUserId, timestamp })
  └── return DeliveryResponse
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `MicroServices/gateway/test/gateway.http.spec.ts` | Modify | +3 tests: deliveries list, get, update-status |
| `MicroServices/entregas-service/src/deliveries/delivery-event-publisher.port.ts` | Modify | Add `publishStarted` + `publishCompleted` to interface |
| `MicroServices/entregas-service/src/deliveries/delivery-event-publisher.redis.ts` | Modify | Implement both methods via `XADD` to `deliveries-stream` |
| `MicroServices/entregas-service/src/deliveries/delivery-event-publisher.redis.spec.ts` | Modify | +2 describe blocks for new methods |
| `MicroServices/entregas-service/src/deliveries/deliveries.service.ts` | Modify | Wire `publishStarted`/`publishCompleted` in `updateStatus` |
| `MicroServices/entregas-service/src/deliveries/deliveries.service.spec.ts` | Modify | Update mocks + assertions for dual event publishing |
| `MicroServices/entregas-service/src/deliveries/dto/query-deliveries.dto.ts` | Modify | Add `implements DeliveryListFilters` |
| `packages/contracts/src/events.ts` | Modify | Add `clienteId` + `actorUserId` to `DeliveryStartedEvent` and `DeliveryCompletedEvent` |

## Interfaces / Contracts

### Port interface change

```typescript
// delivery-event-publisher.port.ts
import type { DeliveryStatusChangedEvent, DeliveryStartedEvent, DeliveryCompletedEvent } from '@agua/contracts';

export interface DeliveryEventPublisher {
  publishStatusChanged(event: DeliveryStatusChangedEvent): Promise<void>;
  publishStarted(event: DeliveryStartedEvent): Promise<void>;
  publishCompleted(event: DeliveryCompletedEvent): Promise<void>;
}
```

### Contracts change (events.ts)

```typescript
// Current — missing clienteId and actorUserId
export interface DeliveryStartedEvent extends BaseEvent {
  type: 'DeliveryStarted';
  deliveryId: string;
  orderId: string;
  vendedorId: string;
  // ADD: clienteId: string;
  // ADD: actorUserId: string;
}

export interface DeliveryCompletedEvent extends BaseEvent {
  type: 'DeliveryCompleted';
  deliveryId: string;
  orderId: string;
  vendedorId: string;
  // ADD: clienteId: string;
  // ADD: actorUserId: string;
}
```

### Redis implementation pattern

```typescript
// delivery-event-publisher.redis.ts — new methods
async publishStarted(event: DeliveryStartedEvent): Promise<void> {
  try {
    await this.redis.xadd(
      RedisStreams.DELIVERIES, '*',
      'type', event.type,
      'deliveryId', event.deliveryId,
      'orderId', event.orderId,
      'vendedorId', event.vendedorId,
      'clienteId', event.clienteId,
      'actorUserId', event.actorUserId,
      'timestamp', event.timestamp,
    );
  } catch (error) {
    this.logger.error(`Failed to publish DeliveryStartedEvent for delivery ${event.deliveryId}: ...`);
    throw error;
  }
}
```

### Service wiring (updateStatus)

```typescript
// After repository.updateStatus() succeeds:
if (dto.estado === DeliveryEstado.EN_CAMINO) {
  await this.eventPublisher.publishStarted({ ... });
}
if (dto.estado === DeliveryEstado.ENTREGADA) {
  await this.eventPublisher.publishCompleted({ ... });
}
// Always publish status changed
await this.eventPublisher.publishStatusChanged({ ... });
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Gateway HTTP | `deliveries.list` (GET), `deliveries.get` (GET), `deliveries.update-status` (PATCH) | Mock `TcpDispatcherService.dispatch()`, verify 401/403/200, verify TCP payload shape |
| Unit (Redis publisher) | `publishStarted`, `publishCompleted` | Mock `redis.xadd`, verify field-by-field match, verify error propagation |
| Unit (Service) | Dual event publishing on transitions | Mock publisher, verify both events called on each transition |
| Compile | `QueryDeliveriesDto implements DeliveryListFilters` | `tsc --noEmit` passes |

## Migration / Rollout

No migration required. All changes are additive (new tests, new event methods, type-level contract).

## Open Questions

- [ ] `DeliveryStartedEvent` and `DeliveryCompletedEvent` in contracts currently lack `clienteId` and `actorUserId`. The spec requires them. **Decision: add both fields to the contracts interfaces.** This is a minor breaking change for any code that constructs these events — but since they were never published, no consumers exist.
