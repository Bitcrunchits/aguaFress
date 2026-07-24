## Requirements

### Requirement: Document canonical model
`docs/documentacion/modelo-datos.md` MUST state active `RELACION_CARTERA` is canonical; `CLIENTE.vendedor_id` is default only; cart/order `vendedor_id` is selected provider; auth remains `userId`/role.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Updated | docs reviewed | model read | cartera/default and `userId` vs `clienteId`/`vendedorId` are explicit |
