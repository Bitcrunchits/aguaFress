# Backend de AguaFress

AguaFress es un backend de microservicios para gestionar pedidos, vendedores, clientes y operaciones logísticas de distribuidores de agua y soda. Está construido con NestJS, TypeScript, pnpm workspaces, PostgreSQL, MongoDB, Redis, Prisma y Docker Compose.

> Estado de la rama `main`: centrada en el backend. El frontend de React fue excluido de esa rama; está previsto utilizar Angular para el frontend.

## Datos de prueba

Al iniciar el backend, `usuario-service` deja disponible el `SUPER_ADMIN` local como conjunto mínimo de datos para el acceso inicial.

Inicie todos los servicios con el primer comando. Cuando `usuario-service` haya aplicado su esquema de Prisma, ejecute el SQL de usuarios para agregar vendedores, clientes y relaciones de cartera de prueba. Docker Compose ejecuta `products-seed` automáticamente; el último comando permite volver a ejecutar el SQL de productos si es necesario:

```bash
docker compose --env-file .env up -d

docker compose exec postgres psql -U postgres -d agua \
  -f /docker-entrypoint-initdb.d/seed-mock-data.sql

docker compose exec postgres psql -U postgres -d agua_products \
  -f /docker-entrypoint-initdb.d/seed-products-mock.sql
```

Verificación rápida:

```bash
docker compose exec postgres psql -U postgres -d agua \
  -c 'SELECT email, role FROM "AUTH_USER" ORDER BY email;'

docker compose exec postgres psql -U postgres -d agua_products \
  -c 'SELECT nombre, precio_final, stock FROM "PRODUCTO" LIMIT 10;'
```

Estos datos de prueba son solo para desarrollo local. No es necesario reiniciar los volúmenes. Ejecute los comandos manuales después de iniciar los servicios para evitar conflictos con la inicialización de PostgreSQL y Prisma.

Credenciales locales de prueba:

| Rol | Correo electrónico | Contraseña |
| --- | --- | --- |
| Superadministrador | `admin@aguafress.com` | `admin123` |
| Vendedor | `carlos@aguafress.com` | `admin123` |
| Vendedor | `ana@aguafress.com` | `admin123` |
| Vendedor | `luis@aguafress.com` | `admin123` |
| Vendedor | `sofia@aguafress.com` | `admin123` |
| Vendedor | `roberto@aguafress.com` | `admin123` |
| Cliente | `cliente1@aguafress.com` hasta `cliente25@aguafress.com` | `admin123` |

## Índice

