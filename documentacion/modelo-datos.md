# Modelo de Datos - AguaFress

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Proyecto:** AguaFress - Plataforma de Pedidos y Gestión para Distribuidores de Agua y Soda

---

## 1. Entidades por Servicio

### 1.1 auth-service (Puerto 3001 - PostgreSQL)

#### USER
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| email | VARCHAR(255) | Unique, not null |
| password_hash | VARCHAR(255) | bcrypt |
| role | ENUM | super_admin, vendedor, cliente |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | Soft delete |

#### SESSION
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| user_id | UUID | FK → USER |
| token | TEXT | JWT |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

#### REFRESH_TOKEN
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| user_id | UUID | FK → USER |
| token | TEXT | |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

---

### 1.2 user-service (Puerto 3002 - PostgreSQL)

#### VENDEDOR
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK → FK(USER) |
| nombre | VARCHAR(100) | |
| apellido | VARCHAR(100) | |
| telefono | VARCHAR(20) | |
| empresa | VARCHAR(255) | Nombre del emprendimiento |
| logo | VARCHAR(500) | URL imagen |
| estado | ENUM | pendiente, activo, inactivo, bloqueado |
| qr_code | VARCHAR(50) | Unique |
| link_publico | VARCHAR(255) | URL para invitar |
| ciudad_default | UUID | FK → CIUDAD |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### CLIENTE
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK → FK(USER) |
| nombre | VARCHAR(100) | |
| apellido | VARCHAR(100) | |
| telefono | VARCHAR(20) | |
| dni | VARCHAR(20) | |
| tipo_factura | ENUM | B, C |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### RELACION_CARTERA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER (vendedor) |
| cliente_id | UUID | FK → USER (cliente) |
| estado | ENUM | activo |
| invited_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

#### DIRECCION
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| usuario_id | UUID | FK → USER |
| tipo | ENUM | facturacion, entrega, personal |
| barrio_id | UUID | FK → BARRIO |
| calle | VARCHAR(255) | |
| numero | VARCHAR(20) | |
| piso_depto | VARCHAR(50) | Opcional |
| referencia | TEXT | |
| latitude | DECIMAL(10,8) | |
| longitude | DECIMAL(11,8) | |
| principal | BOOLEAN | |
| created_at | TIMESTAMP | |

#### CIUDAD
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| nombre | VARCHAR(100) | ej: Córdoba |
| created_at | TIMESTAMP | |

#### BARRIO
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| ciudad_id | UUID | FK → CIUDAD |
| nombre | VARCHAR(100) | |
| created_at | TIMESTAMP | |

#### RUTA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| nombre | VARCHAR(100) | ej: Zona Norte |
| dias_entrega | JSON | [1,3,5] (Lun, Mie, Vie) |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |

#### QR_CODE
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| codigo | VARCHAR(50) | Unique |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | |

#### LINK_INVITACION
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| token | VARCHAR(50) | Unique |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | |

#### EXPORT_DATA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| tipo | ENUM | cartera, clientes, pedidos |
| data_json | JSON | |
| generated_at | TIMESTAMP | |

---

### 1.3 products-service (Puerto 3003 - PostgreSQL)

#### PRODUCTO
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| sku | VARCHAR(50) | Unique x vendedor |
| nombre | VARCHAR(255) | |
| descripcion | TEXT | |
| marca_id | UUID | FK → MARCA |
| categoria_id | UUID | FK → CATEGORIA |
| precio_sin_iva | DECIMAL(10,2) | |
| precio_final | DECIMAL(10,2) | Con IVA |
| stock | INTEGER | 0 = ilimitado |
| stock_minimo | INTEGER | Alerta |
| activo | BOOLEAN | |
| mostrar_precio | BOOLEAN | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### MARCA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| nombre | VARCHAR(100) | ej: Villavicencio |
| created_at | TIMESTAMP | |

#### CATEGORIA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| nombre | VARCHAR(100) | ej: Agua, Soda |
| orden | INTEGER | Posición |
| created_at | TIMESTAMP | |

