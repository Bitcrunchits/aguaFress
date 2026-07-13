# products-service — Notas de implementación

## Qué se implementó
- `src/main.ts` — bootstrap HTTP (Swagger en `/api/docs`) + TCP (puerto `TCP_PORT`, default `3013`), idéntico patrón a `usuario-service`.
- `src/products` — `ProductsService` con CRUD completo, paginación estándar, cálculo server-side de `precioFinal`.
- `src/categories` — `CategoriesService` con listado de categorías y marcas por vendedor.
- `src/tcp` — `ProductsTcpController` y `CategoriesTcpController`, exponen los `@MessagePattern` que el gateway va a consumir:
  - `products.list`, `products.get`, `products.search`, `products.create`, `products.update`, `products.delete`
  - `categories.list`, `brands.list`
- `src/common` — `PrismaService`, `PricingService` (cálculo de IVA), filtros/interceptors globales, healthcheck HTTP.
- `prisma/schema.prisma` — modelos `Producto`, `Categoria`, `Marca`.

## ⚠️ Asunciones que hay que confirmar con el equipo

1. **`vendedorId` = `sub`/`userId` del JWT directamente.**
   No tuvimos acceso a cómo orders-service/deliveries-service resuelven `vendedorId`, ni si products-service debería llamar a usuario-service (como hace `VendedorResolver` internamente en usuario-service) para traducir `authUserId` → `vendedor.id` interno. Si el resto del sistema usa un `vendedorId` distinto al `sub` del JWT, hay que ajustar `ProductsTcpController` para resolverlo vía TCP a `usuario-service` en vez de usar `user.sub` directo.

2. **No hay guard global de JWT en el contexto TCP de este servicio.**
   En `usuario-service`, los TCP controllers usan `@Public()` para saltear un guard global — no tuvimos acceso a ese guard ni al `AuthModule`. Acá cada handler valida explícitamente con `TcpPayloadAdapter.requireUser()` / `requireRole()`. Si el patrón real del equipo es tener un guard global también en los microservicios de dominio (no solo en usuario-service), hay que agregarlo.

3. **% de IVA fijo vía env (`IVA_PORCENTAJE`, default 21).**
   `PricingService` es el único lugar que calcula `precioFinal`. Si el IVA debe variar por categoría/vendedor, solo hay que tocar ese archivo.

4. **`LoggingInterceptor` y `TimeoutInterceptor` son implementaciones propias**, no los originales del equipo (no tuvimos acceso a esos archivos). Si existen versiones ya usadas en otros microservicios, reemplazar estas por esas para mantener 100% consistencia.
   El `Dockerfile` en cambio **sí sigue la convención real confirmada** (pnpm workspaces multi-stage, igual al del `gateway`), con el agregado de `postinstall: prisma generate` en `package.json` para que el cliente de Prisma se genere automático en ambos stages del build.

5. **Prisma schema usa un solo esquema/tablas `productos`, `categorias`, `marcas`** en la misma DB `agua`. Si el equipo usa multi-schema de Prisma (como `usuario-service` con `auth`/`users`), hay que agregar `schemas = ["products"]` en el datasource y prefijar los modelos.

## Falta agregar (fuera de este directorio, en el repo raíz)
- Bloque de `products-service` en `docker-compose.yml` (con `PRODUCTS_SERVICE_TCP_PORT` en el `gateway`).
- Variables en `.env` / `.env.example`: `DATABASE_URL` (para products-service), `IVA_PORCENTAJE` (opcional).
- Migraciones Prisma: correr `npx prisma migrate dev --name init` una vez confirmado el schema.
- Registrar el `ClientProxy` hacia `products-service` en el `gateway` (`ClientsModule.register(...)`) — no tuvimos ese archivo, así que no se tocó el gateway.
