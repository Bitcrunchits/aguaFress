# Tasks: gateway-unica-entrada — Cerrar HTTP directo del usuario-service

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1200-1500 total |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | WU-01→WU-02→WU-03 en un PR, WU-04 otro, WU-05→WU-06 otro |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |
| Tracker branch | `adrian/api-gateway-unica-entrada` |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add 14 TCP handlers + action registry | PR 1 | Base = `adrian/api-gateway-unica-entrada`; TDD: RED test first |
| 2 | Gateway dispatcher tests + verify resolution | PR 1 | En el mismo PR que WU-01 y WU-03 |
| 3 | Tests for 14 new TCP handlers | PR 1 | Strict TDD: test-first |
| 4 | Remove HTTP controllers + tests | PR 2 | Base = PR 1 branch; delete 8 controllers + 8 test files |
| 5 | Close HTTP in main.ts + Docker | PR 2 | Mismo PR que WU-04 |

Never merge to `develop` without explicit user order; only child branches may merge into tracker branch `adrian/api-gateway-unica-entrada`.

## Phase 1: TCP Handlers & Action Registry (PR 1) ✅

- [x] 1.1 RED: Write failing tests for `vendedores.get_by_id`, `vendedores.update`, `vendedores.change_estado` in `usuario-domain-tcp.controller.spec.ts`
- [x] 1.2 GREEN: Add 3 vendedores TCP handlers to `src/tcp/usuario-domain-tcp.controller.ts` (`getById`, `update`, `changeEstado`)
- [x] 1.3 RED: Write failing tests for `super_admin.profile`, `super_admin.profile_update`
- [x] 1.4 GREEN: Add 2 super-admin TCP handlers (`profile`, `profileUpdate`)
- [x] 1.5 RED: Write failing tests for `clientes.get_by_id`, `clientes.update`, `clientes.reassign`
- [x] 1.6 GREEN: Add 3 admin-clientes TCP handlers (`getById`, `update`, `reassign`)
- [x] 1.7 RED: Write failing tests for `clientes.own_get_by_id`, `clientes.own_update`
- [x] 1.8 GREEN: Add 2 vendor-scoped clientes TCP handlers (`getOwnById`, `updateOwn`)
- [x] 1.9 RED: Write failing tests for `qr.admin_deactivate`, `qr.vendor_deactivate`
- [x] 1.10 GREEN: Add 2 QR deactivate TCP handlers (`adminDeactivate`, `vendorDeactivate`)
- [x] 1.11 RED: Write failing tests for `link_invitacion.admin_deactivate`, `link_invitacion.vendor_deactivate`
- [x] 1.12 GREEN: Add 2 link-invitacion deactivate TCP handlers (admin y vendor)
- [x] 1.13 GREEN: Update `action-registry.ts` — add 14 new action entries, remove `auth.me` entry

## Phase 2: Gateway Tests (PR 1) ✅

- [x] 2.1 RED: Write failing test for gateway action-resolver resolving each new action
- [x] 2.2 GREEN: Ensure action-resolver tests pass
- [x] 2.3 REFACTOR: Verify no test leaks between old `auth.me` and new `users.profile` path

## Phase 3: Close HTTP (PR 2) — mayormente completado

- [x] 3.1 DELETE: Remove `vendedores.controller.ts` + spec (3 endpoints now TCP)
- [x] 3.2 DELETE: Remove `super-admin.controller.ts` + spec (2 endpoints now TCP)
- [x] 3.3 DELETE: Remove `clientes.controller.ts` + spec (3 endpoints now TCP)
- [x] 3.4 DELETE: Remove `cliente-vendedor.controller.ts` + spec
- [x] 3.5 DELETE: Remove `qr-codes-admin.controller.ts` + spec
- [x] 3.6 DELETE: Remove `qr-codes-vendor.controller.ts` + spec
- [x] 3.7 DELETE: Remove `link-invitacion-admin.controller.ts` + spec
- [x] 3.8 DELETE: Remove `link-invitacion-vendor.controller.ts` + spec
- [x] 3.9 DELETE: Remove `auth.me` TCP handler from `auth-tcp.controller.ts`
- [x] 3.10 REFACTOR: `main.ts` — TCP only, sin HTTP
- [x] 3.11 REFACTOR: Remove `HttpAdapterHost`, `SwaggerModule`, `ValidationPipe` de `main.ts`
- [ ] 3.12 REFACTOR: Update `Dockerfile` — `EXPOSE 3011` + CMD path `dist/main.js`
- [x] 3.13 REFACTOR: `docker-compose.yml` — sin puerto HTTP 3001
- [x] 3.14 VERIFY: `pnpm --filter @agua/usuario-service test` → **278 tests pass**

### Extras — fixes de hoy fuera del plan original

- [x] Fix `tsconfig.json` de usuario-service: `@agua/contracts` → `../../packages/contracts/dist` (arregla build output path)
- [x] Crear `MicroServices/gateway/.env` con JWT_SECRET, USUARIO_SERVICE_HOST, TCP_PORT
- [x] Fix `docs.controller.ts`: rutas sin `api/` duplicado + `@Public()` para docs públicos
- [x] Crear `api-reference.html` con endpoints, DTOs, enums para el frontend
- [x] Crear `docker-compose.frontend.yml` para frontend (un solo comando) — borrado después

### Pendiente

- [ ] Revisar test de gateway que falla (`register/vendedor` da 401 pre-existing)
- [ ] Verificar entry point en `Dockerfile` de usuario-service (CMD apunta a ruta vieja)
- [ ] Mergear rama al tracker cuando corresponda
