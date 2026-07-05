# AguaFress - Módulo Auth + Users

## Documentación de Requerimientos (Actualizado)

**Versión:** 2.0  
**Fecha:** Julio 2026  
**Equipo:** AguaFress Development  
**Módulo:** Autenticación y Gestión de Usuarios

---

## 1. Resumen del Proyecto

**AguaFress** es una plataforma marketplace que conecta vendedores y consumidores de agua/soda, con aislamiento de cartera por vendedor (cada uno maneja sus propios clientes).

### Modelo de Acceso

- **SUPER_ADMIN** (nosotros): Acceso total, administra vendedores, clientes, auditoría
- **VENDEDOR**: Solo ve SUS clientes, productos y pedidos
- **CLIENTE**: Solo ve SU vendedor asignado

---

## 2. Requerimientos Funcionales

### 2.1 Autenticación (AUTH)

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|----------|--------|
| AUTH-01 | Registro de clientes por QR/link | Alta | ✅ |
| AUTH-01B | Autoregistro vendedor | Alta | ✅ |
| AUTH-02 | Login con email/password | Alta | ✅ |
| AUTH-05 | Renovación de token (refresh JWT con rotación) | Alta | ✅ |
| AUTH-06 | Cierre de sesión (invalida refresh token) | Media | ✅ |
| AUTH-07 | Refresh token rotation con jti | Alta | ✅ |
| AUTH-03 | Login con Google OAuth | Baja | 🔜 V2.0 |
| AUTH-04 | Recuperación de contraseña | Media | 🔜 V2.0 |

### 2.1.1 Super Admin

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|----------|--------|
| SADMIN-01 | Dashboard métricas globales | Alta | ✅ |
| SADMIN-02 | Listado vendedores | Alta | ✅ |
| SADMIN-03 | Activar vendedor (pendiente→activo) | Alta | ✅ |
| SADMIN-04 | Cambiar estado vendedor (inactivo/bloqueado) | Alta | ✅ |
| SADMIN-05 | CRUD clientes | Alta | ✅ |
| SADMIN-06 | Reasignar cliente de vendedor | Alta | ✅ |

### 2.1.2 Vendedor - Estados y QR

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|----------|--------|
| VEND-EST-01 | Estado pendiente (esperando activación) | Alta | ✅ |
| VEND-EST-02 | Estado activo | Alta | ✅ |
| VEND-EST-03 | Estado inactivo/bloqueado | Alta | ✅ |
| VEND-QR-01 | Generar QR de invitación (48hs) | Alta | ✅ |
| VEND-QR-02 | Generar link de invitación (48hs) | Alta | ✅ |
| VEND-LNK-01 | CRUD links de invitación | Alta | ✅ |

### 2.2 Gestión de Perfiles (USERS)

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|----------|--------|
| PERF-01 | Ver mi perfil (según rol) | Alta | ✅ |
| PERF-02 | Actualizar mi perfil | Alta | ✅ |
| PERF-03 | Ver listado de usuarios (admin) | Alta | ✅ |
| PERF-04 | Ver usuario específico (admin) | Alta | ✅ |
| PERF-05 | Actualizar usuario (admin) | Alta | ✅ |
| PERF-07 | Asignar cliente a vendedor | Alta | ✅ |
| PERF-08 | Auditoría de acciones | Alta | ✅ |

### 2.3 Datos del Perfil

#### VENDEDOR (tabla separada de AUTH_USER)

| ID | Campo | Tipo | Requerido | Descripción |
|----|-------|------|-----------|-------------|
| VEND-D-01 | nombre | string | ✅ | |
| VEND-D-02 | apellido | string | ✅ | |
| VEND-D-03 | dni | string(8) | ✅ | 8 dígitos obligatorios |
| VEND-D-04 | cuil | string(15) | ❌ | Opcional |
| VEND-D-05 | cuit | string(15) | ❌ | Opcional |
| VEND-D-06 | telefono | string | ✅ | |
| VEND-D-07 | empresa | string | ❌ | Nombre del emprendimiento |
| VEND-D-08 | logo | string | ❌ | URL |
| VEND-D-09 | estado | enum | ✅ | pendiente, activo, inactivo, bloqueado |
| VEND-D-10 | ciudad_default | string | ✅ | Ciudad/localidad principal |
| VEND-D-11 | zona_entrega | string | ❌ | Zona/sector de entrega |
| VEND-D-12 | qr_token | string | ❌ | Unique |

#### CLIENTE (tabla separada de AUTH_USER)

