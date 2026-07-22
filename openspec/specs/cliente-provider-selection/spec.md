# Cliente Provider Selection Spec

## Purpose

Cliente mobile provider selection for accounts that can operate with one or more proveedores.

## Requirements

### Requirement: Provider list

The system MUST list providers from active `RELACION_CARTERA` rows. Auth identity uses JWT `userId`/`role`; domain scoping uses `clienteId`/`vendedorId`.

#### Scenario: Active providers

- GIVEN cliente `c1` has active cartera rows for vendedores `v1` and `v2`
- WHEN the cliente requests available providers
- THEN the response MUST include both providers
- AND each provider MUST identify the domain `vendedorId`

#### Scenario: No providers

- GIVEN cliente `c1` has no active cartera rows
- WHEN the cliente requests available providers
- THEN the response MUST contain an empty provider list
- AND no selected provider MUST be inferred

### Requirement: Active selection

The system MUST allow selecting only providers that have an active `RELACION_CARTERA` row for the cliente. One active provider MAY be auto-selected; multiple active providers MUST require explicit selection before provider-scoped access.

#### Scenario: Valid selection

- GIVEN cliente `c1` has active cartera row `(c1, v1)`
- WHEN the cliente selects `vendedorId = v1`
- THEN `v1` MUST be accepted as the active provider context

#### Scenario: Invalid selection

- GIVEN cliente `c1` has no active cartera row `(c1, v9)`
- WHEN the cliente selects `vendedorId = v9`
- THEN the selection MUST be rejected

### Requirement: Provider-scoped access

Scoped profile, catalog, cart, and order flows MUST require a validated `vendedorId`; they MUST NOT use `CLIENTE.vendedor_id` as authorization by itself.

#### Scenario: Missing selection

- GIVEN cliente `c1` has multiple active providers and no selected provider
- WHEN the cliente opens a provider-scoped catalog, cart, or order flow
- THEN the system MUST require provider selection before scoped access
