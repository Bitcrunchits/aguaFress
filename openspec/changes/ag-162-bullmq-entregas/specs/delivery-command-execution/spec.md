# Delta for Delivery Command Execution

## ADDED Requirements

### Requirement: DeliveryCommandJob tracking model

The entregas-service MUST own a `DELIVERY_COMMAND_JOB` table to track every async delivery command execution through its lifecycle. Each record represents exactly one async command attempt identified by `(deliveryId, idempotencyKey)`.

The table MUST include these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID (PK) | Primary key |
| `trackingId` | UUID (unique) | Public identifier for status queries |
| `jobId` | string (unique) | BullMQ job ID |
| `deliveryId` | string | Target delivery entity |
| `vendedorId` | string | Authenticated vendedor who triggered the command |
| `actorUserId` | string | `AUTH_USER.id` who triggered the command |
| `estado` | DeliveryEstado | Target delivery state requested |
| `notas` | string? | Optional notes from the request |
| `estadoAnterior` | DeliveryEstado? | Delivery state before the update (set on COMPLETED) |
| `status` | DeliveryJobStatus | Current execution status (PENDING, PROCESSING, RETRYING, COMPLETED, FAILED, DEAD_LETTER) |
| `idempotencyKey` | string | Client-provided idempotency key |
| `payloadFingerprint` | string | Hash of the normalized request payload for conflict detection |
| `errorCode` | string? | Machine-readable error code on failure |
| `errorMessage` | string? | Human-readable error detail on failure |
| `attempts` | integer | Number of processing attempts |
| `createdAt` | ISO 8601 | When the record was created |
| `updatedAt` | ISO 8601 | When the record was last updated |

**Unique constraint**: `(deliveryId, idempotencyKey)` — prevents duplicate commands for the same delivery with the same key.

#### Scenario: Record created on first attempt

- GIVEN a vendedor submits a valid update-status request that reaches the worker
- WHEN the worker creates the tracking record
- THEN the record has `status: PENDING` with `attempts: 0`
- AND `deliveryId`, `vendedorId`, `actorUserId`, `estado` match the job data
- AND `trackingId` is unique across all records

#### Scenario: Duplicate key rejected

- GIVEN a `(deliveryId, idempotencyKey)` pair already exists in `DELIVERY_COMMAND_JOB`
- WHEN a new job attempts to insert with the same pair
- THEN the worker MUST detect the unique constraint violation
- AND MUST NOT create a second record
- AND MUST return or preserve the original tracking result

#### Scenario: Payload fingerprint conflict

- GIVEN an existing tracking record for `(deliveryId, idempotencyKey)` with a different `estado` value than the current request
- WHEN the worker processes the job
- THEN the worker MUST reject the job as conflicting
- AND MUST mark the job as `FAILED` with `errorCode: "PAYLOAD_CONFLICT"`
- AND MUST NOT update the delivery

### Requirement: Status transitions

The execution status of a `DeliveryCommandJob` MUST follow a state machine with terminal and retryable paths.

Valid transitions:

```
PENDING ──→ PROCESSING ──→ COMPLETED    (success)
                │
                ├──→ FAILED              (non-retryable business error)
                │
                └──→ RETRYING ──→ PROCESSING ──→ COMPLETED    (retry succeeds)
                                      │
                                      ├──→ FAILED              (non-retryable on retry)
                                      │
                                      └──→ DEAD_LETTER         (retries exhausted)
```

#### Scenario: Completed transition

- GIVEN a `DeliveryCommandJob` in `PROCESSING` status
- WHEN the worker successfully calls `DeliveriesService.updateStatus()`
- THEN the status MUST move to `COMPLETED`
- AND `estadoAnterior` MUST capture the delivery state before the update
- AND `updatedAt` MUST be updated to the current time
- AND the delivery entity MUST reflect the new `estado`

#### Scenario: Non-retryable failure

- GIVEN a `DeliveryCommandJob` in `PROCESSING` status
- WHEN `DeliveriesService.updateStatus()` throws a `BadRequestException` (e.g., invalid transition or delivery not found)
- THEN the status MUST move to `FAILED`
- AND `errorCode` MUST reflect the business error reason
- AND `errorMessage` MUST contain a human-readable description
- AND the delivery entity MUST NOT be updated

#### Scenario: Retryable failure

- GIVEN a `DeliveryCommandJob` in `PROCESSING` status
- WHEN a transient error occurs (e.g., database connection timeout)
- THEN the status MUST move to `RETRYING`
- AND BullQueue MUST schedule a retry with backoff
- AND `attempts` MUST be incremented

#### Scenario: Dead letter after exhausted retries

- GIVEN a `DeliveryCommandJob` in `RETRYING` status
- WHEN the maximum retry attempts are reached without success
- THEN the status MUST move to `DEAD_LETTER`
- AND the job MUST NOT be retried again automatically
- AND the delivery entity MUST NOT be updated

#### Scenario: Status queryable by trackingId

- GIVEN a `DeliveryCommandJob` exists with status `COMPLETED`
- WHEN queried by `trackingId`
- THEN the response MUST include `jobId`, `trackingId`, `status: "COMPLETED"`, `deliveryId`, `attempts`, `createdAt`, `updatedAt`
- GIVEN a `DeliveryCommandJob` exists with status `FAILED`
- WHEN queried by `trackingId`
- THEN the response MUST also include `errorCode` and `errorMessage`

### Requirement: Worker processes jobs with existing business logic

