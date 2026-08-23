# Frontend Admin Flows Specification

## Purpose

Define the frontend-only behavior required to expose the missing PRS AG-1 role flows through the existing `/api/v1` Gateway capabilities, without changing backend, gateway, contracts, database, seeds, or generated OpenAPI artifacts.

## Requirements

### Requirement: Frontend-Only Scope and Identity Boundaries

This change MUST only modify frontend artifacts and MUST preserve role and identity semantics from the live backend: `userId` comes from the authenticated JWT, `clienteId` and `vendedorId` identify domain profiles, and `actorUserId` is audit metadata derived server-side from the authenticated actor.

#### Scenario: No backend changes
- GIVEN implementation discovers a missing backend permission, route, contract field, Prisma relation, seed, or OpenAPI declaration
- WHEN the requested user flow cannot be completed honestly from the frontend
- THEN the frontend change SHALL document the blocker or hide/disable the unsupported action
- AND it MUST NOT modify backend services, gateway routing, contracts, database schemas, seeds, or generated OpenAPI files

#### Scenario: JWT identity is not form input
- GIVEN any admin, vendedor, or cliente form in this change
- WHEN the user submits the form
- THEN the form SHALL NOT ask for or send JWT `userId` as editable input
- AND the request SHALL only include `clienteId` or `vendedorId` where the existing API contract requires domain scoping

#### Scenario: Audit actor identity
- GIVEN an admin action creates audit history, such as vendor status change, client reassignment, provider addition, QR deactivation, or invitation-link deactivation
- WHEN the action is submitted
- THEN the frontend SHALL rely on the backend to derive `actorUserId` from the authenticated JWT
- AND the UI SHALL NOT collect `actorUserId` from the user

### Requirement: Super Admin Navigation and Route Access

The frontend MUST expose a complete `SUPER_ADMIN` navigation surface under `/admin/*` for dashboard, vendors, pending vendors, vendor detail, clients, client detail, audit, QR codes, invitation links, and profile.

#### Scenario: Admin menu contains all reachable sections
- GIVEN a logged-in user with role `SUPER_ADMIN`
- WHEN the dashboard layout renders
- THEN the navigation SHALL include links for admin dashboard, vendors, pending vendors, clients, audit, QR codes, invitation links, and profile
- AND each link SHALL route under `/admin/*`

#### Scenario: Admin routes are role-gated
- GIVEN a logged-in user without role `SUPER_ADMIN`
- WHEN they navigate directly to any `/admin/*` route
- THEN the frontend SHALL block access using the existing role-gating pattern
- AND it SHALL NOT attempt admin API calls for that screen

#### Scenario: Admin route async states
- GIVEN a `SUPER_ADMIN` opens any admin route backed by gateway data
- WHEN data is loading, fails, is empty, or succeeds
- THEN the page MUST show distinct loading, error, empty, and success states
- AND error states MUST preserve the backend failure instead of silently replacing it with empty data

### Requirement: Admin Vendor Management

The frontend MUST let a `SUPER_ADMIN` list vendors, filter pending vendors, inspect vendor detail, and change vendor status through the existing vendedor endpoints and `VendedorEstado` enum values.

#### Scenario: Vendor list with filters and pagination
- GIVEN a `SUPER_ADMIN` opens `/admin/vendors`
- WHEN vendors are requested with optional `estado`, `page`, `limit`, or `search`
- THEN the UI SHALL call `GET /api/v1/vendedores/list` with those query parameters
- AND it SHALL render loading, error, empty, and paginated success states

#### Scenario: Pending vendors view
- GIVEN a `SUPER_ADMIN` opens `/admin/vendors/pending`
- WHEN the vendor list is requested
- THEN the UI SHALL request vendors with `estado=pendiente`
- AND it SHALL explain the empty state when there are no pending vendors to approve

#### Scenario: Vendor detail
- GIVEN a `SUPER_ADMIN` selects a vendor from a list
- WHEN `/admin/vendors/:vendedorId` renders
- THEN the UI SHALL call `GET /api/v1/vendedores/get-by-id/{id}` using the domain `vendedorId`
- AND it SHALL show vendor profile, current `VendedorEstado`, and available admin actions

