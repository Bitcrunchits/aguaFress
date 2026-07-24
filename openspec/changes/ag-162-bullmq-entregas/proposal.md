# Proposal: AG-162 — BullMQ Async Processing para Entregas-Service

## Intent

Aplicar el mismo patrón BullMQ de `orders.create` (AG-161) a `deliveries.update-status`: la acción pasa de TCP síncrono a async vía BullMQ, con worker en entregas-service, tracking de estado, retry y failure classifier.

## Scope

### In Scope
- `PATCH /api/v1/deliveries/update-status` → `202 Accepted` con tracking info
- Gateway enqueue via BullMQ (nuevo queue `deliveries.update_status`)
- Entregas-service: worker + processor + tracking service + failure classifier
- Tracking de estados: `PENDING → PROCESSING → COMPLETED / FAILED / DEAD_LETTER`
- Idempotency key para evitar procesamiento duplicado
- Contratos: `DeliveryJobStatus` enum + DTOs job data + tracking response
- Prisma: tabla `DELIVERY_COMMAND_JOB` para tracking

### Out of Scope
- Hacer async otras acciones de deliveries (list/get quedan TCP)
- Kafka o event streaming
- Consumidores de eventos externos
- UI/notificaciones del lado cliente

## Approach

Thin gateway enqueue + durable entregas-service ownership. Gateway valida JWT, rol vendedor, payload, idempotency key, enqueues BullMQ job, retorna `202`. El worker registra tracking, procesa, llama `DeliveriesService.updateStatus()`, publica eventos, y clasifica fallos.

```
PATCH /api/v1/deliveries/update-status
  └─ GatewayController
     ├─ valida JWT + rol vendedor
     ├─ lee Idempotency-Key
     └─ DeliveriesQueueService.enqueue()
        └─ Redis/BullMQ deliveries.update_status queue
           └─ entregas-service DeliveryStatusUpdateWorker
              ├─ TrackingService: PENDING → PROCESSING
              ├─ DeliveriesService.updateStatus() + eventos
              └─ TrackingService: COMPLETED / FAILED / DEAD_LETTER
```

## Affected Areas

| Area | Impact | Descripción |
|------|--------|-------------|
| `packages/contracts/src/enums.ts` | Modify | +DeliveryJobStatus enum |
| `packages/contracts/src/dto/deliveries.dto.ts` | Modify | +UpdateDeliveryStatusJobData, +DeliveryJobStatusResponse |
| `packages/contracts/src/dto/common.dto.ts` | Modify | Reuse AsyncAcceptedResponse o crear uno |
| `MicroServices/gateway/src/queues/deliveries-queue.*` | New | Queue module + provider + service |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modify | update-status → asyncQueue |
| `MicroServices/gateway/src/gateway.controller.ts` | Modify | Route update-status to queue |
| `MicroServices/gateway/src/config/env.config.ts` | Modify | +delivery queue env vars |
| `MicroServices/gateway/src/app.module.ts` | Modify | Import deliveries queue module |
| `MicroServices/gateway/test/gateway.http.spec.ts` | Modify | +tests 202, idempotency, roles |
| `MicroServices/entregas-service/prisma/schema.prisma` | Modify | +DELIVERY_COMMAND_JOB table |
| `MicroServices/entregas-service/src/orders/jobs/*` | New | Worker, processor, classifier, tracking |
| `MicroServices/entregas-service/src/app.module.ts` | Modify | Import jobs module |
| `MicroServices/entregas-service/src/tcp/deliveries-tcp.controller.ts` | Modify | Remove update_status handler |
| `MicroServices/entregas-service/src/deliveries/deliveries.service.ts` | Keep | Reuse existing updateStatus() |
| `docker-compose.yml`, `.env.example` | Modify | Redis/queue env for entregas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate update processing | Medium | Deterministic jobId + unique tracking key |
| Event publish after status update fails | Low | Ya es non-blocking (log + no propaga) |
| Worker no arranca en docker-compose | Medium | Ya existe Redis, solo agregar env vars |
| Review overload | Medium | Mantener bajo 400 líneas, chained PRs si es necesario |

## Success Criteria

- [ ] `PATCH /api/v1/deliveries/update-status` retorna `202` con `jobId` y `trackingId`
- [ ] Entregas-service worker procesa y actualiza el delivery
- [ ] Eventos se publican correctamente desde el worker
- [ ] Idempotency key previene duplicados
- [ ] Retry + backoff funciona para fallos transitorios
- [ ] Estados FAILED / DEAD_LETTER observables
- [ ] Tests pasan: gateway + entregas + contracts build
