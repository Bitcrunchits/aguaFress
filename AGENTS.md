# AguaFress — Reglas de Code Review

## SOLID — OBLIGATORIO

### SRP — Single Responsibility
- Cada clase/modulo tiene UN solo motivo de cambio.
- NO mezclar responsabilidades (ej: auth + users en el mismo controller).
- Separar en archivos diferentes si hay más de una responsabilidad.

### OCP — Open/Closed
- Las interfaces se extienden, NO se modifican.
- Eventos nuevos se agregan a la unión por stream, no se modifican interfaces existentes.
- Para agregar campos a DTOs existentes, crear `FooV2DTO extends FooDTO`.

### LSP — Liskov Substitution
- Subtipos deben ser sustituibles por su tipo base.
- Todos los eventos deben extender `BaseEvent` (garantizan `timestamp`).
- Una función que recibe `BaseEvent` debe poder recibir cualquier evento concreto.

### ISP — Interface Segregation
- Eventos separados por stream (AuthEvent, OrderEvent...).
- Un consumidor de deliveries NO debe depender de eventos de products.
- DTOs específicos por endpoint, no reusar el mismo para request y response.
- `PaginationRequest` y `PaginationResponse` son separados.

### DIP — Dependency Inversion
- Depender de interfaces/contratos abstractos, no de implementaciones concretas.
- Los módulos importan de `@agua/contracts`, no de types definidos en otros servicios.
- Eventos usan enums (abstractos), no string literals.

## Clean Code — Reglas adicionales

- ❌ **No userId en body** — Se extrae del token JWT.
- ❌ **No string para estados** — Usar enums tipados (`OrderEstado`, `VendedorEstado`).
- ❌ **No dead code** — Enums sin usar, interfaces @deprecated, imports sin referencia → remover.
- ❌ **No unknown[] en responses** — Tipar con el DTO concreto.
- ✅ **Eventos con type** — Todos los eventos tienen un campo `type` discriminante.
- ✅ **IDs consistentes** — `userId`, `orderId`, `vendedorId`, `clienteId`. Nunca mezclar.
- ✅ **ISO 8601** — Todas las fechas en formato ISO string.
- ✅ **Conventional commits** — `feat(scope): msg`, `fix(scope): msg`, `refactor(scope): msg`.
- ✅ **Tests** — Unit tests para lógica de negocio. Integration tests para endpoints.

## NestJS específico

- ✅ Usar `ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true`.
- ✅ Módulos con `@Global()` solo cuando sea estrictamente necesario (PrismaService, config).
- ✅ Servicios injectables, no instanciar dependencias manualmente.
- ✅ Guards para autenticación y roles, no validar JWT en controllers.
- ✅ NO usar `console.log` en producción — usar Logger de NestJS.

## Prisma

- ✅ Usar `@@map()` para nombres de tablas en mayúsculas (ej: `@@map("USER")`).
- ✅ Timestamps `created_at` y `updated_at` en todas las tablas.
- ✅ IDs UUID generados con `@default(uuid())`.
- ✅ Relaciones explícitas con `@relation()` nombrado solo dentro de la DB propia del microservicio.
- ✅ Referencias a entidades de otro microservicio como UUID escalares lógicos, sin Prisma relation/FK cross-DB.

## Sesión 12/06 — Infraestructura Docker + Nota Histórica Stale

> Esta sección es histórica. La guía anterior de schema centralizado quedó obsoleta: la arquitectura vigente exige Docker, DB y Prisma schema propios por microservicio.

### docker-compose.yml (raíz)
- `postgres:15-alpine` en puerto `5433`, DB `agua`, user `postgres:postgres`
- `redis:7-alpine` en puerto `6379`
- `usuario-service` construido desde `MicroServices/usuario-service/Dockerfile`
- Los services esperan healthcheck de postgres y redis antes de arrancar

### Dockerfile (usuario-service)
- Multi-stage con `node:22-alpine` (pnpm 11 requiere Node 22+)
- Stage build: instalar deps, copiar source, build contracts, build usuario-service, prisma generate
- Stage run: copiar solo dist + prisma + node_modules, ejecutar `prisma db push` al iniciar
- Se instaló `openssl` via apk para que Prisma funcione en Alpine

### Arquitectura vigente de datos
- Cada microservicio mantiene su propio Dockerfile/setup, base de datos y `prisma/schema.prisma`.
- No existe un Prisma schema centralizado entre microservicios.
- Tablas de usuario-service: AUTH_USER, VENDEDOR, CLIENTE, SUPER_ADMIN, RELACION_CARTERA, QR_CODE, LINK_INVITACION, AUDIT_LOG.
- Tablas de products-service, orders-service y entregas-service viven en los schemas propios de esos servicios cuando se implementan.
- Los IDs cross-service son UUID escalares lógicos; no usar relaciones Prisma ni FKs entre DBs distintas.

### .env actualizado
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua"
```

### Comandos útiles
```bash
docker compose up -d                    # levantar todo
docker compose logs -f usuario-service  # logs del MS
docker compose exec postgres psql -U postgres -d agua  # consola SQL
docker compose down -v                  # destruir todo + volúmenes
```

### 🔥 REGLAS ABSOLUTAS (NO NEGOCIABLES)

- **NUNCA mergear a `develop` sin orden explícita del usuario.** Punto. No preguntar, no sugerir, no asumir.
- Solo mergear a feature/tracker branches a menos que se indique lo contrario.

### Pendiente para próxima sesión
- Revisar Jira
- Implementar AuthModule y UsersModule (controllers + servicios)
