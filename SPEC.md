# AguaFress - Specification Document

**Versión:** 1.2
**Fecha:** Junio 2026
**Estado:** En Desarrollo
**Proyecto:** AguaFress - Plataforma de Pedidos y Gestión para Distribuidores de Agua y Soda
**Equipo:** AguaFress Development (5 personas)
**Carrera:** Desarrollo Full Stack

> ⚠️ **ATENCIÓN — ARQUITECTURA DE RESILIENCIA VIGENTE**
> La comunicación usa dos caminos: **TCP sincrónico** para login, perfil, validaciones y lecturas simples; **Redis + BullMQ asíncrono** para comandos críticos que no deben perderse y pueden esperar segundos.
> **Kafka NO se usa para este problema.** El piloto async aplica primero a `orders-service` + `gateway` + contratos compartidos.
> El gateway valida/auth/rutea/encola y responde `202 Accepted` con `jobId`/`trackingId`; `orders-service` mantiene la persistencia final y los workers.

> ⚠️ **Este SPEC refleja la arquitectura V1.0 MVP actual.**  
> Todo el código nuevo debe cumplir **SOLID + Clean Code** (ver sección 9).

> ✅ **Gateway como única entrada HTTP**
> El gateway (`localhost:3000`) es el ÚNICO punto de entrada HTTP. Los microservicios de dominio NO exponen endpoints HTTP públicos: reciben comandos por TCP interno.
> 
> **Documentación de APIs**: el gateway genera un spec OpenAPI 3.0 vivo desde su action registry y lo sirve con **Scalar** (UI moderna con cliente API integrado) en `http://localhost:3000/api/docs`.
> 
> El gateway se define como fachada HTTP versionada para el frontend en `GET|POST|PATCH|DELETE /api/v1/{service}/{action}` y despacha hacia los microservicios exclusivamente por **TCP action routing** mediante mappings explícitos/message patterns.

---

## 1. Visión del Proyecto

### 1.1 Descripción General

AguaFress es una plataforma marketplace web que conecta directamente vendedores y consumidores de agua/soda en Argentina, reemplzando el modelo tradicional de visitas semanales fijas por un sistema de pedidos digitales con confirmación de visita.

### 1.2 Problema que Resuelve

| Stakeholder | Problema Actual | Solución AguaFress |
|-------------|---------------|-----------------|
| **Vendedor** | Uso ineficiente de combustible en visitas sin venta | Pedidos confirmados antes de salir |
| **Vendedor** | No sabe si el cliente necesita producto | Cliente pide cuando necesita |
| **Vendedor** | Visitas fuera del día de ruta | Pedidos en cualquier momento |
| **Consumidor** | Debe esperar visita programada | Pedido on-demand |
| **Consumidor** | No puede comprar cuando se queda sin producto | Auto-servicio 24/7 |

### 1.3 Diferencial Competitivo

- ✅ **Pedido directo del consumidor** - Ninguna app en Argentina lo permite
- ✅ **Confirmación de visita** - Evita viajes improductivos
- ✅ **Pedidos fuera del día de ruta** - Flexibilidad total
- ✅ **Ruta inteligente con GPS** - Integración Google Maps/Waze
- ✅ **Valoraciones y favoritos** - Experiencia e-commerce
- ✅ **Marketplace bidireccional** - Une ambas partes activamente

---

## 2. Alcance del Proyecto

### 2.1 Versión 1.0 (MVP Web) - Alcance Definido

| Incluido | Excluido |
|---------|----------|
| Registro/Login email + JWT | Registro de empresas con CUIT (V2.0) |
| Perfil consumidor (datos básicos) | Chat en tiempo real (V2.0) |
| Catálogo productos con fotos | AI y comandos por voz (V2.0) |
| Carrito de compras (expira 24hs) | React Native (V2.0) |
| Pedidos (solo contra entrega) | Google OAuth (V2.0) |
| Confirmación de visitas | Pago anticipado (V2.0) |
| Dashboard vendedor | Analytics / Reportes (V2.0) |
| QR / Link de invitación | Favoritos y valoraciones (V2.0) |
| Facturas B y C | Mapa con GPS (V2.0) |
| Activity Logs (MongoDB) | Payment Service (V2.0) |
| Entrega Service (puerto 3005) | Chat Service (V2.0) |

