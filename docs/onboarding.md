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
| Cache | Redis 7 |
| Auth | JWT (access + refresh, con rotación) |
| Monorepo | pnpm workspaces |

## Estructura del proyecto

```
aguaFress/
├── MicroServices/             # Microservicios
│   └── usuario-service/       # Auth, usuarios, vendedores, clientes, super-admins
│       ├── prisma/            # Schema unificado (7 tablas + futuras)
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

# 5. Sincronizar schema a la DB
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua" \
  pnpm --filter @agua/usuario-service exec prisma db push

# 6. Build y levantar servicio
pnpm --filter @agua/usuario-service build
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua" \
  JWT_SECRET="..." JWT_REFRESH_SECRET="..." \
  PORT=3001 node MicroServices/usuario-service/dist/main.js

# 7. Probar health
curl http://localhost:3001/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"..."}'
```

## Endpoints — usuario-service

Todas las rutas bajo `/api`. Autenticación via `Authorization: Bearer <token>`.

### Auth (público)

| Method | Path | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar cliente (requiere qrToken) |
| POST | `/api/auth/register/vendedor` | Autoregistro vendedor (queda pendiente) |
| POST | `/api/auth/login` | Login (email + password) → JWT |
| POST | `/api/auth/refresh` | Rotar refresh token |
| POST | `/api/auth/validate` | Validar token activo |
| POST | `/api/auth/logout` | Cerrar sesión (invalida refresh token) |

### Vendedores (vendedor propio + admin)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/vendedores/me` | VENDEDOR | Perfil propio |
| PATCH | `/api/vendedores/me` | VENDEDOR | Actualizar perfil propio |
| GET | `/api/vendedores` | SUPER_ADMIN | Listar vendedores |
| GET | `/api/vendedores/:id` | SUPER_ADMIN | Ver vendedor |
| PATCH | `/api/vendedores/:id` | SUPER_ADMIN | Actualizar vendedor |
| PATCH | `/api/vendedores/:id/estado` | SUPER_ADMIN | Cambiar estado |

### Clientes (vendedor + admin)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/clientes/mios` | VENDEDOR | Mis clientes (cartera) |
| GET | `/api/clientes/mios/:id` | VENDEDOR | Detalle cliente propio |
| PATCH | `/api/clientes/mios/:id` | VENDEDOR | Actualizar cliente propio |
| GET | `/api/clientes` | SUPER_ADMIN | Listar todos |
| GET | `/api/clientes/:id` | SUPER_ADMIN | Ver cliente |
| PATCH | `/api/clientes/:id` | SUPER_ADMIN | Actualizar cliente |
| PATCH | `/api/clientes/:id/reassign` | SUPER_ADMIN | Reasignar vendedor |

### QR Codes (vendedor)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/qr-codes` | VENDEDOR | Generar QR de invitación |
| GET | `/api/qr-codes` | VENDEDOR | Listar QR propios |
| PATCH | `/api/qr-codes/:id/deactivate` | VENDEDOR | Desactivar QR |

### Link Invitación (vendedor)

| Method | Path | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/link-invitacion` | VENDEDOR | Generar link de invitación |
| GET | `/api/link-invitacion` | VENDEDOR | Listar links propios |
| PATCH | `/api/link-invitacion/:id/deactivate` | VENDEDOR | Desactivar link |

### Super Admin

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/super-admin/me` | Perfil SUPER_ADMIN |
| PATCH | `/api/super-admin/me` | Actualizar perfil |
| GET | `/api/super-admin/dashboard` | Dashboard stats (vendedores, clientes, actividad) |

### Users (perfil unificado)

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/users/profile` | Perfil completo del usuario logueado (incluye profile según rol) |
| PATCH | `/api/users/profile` | Actualizar perfil |

### Admin: Audit Logs

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/admin/audit-logs` | Listar logs de auditoría |

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

# JWT
JWT_SECRET="auth-dev-secret-min-32-chars-long!!"
JWT_REFRESH_SECRET="auth-dev-refresh-secret-min-32!!"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"

# Puerto
PORT=3001
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
