# Design: Complete Orders Service

## Technical Approach

Complete the existing TCP-only `orders-service` by adding gateway `cart`/`orders` action routing, Nest TCP handlers, domain services, Prisma-backed repositories, and a narrow `ProductCatalogPort`. Identity always comes from gateway `TcpCommandPayload.user`; request bodies are DTO data only. Product-dependent commands return controlled `503` until a real product snapshot adapter exists.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Gateway integration | Add `ORDERS_CLIENT`, env keys, and map `cart`/`orders` in `SERVICE_CLIENT_MAP` | Route through usuario-service or expose HTTP in orders-service | Keeps gateway action convention and preserves TCP-only orders-service. |
| Product boundary | Define `ProductCatalogPort.getSnapshot(productId)` and default unavailable adapter | Trust client price/name/vendor or implement products-service now | Prevents price tampering and avoids expanding scope beyond this change. |
| Numbering | Add `OrderCounter`/`PEDIDO_COUNTER` keyed by `vendedor_id`; increment in the same Prisma transaction as order create | `max(pedido_numero)+1` retry loop | Counter row avoids race-prone reads and keeps per-vendor sequence explicit. |
| Layering | Controllers adapt TCP payload; services enforce roles/state; repositories own Prisma queries | Put Prisma/state logic in handlers | Preserves SRP, testability, and DIP. |
| Status machine | Const transition map using `OrderEstado` enum values | Free-form string checks | Enforces allowed transitions and keeps enum contracts consistent. |
| Duplicate cart items | `add item` increments existing quantity; `update item` replaces quantity | Make add overwrite quantity or reject duplicates | Matches user intent: add means “more of this”, update means “set exactly this quantity”, and avoids accidental overwrites. |

## Data Flow

```text
HTTP /api/v1/cart|orders/{action}
  -> Gateway ActionResolver + Guards
  -> TcpDispatcherService(ORDERS_CLIENT)
  -> @MessagePattern handler
  -> TcpPayloadAdapter.requireUser()
  -> CartService / OrdersService
  -> ProductCatalogPort + Prisma repositories
  -> DTO response / controlled exception
```

Cart item mutation loads the caller's active cart, resolves server product data, increments quantity for duplicate `cart.items_add`, and replaces quantity for `cart.items_update`. Order creation runs in one transaction: load caller cart, validate non-expired/non-empty, refresh product snapshots, increment vendor counter, create order/items/history, delete cart/items. If product data is unavailable, abort before writes.

## File Changes

| File | Action | Description |
|---|---|---|
| `MicroServices/gateway/src/actions/action-registry.ts` | Modify | Mark `cart`/`orders` available and add the 10 action mappings/roles from specs. |
| `MicroServices/gateway/src/tcp/tcp-clients.module.ts` | Modify | Register `ORDERS_CLIENT` using `ORDERS_SERVICE_HOST` and `ORDERS_SERVICE_TCP_PORT`. |
| `MicroServices/gateway/src/tcp/tcp-dispatcher.service.ts` | Modify | Inject orders client and route `cart`/`orders` service families to it. |
| `MicroServices/gateway/src/config/env.config.ts` | Modify | Add required orders-service TCP env validation. |
| `MicroServices/orders-service/src/common/prisma.service.ts` | Create | Injectable Prisma client lifecycle wrapper. |
| `MicroServices/orders-service/src/products/product-catalog.port.ts` | Create | Minimal product snapshot boundary and unavailable implementation. |
| `MicroServices/orders-service/src/cart/*` | Create/Modify | Cart controller, service, repository, DTO guards/mappers, module providers. |
| `MicroServices/orders-service/src/orders/*` | Create/Modify | Orders controller, service, repository, state machine, numbering, history. |
| `MicroServices/orders-service/prisma/schema.prisma` | Modify | Add `OrderCounter` model mapped to `PEDIDO_COUNTER`. |
| `packages/contracts/src/dto/orders.dto.ts` | Modify if needed | Flatten nested response interfaces only if implementation requires stricter shared typing. |
| `docs/frontend-gateway-contract.md`, `contratosDTOs/*.json` | Modify | Reflect available gateway action routes and product-unavailable behavior. |

## Interfaces / Contracts

```ts
interface ProductSnapshot {
  readonly id: string;
  readonly vendedorId: string;
  readonly nombre: string;
  readonly precioFinal: number;
  readonly stock: number;
  readonly activo: boolean;
  readonly mostrarPrecio: boolean;
}

interface ProductCatalogPort {
  getSnapshot(productId: string): Promise<ProductSnapshot>;
}
```

TCP patterns: `cart.get`, `cart.items_add`, `cart.items_update`, `cart.items_delete`, `orders.list`, `orders.get_by_id`, `orders.create`, `orders.status_update`, `orders.cancel`, `orders.confirm`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Cart expiration/ownership, product-unavailable, totals, duplicate item rule | Mock repositories and `ProductCatalogPort`. |
| Unit | Order create transaction, counter increment, state transitions, history, role-scoped reads | Mock Prisma repository boundary. |
| TCP | Message handlers use `TcpPayloadAdapter`, ignore body `userId`, parse query `id` | Nest testing module. |
| Gateway | Action mappings, roles, `ORDERS_CLIENT` routing, unknown action failures | Resolver/dispatcher unit tests. |
| Integration | Counter uniqueness and transaction rollback | Prisma test DB or transaction-focused repository tests. |

## Migration / Rollout

Run `prisma db push` to add `PEDIDO_COUNTER`. Roll out gateway mappings after orders-service is deployed and env vars are present. Rollback: mark `cart`/`orders` unavailable and remove `ORDERS_CLIENT` usage.

## Open Questions

None.
