# Exploration: notifications-service

### Current State

- `notifications-service` is only a scaffold: `package.json` exists and the only source files are one-line placeholders under `src/common/` and `src/activity-logs/`. There is no `main.ts`, `app.module.ts`, TCP controller, Mongoose schema, Dockerfile, tests, or compose service.
- The current architecture is gateway-first HTTP with TCP-only domain microservices. Redis + BullMQ is used for durable async commands only when the use case can wait; Kafka is not part of the current resilience work.
- Sources of truth describe notifications as a MongoDB/Mongoose-owned service for activity logs. It should consume system activity/events and expose activity log reads through the gateway family `activity-logs`.
- Gateway already reserves `activity-logs` as an unavailable family; no TCP client/env mapping exists for notifications yet.
- Shared contracts currently include `ActivityLogResponse` and `LogFilters`, but they do not define paginated activity-log responses, TCP payloads, notification-specific event ingestion contracts, or typed activity-log actions beyond generic strings.
- `contratosDTOs/notifications-service.json` still says the service listens to Redis Streams and persists all bus events. This conflicts with the current “no Kafka” guidance only if treated as an implemented event bus; Redis Streams references should be revalidated before proposal because current implemented async infrastructure is BullMQ.

### Affected Areas

- `MicroServices/notifications-service/` — implement NestJS TCP microservice bootstrap, AppModule, ActivityLogs module, Mongoose connection, schemas, services, controllers, tests, and Dockerfile.
- `MicroServices/gateway/src/actions/action-registry.ts` — change `activity-logs` from unavailable to available once TCP read actions exist.
- `MicroServices/gateway/src/tcp/tcp-clients.module.ts` and `src/tcp/tcp-dispatcher.service.ts` — add `NOTIFICATIONS_CLIENT` and service-family routing for `activity-logs`.
- `MicroServices/gateway/src/config/env.config.ts` and `docker-compose.yml` — add notifications TCP host/port and MongoDB service/env wiring.
- `packages/contracts/src/dto/notifications.dto.ts` and possibly `packages/contracts/src/enums.ts` — strengthen DTOs with paginated responses, request/query contracts, typed action/service values, and ISO date fields.
- `packages/contracts/src/events.ts` — re-check current event model before adding consumers; existing comments mention Redis Streams but no implemented publisher infrastructure is present.
- `contratosDTOs/notifications-service.json`, `contratosDTOs/api-gateway.json`, docs/OpenSpec specs — align public/gateway contract and clarify whether activity logs come from TCP writes, BullMQ jobs, Redis Streams later, or existing user-service audit data for MVP.

### Approaches

1. **MVP activity-log query service first** — Build notifications as a TCP-only MongoDB service with `activity_logs.list` and optional `activity_logs.create` internal command, then expose gateway `GET /api/v1/activity-logs/list` for `super_admin`.
   - Pros: matches gateway/domain boundary, gives a working vertical slice, avoids inventing an event bus not implemented today.
   - Cons: does not yet provide automatic cross-service event consumption; producers must call/emit explicitly later.
   - Effort: Medium.

2. **Full event consumer service now** — Build MongoDB persistence plus consumers for all declared event streams (`auth-stream`, `user-stream`, `products-stream`, `orders-stream`, `deliveries-stream`).
   - Pros: closest to the older contract JSON and long-term audit-log vision.
   - Cons: high architectural risk because current repo does not show working Redis Streams publishers/consumer groups; would broaden scope beyond current BullMQ resilience pattern.
   - Effort: High.

3. **Keep audit logs inside usuario-service for MVP** — Do not implement notifications yet; continue using existing `super_admin.audit_log` backed by usuario-service.
   - Pros: smallest scope and avoids duplicate audit concepts.
   - Cons: contradicts current SPEC item that notifications-service owns MongoDB activity logs; does not move AG-153 forward.
   - Effort: Low.

### Recommendation

Use approach 1 for the proposal: implement a TCP-only `notifications-service` focused on MongoDB activity-log storage and super-admin query through the gateway, while explicitly deferring full event-stream consumption until producers and stream semantics are designed. This keeps scope compatible with the current architecture: gateway is the only HTTP entry, domain services are TCP-only, MongoDB belongs to notifications, and BullMQ remains reserved for durable async commands that need tracking/retries.

The proposal should treat `activity-logs` as the public gateway family, not `notifications`, because the current gateway registry and frontend docs already reserve `activity-logs`. Define concrete TCP patterns such as `activity_logs.list` and, only if needed for internal producers, `activity_logs.create`. Do not expose direct HTTP from the service.

### Risks

- Event ingestion is the main gap: docs/contracts mention Redis Streams, but current implemented async work is BullMQ and there are no obvious publishers for all domain events.
- There are two audit-log concepts: usuario-service already has `AUDIT_LOG`/`super_admin.audit_log`, while notifications is planned as MongoDB `activity_logs`. The boundary and migration/duplication rule must be made explicit.
- `notifications-service` lacks normal Nest files and Docker setup despite having compiled stale `dist/` artifacts; source must be treated as the truth.
- Compose currently has PostgreSQL and Redis only. MongoDB must be added before the service can run locally.
- Chained PRs are recommended because contracts, infra, service implementation, gateway integration, and docs/tests will exceed the 400-line review budget if shipped together.

### Ready for Proposal

Yes — proceed to proposal with a narrow MVP scope: MongoDB-backed activity logs over TCP, gateway `activity-logs` read route for `super_admin`, Docker/Mongo wiring, tests, and explicit deferral of full event-stream consumption until the project defines producer/consumer mechanics under the current no-Kafka architecture.
