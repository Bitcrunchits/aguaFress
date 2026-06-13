# AguaFress - Specification Document

**Versión:** 1.1  
**Fecha:** Mayo 2026  
**Estado:** Aprobado para Desarrollo  
**Proyecto:** AguaFress - Plataforma de Pedidos y Gestión para Distribuidores de Agua y Soda  
**Equipo:** AguaFress Development (5 personas)  
**Carrera:** Desarrollo Full Stack

> ⚠️ **Este SPEC refleja la arquitectura V1.0 MVP actual.**  
> Todo el código nuevo debe cumplir **SOLID + Clean Code** (ver sección 11).

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
| Backend | Node.js 20 LTS + NestJS 10 + TypeScript 5 |
| ORM | Prisma 5 (todos los servicios PostgreSQL) |
| PostgreSQL 15 | usuario, products, orders, entregas |
| MongoDB 6 | notifications (activity logs) |
| Redis 7 | Streams (eventos) + caché |
| Monorepo | pnpm workspaces (sin Nx/Turborepo) |
| Docker | Compose único con perfiles |
| Comunicación | Redis Streams + HTTP REST (Gateway) |
| Contratos | `packages/contracts/` (DTOs TypeScript + enums) |
| Frontend | Por definir (React + Next.js) |
| MCP | servidor Jira (`mcp/jira-mcp-server`) |

---

## 4. Arquitectura del Sistema

### 4.1 Microservicios

```
aguaFress/
├── MicroServices/
│   ├── usuario-service/     # NestJS - Puerto 3001 - PostgreSQL
│   ├── products-service/    # NestJS - Puerto 3003 - PostgreSQL (stub)
│   ├── orders-service/      # NestJS - Puerto 3004 - PostgreSQL (stub)
│   ├── entregas-service/    # NestJS - Puerto 3005 - PostgreSQL (stub)
│   ├── notifications-service/ # NestJS - Puerto 3006 - MongoDB (stub)
│   └── gateway/             # NestJS - Puerto 3000 (stub)
├── packages/
│   └── contracts/           # @agua/contracts - DTOs, enums, eventos
├── docker-compose.yml       # NO EXISTE - pendiente de crear
├── pnpm-workspace.yaml
├── SPEC.md
├── AGENTS.md                # Reglas de code review
└── README.MD
```

### 4.2 Puertos de Infraestructura

| Componente | Puerto | Propósito |
|------------|--------|-----------|
| PostgreSQL | 5433 | Datos transaccionales (todos los services) |
| MongoDB | 27017 | Activity Logs (notifications-service) |
| Redis | 6379 | Streams de eventos + caché |
| Mailhog | 1025/8025 | Email test (desarrollo) |

### 4.3 Comunicación Entre Servicios

- **Redis Streams**: Único bus de eventos asíncronos
- **Redis**: Cache de sesiones (JWT) y catálogo de productos
- **HTTP REST**: Comunicación síncrona a través del API Gateway

---

## 5. Estado Actual del Código

### 5.1 usuario-service ✅ (el único con código real)

**AuthModule** y **UsersModule**: scaffolds vacíos (solo `@Module({})`)
**Implementado**:
- `main.ts` con NestJS bootstrap + ValidationPipe (whitelist, forbidNonWhitelisted)
- `app.module.ts` importa AuthModule, UsersModule, CommonModule
- `PrismaService` (CommonModule @Global) con conexión Prisma
- `prisma/schema.prisma` completo (ver sección 6)
- `tsconfig.json` con path alias `@agua/contracts`
- Variables de entorno en `.env`: DATABASE_URL, JWT_SECRET, JWT_EXPIRATION, REDIS_URL, PORT

### 5.2 gateway (stub)

- Directorio `src/` con archivos de rutas vacíos
- Sin controllers ni servicios reales

### 5.3 products-service, orders-service, entregas-service, notifications-service (stubs)

- Todos tienen `node_modules/`, `package.json`, `src/`, `test/`
- Sin `prisma/schema.prisma`
- Sin controllers ni servicios reales
- Solo módulos scaffold: `common.module.ts` + módulo específico vacío

### 5.4 packages/contracts ✅ (completo y funcional)

- `index.ts`, `enums.ts`, `events.ts`
- DTOs: `auth.dto.ts`, `user.dto.ts`, `products.dto.ts`, `orders.dto.ts`, `deliveries.dto.ts`, `notifications.dto.ts`, `super-admin.dto.ts`, `common.dto.ts`
- Compilable con `pnpm build:contracts`

---

## 6. Modelo de Datos (PostgreSQL - Una sola DB)

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

### Tablas pendientes (otros servicios)

| Servicio | Tablas a crear |
|----------|----------------|
| products-service | `PRODUCT`, `CATEGORY`, `BRAND` |
| orders-service | `CART`, `CART_ITEM`, `ORDER`, `ORDER_ITEM`, `INVOICE` |
| entregas-service | `DELIVERY` |

### Relaciones clave

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

## 7. Eventos del Sistema (Redis Streams)

| Stream | Eventos |
|--------|---------|
| `auth-stream` | UserCreated |
| `user-stream` | VendedorStatusChanged, CarteraClienteAdded |
| `products-stream` | ProductUpdated, ProductDeleted |
| `orders-stream` | OrderCreated, OrderStatusChanged |
| `deliveries-stream` | DeliveryStarted, DeliveryCompleted, DeliveryStatusChanged |

Todos los eventos extienden `BaseEvent` (garantiza `timestamp` ISO 8601).
Unión global: `AguaFressEvent`.

---

## 8. Próximos Pasos (priorizados)

### Fase 1 - Infraestructura (AHORA)
- [ ] Crear `docker-compose.yml` con PostgreSQL + Redis
- [ ] Unificar schema de Prisma (todas las tablas en usuario-service)
- [ ] Agregar MongoDB al compose (para notifications-service)
- [ ] Configurar init de PostgreSQL

### Fase 2 - usuario-service (implementación)
- [ ] AuthModule: register, login, JWT, refresh, validate
- [ ] UsersModule: perfiles, cartera, QR, links de invitación
- [ ] SuperAdminModule: dashboard, activar/suspender vendedores

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

# Variables de entorno (usuario-service)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua_users?schema=users"
# JWT_SECRET="aguafress-dev-secret-no-usar-en-prod"
# JWT_EXPIRATION="24h"
# REDIS_URL="redis://localhost:6379"
# PORT=3001

# Correr migraciones Prisma
cd MicroServices/usuario-service
npx prisma db push

# Iniciar dev
pnpm --filter @agua/usuario-service dev
```

---

**Documento aprobado para desarrollo**
**⚠️ SOLID + Clean Code es obligatorio en todo el código nuevo**

_AguaFress - SPEC.md_  
_Mayo 2026_
