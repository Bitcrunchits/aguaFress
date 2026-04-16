# AguaFress - Specification Document

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Estado:** Aprobado para Desarrollo  
**Proyecto:** AguaFress - Plataforma de Pedidos y Gestión para Distribuidores de Agua y Soda  
**Equipo:** AguaFress Development (5 personas)  
**Carrera:** Desarrollo Full Stack

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
| Registro/Login email + Google OAuth | Registro de empresas con CUIT (V2.0) |
| Perfil consumidor (datos básicos) | Chat en tiempo real (V2.0) |
| Catálogo productos con fotos | AI y comandos por voz (V2.0) |
| Carrito de compras | React Native (V2.0) |
| Pedidos (anticipado + contra entrega) | |
| Confirmación de visitas | |
| Dashboard vendedor | |
| Mapa con GPS | |
| Informes de ventas | |
| Facturas digitales | |

### 2.2 Versión 2.0 (Futuro) - Planeado

- App Móvil React Native
- Registro de empresas
- Pago obligatorio anticipado
- Chat en tiempo real
- Módulos de Inteligencia Artificial

---

## 3. Requerimientos Funcionaes

### 3.1 Autenticación y Usuarios

| ID | Requerimiento | Descripción | Prioridad |
|----|--------------|-------------|-----------|
| AUTH-01 | Registro de usuarios | Solo admins crean usuarios | Alta |
| AUTH-02 | Login email/password | Autenticación tradicional | Alta |
| AUTH-03 | Login Google OAuth | Autenticación con Google | Alta |
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
| CAT-08 | Valoraciones | 5 estrellas | Alta |
| CAT-09 | Favoritos | Productos guardados | Alta |
| CAT-10 | Búsqueda | Filtrar productos | Media |
| CAT-11 | Carga productos | Vendedor admin | Alta |

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
| PED-02 | Pago anticipado |提前付款 | Alta |
| PED-03 | Pago contra entrega | Entrega时付款 | Alta |
| PED-04 | Confirmar visita | Cliente confirma | Alta |
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
| CONS-08 | Pago | Métodos | Alta |
| CONS-09 | Confirmar visita | Programación | Alta |
| CONS-10 | Recibir facturas | Descarga | Media |

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

### 4.4 Base de Datos (3 Motores)

| Motor | Propósito | Datos |
|-------|-----------|-------|
| PostgreSQL | Transaccional | Usuarios, Productos, Pedidos, Facturación |
| MySQL | Analytics | Historial ventas, Métricas, Reportes OLAP |
| MongoDB | NoSQL/Logs | Mensajes, Notificaciones, Activity Logs |

---

## 5. Arquitectura del Sistema

### 5.1 Arquitectura General

```
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

### 5.2 Arquitectura de Módulos NestJS

```
src/
├── app.module.ts                    # Root
│
├── auth/                          # Autenticación
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── local.strategy.ts
│   │   └── google.strategy.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── users/                         # Gestión usuarios
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── dto/
│
├── products/                      # Catálogo productos
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── products.module.ts
│   ├── entities/
│   │   └── product.entity.ts
│   └── dto/
│
├── orders/                       # Pedidos
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── entities/
│   │   ├── order.entity.ts
│   │   └── order-item.entity.ts
│   └── dto/
│
├── cart/                        # Carrito
│   ├── cart.controller.ts
│   ├── cart.service.ts
│   ├── cart.module.ts
│   └── dto/
│
├── analytics/                   # Reportes (MySQL)
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── analytics.module.ts
│
└── notifications/              # Notificaciones (MongoDB)
    ├── notifications.controller.ts
    ├── notifications.service.ts
    ├── notifications.module.ts
    └── schemas/
```

### 5.3 Modelo de Datos Entity-Relationship

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

### 5.4 Enums Definidos

```typescript
// Roles de usuario
export enum UserRole {
  ADMIN = 'admin',      // Superusuario (plataforma)
  VENDEDOR = 'vendedor', // Owner de cartera
  CLIENTE = 'cliente'   // Consumidor final
}

// Tipo de factura
export enum TipoFactura {
  B = 'B',
  C = 'C'
}

// Estado del pedido
export enum OrderStatus {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_CAMINO = 'en_camino',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado'
}

