# Design: Frontend Fix — Rebuild from Clean Base

## Technical Approach

Rebuild the frontend SPA en `packages/frontend/` con Vite + TS strict + Tailwind 4 + ShadCN/ui desde `develop`. Scaffold feature-based modules (auth, vendedor, admin, clientes), Axios con interceptores 401 + refresh automático, TanStack Query para data fetching, React Router v6 con layouts anidados. Cada página implementa 4 estados obligatorios via wrapper `<AsyncBoundary>`. Tests con Vitest + RTL + MSW.

## Architecture Decisions

| Decision | Option | Tradeoff | Chosen |
|----------|--------|----------|--------|
| State split | AuthContext vs Query cache | Context = sesión (token, user, role). Cache = datos de server. No mezclar. | AuthContext for auth state, TanStack Query for server data |
| Protected routing | Layout wrapper vs per-route guard | Layout anidado es DRY: `<ProtectedRoute role="vendedor">` envuelve todo `/vendedor/*`. | Nested layout con `<ProtectedRoute role>` |
| Async UI pattern | `<AsyncBoundary>` wrapper vs per-page if/else | Wrapper centraliza loading/empty/error/empty. Cada page pasa `data`, `isLoading`, `error`, `isEmpty`. | `<AsyncBoundary>` shared component |
| Auth token storage | In-memory only vs localStorage | In-memory es más seguro contra XSS. Refresh token en httpOnly cookie (futuro). MVP: in-memory + refresh token en memoria. | In-memory (`AuthContext`) |
| Form library | RHF + Zod vs uncontrolled | RHF + Zod da validación declarativa + tipos inferidos. | React Hook Form + Zod schemas |

## Component Tree

```
<AuthProvider>
  <QueryClientProvider>
    <RouterProvider>
      <Routes>
        <AuthLayout>              ← /login, /register
          <LoginPage />
        </AuthLayout>
        <ProtectedRoute role="vendedor">
          <DashboardLayout>        ← Sidebar + Header + <Outlet>
            <VendedorDashboard />
            <ClientesCartera />
            <VendedorPerfil />
            <ProductosList />
            <QRPage />
            <LinkInvitacion />
            <PedidosList />
            <EntregasList />
          </DashboardLayout>
        </ProtectedRoute>
        <ProtectedRoute role="super_admin">
          <DashboardLayout>
            <AdminDashboard />
            <AdminVendedores />
            <AdminClientes />
          </DashboardLayout>
        </ProtectedRoute>
      </Routes>
    </RouterProvider>
  </QueryClientProvider>
</AuthProvider>
```

## Data Flow

```
PageComponent                 ← React Router page
  └─ useClientes(params)      ← TanStack Query hook (useQuery)
       └─ clientesService.list(params)  ← Service layer
            └─ api.get('/api/v1/clientes/list', { params })  ← Axios instance
                 └─ Vite proxy: /api → localhost:3000  ← Dev
                      └─ Gateway: /api/v1/{service}/{action} → MS TCP
```

## Auth Flow

```
LoginPage
  └─ POST /auth/login → { token, refreshToken, user }
       └─ AuthContext.login(token, refreshToken, user)
            └─ setAuthState({ user, token, role, isAuthenticated: true })
                 └─ redirect por rol: vendedor → /vendedor, super_admin → /admin

ProtectedRoute
  └─ checks AuthContext.isAuthenticated + role match
       └─ fails → redirect /login?redirect=...
       └─ cross-role → <ForbiddenPage />

Interceptor 401
  └─ response 401 → pause request → POST /auth/refresh
       └─ success → retry original request with new token
       └─ fail → AuthContext.logout() → redirect /login
```

## State Architecture

| State | Owner | Scope | Persistence |
|-------|-------|-------|-------------|
| `{ token, user, role, isAuthenticated }` | AuthContext | Global | In-memory only |
| `{ clientes[], productos[], pedidos[] }` | TanStack Query cache | Per feature | Cache (stale-while-revalidate) |
| UI state (modals, forms, toggles) | `useState` local | Component | N/A |
| Form state (values, errors) | React Hook Form | Form scope | N/A |

## UI Patterns

```
<AsyncBoundary
  isLoading={isLoading}
  isError={!!error}
  isEmpty={data?.length === 0}
  onRetry={refetch}
  loadingSkeleton={<PageSkeleton rows={4} />}
  emptyState={<EmptyState icon={Users} title="Sin clientes" action={<Button>Agregar</Button>} />}
  errorState={<ErrorState message={error?.message} onRetry={refetch} />}
>
  <DataView data={data} />
</AsyncBoundary>
```

- `PageSkeleton`: shimmer placeholder por feature
- `ErrorState` + botón "Reintentar" → `refetch()`
- Lazy loading: `React.lazy(() => import('./pages/VendedorDashboard'))` por ruta

## Route Config