#### Scenario: Enable or disable vendor
- GIVEN a `SUPER_ADMIN` is viewing a vendor that can change state
- WHEN they submit a status change
- THEN the UI SHALL call `PATCH /api/v1/vendedores/change-estado/{id}` with a typed `VendedorEstado` value
- AND it SHALL refresh the vendor detail or list state after success
- AND it SHALL show backend validation or authorization errors without converting them to empty state

#### Scenario: No string status literals
- GIVEN vendor status is rendered or submitted
- WHEN frontend code maps status labels or actions
- THEN it SHALL use the typed `VendedorEstado` enum from contracts or existing frontend type exports
- AND it SHALL NOT introduce ad-hoc string literals for vendor state transitions

### Requirement: Admin Vendor Registration

The frontend MUST let an admin start vendor onboarding through the existing public vendor registration endpoint while making the pending-approval lifecycle visible.

#### Scenario: Register vendor from admin flow
- GIVEN a `SUPER_ADMIN` opens the vendor creation flow
- WHEN they submit valid vendor registration data
- THEN the UI SHALL call `POST /api/v1/auth/register` with role `VENDEDOR` according to the existing register contract
- AND it SHALL show success copy that the vendor is created pending approval until enabled

#### Scenario: Registration validation errors
- GIVEN the registration form has missing or invalid fields, or the backend rejects duplicate credentials
- WHEN the admin submits the form
- THEN the UI SHALL show field-level or form-level errors from frontend validation or backend response
- AND it SHALL preserve the entered non-sensitive values for correction

#### Scenario: Password and identity boundaries
- GIVEN admin vendor registration creates an authentication user plus vendor profile
- WHEN the form renders
- THEN it SHALL NOT ask for `userId`, `actorUserId`, or database IDs
- AND it SHALL only collect fields required by the existing register contract

### Requirement: Admin Client Management

The frontend MUST let a `SUPER_ADMIN` list clients, inspect and update client detail, reassign a client to a vendor, and add an active provider relation using existing client endpoints.

#### Scenario: Admin client list
- GIVEN a `SUPER_ADMIN` opens `/admin/clients`
- WHEN clients are requested with optional `page`, `limit`, or `search`
- THEN the UI SHALL call `GET /api/v1/clientes/list`
- AND it SHALL show loading, error, empty, and paginated success states

#### Scenario: Admin client detail
- GIVEN a `SUPER_ADMIN` selects a client
- WHEN `/admin/clients/:clienteId` renders
- THEN the UI SHALL call `GET /api/v1/clientes/get-by-id/{id}` using the domain `clienteId`
- AND it SHALL show client profile, provider relationships where available, and admin actions

#### Scenario: Update client profile
- GIVEN a `SUPER_ADMIN` edits an allowed client field
- WHEN the form is submitted
- THEN the UI SHALL call `PATCH /api/v1/clientes/update/{id}` with the existing update DTO shape
- AND it SHALL show validation errors, backend errors, and success refresh distinctly

#### Scenario: Reassign client provider
- GIVEN a `SUPER_ADMIN` chooses a new primary/default vendor for a client
- WHEN the reassignment is submitted
- THEN the UI SHALL call `PATCH /api/v1/clientes/reassign/{id}` with the selected domain `vendedorId`
- AND it SHALL NOT send JWT `userId` or `actorUserId`

#### Scenario: Add provider relation
- GIVEN a `SUPER_ADMIN` selects an additional active provider for a client
- WHEN the provider relation is submitted
- THEN the UI SHALL call `POST /api/v1/clientes/providers/add/{id}` with the selected domain `vendedorId`
- AND it SHALL show an empty/disabled provider selector state when no eligible vendors are available

### Requirement: Admin QR Codes and Invitation Links

The frontend MUST fix admin QR and invitation-link listing by requiring a selected `vendedorId` before calling the vendor-scoped admin list endpoints, and it MUST stop masking required-parameter failures as empty data.

