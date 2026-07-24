# Proposal: Complete Orders Service

## Intent

Finish `orders-service` from TCP/Prisma foundation to usable cart/order capability, aligned with gateway action routing, without trusting client price/product data.

## Scope

### In Scope
- Cart V1: active cart, item mutations, ownership, expiration, server-side totals.
- Orders V1: create from cart, role reads, transitions, cancel/confirm, history, cart clearing.
- TCP handlers and gateway mappings for `/api/v1/{service}/{action}`.
- `ProductCatalogPort`; product-dependent commands return `503`.
- Safe per-vendor `pedido_numero`.
- Tests for domain, TCP identity, gateway, ownership, transitions, product boundary.

### Out of Scope
- Full products-service implementation, catalog CRUD, stock mutation, pricing engine.
- Event publishing until event infrastructure is scoped.
- Legacy REST resource routes outside the gateway action convention.

## Capabilities

### New Capabilities
- `cart-management`: authenticated cliente cart read and mutations.
- `order-management`: creation, lifecycle, role reads, cancellation, confirmation, history, numbering.
- `orders-gateway-routing`: gateway action registry and TCP dispatch behavior for cart/orders.

### Modified Capabilities
- None. Existing `openspec/specs/` has no cart/orders capability to update.

## Approach

Use boundary-first delivery: domain services behind Prisma repositories and `ProductCatalogPort`; TCP handlers consume `TcpCommandPayload`; gateway routes `cart`/`orders` to `ORDERS_CLIENT`. Never read identity, price, product name, or vendor from body.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `MicroServices/orders-service/src/cart` | Modified | Cart service/repository/TCP handlers. |
| `MicroServices/orders-service/src/orders` | Modified | Order lifecycle, numbering, history. |
| `MicroServices/orders-service/prisma/schema.prisma` | Modified | Only if numbering needs schema support. |
| `MicroServices/gateway/src/actions/action-registry.ts` | Modified | Enable cart/orders actions. |
| `MicroServices/gateway/src/tcp/*` | Modified | Register and dispatch `ORDERS_CLIENT`. |
| `packages/contracts/src/dto/orders.dto.ts` | Modified | Adjust only if strict typing requires it. |
| `docs/**`, `contratosDTOs/**` | Modified | Align gateway contract docs with available actions. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Product dependency blocks create flows | High | Use `ProductCatalogPort`; return `503`, never trust body data. |
| `pedido_numero` race | High | Transaction plus unique retry or counter strategy. |
| Review exceeds 400 lines | High | Delivery note: user chose ask-always; chained PRs recommended before apply. |
| Contract drift | Med | Update gateway docs/contracts with action convention. |

## Rollback Plan

Disable cart/orders actions to `unavailable`, remove `ORDERS_CLIENT`, and revert business modules while preserving TCP/Prisma foundation.

## Dependencies

- Gateway payload with trusted `user` identity.
- Future products snapshot provider for productive create flows.

## Success Criteria

- [ ] Cart/orders specs cover the new capabilities and safe product boundary.
- [ ] Gateway routes all listed cart/orders actions to orders-service.
- [ ] Product-price-dependent commands never accept client price/name/vendor fields.
- [ ] Per-vendor numbering is concurrency-safe.
- [ ] Tasks phase plans reviewable slices due high 400-line risk.