### 2.2 Versión 2.0 (Futuro) - Planeado

- App Móvil React Native
- Registro de empresas
- Pago obligatorio anticipado
- Chat en tiempo real
- Módulos de Inteligencia Artificial

---

## 3. Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| Backend | Node.js 22 + NestJS 10 + TypeScript 5 |
| ORM | Prisma 5 (todos los servicios PostgreSQL) |
| PostgreSQL 15 | usuario, products, orders, entregas |
| MongoDB 6 | notifications (activity logs) |
| Redis 7 | Caché y colas BullMQ para comandos async críticos |
| Monorepo | pnpm workspaces (sin Nx/Turborepo) |
| Docker | Docker por microservicio + Compose local para desarrollo |
| API Docs | OpenAPI 3.0 generado por gateway + Scalar (`/api/docs`) |
| Comunicación | Contratos compartidos vía `packages/contracts/` |
| Contratos | `packages/contracts/` (DTOs TypeScript + enums) |
| Frontend | Por definir (React + Next.js) |
| MCP | servidor Jira (`mcp/jira-mcp-server`) |

---

## 4. Arquitectura del Sistema

### 4.1 Microservicios

```
aguaFress/
├── MicroServices/
│   ├── usuario-service/     # NestJS - TCP 3011 - PostgreSQL propio (sin HTTP público)
│   ├── products-service/    # NestJS - TCP interno - PostgreSQL propio (stub)
│   ├── orders-service/      # NestJS - TCP interno + workers BullMQ - PostgreSQL propio (stub)
│   ├── entregas-service/    # NestJS - TCP interno - PostgreSQL propio (stub)
│   ├── notifications-service/ # NestJS - TCP/eventos internos - MongoDB propio (stub)
│   └── gateway/             # NestJS - HTTP 3000 - Única entrada HTTP
├── packages/
│   └── contracts/           # @agua/contracts - DTOs, enums, eventos
├── docker-compose.yml       # Compose local de desarrollo
├── pnpm-workspace.yaml
├── SPEC.md
├── AGENTS.md                # Reglas de code review
└── README.MD
```

### 4.2 Puertos

| Componente | Puerto | Protocolo | Propósito |
|------------|--------|-----------|-----------|
| API Gateway | **3000** | HTTP | Única entrada — frontend apunta acá |
| usuario-service | **3011** | TCP | Solo red Docker interna (no expuesto) |
| PostgreSQL | 5433 | TCP | Datos transaccionales |
| Redis | 6379 | TCP | Caché y colas BullMQ |
| Mailhog | 1025/8025 | TCP | Email test (desarrollo) |

### 4.3 Comunicación Entre Servicios

- **TCP**: Comunicación sincrónica interna entre gateway y microservicios para login, perfil, validaciones, lecturas simples y respuestas inmediatas
- **Redis + BullMQ**: Comandos críticos asíncronos que no deben perderse, con retries, backoff, failed jobs/DLQ, idempotency keys y tracking
- **Kafka**: No se usa para la resiliencia actual

> Decisión vigente: no encolar operaciones TCP simples. Si un MS síncrono está caído, devolver error controlado, `503` o timeout. Encolar solo comandos críticos que puedan esperar segundos.

### 4.4 API Gateway — Fuente de Verdad AG-90 / AG-100 / AG-101

El `api-gateway` es el único ingreso HTTP público en el puerto `3000`. Su contrato público versionado es:

```txt
/api/v1/{service}/{action}
```

Ejemplo canónico:

```txt
POST /api/v1/auth/login
```

#### Decisiones obligatorias