| ID | Campo | Tipo | Requerido | Descripción |
|----|-------|------|-----------|-------------|
| CLI-D-01 | nombre | string | ✅ | |
| CLI-D-02 | apellido | string | ✅ | |
| CLI-D-03 | dni | string | ✅ | |
| CLI-D-04 | telefono | string | ✅ | |
| CLI-D-05 | tipo_factura | enum | ✅ | A, B o C |
| CLI-D-06 | direccion_calle | string | ✅ | Dirección fiscal |
| CLI-D-07 | direccion_numero | string | ✅ | |
| CLI-D-08 | direccion_piso | string | ❌ | |
| CLI-D-09 | direccion_referencia | string | ❌ | |
| CLI-D-10 | direccion_barrio | string | ❌ | |
| CLI-D-11 | direccion_ciudad | string | ✅ | |
| CLI-D-12 | direccion_provincia | string | ✅ | |
| CLI-D-13 | direccion_cp | string | ❌ | |
| CLI-D-14 | misma_direccion_entrega | boolean | ✅ | Default true. Si false, se usa entrega_* |
| CLI-D-15 | entrega_calle | string | ❌ | Solo si misma=false |
| CLI-D-16 | entrega_numero | string | ❌ | |
| CLI-D-17 | entrega_ciudad | string | ❌ | |
| CLI-D-18 | entrega_provincia | string | ❌ | |
| CLI-D-19 | entrega_piso/referencia/barrio/cp | string | ❌ | Opcionales |
| CLI-D-20 | vendedor_id | UUID | ✅ | FK a VENDEDOR |

---

## 3. Modelo de Datos (Prisma)

El modelo actual usa **Prisma ORM** con PostgreSQL. Las tablas del módulo auth+users son:

### Esquema Prisma (schema.prisma)

```prisma
model AuthUser {
  id                 String    @id @default(uuid()) @db.Uuid
  email              String    @unique @db.VarChar(255)
  password           String    @db.VarChar(255)
  role               UserRole
  refresh_token_hash String?   @db.VarChar(64)
  is_active          Boolean   @default(true)
  is_verified        Boolean   @default(false)
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt

  vendedor      Vendedor?
  cliente       Cliente?
  super_admin   SuperAdmin?
  audit_logs AuditLog[] @relation("AuditLogActor")

  @@map("AUTH_USER")
}

model Vendedor {
  id              String         @id @default(uuid()) @db.Uuid
  auth_user_id    String         @unique @db.Uuid
  auth_user       AuthUser       @relation(fields: [auth_user_id], references: [id])
  nombre          String         @db.VarChar(100)
  apellido        String         @default("") @db.VarChar(100)
  dni             String         @default("") @db.VarChar(8)
  cuil            String?        @db.VarChar(15)
  cuit            String?        @db.VarChar(15)
  telefono        String         @default("") @db.VarChar(20)
  empresa         String?        @db.VarChar(255)
  logo            String?        @db.VarChar(500)
  estado          VendedorEstado
  ciudad_default  String         @default("") @db.VarChar(100)
  zona_entrega    String?        @db.VarChar(100)
  qr_token        String?        @unique @db.VarChar(50)
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt

  clientes  Cliente[]
  cartera   Cartera[]    @relation("CarteraVendedor")
  qr_codes  QrCode[]
  links     LinkInvitacion[]

  @@map("VENDEDOR")
}

model Cliente {
  id                  String        @id @default(uuid()) @db.Uuid
  auth_user_id        String        @unique @db.Uuid
  auth_user           AuthUser      @relation(fields: [auth_user_id], references: [id])
  nombre              String        @db.VarChar(100)
  apellido            String        @default("") @db.VarChar(100)
  dni                 String        @default("") @db.VarChar(20)
  telefono            String        @default("") @db.VarChar(20)
  tipo_factura        TipoFactura   @default(B)

  direccion_calle       String   @default("") @db.VarChar(200)
  direccion_numero      String   @default("") @db.VarChar(20)
  direccion_piso        String?  @db.VarChar(20)
  direccion_referencia  String?  @db.VarChar(200)
  direccion_barrio      String?  @db.VarChar(100)
  direccion_ciudad      String   @default("") @db.VarChar(100)
  direccion_provincia   String   @default("") @db.VarChar(100)
  direccion_cp          String?  @db.VarChar(20)

  misma_direccion_entrega Boolean  @default(true)

  entrega_calle       String?  @db.VarChar(200)
  entrega_numero      String?  @db.VarChar(20)
  entrega_piso        String?  @db.VarChar(20)
  entrega_referencia  String?  @db.VarChar(200)
  entrega_barrio      String?  @db.VarChar(100)
  entrega_ciudad      String?  @db.VarChar(100)
  entrega_provincia   String?  @db.VarChar(100)
  entrega_cp          String?  @db.VarChar(20)

  latitud   Decimal? @db.Decimal(10, 7)
  longitud  Decimal? @db.Decimal(10, 7)

  vendedor_id    String    @db.Uuid
  vendedor       Vendedor  @relation(fields: [vendedor_id], references: [id])
  cartera        Cartera[] @relation("CarteraCliente")
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  @@map("CLIENTE")
}
```

### Diagrama de Relaciones

```
AUTH_USER
    │
    ├──► SUPER_ADMIN (1:1)
    │
    ├──► VENDEDOR (1:1)
    │       │
    │       ├──► RELACION_CARTERA ──► CLIENTE
    │       │
    │       ├──► QR_CODE
    │       └──► LINK_INVITACION
    │
    └──► CLIENTE (1:1)
            │
            └──► VENDEDOR (N:1 via vendedor_id)

AUDIT_LOG ──► AUTH_USER (actor)
```

---

## 4. Endpoints de API

