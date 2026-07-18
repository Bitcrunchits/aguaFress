# Modelo de Datos - AguaFress V1.0 MVP

**Versión:** 1.3  
**Fecha:** Julio 2026  
**Stack:** Node.js 22 LTS + NestJS 10 + TypeScript 5 + Prisma 5 + PostgreSQL 15 + Redis 7  
**Proyecto:** AguaFress - Plataforma de Pedidos y Gestión para Distribuidores de Agua y Soda

> ⚠️ Este documento refleja la arquitectura **V1.0 MVP**.  
> Funcionalidades marcadas como V2.0 NO se implementan en esta versión.  
> Los tipos definitivos están en `packages/contracts/src/` (TypeScript).

> ✅ **Decisión actual de arquitectura**: cada microservicio tiene Docker, base de datos y Prisma schema propios. No existe schema Prisma unificado. El gateway es la única entrada HTTP pública; los microservicios de dominio se comunican por TCP interno. Los IDs hacia entidades de otro microservicio son UUID escalares lógicos, no relaciones Prisma/FK entre DBs.

---

## 1. Servicios del Sistema

| Servicio | Puerto | DB | ORM | Responsabilidad |
|----------|--------|-----|-----|-----------------|
| **gateway** | HTTP 3000 | — | — | Única entrada HTTP pública |
| **usuario-service** (auth + users) | TCP 3011 | PostgreSQL propia | Prisma propio | Login, JWT, roles, perfiles, cartera, QR |
| **products-service** | TCP interno | PostgreSQL propia | Prisma propio | Catálogo, productos, marcas, categorías |
| **orders-service** | TCP interno | PostgreSQL propia | Prisma propio | Carrito, pedidos, facturas |
| **entregas-service** | TCP interno | PostgreSQL propia | Prisma propio | Repartos, estados, asignación |
| **notifications-service** | TCP/eventos internos | MongoDB propia | Mongoose propio | Activity logs (solo consume eventos) |

> Las referencias entre servicios se validan por contrato/aplicación. No se crean foreign keys ni relaciones Prisma entre bases de datos de microservicios distintos.

---

## 2. Entidades por Servicio

### 2.1 usuario-service (TCP 3011 — PostgreSQL propia, Prisma schema propio)

El usuario-service contiene solo sus tablas de auth, perfiles, cartera, QR, links y auditoría interna. Las tablas de products, orders y entregas viven en los schemas propios de sus microservicios cuando se implementan.

Las tablas se separaron por rol siguiendo SRP: `AUTH_USER` solo tiene datos de login,
`VENDEDOR`, `CLIENTE` y `SUPER_ADMIN` tienen los datos específicos de cada perfil.
`AUDIT_LOG` provee trazabilidad interna.

> ℹ️ El esquema del usuario-service está en `MicroServices/usuario-service/prisma/schema.prisma`

#### AUTH_USER
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| id | UUID | ✅ | `uuid()` | PK |
| email | VARCHAR(255) | ✅ | — | Unique |
| password | VARCHAR(255) | ✅ | — | bcrypt hash |
| role | ENUM(UserRole) | ✅ | — | super_admin \| vendedor \| cliente |
| refresh_token_hash | VARCHAR(64) | ❌ | — | null hasta 1er login |
| is_active | BOOLEAN | ✅ | true | |
| is_verified | BOOLEAN | ✅ | false | |
| created_at | TIMESTAMP | ✅ | `now()` | |
| updated_at | TIMESTAMP | ✅ | `@updatedAt` | |

**Relaciones:** 1:1 con VENDEDOR, CLIENTE o SUPER_ADMIN según `role`.

