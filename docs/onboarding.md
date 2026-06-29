# AguaFress — Onboarding

## ¿Qué es AguaFress?

Plataforma de pedidos para distribuidores de agua y soda. Sistema multi-tenant con vendedores, clientes, y super-admins. Arquitectura de microservicios con NestJS.

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 22, TypeScript |
| Framework | NestJS |
| ORM | Prisma |
| DB | PostgreSQL 15 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh) |
| API Docs | Swagger (`/api/docs`) |
| Monorepo | pnpm workspaces |

## Estructura del proyecto

```
aguaFress/
├── MicroServices/           # Microservicios
│   └── usuario-service/     # Auth, usuarios, vendedores, clientes, super-admins
│       ├── prisma/          # Schema unificado (17 tablas)
│       └── src/
│           ├── auth/        # Login, register, JWT guards
│           ├── vendedores/  # CRUD vendedores (admin + perfil propio)
│           ├── clientes/    # CRUD clientes (admin + vendedor)
│           └── super-admin/ # Perfil SUPER_ADMIN + dashboard stats
├── packages/                # Paquetes compartidos
│   └── contracts/           # DTOs, eventos, tipos compartidos entre MS
├── docs/                    # Documentación
├── openspec/                # SDD artifacts (specs, design, tasks, archive)
└── docker-compose.yml       # Infraestructura local
```

## Primeros pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Build contratos compartidos (necesario antes que los MS)
pnpm run build:contracts

# 3. Copiar env vars
cp .env.example .env

# 4. Levantar infraestructura (PostgreSQL + Redis + servicios)
docker compose up -d

# 5. Correr migrations
pnpm --filter @agua/usuario-service exec prisma db push

# 6. Probar que anda
curl http://localhost:3001/api/health
```

## Endpoints

Una vez levantado, la API docs están en:

```
http://localhost:3001/api/docs
```

### Auth

| Method | Path | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register/vendedor` | Registrar vendedor |
| POST | `/api/auth/register/cliente` | Registrar cliente |
| POST | `/api/auth/login` | Login (email + password) |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/validate` | Validar token |

### Vendedores

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/vendedores/admin` | Listar vendedores (admin) |
| GET | `/api/vendedores/profile` | Perfil propio |
| PATCH | `/api/vendedores/profile` | Actualizar perfil propio |

### Clientes

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/clientes/admin` | Listar clientes (admin) |
| GET | `/api/clientes/vendedor` | Listar clientes del vendedor |
| GET | `/api/clientes/admin/:id` | Cliente por ID (admin) |
| GET | `/api/clientes/vendedor/:id` | Cliente por ID (vendedor) |
| POST | `/api/clientes/admin` | Crear cliente (admin) |
| POST | `/api/clientes/vendedor` | Crear cliente (vendedor) |
| PATCH | `/api/clientes/admin/:id` | Actualizar cliente (admin) |
| PATCH | `/api/clientes/vendedor/:id` | Actualizar cliente (vendedor) |

### Super Admin

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/api/super-admin/profile` | Perfil SUPER_ADMIN |
| PATCH | `/api/super-admin/profile` | Actualizar perfil |
| GET | `/api/super-admin/dashboard` | Estadísticas del dashboard |

## Roles y permisos

| Role | Acceso |
|------|--------|
| `SUPER_ADMIN` | Todo |
| `VENDEDOR` | Su perfil, sus clientes |
| `CLIENTE` | Su perfil (próximamente) |

Los roles se verifican via `RolesGuard` que lee el `role` del JWT.

## Conexiones

```env
# DB
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua"

# Redis
REDIS_URL="redis://localhost:6379"

# Puerto
PORT=3001
```

## Tests

```bash
# Todos los tests del usuario-service
pnpm --filter @agua/usuario-service test

# En modo watch
pnpm --filter @agua/usuario-service test:watch
```

## SDD (Spec-Driven Development)

Usamos SDD para cambios significativos. Los artifacts viven en:

- `openspec/specs/` — Especificaciones promovidas (source of truth)
- `openspec/changes/archive/` — Cambios completados

Flujo: `explore → proposal → specs → design → tasks → apply (TDD) → verify → archive`

## Skill Registry

Skills disponibles para el agente Gentle AI, indexadas en `.atl/skill-registry.md` (local):

| Skill | Trigger |
|-------|---------|
| `dont-be-stupid` | Antes de implementar — check SOLID + STUPID |
| `judgment-day` | Revisión adversarial |
| `code-review-expert` | Code review con checklist de seguridad y calidad |

## Reglas importantes

- **No mergear a `develop` sin orden explícita**
- Usar **conventional commits**: `feat(scope): msg`, `fix(scope): msg`
- Strict **TDD**: tests primero, código después
- IDs consistentes: `userId`, `orderId`, `vendedorId`, `clienteId`
- Fechas en **ISO 8601**
- Estados con **enums**, no strings
