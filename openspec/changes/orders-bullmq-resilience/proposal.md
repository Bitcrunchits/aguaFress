# Proposal: Orders BullMQ Resilience

## Intent

Implement two-road resilience for `orders.create`: TCP stays for immediate operations; Redis + BullMQ carries critical async creation without losing accepted commands. AG-161 is the Jira tracking subtask under AG-87.

## Scope

### In Scope
- `POST /api/v1/orders/create` returns `202 Accepted` with `jobId` and `trackingId` after validation.
- Gateway enqueues only `orders.create`; it MUST NOT persist final business data.
- orders-service owns worker processing, rules, persistence, tracking, idempotency, retries, and DLQ.
- Clients can query status: `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, `DEAD_LETTER`.

### Out of Scope
- Kafka or event streaming for this problem.
- Queuing synchronous reads/lifecycle operations; they stay TCP.
- Applying BullMQ elsewhere before the pilot is proven.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `order-management`: async creation, tracking/idempotency, worker completion semantics.
- `orders-gateway-routing`: route `orders.create` through BullMQ; preserve TCP elsewhere.

## Approach

Use thin gateway enqueue plus durable orders-service ownership. Gateway validates JWT context, role, payload, and idempotency, creates deterministic BullMQ `jobId` from `clienteId + idempotencyKey`, and returns `202`. The worker records tracking, transitions status safely, calls the existing order creation use case, persists the order, clears the cart only on success, and classifies failures.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/contracts/src/*` | Modified | async/status DTOs and typed constants/enums. |
| `MicroServices/gateway/src/actions/*` | Modified | `orders.create` becomes async/BullMQ. |
| `MicroServices/gateway/src/queues/*` | New | enqueue module separate from TCP dispatcher. |
| `MicroServices/orders-service/prisma/schema.prisma` | Modified | tracking/idempotency table. |
| `MicroServices/orders-service/src/orders/*` | Modified | use case reuse, tracking lookup, worker. |
| `docker-compose.yml`, `.env.example` | Modified | Redis/queue env wiring. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| duplicate create | Med | deterministic `jobId` plus unique `(clienteId, idempotencyKey)`. |
| gateway SRP drift | Med | queue module separate from TCP dispatcher. |
| bad retry policy | Med | classify retryable vs terminal errors. |
| review overload | High | force chained PRs under 400 changed lines. |

## Rollback Plan

Revert async `orders.create` mapping, queue modules, worker wiring, contracts, and tracking schema delta. TCP reads/lifecycle remain unchanged, isolating rollback to the pilot path.

## Dependencies

- Redis exists in compose; BullMQ/Redis client packages must be added to gateway and orders-service.
- AG-161 tracks this proposal and implementation slice.

## Success Criteria

- [ ] `orders.create` returns `202` with `jobId` and `trackingId` after validation.
- [ ] orders-service owns tracking/idempotency and persistence.
- [ ] duplicate idempotency keys do not create duplicate orders.
- [ ] retries/backoff and failed/DLQ states are observable.
- [ ] Chained PRs stay under 400 changed lines: contracts/env, gateway enqueue, orders tracking, worker/status, polish.
