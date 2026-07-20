# ActivityLogs Specification

## Purpose

Provide a MongoDB-owned, TCP-only activity-log read capability exposed to super-admins through the gateway `activity-logs` family.

## Requirements

### Requirement: TCP activity-log reads

The notifications-service **MUST** expose TCP patterns for listing activity logs and reading one activity log by id. It **MUST** return typed DTOs with ISO 8601 timestamps and **MUST** NOT expose direct HTTP endpoints.

#### Scenario: List logs newest first

- GIVEN activity logs exist in the notifications data store
- WHEN a trusted TCP caller sends `activity_logs.list` with no filters
- THEN the service returns page 1 ordered by `createdAt` descending
- AND the response includes pagination metadata.

#### Scenario: Filter and paginate logs

- GIVEN matching and non-matching activity logs exist
- WHEN `activity_logs.list` includes actor, action, source, from, to, page, and limit filters
- THEN only matching records are returned for the requested page
- AND invalid filter values are rejected with a typed error.

#### Scenario: Read one log by id

- GIVEN an activity log exists
- WHEN a trusted TCP caller sends `activity_logs.get-by-id` with that id
- THEN the service returns the matching activity-log DTO.

#### Scenario: Missing log id

- GIVEN no activity log exists for an id
- WHEN `activity_logs.get-by-id` is called with that id
- THEN the service returns a not-found error.

### Requirement: Gateway activity-logs access

The gateway **MUST** expose the `activity-logs` family only for authenticated `SUPER_ADMIN` read/list actions and **MUST** reject unauthorized requests before TCP dispatch.

#### Scenario: Super-admin lists logs

- GIVEN an authenticated SUPER_ADMIN request
- WHEN `/api/v1/activity-logs/list` is called
- THEN the gateway dispatches to `activity_logs.list` on notifications-service.

#### Scenario: Unauthorized request blocked

- GIVEN an unauthenticated or non-admin request
- WHEN an `activity-logs` action is called
- THEN the gateway returns 401 or 403
- AND no TCP message is sent.

### Requirement: Super-admin read-only UI contract

The activity-log API **MUST** provide enough structured data for a comfortable super-admin graphical interface. The UI contract **MUST** be read-only and support table rows, filters, pagination, and detail inspection without exposing create, update, or delete operations through the gateway.

The frontend **SHOULD** expose this capability through a SUPER_ADMIN-only button or menu item that navigates to a dedicated Activity Logs screen. Non-admin users **MUST NOT** see the entry point and **MUST NOT** access the route.

#### Scenario: Table view data

- GIVEN an authenticated SUPER_ADMIN user
- WHEN `/api/v1/activity-logs/list` is called
- THEN each row includes id, createdAt, source, action, actor, entity, result, and summary/detail fields suitable for a table.
- AND the response includes pagination metadata.

#### Scenario: Super-admin navigation entry

- GIVEN an authenticated SUPER_ADMIN user
- WHEN the admin shell/sidebar/header is rendered
- THEN an Activity Logs button or menu item is visible
- AND selecting it navigates to the Activity Logs screen.

#### Scenario: Non-admin navigation hidden

- GIVEN an authenticated CLIENTE or VENDEDOR user
- WHEN the app shell/sidebar/header is rendered
- THEN the Activity Logs entry point is not visible
- AND direct route access is denied or redirected.

#### Scenario: Filter controls

- GIVEN an authenticated SUPER_ADMIN user
- WHEN the UI sends source, action, actor, result, from, to, page, or limit filters
- THEN the gateway forwards valid filters to `activity_logs.list`
- AND invalid filters are rejected with a controlled error.

#### Scenario: Detail drawer/modal

- GIVEN an activity-log row is selected
- WHEN `/api/v1/activity-logs/get-by-id?id=<id>` is called
- THEN the response includes full metadata for read-only display
- AND the API does not expose any mutation action for that log.

### Requirement: Ingestion boundary

The service **MAY** expose `activity_logs.create` only for trusted internal producers, seeds, or tests. Full stream consumption and migration from usuario-service audit logs **MUST** remain out of scope for this change.

#### Scenario: Trusted internal create

- GIVEN a trusted internal caller sends a valid activity log payload
- WHEN `activity_logs.create` is available and called
- THEN the service persists the record and returns its DTO.

#### Scenario: No public create action

- GIVEN any HTTP gateway request attempts to create an activity log
- WHEN the request targets `activity-logs`
- THEN the gateway rejects the action as unavailable.
