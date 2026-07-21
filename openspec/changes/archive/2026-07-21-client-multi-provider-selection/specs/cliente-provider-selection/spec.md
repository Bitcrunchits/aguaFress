# Spec

## Requirements

### Requirement: Provider list
MUST list active `RELACION_CARTERA` providers; auth uses `userId`/`role`; domain uses `clienteId`/`vendedorId`.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Active | two active rows | providers requested | both return |
| None | no row | providers requested | empty; no selection |

### Requirement: Active selection
MUST select only active providers; one MAY auto-select, multiple MUST require selection before scoped access.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Valid | active `(c1,v1)` | select `v1` | active `v1` |
| Invalid | no active `(c1,v9)` | select `v9` | rejected |

### Requirement: Provider-scoped access
Scoped profile/catalog/cart/orders MUST require validated `vendedorId`, never `CLIENTE.vendedor_id`.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Missing | multiple providers, none selected | scoped catalog opens | selection required |
