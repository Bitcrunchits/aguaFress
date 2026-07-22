# Data Model Documentation Spec

## Purpose

Documentation source of truth for AguaFress data-model semantics.

## Requirements

### Requirement: Document canonical provider model

`docs/documentacion/modelo-datos.md` MUST state that active `RELACION_CARTERA` is the canonical cliente↔proveedor relationship. `CLIENTE.vendedor_id` MUST be documented as default/V1 compatibility only. Cart/order `vendedor_id` MUST mean selected provider, and auth identity MUST remain `userId`/`role`.

#### Scenario: Updated model documentation

- GIVEN a reviewer reads the data model documentation
- WHEN they inspect cliente/provider identity and cart/order provider fields
- THEN cartera/default semantics MUST be explicit
- AND `userId` versus `clienteId`/`vendedorId` MUST remain coherent
