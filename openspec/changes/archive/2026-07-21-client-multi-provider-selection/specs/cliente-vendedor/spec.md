# Delta

## ADDED Requirements

### Requirement: Active cartera source of truth
Vendedor access MUST authorize through active `RELACION_CARTERA(vendedorId, clienteId)`, not `CLIENTE.vendedor_id` alone.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Mismatch | default `v1`, active only `(v2,c1)` | `v1` requests `c1` | denied |
| Multi | active `(v1,c1)`,`(v2,c1)` | `v2` lists | `c1` appears |