#### VENDEDOR
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| id | UUID | ✅ | `uuid()` | PK |
| auth_user_id | UUID | ✅ | — | FK → AUTH_USER (unique) |
| nombre | VARCHAR(100) | ✅ | — | |
| apellido | VARCHAR(100) | ✅ | `""` | |
| dni | VARCHAR(8) | ✅ | `""` | 8 dígitos |
| cuil | VARCHAR(15) | ❌ | — | Opcional |
| cuit | VARCHAR(15) | ❌ | — | Opcional |
| telefono | VARCHAR(20) | ✅ | `""` | |
| empresa | VARCHAR(255) | ❌ | — | Nombre del emprendimiento |
| logo | VARCHAR(500) | ❌ | — | URL del logo |
| estado | ENUM(VendedorEstado) | ✅ | — | pendiente \| activo \| inactivo \| bloqueado |
| ciudad_default | VARCHAR(100) | ✅ | `""` | Ciudad/localidad principal |
| zona_entrega | VARCHAR(100) | ❌ | — | Zona/sector de entrega |
| qr_token | VARCHAR(50) | ❌ | — | Unique — token activo para QR público |
| created_at | TIMESTAMP | ✅ | `now()` | |
| updated_at | TIMESTAMP | ✅ | `@updatedAt` | |

**Relaciones:**
- `auth_user_id` → AUTH_USER (1:1)
- Tiene N clientes via cartera
- Tiene N QR_CODE y LINK_INVITACION

#### CLIENTE
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| id | UUID | ✅ | `uuid()` | PK |
| auth_user_id | UUID | ✅ | — | FK → AUTH_USER (unique) |
| nombre | VARCHAR(100) | ✅ | — | |
| apellido | VARCHAR(100) | ✅ | `""` | |
| dni | VARCHAR(20) | ✅ | `""` | Documento |
| telefono | VARCHAR(20) | ✅ | `""` | |
| tipo_factura | ENUM(TipoFactura) | ✅ | `B` | A \| B \| C |
| direccion_calle | VARCHAR(200) | ✅ | `""` | Dirección fiscal |
| direccion_numero | VARCHAR(20) | ✅ | `""` | |
| direccion_piso | VARCHAR(20) | ❌ | — | Piso / depto |
| direccion_referencia | VARCHAR(200) | ❌ | — | |
| direccion_barrio | VARCHAR(100) | ❌ | — | |
| direccion_ciudad | VARCHAR(100) | ✅ | `""` | |
| direccion_provincia | VARCHAR(100) | ✅ | `""` | |
| direccion_cp | VARCHAR(20) | ❌ | — | Código postal |
| misma_direccion_entrega | BOOLEAN | ✅ | `true` | Usa la fiscal como de entrega |
| entrega_calle | VARCHAR(200) | ❌ | — | Solo si misma = false |
| entrega_numero | VARCHAR(20) | ❌ | — | |
| entrega_piso | VARCHAR(20) | ❌ | — | |
| entrega_referencia | VARCHAR(200) | ❌ | — | |
| entrega_barrio | VARCHAR(100) | ❌ | — | |
| entrega_ciudad | VARCHAR(100) | ❌ | — | |
| entrega_provincia | VARCHAR(100) | ❌ | — | |
| entrega_cp | VARCHAR(20) | ❌ | — | |
| latitud | DECIMAL(10,7) | ❌ | — | |
| longitud | DECIMAL(10,7) | ❌ | — | |
| vendedor_id | UUID | ✅ | — | FK → VENDEDOR (cliente asignado) |
| created_at | TIMESTAMP | ✅ | `now()` | |
| updated_at | TIMESTAMP | ✅ | `@updatedAt` | |

**Relaciones:**
- `auth_user_id` → AUTH_USER (1:1)
- `vendedor_id` → VENDEDOR (N:1 — cada cliente tiene 1 vendedor)

#### SUPER_ADMIN
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| id | UUID | ✅ | PK |
| auth_user_id | UUID | ✅ | FK → AUTH_USER (unique) |
| nombre | VARCHAR(100) | ✅ | |
| apellido | VARCHAR(100) | ❌ | Opcional |
| created_at | TIMESTAMP | ✅ | |
| updated_at | TIMESTAMP | ✅ | |

#### RELACION_CARTERA
| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| id | UUID | ✅ | `uuid()` | PK |
| vendedor_id | UUID | ✅ | — | FK → VENDEDOR |
| cliente_id | UUID | ✅ | — | FK → CLIENTE |
| activo | BOOLEAN | ✅ | `true` | |
| created_at | TIMESTAMP | ✅ | `now()` | |

**Unique:** (vendedor_id, cliente_id)