| Tema | Decisión |
|------|----------|
| Fuente Jira | `AG-90` crea el gateway; `AG-101` define ruteo TCP versionado; `AG-100` define seguridad anti-abuso/anti-DDoS mínima. |
| Frontera externa | Frontend → Gateway usa HTTP/JSON versionado bajo `/api/v1/{service}/{action}`. |
| Frontera interna | Gateway → Microservicios usa TCP para operaciones inmediatas y BullMQ para comandos async críticos; no HTTP entre gateway y microservicios. |
| Contrato público | Las acciones públicas viven bajo `/api/v1/{service}/{action}`. |
| Ruteo interno | El gateway traduce `{service, action}` a mappings TCP explícitos/message patterns o jobs BullMQ explícitos según criticidad. |
| Proxy HTTP crudo | Prohibido como arquitectura base. El gateway **NO** preserva rutas downstream arbitrarias `/api/*`. |
| Rutas legacy | `/auth/*`, `/api/auth/*` y proxy genérico `/api/*` no son rutas canónicas del gateway. |
| Contratos | `contratosDTOs/api-gateway.json` debe alinearse con `/api/v1/{service}/{action}`. |

#### Seguridad mínima del gateway

El gateway debe aplicar controles anti-abuso en la capa HTTP que recibe del frontend antes de despachar cualquier comando TCP a microservicios:

- headers de seguridad tipo `helmet`;
- throttling/rate limiting por acción sensible;
- límites de tamaño de payload/body;
- timeouts para llamadas TCP downstream;
- rechazo controlado sin crear trabajo downstream ilimitado.

Acciones sensibles con política más estricta:

- `auth.login`
- `auth.register`
- `auth.refresh`
- `auth.validate`
- creación de QR
- creación de link de invitación

#### Autenticación y autorización

- Las acciones públicas solo pueden omitir auth si están declaradas explícitamente como públicas.
- Las acciones protegidas deben validar JWT y roles antes del dispatch TCP.
- La validación HTTP ocurre en el gateway; los microservicios reciben comandos TCP ya normalizados con contexto de identidad cuando corresponde.
- El payload JWT debe ser compatible con:

```typescript
{ sub: string; email: string; role: UserRole; jti?: string }
```

#### Health

El gateway debe exponer `GET /api/health` como endpoint público y seguro. Puede incluir readiness sanitizada de servicios, pero nunca secretos, tokens, credenciales ni connection strings.

#### Documentación de APIs

El gateway genera un spec **OpenAPI 3.0 vivo** desde su action registry. Esto significa que cada endpoint registrado aparece automáticamente en la documentación.

| Recurso | URL | Descripción |
|---------|-----|-------------|
| Scalar UI | `http://localhost:3000/api/docs` | Documentación interactiva con "Try it" |
| OpenAPI raw | `http://localhost:3000/api/openapi.json` | Spec JSON para importar en Insomnia/Postman |

**Patrón de URLs**: `{METHOD} /api/v1/{service}/{action}?{params}`

| Elemento | Ejemplo |
|----------|---------|
| Servicios | `auth`, `users`, `vendedores`, `clientes`, `super-admin`, `qr`, `link-invitacion` |
| Acciones | `login`, `register`, `list`, `profile`, `get-by-id`, `update`, `change-estado` |
| IDs en query | `?id=uuid` para recursos por ID |
| Paginación | `?page=1&limit=20` para listas |
| Auth | Header `Authorization: Bearer <jwt>` |

**DTOs**: Todas las interfaces de request/response están en `@agua/contracts` (`packages/contracts/src/dto/`).

#### Documento de detalle

La especificación de detalle para implementación y validación vive en:

```txt
openspec/changes/api-gateway/specs/api-gateway/spec.md
```

---

## 5. Estado Actual del Código

### 5.1 usuario-service ✅ (el único con código real)

**Implementado**:
- AuthModule completo: register (vendedor/cliente), login, JWT, refresh, validate
- VendedoresModule: CRUD admin + perfil propio, guards por rol
- ClientesModule: CRUD admin + por vendedor, cartera, direcciones
- SuperAdminModule: perfil + dashboard stats, 251 tests
- `main.ts` con NestJS microservice TCP puro (sin HTTP)
- `PrismaService` (CommonModule @Global) con conexión Prisma
- `prisma/schema.prisma` propio del usuario-service: tablas de auth/usuarios y enums del servicio (ver sección 6)
- `tsconfig.json` con path alias `@agua/contracts`
- Variables de entorno en `.env` + `.env.example` documentado
- Dockerfile multi-stage con `node:22-alpine`
- Dockerfile propio y compose local con postgres:15-alpine + redis:7-alpine