#### PRODUCTO_IMAGEN
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| producto_id | UUID | FK → PRODUCTO |
| url | VARCHAR(500) | URL del archivo |
| thumbnail | VARCHAR(500) | Thumbnail |
| orden | INTEGER | |
| created_at | TIMESTAMP | |

#### DESCUENTO
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| tipo_target | ENUM | producto, categoria |
| target_id | UUID | FK |
| porcentaje | DECIMAL(5,2) | 0-100 |
| fecha_inicio | DATE | |
| fecha_fin | DATE | |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |

---

### 1.4 orders-service (Puerto 3004 - PostgreSQL)

#### CART
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| usuario_id | UUID | FK → USER |
| vendedor_id | UUID | FK → USER |
| expires_at | TIMESTAMP | created_at + 24hs |
| created_at | TIMESTAMP | |

#### CART_ITEM
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| cart_id | UUID | FK → CART |
| producto_id | UUID | FK → PRODUCTO |
| cantidad | INTEGER | |
| precio_unitario | DECIMAL(10,2) | |
| created_at | TIMESTAMP | |

#### ORDER
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| pedido_numero | VARCHAR(20) | Sequential x vendedor |
| usuario_id | UUID | FK → USER (cliente) |
| vendedor_id | UUID | FK → USER |
| direccion_entrega_id | UUID | FK → DIRECCION |
| estado | ENUM | pendiente, confirmado, en_camino, entregado, cancelado, vencido |
| metodo_pago | ENUM | anticipado, contra_entrega |
| total_sin_iva | DECIMAL(10,2) | |
| iva | DECIMAL(10,2) | |
| total | DECIMAL(10,2) | |
| observaciones | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### ORDER_ITEM
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| producto_id | UUID | FK → PRODUCTO |
| cantidad | INTEGER | |
| precio_unitario | DECIMAL(10,2) | |
| created_at | TIMESTAMP | |

#### ORDER_HISTORY
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| estado_anterior | ENUM | |
| estado_nuevo | ENUM | |
| notas | TEXT | |
| created_at | TIMESTAMP | |

#### REVIEW
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| order_id | UUID | FK ��� ORDER |
| usuario_id | UUID | FK → USER |
| estrellas | INTEGER | 1-5 |
| comentario | TEXT | |
| created_at | TIMESTAMP | |

#### FACTURA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| url_imagen | VARCHAR(500) | PDF/JPG |
| numero | VARCHAR(50) | X vendedor |
| created_at | TIMESTAMP | |

---

### 1.5 analytics-service (Puerto 3005 - MySQL)

#### METRICAS_VENTA
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| periodo | ENUM | dia, semana, mes, año |
| cantidad_pedidos | INTEGER | |
| monto_total | DECIMAL(12,2) | |
| promedio_ticket | DECIMAL(10,2) | |
| nuevos_clientes | INTEGER | |
| fecha | DATE | |
| created_at | METRICAS_FECHA | |

#### VENTAS_POR_CLIENTE
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| cliente_id | UUID | FK → USER |
| cantidad_pedidos | INTEGER | |
| monto_total | DECIMAL(12,2) | |
| ultimo_pedido | TIMESTAMP | |

#### VENTAS_POR_PRODUCTO
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| vendedor_id | UUID | FK → USER |
| producto_id | UUID | FK → PRODUCTO |
| cantidad_vendida | INTEGER | |
| monto_total | DECIMAL(12,2) | |

---

### 1.6 notifications-service (Puerto 3006 - MongoDB)

#### NOTIFICATION
| Campo | Tipo | Descripción |
|-------|------|------------|
| _id | ObjectId | PK |
| usuario_id | UUID | FK → USER |
| tipo | ENUM | estado_cambio,recordatorio,promocion |
| titulo | STRING | |
| mensaje | STRING | |
| leida | BOOLEAN | |
| send_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

#### PUSH_TOKEN
| Campo | Tipo | Descripción |
|-------|------|------------|
| _id | ObjectId | PK |
| usuario_id | UUID | |
| token | STRING | FCM token |
| dispositivo | STRING | |
| created_at | TIMESTAMP | |