#### QR_CODE
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| id | UUID | ✅ | PK |
| vendedor_id | UUID | ✅ | FK → VENDEDOR |
| codigo | VARCHAR(50) | ✅ | Unique |
| activo | BOOLEAN | ✅ | |
| created_at | TIMESTAMP | ✅ | |
| expires_at | TIMESTAMP | ✅ | 48hs |

#### LINK_INVITACION
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| id | UUID | ✅ | PK |
| vendedor_id | UUID | ✅ | FK → VENDEDOR |
| token | VARCHAR(50) | ✅ | Unique |
| activo | BOOLEAN | ✅ | |
| created_at | TIMESTAMP | ✅ | |
| expires_at | TIMESTAMP | ✅ | 48hs |

#### AUDIT_LOG
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| id | UUID | ✅ | PK |
| usuario_id | UUID | ❌ | FK → AUTH_USER (optional — quién ejecutó la acción) |
| target_id | UUID | ❌ | ID del recurso afectado (sin FK) |
| accion | VARCHAR(50) | ✅ | USER_REGISTERED, USER_LOGIN, VENDEDOR_UPDATED, etc. |
| detalle | JSON | ❌ | Datos adicionales / diff de cambios |
| ip | VARCHAR(45) | ❌ | Dirección IP |
| created_at | TIMESTAMP | ✅ | |

**Índices:** `usuario_id`, `created_at`

---

### 2.2 products-service (TCP interno — PostgreSQL propia)

#### PRODUCTO
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | Referencia lógica → VENDEDOR en usuario-service |
| nombre | VARCHAR(255) | |
| descripcion | TEXT | |
| marca_id | UUID | FK → MARCA |
| categoria_id | UUID | FK → CATEGORIA |
| precio_sin_iva | DECIMAL(10,2) | Lo que manda el vendedor |
| precio_final | DECIMAL(10,2) | Calculado server-side (con IVA) |
| stock | INTEGER | 0 = sin stock |
| imagen | VARCHAR(500) | URL |
| activo | BOOLEAN | Default true |
| mostrar_precio | BOOLEAN | Default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### MARCA
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | Referencia lógica → VENDEDOR en usuario-service |
| nombre | VARCHAR(100) | ej: Villavicencio |
| created_at | TIMESTAMP | |

#### CATEGORIA
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | Referencia lógica → VENDEDOR en usuario-service |
| nombre | VARCHAR(100) | ej: Agua, Soda |
| orden | INTEGER | Posición en listado |
| created_at | TIMESTAMP | |

---

### 2.3 orders-service (TCP interno — PostgreSQL propia)

#### CART
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| usuario_id | UUID | Referencia lógica → AUTH_USER/CLIENTE en usuario-service |
| vendedor_id | UUID | Referencia lógica → VENDEDOR en usuario-service |
| expires_at | TIMESTAMP | created_at + 24hs |
| created_at | TIMESTAMP | |

#### CART_ITEM
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| cart_id | UUID | FK → CART |
| producto_id | UUID | Referencia lógica → PRODUCTO en products-service |
| cantidad | INTEGER | |
| precio_unitario | DECIMAL(10,2) | Precio al momento de agregar |
| created_at | TIMESTAMP | |

#### ORDER
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_numero | VARCHAR(20) | Secuencial por vendedor |
| usuario_id | UUID | Referencia lógica → AUTH_USER/CLIENTE en usuario-service |
| vendedor_id | UUID | Referencia lógica → VENDEDOR en usuario-service |
| direccion_entrega | JSON | Snapshot de la dirección al crear |
| estado | ENUM(OrderEstado) | pendiente, confirmado, en_camino, entregado, cancelado, vencido |
| metodo_pago | ENUM(MetodoPago) | contra_entrega |
| total_sin_iva | DECIMAL(10,2) | |
| iva | DECIMAL(10,2) | |
| total | DECIMAL(10,2) | |
| observaciones | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### ORDER_ITEM
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| producto_id | UUID | Referencia lógica → PRODUCTO en products-service |
| nombre | VARCHAR(255) | Snapshot al crear |
| cantidad | INTEGER | |
| precio_unitario | DECIMAL(10,2) | Precio al momento del pedido |
| created_at | TIMESTAMP | |

