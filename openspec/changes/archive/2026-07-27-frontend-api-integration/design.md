# Design: Frontend API Integration

## Technical Approach

Integrate the React 18 + Vite SPA with the local API Gateway through read-first vertical slices. `packages/frontend-docu-adrian/01-arquitectura-web.md` is the source of truth: pages coordinate, hooks orchestrate TanStack Query, services are the only HTTP layer, and every async page renders loading/error/empty/success states. Preserve the verified Productos list as the baseline pattern and migrate placeholders incrementally without changing backend code.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Feature shape | `features/<feature>/{pages,hooks,services,components,types.ts}` where each route uses page → hook → service | Keep ad-hoc API calls in hooks/pages | Matches the web architecture doc and prevents endpoint knowledge from leaking into UI. |
| API foundation | Keep shared Axios `services/api.ts` with `/api/v1`; add shared error normalization only if required by tests | Per-feature Axios clients | One gateway entry point, one refresh/token behavior, less auth drift. |
| Types | Use `@agua/contracts` DTOs/enums first; local flat interfaces only for UI props or missing response wrappers | Duplicate DTOs in frontend | Contracts are the source of truth; no `any`, no string role literals. |
| Routing | Correct role routes/nav with `UserRole`: cliente gets `/catalogo`, `/carrito`, `/pedidos`, `/perfil`; admin gets focused admin read routes; vendedor keeps operational routes | Super-admin bypass plus missing cliente routes | Navigation should show real reachable screens; `ProtectedRoute` client redirect must be `/catalogo`, not `/orders`. |
| Async commands | Model order/delivery commands as pending jobs: send idempotency key, accept `202`, poll `statusUrl`/job-status until terminal, invalidate related queries | Treat POST/PATCH success as completed | Gateway queues `orders/create` and `deliveries/update-status`; immediate completion would lie to users. |
| Testing | MSW intercepts real `/api/v1/*` routes; tests cover service/hook/page states and role routing | Mock Axios directly | MSW tests the actual HTTP boundary used by the app. |

## Data Flow

```text
Route/Page ──→ feature hook ──→ feature service ──→ services/api.ts ──→ /api/v1 gateway
   │                │                  │                    │
   └─ 4 UI states   └─ Query cache      └─ contracts DTOs     └─ JWT refresh/errors

Async command: UI action → mutation → 202 AsyncAcceptedResponse → poll job-status → invalidate list/detail
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/frontend/src/shared/api-error.ts` | Create | Normalize Axios/API errors into display-safe messages for `ErrorState`. |
| `packages/frontend/src/config/routes.tsx` | Modify | Add cliente cart/orders/profile/catalog pages; add admin read subroutes; fix cliente redirect alignment. |
| `packages/frontend/src/shared/Layout/DashboardLayout.tsx` | Modify | Replace hardcoded summary cards with role-aware hook data or remove until real data exists; expand cliente/admin nav. |
| `packages/frontend/src/features/admin/*` | Create/Modify | `services/admin.service.ts`, hooks/pages for dashboard, vendedores, activity logs, QR/link read views. |
| `packages/frontend/src/features/clientes/*` | Create/Modify | Vendedor/admin clientes lists plus cliente provider selection hooks/services. |
| `packages/frontend/src/features/productos/*` | Modify only | Preserve current list; extend service with filters/categories/brands for catalog without rewriting `ProductosPage`. |
| `packages/frontend/src/features/catalogo/*` | Create | Cliente catalog page using products/categories/brands and selected provider context. |
| `packages/frontend/src/features/cart/*` | Create | Cliente cart read/update hooks/services using cart DTOs. |
| `packages/frontend/src/features/ordenes/*` | Create/Modify | Orders list/detail/actions plus async create tracking. |
| `packages/frontend/src/features/deliveries/*` | Create | Vendedor delivery list and async status update tracking. |
| `packages/frontend/src/features/qr/*` | Modify | Vendor QR/link list/create/deactivate and admin deactivate/read behavior. |
| `packages/frontend/src/__tests__/*` | Modify/Create | MSW-backed tests for routing, services, hooks, and page async states. |

## Interfaces / Contracts

Use existing DTOs: `SuperAdminDashboardResponse`, `ClienteResponse`, `ClienteProvidersResponse`, `ProductResponse`, `CategoriaResponse`, `MarcaResponse`, `CartResponse`, `OrderListResponse`, `OrderResponse`, `AsyncAcceptedResponse`, `OrderJobStatusResponse`, `DeliveryResponse`, `DeliveryJobStatusResponse`, `GenerarQRResponse`, `GenerarLinkResponse`. Query keys should be const-object based, e.g. `QUERY_KEYS.products.list(filters)` rather than stringly typed arrays spread across files.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Services map params/body/idempotency headers and return typed data | Vitest + MSW, no Axios mocks. |
| Hook | Query states, mutation invalidation, polling terminal/error states | RTL hook wrappers with QueryClient. |
| Page | Loading/error/empty/success and role-specific navigation | RTL + MemoryRouter + MSW. |
| Build | Type safety against contracts | `pnpm --filter @agua/frontend build`. |

## Migration / Rollout

PR slices should stay under ~400 changed lines when possible: (1) shared error/routing/nav + admin/clientes reads, (2) cliente catalog/provider/cart reads while leaving Productos list untouched, (3) orders/deliveries/QR/link actions with async polling. Do not disrupt verified Productos: keep current `GET /products/list` tests passing before extending filters.

## Open Questions

- [ ] Maintainer must choose the chained PR strategy before apply because `ask-always` is configured and full scope is high-risk for review size.
