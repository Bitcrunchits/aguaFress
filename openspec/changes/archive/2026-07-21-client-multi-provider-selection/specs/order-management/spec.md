# Delta

## MODIFIED Requirements

### Requirement: Create from cart
MUST create async orders for authenticated cliente plus selected provider from matching cart; clear only that cart.
(Previously: order creation used a cliente cart without explicit provider-selection semantics.)

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Accepted | active `v1`, valid key | creates order | `202` with `jobId`,`trackingId`, provider; complete at `COMPLETED` |
| Created | valid `v1` cart | worker runs | order `vendedorId=v1`, enum status, ISO dates; `v1` cart clears |
| Product missing | product unavailable | worker processes | retry/fail; no order/cart clear |
| Retry | same cliente/provider/key | original exists | tracking preserved; no duplicate |