#### ORDER_HISTORY
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| estado_anterior | ENUM | |
| estado_nuevo | ENUM | |
| notas | TEXT | |
| created_at | TIMESTAMP | |

---

### 2.4 entregas-service (TCP interno — PostgreSQL propia)

#### DELIVERY
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| order_id | UUID | Referencia lógica → ORDER en orders-service |
| vendedor_id | UUID | Referencia lógica → VENDEDOR en usuario-service |
| estado | ENUM(DeliveryEstado) | pendiente, en_camino, entregada |
| direccion | JSON | Snapshot (DireccionEntrega) |
| cliente_nombre | VARCHAR(255) | Snapshot |
| cliente_telefono | VARCHAR(20) | Snapshot |
| fecha_asignacion | TIMESTAMP | |
| fecha_entrega | TIMESTAMP | Nullable |
| notas | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### 2.5 notifications-service (TCP/eventos internos — MongoDB propia)

#### ACTIVITY_LOG
| Campo | Tipo | Descripción |
|-------|------|-------------|
| _id | ObjectId | PK |
| usuario_id | UUID | |
| accion | STRING | ej: "order.created", "user.registered" |
| entidad_tipo | STRING | ej: "order", "user" |
| entidad_id | UUID | |
| servicio | STRING | ej: "orders-service" |
| metadata | OBJECT | Datos extra según el evento |
| created_at | TIMESTAMP | |

---

## 3. Enums Definidos

> Fuente de verdad: `packages/contracts/src/enums.ts`

```typescript
// Roles del sistema
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  VENDEDOR = 'vendedor',
  CLIENTE = 'cliente',
}

// Estado de vendedor
export enum VendedorEstado {
  PENDIENTE = 'pendiente',
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  BLOQUEADO = 'bloqueado',
}

// Estado del pedido
export enum OrderEstado {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_CAMINO = 'en_camino',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
  VENCIDO = 'vencido',
}

// Estado de entrega
export enum DeliveryEstado {
  PENDIENTE = 'pendiente',
  EN_CAMINO = 'en_camino',
  ENTREGADA = 'entregada',
}

// Método de pago (MVP: solo CONTRA_ENTREGA)
export enum MetodoPago {
  CONTRA_ENTREGA = 'contra_entrega',
}

// Tipo de factura (AFIP Argentina)
export enum TipoFactura {
  A = 'A',
  B = 'B',
  C = 'C',
}

// Acciones de auditoría
export enum AuditAction {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  VENDEDOR_UPDATED = 'VENDEDOR_UPDATED',
  VENDEDOR_STATUS_CHANGED = 'VENDEDOR_STATUS_CHANGED',
  CLIENTE_UPDATED = 'CLIENTE_UPDATED',
  CLIENTE_REASSIGNED = 'CLIENTE_REASSIGNED',
  QR_CREATED = 'QR_CREATED',
  QR_DEACTIVATED = 'QR_DEACTIVATED',
  LINK_CREATED = 'LINK_CREATED',
  LINK_DEACTIVATED = 'LINK_DEACTIVATED',
  SUPER_ADMIN_UPDATED = 'SUPER_ADMIN_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
}

// Nombres de streams Redis
export const RedisStreams = {
  AUTH: 'auth-stream',
  USER: 'user-stream',
  PRODUCTS: 'products-stream',
  ORDERS: 'orders-stream',
  DELIVERIES: 'deliveries-stream',
} as const;
```

---

## 4. Diagrama de Relaciones (MVP)

Diagrama conceptual de dominio. Las relaciones que cruzan microservicios representan UUID escalares lógicos, no FKs ni relaciones Prisma entre DBs.

```
AUTH_USER
    │
    ├──► SUPER_ADMIN (1:1)
    │
    ├──► VENDEDOR (1:1)
    │       │
    │       ├──► RELACION_CARTERA ──► CLIENTE
    │       │
    │       ├──► PRODUCTO ──┬──► MARCA
    │       │               └──► CATEGORIA
    │       │
    │       ├──► CART ──► CART_ITEM ──► PRODUCTO
    │       │
    │       ├──► ORDER ──┬──► ORDER_ITEM ──► PRODUCTO
    │       │             └──► ORDER_HISTORY
    │       │
    │       ├──► DELIVERY
    │       ├──► QR_CODE
    │       ├──► LINK_INVITACION
    │       └──► AUDIT_LOG
    │
    └──► CLIENTE (1:1)
            │
            └──► VENDEDOR (N:1 via vendedor_id)
```

