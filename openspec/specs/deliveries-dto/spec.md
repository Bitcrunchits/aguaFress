# Delta: deliveries-dto

## ADDED / MODIFIED Requirements

### Requirement: DeliveryListFilters — vendedorId MUST be removed

`DeliveryListFilters` currently includes `vendedorId` as a required field. This is a DRIFT: the service extracts the authenticated vendedor from the JWT token, not from the query payload. The `vendedorId` field MUST be removed from `DeliveryListFilters`.

The correct shape:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `fecha` | `string` (ISO date) | No | Query param |
| `page` | `number` | No (default 1) | From `PaginationRequest` |
| `limit` | `number` | No (default 10) | From `PaginationRequest` |

#### Scenario: List deliveries filters correctly

- GIVEN a `DeliveryListFilters` DTO with only `{ fecha: "2024-12-01" }`
- WHEN passed to the list endpoint
- THEN the type checker does NOT require `vendedorId`
- AND the service uses the JWT `sub` claim to filter by vendedor

#### Scenario: No filters returns all today's deliveries for the vendedor

- GIVEN an empty `DeliveryListFilters`
- WHEN passed to the list endpoint
- THEN the service defaults to today's date and the authenticated vendedor's ID

### Requirement: UpdateDeliveryStatusRequest stays unchanged

`UpdateDeliveryStatusRequest` correctly restricts `estado` to `EN_CAMINO | ENTREGADA` and allows optional `notas`. No changes needed.

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `estado` | `DeliveryEstado.EN_CAMINO \| DeliveryEstado.ENTREGADA` | Yes | Must be a valid forward transition |
| `notas` | `string` | No | Free text |

#### Scenario: Update status request type safety

- GIVEN an `UpdateDeliveryStatusRequest` with `estado: DeliveryEstado.ENTREGADA`
- WHEN passed to the service
- THEN it compiles and validates correctly
- AND `estado: DeliveryEstado.PENDIENTE` is rejected at the type level

### Requirement: DeliveryResponse remains unchanged

`DeliveryResponse` currently matches the service output. No changes needed.

## REMOVED Requirements

### Requirement: vendedorId in DeliveryListFilters

(Reason: Drift — the service never reads `vendedorId` from the request body; it extracts it from the JWT token. Keeping it in the contract would mislead consumers into sending it.)
