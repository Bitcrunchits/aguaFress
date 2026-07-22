# Proposal: AG-141 — Gateway Testing con Entregas-Service

## Intent

Cerrar el gap de testeo HTTP del gateway para el family `deliveries` y sincronizar la
publicación de eventos de entregas con lo que ya está definido en `@agua/contracts`.
Actualmente el gateway enruta correctamente `deliveries.list/get/update-status` vía TCP
pero no hay ni un solo test HTTP que lo cubra, y los eventos `DeliveryStarted` /
`DeliveryCompleted` existen en contracts pero nunca se publican.

## Scope

### In Scope
- Tests HTTP en `gateway.http.spec.ts` para `deliveries.list`, `deliveries.get` y
  `deliveries.update-status` con mock del dispatcher, verificando roles `vendedor`
- Implementar `publishStarted()` y `publishCompleted()` en
  `DeliveryEventPublisher` port + `RedisDeliveryEventPublisher` concreto
- Vincular los nuevos métodos desde `DeliveriesService.updateStatus` (start en
  PENDIENTE→EN_CAMINO, completed en EN_CAMINO→ENTREGADA)
- Hacer que `QueryDeliveriesDto` implemente explícitamente `DeliveryListFilters`

### Out of Scope
- Migrar `deliveries.get` de query param `?id=` a path param RESTful (stretch,
  se evalúa como follow-up si sobra tiempo)
- Tests de integración cross-service (solo gateway mockeado)
- Consumidores de `DeliveryStarted`/`DeliveryCompleted` (notificaciones,
  audit) — solo publicación

## Capabilities

### New Capabilities
- `gateway-deliveries-routing`: Cobertura HTTP del routing de deliveries en
  el gateway (integra las 3 acciones existentes)

### Modified Capabilities
- `delivery-events`: Se agregan `publishStarted` y `publishCompleted` al port,
  se actualiza spec con los nuevos escenarios de publicación
- `deliveries-dto`: `QueryDeliveriesDto` ahora implementa `DeliveryListFilters`

## Approach

1. **Gateway HTTP tests**: agregar 3 tests siguiendo el patrón de
   `activity-logs` (mock dispatch, verificar rol `vendedor`, verificar payload
   TCP), sin modificar el controller existente.
2. **Event publishing gap**:
   - Agregar `publishStarted(DeliveryStartedEvent)` y
     `publishCompleted(DeliveryCompletedEvent)` al port interface
   - Implementar en `RedisDeliveryEventPublisher` publicando al mismo stream
     `deliveries-stream`
   - Llamar los nuevos métodos desde `DeliveriesService.updateStatus` según
     la transición de estado
3. **DTO contract alignment**: agregar `implements DeliveryListFilters` a
   `QueryDeliveriesDto`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `gateway/test/gateway.http.spec.ts` | Modified | +3 tests (list, get, update-status) |
| `entregas-service/src/.../delivery-event-publisher.port.ts` | Modified | +2 métodos al interface |
| `entregas-service/src/.../delivery-event-publisher.redis.ts` | Modified | Implementa `publishStarted`/`publishCompleted` |
| `entregas-service/src/.../delivery-event-publisher.redis.spec.ts` | Modified | Tests nuevos métodos |
| `entregas-service/src/.../deliveries.service.ts` | Modified | Llama nuevos métodos según transición |
| `entregas-service/src/.../deliveries.service.spec.ts` | Modified | Mocks nuevos métodos + asserts |
| `entregas-service/src/.../dto/query-deliveries.dto.ts` | Modified | `implements DeliveryListFilters` |
| `openspec/specs/delivery-events/spec.md` | Modified | Delta: nuevos escenarios de publicación |
| `openspec/specs/deliveries-dto/spec.md` | Modified | Delta: `implements` check |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Event publish after DB commit puede fallar sin rollback | Medium | Ya es non-blocking (log + no propagar). Misma estrategia que `publishStatusChanged` |
| QueryDeliveriesDto + PaginationRequest pueden tener conflictos de page/limit | Low | `DeliveryListFilters` ya extiende `PaginationRequest`. Solo implementar, sin cambiar fields |

## Rollback Plan

- Gateway tests: revertir cambios en `gateway.http.spec.ts`
- Event publishing: revertir port, redis publisher, y service calls
- DTO: revertir `implements` en `QueryDeliveriesDto`
- Specs: revertir deltas en `delivery-events` y `deliveries-dto`

## Dependencies

- `@agua/contracts` ya define `DeliveryStartedEvent`, `DeliveryCompletedEvent`,
  `DeliveryStatusChangedEvent` y `DeliveryListFilters` — no hay cambios
  en contracts.

## Success Criteria

- [ ] `gateway.http.spec.ts` pasa con los 3 nuevos tests de deliveries
- [ ] `DeliveriesService` publica `DeliveryStarted` al hacer PENDIENTE→EN_CAMINO
- [ ] `DeliveriesService` publica `DeliveryCompleted` al hacer EN_CAMINO→ENTREGADA
- [ ] `QueryDeliveriesDto` compila con `implements DeliveryListFilters`
- [ ] Todos los tests existentes siguen pasando