```typescript
// config/routes.ts
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  VENDEDOR: {
    DASHBOARD: '/vendedor',
    CLIENTES: '/vendedor/clientes',
    PERFIL: '/vendedor/perfil',
    PRODUCTOS: '/vendedor/productos',
    QR: '/vendedor/qr',
    LINK_INVITACION: '/vendedor/link-invitacion',
    PEDIDOS: '/vendedor/pedidos',
    ENTREGAS: '/vendedor/entregas',
  },
  ADMIN: {
    DASHBOARD: '/admin',
    VENDEDORES: '/admin/vendedores',
    CLIENTES: '/admin/clientes',
  },
} as const;
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/frontend/package.json` | Create | Vite + React 18 + deps |
| `packages/frontend/tsconfig.json` | Create | TS strict paths aliases |
| `packages/frontend/vite.config.ts` | Create | Proxy `/api` → `:3000` |
| `packages/frontend/src/main.tsx` | Create | Entry point con providers |
| `packages/frontend/src/App.tsx` | Create | Router + layout tree |
| `packages/frontend/src/config/routes.ts` | Create | Route path constants |
| `packages/frontend/src/services/api.ts` | Create | Axios instance + interceptors |
| `packages/frontend/src/services/auth.service.ts` | Create | Login/refresh/logout API |
| `packages/frontend/src/services/clientes.service.ts` | Create | Cartera clientes API |
| `packages/frontend/src/services/vendedor.service.ts` | Create | Perfil vendedor API |
| `packages/frontend/src/context/AuthContext.tsx` | Create | Auth state + methods |
| `packages/frontend/src/features/auth/` | Create | LoginForm, LoginPage, types |
| `packages/frontend/src/features/vendedor/` | Create | Pages + hooks por feature |
| `packages/frontend/src/features/admin/` | Create | Admin dashboard + lists |
| `packages/frontend/src/features/clientes/` | Create | Clientes cartera page |
| `packages/frontend/src/shared/components/` | Create | Button, Card, Modal, Spinner, ErrorState, EmptyState, PageSkeleton, AsyncBoundary |
| `packages/frontend/src/shared/Layout/` | Create | DashboardLayout, AuthLayout, Sidebar, Header, ProtectedRoute |
| `packages/frontend/src/index.css` | Create | Tailwind directives + design tokens |
| `packages/frontend/vitest.config.ts` | Create | Vitest + RTL + setup |
| `packages/frontend/src/test/setup.ts` | Create | MSW browser server init |
| `packages/frontend/src/test/mocks/` | Create | MSW handlers by domain |
| `packages/frontend/Dockerfile` | Create | Multi-stage nginx SPA |
| `pnpm-workspace.yaml` | Modify | Add `packages/frontend` (already covered by `packages/*`) |
| `package.json` | Modify | Add `dev:frontend` script |

## Interfaces / Contracts

```typescript
// src/context/AuthContext.tsx — core types
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// src/shared/components/AsyncBoundary.tsx
interface AsyncBoundaryProps<T> {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  data?: T;
  onRetry: () => void;
  loadingSkeleton?: ReactNode;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  children: ReactNode;
}

// src/config/routes.ts
type AppRoute = {
  path: string;
  element: ReactNode;
  role?: UserRole;
  children?: AppRoute[];
};
```

## Interceptor 401 Flow

```
api.ts (Axios instance)
  └─ request interceptor: attach Authorization: Bearer {token}
  └─ response interceptor:
       └─ if (error.response?.status !== 401) → reject
       └─ if (isRefreshing) → queue request (promise waterfall)
       └─ POST /auth/refresh
            └─ success → update token in AuthContext → retry request
            └─ fail → AuthContext.logout() → redirect /login
```

Uses a promise queue to avoid race conditions when multiple 401s fire simultaneously.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Service | `auth.service.ts` — login OK/401, refresh OK/401 | Mock Axios + MSW handler |
| Page | `LoginPage` — renders, validation, submit error | RTL render + MSW mock POST |
| Component | `AsyncBoundary` — loading/empty/error states | Unit test with controlled props |
| Hook | `useClientes` — data fetch, refetch on error | RTL hook + MSW handler |

Vitest config: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`. MSW handlers grouped by domain (`auth.handlers.ts`, `vendedor.handlers.ts`).

## Migration / Rollout

No migration required. Feature branch `frontend/AS-fix` desde `develop`. `frontend/AS` original queda intacto como respaldo.

## Commit Strategy

- `feat(frontend): scaffold vite + tailwind + shadcn-ui`
- `feat(frontend): add axios instance with auth interceptor`
- `feat(frontend): implement auth context and login flow`
- `feat(frontend): add auth layout and protected routing`
- `feat(frontend): implement vendedor dashboard with clientes list`
- `feat(frontend): add vendedor features (perfil, productos, qr, link, pedidos, entregas)`
- `feat(frontend): implement admin dashboard and vendedor management`
- `feat(frontend): add AsyncBoundary and shared UI components`
- `feat(frontend): setup vitest + rtl + msw and write auth tests`
- `feat(frontend): add docker multi-stage build for production`
- `chore(root): add dev:frontend script to root package.json`

Figma tokens (brand: `#006D77`, `#83C5BE`, `#E29578`) van en `tailwind.config.ts` como custom colors + CSS variables via `index.css`.
