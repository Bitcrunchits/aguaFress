# products-service — Notas de implementación

## Estado post-review técnico + modelo-datos.md v1.4 + usuario-domain-tcp.controller.ts

| Ítem | Estado |
|---|---|
| P0 — HTTP + Swagger en un MS que debe ser TCP-only | ✅ Corregido y confirmado por el equipo. |
| P1 — Test falla | ✅ Corregido: **28/28 tests pasan** (6 suites). |
| Prisma: UUIDs, VarChar/Text, casing | ✅ Corregido. |
| Gateway no integrado | ✅ Archivos completos en `gateway-integration.zip`. |
| **`vendedorId`** | ✅✅ **100% resuelto, ya no es asunción**: `modelo-datos.md` confirmó que debe ser `VENDEDOR.id`, y `usuario-domain-tcp.controller.ts` confirmó el `@MessagePattern` real: `'vendedores.resolve_profile_id'`. Implementado con patrón puerto/adaptador (`VendedorProfileResolverPort` + `TcpVendedorProfileResolverAdapter`), igual que `orders-service` (`VENDEDOR_PROFILE_RESOLVER_PORT`), para quedar arquitectónicamente consistente y resolver el hallazgo DIP "Parcial" del review. |
| `PRODUCTO_IMAGEN` / `DESCUENTO` | ✅ Excluidos, alineado con `modelo-datos.md` (`DESCUENTO` es V2.0 explícito; `PRODUCTO_IMAGEN` no existe en el modelo actual). |

## ⚠️ Pendiente — bloqueado por info que falta del equipo

1. **`RpcExceptionFilter` real**: se simplificó una versión propia solo-RPC (inferida del `main.ts` confirmado), no la real del equipo.
2. **`packages/contracts/src/events.ts`**: seguimos sin verlo. `ProductUpdated`/`ProductDeleted` (confirmado: Redis Streams, `products-stream`) siguen sin implementar, documentado como pendiente explícito.
3. **Acoplamiento operacional**: `products-service` ahora depende de `usuario-service` estando up para `create`/`update`/`delete`/`list` filtrado por vendedor (no para `get`/`search` públicos). Si `usuario-service` cae, esas operaciones fallan con timeout — trade-off correcto (falla visible > dato incorrecto), pero a tener en cuenta para monitoreo.

## Nota sobre la verificación de tests

Se corrieron los tests en un entorno de prueba aislado (no en el repo real). Se armó un stub local mínimo de `@agua/contracts` solo para poder instalar y correr `jest` — no reemplaza al paquete real del monorepo.

También se detectó que el sandbox de prueba no tiene acceso de red a `binaries.prisma.sh`, así que `prisma generate` no baja el engine real — **no es un bug del código**, es una limitación del entorno de prueba. Los tests igual corren bien porque `PrismaService` está mockeado en todos los tests unitarios.

Resultado: **6 test suites, 28 tests, todos en verde.**

## Falta agregar (fuera de este directorio, en el repo raíz)

- Aplicar `gateway-integration.zip` (action-registry, tcp-clients, tcp-dispatcher, docker-compose).
- Variables nuevas en `.env`/`.env.example`: `USUARIO_SERVICE_HOST`, `USUARIO_SERVICE_TCP_PORT` (products-service ahora también las necesita, no solo el gateway).
- Migraciones Prisma: `npx prisma migrate dev --name init`.
