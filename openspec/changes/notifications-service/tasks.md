# Tasks: notifications-service

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,000-1,400 total; each chained PR target <400 |
| Changed files | ~24-32 files across contracts, notifications-service, gateway, compose/tests |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 contracts → PR2 service core → PR3 TCP/bootstrap → PR4 gateway → PR5 docker/manual verification |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |
| Decision needed before apply | No |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Typed activity-log contracts | PR 1 | base = `adrian/ag-153-notifications-service`; AG-164; AG-166 consumes this only. |
| 2 | Mongo service domain | PR 2 | base = PR1 branch; AG-156/157/165. |
| 3 | TCP-only service bootstrap | PR 3 | base = PR2 branch; AG-155/159. |
| 4 | Gateway read integration | PR 4 | base = PR3 branch; AG-158/165. |
| 5 | Docker and smoke verification | PR 5 | base = PR4 branch; AG-154/160. |

## Phase 1: Contracts RED/GREEN/VERIFY (PR 1)

- [x] 1.1 RED AG-164: add contract compile/test expectations for `ActivityLogResult`, row/detail DTOs, list request, and paginated response in `packages/contracts/src/dto/notifications.dto.ts`.
- [x] 1.2 GREEN AG-164: implement const-object result types, flat DTO interfaces, ISO string fields, and export from `packages/contracts/src/index.ts`.
- [x] 1.3 VERIFY AG-164/AG-166: run contracts build/tests; confirm no `unknown[]` response and no create/update/delete gateway contract.

## Phase 2: ActivityLogs Mongo Domain RED/GREEN/VERIFY (PR 2)

- [x] 2.1 RED AG-156/157: add service tests for newest-first list, filters, pagination, ObjectId validation, missing id, and DTO mapping under `MicroServices/notifications-service/src/activity-logs/`.
- [x] 2.2 GREEN AG-156: create Mongoose schema/indexes and `ActivityLogsService` filter builder/list/get-by-id mapper using `@agua/contracts` DTOs.
- [x] 2.3 VERIFY AG-165: add/verify boundary test or note that usuario-service `AUDIT_LOG` remains untouched and no migration code exists.

## Phase 3: TCP Bootstrap RED/GREEN/VERIFY (PR 3)

- [ ] 3.1 RED AG-155/159: add TCP controller/payload-adapter tests for `activity_logs.list`, `activity_logs.get-by-id`, super-admin enforcement, and optional trusted `activity_logs.create`.
- [ ] 3.2 GREEN AG-155/156: create `main.ts`, `app.module.ts`, env config, `src/tcp/*`, activity-logs module/controller, and TCP-only bootstrap on `TCP_PORT`.
- [ ] 3.3 VERIFY AG-159: run notifications-service unit tests and build; confirm there is no HTTP controller/listener.

## Phase 4: Gateway Integration RED/GREEN/VERIFY (PR 4)

- [ ] 4.1 RED AG-158/159: add gateway tests proving `activity-logs/list` and `get-by-id` dispatch to `NOTIFICATIONS_CLIENT`, while non-admin/unauthenticated requests send no TCP message.
- [ ] 4.2 GREEN AG-158: update `action-registry.ts`, `src/tcp/tcp-clients.module.ts`, dispatcher routing, config env, and app wiring for notifications-service.
- [ ] 4.3 VERIFY AG-165: test `/audit-logs` still uses usuario-service `AUDIT_LOG` only and `activity-logs` exposes read-only actions.

## Phase 5: Docker and Manual Verification (PR 5)

- [ ] 5.1 RED AG-154: add expected env/compose assertions or documented smoke checklist for MongoDB and notifications-service startup.
- [ ] 5.2 GREEN AG-154: add `MicroServices/notifications-service/Dockerfile`, Nest/TS config if missing, `mongo:7`, `agua-mongo-data`, service env, and gateway env in `docker-compose.yml`.
- [ ] 5.3 VERIFY AG-160: run targeted builds/tests and smoke `docker compose up -d mongo notifications-service gateway`; record commands/results in verify notes.
