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

## 3. Requerimientos Funcionaes

### 3.0 Super Admin (V1.0 - NUEVO)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| SADMIN-01 | Dashboard métricas | Vista principal con resumen de plataforma | Alta |
| SADMIN-02 | Listado vendedores | Ver todos los vendedores registrados | Alta |
| SADMIN-03 | Activar vendedor | Aprobar registro de nuevo vendedor | Alta |
| SADMIN-04 | Métricas vendedor | Ver ventas globales (diarias/mensuales/anuales) | Alta |
| SADMIN-05 | Promedio por pedido | Ver promedio de ticket | Alta |
| SADMIN-06 | Clientes por vendedor | Ver cantidad de clientes (#) | Alta |
| SADMIN-07 | Suspensión cuenta | Inactivar vendedor por mora | Alta |
| SADMIN-08 | Reactivación automática | Activar al detectar pago electrónico | Alta |
| SADMIN-09 | Ver detalle vendedor | Acceder a métricas de un vendedor específico | Media |

### 3.0.1 Vendedor - Estados y QR (V1.0 - NUEVO)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| VEND-12 | Estado activo/inactivo | Cuenta habilitada o deshabilitada | Alta |
| VEND-13 | Generar QR código | Generar QR para compartir perfil | Alta |
| VEND-14 | QR con enlace público | URL al catálogo público del vendedor | Alta |
| VEND-15 | Editar fotos productos | Herramienta de edición (recortar, rotar) | Alta |
| VEND-16 | Compresión server-side | Optimizar imágenes para renderizado | Alta |

### 3.1 Autenticación y Usuarios

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| AUTH-01 | Registro de usuarios | Admins crean usuarios (clientes) | Alta |
| AUTH-01B | Autoregistro vendedor | Vendedor se registra solo, espera activación | Alta |
| AUTH-02 | Login email/password | Autenticación tradicional | Alta |
| AUTH-03 | Login Google OAuth | @deprecated - No implementar en MVP | Baja |
| AUTH-04 | Recuperación contraseña | Reset por email | Media |
| AUTH-05 | JWT Refresh | Mantener sesión | Alta |
| PERF-01 | Ver mi perfil | Datos del usuario | Alta |
| PERF-02 | Actualizar perfil | Modificar datos | Alta |
| PERF-03 | Gestión usuarios admin | CRUD completo | Alta |
| PERF-04 | Asignar cliente a vendedor | Relación jerárquica | Alta |
| PERF-05 | Aislamiento de cartera | Cada vendedor sus clientes | Alta |

### 3.2 Catálogo de Productos

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| CAT-01 | Ver catálogo | Listado de productos | Alta |
| CAT-02 | Foto producto | Imagen visual | Alta |
| CAT-03 | Marca | Fabricante | Alta |
| CAT-04 | Volumen | Tamaño/cantidad | Alta |
| CAT-05 | Precio sin IVA | Base imponible | Alta |
| CAT-06 | Precio final | Con impuestos | Alta |
| CAT-07 | Stock disponible | Unidades | Alta |
| CAT-08 | Búsqueda | Filtrar productos | Media |
| CAT-09 | Carga productos | Vendedor admin | Alta |

### 3.3 Carrito de Compras

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| CART-01 | Agregar al carrito | Seleccionar producto | Alta |
| CART-02 | Definir cantidad | Unidades | Alta |
| CART-03 | Precio unitario | Sin impuestos | Alta |
| CART-04 | Impuestos | IVA aplicados | Alta |
| CART-05 | Total pedido | Sumatoria final | Alta |
| CART-06 | Modificar cantidad | Cambiar unidades | Alta |
| CART-07 | Eliminar producto | Quitar del carrito | Alta |
| CART-08 | Vaciar carrito | Reset completo | Media |

### 3.4 Pedidos

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| PED-01 | Crear pedido | Desde carrito | Alta |
| PED-02 | Pago contra entrega | Único método en MVP | Alta |
| PED-03 | Confirmar visita | Cliente confirma | Alta |
| PED-05 | Cancelar visita | Cliente rechaza | Alta |
| PED-06 | Estado: pendiente | Esperando | Alta |
| PED-07 | Estado: confirmado | Aprobado | Alta |
| PED-08 | Estado: en camino | Repartiendo | Alta |
| PED-09 | Estado: entregado | Completado | Alta |
| PED-10 | Estado: cancelado | Anulado | Alta |
| PED-11 | Notificaciones | Cambios de estado | Media |

### 3.5 Vista del Vendedor

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| VEND-01 | Dashboard | Resumen general | Alta |
| VEND-02 | Pedidos confirmados | Listado activo | Alta |
| VEND-03 | Detalle pedido | Info completa | Alta |
| VEND-04 | Mapa interactivo | Ubicaciones | Alta |
| VEND-05 | Navegación GPS | Google/Waze | Alta |
| VEND-06 | Botón navegar |Desde pedido | Alta |
| VEND-07 | Informe por cliente | Ventas | Alta |
| VEND-08 | Informe por producto | Ventas | Alta |
| VEND-09 | Historial cliente | Compras pasadas | Alta |
| VEND-10 | Facturas PDF | Digitales | Alta |
| VEND-11 | Admin productos | CRUD | Alta |

### 3.6 Vista del Consumidor

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| CONS-01 | Login completo | Acceso al sistema | Alta |
| CONS-02 | Perfil completo | Datos personales | Alta |
| CONS-03 | Dirección entrega | Ubicación | Alta |
| CONS-04 | Dirección facturación | Datos factura | Alta |
| CONS-05 | Tipo factura | B o C | Alta |
| CONS-06 | Ver catálogo | Productos del vendedor | Alta |
| CONS-07 | Carrito | Compra online | Alta |
| CONS-08 | Confirmar visita | Programación | Alta |
| CONS-09 | Recibir facturas | Descarga | Media |

---

## 4. Requerimientos No Funcionales

### 4.1 Rendimiento

| ID | Requerimiento | Criterio | Meta |
|----|--------------|---------|--------|
| RNF-01 | Tiempo de respuesta | API calls | < 2 segundos |
| RNF-02 | Carga concurrente | Usuarios simultáneos | 100 usuarios |
| RNF-03 | Disponibilidad | Uptime | 99% |

### 4.2 Seguridad

| ID | Requerimiento | Criterio |
|----|--------------|---------|
| SEG-01 | Hash de passwords | bcrypt |
| SEG-02 | Tokens | JWT 24h expiry |
| SEG-03 | Aislamiento datos | Por vendedor |
| SEG-04 | HTTPS | Obligatorio |
| SEG-05 | Email único | Validación DB |

### 4.3 Infraestructura

| ID | Requerimiento | Tecnología |
|----|--------------|------------|
| INF-01 | Contenedores | Docker |
| INF-02 | Orquestación | Docker Compose |
| INF-03 | Cache | Redis |
| INF-04 | Email test | Mailhog |
| INF-05 | Service Discovery | Consul |
| INF-06 | Logging | Elasticsearch + Kibana |
| INF-07 | Monitoreo | Prometheus + Grafana |
| INF-08 | Tiempo real (Chat, Notificaciones) | Socket.IO |

### 4.4 Base de Datos (3 Motores - MICROSERVICIOS)

| Motor | Servicio | ORM | Datos |
|-------|----------|-----|-------|
| PostgreSQL | Auth, Products, Orders | TypeORM | Usuarios, Productos, Pedidos, Facturación (datos transaccionales) |
| MySQL | Analytics | TypeORM | Historial ventas, Métricas, Reportes OLAP (solo lectura pesada) |
| MongoDB | Notifications | Mongoose | Mensajes, Notificaciones, Activity Logs (documentos flexibles) |

> **Nota**: No usar TypeORM para MongoDB - usar Mongoose directamente.

---

## 5. Arquitectura del Sistema

### 5.1 Arquitectura Microservicios

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         AGUAFRESS - MICROSERVICIOS                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        FRONTEND (React 18 + TS)               │  │
│  │                     Puerto 5173 (Vite Dev Server)              │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                     │
│                               ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    API GATEWAY (NestJS)                        │  │
│  │                         Puerto 3000                            │  │
│  │              Nginx (Load Balancer) + gRPC Proxy                  │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                     │
│         ┌──────────┬───────────┼───────────┬──────────┐              │
│         ▼          ▼           ▼           ▼          ▼                  │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐   │
│  │  Auth    │ │  User   │ │ Product  │ │  Order  │ │ Payment │         │
│  │ Service  │ │ Service │ │ Service  │ │ Service │ │ Service │   │
│  │  :3001  │ │  :3002 │ │  :3003  │ │  :3004 │ │  :3007 │   │
│  │PostgreSQL│ │PostgreSQL│ │PostgreSQL│ │PostgreSQL│ │PostgreSQL│   │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘        │
│       │            │           │           │          │               │
│       └────────────┴───────────┴───────────┴──────────┘               │
│                             ▼                                     │
│                    ┌─────────────────────┐                       │
│                    │  RabbitMQ / NATS     │                       │
│                    │  (Message Broker)   │                       │
│                    └──────────┬──────────┘                       │
│                               │                                   │
│        ┌──────────────────────┼──────────────────────┐         │
│        ▼                      ▼                      ▼         │
│  ┌──────────┐          ┌──────────┐            ┌─────────┐        │
│  │Analytics│          │Notificat.│            │  Cache  │        │
│  │ Service │          │ Service │            │ Redis  │        │
│  │  :3005 │          │  :3006  │            │  :6379 │        │
│  │  MySQL  │          │MongoDB  │            │        │        │
│  └──────────┘          └──────────┘            └─────────┘        │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Consul (Service Discovery) | Elasticsearch + Kibana       │    │
│  │           Prometheus + Grafana                            │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Distribución de Servicios

| Servicio | Puerto | DB | ORM | Funcionalidad |
|----------|--------|-----|-----|--------------|
| **api-gateway** | 3000 | - | - | Routing, Auth, Rate limit |
| **usuario-service** (auth + users) | 3001 | PostgreSQL (2 schemas) | Prisma | Login, JWT, Roles, Perfiles, Cartera, QR |
| **products-service** | 3003 | PostgreSQL | Prisma | Catálogo, Productos, Marcas, Categorías |
| **orders-service** | 3004 | PostgreSQL | Prisma | Pedidos, Carrito, Facturas B/C |
| **entregas-service** | 3005 | PostgreSQL | Prisma | Repartos, Estados, Asignación |
| **notifications-service** | 3006 | MongoDB | Mongoose | Activity Logs (solo consume eventos) |

### 5.3 Puertos de Infraestructura

| Componente | Puerto | Propósito |
|------------|--------|-----------|
| PostgreSQL | 5432 | Datos transaccionales (todos los services) |
| MongoDB | 27017 | Activity Logs (notifications-service) |
| Redis | 6379 | Streams de eventos + caché |
| Mailhog | 1025 | Email test (desarrollo) |

### 5.4 Comunicación Entre Servicios

- **Redis Streams**: Único bus de eventos asíncronos (order.created, user.registered, etc.)
- **Redis**: Cache de sesiones (JWT) y catálogo de productos
- **HTTP REST**: Comunicación síncrona a través del API Gateway

> Decisión de arquitectura: evitar gRPC y RabbitMQ en MVP para reducir complejidad operativa.
┌─────────────────────────────────────────────────────────────┐
│                    AGUAFRESS                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐      │
│  │                  FRONTEND                         │      │
│  │                (React 18 + TS)                    │      │
│  └─────────────────────┬─────────────────────────────┘      │
│                        │                                    │
│                        ▼                                    │
│  ┌───────────────────────────────────────────────────┐      │
│  │                   API GATEWAY                     │      │
│  │              (NestJS - Puertos)                   │      │
│  └─────────────────────┬─────────────────────────────┘      │
│                        │                                    │
│         ┌──────────────┴──────────────┐                     │
│         ▼                             ▼                     │
│  ┌───────────────┐            ┌───────────────┐             │
│  │  PostgreSQL   │            │    MySQL      │             │
│  │ (Auth+User)   │            │ (Analytics)   │             │
│  │ (Products)    │            │               │             │
│  │ (Orders)      │            │               │             │
│  └─────────┬─────┘            └──────┬────────┘             │
│            │                         │                      │
│            │     ┌───────────────────┘                      │
│            ▼     ▼                                          │
│  ┌─────────────────────────────────────────────────┐        │
│  │                  MongoDB                        │        │
│  │    (Notifications, Messages, Activity Logs)     │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Redis (Cache), Mailhog (Email Test)            │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Estructura de Proyectos (Microservicios)

```
aguaFress/
├── services/
│   ├── usuario-service/         # NestJS - Puerto 3001
│   │   ├── src/
│   │   │   ├── auth/              # Módulo auth (login, JWT, register)
│   │   │   ├── users/             # Módulo users (perfiles, cartera, QR)
│   │   │   └── common/
│   │   └── test/
│   │
│   ├── products-service/        # NestJS - Puerto 3003
│   │   ├── src/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   └── common/
│   │   └── test/
│   │
│   ├── orders-service/          # NestJS - Puerto 3004
│   │   ├── src/
│   │   │   ├── orders/
│   │   │   ├── cart/
│   │   │   └── common/
│   │   └── test/
│   │
│   ├── entregas-service/       # NestJS - Puerto 3005 (NUEVO)
│   │   ├── src/
│   │   │   ├── deliveries/
│   │   │   └── common/
│   │   └── test/
│   │
│   └── notifications-service/  # NestJS - Puerto 3006 (MongoDB)
│       ├── src/
│       │   ├── activity-logs/
│       │   └── common/
│       └── test/
│
├── gateway/                     # NestJS - Puerto 3000
│   ├── src/
│   │   ├── routes/
│   │   └── main.ts
│   └── test/
│
├── packages/
│   └── contracts/               # DTOs, eventos, enums compartidos
│       └── src/
│           ├── enums.ts
│           ├── events.ts
│           └── dto/
│
├── contratosDTOs/              # Contratos JSON de cada servicio
├── documentacion/              # Documentación del proyecto
├── docker-compose.yml          # Perfiles por servicio
└── package.json                # npm workspaces raíz

> **Principio**: Monorepo con npm workspaces, sin Nx/Turborepo.
```

> **Principio SRP**: Cada servicio es independiente, tiene su propia DB, y se comunica por eventos.

### 5.5 Contratos de Microservicios

Los DTOs TypeScript compartidos están en: `packages/contracts/src/dto/`
Los contratos JSON están en: `contratosDTOs/`

#### API Gateway (Puerto 3000)
- **Responsabilidad:** Punto de entrada único. Routing, autenticación, rate limiting.
- **Rutas:**
  - `/auth/*` → usuario-service:3001 (módulo auth)
  - `/users/*` → usuario-service:3001 (módulo users)
  - `/products/*` → products-service:3003
  - `/orders/*` → orders-service:3004
  - `/deliveries/*` → entregas-service:3005
  - `/notifications/*` → notifications-service:3006

#### usuario-service (Puerto 3001) - PostgreSQL (2 schemas: auth, users)
- **Responsabilidad:** Autenticación + perfiles (unificados en 1 MS).
- **Módulo auth:** Login, JWT, registro, refresh, validate
- **Módulo users:** Perfiles, cartera de clientes, QR/link de invitación

#### Products Service (Puerto 3003) - PostgreSQL
- **Responsabilidad:** Catálogo de productos, categorías, marcas.
- **Endpoints principales:**
  - `GET /products` - Listar catálogo → `[Product]`
  - `POST /products` - Crear producto → `Product`
  - `GET /products/search?q=` - Buscar productos → `[Product]`

#### Orders Service (Puerto 3004) - PostgreSQL
- **Responsabilidad:** Pedidos, carrito, facturas B/C.
- **Endpoints principales:**
  - `GET /orders` - Mis pedidos → `[Order]`
  - `POST /orders` - Crear pedido → `Order`
  - `POST /orders/:id/cancelar` - Cancelar pedido → `Order`
  - `GET /cart` - Ver carrito → `Cart`
  - `POST /cart/items` - Agregar al carrito → `Cart`

#### Entregas Service (Puerto 3005) - PostgreSQL
- **Responsabilidad:** Repartos, asignación a vendedor, cambio de estados.
- **Endpoints principales:**
  - `GET /deliveries` - Mis entregas → `[Delivery]`
  - `PATCH /deliveries/:id/status` - Actualizar estado → `Delivery`

#### Notifications Service (Puerto 3006) - MongoDB
- **Responsabilidad:** Activity logs (solo consume eventos de Redis Streams).
- **Endpoints principales:**
  - `GET /activity-logs` - Listar logs → `[ActivityLog]`

> **Nota:** Los contratos completos en formato JSON están disponibles en `contratosDTOs/`

### 5.6 Modelo de Datos Entity-Relationship

```
┌────────────────────────────────────────────────────────────────────┐
│                    MODELO DE DATOS                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐         ┌─────────────┐         ┌───────────┐        │
│  │  USER    │◄────────│  PRODUCT    │         │  ORDER    │        │
│  │ (UUID)   │  1..n   │  (UUID)     │         │  (UUID)   │        │
│  └────┬─────┘         └──────┬──────┘         └─────┬─────┘        │
│       │                      │                      │              │
│       │ 1..1                 │ 1..n                 │ 1..n         │
│       ▼                      ▼                      ▼              │
│  ┌─────────┐         ┌─────────────┐         ┌───────────┐         │
│  │ ORDER   │────────►│ ORDER_ITEM  │◄────────│  PRODUCT  │         │
│  │ITEM     │         │  (UUID)     │         │  (UUID)   │         │
│  └─────────┘         └─────────────┘         └───────────┘         │
│                                                                    │
│  ┌─────────┐         ┌──────────────┐                              │
│  │  ROLE   │         │  FAVORITE    │                              │
│  │ (enum)  │         │  (UUID)      │                              │
│  └─────────┘         └──────────────┘                              │
│                                   │                                │
│                                   ▼                                │
│  ┌─────────────────────────────────────────────────────┐           │
│  │                    RELACIONES                       │           │
│  ├─────────────────────────────────────────────────────┤           │
│  │  USER ──► user.vendedor_id ──► USER (vendedor)      │           │
│  │  USER ──► cliente.vendedor ──► USER (clientes)      │           │
│  │  ORDER ──► order.user ──► USER                      │           │
│  │  ORDER ──► order.items ──► ORDER_ITEM               │           │
│  │  ORDER_ITEM ──► item.product ──► PRODUCT            │           │
│  │  FAVORITE ──► favorite.user ──► USER                │           │
│  │  FAVORITE ──► favorite.product ──► PRODUCT          │           │
│  └─────────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────────┘
```

### 5.6 Enums Definidos

> ⚠️ Los enums definitivos están en `packages/contracts/src/enums.ts`. Este es un resumen.

```typescript
// Roles de usuario
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  VENDEDOR = 'vendedor',
  CLIENTE = 'cliente',
}

// Estado de cuenta de vendedor
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

// Método de pago (MVP solo CONTRA_ENTREGA)
export enum MetodoPago {
  CONTRA_ENTREGA = 'contra_entrega',
}

// Tipo de factura (AFIP)
export enum TipoFactura {
  B = 'B',
  C = 'C',
}
```

---

## 6. API Endpoints

### 6.0 SUPER ADMIN - Administración (NUEVO)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /super-admin/dashboard | SUPER_ADMIN | Métricas globales de plataforma |
| GET | /super-admin/vendedores | SUPER_ADMIN | Listar todos los vendedores |
| GET | /super-admin/vendedores/pendientes | SUPER_ADMIN | Vendedores esperando activación |
| POST | /super-admin/vendedores/:id/activar | SUPER_ADMIN | Activar cuenta de vendedor |
| POST | /super-admin/vendedores/:id/suspender | SUPER_ADMIN | Suspender cuenta por mora |
| GET | /super-admin/vendedores/:id/metricas | SUPER_ADMIN | Métricas de vendedor específico |
| GET | /super-admin/vendedores/:id/clientes | SUPER_ADMIN | Cantidad de clientes (#) |

### 6.0.1 AUTOREGISTRO VENDEDORES

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | /auth/register-vendedor | Público | Auto-registro de vendedor |
| GET | /vendedor/pediente | PENDIENTE | Verificar estado de solicitud |

### 6.1 AUTH - Autenticación (usuario-service, módulo auth)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | /auth/login | Público | Login email+password |
| POST | /auth/register | ADMIN | Crear usuario |
| POST | /auth/register-vendedor | Público | Auto-registro de vendedor |
| POST | /auth/refresh | Usuario | Renovar token |
| POST | /auth/validate | Interno | Validar token JWT |

> @deprecated Google OAuth — No implementar en MVP V1.

### 6.2 USERS - Usuarios (usuario-service, módulo users)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /users/me | Usuario | Mi perfil |
| PATCH | /users/me | Usuario | Actualizar perfil |
| GET | /users/mis-clientes | VENDEDOR | Mis clientes (cartera) |
| POST | /users/asignar-vendedor | ADMIN | Asignar cliente a vendedor |
| GET | /users/:id | ADMIN | Ver usuario |
| POST | /qr/generar | VENDEDOR | Generar QR de invitación |
| GET | /qr/:token | Público | Perfil público + catálogo |

### 6.3 PRODUCTS - Productos (products-service)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /products | Público | Listar catálogo |
| GET | /products/:id | Público | Ver producto |
| POST | /products | VENDEDOR | Crear producto |
| PATCH | /products/:id | VENDEDOR | Actualizar |
| DELETE | /products/:id | VENDEDOR | Eliminar |
| GET | /products/search | Público | Buscar |
| GET | /categories | Público | Listar categorías |
| GET | /brands | Público | Listar marcas |

### 6.4 CART - Carrito

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /cart | Usuario | Ver carrito |
| POST | /cart/items | Usuario | Agregar item |
| PATCH | /cart/items/:id | Usuario | Actualizar cantidad |
| DELETE | /cart/items/:id | Usuario | Eliminar item |
| DELETE | /cart | Usuario | Vaciar carrito |

### 6.5 ORDERS - Pedidos (orders-service)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /orders | Usuario | Mis pedidos |
| GET | /orders/:id | Usuario | Ver pedido |
| POST | /orders | CLIENTE | Crear pedido desde carrito |
| PATCH | /orders/:id/status | VENDEDOR | Actualizar estado |
| POST | /orders/:id/cancelar | CLIENTE | Cancelar pedido |

### 6.6 DELIVERIES - Entregas (entregas-service)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /deliveries | VENDEDOR | Mis entregas asignadas |
| GET | /deliveries/:id | VENDEDOR | Ver detalle de entrega |
| PATCH | /deliveries/:id/status | VENDEDOR | Actualizar estado |

### @deprecated - Fuera del MVP V1
- Favoritos (V2.0)
- Analytics / Reportes (V2.0)
- Editor de imágenes (V2.0)
- Payment Service (V2.0)
- Mapa con GPS (V2.0)

### 6.8 ACTIVITY LOGS - Activity Logs (notifications-service)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /activity-logs | Usuario | Listar activity logs |
| GET | /activity-logs?servicio= | Usuario | Filtrar por servicio |

---

## 7. Flujos de Usuario

### 7.1 Flujo de Autenticación

```
[USUARIO]
    │
    ▼
┌─────────────────┐
│  /auth/login    │──── OK ──► JWT Token
│  (email/pass)   │
└────────┬─────  ─┘
         │
         ▼
┌─────────────────────┐
│  GET /users/me      │──► Ti datos completos?
│              │      │
│              SÍ◄───NO
│              │
│              ▼
└──────────────┬──────┘
               ▼
         [APP SEGÚN ROL]
```

###  Flujo de Compra

```
[CONSUMIDOR]
    │
    ▼
┌────────────────┐
│  Ver Catálogo  │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Seleccionar   │
│  Producto      │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Agregar al    │
│  Carrito       │
└────────┬───────┘
         │
    ┌────┴────┐
    ▼         ▼
[MODIFICAR]   [CHECKOUT]
    │           │
    │           ▼
    │    ┌────────────────────┐
    │    │  Elegir pago       │
    │    │(anticipado/contra) |
    │    └────────┬────────────
    │             │
    │             ▼
    │    ┌─────────────────┐
    │    │  Crear Pedido   │
    │    │  (PENDIENTE)    │
    │    └────────┬────--──┘
    │             │
    │             ▼
    │    ┌─────────────────────┐
    │    │  Confirmar-visita   │
    │    │  (CLIENTE)          │──► Estado: CONFIRMADO
    │    └─────────────────────┘
    │
    └───────────────────────────────┘
               │
               ▼
        [VENDEDOR]
               │
               ▼
    ┌────────────────────--─┐
    │  Ver en Dashboard     │
    │  (Pedidos.confirmados)│
    └────────────┬──────────┘
                │
                ▼
    ┌─────────────────────┐
    │  Ruta con GPS       │
    │  (Google Maps)      │
    └────────────┬────────┘
                │
         ┌──────┴──────┐
         ▼             ▼
   [ENTREGAR]    [CANCELAR]
         │             │
         ▼             ▼
   ENTREGADO      CANCELADO
```

### 7.3 Flujo de Aislamiento de Cartera

```
┌─────────────────────────────────────────────────────────┐
│              PROTECCIÓN DE CARTERA                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [VENDEDOR A]                                           │
│       │                                                 │
│       ▼                                                 │
│  DB Query:                                              │
│  WHERE vendedor_id = 'vendor-A-id'                      │
│       │                                                 │
│       ▼                                                 │
│  RESULTADO: Solo VER sus clientes                       │
│  - Cliente A ✓                                          │
│  - Cliente B ✓                                          │
│  - Cliente C ✓                                          │
│  - Cliente X ✗ (de vendedor B)                          │
│  - Cliente Y ✗ (de vendedor B)                          │
│                                                         │
│  [VENDEDOR B]                                           │
│       │                                                 │
│       ▼                                                 │
│  DB Query:                                              │
│  WHERE vendedor_id = 'vendor-B-id'                      │
│       │                                                 │
│       ▼                                                 │
│  RESULTADO: Solo VER sus clientes                       │
│  - Cliente X ✓                                          │
│  - Cliente Y ✓                                          │
│  - Cliente A ✗ (de vendedor A)                          │
│  - Cliente B ✗ (de vendedor A)                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Consideraciones Técnicas

### 8.1 Seguridad

- **Passwords**: Hashear con bcrypt (salt rounds: 10)
- **JWT**: Expiración 24h, refresh token 7 días
- **CORS**: Configurar orígenes permitidos
- **Rate limiting**: Implementar en endpoints login
- **Validación**: class-validator en todos los DTOs

### 8.2 Logging

- Loguear operaciones en MongoDB
- Activity logs para auditoría
- Errores en formato estructurado

### 8.3 Cache

- Redis para sesiones de usuario
- Cache de catálogo de productos
- TTL configurable

---

## 9. Dependencias del Proyecto

### 9.1 Dependencies (por Servicio)

```json
// auth-service, products-service, orders-service, payment-service (PostgreSQL)
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "typeorm": "^0.3.0",
  "postgresql": "^15.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.0",
  "passport-local": "^1.0.0",
  "passport-google-oauth20": "^2.0.0",
  "bcrypt": "^5.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.0",
  "socket.io": "^4.7.0"
}

// analytics-service (MySQL)
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "typeorm": "^0.3.0",
  "mysql2": "^3.0.0"
}