---

## 5. Entidades Fuera del MVP (V2.0)

| Entidad | Servicio | Motivo |
|---------|----------|--------|
| FACTURA | orders-service | Facturación digital (V2.0) |
| REVIEW | orders-service | Valoraciones (V2.0) |
| DESCUENTO | products-service | Promociones (V2.0) |
| RUTA | entregas-service | Zonas de entrega con GPS (V2.0) |
| CIUDAD | usuario-service | Tabla maestro de ciudades (V2.0, en MVP es texto libre) |
| BARRIO | usuario-service | Tabla maestro de barrios (V2.0) |
| PAGO | payment-service | Pagos electrónicos (V2.0) |

---

## 6. Stack Actual (V1.0 MVP)

| Componente | Tecnología |
|------------|-----------|
| Backend | Node.js 22 LTS + NestJS 10 + TypeScript 5 |
| ORM | Prisma 5 |
| DBs | PostgreSQL 15 por microservicio transaccional; MongoDB para notifications |
| Activity Logs | AuditLog en PostgreSQL (no MongoDB en MVP) |
| Cache/colas | Redis 7 + BullMQ para comandos async críticos |
| Event streaming | Kafka no se usa para la resiliencia actual |
| Comunicación | Frontend → Gateway por HTTP; Gateway → microservicios por TCP interno o jobs BullMQ según criticidad |
| Frontend | Por definir |
| Contratos Compartidos | `packages/contracts/` (TypeScript) |
| Monorepo | pnpm workspaces |
| Contenedores | Docker Compose |

---

## 7. Infraestructura Docker

### docker-compose.yml (raíz, desarrollo local)
- `postgres:15-alpine` en puerto `5433`, DB local de desarrollo para servicios implementados
- `redis:7-alpine` en puerto `6379`
- `gateway` expuesto en `3000` como única entrada HTTP pública
- Microservicios de dominio sin puertos HTTP publicados; comunicación TCP interna para operaciones inmediatas y BullMQ para comandos críticos reintentables

### Resiliencia operacional

| Camino | Casos | Regla |
|--------|-------|-------|
| TCP síncrono | Login, perfil, validaciones y lecturas simples. | Si el MS está caído, devolver error controlado, `503` o timeout. No encolar. |
| Redis + BullMQ | Crear orden, pagos o flujos similares, notificaciones y tareas de entrega que puedan esperar segundos. | Encolar, responder `202 Accepted` y procesar con worker cuando el servicio esté disponible. |

El piloto se implementa primero en `orders-service` + `gateway` + contratos compartidos. `orders-service` conserva la persistencia final y los workers; el gateway no se vuelve dueño de datos de negocio.

Cada microservicio debe mantener su propio Dockerfile, base de datos y Prisma schema. El compose raíz solo coordina el entorno local; no convierte las DBs ni schemas en una unidad compartida.

### .env
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

---

## 8. Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | Abril 2026 | Versión inicial (TypeORM, servicios separados auth/user) |
| 1.1 | Mayo 2026 | Actualización a Prisma, usuario-service unificado, scope MVP |
| 1.2 | Junio 2026 | Table splitting AUTH_USER/VENDEDOR/CLIENTE/SUPER_ADMIN, +AUDIT_LOG, +direcciones cliente |
| **1.3** | **Julio 2026** | **VENDEDOR: apellido/dni/telefono/ciudad_default required, +cuil+cuit. CLIENTE: 8 campos pasan a required, +misma_direccion_entrega, +entrega_* (8 campos). TipoFactura: +A** |

---

**Documento actualizado para desarrollo V1.0 MVP**  
**⚠️ La fuente de verdad de los tipos es `packages/contracts/src/`; cada microservicio define su propio `prisma/schema.prisma` para sus tablas**

_AguaFress - Modelo de Datos_  
_Julio 2026_