The entregas-service MUST own a BullMQ worker that processes `deliveries.update_status` jobs. The worker MUST reuse the existing `DeliveriesService.updateStatus()` method with the same business validation and event publishing logic.

The job data (`UpdateDeliveryStatusJobData`) MUST include:

| Field | Type | Description |
|-------|------|-------------|
| `jobId` | string | BullMQ job ID (deterministic) |
| `trackingId` | string | Public tracking ID |
| `deliveryId` | string | Target delivery |
| `vendedorId` | string | Domain vendedor ID |
| `actorUserId` | string | Authenticated user ID |
| `idempotencyKey` | string | Idempotency key |
| `body.estado` | `DeliveryEstado.EN_CAMINO \| DeliveryEstado.ENTREGADA` | Target delivery state |
| `body.notas` | string? | Optional notes |
| `requestedAt` | ISO 8601 | When the request was received |

#### Scenario: Happy path processing

- GIVEN a valid `deliveries.update_status` job in the queue
- WHEN the worker picks it up
- THEN tracking status goes `PENDING → PROCESSING`
- AND `DeliveriesService.updateStatus()` is called with:
  - `deliveryId` from job data
  - `estado` from job body
  - `notas` from job body (if present)
  - `actorUserId` from job data
- AND on success, tracking goes `PROCESSING → COMPLETED`

#### Scenario: Delivery not found

- GIVEN a job references a non-existent `deliveryId`
- WHEN the worker calls `DeliveriesService.updateStatus()`
- THEN the service throws a `NotFoundException`
- AND the worker classifies this as non-retryable
- AND tracking goes `PROCESSING → FAILED` with `errorCode: "DELIVERY_NOT_FOUND"`

### Requirement: Event publishing from worker

When the worker processes a job and `DeliveriesService.updateStatus()` succeeds, the existing event publishing logic MUST fire exactly as it does today — `DeliveryStatusChangedEvent` plus lifecycle events (`DeliveryStartedEvent` or `DeliveryCompletedEvent`) on the applicable transitions.

All events MUST include the `actorUserId` from the job data, not a value from the body.

#### Scenario: DeliveryStatusChangedEvent published

- GIVEN a delivery transitions from `PENDIENTE` to `EN_CAMINO` via the worker
- WHEN `DeliveriesService.updateStatus()` succeeds
- THEN a `DeliveryStatusChangedEvent` is published with `estadoAnterior: PENDIENTE`, `estadoNuevo: EN_CAMINO`
- AND `actorUserId` matches the authenticated vendedor from the job data

#### Scenario: Lifecycle events published

- GIVEN the same `PENDIENTE → EN_CAMINO` transition
- WHEN `DeliveriesService.updateStatus()` succeeds
- THEN a `DeliveryStartedEvent` is ALSO published with the correct `deliveryId`, `orderId`, `vendedorId`, `clienteId`, and `actorUserId`
- GIVEN an `EN_CAMINO → ENTREGADA` transition
- THEN a `DeliveryCompletedEvent` is ALSO published with identical shape

### Requirement: Non-blocking event failure

Event publishing failures MUST NOT roll back the delivery status update or the tracking `COMPLETED` status. This follows the existing non-blocking event policy documented in the Delivery Events Specification.

#### Scenario: Event failure does not roll back

- GIVEN a delivery status transition succeeds in the database
- WHEN publishing any delivery event fails
- THEN the delivery status remains updated
- AND the tracking status remains `COMPLETED`
- AND the error is logged but NOT propagated to the caller
- AND the worker MUST NOT retry the job due to event failure alone

### Requirement: Idempotency with deterministic jobId

The system MUST derive the BullMQ `jobId` deterministically from `(deliveryId, idempotencyKey)` to prevent duplicate job enqueueing at the queue level. The same `(deliveryId, idempotencyKey)` pair MUST always produce the same `jobId`.

#### Scenario: Queue-level deduplication

- GIVEN a vendedor sends the same `(deliveryId, idempotencyKey)` twice
- WHEN the gateway enqueues the second request
- THEN BullMQ MUST reject the duplicate `jobId`
- AND the existing job MUST be returned or acknowledged without creating a new queue entry

#### Scenario: Same key returns existing result

- GIVEN a `DeliveryCommandJob` exists with terminal status (`COMPLETED`, `FAILED`, or `DEAD_LETTER`) for `(deliveryId, idempotencyKey)`
- WHEN the same idempotency key is submitted again
- THEN the system MUST return the existing `jobId`, `trackingId`, and terminal status
- AND MUST NOT reprocess or duplicate the delivery update

## MODIFIED Requirements

### Requirement: Update-status becomes async command

The `deliveries.update-status` TCP handler in entregas-service MUST be removed. The same business logic in `DeliveriesService.updateStatus()` is reused from the BullMQ worker. The `list` and `get` TCP handlers MUST remain unchanged.
(Previously: `update-status` was a synchronous TCP handler registered in the TCP controller.)

#### Scenario: TCP update-status handler removed

- GIVEN the entregas-service TCP controller
- WHEN inspecting the registered handler map
- THEN the `update_status` key MUST NOT be present
- AND `list` and `get` keys MUST still be registered and operational

#### Scenario: Business logic preserved

- GIVEN the same `DeliveriesService.updateStatus()` method
- WHEN called from the BullMQ worker instead of the TCP handler
- THEN all validation rules remain identical (valid transitions, missing delivery → error)
- AND all event publishing remains identical
- AND the `actorUserId` parameter is still passed correctly
