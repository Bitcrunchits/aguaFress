# AuditLog Specification

## Purpose

Provide a consistent, centralized audit trail for all 7 business domains. Every meaningful mutation across auth, vendedores, clientes, QR codes, links de invitación, super-admin, and users produces a typed audit record. The module exposes three surfaces: a programmatic service, a declarative decorator, and an admin query endpoint.

---

## Requirements

### R1: AuditLogService.record()

The service **MUST** expose a `record(action, userId, opts?)` method that inserts one `AUDIT_LOG` row.

**Mandatory fields**: `usuario_id`, `accion` (from `AuditAction` enum).

**Optional fields**: `target_id` (target entity UUID, e.g. orderId, qrId), `detalle` (JSON blob for before/after snapshots, nullable), `ip` (IPv4/IPv6 string, nullable).

**Internal auto-fields**: `id` (UUID), `created_at` (ISO 8601, server timestamp).

**Behavior**: throw `BadRequestException` when `action` is not a valid `AuditAction` enum value. Pass through any other exception from the Prisma client (connection, constraint). **MUST NOT** throw on null `detalle` or null `ip` or null `target_id`.

#### Scenario: Record full audit entry

- GIVEN a valid `AuditAction.USER_REGISTERED`, a userId, a targetId, a detail payload, and an IP string
- WHEN `record()` is called with all optional fields populated
- THEN a row is inserted in `AUDIT_LOG` with all fields set to the provided values AND an auto-generated UUID and ISO timestamp

#### Scenario: Record minimal audit entry

- GIVEN a valid `AuditAction.QR_CREATED`, a userId, and no other optional params
- WHEN `record()` is called with only `action` and `userId`
- THEN a row is inserted with `target_id`, `detalle`, and `ip` as NULL

#### Scenario: Invalid action string

- GIVEN an arbitrary string that is not a member of `AuditAction`
- WHEN `record()` is called with that string as action
- THEN the service throws `BadRequestException` with a descriptive message

---

### R2: @AuditLog(action) Decorator

The decorator **MUST** auto-log audit entries for controller handler methods by extracting `userId` from the request's `@CurrentUser()` decorator and injecting metadata at execution time.

**Behavior**: When the decorated handler completes without error, `AuditLogService.record(action, userId, opts)` **MUST** be called automatically. The `target_id` **SHOULD** be resolved from the handler's first route parameter named `id` when present.

**IP extraction** (shared utility): `x-forwarded-for` header first, fallback to `req.ip`. Both **MAY** be null (for internal calls or edge cases).

#### Scenario: Decorator logs after successful handler

- GIVEN a controller handler decorated with `@AuditLog(AuditAction.VENDEDOR_UPDATED)` and a valid request with `@CurrentUser()` providing userId
- WHEN the handler executes successfully (returns 2xx)
- THEN `record()` is called with the correct action, userId, and the `id` route param as target_id

#### Scenario: Decorator does NOT log on exception

- GIVEN a controller handler decorated with `@AuditLog(...)`
- WHEN the handler throws an exception (4xx/5xx)
- THEN `record()` is NOT called — failed operations produce no audit trail

#### Scenario: No decorator target

- GIVEN a decorator applied to a non-function target (class, property)
- THEN the decorator **MUST** throw at definition time to fail fast

---

### R3: Admin Query Endpoint

`GET /audit-logs` **MUST** return paginated audit records. **MUST** be guarded by `AuthGuard` + `RolesGuard(SUPER_ADMIN)`.

**Filters** (all optional, combined with AND):

| Filter | Type | Behavior |
|--------|------|----------|
| `usuarioId` | UUID | Match exact user |
| `accion` | `AuditAction` value | Match exact action |
| `targetId` | UUID | Match exact target UUID |
| `from` | ISO date | `created_at >= from` |
| `to` | ISO date | `created_at <= to` |

**Pagination**: `page` (default 1), `limit` (default 20, max 100). Response shape: `{ data: AuditLogEntryDTO[], meta: { page, limit, total, totalPages } }`.

#### Scenario: Admin fetches all logs

- GIVEN an authenticated SUPER_ADMIN user
- WHEN GET `/audit-logs` is called with no filters
- THEN a 200 response returns the first 20 records ordered by `created_at DESC`

#### Scenario: Filtered query with pagination

- GIVEN an authenticated SUPER_ADMIN user and 50 records exist for action USER_REGISTERED
- WHEN GET `/audit-logs?accion=USER_REGISTERED&limit=10&page=2` is called
- THEN a 200 response returns records 11-20 with `meta.total` = 50 and `meta.totalPages` = 5

#### Scenario: Unauthenticated request

- GIVEN no authentication token
- WHEN GET `/audit-logs` is called
- THEN a 401 response is returned

#### Scenario: Non-admin authenticated request

- GIVEN an authenticated VENDEDOR or CLIENTE user
- WHEN GET `/audit-logs` is called
- THEN a 403 response is returned

#### Scenario: Non-existent filter combination

- GIVEN an authenticated SUPER_ADMIN and a `usuarioId` that matches no records
- WHEN GET `/audit-logs?usuarioId=<valid-uuid>` is called
- THEN a 200 response returns `{ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }`

---

### R4: AuditAction Enum

The enum **MUST** contain exactly 12 values: `USER_REGISTERED`, `USER_LOGIN`, `VENDEDOR_UPDATED`, `VENDEDOR_STATUS_CHANGED`, `CLIENTE_UPDATED`, `CLIENTE_REASSIGNED`, `QR_CREATED`, `QR_DEACTIVATED`, `LINK_CREATED`, `LINK_DEACTIVATED`, `SUPER_ADMIN_UPDATED`, `PROFILE_UPDATED`. Defined in `packages/contracts/src/enums.ts`. All services import from `@agua/contracts` — no duplicated string literals.

#### Scenario: Enum value prevents typos

- GIVEN any service importing `AuditAction` from `@agua/contracts`
- WHEN the service references `AuditAction.QR_CREATED`
- THEN the value is the type-safe string `"QR_CREATED"` — no magic strings in business code
