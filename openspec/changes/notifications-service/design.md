# Design: notifications-service

## Technical Approach

Build `MicroServices/notifications-service` as a TCP-only NestJS microservice that owns MongoDB `activity_logs` through Mongoose. The gateway remains the only HTTP entry and exposes read-only `activity-logs` actions for `SUPER_ADMIN`; usuario-service keeps owning relational `AUDIT_LOG`.

## Architecture Decisions

| Area | Choice | Alternatives considered | Rationale |
|------|--------|-------------------------|-----------|
| Transport | Nest TCP patterns `activity_logs.list`, `activity_logs.get-by-id`, optional internal `activity_logs.create` | Direct HTTP in notifications-service | Matches existing gateway-first architecture and keeps service private. |
| Storage | MongoDB + Mongoose schema in notifications-service | Prisma/PostgreSQL or usuario-service `AUDIT_LOG` reuse | AG-153 requires Mongo-owned activity logs; audit-log spec forbids replacing usuario-service records. |
| Authorization | Enforce `SUPER_ADMIN` in gateway registry and again in TCP handler via payload adapter | Gateway-only auth | Defense in depth, consistent with usuario-service TCP handlers. |
| Frontend contract | Read-only list/detail DTOs shaped for table, filters, pagination, metadata | Generic `unknown[]` log response | AG-166 needs stable UI data; repo rules forbid `unknown[]` responses. |

## Data Flow

```text
SUPER_ADMIN UI
  -> GET /api/v1/activity-logs/list?source=&action=&actor=&result=&from=&to=&page=&limit=
  -> Gateway ActionResolver + RolesGuard
  -> NOTIFICATIONS_CLIENT.send('activity_logs.list', TcpCommandPayload)
  -> ActivityLogsTcpController -> ActivityLogsService -> Mongoose ActivityLogModel
  -> ActivityLogListResponseDTO

GET /api/v1/activity-logs/get-by-id?id=<id> follows the same path and returns one detail DTO.
```

No gateway route maps create/update/delete. If implemented, `activity_logs.create` stays internal for seeds/tests/trusted producers only.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `MicroServices/notifications-service/src/main.ts` | Create | TCP bootstrap on `TCP_PORT`, no HTTP listener. |
| `MicroServices/notifications-service/src/app.module.ts` | Create | Imports config, Mongoose connection, common, activity logs. |
| `src/common/config/env.config.ts` | Create | Validate `TCP_PORT` and `MONGODB_URI`. |
| `src/tcp/*` | Create | `TcpPayload`, `TcpPayloadAdapter`, and module with whitelist validation. |
| `src/activity-logs/*` | Replace/Create | Module, TCP controller, service, Mongoose schema, DTO validation. |
| `MicroServices/notifications-service/Dockerfile`, `nest-cli.json`, `tsconfig*.json` | Create | Align with existing Nest service build pattern without Prisma. |
| `packages/contracts/src/dto/notifications.dto.ts` | Modify | Replace stale minimal DTOs with typed list/detail/filter contracts. |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modify | Mark `activity-logs` available with `list` and `get-by-id`, `roles: ['super_admin']`. |
| `MicroServices/gateway/src/tcp/*` | Modify | Add `NOTIFICATIONS_CLIENT` and route `activity-logs` to it. |
| `MicroServices/gateway/src/config/env.config.ts` | Modify | Require notifications host/port. |
| `docker-compose.yml` | Modify | Add `mongo`, `notifications-service`, gateway env, volume. |

## Interfaces / Contracts

Mongoose `activity_logs`: `_id`, `createdAt`, `source`, `action`, `actor: { userId?, email?, role? }`, `entity: { type?, id? }`, `result`, `summary`, `metadata: Record<string, unknown>`, `requestId?`. Indexes: `createdAt desc`, `source+action`, `actor.userId`, `result`.

Contracts use const objects + extracted types for `ActivityLogResult` and response fields:
- `ActivityLogRowDTO`: id, createdAt, source, action, actor, entity, result, summary.
- `ActivityLogDetailDTO`: row fields plus metadata, requestId.
- `ListActivityLogsRequestDTO`: source, action, actor, result, from, to, page, limit.
- `ActivityLogListResponseDTO`: `data: ActivityLogRowDTO[]`, `meta: PaginationResponse`.

## Role / Auth Strategy

Gateway blocks unauthenticated/non-admin requests before dispatch through existing JWT and registry roles. Notifications TCP handler repeats `requireRole(payload, UserRole.SUPER_ADMIN)` for reads. Internal create requires authenticated trusted payload or is omitted until seeds/tests need it.

## Mongo / Docker / Env Plan

Add `mongo:7` with `agua-mongo-data`, expose `27017` for local development, and set `MONGODB_URI=mongodb://mongo:27017/agua_notifications` inside notifications-service. Gateway receives `NOTIFICATIONS_SERVICE_HOST=notifications-service` and `NOTIFICATIONS_SERVICE_TCP_PORT=3016`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | filter builder, pagination, id validation, DTO mapping | Jest with mocked Mongoose model. |
| TCP | list/get-by-id/create boundary and role failures | Controller tests with mocked service and payload adapter. |
| Gateway | registry mapping, roles block before dispatch, notifications client routing | Existing gateway Jest patterns. |
| Compose smoke | service starts with Mongo env | `docker compose up -d mongo notifications-service gateway`. |

## Migration / Rollout

No data migration required. Roll out in chained PRs: contracts, service, gateway, docker/docs. Rollback by marking `activity-logs` unavailable, removing notifications client/env, and stopping the compose service; usuario-service `AUDIT_LOG` remains untouched.

## Known Risks

- Duplicate audit concepts can confuse users; labels/docs must distinguish activity logs from usuario-service audit logs.
- No producers means Mongo may be empty until seeds/trusted create exist.
- Mongoose ObjectId validation and serialized TCP errors must be normalized consistently.

## Open Questions

- None blocking. Internal create can be added only if seeds/tests need it during implementation.
