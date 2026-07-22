# Design: Notifications Event Ingestion

## Technical Approach

Add one internal create path to `notifications-service`: contracts define a typed create DTO, `ActivityLogsService.create()` validates/maps/persists, and `ActivityLogsTcpController` exposes only trusted TCP `activity_logs.create`. Gateway stays read-only. Redis Streams is a second PR that consumes typed `AguaFressEvent` messages and reuses the same create use case.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Module boundary | Keep ingestion inside `ActivityLogsModule`; create helpers stay near `activity-logs`, Redis under `src/streams` in PR2. | Public gateway action; shared audit module. | Preserves notifications ownership and avoids usuario-service `AUDIT_LOG` coupling. |
| Trust boundary | `activity_logs.create` is TCP-only and not added to `MicroServices/gateway/src/actions/action-registry.ts`. | Role-gated public create. | Spec requires no public/frontend creation; only trusted internal producers/seeds/tests can call it. |
| Idempotency | Resolve `dedupeKey = requestId ?? eventId`; store it with a sparse unique Mongo index. | Use only Mongo `_id`; always hash payload. | Replays with producer ids become safe; keyless payloads can still create separate logs as specified. |
| Error handling | Add notifications-service `RpcExceptionFilter`, matching orders/usuario pattern, before create ships. | Let Nest serialize raw exceptions. | TCP callers need typed validation/conflict errors and no partial persistence. |
| Delivery phasing | PR1: contracts + schema/index + service create + TCP create + tests. PR2: Redis config/client/consumer/mapper if accepted. | One large PR. | Proposal flags >400-line risk; split keeps reviewable slices. |

## Data Flow

```text
PR1 trusted producer/test ─TCP activity_logs.create→ ActivityLogsTcpController
  └─ TcpPayloadAdapter.createRequest() → ActivityLogsService.create()
      └─ Mongo activity_logs unique sparse dedupeKey index → ActivityLogDetailResponseDTO

PR2 Redis stream → StreamsConsumer → ActivityLogEventMapper → same create()
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/contracts/src/dto/notifications.dto.ts` | Modify | Add `ActivityLogSource`, `ActivityLogAction`, `CreateActivityLogRequestDTO`, optional `eventId`/`requestId`. |
| `packages/contracts/src/compile-checks/notifications-activity-logs.contract-check.ts` | Modify | Compile-check create contract. |
| `MicroServices/notifications-service/src/activity-logs/activity-log.schema.ts` | Modify | Add `dedupeKey?: string`, enum validation for create-backed fields, sparse unique index. |
| `MicroServices/notifications-service/src/activity-logs/activity-logs.service.ts` | Modify | Add `create()`, ISO timestamp normalization, enum validation, duplicate-key lookup/return. |
| `MicroServices/notifications-service/src/tcp/tcp-payload-adapter.service.ts` | Modify | Add `createRequest()` from `payload.body`; do not read `userId` from body for auth. |
| `MicroServices/notifications-service/src/activity-logs/activity-logs.tcp.controller.ts` | Modify | Add `@MessagePattern('activity_logs.create')` without SUPER_ADMIN role gate; treat as internal trusted pattern only. |
| `MicroServices/notifications-service/src/common/filters/rpc-exception.filter.ts` | Create | Copy/adapt existing RPC error normalization pattern. |
| `MicroServices/notifications-service/src/main.ts` | Modify | Register global `RpcExceptionFilter`. |
| `MicroServices/notifications-service/src/streams/*` | Create in PR2 | Redis consumer/provider/mapper gated by env. |
| `MicroServices/notifications-service/src/common/config/env.config.ts` | Modify in PR2 | Add Redis URL, consumer enabled flag, group/consumer names. |

## Interfaces / Contracts

Create DTO is request-only; read DTOs remain separate.

```ts
export interface CreateActivityLogRequestDTO {
  source: ActivityLogSource;
  action: ActivityLogAction;
  actor?: ActivityLogActorDTO;
  entity?: ActivityLogEntityDTO;
  result: ActivityLogResult;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  requestId?: string;
  eventId?: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Contracts | Create DTO and const-object enum types compile. | Existing compile-check pattern. |
| Unit | Service create validation, ISO defaults, dedupe hit, duplicate-key race handling. | Mock Mongoose model; no `any`. |
| TCP | `activity_logs.create` dispatches body through adapter; invalid payload becomes typed RPC error. | Controller/adapter specs. |
| Boundary | Gateway has no create action; no `AUDIT_LOG`/Prisma coupling. | Existing boundary spec extended. |
| PR2 Unit | Event mapper and consumer idempotency. | Mock Redis client and service. |

## Migration / Rollout

No data migration required. Mongo adds a sparse unique `dedupeKey` index; existing documents without the field are unaffected. Rollback PR1 by removing TCP create/service create/contracts and leaving read flows intact. Rollback PR2 by disabling the stream consumer env flag or reverting `src/streams/*`; TCP create remains usable.

## Open Questions

- [ ] PR2 acceptance and first consumed event set remain product decisions; PR1 is complete without streams.