### 5.2 gateway ✅ (completo para usuario-service)

- **Routing dinámico**: `/{method} /api/v1/{service}/{action}` → traduce a TCP message patterns via `GuardedActionRegistry`
- **36 acciones registradas**: auth, users, vendedores, clientes, super-admin, qr, link-invitacion
- **Seguridad**: JwtAuthGuard global con excepciones por action, RolesGuard dinámico desde registry, rate limiting, payload limits, timeouts TCP, helmet
- **Documentación de APIs**: Scalar UI en `/api/docs` con spec OpenAPI 3.0 generado desde el action registry
- **Comunicación**: Gateway → Microservicios únicamente por TCP. Sin endpoints HTTP públicos en servicios de dominio.
- **Pendiente**: Conectar products-service, orders-service, entregas-service, notifications-service cuando estén implementados

### 5.3 products-service, orders-service, entregas-service, notifications-service (stubs)

- Todos tienen `node_modules/`, `package.json`, `src/`, `test/`
- Deben tener `prisma/schema.prisma` propio cuando se implementen sus tablas
- Sin controllers ni servicios reales
- Solo módulos scaffold: `common.module.ts` + módulo específico vacío

### 5.4 packages/contracts ✅ (completo y funcional)

- `index.ts`, `enums.ts`, `events.ts`
- DTOs: `auth.dto.ts`, `user.dto.ts`, `products.dto.ts`, `orders.dto.ts`, `deliveries.dto.ts`, `notifications.dto.ts`, `super-admin.dto.ts`, `common.dto.ts`
- Compilable con `pnpm build:contracts`

---

## 6. Modelo de Datos (DB y Prisma por Microservicio)

Cada microservicio es dueño de su propia base de datos, su propio `prisma/schema.prisma` y sus tablas. No existe un schema Prisma unificado entre microservicios.

Los IDs que apuntan a entidades de otro microservicio son referencias lógicas UUID escalares. No se modelan como relaciones Prisma ni foreign keys entre bases de datos.

### Enums

```typescript
UserRole       = super_admin | vendedor | cliente
VendedorEstado = pendiente | activo | inactivo | bloqueado
OrderEstado    = pendiente | confirmado | en_camino | entregado | cancelado | vencido
DeliveryEstado = pendiente | en_camino | entregada
MetodoPago     = contra_entrega
TipoFactura    = B | C
```

### Tablas existentes (usuario-service)

| Tabla | Descripción |
|-------|-------------|
| `AUTH_USER` | Login: email, password (bcrypt), role, is_active, is_verified |
| `VENDEDOR` | Perfil vendedor: datos, estado, qr_token, ciudad_default |
| `CLIENTE` | Perfil cliente: datos + dirección completa + lat/lng + vendedor asignado |
| `SUPER_ADMIN` | Perfil super admin: nombre, apellido |
| `RELACION_CARTERA` | Historial vendedor ↔ cliente (UNIQUE vendedor_id + cliente_id) |
| `QR_CODE` | QR generados por vendedor: codigo UNIQUE, activo, expires_at |
| `LINK_INVITACION` | Links de invitación: token UNIQUE, activo, expires_at |
| `AUDIT_LOG` | Trazabilidad interna: usuario_id, target_id, accion, detalle JSONB, ip |

### Tablas pendientes en schemas propios (otros servicios)

| Servicio | Tablas a crear |
|----------|----------------|
| products-service | `PRODUCT`, `CATEGORY`, `BRAND` |
| orders-service | `CART`, `CART_ITEM`, `ORDER`, `ORDER_ITEM`, `INVOICE` |
| entregas-service | `DELIVERY` |

### Relaciones conceptuales clave

Estas relaciones explican el dominio. Solo las relaciones dentro de la misma base pueden existir como relaciones Prisma/FK; las referencias entre microservicios quedan como UUID escalares.

