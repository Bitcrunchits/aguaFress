# Frontend App — Full Specification

## Purpose

React SPA (`packages/frontend/`) que consume API Gateway en `/api/v1`. Toda página MUST implementar 4 estados: loading, empty, error, success.

## Requirements

### REQ-SCAFFOLD-01: Vite + Proxy + Tailwind

| Item | Detalle |
|------|---------|
| Stack | React 18 + Vite + TS strict + Tailwind 4 + ShadCN/ui |
| Proxy | `/api` → `localhost:3000` en `vite.config.ts` |
| Tokens | brand/surface/text/success/warning/error/info |
| Alias | `@/` → `src/`, workspace en `pnpm-workspace.yaml` |

**Scenario: Dev proxy** — GIVEN Vite dev on :5173, WHEN `/api/v1/auth/login`, THEN reaches `localhost:3000/api/v1/auth/login`.

### REQ-AUTH-01: Login Form

| Item | Detalle |
|------|---------|
| Form | React Hook Form + Zod (email + password required) |
| Endpoint | `POST /api/v1/auth/login` → `LoginResponse` |
| Redirect | vendedor → `/vendedor`, super_admin → `/admin` |
| Error | Muestra mensaje de API inline |

**Scenario: Redirect por rol** — GIVEN credenciales vendedor válidas, WHEN submit, THEN recibe token + role "vendedor", AND redirect a `/vendedor`.

**Scenario: Credenciales inválidas** — GIVEN wrong password, WHEN submit, THEN API 401, AND form muestra "Credenciales inválidas", AND stay en `/login`.

### REQ-AUTH-02: Token Management

| Item | Detalle |
|------|---------|
| Access | JWT en memoria. Header `Authorization: Bearer` |
| Refresh | `POST /api/v1/auth/refresh`. Interceptor retry en 401 |
| Logout | `POST /api/v1/auth/logout`. 401 sin refresh viable → logout |

**Scenario: Auto-refresh** — GIVEN expired access + valid refresh, WHEN 401, THEN interceptor refreshes, AND request retries OK.

**Scenario: Refresh fails** — GIVEN both tokens expired, WHEN 401 then refresh 401, THEN logout, AND redirect to `/login`.

### REQ-AUTH-03: AuthContext

Expone: `user`, `isAuthenticated`, `isLoading`, `role`, `login()`, `logout()`, `refreshUser()`.

**Scenario: Session restaurada** — GIVEN valid refresh token, WHEN app mounts, THEN AuthContext refreshes silently, AND user sees protected content.

**Scenario: Sin sesión** — GIVEN unauthenticated, WHEN visiting `/vendedor`, THEN ProtectedRoute redirects to `/login?redirect=/vendedor`.

### REQ-AUTH-04: Role Guard

Rutas: `/vendedor/*` solo vendedor; `/admin/*` solo super_admin.

**Scenario: Cross-role denied** — GIVEN user role vendedor, WHEN navigating to `/admin`, THEN show "403 Acceso denegado".

### REQ-UI-01: Four States

| Estado | Comportamiento |
|--------|----------------|
| Loading | PageSkeleton shimmer + React.Suspense |
| Empty | EmptyState(icon, title, description, action?) |
| Error | ErrorState(message) + botón "Reintentar" → refetch |
| Success | Contenido normal |

**Scenario: Retry refetch** — GIVEN ErrorState tras 503, WHEN click "Reintentar", THEN refetch endpoint, AND show loading.

### REQ-FEATURE-01: Vendedor Features

Cada feature page conectada a API real con 4 estados UI:

| Feature | Ruta | Endpoints |
|---------|------|-----------|
| Dashboard | `/vendedor` | `GET /api/v1/clientes/list` (vendedorId del token) |
| Cartera | `/vendedor/clientes` | `GET /api/v1/clientes/list` |
| Perfil | `/vendedor/perfil` | `GET/PATCH /api/v1/vendedor/profile` |
| Productos | `/vendedor/productos` | `GET /api/v1/products/list`, `POST /api/v1/products/create` |
| QR | `/vendedor/qr` | `GET /api/v1/qr/generate` |
| Link invitación | `/vendedor/link-invitacion` | `GET /api/v1/link-invitacion/generate` |
| Pedidos | `/vendedor/pedidos` | `GET /api/v1/orders/list` |
| Entregas | `/vendedor/entregas` | `GET /api/v1/deliveries/list` |

**Scenario: Dashboard con datos reales** — GIVEN vendedor con 3 clientes, WHEN dashboard monta, THEN tabla renderiza 3 filas.

**Scenario: Empty state** — GIVEN vendedor sin clientes, WHEN dashboard monta, THEN EmptyState "No tenés clientes aún".

### REQ-TEST-01: Testing Setup

Herramientas: Vitest + RTL + MSW.

| Test | Cobertura |
|------|-----------|
| `auth.service.test.ts` | Login success/error, refresh token |
| `LoginPage.test.tsx` | Render, validaciones vacías, submit error |

**Scenario: Validación vacía** — GIVEN LoginPage, WHEN click "Ingresar" sin datos, THEN muestra "Email requerido" y "Contraseña requerida".

### REQ-DOCKER-01: Production Build

| Etapa | Descripción |
|-------|-------------|
| Build | Multi-stage: `node:22-alpine` build → `nginx:alpine` runtime |
| SPA | Nginx fallback `index.html` para React Router |
| Bundle | `pnpm build` genera `dist/` |

**Scenario: SPA routing** — GIVEN contenedor production, WHEN request `/vendedor/clientes`, THEN nginx sirve `index.html` (no 404).

## Acceptance Criteria

- Login real contra gateway redirige por rol
- Dashboard vendedor con datos reales (no mock)
- 7 features adicionales conectadas a API
- Auto-refresh + logout en 401 doble
- 4 estados UI en cada página
- `pnpm build` sin errores
- Tests unitarios pasan (`pnpm test`)
- Docker build produce imagen funcional