#### Scenario: Vendor selection required before QR list
- GIVEN a `SUPER_ADMIN` opens the admin QR code page
- WHEN no vendor is selected
- THEN the UI SHALL show a vendor-selection prerequisite state
- AND it SHALL NOT call `GET /api/v1/super-admin/qr-codes` without `vendedorId`

#### Scenario: Vendor-scoped QR list
- GIVEN a `SUPER_ADMIN` selected a vendor
- WHEN QR codes are requested
- THEN the UI SHALL call `GET /api/v1/super-admin/qr-codes?vendedorId={vendedorId}` with optional pagination
- AND it SHALL show loading, error, empty, and success states for that selected vendor

#### Scenario: Admin QR deactivate
- GIVEN a QR code is active and visible in the admin QR list
- WHEN the admin deactivates it
- THEN the UI SHALL call `PATCH /api/v1/qr/admin/deactivate/{id}`
- AND it SHALL refresh the vendor-scoped QR list after success

#### Scenario: Vendor selection required before invitation links
- GIVEN a `SUPER_ADMIN` opens the admin invitation-link page
- WHEN no vendor is selected
- THEN the UI SHALL show a vendor-selection prerequisite state
- AND it SHALL NOT call `GET /api/v1/super-admin/link-invitacion` without `vendedorId`

#### Scenario: Vendor-scoped invitation-link list
- GIVEN a `SUPER_ADMIN` selected a vendor
- WHEN invitation links are requested
- THEN the UI SHALL call `GET /api/v1/super-admin/link-invitacion?vendedorId={vendedorId}` with optional pagination
- AND it SHALL show loading, error, empty, and success states for that selected vendor

#### Scenario: Admin invitation-link deactivate
- GIVEN an invitation link is active and visible in the admin link list
- WHEN the admin deactivates it
- THEN the UI SHALL call `PATCH /api/v1/link-invitacion/admin/deactivate/{id}`
- AND it SHALL refresh the vendor-scoped invitation-link list after success

#### Scenario: Required-parameter failures are visible
- GIVEN the backend rejects a QR or invitation-link request because `vendedorId` is missing or invalid
- WHEN the service or hook receives the error
- THEN the UI SHALL show an error state
- AND it SHALL NOT replace the failed result with an empty pagination object

### Requirement: Admin Audit and Profile

The frontend MUST expose admin audit and profile screens using the existing super-admin endpoints.

#### Scenario: Audit list
- GIVEN a `SUPER_ADMIN` opens `/admin/audit`
- WHEN audit entries are requested
- THEN the UI SHALL call either `GET /api/v1/super-admin/audit-log` or the live activity-log list endpoint selected by the implementation
- AND it SHALL show loading, error, empty, and success states

#### Scenario: Audit detail when linked from list
- GIVEN an audit list item links to detail
- WHEN the admin opens that detail
- THEN the UI SHALL call `GET /api/v1/activity-logs/get-by-id/{id}`
- AND it SHALL render actor, action, target, and timestamp information where provided by the backend

#### Scenario: Admin profile read and update
- GIVEN a `SUPER_ADMIN` opens `/admin/profile`
- WHEN profile data is loaded or updated
- THEN the UI SHALL use `GET /api/v1/super-admin/profile` and `PATCH /api/v1/super-admin/profile/update`
- AND it SHALL show loading, validation, error, and success states distinctly

### Requirement: Vendedor Client Flow Completion

The frontend MUST complete missing vendedor client workflows using vendedor-owned endpoints instead of super-admin-only client list endpoints.

#### Scenario: Vendor client portfolio uses own endpoint
- GIVEN a logged-in `VENDEDOR` opens their clients page
- WHEN the client portfolio is requested
- THEN the UI SHALL call `GET /api/v1/clientes/cartera`
- AND it SHALL NOT call `GET /api/v1/clientes/list`, which is super-admin-only

#### Scenario: Vendor client detail
- GIVEN a `VENDEDOR` selects one of their clients
- WHEN the client detail renders
- THEN the UI SHALL call `GET /api/v1/clientes/own/get-by-id/{id}` using the domain `clienteId`
- AND it SHALL show loading, error, empty/not-found, and success states