```
AUTH_USER ──1:1──► VENDEDOR / CLIENTE / SUPER_ADMIN
VENDEDOR ──1:N──► CLIENTE (vendedor_id)
VENDEDOR ──1:N──► QR_CODE / LINK_INVITACION / PRODUCT
CLIENTE ──1:N──► CART / ORDER
PRODUCT ──N:1──► CATEGORY / BRAND
ORDER ──1:N──► ORDER_ITEM
ORDER ──1:1──► INVOICE
ORDER ──1:1──► DELIVERY
```

---

## 7. Eventos y trabajos asíncronos

La resiliencia actual no usa Kafka. Para comandos críticos que no deben perderse se usa Redis + BullMQ, empezando por `orders-service`. Los eventos de dominio siguen siendo contratos conceptuales hasta que cada microservicio implemente su integración.

| Área | Eventos/jobs |
|------|--------------|
| `auth-events` | UserCreated |
| `user-events` | VendedorStatusChanged, CarteraClienteAdded |
| `products-events` | ProductUpdated, ProductDeleted |
| `orders.create` | Job BullMQ de creación de orden con `jobId`, `trackingId`, `idempotencyKey` y estados `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, `DEAD_LETTER` |
| `orders-events` | OrderCreated, OrderStatusChanged |
| `deliveries-events` | DeliveryStarted, DeliveryCompleted, DeliveryStatusChanged |

Todos los eventos extienden `BaseEvent` (garantiza `timestamp` ISO 8601).
Unión global: `AguaFressEvent`.

Pendiente: completar persistencia, worker y consulta `orders.job_status` en `orders-service`; los contratos base de jobs async ya viven en `packages/contracts`.

---

## 8. Próximos Pasos (priorizados)

### Fase 1 - Infraestructura (AHORA)
- [x] Crear `docker-compose.yml` local con PostgreSQL + Redis para desarrollo
- [ ] Crear Docker/DB/Prisma schema propio por cada microservicio al implementar sus tablas
- [ ] Agregar MongoDB al compose (para notifications-service)
- [ ] Configurar init de PostgreSQL

### Fase 2 - usuario-service (implementación)
- [x] AuthModule: register, login, JWT, refresh, validate
- [x] VendedoresModule: CRUD admin + perfil propio
- [x] ClientesModule: CRUD admin + por vendedor
- [x] SuperAdminModule: perfil + dashboard stats
- [ ] QrCodeModule: generación y gestión de QR
- [ ] LinkInvitacionModule: links de invitación
- [ ] AuditLogModule: trazabilidad de acciones

### Fase 3 - Servicios restantes
- [ ] products-service: catálogo, categorías, marcas
- [ ] orders-service: carrito, pedidos, facturas
- [ ] entregas-service: deliveries, estados
- [ ] notifications-service: activity logs (MongoDB)
- [ ] gateway: routing, rate limiting

### Fase 4 - Frontend
- [ ] A definir

---

## 9. Convenciones del Proyecto (OBLIGATORIO)

Ver `AGENTS.md` en la raíz del proyecto para reglas completas de:
- SOLID: SRP, OCP, LSP, ISP, DIP
- Clean Code: sin userId en body, enums tipados, sin dead code, ISO 8601
- NestJS: ValidationPipe, @Global solo necesario, Guards para auth
- Prisma: @@map() en mayúsculas, timestamps, UUID, @relation() nombrado
- Conventional commits: `feat(scope): msg`, `fix(scope): msg`, `refactor(scope): msg`

---

## 10. Configuración de Desarrollo Local

```bash
# Instalar dependencias
pnpm install

# Compilar contratos
pnpm build:contracts

# Copiar env vars
cp .env.example .env

# Levantar infraestructura
docker compose up -d

# Correr migraciones Prisma
pnpm --filter @agua/usuario-service exec prisma db push

# Tests
pnpm --filter @agua/usuario-service test

# Iniciar servicios (cada uno en su terminal)
pnpm --filter @agua/usuario-service dev    # TCP 3011
pnpm --filter @agua/gateway dev             # HTTP 3000

# API docs (Scalar UI)
open http://localhost:3000/api/docs

# OpenAPI spec raw
open http://localhost:3000/api/openapi.json
```

---

**Documento aprobado para desarrollo**
**⚠️ SOLID + Clean Code es obligatorio en todo el código nuevo**

_AguaFress - SPEC.md_  
_Mayo 2026_
