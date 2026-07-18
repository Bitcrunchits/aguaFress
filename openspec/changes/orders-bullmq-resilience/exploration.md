# Exploration: orders-bullmq-resilience

### Current State

- The official docs/specs already define the two-road design: TCP remains for immediate operations; Redis + BullMQ is reserved for critical async commands, with `orders.create` as the first pilot.
- Gateway currently treats `POST /api/v1/orders/create` as a synchronous TCP send: `ACTION_REGISTRY.orders.create` maps to `tcpPattern: 'orders.create'`, `transport: 'send'`, role `cliente`, and `retryOnTimeout: false`.
- Gateway builds a normalized payload with sanitized body, query, params, JWT user context, and `requestId`; it does not currently read `Idempotency-Key`, validate `idempotencyKey`, inject BullMQ, or return `202 Accepted`.
- orders-service currently exposes `@MessagePattern('orders.create')` and immediately runs `OrdersService.create()`, which validates the cliente role, validates cart items through `ProductCatalogPort`, persists the final order from cart in Prisma, creates history, increments per-vendor counter, and deletes the cart in one transaction.
- No BullMQ dependencies/config exist yet in `package.json` files. Redis exists in `docker-compose.yml` and `.env.example` already has `REDIS_URL="redis://redis:6379"`, but gateway/orders-service env validators/modules do not consume it.
- OpenSpec has no `openspec/config.yaml` in this repo; current active specs exist under `openspec/specs/` and archived changes must not be edited.

### Affected Areas

- `MicroServices/gateway/package.json` and `pnpm-lock.yaml` — add BullMQ/Redis client dependencies for enqueueing.
- `MicroServices/gateway/src/config/env.config.ts` — validate Redis/queue env such as `REDIS_URL`, queue name, attempts/backoff if gateway owns enqueue options.
- `MicroServices/gateway/src/actions/action-registry.ts` — represent `orders.create` as async/BullMQ without breaking TCP mappings for other actions.
- `MicroServices/gateway/src/gateway.controller.ts` — special-case async actions or delegate to an async dispatcher; read `Idempotency-Key`/body `idempotencyKey`, keep JWT/body sanitization, and return `202` for create only.
- `MicroServices/gateway/src/tcp/tcp-dispatcher.service.ts` or new `src/queues/*` — avoid mixing TCP dispatch responsibility with queue enqueue responsibility.
- `MicroServices/gateway/src/app.module.ts` — import queue module/providers.
- `MicroServices/gateway/test/gateway.http.spec.ts` and related dispatcher tests — update current `orders.create` expectations from TCP `200` to BullMQ `202`.
- `MicroServices/orders-service/package.json` and `pnpm-lock.yaml` — add worker-side BullMQ/Redis dependencies.
- `MicroServices/orders-service/prisma/schema.prisma` — add durable tracking/idempotency model(s) owned by orders-service, e.g. `OrderCommandJob` mapped to an uppercase table.
- `MicroServices/orders-service/src/common/config/env.config.ts` — validate queue/Redis env for worker startup.
- `MicroServices/orders-service/src/app.module.ts` and likely new `src/queues/*` or `src/orders/jobs/*` — register BullMQ worker/processors owned by orders-service.
- `MicroServices/orders-service/src/orders/orders.controller.ts` — remove or deprecate synchronous `orders.create`; keep `orders.job_status` as TCP/status lookup.
- `MicroServices/orders-service/src/orders/orders.service.ts` — keep business creation logic reusable; worker should call the same domain service path, not duplicate rules.
- `MicroServices/orders-service/src/orders/orders.repository.ts` — add repository methods for tracking/idempotency persistence and transactional state transitions.
- `packages/contracts/src/dto/orders.dto.ts`, `packages/contracts/src/enums.ts`, `packages/contracts/src/index.ts` — add async DTOs/status constants/enums using existing contract export pattern.
- `docker-compose.yml` and `.env.example` — wire Redis URL/env to gateway/orders-service explicitly if not relying on shared root env.

### Approaches

