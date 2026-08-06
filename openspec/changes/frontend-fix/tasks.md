# Tasks: Frontend Fix — Rebuild from Clean Base

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Phases 1-3, PR 2: Phases 4-5, PR 3: Phases 6-7 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Scaffold + API + Auth Flow | PR 1 | Foundation — phases 1-3, base for all UI |
| 2 | Shared UI + Vendedor Feature | PR 2 | Core UI — phases 4-5, depends on PR 1 base |
| 3 | Testing + Docker | PR 3 | Polish — phases 6-7, depends on PR 2 base |

## Phase 1 — Scaffolding

- [ ] **1.1** Create `packages/frontend/` — `package.json` with Vite + React 18 + all deps
- [ ] **1.2** Create `tsconfig.json` — TS strict, `@/` → `src/` path alias
- [ ] **1.3** Create `vite.config.ts` — proxy `/api` → `localhost:3000`, `@/` resolve alias
- [ ] **1.4** Create `src/index.css` — Tailwind directives + brand tokens
- [ ] **1.5** Init ShadCN/ui — `npx shadcn@latest init`, CSS variables config
- [ ] **1.6** Modify root `package.json` — add `dev:frontend` script
- [ ] **1.7** Verify: `pnpm dev` runs Vite on :5173, proxy hits `localhost:3000`

## Phase 2 — API Layer

- [ ] **2.1** Create `src/services/api.ts` — Axios instance, Bearer interceptor, 401 queue + refresh + retry
- [ ] **2.2** Create `src/services/auth.service.ts` — `login()`, `refresh()`, `logout()`
- [ ] **2.3** Create `src/services/clientes.service.ts` — `list()`, `getById()`
- [ ] **2.4** Create `src/services/vendedor.service.ts` — `getProfile()`, `updateProfile()`

## Phase 3 — Auth Flow

- [ ] **3.1** Create `src/context/AuthContext.tsx` — AuthState, `login/logout/refreshUser`, silent refresh on mount
- [ ] **3.2** Create `src/features/auth/LoginPage.tsx` + `LoginForm.tsx` — RHF+Zod, submit, role redirect
- [ ] **3.3** Create `src/config/routes.ts` — typed route constants
- [ ] **3.4** Create `src/shared/Layout/ProtectedRoute.tsx` — auth + role guard, redirect `/login?redirect=`
- [ ] **3.5** Create `src/main.tsx` — providers tree (`AuthProvider > QueryClientProvider > RouterProvider`)
- [ ] **3.6** Create `src/App.tsx` — route tree with AuthLayout + ProtectedRoute layouts

## Phase 4 — Shared Components

- [ ] **4.1** Create `src/shared/components/AsyncBoundary.tsx` — 4-state wrapper (loading/empty/error/success)
- [ ] **4.2** Create shared primitives — Button, Card, Spinner, ErrorState, EmptyState, PageSkeleton
- [ ] **4.3** Create `src/shared/Layout/AuthLayout.tsx` — centered card layout for login/register
- [ ] **4.4** Create `src/shared/Layout/DashboardLayout.tsx` — Sidebar + Header + `<Outlet>`

## Phase 5 — Vendedor Feature

- [ ] **5.1** Create `src/features/vendedor/hooks/useVendedorStats.ts` — TanStack Query hook for dashboard
- [ ] **5.2** Create `src/features/vendedor/pages/VendedorDashboard.tsx` — metrics + clientes list, 4 states
- [ ] **5.3** Create `src/features/vendedor/pages/ClientesCartera.tsx` — cartera list, 4 states, refetch
- [ ] **5.4** Create `src/features/vendedor/pages/VendedorPerfil.tsx` — profile view/edit, RHF+Zod
- [ ] **5.5** Create `src/features/vendedor/pages/ProductosList.tsx` — products list page
- [ ] **5.6** Create `src/features/vendedor/pages/PedidosList.tsx` — orders list page
- [ ] **5.7** Create `src/features/vendedor/pages/EntregasList.tsx` — deliveries list page
- [ ] **5.8** Create `src/features/vendedor/pages/QRPage.tsx` — QR display page
- [ ] **5.9** Create `src/features/vendedor/pages/LinkInvitacion.tsx` — invite link generation page

## Phase 6 — Testing

- [ ] **6.1** Create `vitest.config.ts` + `src/test/setup.ts` — Vitest, RTL, jest-dom, MSW server init
- [ ] **6.2** Create `src/test/mocks/auth.handlers.ts` — MSW handlers for auth endpoints
- [ ] **6.3** Write `auth.service.test.ts` — login OK/401, refresh OK/401 scenarios
- [ ] **6.4** Write `LoginPage.test.tsx` — render, empty validation errors, invalid creds error display
- [ ] **6.5** Write `AsyncBoundary.test.tsx` — each state renders correct slot

## Phase 7 — Docker

- [ ] **7.1** Create `Dockerfile` — multi-stage node:22-alpine build → nginx:alpine runtime
- [ ] **7.2** Create `nginx.conf` — SPA fallback to `index.html`, gzip, static caching
- [ ] **7.3** Verify: `docker build` produces image, SPA routing works inside container

## Phase 8 — Admin Feature (stretch)

- [ ] **8.1** Create `src/features/admin/pages/AdminDashboard.tsx` — admin dashboard with 4 states
- [ ] **8.2** Create `src/features/admin/pages/AdminVendedores.tsx` + `AdminClientes.tsx` — list pages
