# Delta

## MODIFIED Requirements

### Requirement: Active cart
MUST manage carts per authenticated cliente and validated `vendedorId`, never body `userId`; MUST NOT mix providers.
(Previously: one active cart per cliente using JWT identity only.)

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Read | selected `v1`, active cart | requested | only `v1` cart returns |
| userId ignored | body has `userId` | JWT names another | JWT wins |
| Switch | `v1` items exist | selects `v2` | `v1` items hidden |
