# Tasks: Super Admin Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~340 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — under budget |
| Delivery strategy | single-pr-default |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Contracts + DTO (Foundation)

- [x] 1.1 RED: Write `src/super-admin/dto/dto.spec.ts` — validate `UpdateSuperAdminProfileDto`: wrong type → 400, empty body → valid, `@MaxLength(100)` enforcement
- [x] 1.2 GREEN: Update `packages/contracts/src/dto/super-admin.dto.ts` — replace `ventasMes?`, `pedidosMes?`, `promedioTicket?` with `clientesConVendedor`, `totalSuperAdmins` in `SuperAdminDashboardResponse`
- [x] 1.3 GREEN: Rename `UpdateSuperAdminDto` → `UpdateSuperAdminProfileDto` in `src/super-admin/dto/update-super-admin.dto.ts`; add `@MaxLength(100)` to both fields

## Phase 2: Service Layer

- [x] 2.1 RED: Write `src/super-admin/super-admin.service.spec.ts` — `getProfile` success/404, `updateProfile` full/partial/empty/404, `getDashboard` flat shape + zero counts
- [x] 2.2 GREEN: Update `src/super-admin/super-admin.service.ts` — remove redundant role query in `getDashboard`; flatten response to `{ totalVendedores, vendedoresActivos, vendedoresPendientes, totalClientes, clientesConVendedor, totalSuperAdmins }`

## Phase 3: Controller + Module Wiring

- [x] 3.1 RED: Write `src/super-admin/super-admin.controller.spec.ts` — delegation for GET/PATCH /me and GET /dashboard with `@CurrentUser('userId')` passthrough
- [x] 3.2 GREEN: Add `SuperAdminModule` to `src/app.module.ts` imports; controller requires no changes (already correct per design)

## Phase 4: Integration Tests

- [x] 4.1 RED: Write `src/super-admin/super-admin.integration.spec.ts` — auth guard chain (401/403/200), profile CRUD GET/PATCH/partial, dashboard flat shape
- [x] 4.2 GREEN: Run full test suite — confirm all RED tests pass with `pnpm test`

---

All 9/9 tasks complete. **28 test suites, 251 tests passing** (was 24/217). Zero regressions.
