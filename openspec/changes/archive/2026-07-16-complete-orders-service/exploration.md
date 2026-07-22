# Exploration: complete-orders-service

## Current State

`orders-service` is a TCP-only Nest microservice foundation, not a finished business service. Implemented pieces are: TCP bootstrap on port `3014`, `AppModule` imports for `CommonModule`, `CartModule`, `OrdersModule`, a `TcpPayloadAdapter` that extracts authenticated identity from the gateway payload, tests for TCP port parsing and identity extraction, a dedicated Prisma schema for `CART`, `CART_ITEM`, `ORDER`, `ORDER_ITEM`, and `ORDER_HISTORY`, Dockerfile, root compose wiring, and `agua_orders` database creation.

Business capabilities are not implemented yet: there are no Prisma service providers, no cart/order services, no TCP controllers/message handlers, no gateway client for orders-service, and no gateway action mappings for cart/orders. `CartModule` and `OrdersModule` are empty. Gateway currently marks `orders` and `cart` as `unavailable`; `TcpDispatcherService` only routes to `USUARIO_CLIENT`.

Contracts/docs already describe the intended V1 behavior: cart add/list/update/delete; create order from authenticated client's cart; list/detail orders; vendor status transitions; client cancel/confirm visit; server-side pricing; contra-entrega only; logical scalar UUID references across services; events `OrderCreated` and `OrderStatusChanged`.

## Affected Areas

- `MicroServices/orders-service/src/cart/cart.module.ts` — empty module; needs cart service/TCP handler/providers.
- `MicroServices/orders-service/src/orders/orders.module.ts` — empty module; needs order service/TCP handler/providers.
- `MicroServices/orders-service/src/tcp/tcp-payload-adapter.service.ts` — existing identity adapter; should be reused for role/user extraction.
- `MicroServices/orders-service/prisma/schema.prisma` — validated foundation for cart/order persistence; business logic must use it without cross-service FKs.
- `MicroServices/orders-service/Dockerfile`, `docker-compose.yml`, `docker/init-db/create-service-databases.sql` — runtime foundation already present for `agua_orders` and TCP `3014`.
- `MicroServices/gateway/src/actions/action-registry.ts` — `orders` and `cart` are currently unavailable and unmapped.
- `MicroServices/gateway/src/tcp/tcp-clients.module.ts` — currently registers only `USUARIO_CLIENT`; needs `ORDERS_CLIENT`.
- `MicroServices/gateway/src/tcp/tcp-dispatcher.service.ts` — service-family map only targets usuario-service; needs cart/orders routing to orders-service.
- `packages/contracts/src/dto/orders.dto.ts` — shared cart/order DTO source; has inline nested response shapes that should be treated carefully during implementation.
- `packages/contracts/src/dto/products.dto.ts` and `packages/contracts/src/events.ts` — product price/reference and order event contracts.
- `contratosDTOs/orders-service.json`, `contratosDTOs/api-gateway.json`, `docs/frontend-gateway-contract.md`, `docs/documentacion/modelo-datos.md` — documented API/data contract; gateway docs still mark cart/orders unavailable.

## Capability Matrix

### Already implemented

- TCP-only orders-service bootstrap: `MicroServices/orders-service/src/main.ts`.
- Dedicated orders DB wiring: `docker-compose.yml`, `docker/init-db/create-service-databases.sql`, `MicroServices/orders-service/Dockerfile`.
- Prisma data model for cart/order tables with `@@map("UPPERCASE")`, UUID IDs, logical cross-service UUIDs, timestamps, indexes, and per-vendor order number uniqueness.
- Shared contracts for cart/order DTOs, `OrderEstado`, `MetodoPago`, and order events.
- Gateway generic action router exists, but not yet for cart/orders.

### Missing or incomplete

- Cart business logic: get active cart, add item, update quantity, delete item, expiration handling, totals.
- Order business logic: create from cart transactionally, generate per-vendor `pedido_numero`, create order items/history, clear cart, list/detail with ownership rules, status transitions, cancel, confirm visit.
- Products/price integration: no live products-service source exists in `src`; product module is still a stub and no Prisma schema/source TCP handlers are present.
- Gateway integration: `ORDERS_CLIENT`, dispatch map, action registry entries, docs/OpenAPI generation for cart/orders.
- TCP message handlers in orders-service.
- Unit/integration tests for domain logic, TCP handlers, gateway mapping/dispatch, ownership/role rules, and Prisma transaction behavior.
- Async event publishing is documented but no Redis/Kafka/event infrastructure is wired in orders-service; treat event emission as out of MVP unless scoped explicitly.

## Gateway Actions / HTTP Contract

Use current gateway convention `/api/v1/{service}/{action}` instead of legacy resource paths. Required actions:

