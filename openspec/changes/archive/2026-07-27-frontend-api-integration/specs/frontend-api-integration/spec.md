# Frontend API Integration Specification

## Purpose

Define role-scoped frontend behavior for replacing placeholders with real API Gateway data through `/api/v1` while keeping the already connected Productos list as baseline.

## Requirements

### Requirement: Shared API Integration Pattern

Each async screen MUST follow `page -> hook -> service`, use typed DTOs/contracts when available, centralized `/api/v1` routes, and role enums instead of string literals.

#### Scenario: Typed request path
- GIVEN a role screen needs gateway data
- WHEN the page renders
- THEN it SHALL call a hook backed by a typed service
- AND the service SHALL use the configured local `/api/v1` base path

#### Scenario: Async state contract
- GIVEN any async role screen
- WHEN data is loading, fails, is empty, or succeeds
- THEN the page MUST show distinct loading, error, empty, and success states

### Requirement: Role-Based Screens

The frontend MUST render real-data screens only for the authenticated role: `vendedor`, `cliente`, or `super_admin`.

#### Scenario: Allowed role access
- GIVEN a logged-in user with a valid role
- WHEN they navigate to that role area
- THEN only screens for that role SHALL be reachable

#### Scenario: Placeholder replacement
- GIVEN a current placeholder or mock screen in scope
- WHEN its gateway endpoint is available
- THEN the screen MUST render gateway data instead of static data

### Requirement: Products Integration Continuity

The Productos list MUST remain the verified baseline; remaining product CRUD and active/inactive toggle flows SHALL use the same pattern without reimplementing the list.

#### Scenario: Product mutation
- GIVEN a vendedor manages products
- WHEN they create, edit, delete, or toggle a product
- THEN the UI SHALL call the gateway and refresh affected product queries

### Requirement: Cliente Screens

Cliente screens MUST integrate catalog, provider selection, cart, orders, and profile read flows with real gateway data.

#### Scenario: Catalog and provider
- GIVEN a cliente opens catalog
- WHEN products, categories, brands, or providers are available
- THEN catalog filters and selected provider SHALL reflect gateway state

#### Scenario: Cart and orders
- GIVEN a cliente updates cart or views orders
- WHEN the gateway responds
- THEN cart totals, lines, and order history SHALL reflect persisted data

### Requirement: Vendedor Screens

Vendedor screens MUST integrate customers, products, orders, QR, link invitations, deliveries, dashboard metrics, recent orders, and profile read flows.

#### Scenario: Vendor operations
- GIVEN a vendedor opens an operational screen
- WHEN customers, products, orders, QR, links, deliveries, metrics, or profile data exist
- THEN the screen SHALL render role-owned gateway data

### Requirement: Super Admin Screens

Super admin screens MUST integrate dashboard stats, audit, vendors, clientes, orders, QR, and link read views where routes imply access.

#### Scenario: Admin read views
- GIVEN a super_admin opens admin pages
- WHEN gateway data exists
- THEN dashboard, audit, vendors, clientes, orders, QR, and links SHALL show system-wide read data

### Requirement: Async Orders and Deliveries

Order and delivery commands that return `202 Accepted` MUST include an idempotency key, enter a pending state, poll/track status, and stop on terminal states.

#### Scenario: Accepted async command
- GIVEN a cliente or vendedor submits an async order or delivery action
- WHEN the gateway returns `202 Accepted`
- THEN the UI SHALL show pending tracking and poll until success, failure, cancelled, or expired

#### Scenario: Duplicate command protection
- GIVEN the same action is retried
- WHEN the idempotency key is reused
- THEN the UI SHALL not create duplicate user-visible operations

### Requirement: Non-Goals

This change MUST NOT alter backend services, gateway routes, Prisma schemas, seeds, contracts redesign, app theme, React version, or the verified Productos list behavior.

#### Scenario: Out-of-scope change
- GIVEN implementation reaches a missing endpoint or contract gap
- WHEN frontend integration cannot continue safely
- THEN the change SHALL document the blocker rather than modifying backend behavior
