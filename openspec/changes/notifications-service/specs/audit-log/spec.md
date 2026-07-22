# Delta for AuditLog

## MODIFIED Requirements

### R3: Admin Query Endpoint

`GET /audit-logs` **MUST** return paginated relational `AUDIT_LOG` records owned by usuario-service. It **MUST** be guarded by `AuthGuard` + `RolesGuard(SUPER_ADMIN)`. This endpoint **MUST NOT** read from notifications-service MongoDB `activity_logs`, and notifications-service **MUST NOT** replace or migrate this behavior in this change.
(Previously: The endpoint returned paginated audit records without an explicit ownership boundary against notifications-service activity logs.)

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
- THEN a 200 response returns the first 20 `AUDIT_LOG` records ordered by `created_at DESC`

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

#### Scenario: Notifications boundary preserved

- GIVEN notifications-service stores MongoDB `activity_logs`
- WHEN GET `/audit-logs` is called
- THEN the response is sourced only from usuario-service `AUDIT_LOG`
- AND no notifications-service TCP call is made.