#### Scenario: Vendor updates own client
- GIVEN a `VENDEDOR` edits an allowed field for a client in their portfolio
- WHEN the form is submitted
- THEN the UI SHALL call `PATCH /api/v1/clientes/own/update/{id}`
- AND it SHALL show validation and backend errors without changing unrelated client state

#### Scenario: Vendor registers client directly
- GIVEN a `VENDEDOR` opens the direct client registration flow
- WHEN they submit valid client data
- THEN the UI SHALL call `POST /api/v1/auth/register-client/by-vendor`
- AND the request SHALL rely on the vendor identity from the JWT rather than an editable `vendedorId`

### Requirement: Cliente Provider, Cart, Checkout, and Job Tracking

The frontend MUST complete cliente provider switching, add-to-cart, checkout, and async order tracking using existing cliente endpoints and provider-scoped `vendedorId` where required.

#### Scenario: Cliente provider selection
- GIVEN a logged-in `CLIENTE` opens catalog or provider management
- WHEN active providers are loaded
- THEN the UI SHALL call `GET /api/v1/clientes/providers`
- AND it SHALL allow selecting a provider through `POST /api/v1/clientes/providers/select` with domain `vendedorId`

#### Scenario: Provider-scoped catalog
- GIVEN a `CLIENTE` selected a provider
- WHEN catalog products, categories, brands, or search results are requested
- THEN the UI SHALL scope catalog data to the selected domain `vendedorId` where the API requires it
- AND it SHALL show a provider-required empty state before product actions are enabled

#### Scenario: Add product to cart
- GIVEN a `CLIENTE` sees an available product for the selected provider
- WHEN they add it to cart
- THEN the UI SHALL call `POST /api/v1/cart/items/add`
- AND it SHALL update or refetch the provider-scoped cart for the selected `vendedorId`

#### Scenario: Cart checkout
- GIVEN a `CLIENTE` has a non-empty cart, selected `vendedorId`, and valid delivery address data
- WHEN they submit checkout
- THEN the UI SHALL call `POST /api/v1/orders/create` with `CreateOrderV2Request` and an `Idempotency-Key`
- AND it SHALL NOT send editable `userId`

#### Scenario: Checkout missing prerequisites
- GIVEN the cart is empty, no provider is selected, or delivery address data is missing
- WHEN the cliente tries to checkout
- THEN the UI SHALL block submission and show the missing prerequisite
- AND it SHALL NOT send a partial order request

#### Scenario: Async order job tracking
- GIVEN checkout or an order action returns `202 Accepted` with job information
- WHEN the response is received
- THEN the UI SHALL show a pending state and poll or link to `GET /api/v1/orders/job-status` until a terminal state is reached
- AND repeated submissions SHALL use idempotency behavior to avoid duplicate visible orders

### Requirement: Explicit Out-of-Scope Backend-Dependent Behavior

The frontend MUST explicitly exclude behaviors that require backend authorization, impersonation, route, or contract changes.

#### Scenario: Super admin cannot perform vendedor-only mutations from frontend
- GIVEN a `SUPER_ADMIN` asks to manage products, orders, deliveries, vendor QR, or vendor invitation links through vendedor-only mutation endpoints
- WHEN the live gateway restricts those endpoints to role `VENDEDOR`
- THEN this change SHALL treat that behavior as OUT
- AND it SHALL NOT add frontend impersonation or call vendedor-only mutation endpoints with a super-admin JWT

#### Scenario: Backend role expansion is OUT
- GIVEN a flow would require changing the gateway role matrix so `SUPER_ADMIN` can do everything a `VENDEDOR` or `CLIENTE` can do
- WHEN implementation reaches that boundary
- THEN the scenario SHALL be marked OUT for this frontend-only change
- AND it SHALL require a separate backend SDD if the product decision changes

#### Scenario: Missing checkout address contract is OUT beyond frontend collection
- GIVEN checkout requires delivery address data not available from current frontend state
- WHEN the existing API contract can accept address fields in `CreateOrderV2Request`
- THEN the frontend MAY collect the required address fields
- BUT if the contract lacks the required field or backend rejects a valid contract-shaped request, changing the contract or backend behavior is OUT
