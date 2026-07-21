# Exploration: notifications-event-ingestion

### Current State

- `notifications-service` is a TCP-only Nest microservice backed by MongoDB `activity_logs`; it exposes `activity_logs.list` and `activity_logs.get-by-id` only.
- `ActivityLogsService` can filter, paginate, map DTOs, and read by Mongo ObjectId, but has no `create()` use case and no event consumer.
- Gateway exposes only SUPER_ADMIN read actions for `activity-logs`; there is no public create route and that should remain true.
- Shared notification contracts currently model read/list/detail DTOs only. No create DTO or activity-log ingestion event contract exists.
- Shared Redis event contracts define typed streams (`auth-stream`, `user-stream`, `products-stream`, `orders-stream`, `deliveries-stream`) and typed events, but the repo has no Redis Streams producer/consumer implementation yet.
- Existing Redis usage is BullMQ for async `orders.create`, not Redis Streams. The useful pattern is SRP/DIP around ports/providers/workers, not a reusable stream consumer implementation.
- `usuario-service` owns relational `AUDIT_LOG` via Prisma and records it through `AuditLogService` / `AuditLogInterceptor`; that remains a separate audit-query capability.

### Affected Areas

- `packages/contracts/src/dto/notifications.dto.ts` — add trusted internal create/ingestion DTOs without exposing public gateway create semantics.
- `packages/contracts/src/events.ts` and `packages/contracts/src/enums.ts` — likely consume existing stream event unions and `RedisStreams`; avoid changing existing event interfaces.
- `MicroServices/notifications-service/package.json` — add Redis client dependency if Redis Streams consumer is in scope (`ioredis` fits current repo usage).
- `MicroServices/notifications-service/src/common/config/env.config.ts` — add `REDIS_URL`, consumer group/name, and stream enablement configuration.
- `MicroServices/notifications-service/src/activity-logs/activity-logs.service.ts` — add a `create()` persistence use case and mapper from ingestion input to Mongo model.
- `MicroServices/notifications-service/src/activity-logs/activity-logs.tcp.controller.ts` — optionally add `activity_logs.create` for trusted internal TCP callers only; never register it in gateway action registry.
- `MicroServices/notifications-service/src/activity-logs/activity-log.schema.ts` — current shape is adequate; may need indexes for `requestId` or duplicate/idempotency handling.
- `MicroServices/notifications-service/src/events/*` or `src/streams/*` — new Redis Streams consumer module/service with event-to-activity-log mapping.
- `MicroServices/notifications-service/src/app.module.ts` — import ingestion module when stream consumption is enabled.
- `docker-compose.yml` — pass `REDIS_URL` and consumer config to notifications-service; add Redis dependency.
- `MicroServices/gateway/src/actions/action-registry.ts` — should remain read-only; only tests may assert create is unavailable.
- `MicroServices/usuario-service/src/audit-log/*` — no direct change recommended for AG-167 unless a later producer slice explicitly publishes audit events.

### Approaches

1. **Trusted TCP create only** — Add `activity_logs.create` plus create DTO/service path for internal producers, seeds, and tests.
   - Pros: Lowest risk; closes the immediate “no write path” gap; no Redis lifecycle/idempotency complexity.
   - Cons: Still not event ingestion; every producer would need explicit TCP calls; easy to create tight coupling between services.
   - Effort: Low.

2. **Redis Streams consumer only** — notifications-service consumes existing typed streams and maps domain events into `activity_logs`.
   - Pros: Matches architecture source of truth for async events; keeps producers decoupled; notifications-service becomes a real ingestion sink.
   - Cons: No existing Redis Streams producer/consumer implementation to copy; requires offset/group/idempotency/error handling decisions; current services may not publish events yet.
   - Effort: Medium/High.

3. **Phased create use case + Redis Streams consumer** — First introduce a single internal `create()` ingestion use case and DTO; then wire a Redis Streams consumer that maps events into that same use case.
   - Pros: Best SRP boundary; TCP create supports seeds/tests/trusted backfill while stream consumer delivers the real event-ingestion mission; avoids duplicating persistence rules.
   - Cons: More files than TCP-only; likely exceeds 400 changed lines if shipped as one PR.
   - Effort: Medium.

### Recommendation

Use approach 3, but slice it. AG-167 should define the capability as **activity-log ingestion**, not user-facing notifications. The minimal safe boundary is:

1. Add an internal `ActivityLogsService.create()` use case plus `activity_logs.create` TCP handler for trusted callers/seeds/tests only.
2. Keep gateway read-only: do not add `/api/v1/activity-logs/create`.
3. Add Redis Streams consumption as a separate implementation slice that maps existing `AguaFressEvent` variants into activity-log records through the same `create()` use case.
4. Preserve `usuario-service` `AUDIT_LOG` ownership. Do not read/migrate relational audit logs from notifications-service in AG-167.

This gives the service a real ingestion boundary without pretending to implement push notifications, inboxes, unread counters, preferences, or user-facing delivery.

### Risks

- Redis Streams have contracts but no current runtime pattern in the repo; implementation must avoid inventing too much framework in one PR.
- If producers are not changed, a Redis consumer may be technically ready but still see no data until producer publication exists.
- Adding TCP create and stream consumption together may exceed the 400-line review budget; split the work before apply.
- Idempotency/deduplication needs a small explicit rule, likely based on stream id and/or `requestId`, to avoid duplicate Mongo activity logs on consumer restart.
- Mapping every domain event into human-readable `summary` strings can become a dumping ground; keep a small mapper per stream/event type.
- Do not blur the boundary with `usuario-service` `AUDIT_LOG`; relational admin audit remains source-owned by usuario-service.

### Delivery Slicing Suggestion

- PR 1: Contracts + notifications-service internal create use case/TCP handler + tests. No gateway public create.
- PR 2: Redis Streams config/provider/consumer skeleton with controlled start/stop and tests around event-to-create mapping.
- PR 3: Stream mappings for currently contracted events and Docker/env wiring. Add producer changes only if explicitly scoped by a later proposal.

400-line budget risk: Medium/High if combined; Low/Medium if split as above.
Decision needed before apply: Yes, if the task plan tries to include producer changes or user-facing notifications.
Chained PRs recommended: Yes.

### Ready for Proposal

Yes — proceed to SDD proposal/spec/design. The proposal should lock scope to ingestion of activity logs, keep gateway create out of scope, and treat Redis Streams consumer as the real ingestion mechanism backed by the same internal create use case.
