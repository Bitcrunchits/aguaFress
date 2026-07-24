# AguaFress — Onboarding

## ¿Qué es AguaFress?

Plataforma de pedidos para distribuidores de agua y soda. Sistema multi-tenant con vendedores, clientes, y super-admins. Arquitectura de microservicios con NestJS.

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 22, TypeScript 5 |
| Framework | NestJS 10 |
| ORM | Prisma 5 |
| DB | PostgreSQL 15 |
| Cache/colas | Redis 7 + BullMQ para comandos async críticos |
| Auth | JWT (access + refresh, con rotación) |
| Monorepo | pnpm workspaces |

## Estructura del proyecto

```
aguaFress/
├── MicroServices/             # Microservicios
│   ├── gateway/               # Única entrada HTTP pública (puerto 3000)
│   └── usuario-service/       # Auth, usuarios, vendedores, clientes, super-admins
│       ├── prisma/            # Schema propio del usuario-service
│       └── src/
│           ├── auth/          # Login, register, JWT guards, refresh rotation
│           ├── vendedores/    # CRUD vendedores (admin + perfil propio)
│           ├── clientes/      # CRUD clientes (admin + vendedor)
│           ├── super-admin/   # Perfil SUPER_ADMIN + dashboard stats
│           ├── qr-codes/      # QR de invitación (vendedor + admin)
│           ├── link-invitacion/ # Links de invitación (vendedor + admin)
│           ├── audit-log/     # Trazabilidad de acciones
│           └── users/         # Perfil unificado del usuario logueado
├── packages/                  # Paquetes compartidos
│   └── contracts/             # DTOs, eventos, tipos compartidos entre MS
├── docs/                      # Documentación
└── docker-compose.yml         # Infraestructura local
```

## Primeros pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Build contratos compartidos (necesario antes que los MS)
pnpm run build:contracts

# 3. Copiar env vars
cp .env.example .env

# 4. Levantar infraestructura (PostgreSQL + Redis)
docker compose up -d

# 5. Sincronizar el schema propio del usuario-service a su DB
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua" \
  pnpm --filter @agua/usuario-service exec prisma db push

# 6. Build y levantar usuario-service como TCP interno
pnpm --filter @agua/usuario-service build
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua" \
  JWT_SECRET="..." JWT_REFRESH_SECRET="..." \
  TCP_PORT=3011 node MicroServices/usuario-service/dist/main.js

# 7. Levantar gateway y probar por la única entrada HTTP pública
pnpm --filter @agua/gateway build
PORT=3000 USUARIO_SERVICE_HOST=localhost USUARIO_SERVICE_TCP_PORT=3011 \
  node MicroServices/gateway/dist/main.js

curl http://localhost:3000/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"..."}'
```

## API pública — Gateway

El gateway es la única entrada HTTP pública. Los microservicios de dominio no exponen endpoints HTTP; reciben comandos TCP internos desde el gateway o jobs BullMQ cuando el comando debe sobrevivir a la caída temporal del microservicio.

Patrón canónico: `/{method} /api/v1/{service}/{action}`. Autenticación via `Authorization: Bearer <token>` cuando la acción no sea pública.

### Resiliencia de microservicios

| Camino | Uso | Falla esperada |
|--------|-----|----------------|
| TCP síncrono | Login, perfil, validaciones, lecturas simples y acciones inmediatas. | Error controlado, `503` o timeout. No se encola. |
| Redis + BullMQ async | Operaciones críticas que no deben perder datos y pueden esperar segundos. Piloto: creación de órdenes. | El job queda en Redis y el worker lo procesa cuando el MS vuelve. |

No se usa Kafka para este problema. La decisión vigente es Redis + BullMQ para durabilidad operacional, retries, backoff, failed jobs/DLQ, idempotency keys y tracking de jobs.

### Auth (público)

| Method | Path | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Registrar cliente o vendedor según payload |
| POST | `/api/v1/auth/login` | Login (email + password) → JWT |
| POST | `/api/v1/auth/refresh` | Rotar refresh token |
| POST | `/api/v1/auth/validate` | Validar token activo |
| POST | `/api/v1/auth/logout` | Cerrar sesión (invalida refresh token) |

### Vendedores (vendedor propio + admin)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/v1/vendedores/profile` | VENDEDOR | Perfil propio |
| PATCH | `/api/v1/vendedores/profile/update` | VENDEDOR | Actualizar perfil propio |
| GET | `/api/v1/vendedores/list` | SUPER_ADMIN | Listar vendedores |
| GET | `/api/v1/vendedores/get-by-id?id={uuid}` | SUPER_ADMIN | Ver vendedor |
| PATCH | `/api/v1/vendedores/update?id={uuid}` | SUPER_ADMIN | Actualizar vendedor |
| PATCH | `/api/v1/vendedores/change-estado?id={uuid}` | SUPER_ADMIN | Cambiar estado |