- [Datos de prueba](#datos-de-prueba)
- [Visión general](#visión-general)
- [Arquitectura](#arquitectura)
- [Servicios y puertos](#servicios-y-puertos)
- [Requisitos previos](#requisitos-previos)
- [Variables de entorno](#variables-de-entorno)
- [Docker desde cero](#docker-desde-cero)
- [Desarrollo local](#desarrollo-local)
- [Base de datos y Prisma](#base-de-datos-y-prisma)
- [Documentación de la API: Scalar y OpenAPI](#documentación-de-la-api-scalar-y-openapi)
- [Pruebas y compilación](#pruebas-y-compilación)
- [Estructura del espacio de trabajo](#estructura-del-espacio-de-trabajo)
- [Solución de problemas operativos](#solución-de-problemas-operativos)
- [Seguridad e identidad](#seguridad-e-identidad)
- [Flujo de contribución](#flujo-de-contribución)

## Visión general

El sistema reemplaza las visitas fijas e improductivas por pedidos digitales, confirmaciones de visita y operaciones trazables. El gateway es el único punto de entrada HTTP público; los microservicios de dominio se comunican mediante TCP interno y tareas asíncronas cuando corresponde.

Tecnologías principales:

| Área | Tecnología |
| --- | --- |
| Entorno de ejecución | Node.js 22 |
| Marco de trabajo | NestJS 10 |
| Lenguaje | TypeScript 5 |
| Monorepositorio | pnpm workspaces |
| Base transaccional | PostgreSQL 15 |
| Base de datos documental | MongoDB 7 para notifications-service |
| Caché y colas | Redis 7 + BullMQ |
| ORM | Prisma 5 por microservicio |
| Documentación de la API | Scalar UI + OpenAPI 3.0 generado por el gateway |

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

Decisiones arquitectónicas vigentes:

- `gateway` es el único punto de entrada HTTP público.
- Los microservicios de dominio no exponen HTTP público al frontend.
- La comunicación TCP síncrona se usa para el inicio de sesión, los perfiles, las validaciones, las lecturas simples y las respuestas inmediatas.
- Redis y BullMQ se usan para comandos críticos asíncronos que pueden esperar y no deben perderse, comenzando por `orders.create`.
- Kafka no se usa para la resiliencia actual.
- Cada microservicio tiene su propia base de datos y su propio esquema de Prisma cuando corresponde.
- Las referencias entre servicios son UUID escalares lógicos; no hay relaciones de Prisma ni claves foráneas entre las bases de datos de distintos microservicios.

## Servicios y puertos

| Servicio | Paquete | Protocolo | Puerto local | Persistencia |
| --- | --- | --- | --- | --- |
| API Gateway | `@agua/gateway` | HTTP | `3000:3000` | Sin base de datos |
| usuario-service | `@agua/usuario-service` | TCP interno | `3011` no publicado | Base PostgreSQL `agua` |
| products-service | `@agua/products-service` | TCP interno | `3013` no publicado | Base PostgreSQL `agua_products` |
| orders-service | `@agua/orders-service` | TCP interno + BullMQ | `3014` no publicado | Base PostgreSQL `agua_orders`, Redis |
| entregas-service | `@agua/entregas-service` | TCP interno | `3015` no publicado | Base PostgreSQL `agua_entregas`, Redis |
| notifications-service | `@agua/notifications-service` | TCP interno | `3016` no publicado | Base MongoDB `agua_notifications` |
| PostgreSQL | `postgres:15-alpine` | TCP | `5433:5432` | Volumen `agua-postgres-data` |
| Redis | `redis:7-alpine` | TCP | `6379:6379` | Sin volumen montado en la configuración actual |
| MongoDB | `mongo:7` | TCP | `27017:27017` | Volumen `agua-mongo-data` |

## Requisitos previos

- Docker con Docker Compose v2.
- Node.js 22 para desarrollo local fuera de contenedores.
- pnpm mediante Corepack. Utilice pnpm 12.3.4 para evitar diferencias entre entornos.

```bash
corepack enable
corepack prepare pnpm@12.3.4 --activate
pnpm install --frozen-lockfile
```

## Variables de entorno

La configuración local de Docker Compose utiliza `.env` para proporcionar variables específicas a cada servicio. No incluya secretos reales en los commits.

Variables mínimas para iniciar el backend con Docker Compose:

```env
POSTGRES_PASSWORD="postgres"
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua"
PRODUCTS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_products"
ORDERS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_orders"
ENTREGAS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_entregas"
JWT_SECRET="local-jwt-secret-minimo-32-caracteres-123"
JWT_REFRESH_SECRET="local-refresh-secret-minimo-32-caracteres-123"
```

Variables relevantes en `docker-compose.yml`:

| Variable | Uso |
| --- | --- |
| `POSTGRES_PASSWORD` | Contraseña local de PostgreSQL utilizada por Docker Compose y las tareas de inicialización y carga de datos de prueba. |
| `DATABASE_URL` | Prisma en `usuario-service`. |
| `PRODUCTS_DATABASE_URL` | Prisma en `products-service`. |
| `ORDERS_DATABASE_URL` | Requerida por `orders-service` en Compose. |
| `ENTREGAS_DATABASE_URL` | Prisma en `entregas-service`. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Firma y renovación de JWT en desarrollo local. |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Expiración de los tokens. |
| `PORT` | Puerto HTTP del gateway. Valor predeterminado en Docker Compose: `3000`. |
| `TCP_PORT` | Puerto TCP interno de cada microservicio. |
| `REDIS_URL` | Redis para BullMQ y la caché. En Docker Compose: `redis://redis:6379`. |
| `MONGODB_URI` | MongoDB para notifications-service. En Docker Compose: `mongodb://mongo:27017/agua_notifications`. |
| `UPLOAD_DIR` | Directorio compartido para archivos cargados dentro del contenedor. |

Para desarrollar fuera de Docker, utilice direcciones locales, por ejemplo, PostgreSQL en `localhost:5433` y Redis en `localhost:6379`.

## Docker desde cero

1. Prepare `.env`.

```bash
cp .env.example .env
```

2. Reemplace todos los valores de ejemplo `<...>` antes de iniciar los servicios.

```env
POSTGRES_PASSWORD="postgres"
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua"
PRODUCTS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_products"
ORDERS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_orders"
ENTREGAS_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_entregas"
```

3. Construya las imágenes del backend.

La compilación utiliza pnpm 12.3.4 mediante Corepack. En repositorios recién clonados o si el registro de Docker o npm responde con lentitud, se recomienda limitar inicialmente la construcción paralela a un servicio:

```bash
COMPOSE_PARALLEL_LIMIT=1 docker compose --env-file .env build
```

4. Inicie la infraestructura y los servicios del backend.

```bash
docker compose --env-file .env up -d
```

5. Compruebe el estado de los servicios.

```bash
docker compose ps
docker compose logs -f gateway
```

6. Acceda al gateway.

```txt
http://localhost:3000/api/health
http://localhost:3000/api/docs
http://localhost:3000/api/openapi.json
```

Para eliminar los contenedores y volúmenes locales (se perderán los datos almacenados):

```bash
docker compose down -v
```

## Desarrollo local

Instale las dependencias y compile los contratos:

```bash
pnpm install --frozen-lockfile
pnpm build:contracts
```

Inicie solo la infraestructura:

```bash
docker compose up -d postgres redis mongo
```

Ejecute los servicios en modo de vigilancia, cada uno en una terminal:

```bash
pnpm --filter @agua/usuario-service dev
pnpm --filter @agua/products-service dev
pnpm --filter @agua/orders-service dev
pnpm --filter @agua/entregas-service dev
pnpm --filter @agua/notifications-service dev
pnpm --filter @agua/gateway dev
```

Comandos disponibles desde la raíz del repositorio:

```bash
pnpm build:contracts
pnpm build
pnpm seed:test
```

## Base de datos y Prisma

Esquemas de Prisma activos:

| Servicio | Esquema | Tablas principales |
| --- | --- | --- |
| usuario-service | `MicroServices/usuario-service/prisma/schema.prisma` | `AUTH_USER`, `VENDEDOR`, `CLIENTE`, `SUPER_ADMIN`, `RELACION_CARTERA`, `QR_CODE`, `LINK_INVITACION`, `AUDIT_LOG` |
| products-service | `MicroServices/products-service/prisma/schema.prisma` | `CATEGORIA`, `MARCA`, `PRODUCTO` |
| orders-service | `MicroServices/orders-service/prisma/schema.prisma` | `CART`, `CART_ITEM`, `ORDER`, `ORDER_ITEM`, `ORDER_HISTORY`, `PEDIDO_COUNTER`, `ORDER_COMMAND_JOB` |
| entregas-service | `MicroServices/entregas-service/prisma/schema.prisma` | `DELIVERY`, `DELIVERY_COMMAND_JOB` |
| notifications-service | No utiliza Prisma | MongoDB con Mongoose |

Comandos de Prisma por servicio:

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

Inicialización local de PostgreSQL:

- `docker/init-db/create-service-databases.sql` crea `agua_orders`, `agua_entregas` y `agua_products` si no existen.
- `products-seed` carga automáticamente `docker/init-db/seed-products-mock.sql` en `agua_products`.
- Varios Dockerfiles ejecutan `prisma generate` y `prisma db push` al iniciar en el entorno de desarrollo local.

## Documentación de la API: Scalar y OpenAPI

El gateway ofrece documentación actualizada generada a partir de su registro de acciones.

| Recurso | URL |
| --- | --- |
| Scalar UI | `http://localhost:3000/api/docs` |
| OpenAPI JSON | `http://localhost:3000/api/openapi.json` |
| Redirección a la documentación | `http://localhost:3000/api/` -> `/api/docs` |

Convención pública del gateway:

```txt
{METHOD} /api/v1/{service}/{action}
Authorization: Bearer <jwt>
```

Scalar está configurado con `persistAuth` y el esquema de seguridad preferido `bearerAuth`.

## Pruebas y compilación

Comandos de compilación disponibles:

```bash
pnpm build:contracts
pnpm --filter @agua/gateway build
pnpm --filter @agua/usuario-service build
pnpm --filter @agua/products-service build
pnpm --filter @agua/orders-service build
pnpm --filter @agua/entregas-service build
pnpm --filter @agua/notifications-service build
```

Pruebas disponibles:

```bash
pnpm --filter @agua/gateway test
pnpm --filter @agua/usuario-service test
pnpm --filter @agua/products-service test
pnpm --filter @agua/orders-service test
pnpm --filter @agua/entregas-service test
pnpm --filter @agua/notifications-service test
```

Cobertura de pruebas configurada explícitamente en products-service:

```bash
pnpm --filter @agua/products-service test:cov
```

## Estructura del espacio de trabajo

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
│   └── init-db/                # SQL para inicialización y datos de prueba locales
├── contratosDTOs/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── SPEC.md
├── AGENTS.md
└── readme.md
```

Espacios de trabajo registrados:

```yaml
packages:
  - "packages/*"
  - "MicroServices/*"
```

## Solución de problemas operativos

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| `POSTGRES_PASSWORD must be set in .env` o `*_DATABASE_URL must be set in .env` | Docker Compose exige variables explícitas para evitar secretos incorporados en la configuración. | Copie `.env.example` a `.env` y reemplace todos los valores de ejemplo `<...>`. |
| Prisma falla en Alpine por OpenSSL | Prisma necesita las bibliotecas de OpenSSL. | Los Dockerfiles de los servicios con PostgreSQL ya instalan `openssl`; revise la imagen si cambia la base. |
| El gateway inicia, pero un servicio de dominio no responde | El servicio TCP interno no inició o su dirección o puerto están mal configurados. | Revise `docker compose ps` y `docker compose logs -f <servicio>`. |
| Los cambios en el esquema no aparecen | El cliente de Prisma está desactualizado o los cambios no se aplicaron a la base de datos. | Ejecute `prisma:generate` y `prisma:push` o `prisma:migrate`, según el servicio. |

Comandos útiles:

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

- No envíe `userId` en el cuerpo de la solicitud; se obtiene del JWT.
- `userId` representa `AUTH_USER.id`, obtenido del campo `sub` del JWT.
- `role` representa `AUTH_USER.role`, obtenido del JWT.
- `clienteId` y `vendedorId` son identificadores de perfiles de dominio, no identificadores de autenticación del JWT.
- `actorUserId` es el `AUTH_USER.id` del actor para fines de auditoría.
- Use enumeraciones tipadas para los estados; evite cadenas de texto literales.
- Utilice fechas en formato ISO 8601.
- Los eventos deben incluir un campo discriminante `type` y una base compatible con `BaseEvent`.
- Use `ValidationPipe` de NestJS con `whitelist: true` y `forbidNonWhitelisted: true`.
- Use guards para la autenticación y los roles; no valide el JWT en los controladores.
- No use `console.log` en producción; utilice `Logger` de NestJS.
- No modele relaciones de Prisma ni claves foráneas entre bases de datos de distintos microservicios.

## Flujo de contribución

- Trabaje en ramas de funcionalidad o corrección; no integre cambios en `develop` ni en `main` sin una orden explícita.
- Mantenga los cambios pequeños y fáciles de revisar.
- Utilice commits convencionales solo cuando se solicite realizar un commit: `feat(scope): mensaje`, `fix(scope): mensaje`, `refactor(scope): mensaje`.
- Incluya pruebas unitarias para la lógica de negocio y pruebas de integración para los endpoints cuando corresponda.
- Antes de abrir una solicitud de cambios, compruebe la compilación y las pruebas del paquete modificado, así como los contratos si cambia DTO o eventos.
- Mantenga este README alineado con los archivos reales; no documente servicios, comandos ni rutas que no existan.

## Limpieza documental aplicada

- `README.MD` fue reemplazado por `readme.md` en minúsculas.
- `api-reference.html` fue eliminado porque la documentación actualizada del backend se publica desde el gateway mediante Scalar y OpenAPI.
- `frontend.me` no existe en esta rama; por lo tanto, no había ningún archivo con ese nombre para eliminar.
