# Proposal: notifications-service

## Intent

Create the MVP notifications-service as the MongoDB-owned, TCP-only activity-log query service. This solves the scaffold gap and gives super-admins a gateway-visible `activity-logs` surface without inventing full event-stream ingestion before the repo has producer/consumer semantics.

## Scope

### In Scope
- Implement NestJS TCP bootstrap for `MicroServices/notifications-service` with Mongoose-backed `activity_logs` storage.
- Add `activity_logs.list` and `activity_logs.get-by-id` TCP reads; add internal `activity_logs.create` only if needed for seed/tests or trusted producers.
- Expose gateway family `activity-logs` for super-admin list/read through existing `/api/v1/{family}/{action}` routing style.
- Add MongoDB/docker/env wiring, contracts, DTOs, and tests for service and gateway dispatch.

### Out of Scope
- Full Redis Streams/Kafka-style event consumption across all services.
- Direct HTTP endpoints inside notifications-service.
- Replacing usuario-service `AUDIT_LOG` behavior in this change.

## Capabilities

### New Capabilities
- `activity-logs`: MongoDB-backed activity-log read capability exposed through the gateway.

### Modified Capabilities
- `audit-log`: clarify boundary with usuario-service audit logs; no behavioral replacement yet.

## User-Visible Behavior

- SUPER_ADMIN can list activity logs with pagination and filters, ordered newest first.
- SUPER_ADMIN can read one activity log by id.
- SUPER_ADMIN needs a comfortable read-only admin UI surface: table view, filters, pagination, and detail view.
- Frontend must expose this through a SUPER_ADMIN-only button/menu item that navigates to a dedicated Activity Logs screen.
- Non-admin or unauthenticated users are rejected by gateway before TCP dispatch.
- No frontend user can create, edit, or delete activity logs.

## Approach

- Keep gateway as the only HTTP entry; notifications-service listens over TCP only.
- Use Mongoose schemas with ISO 8601 timestamps and typed DTOs from `@agua/contracts`.
- Treat notifications-service as owner of MongoDB `activity_logs`; usuario-service remains owner of existing relational `AUDIT_LOG` until migration is specified.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `MicroServices/notifications-service/` | New | TCP app, module, schema, service, controller, tests, Dockerfile |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modified | Enable `activity-logs` mappings |
| `MicroServices/gateway/src/tcp/` | Modified | Add `NOTIFICATIONS_CLIENT` routing |
| `packages/contracts/src/dto/notifications.dto.ts` | Modified | Add request/response/pagination DTOs |
| `docker-compose.yml` | Modified | Add MongoDB and notifications-service env |

## Testing / Verification Plan

- Unit-test filtering, pagination, id lookup, and create validation.
- Integration-test TCP handlers with mocked/in-memory Mongo where practical.
- Gateway tests for role guard, route mapping, and unavailable-service failures.

## Chained PR Plan

1. Contracts + OpenSpec delta only (<400 changed lines).
2. Notifications-service bootstrap, schema, and service tests (<400).
3. Gateway routing/client integration tests (<400).
4. Docker/Mongo compose wiring and docs (<400).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate audit concepts | High | Specify ownership; no migration in MVP |
| Event ingestion ambiguity | High | Defer until producers/streams are designed |
| Review size creep | Medium | Force chained PRs under 400-line budget |

## Rollback Plan

Disable `activity-logs` in gateway registry, remove notifications-service compose entry, and keep usuario-service audit logs untouched.

## Dependencies

- MongoDB local/docker wiring.
- Final boundary decision between `AUDIT_LOG` and MongoDB `activity_logs`.
- Frontend follow-up: Jira `AG-166` adds the SUPER_ADMIN-only Activity Logs button/screen that consumes this read-only gateway contract.

## Open Questions

- Should MVP seed/write logs through internal TCP `activity_logs.create`, or only read existing Mongo data?
- Which usuario-service audit-log records, if any, should later migrate or mirror into notifications-service?

## Success Criteria

- [ ] `activity-logs` gateway family dispatches only allowed super-admin read actions.
- [ ] notifications-service persists/reads activity logs from MongoDB over TCP.
- [ ] Tests cover contracts, TCP behavior, gateway routing, and authorization failures.
- [ ] Frontend can consume a read-only activity-log list/detail contract suitable for a super-admin table UI with filters and pagination.