### Clientes (vendedor + admin)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/v1/clientes/cartera` | VENDEDOR | Mis clientes (cartera) |
| GET | `/api/v1/clientes/own/get-by-id?id={uuid}` | VENDEDOR | Detalle cliente propio |
| PATCH | `/api/v1/clientes/own/update?id={uuid}` | VENDEDOR | Actualizar cliente propio |
| GET | `/api/v1/clientes/list` | SUPER_ADMIN | Listar todos |
| GET | `/api/v1/clientes/get-by-id?id={uuid}` | SUPER_ADMIN | Ver cliente |
| PATCH | `/api/v1/clientes/update?id={uuid}` | SUPER_ADMIN | Actualizar cliente |
| PATCH | `/api/v1/clientes/reassign?id={uuid}` | SUPER_ADMIN | Reasignar vendedor |

### QR Codes (vendedor)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/qr/vendor/create` | VENDEDOR | Generar QR de invitación |
| GET | `/api/v1/qr/vendor/list` | VENDEDOR | Listar QR propios |
| PATCH | `/api/v1/qr/vendor/deactivate?id={uuid}` | VENDEDOR | Desactivar QR |

### Link Invitación (vendedor)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/v1/link-invitacion/vendor/create` | VENDEDOR | Generar link de invitación |
| GET | `/api/v1/link-invitacion/vendor/list` | VENDEDOR | Listar links propios |
| PATCH | `/api/v1/link-invitacion/vendor/deactivate?id={uuid}` | VENDEDOR | Desactivar link |

### Super Admin

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/v1/super-admin/profile` | Perfil SUPER_ADMIN |
| PATCH | `/api/v1/super-admin/profile/update` | Actualizar perfil |
| GET | `/api/v1/super-admin/dashboard` | Dashboard stats (vendedores, clientes, actividad) |

### Users (perfil unificado)

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/v1/users/profile` | Perfil completo del usuario logueado (incluye profile según rol) |
| PATCH | `/api/v1/users/profile/update` | Actualizar perfil |

### Admin: Audit Logs

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/v1/super-admin/audit-log` | Listar logs de auditoría |

## Roles y permisos

| Role | Acceso |
|------|--------|
| `SUPER_ADMIN` | Todo: CRUD vendedores, clientes, ver audit logs, dashboard |
| `VENDEDOR` | Su perfil, sus clientes (cartera), QR codes, links |
| `CLIENTE` | Su perfil (próximamente: catálogo, pedidos) |

Los roles se verifican via `RolesGuard` que lee el `role` del JWT.  
Vendedor usa `VendedorGuard` que verifica que el usuario autenticado sea vendedor activo.

## Variables de entorno

```env
# DB
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua"

# Redis
REDIS_URL="redis://localhost:6379"

# BullMQ / jobs async críticos
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="auth-dev-secret-min-32-chars-long!!"
JWT_REFRESH_SECRET="auth-dev-refresh-secret-min-32!!"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"

# Gateway HTTP público
PORT=3000

# usuario-service TCP interno
TCP_PORT=3011
```

## Tests

```bash
# Unit + integration tests
pnpm --filter @agua/usuario-service test

# E2E manual (Postman-style, creado durante desarrollo)
bash /tmp/api-test.sh
```

## Features implementadas

- ✅ Registro y login con JWT (access + refresh)
- ✅ Rotación de refresh tokens con `jti` (JWT ID) — previene race conditions
- ✅ Super Admin: dashboard, CRUD vendedores, cambio de estado
- ✅ Vendedor: perfil propio, QR codes, links de invitación
- ✅ Cliente: registro via QR/link, cartera del vendedor
- ✅ Aislamiento de cartera por vendedor
- ✅ Auditoría de acciones (AUDIT_LOG)
- ✅ Validación SOLID + Clean Code (SRP, interfaces segregadas)

## Reglas importantes

- **No mergear a `develop` sin orden explícita**
- Usar **conventional commits**: `feat(scope): msg`, `fix(scope): msg`
- IDs consistentes: `userId`, `orderId`, `vendedorId`, `clienteId`
- Fechas en **ISO 8601**
- Estados con **enums**, no strings
- Endpoints protegidos con guards (`JwtAuthGuard` global, `RolesGuard`, `VendedorGuard`)
- Cada microservicio mantiene su propia DB y Prisma schema; referencias a entidades de otro MS son UUID escalares lógicos
- Gateway no es dueño de datos de negocio; para async valida/enruta/encola y responde `202 Accepted` con `jobId`/`trackingId`
- `orders-service` es el piloto de BullMQ y mantiene la persistencia final de pedidos y estados de jobs
