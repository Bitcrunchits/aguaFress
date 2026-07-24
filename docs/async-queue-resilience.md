# Resiliencia y persistencia ante caída de microservicios

AguaFress usa un diseño de dos caminos: TCP para respuestas inmediatas y Redis + BullMQ para comandos críticos que no deben perderse si un microservicio está caído. Esta decisión aplica primero a `orders-service`, `gateway` y contratos compartidos; los demás microservicios se adaptan después solo cuando el caso de uso lo justifique.

## Decisión

| Camino | Uso | Respuesta esperada | Persistencia |
|--------|-----|--------------------|--------------|
| TCP tradicional | Login, perfil, validaciones, lecturas simples, carrito y consultas inmediatas. | Respuesta inmediata, error controlado, `503` o timeout si el MS no responde. | No se encola. El cliente reintenta si corresponde. |
| Redis + BullMQ | Crear orden, pagos o flujos similares, notificaciones y tareas de entrega que pueden esperar segundos. | `202 Accepted` con `jobId` y `trackingId`. | El job queda en Redis hasta que un worker lo procese o lo marque como fallido. |

Kafka no se usa para este problema. La necesidad actual es durabilidad operacional, reintentos y recuperación ante caída de workers, no event streaming distribuido con múltiples consumidores.

## Camino rápido

1. Mantener TCP para operaciones que necesitan respuesta inmediata.
2. Encolar solo comandos críticos y reintentables en BullMQ.
3. Responder desde el gateway con `202 Accepted`, `jobId` y `trackingId`.
4. Procesar y persistir el resultado final en `orders-service`.
5. Consultar estado con un endpoint de tracking hasta `COMPLETED` o `FAILED`.

## Piloto

| Alcance | Decisión |
|---------|----------|
| Primer microservicio | `orders-service` para creación de órdenes y operaciones críticas de pedidos. |
| Gateway | Valida JWT/roles, normaliza payload, encola el job y devuelve tracking. No persiste datos de negocio finales. |
| orders-service | Es dueño del caso de uso, la persistencia final, la idempotencia de órdenes y los workers BullMQ. |
| Contratos | Definir payloads, respuestas `202`, estados de tracking e idempotency keys en contratos compartidos. |
| Luego | Evaluar `notifications-service`, `entregas-service` y `products-service` caso por caso; no migrar todo de golpe. |

## Flujo de creación de orden

```txt
Cliente -> Gateway HTTP
Gateway valida JWT, rol e idempotency key
Gateway publica CreateOrderJob en Redis/BullMQ
Gateway responde 202 Accepted + jobId + trackingId

orders-service worker toma el job
orders-service marca PROCESSING
orders-service valida reglas de negocio y persiste la orden
orders-service marca COMPLETED + orderId

si falla de forma recuperable: retry con backoff
si agota reintentos: FAILED y registro DLQ/failed jobs
```

## Contrato async mínimo

| Campo | Regla |
|-------|-------|
| `jobId` | ID técnico del job en BullMQ. Sirve para operación interna y soporte. |
| `trackingId` | ID público para consultar estado desde el frontend. No debe exponer detalles internos sensibles. |
| `idempotencyKey` | Obligatoria para comandos async críticos. Evita duplicados si el cliente reintenta. |
| `status` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `RETRYING`, `DEAD_LETTER`. |
| `result` | Disponible cuando termina exitosamente, por ejemplo `{ orderId }`. |
| `error` | Error controlado y seguro cuando termina en `FAILED` o `DEAD_LETTER`. |

## Retries y DLQ

| Caso | Manejo |
|------|--------|
| MS/worker caído | El job permanece en Redis y se procesa cuando el worker vuelve. |
| Error transitorio | Reintentos con backoff exponencial y límite configurado. |
| Error de negocio no recuperable | Marcar `FAILED` sin reintentar indefinidamente. |
| Reintentos agotados | Mover a estado `DEAD_LETTER` o failed jobs para revisión manual/operativa. |
| Duplicado por retry del cliente | Resolver por `idempotencyKey`; no crear dos órdenes para el mismo comando. |

## Límites arquitectónicos

| Componente | Hace | No hace |
|------------|------|---------|
| Gateway | Entrada HTTP, auth, validación superficial, rate limit, routing, enqueue, respuesta `202`. | No es dueño de órdenes, pagos, stock ni estados finales. No implementa reenvío TCP casero. |
| Redis/BullMQ | Durabilidad temporal, scheduling, retries, backoff, failed jobs. | No reemplaza la base transaccional del microservicio. |
| orders-service | Reglas de negocio, workers, persistencia final, tracking del comando. | No expone HTTP público directo al frontend. |

## Checklist de implementación

- [x] Definir DTOs compartidos para `CreateOrderJobData`, `AsyncAcceptedResponse` y `OrderJobStatusResponse`.
- [ ] Exigir `idempotencyKey` en comandos async críticos.
- [ ] Encolar creación de orden desde gateway y responder `202 Accepted`.
- [ ] Implementar worker BullMQ en `orders-service`.
- [ ] Persistir estados `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `RETRYING`, `DEAD_LETTER`.
- [ ] Configurar retries, backoff y failed jobs/DLQ.
- [ ] Mantener órdenes directas por HTTP cerradas; frontend siempre consume gateway.