### 4.1 AUTH - Autenticación

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Público | Login email + password → JWT |
| POST | `/api/auth/register` | Público | Registrar cliente (requiere qrToken) |
| POST | `/api/auth/register/vendedor` | Público | Autoregistro vendedor (queda pendiente) |
| POST | `/api/auth/refresh` | Usuario | Renovar JWT (rotación) |
| POST | `/api/auth/validate` | Público | Validar token |
| POST | `/api/auth/logout` | Usuario | Cerrar sesión (invalida refresh) |

### 4.2 SUPER ADMIN

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | `/api/super-admin/me` | SUPER_ADMIN | Perfil propio |
| PATCH | `/api/super-admin/me` | SUPER_ADMIN | Actualizar perfil |
| GET | `/api/super-admin/dashboard` | SUPER_ADMIN | Dashboard stats |
| GET | `/api/vendedores` | SUPER_ADMIN | Listar vendedores |
| GET | `/api/vendedores/:id` | SUPER_ADMIN | Ver vendedor |
| PATCH | `/api/vendedores/:id` | SUPER_ADMIN | Actualizar vendedor |
| PATCH | `/api/vendedores/:id/estado` | SUPER_ADMIN | Cambiar estado |
| GET | `/api/clientes` | SUPER_ADMIN | Listar clientes |
| GET | `/api/clientes/:id` | SUPER_ADMIN | Ver cliente |
| PATCH | `/api/clientes/:id` | SUPER_ADMIN | Actualizar cliente |
| PATCH | `/api/clientes/:id/reassign` | SUPER_ADMIN | Reasignar vendedor |

### 4.3 VENDEDOR

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | `/api/vendedores/me` | VENDEDOR | Mi perfil |
| PATCH | `/api/vendedores/me` | VENDEDOR | Actualizar mi perfil |
| GET | `/api/clientes/mios` | VENDEDOR | Mis clientes (cartera) |
| GET | `/api/clientes/mios/:id` | VENDEDOR | Detalle cliente propio |
| PATCH | `/api/clientes/mios/:id` | VENDEDOR | Actualizar cliente propio |
| POST | `/api/qr-codes` | VENDEDOR | Generar QR |
| GET | `/api/qr-codes` | VENDEDOR | Listar QR propios |
| POST | `/api/link-invitacion` | VENDEDOR | Generar link |
| GET | `/api/link-invitacion` | VENDEDOR | Listar links |

### 4.4 Users (perfil unificado)

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | `/api/users/profile` | Usuario | Perfil completo según rol |
| PATCH | `/api/users/profile` | Usuario | Actualizar perfil |

---

## 5. Flujo de Acceso

### 5.1 Registro Vendedor
1. VENDEDOR completa formulario con datos personales (nombre, apellido, dni, teléfono, ciudad)
2. Queda con estado `pendiente`
3. SUPER_ADMIN activa via `PATCH /api/vendedores/:id/estado`

### 5.2 Registro Cliente via QR
1. VENDEDOR genera QR (`POST /api/qr-codes`)
2. CLIENTE escanea QR, completa formulario con todos sus datos
3. Se crea AUTH_USER + CLIENTE con vendedor asignado
4. Se crea RELACION_CARTERA

---

## 6. Requerimientos No Funcionales

| ID | Requerimiento | Prioridad | Estado |
|----|--------------|----------|--------|
| RNF-01 | Passwords hasheadas con bcrypt (12 rounds) | Alta | ✅ |
| RNF-02 | JWT access 1d, refresh 7d con rotación | Alta | ✅ |
| RNF-03 | Aislamiento de datos por vendedor (cartera) | Alta | ✅ |
| RNF-04 | Validación de email único | Alta | ✅ |
| RNF-05 | Logs de auditoría en AUDIT_LOG | Alta | ✅ |
| RNF-06 | Refresh token con jti único (previene race conditions) | Alta | ✅ |

---

## 7. Seguridad

### 7.1 Protección de Cartera

- Un vendedor solo puede ver clientes donde `vendedor_id = su ID`
- Endpoints de vendedor usan `VendedorGuard` + `VendedorResolver`
- Todas las queries incluyen filtro por `vendedor_id`

### 7.2 Refresh Token Rotation

- Cada refresh genera un nuevo token con `jti` (UUID único)
- El hash SHA256 del refresh token se almacena en `AUTH_USER.refresh_token_hash`
- Al refrescar, se verifica el hash antes de emitir uno nuevo
- Previene reuso del mismo token aunque se llame en el mismo segundo
- Al hacer logout, el hash se limpia → todos los refresh tokens quedan inválidos

---

## 8. Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | Abril 2026 | Versión inicial (TypeORM, USER único) |
| 2.0 | Julio 2026 | Migración a Prisma, table splitting por rol, nuevos campos VENDEDOR/CLIENTE, entrega separada de facturación, refresh rotation, endpoints actualizados |

---

**Documento actualizado para desarrollo V1.0 MVP**  
**⚠️ La fuente de verdad de los tipos es `packages/contracts/src/` y el schema en `MicroServices/usuario-service/prisma/schema.prisma`**

_AguaFress - Módulo Auth + Users_  
_Julio 2026_
