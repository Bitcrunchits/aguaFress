# Design: Entregas Service — P1 Architecture Refactor

## Technical Approach

Extract Prisma + mapping from `DeliveriesService` into `DeliveriesRepository` + `DeliveryMapper` (mirroring orders-service). Add event publishing on status transitions via Redis Streams. Fix contract drift in `DeliveryListFilters` and `DeliveryStatusChangedEvent`. Gateway dispatch is already wired by P0 — verify only.

## Architecture Decisions

### Repository/Mapper — orders-service pattern

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline mapper functions (files, not class) | Less ceremony, same testability | ✅ `DeliveryMapper` as functions file, same as `OrdersMapper` |
| Repository as class implementing interface | Orders pattern proven, mockable | ✅ `DeliveriesRepository` interface + `PrismaDeliveriesRepository` |
| `DeliveryRecord` as internal entity | Decouples Prisma type from service | ✅ Same as `OrderRecord` — `DeliveryRecord` typed by hand in repo file |
| Merge repo + mapper into one class | Simpler but violates SRP | ❌ Separate concerns: repo reads/writes, mapper transforms |

### Events — Redis Streams + actorUserId

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Skip events (out of scope) | Not aligned with spec | ❌ Spec requires `DeliveryStatusChangedEvent` |
| TCP emit to notifications-service | Needs new TCP handler on notif side | ❌ No existing pattern; more surface area |
| Redis Streams XADD from entregas | Contracts + streams already defined; notifications already polls | ✅ Add Redis client to entregas, publish `DeliveryStatusChangedEvent` to `deliveries-stream` |
| `DeliveryEventPublisher` port/adapter | Testable, follows DIP | ✅ Interface + `RedisDeliveryEventPublisher` impl |
| `actorUserId` in event | Needed for audit; missing from contract | ✅ Add `actorUserId: string` to `DeliveryStatusChangedEvent` in `@agua/contracts` |

### Contracts — drift fixes

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Remove `vendedorId` from `DeliveryListFilters` | Breaks consumers; corrects the type | ✅ The service never reads it from body (comes from JWT) |
| Create `DeliveryListFiltersV2` | OCP-safe but overengineered | ❌ Simple removal — no consumer outside entregas uses it |
| Keep `DeliveryStatusChangedEvent` as-is | Missing `actorUserId` for audit | ❌ Add field; event hasn't been published yet, so no downstream breakage |

### Gateway — verify only

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Audit existing registry | Must confirm P0 wiring | ✅ Verified: deliveries actions (`list`, `get`, `update-status`) registered with `vendedor` role restriction |
| `ENTREGAS_CLIENT` in tcp-clients.module | Must confirm existence | ✅ Already wired to `entregas-service:3015` |
| `deliveries: ENTREGAS_CLIENT` in dispatcher | Must confirm mapping | ✅ Already in `SERVICE_CLIENT_MAP` |
| **Verdict**: no gateway changes needed | | ✅ |

## Data Flow

```
TCP deliveries.update_status
  └─ DeliveriesTcpController
      ├─ payloadAdapter.requireUser(payload)  →  { sub, role, email }
      ├─ vendedorProfileResolver.resolveVendedorIdByAuthUserId(sub)
      └─ deliveriesService.updateStatus(id, dto, vendedorId, sub as actorUserId)
          ├─ repository.findById(id)          → DeliveryRecord | null
          ├─ validate ownership (vendedorId)
          ├─ validate state transition
          ├─ repository.updateStatus(...)     → DeliveryRecord
          ├─ eventPublisher.publishStatusChanged({ deliveryId, orderId, estadoAnterior, estadoNuevo, actorUserId })
          │   └─ Redis XADD → 'deliveries-stream'  (non-blocking on failure)
          └─ mapper.toResponse(record)        → DeliveryResponse
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `entregas-service/src/deliveries/deliveries.repository.ts` | Create | `DeliveriesRepository` interface + `PrismaDeliveriesRepository` impl |
| `entregas-service/src/deliveries/delivery.mapper.ts` | Create | `toResponse()`, enum converters (extracted from service) |
| `entregas-service/src/deliveries/delivery-event-publisher.port.ts` | Create | Port interface + DI token for event publishing |
| `entregas-service/src/deliveries/delivery-event-publisher.redis.ts` | Create | Implementation — publishes `DeliveryStatusChangedEvent` to `deliveries-stream` via Redis |
| `entregas-service/src/deliveries/deliveries.service.ts` | Modify | Inject repository, mapper, publisher; remove PrismaService + `toResponse`; add `actorUserId` param to `updateStatus` |
| `entregas-service/src/deliveries/deliveries.module.ts` | Modify | Register repository, mapper, publisher providers |
| `entregas-service/src/tcp/deliveries-tcp.controller.ts` | Modify | Pass `user.sub` as `actorUserId` to `updateStatus` |
| `entregas-service/src/deliveries/deliveries.service.spec.ts` | Modify | Mock repository + mapper + publisher instead of PrismaService |
| `entregas-service/prisma/schema.prisma` | No change | Current schema covers all needs |
| `packages/contracts/src/dto/deliveries.dto.ts` | Modify | Remove `vendedorId` from `DeliveryListFilters` |
| `packages/contracts/src/events.ts` | Modify | Add `actorUserId: string` to `DeliveryStatusChangedEvent` |
| `entregas-service/package.json` | Modify | Add `ioredis` dependency |
| `entregas-service/.env.example` | Modify | Add `REDIS_URL` (default: `redis://localhost:6379`) |
| `gateway/src/actions/action-registry.ts` | No change | Verified — deliveries routes exist |

