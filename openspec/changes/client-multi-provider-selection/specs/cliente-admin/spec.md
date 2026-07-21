# Delta

## ADDED Requirements

### Requirement: Cartera/default management
SUPER_ADMIN MUST manage membership via `RELACION_CARTERA`; `CLIENTE.vendedor_id` is default only.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Add | `c1`,`v2` exist | add `v2` | active `(c1,v2)` |
| Drift | default `v1` | `(c1,v1)` inactive/removed | default cleared/replaced |

## MODIFIED Requirements

### Requirement: R4: Reassign Vendedor (SUPER_ADMIN)
MUST change default and upsert cartera. `CLIENTE.vendedor_id` remains default; membership MUST be active `RELACION_CARTERA`.
(Previously: `vendedor_id` was effective assignment.)

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Valid | default `v1`; `v2` exists | PATCH `v2` | 200; default `v2`; active `(v2,c1)` |
| Missing | no `nonexistent` vendedor | PATCH `nonexistent` | 404 |