#### ACTIVITY_LOG
| Campo | Tipo | Descripción |
|-------|------|------------|
| _id | ObjectId | PK |
| usuario_id | UUID | |
| accion | STRING | |
| entidad_tipo | STRING | |
| entidad_id | UUID | |
| metadata | OBJECT | |
| created_at | TIMESTAMP | |

---

### 1.7 payment-service (Puerto 3007 - PostgreSQL)

#### PAGO
| Campo | Tipo | Descripción |
|-------|------|------------|
| id | UUID | PK |
| order_id | UUID | FK → ORDER |
| metodo | ENUM | efectivo, transferencia |
| monto | DECIMAL(10,2) | |
| estado | ENUM | pendiente, confirmado, rechazado |
| referencia | VARCHAR(100) | |
| created_at | TIMESTAMP | |

---

## 2. Enums Definidos

```typescript
// Roles de usuario
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  VENDEDOR = 'vendedor',
  CLIENTE = 'cliente'
}

// Estado del vendedor
export enum VendedorEstado {
  PENDIENTE = 'pendiente',
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  BLOQUEADO = 'bloqueado'
}

// Tipo de dirección
export enum TipoDireccion {
  FACTURACION = 'facturacion',
  ENTREGA = 'entrega',
  PERSONAL = 'personal'
}

// Tipo de factura
export enum TipoFactura {
  B = 'B',
  C = 'C'
}

// Estado del pedido
export enum OrderEstado {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_CAMINO = 'en_camino',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
  VENCIDO = 'vencido'
}

// Método de pago
export enum MetodoPago {
  ANTICIPADO = 'anticipado',
  CONTRA_ENTREGA = 'contra_entrega'
}

// Tipo de descuento
export enum TipoDescuento {
  PRODUCTO = 'producto',
  CATEGORIA = 'categoria'
}
```

---

## 3. Relaciones

```
USER (rol: super_admin)
    │
    ├──► VENDEDOR ──┬──► PRODUCTO ──┬──► MARCA
    │              │                ├──► CATEGORIA
    │              │                ├──► PRODUCTO_IMAGEN
    │              │                └──► DESCUENTO
    │              │
    │              ├──► CART ────► CART_ITEM ────► PRODUCTO
    │              │
    │              ├──► ORDER ────► ORDER_ITEM ────► PRODUCTO
    │              │         │
    │              │         ├──► ORDER_HISTORY
    │              │         └──► FACTURA
    │              │
    │              ├──► RELACION_CARTERA ────► CLIENTE ────► DIRECCION
    │              │
    │              ├──► QR_CODE
    │              ├──► LINK_INVITACION
    │              └──► RUTA ────► BARRIO ────► CIUDAD

CLIENTE ────► REVIEW ────► ORDER
```

---

## 4. Índices Recomendados

| Tabla | Índice | Propósito |
|-------|--------|----------|
| USER | email | Búsqueda/login |
| USER | role | Filtro por rol |
| PRODUCTO | vendedor_id + sku | Unique |
| PRODUCTO | categoria_id | Filtrar catálogo |
| ORDER | vendedor_id + estado | Dashboard |
| ORDER | usuario_id + estado | Historial |
| ORDER | created_at | Reportes |
| DIRECCION | usuario_id + tipo |快速 |
| RELACION_CARTERA | vendedor_id + cliente_id | Unique |

---

## 5. Notas de Implementación

### 5.1 SKUs por Vendedor
Cada vendedor tiene su propio catálogo. SKU debe ser único **por vendedor**, no global.

### 5.2 Carrito Vencido
El cart expira a las 24hs de creado. Se marca como vencido y los items se mueven a ORDER con estado "vencido" (historial).

### 5.3 Facturas como Imágenes
Las facturas son cargadas por el vendedor (PDF/JPG) como archivos, no se generan desde el sistema.

### 5.4 QR/Link Público
El link público muestra el catálogo del vendedor incluyendo precios y descuentos si están activos.

---

**Documento aprobado para desarrollo**

_AguaFress - Modelo de Datos_  
_Mayo 2026_