## Interfaces / Contracts

### DeliveriesRepository interface (in `deliveries.repository.ts`)

```typescript
export interface DeliveryRecord {
  id: string;
  orderId: string;
  vendedorId: string;
  estado: PrismaDeliveryEstado;
  clienteNombre: string;
  clienteTelefono: string | null;
  direccionCalle: string;
  direccionNumero: string;
  direccionPiso: string | null;
  direccionReferencia: string | null;
  direccionBarrio: string | null;
  direccionCiudad: string;
  direccionProvincia: string;
  direccionCp: string | null;
  latitud: number | null;
  longitud: number | null;
  fechaAsignacion: Date;
  fechaEntrega: Date | null;
  notas: string | null;
}

export interface DeliveriesRepository {
  findAll(vendedorId: string, query: { fecha?: string; page: number; limit: number }): Promise<{ data: DeliveryRecord[]; total: number }>;
  findById(id: string): Promise<DeliveryRecord | null>;
  updateStatus(id: string, data: { estado: PrismaDeliveryEstado; notas?: string; fecha_entrega?: Date }): Promise<DeliveryRecord>;
}
```

### DeliveryEventPublisher port (in `delivery-event-publisher.port.ts`)

```typescript
export const DELIVERY_EVENT_PUBLISHER = 'DELIVERY_EVENT_PUBLISHER';

export interface DeliveryEventPublisher {
  publishStatusChanged(event: DeliveryStatusChangedEvent): Promise<void>;
}
```

### Contracts diff

```
// DeliveryListFilters — remove vendedorId
- export interface DeliveryListFilters extends PaginationRequest {
-   fecha?: string;
-   vendedorId: string;  // ← REMOVED (drift — comes from JWT)
- }

// DeliveryStatusChangedEvent — add actorUserId
+ export interface DeliveryStatusChangedEvent extends BaseEvent {
+   type: 'DeliveryStatusChanged';
+   deliveryId: string;
+   orderId: string;
+   estadoAnterior: DeliveryEstado;
+   estadoNuevo: DeliveryEstado;
+   actorUserId: string;  // ← ADDED (AUTH_USER.id who triggered the transition)
+ }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — Repository | CRUD with mocked PrismaService | Same pattern as `PrismaOrdersRepository` — mock `$transaction`, `findMany`, etc. |
| Unit — Mapper | `toResponse()` mapping, enum conversion | Pure function tests — no deps |
| Unit — Service | Business logic w/ mocked repo + mapper + publisher | Mirror current tests (15 cases) + add event publish assertions |
| Unit — Event Publisher | Redis XADD call with mocked ioredis | Test no side effects, logging on failure (non-blocking pattern) |
| Integration | Full flow: TCP → controller → service → repo → event | Docker compose, Redis + Postgres, smoke test pattern |

## Migration / Rollout

No data migration. Changes are additive (new files) + refactored service. Deployment order:
1. Contract changes (non-breaking — adding a field, removing unused field)
2. Repository + mapper (new files, no runtime change)
3. Event publisher (new file, no activation until publish call added)
4. Service refactor (wires new components; existing tests pass)
5. Controller change (passes `actorUserId`)
6. Rollback: revert controller + service to original, keep new files dormant

## Open Questions

None — all decisions resolved in this design.
