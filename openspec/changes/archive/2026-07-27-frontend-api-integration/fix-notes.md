# Fix Notes: frontend-api-integration blockers

## Fixed

- Removed fake vendedor dashboard data: no `MOCK_ORDERS`, no hardcoded pending/sales/QR metrics.
- Moved vendedor dashboard fetching behind `features/vendedor/services/vendedor-dashboard.service.ts`; the hook now uses the service instead of importing `api` directly.
- Dashboard vendedor now derives metrics from real gateway-backed clientes, orders, and QR responses, and renders a real empty state for no recent orders.
- Removed the `SUPER_ADMIN` blanket bypass in `ProtectedRoute`; vendedor routes are role-scoped to `VENDEDOR`.
- Removed vendedor navigation links from the `SUPER_ADMIN` dashboard layout; only `/admin` remains exposed for that role.
- Replaced `PageSkeleton` inline `style` and `Math.random()` widths with deterministic Tailwind width classes.
- Added minimal product mutation foundation for supported gateway contracts: `PATCH /products/update?id=...` for active/inactive and `DELETE /products/delete?id=...` for delete.
- Added MSW coverage for vendedor dashboard real data, role-scope guard/nav, and product toggle/delete actions.
- Added product create/edit flows on the existing Productos page using `CreateProductRequest` and `UpdateProductRequest`, `POST /products/create`, and `PATCH /products/update?id=...`.
- Product create/edit bodies intentionally omit `userId`, `clienteId`, and `vendedorId`; `vendedorId` remains JWT-derived per contracts/gateway docs.
- Added MSW coverage for product create success, edit success, and create validation error.

## Verification

- `pnpm --filter @agua/frontend test` passed: 24 files / 114 tests.
- `pnpm --filter @agua/frontend build` passed: TypeScript + Vite production build.
- `pnpm --filter @agua/frontend lint` still fails before linting: `eslint: not found`.
- `dbs check` unavailable; manual scan found no `any`, `console.*`, `@ts-ignore`, `unknown[]`, inline styles, or `userId:` request body patterns under `packages/frontend/src`.

## Remaining Gaps

- Lint remains tooling debt until the frontend workspace installs/exposes `eslint`.
- Existing jsdom navigation stderr from `window.location.href` in API interceptor tests remains a known warning; tests pass.
