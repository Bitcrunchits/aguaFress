# Proposal: Frontend Fix — Rebuild from Clean Base

## Intent

El frontend existente en `frontend/AS` está roto: usa npm en monorepo pnpm, tiene `node_modules/` commiteado, mock data, estilos inline, y ~200 commits detrás de `develop`. No se arregla — se rehace desde `develop` con el stack objetivo (Vite + TS strict + Tailwind 4 + TanStack Query + RHF/Zod + ShadCN/ui + Vitest/MSW), copiando solo el source útil.

## Scope

### In Scope

- Feature branch `frontend/AS-fix` desde `develop` (no tocar `frontend/AS`)
- Scaffolding: Vite + pnpm workspace setup, Tailwind 4, ShadCN/ui, Vitest + MSW
- Auth flow completo: login/register/refresh/logout, AuthContext, interceptors, protected routing
- Features existentes en el prototipo: dashboard vendedor, cartera clientes, perfil, productos, QR, link-invitación, pedidos, entregas
- Feature-based folder structure (`src/features/{auth,vendedor,admin,clientes}/`)

### Out of Scope

- Features nuevas que no existan en el prototipo (ej: reporting, notificaciones UI)
- Backend, `packages/contracts/`, infraestructura
- Migración a React 19 (pasa post-MVP)
- Diseño visual final (iterativo con Cosso template como guía)

## Capabilities

### New Capabilities

- `frontend-app`: Aplicación React SPA que consume la API Gateway. Cubre autenticación, perfiles, dashboard vendedor, cartera de clientes, productos, QR, link-invitación, pedidos y entregas. 4 estados UI obligatorios (loading, empty, error, success).

### Modified Capabilities

None — no se modifican specs del backend.

## Approach

1. **Scaffold desde `develop`**: `pnpm create vite`, agregar workspace al monorepo, instalar Tailwind 4 + ShadCN/ui + TanStack Query + RHF/Zod + Vitest + MSW.
2. **Extraer source útil**: revisar `frontend/AS` y copiar solo páginas, tipos, y lógica que valga la pena — el resto se descarta.
3. **Feature modules**: feature-based folders con `components/`, `hooks/`, `pages/`, `types.ts` por dominio.
4. **API layer**: Axios instance con interceptores (token, refresh, 401 → logout). Servicios por dominio (`auth.service.ts`, `products.service.ts`, etc.).
5. **Auth flow**: AuthContext con login/register/refresh/logout, protected routes, role-based redirect.
6. **Estados UI**: wrapper `<AsyncBoundary>` para loading, empty, error, success en cada feature.
7. **Tests**: Vitest + RTL unit para componentes clave, MSW para mock API.
8. **Vite proxy**: proxy `/api` a `localhost:3000` en dev (elimina CORS manual).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/frontend/` | New | Feature branch con frontend completo |
| `pnpm-workspace.yaml` | Modified | Agregar workspace entry |
| `root package.json` | Modified | Script `dev:frontend` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gateway API incompleto para ciertos features | Medium | Verificar endpoints contra prototipo antes de implementar |
| Desviación visual sin diseñador dedicado | Low | Usar template Cosso + Tailwind como guía, iterar rápido |
| Tests lentos por setup MSW | Low | Solo tests críticos en esta fase; expandir post-MVP |

## Rollback Plan

Eliminar la branch `frontend/AS-fix` (local y remota). El `frontend/AS` original queda intacto como respaldo. Sin cambios en `develop`.

## Dependencies

- Gateway funcionando en `localhost:3000`
- `@agua/contracts` publicado y accesible desde el frontend
- Docker (PostgreSQL + Redis) para tests de integración

## Success Criteria

- [ ] Login real contra gateway devuelve token y redirige por rol
- [ ] Dashboard vendedor muestra datos reales (no mock)
- [ ] Todos los features del prototipo tienen al menos una página conectada
- [ ] `pnpm build` sin errores en el frontend
- [ ] Tests unitarios pasan en CI
