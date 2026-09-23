# AguaFress Backend

AguaFress es un backend de microservicios para pedidos, gestion de vendedores/clientes y operacion logistica de distribuidores de agua y soda. El backend esta construido con NestJS, TypeScript, pnpm workspaces, PostgreSQL, MongoDB, Redis, Prisma y Docker Compose.

> Estado actual de `main`: backend-first. El frontend React fue excluido de esta rama; el frontend futuro sera Angular. No documentar ni depender de `packages/frontend` para levantar el backend.

## Indice

- [Vision general](#vision-general)
- [Arquitectura](#arquitectura)
- [Servicios y puertos](#servicios-y-puertos)
- [Prerequisitos](#prerequisitos)
- [Variables de entorno](#variables-de-entorno)
- [Docker desde cero](#docker-desde-cero)
- [Desarrollo local](#desarrollo-local)
- [Base de datos y Prisma](#base-de-datos-y-prisma)
- [API docs: Scalar y OpenAPI](#api-docs-scalar-y-openapi)
- [Tests y build](#tests-y-build)
- [Estructura del workspace](#estructura-del-workspace)
- [Troubleshooting operativo](#troubleshooting-operativo)
- [Seguridad e identidad](#seguridad-e-identidad)
- [Flujo de contribucion](#flujo-de-contribucion)

## Vision general

El sistema reemplaza visitas fijas e improductivas por pedidos digitales, confirmacion de visita y operaciones trazables. El gateway es la unica entrada HTTP publica; los microservicios de dominio se comunican por TCP interno y jobs asincronicos cuando corresponde.

Stack principal:

| Area | Tecnologia |
| --- | --- |
| Runtime | Node.js 22 |
| Framework | NestJS 10 |
| Lenguaje | TypeScript 5 |
| Monorepo | pnpm workspaces |
| Base transaccional | PostgreSQL 15 |
| Base documental | MongoDB 7 para notifications-service |
| Cache/colas | Redis 7 + BullMQ |
| ORM | Prisma 5 por microservicio |
| API docs | Scalar UI + OpenAPI 3.0 generado por gateway |

## Arquitectura

```txt
Cliente HTTP
  -> api-gateway              HTTP :3000, prefijo /api
      -> usuario-service      TCP :3011
      -> products-service     TCP :3013
      -> orders-service       TCP :3014 + BullMQ orders.create
      -> entregas-service     TCP :3015
      -> notifications-service TCP :3016

Infraestructura local:
  PostgreSQL :5433 -> DBs agua, agua_products, agua_orders, agua_entregas
  Redis      :6379 -> cache/colas BullMQ
  MongoDB    :27017 -> agua_notifications
```

Decisiones vigentes:

- `gateway` es la unica frontera HTTP publica.
- Los microservicios de dominio no exponen HTTP publico al frontend.
- TCP sincronico se usa para login, perfil, validaciones, lecturas simples y respuestas inmediatas.
- Redis + BullMQ se usa para comandos criticos asincronicos que pueden esperar y no deben perderse, empezando por `orders.create`.
- Kafka no se usa para la resiliencia actual.
- Cada microservicio es dueno de su propia DB/schema Prisma cuando aplica.
- Las referencias cross-service son UUID escalares logicos; no hay relaciones Prisma ni foreign keys entre bases de datos de distintos microservicios.

## Servicios y puertos

| Servicio | Paquete | Protocolo | Puerto local | Persistencia |
| --- | --- | --- | --- | --- |
| API Gateway | `@agua/gateway` | HTTP | `3000:3000` | No posee DB |
| usuario-service | `@agua/usuario-service` | TCP interno | `3011` no publicado | PostgreSQL DB `agua` |
| products-service | `@agua/products-service` | TCP interno | `3013` no publicado | PostgreSQL DB `agua_products` |
| orders-service | `@agua/orders-service` | TCP interno + BullMQ | `3014` no publicado | PostgreSQL DB `agua_orders`, Redis |
| entregas-service | `@agua/entregas-service` | TCP interno | `3015` no publicado | PostgreSQL DB `agua_entregas`, Redis |
| notifications-service | `@agua/notifications-service` | TCP interno | `3016` no publicado | MongoDB DB `agua_notifications` |
| PostgreSQL | `postgres:15-alpine` | TCP | `5433:5432` | Volumen `agua-postgres-data` |
| Redis | `redis:7-alpine` | TCP | `6379:6379` | Sin volumen montado en el servicio actual |
| MongoDB | `mongo:7` | TCP | `27017:27017` | Volumen `agua-mongo-data` |

## Prerequisitos

- Docker con Docker Compose v2.
- Node.js 22 para desarrollo local fuera de contenedores.
- pnpm via Corepack.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install --frozen-lockfile
```

## Variables de entorno

El compose local usa `.env` en varios servicios. No commitear secretos reales.

Minimo requerido para levantar el backend desde Compose:

```env
ORDERS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_orders"
```

Variables relevantes documentadas por `docker-compose.yml`:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Prisma en servicios PostgreSQL; Compose la sobreescribe por servicio salvo `orders-service`. |
| `ORDERS_DATABASE_URL` | Requerida por `orders-service` en Compose. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Firma y refresh de JWT en desarrollo local. |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Expiracion de tokens. |
| `PORT` | Puerto HTTP del gateway. Default Compose: `3000`. |
| `TCP_PORT` | Puerto TCP interno de cada microservicio. |
| `REDIS_URL` | Redis para BullMQ/cache. En Compose: `redis://redis:6379`. |
| `MONGODB_URI` | MongoDB para notifications-service. En Compose: `mongodb://mongo:27017/agua_notifications`. |
| `UPLOAD_DIR` | Directorio compartido de uploads dentro del contenedor. |

Para desarrollo local fuera de Docker, usar hosts locales, por ejemplo PostgreSQL en `localhost:5433` y Redis en `localhost:6379`.

## Docker desde cero

> Importante: `docker-compose.yml` todavia contiene un servicio `frontend` que apunta a `packages/frontend/Dockerfile`, pero ese Dockerfile no existe en `main`. Para backend, levantá explicitamente los servicios backend.

1. Preparar `.env`.

```bash
cp .env.example .env
```

2. Asegurar al menos `ORDERS_DATABASE_URL` en `.env`.

```env
ORDERS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_orders"
```

3. Construir imagenes backend.

```bash
docker compose build postgres redis mongo usuario-service products-service orders-service entregas-service notifications-service gateway
```

4. Levantar infraestructura y servicios backend.

```bash
docker compose up -d postgres redis mongo usuario-service products-service orders-service entregas-service notifications-service gateway
```

5. Verificar estado.

```bash
docker compose ps
docker compose logs -f gateway
```

6. Acceder al gateway.

```txt
http://localhost:3000/api/health
http://localhost:3000/api/docs
http://localhost:3000/api/openapi.json
```

Para destruir contenedores y volumenes locales:

```bash
docker compose down -v
```

## Desarrollo local

Instalar dependencias y compilar contratos:

```bash
pnpm install --frozen-lockfile
pnpm build:contracts
```

Levantar solo infraestructura:

```bash
docker compose up -d postgres redis mongo
```

Ejecutar servicios en watch mode, cada uno en una terminal:

```bash
pnpm --filter @agua/usuario-service dev
pnpm --filter @agua/products-service dev
pnpm --filter @agua/orders-service dev
pnpm --filter @agua/entregas-service dev
pnpm --filter @agua/notifications-service dev
pnpm --filter @agua/gateway dev
```

Scripts raiz disponibles:

```bash
pnpm build:contracts
pnpm build
pnpm seed:test
```

## Base de datos y Prisma

Schemas Prisma activos:

| Servicio | Schema | Tablas principales |
| --- | --- | --- |
| usuario-service | `MicroServices/usuario-service/prisma/schema.prisma` | `AUTH_USER`, `VENDEDOR`, `CLIENTE`, `SUPER_ADMIN`, `RELACION_CARTERA`, `QR_CODE`, `LINK_INVITACION`, `AUDIT_LOG` |
| products-service | `MicroServices/products-service/prisma/schema.prisma` | `CATEGORIA`, `MARCA`, `PRODUCTO` |
| orders-service | `MicroServices/orders-service/prisma/schema.prisma` | `CART`, `CART_ITEM`, `ORDER`, `ORDER_ITEM`, `ORDER_HISTORY`, `PEDIDO_COUNTER`, `ORDER_COMMAND_JOB` |
| entregas-service | `MicroServices/entregas-service/prisma/schema.prisma` | `DELIVERY`, `DELIVERY_COMMAND_JOB` |
| notifications-service | No usa Prisma | MongoDB con Mongoose |

Comandos Prisma por servicio:

```bash
pnpm --filter @agua/usuario-service prisma:generate
pnpm --filter @agua/usuario-service prisma:validate
pnpm --filter @agua/usuario-service prisma:push

pnpm --filter @agua/products-service prisma:generate
pnpm --filter @agua/products-service prisma:migrate
pnpm --filter @agua/products-service prisma:studio

pnpm --filter @agua/orders-service prisma:generate
pnpm --filter @agua/orders-service prisma:validate
pnpm --filter @agua/orders-service prisma:push

pnpm --filter @agua/entregas-service prisma:generate
pnpm --filter @agua/entregas-service prisma:validate
pnpm --filter @agua/entregas-service prisma:push
```

Inicializacion local de PostgreSQL:

- `docker/init-db/create-service-databases.sql` crea `agua_orders`, `agua_entregas` y `agua_products` si no existen.
- `products-seed` carga `docker/init-db/seed-products-mock.sql` en `agua_products`.
- Varios Dockerfiles ejecutan `prisma generate` y `prisma db push` al iniciar para desarrollo local.

## API docs: Scalar y OpenAPI

El gateway sirve documentacion viva generada desde su registry de acciones.

| Recurso | URL |
| --- | --- |
| Scalar UI | `http://localhost:3000/api/docs` |
| OpenAPI JSON | `http://localhost:3000/api/openapi.json` |
| Redirect docs | `http://localhost:3000/api/` -> `/api/docs` |

Convencion publica del gateway:

```txt
{METHOD} /api/v1/{service}/{action}
Authorization: Bearer <jwt>
```

Scalar esta configurado con `persistAuth` y security scheme preferido `bearerAuth`.

## Tests y build

Builds disponibles:

```bash
pnpm build:contracts
pnpm --filter @agua/gateway build
pnpm --filter @agua/usuario-service build
pnpm --filter @agua/products-service build
pnpm --filter @agua/orders-service build
pnpm --filter @agua/entregas-service build
pnpm --filter @agua/notifications-service build
```

Tests disponibles:

```bash
pnpm --filter @agua/gateway test
pnpm --filter @agua/usuario-service test
pnpm --filter @agua/products-service test
pnpm --filter @agua/orders-service test
pnpm --filter @agua/entregas-service test
pnpm --filter @agua/notifications-service test
```

Coverage configurado explicitamente en products-service:

```bash
pnpm --filter @agua/products-service test:cov
```

## Estructura del workspace

```txt
aguaFress/
├── MicroServices/
│   ├── gateway/
│   ├── usuario-service/
│   ├── products-service/
│   ├── orders-service/
│   ├── entregas-service/
│   └── notifications-service/
├── packages/
│   └── contracts/              # @agua/contracts: DTOs, enums, eventos compartidos
├── docker/
│   └── init-db/                # SQL de inicializacion/seed local
├── contratosDTOs/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── SPEC.md
├── AGENTS.md
└── readme.md
```

Workspaces registrados:

```yaml
packages:
  - "packages/*"
  - "MicroServices/*"
```

## Troubleshooting operativo

| Sintoma | Causa probable | Accion |
| --- | --- | --- |
| `docker compose up -d` falla por `packages/frontend/Dockerfile` | `main` no contiene frontend React, pero Compose conserva el servicio `frontend`. | Levantar solo servicios backend explicitamente. |
| `ORDERS_DATABASE_URL must be set in .env` | Compose exige esa variable para `orders-service`. | Agregar `ORDERS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_orders"`. |
| Prisma falla en Alpine por OpenSSL | Prisma necesita librerias OpenSSL. | Los Dockerfiles PostgreSQL ya instalan `openssl`; revisar imagen si se cambia la base. |
| Gateway levanta pero no responde un dominio | Servicio TCP downstream no inicio o host/puerto mal configurado. | Revisar `docker compose ps` y `docker compose logs -f <servicio>`. |
| Cambios de schema no aparecen | Prisma Client desactualizado o DB sin push/migrate. | Ejecutar `prisma:generate` y `prisma:push`/`prisma:migrate` segun servicio. |

Comandos utiles:

```bash
docker compose ps
docker compose logs -f gateway
docker compose logs -f usuario-service
docker compose logs -f orders-service
docker compose exec postgres psql -U postgres -d agua
docker compose exec postgres psql -U postgres -d agua_products
docker compose exec postgres psql -U postgres -d agua_orders
docker compose exec postgres psql -U postgres -d agua_entregas
docker compose down -v
```

## Seguridad e identidad

Reglas obligatorias del proyecto:

- No enviar `userId` en body; se extrae del JWT.
- `userId` representa `AUTH_USER.id` desde el JWT `sub`.
- `role` representa `AUTH_USER.role` desde el JWT.
- `clienteId` y `vendedorId` son IDs de perfil de dominio, no identidad JWT.
- `actorUserId` es el `AUTH_USER.id` del actor para auditoria.
- Usar enums tipados para estados; no string literals sueltos.
- Fechas en ISO 8601.
- Eventos con `type` discriminante y base compatible con `BaseEvent`.
- Validacion NestJS con `ValidationPipe`, `whitelist: true` y `forbidNonWhitelisted: true`.
- Guards para autenticacion y roles; no validar JWT en controllers.
- No usar `console.log` en produccion; usar `Logger` de NestJS.
- No modelar relaciones Prisma/FK cross-DB entre microservicios.

## Flujo de contribucion

- Trabajar en ramas feature/fix; no mergear a `develop` ni `main` sin orden explicita.
- Mantener cambios pequenos y revisables.
- Usar conventional commits solo cuando se solicite commit: `feat(scope): mensaje`, `fix(scope): mensaje`, `refactor(scope): mensaje`.
- Tests unitarios para logica de negocio e integration tests para endpoints cuando aplique.
- Antes de abrir PR, verificar build/test del paquete tocado y contratos si se modifican DTOs/eventos.
- Mantener el README alineado con archivos reales; no documentar servicios, comandos ni paths que no existan.

## Limpieza documental aplicada

- `README.MD` fue reemplazado por `readme.md` en minusculas.
- `api-reference.html` fue eliminado porque la referencia viva del backend sale del gateway en Scalar/OpenAPI.
- `frontend.me` no existe en esta rama, por lo tanto no habia archivo para borrar.