1. **Thin gateway enqueue + durable tracking in orders-service** — Gateway validates auth/role/payload/idempotency key, enqueues `orders.create`, returns `202`; orders-service worker creates/updates tracking rows and final order.
   - Pros: matches official ownership rule; gateway remains entry/router only; business state/idempotency stay in orders-service DB.
   - Cons: duplicate idempotency retries at gateway cannot know existing tracking before worker persists unless jobId derives from idempotency key or gateway asks status synchronously.
   - Effort: Medium.

2. **Gateway pre-registers tracking in orders-service before enqueue** — Gateway calls orders-service synchronously to reserve idempotency/tracking, then enqueues with that tracking ID.
   - Pros: repeated client retries can return the same tracking result before worker starts.
   - Cons: adds a synchronous dependency to the async acceptance path and muddies the “gateway enqueues, orders-service owns persistence” boundary.
   - Effort: High.

### Recommendation

Use approach 1, but make the BullMQ `jobId` deterministic from `clienteId + idempotencyKey` and persist tracking/idempotency in orders-service as soon as the worker sees the job. The tracking/idempotency table should live in the orders-service Prisma schema, not gateway, because it is business-command state tied to order creation. Suggested model shape: `tracking_id`, `idempotency_key`, `cliente_id`, `status`, `job_id`, `payload_hash`, `order_id?`, `error_code?`, `error_message?`, `attempts`, `created_at`, `updated_at`, with a unique constraint on `(cliente_id, idempotency_key)` and safe status transitions.

Keep `OrdersService.create()` as the domain use case and call it from the worker after recording `PROCESSING`; do not reimplement order rules inside a processor. Add a dedicated queue/enqueue service in gateway and a dedicated worker/tracking service in orders-service to preserve SRP/DIP.

### Risks

- Current gateway action model only knows TCP `send|publish`; forcing BullMQ into `TcpDispatcherService` would violate SRP and make transport behavior hard to test.
- Idempotency is the hardest boundary: if gateway only enqueues and Redis accepts a duplicate before DB tracking exists, deterministic BullMQ job IDs and orders-service unique constraints are both needed.
- `orders.create` currently returns `OrderResponse`; tests and contracts must change to `AsyncAcceptedResponse`/status tracking without breaking sync reads/actions.
- Product dependency failures are currently thrown during synchronous create; worker must classify retryable vs non-retryable errors carefully to avoid retrying validation/business failures forever.
- Prisma enum/status design must use typed constants/enums and map table names with `@@map()` per repo rules; no string status literals.
- Chained PRs are recommended because dependencies/contracts, gateway enqueue, orders worker/persistence, and tests will likely exceed the 400-line review budget if shipped together.

### Testing Capabilities

- Contracts build: `pnpm --filter @agua/contracts build`.
- Gateway unit/integration tests: `pnpm --filter @agua/gateway test`.
- orders-service unit tests: `pnpm --filter @agua/orders-service test`.
- orders-service Prisma checks: `pnpm --filter @agua/orders-service prisma:validate` and `pnpm --filter @agua/orders-service prisma:generate` after schema changes.
- Root build currently only builds contracts: `pnpm run build`.
- Likely new tests: gateway async acceptance/idempotency-key validation; queue enqueue service unit tests with mocked BullMQ queue; worker processor tests for `PENDING → PROCESSING → COMPLETED/FAILED/DEAD_LETTER`; repository tests for unique idempotency and status lookup.

### Delivery Slicing Suggestion

- PR 1: Shared async contracts + env/dependency wiring only (`@agua/contracts`, package manifests, env docs). Keep under 400 changed lines by not adding worker logic yet.
- PR 2: Gateway async enqueue path for `orders.create`, including idempotency header/body validation and `202` tests. No orders worker yet.
- PR 3: orders-service Prisma tracking/idempotency model + repository/service tests. No worker execution yet.
- PR 4: orders-service BullMQ worker/processors + job status TCP endpoint and retry/DLQ behavior tests.
- PR 5: integration polish/docs updates if needed, only after implementation behavior is proven.

### Ready for Proposal

Yes — proceed to SDD proposal/spec/design. The proposal should lock in orders-service as the owner of tracking/idempotency persistence, deterministic job IDs for duplicate enqueue protection, and separate gateway queue services from existing TCP dispatch to protect SOLID boundaries.
