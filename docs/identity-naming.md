<!-- Source of truth: keep this file aligned with AGENTS.md and OpenSpec auth/audit specs. -->

# Identity naming in AguaFress

Use ID names by what they identify, not by the current screen or role. This avoids mixing authentication identity with domain profile identity.

## Rule

| Name | Identifies | Use for |
|------|------------|---------|
| `userId` | `AUTH_USER.id` from JWT `sub` | Current authenticated actor and operational authorization |
| `role` | `AUTH_USER.role` from JWT | Role authorization |
| `clienteId` | `CLIENTE.id` | Cliente domain/profile entity only |
| `vendedorId` | `VENDEDOR.id` | Vendedor domain/profile entity only |
| `actorUserId` | `AUTH_USER.id` for the actor performing an action | Audit records |

## Compatibility notes

- Do not read `userId`, `clienteId`, or `vendedorId` from request bodies for authentication. Gateway/service code must trust JWT context only.
- Public V1 contracts that already expose auth-user identity as `clienteId`/`vendedorId` must document that compatibility explicitly until a V2 contract can rename them to `clienteUserId`/`vendedorUserId` or migrate to profile IDs.
- Audit actors must always be `actorUserId` / `AUTH_USER.id`, never `CLIENTE.id` or `VENDEDOR.id`.

## Orders V1 exception

Orders/cart V1 currently stores and exposes some auth-user IDs through legacy fields: `clienteId` maps to `usuario_id` / `AUTH_USER.id` for cliente ownership and async idempotency. This is public-contract compatible behavior, not the desired V2 domain naming. A future V2 migration should introduce explicit `clienteUserId`/profile-ID fields without breaking existing V1 clients.
