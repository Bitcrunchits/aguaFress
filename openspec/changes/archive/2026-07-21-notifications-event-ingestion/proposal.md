# Proposal: Notifications Event Ingestion

## Intent

Turn `notifications-service` from read-only queries into internal activity-log ingestion for AG-167, without public create behavior or crossing `usuario-service` ownership.

## Scope

### In Scope
- Internal `ActivityLogsService.create()` for MongoDB `activity_logs`.
- Trusted TCP `activity_logs.create` for callers/seeds/tests only.
- Redis Streams consumer mapping typed events into the same create use case.
- Gateway/frontend activity logs remain read-only.

### Out of Scope
- Public HTTP/gateway create.
- Push notifications, inboxes, unread counters, preferences, or UX.
- Reading/migrating/replacing `usuario-service` relational `AUDIT_LOG`.
- Producer changes outside notifications-service.

## Capabilities

### New Capabilities
- `activity-log-ingestion`: Internal/TCP and async/Redis ingestion into notifications activity logs.

### Modified Capabilities
- None. `audit-log` stays owned by `usuario-service`.

## User-Visible Behavior

- SUPER_ADMIN read flows keep working.
- No user/front/public API can create activity logs.
- When producers exist, domain activity may appear via internal ingestion.

## Approach

Phase 1: contracts + `ActivityLogsService.create()` + trusted TCP create. Phase 2: Redis config/consumer maps `AguaFressEvent` into that use case. Keep mappers small and define idempotency via stream id and/or `requestId`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/contracts/src/dto/notifications.dto.ts` | Modified | Internal create DTOs. |
| `MicroServices/notifications-service/src/activity-logs/*` | Modified | Create use case, TCP handler, tests. |
| `MicroServices/notifications-service/src/streams/*` | New | Redis consumer/provider/mappers. |
| `MicroServices/notifications-service/src/common/config/env.config.ts` | Modified | Redis/consumer config. |
| `docker-compose.yml` | Modified | Redis env/dependency wiring. |
| `MicroServices/gateway/src/actions/action-registry.ts` | Unchanged | Must stay read-only. |

## Testing / Verification

- Unit tests for create validation, mapping, persistence shape.
- TCP controller tests for trusted create success/failure.
- Stream mapper/consumer tests for event-to-create and idempotency.
- Regression test: gateway exposes no activity-log create.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No Redis Streams runtime pattern | Medium | Minimal consumer behind config. |
| >400 changed lines if combined | High | Split create/TCP and stream slices. |
| Duplicate logs on restart | Medium | Specify idempotency key first. |
| `AUDIT_LOG` boundary blur | Medium | No Prisma relation/FK/migration/direct reads. |

## Rollback Plan

Disable stream consumer config, remove TCP create if needed, and revert contracts/service changes. Existing reads and `usuario-service` `AUDIT_LOG` remain unaffected.

## Dependencies

- Redis container and typed event contracts.
- Possible notifications-service Redis client dependency.
- Later producers to publish events.

## Open Questions

- Idempotency key: stream id, `requestId`, or both?
- Which event types ship in first stream slice?

## Success Criteria

- [ ] Internal create persists activity logs.
- [ ] Trusted TCP create works; no public HTTP create exists.
- [ ] Redis ingestion reuses create path.
- [ ] Gateway remains read-only.
- [ ] `usuario-service` `AUDIT_LOG` stays independent.