// notifications-service (MongoDB)
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/mongoose": "^10.0.0",
  "mongoose": "^8.0.0"
}

// api-gateway
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/grpc-engine": "^10.0.0",
  "@nestjs/microservices": "^10.0.0",
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "socket.io": "^4.7.0"
}
```

### 9.2 Dev Dependencies (común)

```json
{
  "@nestjs/cli": "^10.0.0",
  "@types/node": "^20.0.0",
  "typescript": "^5.0.0",
  "jest": "^29.0.0",
  "@types/jest": "^29.0.0",
  "ts-jest": "^29.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0"
}
```

---

## 10. Criterios de Aceptación

### 10.1 Funcionales

- [ ] Usuario puede registrarse y hacer login
- [ ] Usuario puede ver y editar su perfil
- [ ] Consumidor ve catálogo de su vendedor asignado
- [ ] Consumidor puede agregar productos al carrito
- [ ] Consumidor puede realizar pedido
- [ ] Consumidor puede pagar contra entrega (único método)
- [ ] Consumidor puede cancelar pedido
- [ ] Vendedor ve sus pedidos y entregas
- [ ] Vendedor puede gestionar productos
- [ ] Vendedor puede asignar entregas
- [ ] Aislamiento de datos funciona correctamente (cartera por vendedor)
- [ ] Los eventos fluyen correctamente por Redis Streams

### 10.2 No Funcionales

- [ ] Tiempo de respuesta < 2s
- [ ] HTTPS configurado
- [ ] Contraseñas hasheadas
- [ ] JWT expira correctamente
- [ ] Docker compose levanta todo
- [ ] Tests unitarios pasando
- [ ] Código formateado con ESLint

---

## 12. Versión 2.0 - Desarrollo Móvil y Funcionalidades Avanzadas

### 12.1 App Móvil React Native

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| MOB-01 | App React Native 0.74+ | App móvil para vendedores y consumidores | Alta |
| MOB-02 | Login móvil | Autenticación en app móvil | Alta |
| MOB-03 | Dashboard vendedor móvil | Vista de pedidos en camino | Alta |
| MOB-04 | GPS en tiempo real | Tracking de ubicación | Alta |
| MOB-05 | Notificaciones push | Firebase Cloud Messaging | Alta |

### 12.2 Chat en Tiempo Real (Socket.IO)

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| CHAT-01 | Chat de delivery | Comunicación repartidor-cliente durante reparto | Alta |
| CHAT-02 | Chat General | Chat entre vendedor y cliente | Media |
| CHAT-03 | Estados de conexión | Online/Offline/Ocupado | Alta |
| CHAT-04 | Historial de mensajes | Guardar conversaciones | Media |

### 12.3 Inteligencia Artificial

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| AI-01 | Análisis de ventas | Dashboard predictivo | Baja |
| AI-02 | Comandos por voz | Búsqueda por voz | Baja |
| AI-03 | Generador de rutas | Ruta optimizada | Baja |
| AI-04 | Generador de informes | Informes automáticos | Baja |

### 12.4 Empresas y Pagos

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| EMP-01 | Registro de empresas | Alta con CUIT | Media |
| EMP-02 | Pago anticipado obligatorio | Para empresas | Media |
| EMP-03 | Verificación de pagos | Confirmación automática | Media |

### 12.5 Stack Tecnológico V2.0

| Capa | Tecnología |
|------|------------|
| Frontend Mobile | React Native 0.74+ |
| Chat / Tiempo Real | Socket.IO |
| Notificaciones Push | Firebase Cloud Messaging |
| AI | Python / TensorFlow o API externa |
| Mapas | Google Maps SDK |

---

## 11. Principios SOLID + Buenas Prácticas (OBLIGATORIO)

> A partir de Mayo 2026, todo el código nuevo y refactors DEBEN cumplir estos principios.
> Aplica a: servicios NestJS, gateway, contracts, configuraciones, tests.

### 11.1 SRP — Single Responsibility

- Cada clase/archivo/módulo tiene **UN solo motivo de cambio**.
- Separar en archivos diferentes si hay más de una responsabilidad.
- Ejemplo: `auth.module.ts` solo maneja autenticación, `users.module.ts` solo maneja perfiles.

### 11.2 OCP — Open/Closed

- Las interfaces se extienden, NO se modifican.
- **Eventos**: nuevos eventos se agregan a la unión por stream (`OrderEvent`, `ProductEvent`...), no se modifican interfaces existentes.
- **DTOs**: para agregar campos, crear `FooV2DTO extends FooDTO`. O usar alias tipo `MetodoPagoPermitido`.
- **Switch**: usar discriminated unions para que TypeScript fuerce manejar todos los casos.

### 11.3 LSP — Liskov Substitution

- Subtipos deben ser sustituibles por su tipo base.
- Todos los eventos extienden `BaseEvent` (garantizan `timestamp`).
- Una función que recibe `BaseEvent` debe poder recibir cualquier evento concreto.

### 11.4 ISP — Interface Segregation

- **Eventos**: separados por stream (`AuthEvent`, `OrderEvent`, `DeliveryEvent`...).
- Un consumidor de deliveries NO debe depender de eventos de products.
- **DTOs**: crear interfaces específicas por endpoint, no reusar el mismo DTO para request y response.
- **Paginación**: `PaginationRequest` y `PaginationResponse` son separados.

### 11.5 DIP — Dependency Inversion

- Depender de interfaces/contratos abstractos, no de implementaciones concretas.
- Los módulos dependen de `@agua/contracts`, no de types definidos en otros servicios.
- Los eventos usan **enums** (abstractos), no string literals.

### 11.6 Clean Code — Reglas adicionales

| Regla | Descripción |
|-------|-------------|
| ❌ **No userId en body** | Se extrae del token JWT en el middleware. |
| ❌ **No string para estados** | Usar enums tipados (`OrderEstado`, `VendedorEstado`). |
| ❌ **No dead code** | Enums sin usar, interfaces @deprecated, imports sin referencia → remover. |
| ❌ **No unknown[] en responses** | Tipar con el DTO concreto. |
| ✅ **Eventos con type** | Todos los eventos tienen un campo `type` discriminante. |
| ✅ **IDs consistentes** | `userId`, `orderId`, `vendedorId`, `clienteId`. Nunca mezclar. |
| ✅ **ISO 8601** | Todas las fechas en formato ISO string. |
| ✅ **Conventional commits** | `feat(scope): msg`, `fix(scope): msg`, `refactor(scope): msg` |
| ✅ **Tests** | Unit tests para lógica de negocio. Integration tests para endpoints. |

### 11.7 Stack actual

| Componente | Tecnología |
|------------|-----------|
| Backend | Node.js 20 LTS + NestJS 10 + TypeScript 5 |
| ORM | Prisma 5 (TODOS los servicios) |
| PostgreSQL 15 | Servicios: usuario, products, orders, entregas |
| MongoDB 6 | notifications (activity logs) |
| Redis 7 | Streams (eventos) + caché |
| Monorepo | npm workspaces (sin Nx/Turborepo) |
| Docker | Compose único con perfiles |
| Comunicación | Redis Streams + HTTP REST (Gateway) |
| Contratos | `packages/contracts/` (DTOs TypeScript + enums) |
| Frontend | Por definir (React + Next.js) |

---

## 12. Historial de Versiones

| Versión | Fecha | Descripción | Autor |
|---------|-------|-------------|--------|
| 1.0 | Abril 2026 | Versión inicial del SPEC | Equipo AguaFress |
| 1.1 | Mayo 2026 | Refactor SOLID de contracts, actualización arquitectura MVP | Adrián Burdiles |
| 2.0 | Por definir | Desarrollo Móvil y Funcionalidades Avanzadas | Por definir |

---

**Documento aprobado para desarrollo**
**⚠️ SOLID + Clean Code es obligatorio en todo el código nuevo**

_AguaFress - SPEC.md_  
_Mayo 2026_