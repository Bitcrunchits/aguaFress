# Delta

## ADDED Requirements

### Requirement: Provider context forwarding
Gateway MUST forward trusted `userId`, `role`, `vendedorId`; MUST NOT trust body `userId` or unauthorized providers.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Valid | `c1` selected `v1` | dispatch cart/order | orders receives auth plus `vendedorId=v1` |
| Unauthorized | no active `(c1,v9)` | request has `vendedorId=v9` | rejected before mutation |
