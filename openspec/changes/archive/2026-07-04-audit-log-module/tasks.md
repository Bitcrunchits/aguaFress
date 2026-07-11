# Tasks: AuditLogModule

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | 570-690 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Decorator, Controller, Integration) |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation — enum, module, service, ip-util, DTOs, service tests | PR 1 | Base: `adrian/ag-112-audit-log`. ~255 lines. Independent — service is testable alone. |
| 2 | Decorator + interceptor + admin controller + app.module + 7 service injections + controller/decorator tests | PR 2 | Base: PR 1 branch. ~350 lines. Depends on service from PR 1. |

---

## Phase 1: Foundation — Enum, Module, Service, IP Utility, DTOs & Service Tests

- [x] 1.1 Add `AuditAction` enum (12 values) to `packages/contracts/src/enums.ts`
- [x] 1.2 Create `src/audit-log/utils/ip-extractor.ts` — `extractIp(req)` function: parse `x-forwarded-for` first entry, fallback `req.ip`, return `string | null`
- [x] 1.3 Create `src/audit-log/audit-log.service.ts` — `AuditLogService` with `record()` method
- [x] 1.4 Create `src/audit-log/dto/list-audit-logs.dto.ts` — query DTO with `page`, `limit` (max 100), 5 optional filters
- [x] 1.5 Create `src/audit-log/dto/audit-log-entry.dto.ts` — response DTO with all fields + actor join
- [x] 1.6 Create `src/audit-log/audit-log.module.ts` — `@Global()` module with `AuditLogService`
- [x] 1.7 Create `src/audit-log/audit-log.service.spec.ts` — unit tests: full insert, minimal insert, invalid action throws

## Phase 2: Decorator, Interceptor, Admin Controller & Registration

- [x] 2.1 Create `src/audit-log/decorators/audit-log.decorator.ts` — `@AuditLog(action)` via `SetMetadata`
- [x] 2.2 Create `src/audit-log/interceptors/audit-log.interceptor.ts` — reads metadata, calls `record()` on 2xx
- [x] 2.3 Create `src/audit-log/audit-log-admin.controller.ts` — `GET /admin/audit-logs`, paginated + filtered
- [x] 2.4 Add `findAll(dto)` to `AuditLogService` — builds Prisma where from 5 filters, returns paginated shape
- [x] 2.5 Register `AuditLogModule` in `src/app.module.ts`
- [x] 2.6 Create `src/audit-log/audit-log-admin.controller.spec.ts` — integration tests
- [x] 2.7 Create `src/audit-log/interceptors/audit-log.interceptor.spec.ts` — unit tests

## Phase 3: Integration — Inject AuditLogService into 7 Services

- [x] 3.1 Inject + add calls in `src/auth/auth.service.ts` (USER_REGISTERED, USER_LOGIN)
- [x] 3.2 Inject + add calls in `src/vendedores/vendedores.service.ts` (VENDEDOR_UPDATED, VENDEDOR_STATUS_CHANGED)
- [x] 3.3 Inject + add calls in `src/clientes/clientes.service.ts` (CLIENTE_UPDATED, CLIENTE_REASSIGNED)
- [x] 3.4 Inject + add calls in `src/qr-codes/qr-codes.service.ts` (QR_CREATED, QR_DEACTIVATED)
- [x] 3.5 Inject + add calls in `src/link-invitacion/link-invitacion.service.ts` (LINK_CREATED, LINK_DEACTIVATED)
- [x] 3.6 Inject + add call in `src/super-admin/super-admin.service.ts` (SUPER_ADMIN_UPDATED)
- [x] 3.7 Inject + add call in `src/users/users.service.ts` (PROFILE_UPDATED)
