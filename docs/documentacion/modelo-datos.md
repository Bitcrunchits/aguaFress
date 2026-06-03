# Modelo de Datos - AguaFress V1.0 MVP

**Versión:** 1.1  
**Fecha:** Mayo 2026  
**Stack:** Node.js 20 LTS + NestJS 10 + TypeScript 5 + Prisma 5 + PostgreSQL 15 + MongoDB 6 + Redis 7  
**Proyecto:** AguaFress - Plataforma de Pedidos y Gestión para Distribuidores de Agua y Soda

> ⚠️ Este documento refleja la arquitectura **V1.0 MVP**.  
> Funcionalidades marcadas como V2.0 NO se implementan en esta versión.  
> Los tipos definitivos están en `packages/contracts/src/` (TypeScript) y `contratosDTOs/` (JSON).

---

## 1. Servicios del Sistema

| Servicio | Puerto | DB | ORM | Responsabilidad |
|----------|--------|-----|-----|-----------------|
| **api-gateway** | 3000 | — | — | Routing, auth JWT, rate limiting |
| **usuario-service** (auth + users) | 3001 | PostgreSQL | Prisma | Login, JWT, roles, perfiles, cartera, QR |
| **products-service** | 3003 | PostgreSQL | Prisma | Catálogo, productos, marcas, categorías |
| **orders-service** | 3004 | PostgreSQL | Prisma | Carrito, pedidos, facturas B/C |
| **entregas-service** | 3005 | PostgreSQL | Prisma | Repartos, estados, asignación |
| **notifications-service** | 3006 | MongoDB | Mongoose | Activity logs (solo consume eventos) |

---

## 2. Entidades por Servicio

### 2.1 usuario-service (Puerto 3001 — PostgreSQL, schema: users)

#### USER
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| email | VARCHAR(255) | Unique, not null |
| password | VARCHAR(255) | bcrypt hash |
| role | ENUM | super_admin, vendedor, cliente |
| nombre | VARCHAR(100) | Nombre (puede ser completo si apellido no está definido) |
| apellido | VARCHAR(100) | Opcional — se completa después del registro |
| dni | VARCHAR(20) | Opcional |
| telefono | VARCHAR(20) | Opcional |
| is_active | BOOLEAN | Default true |
| is_verified | BOOLEAN | Default false (email verificado) |
| vendedor_id | UUID (FK → USER) | Self-ref: cliente → vendedor asignado |
| qr_token | VARCHAR(50) | Unique — token para QR público |
| estado_vendedor | ENUM | pendiente, activo, inactivo, bloqueado (solo si role=vendedor) |
| ciudad_default | VARCHAR(100) | Ciudad/localidad de entrega (texto libre, MVP sin tabla CIUDAD) |
| zona_entrega | VARCHAR(100) | Zona/sector de entrega (texto libre) |
| empresa | VARCHAR(255) | Nombre del emprendimiento (vendedor) |
| logo | VARCHAR(500) | URL del logo (vendedor) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Relaciones:**
- `vendedor_id` → self-ref: un vendedor tiene N clientes
- Un cliente tiene 1 vendedor asignado

#### RELACION_CARTERA
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER (vendedor) |
| cliente_id | UUID | FK → USER (cliente) |
| activo | BOOLEAN | Default true |
| created_at | TIMESTAMP | |

#### QR_CODE
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| codigo | VARCHAR(50) | Unique |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | 48hs |

#### LINK_INVITACION
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| token | VARCHAR(50) | Unique |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | 48hs |

---

### 2.2 products-service (Puerto 3003 — PostgreSQL)

#### PRODUCTO
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
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
| vendedor_id | UUID | FK → USER |
| nombre | VARCHAR(100) | ej: Villavicencio |
| created_at | TIMESTAMP | |

#### CATEGORIA
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| nombre | VARCHAR(100) | ej: Agua, Soda |
| orden | INTEGER | Posición en listado |
| created_at | TIMESTAMP | |

---

### 2.3 orders-service (Puerto 3004 — PostgreSQL)

#### CART
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| usuario_id | UUID | FK → USER (cliente) |
| vendedor_id | UUID | FK → USER |
| expires_at | TIMESTAMP | created_at + 24hs |
| created_at | TIMESTAMP | |

#### CART_ITEM
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| cart_id | UUID | FK → CART |
| producto_id | UUID | FK → PRODUCTO |
| cantidad | INTEGER | |
| precio_unitario | DECIMAL(10,2) | Precio al momento de agregar |
| created_at | TIMESTAMP | |

#### ORDER
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_numero | VARCHAR(20) | Secuencial por vendedor |
| usuario_id | UUID | FK → USER (cliente) |
| vendedor_id | UUID | FK → USER |
| direccion_entrega | JSON | Snapshot de la dirección al crear (DireccionEntrega) |
| estado | ENUM | pendiente, confirmado, en_camino, entregado, cancelado, vencido |
| metodo_pago | ENUM | contra_entrega |
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
| producto_id | UUID | FK → PRODUCTO |
| nombre | VARCHAR(255) | Snapshot del nombre al crear |
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

### 2.4 entregas-service (Puerto 3005 — PostgreSQL)

#### DELIVERY
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| vendedor_id | UUID | FK → USER |
| estado | ENUM | pendiente, en_camino, entregada |
| direccion | JSON | Snapshot (DireccionEntrega) |
| cliente_nombre | VARCHAR(255) | Snapshot |
| cliente_telefono | VARCHAR(20) | Snapshot |
| fecha_asignacion | TIMESTAMP | |
| fecha_entrega | TIMESTAMP | Nullable |
| notas | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### 2.5 notifications-service (Puerto 3006 — MongoDB)

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
  B = 'B',
  C = 'C',
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

```
USER (role: super_admin)
    │
    ├──► USER (role: vendedor)
    │       │
    │       ├──► RELACION_CARTERA ──► USER (role: cliente)
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
    │       └──► LINK_INVITACION
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
| Backend | Node.js 20 LTS + NestJS 10 + TypeScript 5 |
| ORM | Prisma 5 |
| DB Principal | PostgreSQL 15 |
| Activity Logs | MongoDB 6 + Mongoose |
| Cache + Event Bus | Redis 7 |
| Comunicación | Redis Streams + HTTP REST (Gateway) |
| Frontend | Por definir (React + posible Next.js) |
| Contratos Compartidos | `packages/contracts/` (TypeScript) |
| Monorepo | npm workspaces |
| Contenedores | Docker Compose único con perfiles |

---

## 7. Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | Abril 2026 | Versión inicial (TypeORM, servicios separados auth/user) |
| 1.1 | Mayo 2026 | Actualización a Prisma, usuario-service unificado, scope MVP |

---

**Documento actualizado para desarrollo V1.0 MVP**  
**⚠️ La fuente de verdad de los tipos es `packages/contracts/src/`**

_AguaFress - Modelo de Datos_  
_Mayo 2026_
