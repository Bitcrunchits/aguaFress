# Delta: deliveries-dto

> **Context**: The main `openspec/specs/deliveries-dto/spec.md` already covers removal of `vendedorId` from `DeliveryListFilters`, `UpdateDeliveryStatusRequest`, and `DeliveryResponse`. This delta adds the explicit `implements` contract alignment.

## ADDED Requirements

### Requirement: QueryDeliveriesDto implements DeliveryListFilters

The `QueryDeliveriesDto` class MUST explicitly declare `implements DeliveryListFilters` in its type signature. This ensures compile-time contract alignment between the gateway DTO and the contracts layer, preventing future drift if fields are added to `DeliveryListFilters`.

The class already provides all fields that `DeliveryListFilters` requires (via `PaginationRequest` extension):

| Field | Source | Status |
|-------|--------|--------|
| `fecha` | Defined in DTO directly | ✅ Already present |
| `page` | Inherited from `PaginationRequest` | ✅ Already present |
| `limit` | Inherited from `PaginationRequest` | ✅ Already present |

No new fields or runtime behavior changes — this is a pure type-level contract enforcement.

#### Scenario: TypeScript compilation ensures contract compliance

- GIVEN `QueryDeliveriesDto` declares `implements DeliveryListFilters`
- WHEN the file is compiled with `tsc --noEmit`
- THEN compilation succeeds
- AND no type errors are reported

#### Scenario: Valid payload with only fecha/page/limit

- GIVEN a `QueryDeliveriesDto` instance constructed with `{ fecha: "2024-12-01", page: 1, limit: 20 }`
- WHEN assigned to a variable of type `DeliveryListFilters`
- THEN the TypeScript type checker accepts the assignment
- AND no `vendedorId` is required

#### Scenario: Missing page and limit use defaults

- GIVEN a `QueryDeliveriesDto` instance constructed with `{ fecha: "2024-12-01" }` only
- WHEN the `DeliveryListFilters` interface is satisfied
- THEN `page` defaults to `1` and `limit` defaults to `10` (from `PaginationRequest` defaults)
- AND TypeScript compilation passes without error

## MODIFIED Requirements

### Requirement: DeliveryListFilters — vendedorId MUST be removed (unchanged)

This requirement from the main spec remains. No changes. The `vendedorId` field is already removed from `DeliveryListFilters` in the contracts layer.