- `GET /api/v1/cart/get` → `cart.get`, role `cliente`.
- `POST /api/v1/cart/items/add` → `cart.items_add`, role `cliente`, body `AddCartItemRequest`.
- `PATCH /api/v1/cart/items/update?id={cartItemId}` → `cart.items_update`, role `cliente`, body `UpdateCartItemRequest`.
- `DELETE /api/v1/cart/items/delete?id={cartItemId}` → `cart.items_delete`, role `cliente`.
- `GET /api/v1/orders/list` → `orders.list`, roles `cliente|vendedor`.
- `GET /api/v1/orders/get-by-id?id={orderId}` → `orders.get_by_id`, roles `cliente|vendedor`.
- `POST /api/v1/orders/create` → `orders.create`, role `cliente`, body `CreateOrderRequest`.
- `PATCH /api/v1/orders/status?id={orderId}` → `orders.status_update`, role `vendedor`, body `UpdateOrderStatusRequest`.
- `POST /api/v1/orders/cancel?id={orderId}` → `orders.cancel`, role `cliente`, body `CancelOrderRequest`.
- `POST /api/v1/orders/confirm?id={orderId}` → `orders.confirm`, role `vendedor`, body `ConfirmOrderRequest`.

## Required TCP Message Patterns

- `cart.get`
- `cart.items_add`
- `cart.items_update`
- `cart.items_delete`
- `orders.list`
- `orders.get_by_id`
- `orders.create`
- `orders.status_update`
- `orders.cancel`
- `orders.confirm`

Each handler should accept the gateway `TcpCommandPayload` shape: `body`, `query`, `params`, `user`, and `requestId`; `userId/clienteId` must come from `user`, never from body.

## Product / Price Boundary

Complete correctness depends on products-service providing an authoritative product snapshot by `productId`: `id`, `vendedorId`, `nombre`, `precioFinal`, `stock`, `activo`, and `mostrarPrecio`. Current repo state does not provide a usable products-service source implementation, so orders-service cannot safely calculate prices or validate stock against a live product owner.

Safe interim boundary: define a narrow injectable `ProductCatalogPort` in orders-service and a TCP adapter contract for a future `products.get_by_id`/`products.get_snapshot` call, but keep the implementation behind a stub/fake only for tests or return a controlled `503` for cart add/order create until products-service is available. Do not accept product name or price from the frontend/body.

## Required Tests Before Implementation Is Safe

- Cart service unit tests: create/get active cart, add duplicate product increments or updates according to chosen rule, quantity bounds, expiration, total calculation from product snapshot, ownership checks.
- Order service unit tests: create from cart in transaction, empty/expired cart rejection, per-vendor `pedido_numero`, order item snapshots, cart clearing, history creation, totals, contra-entrega only.
- Status tests: valid transitions `pendiente→confirmado→en_camino→entregado`, cancel rules, vendedor confirm rules, invalid transition rejection.
- Gateway tests: action resolver mappings for all cart/orders actions, `ORDERS_CLIENT` registration, dispatcher service-family routing, unavailable-to-available behavior, auth/role enforcement.
- TCP handler tests: payload adaptation, no `userId` from body, query `id` handling, role-specific access.
- Prisma integration tests or repository tests with transaction mocks for unique per-vendor order numbering and cart item uniqueness.
- Product boundary tests: product unavailable returns controlled error; product snapshot is the only source of price/name/vendor.

## Approaches

1. **Boundary-first implementation** — Add gateway + TCP + cart/order domain behind `ProductCatalogPort`; block price-dependent commands with controlled `503` until products-service is real.
   - Pros: preserves security and architecture, avoids fake client-controlled prices, enables most structure/tests now.
   - Cons: cart add/order create cannot be fully productive without products-service.
   - Effort: Medium/High.

2. **Implement products snapshot first** — Build minimal products-service snapshot endpoint before orders business logic.
   - Pros: orders can be end-to-end correct for price/product validation.
   - Cons: expands scope beyond orders-service and likely exceeds review budget.
   - Effort: High.

## Recommendation

Proceed to proposal/design with a boundary-first plan, but explicitly decide whether the change includes a minimal products snapshot endpoint. If not, orders-service should expose read/status-safe behavior and return controlled `503` for product-price-dependent commands rather than accepting unsafe client-provided price/name/vendor data.

## Risks

- **400-line budget risk: High** — gateway wiring + 10 TCP handlers + Prisma services + DTO validation + tests is likely over 400 changed lines. Chained PRs are recommended.
- **Product dependency risk** — without products-service, cart/order creation cannot be fully correct.
- **Concurrency risk** — per-vendor `pedido_numero` generation can race unless implemented transactionally with a safe sequence/counter strategy.
- **Contract drift risk** — `contratosDTOs/orders-service.json` uses legacy resource paths while gateway uses `/api/v1/{service}/{action}`.
- **Event scope risk** — documented order events exist but no event bus is wired in orders-service.

## Ready for Proposal

Yes. The next phase should produce a proposal that scopes orders-service completion into reviewable slices and calls out the products snapshot dependency as an explicit decision.
