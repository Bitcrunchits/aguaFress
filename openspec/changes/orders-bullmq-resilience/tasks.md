# Tasks: Orders BullMQ Resilience

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1,300; slice <400 |
| Estimated changed files | 18-26 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 contracts/env → PR2 gateway → PR3 tracking → PR4 worker/status → PR5 polish/Jira |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contracts/env/deps | PR 1 | base = AG-161 tracker; contracts build |
| 2 | Gateway enqueue | PR 2 | base = PR1; gateway tests |
| 3 | Tracking persistence | PR 3 | base = PR2; Prisma/repo tests |
| 4 | Worker/status/failures | PR 4 | base = PR3; orders tests |
| 5 | Polish/Jira | PR 5 | base = PR4; final verify |

## Phase 1: PR 1 — Contracts / Env

- [x] 1.1 RED: Add compile checks for `OrderJobStatus`, async accepted/status responses, create-job data in `packages/contracts/src/*`.
- [x] 1.2 GREEN: Add enum/DTO exports in `packages/contracts/src/enums.ts` and `packages/contracts/src/dto/orders.dto.ts`; flat, no `any`.
- [x] 1.3 GREEN: Add BullMQ/Redis deps/env defaults to service manifests, `.env.example`, `docker-compose.yml`.
- [x] 1.4 VERIFY: Run `pnpm --filter @agua/contracts build`.

## Phase 2: PR 2 — Gateway Async Enqueue

- [x] 2.1 RED: Add gateway tests for idempotency required, header/body key accepted, body `userId` ignored, no TCP fallback, sync unchanged.
- [x] 2.2 GREEN: Create `MicroServices/gateway/src/queues/*` module/provider, `OrdersCreateQueueService`, deterministic `orders.create:{clienteId}:{idempotencyKey}` builder.
- [x] 2.3 GREEN: Update `action-registry.ts`, `gateway.controller.ts`, `env.config.ts`; only `orders.create` returns `202` with IDs/status URL.
- [x] 2.4 REFACTOR/VERIFY: Keep TCP dispatcher SRP untouched; run `pnpm --filter @agua/gateway test` and `pnpm --filter @agua/gateway build`.

## Phase 3: PR 3 — Orders Tracking Persistence

- [ ] 3.1 RED: Add tests for duplicate `(clienteId,idempotencyKey)`, payload conflict, lookup, and atomic transitions.
- [ ] 3.2 GREEN: Add `OrderCommandJob` to `MicroServices/orders-service/prisma/schema.prisma` with unique `tracking_id`, `job_id`, and `(cliente_id,idempotency_key)`.
- [ ] 3.3 GREEN: Extend `orders.repository.ts` and tracking service with create/find/update methods using enums and ISO strings.
- [ ] 3.4 VERIFY: Run `pnpm --filter @agua/orders-service prisma:validate`, `prisma:generate`, and `test`.

## Phase 4: PR 4 — Worker / Status / Failure Semantics

- [ ] 4.1 RED: Add tests for `PROCESSING`, `COMPLETED`, `RETRYING`, `FAILED`, `DEAD_LETTER`, and no cart clear on failure.
- [ ] 4.2 GREEN: Create `orders/jobs/*` worker, processor, classifier, BullMQ wiring; call existing `OrdersService.create()`.
- [ ] 4.3 GREEN: Add `orders.job_status` in `orders.controller.ts`; remove sync `orders.create` only after gateway cutover.
- [ ] 4.4 REFACTOR/VERIFY: Run `pnpm --filter @agua/orders-service test` and `pnpm --filter @agua/orders-service build`.

## Phase 5: PR 5 — Final Verification / Jira

- [ ] 5.1 VERIFY: Run contracts, gateway, orders tests/builds plus Prisma validate/generate.
- [ ] 5.2 REFACTOR: Remove dead code/imports; confirm no `console.log`, `any`, or gateway business persistence.
- [ ] 5.3 TASK: After implementation, update Jira AG-161 with chained PR links, verification, and status route decision.