// Modalidad de pago
export enum PaymentMethod {
  ANTICIPADO = 'anticipado',
  CONTRA_ENTREGA = 'contra_entrega'
}
```

---

## 6. API Endpoints

### 6.1 AUTH - Autenticación

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | /auth/login | Público | Login email+password |
| POST | /auth/register | ADMIN | Crear usuario |
| POST | /auth/google | Público | Login OAuth |
| POST | /auth/refresh | Usuario | Renovar token |
| POST | /auth/logout | Usuario | Cerrar sesión |

### 6.2 USERS - Usuarios

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /users/me | Usuario | Mi perfil |
| PATCH | /users/me | Usuario | Actualizar perfil |
| GET | /users | ADMIN | Listar todos |
| GET | /users/:id | ADMIN | Ver uno |
| PATCH | /users/:id | ADMIN | Actualizar |
| DELETE | /users/:id | ADMIN | Eliminar |
| GET | /users/mis-clientes | VENDEDOR | Mis clientes |
| GET | /users/mi-vendedor | CLIENTE | Mi vendedor |

### 6.3 PRODUCTS - Productos

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /products | Público | Listar catálogo |
| GET | /products/:id | Público | Ver producto |
| POST | /products | VENDEDOR | Crear producto |
| PATCH | /products/:id | VENDEDOR | Actualizar |
| DELETE | /products/:id | VENDEDOR | Eliminar |
| GET | /products/search | Público | Buscar |

### 6.4 CART - Carrito

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /cart | Usuario | Ver carrito |
| POST | /cart/items | Usuario | Agregar item |
| PATCH | /cart/items/:id | Usuario | Actualizar cantidad |
| DELETE | /cart/items/:id | Usuario | Eliminar item |
| DELETE | /cart | Usuario | Vaciar carrito |

### 6.5 ORDERS - Pedidos

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /orders | Usuario | Mis pedidos |
| GET | /orders/:id | Usuario | Ver pedido |
| POST | /orders | Usuario | Crear pedido |
| PATCH | /orders/:id/status | VENDEDOR | Actualizar estado |
| POST | /orders/:id/confirmar | CLIENTE | Confirmar visita |
| POST | /orders/:id/cancelar | CLIENTE | Cancelar visita |

### 6.6 FAVORITES - Favoritos

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /favorites | Usuario | Mis favoritos |
| POST | /favorites | Usuario | Agregar |
| DELETE | /favorites/:id | Usuario | Eliminar |

### 6.7 ANALYTICS - Reportes

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /analytics/ventas/cliente | VENDEDOR | Por cliente |
| GET | /analytics/ventas/producto | VENDEDOR | Por producto |
| GET | /analytics/historial/:cliente | VENDEDOR | Historial |

### 6.8 NOTIFICATIONS - Notificaciones

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /notifications | Usuario | Mis notificaciones |
| PATCH | /notifications/:id/read | Usuario | Marcar leída |

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

### 9.1 Dependencies

```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "typeorm": "^0.3.0",
  "postgresql": "^15.0",
  "mysql2": "^3.0.0",
  "mongodb": "^6.0.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.0",
  "passport-local": "^1.0.0",
  "passport-google-oauth20": "^2.0.0",
  "bcrypt": "^5.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.0",
  "redis": "^4.0.0"
}
```

### 9.2 Dev Dependencies

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
- [ ] Consumidor puede pagar anticipado o contra entrega
- [ ] Consumidor puede confirmar/cancelar visita
- [ ] Vendedor ve sus pedidos confirmados
- [ ] Vendedor puede gestionar productos
- [ ] Vendedor tiene mapa con GPS
- [ ] Vendedor puede generar informes
- [ ] Aislamiento de datos funciona correctamente

### 10.2 No Funcionales

- [ ] Tiempo de respuesta < 2s
- [ ] HTTPS configurado
- [ ] Contraseñas hasheadas
- [ ] JWT expira correctamente
- [ ] Docker compose levanta todo
- [ ] Tests unitarios pasando
- [ ] Código formateado con ESLint

---

## 11. Historial de Versiones

| Versión | Fecha | Descripción | Autor |
|---------|-------|-------------|--------|
| 1.0 | Abril 2026 | Versión inicial del SPEC | Equipo AguaFress |

---

**Documento aprobado para desarrollo**

_AguaFress - SPEC.md_  
_Abril 2026_