# AguaFress - Módulo Auth + Users

## Documentación de Requerimientos

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Equipo:** AguaFress Development  
**Módulo:** Autenticación y Gestión de Usuarios

---

## 1. Resumen del Proyecto

**AguaFress** es una plataforma marketplace que conecta vendedores y consumidores de agua/soda, con aislamiento de cartera por vendedor (cada uno maneja sus propios clientes).

### Modelo de Acceso

- **ADMIN** (nosotros): Acceso total, crea usuarios y asigna vendedores
- **VENDEDOR**: Solo ve SUS clientes, productos y pedidos
- **CLIENTE**: Solo ve SU vendedor asignado

---

## 2. Requerimientos Funcionales

### 2.1 Autenticación (AUTH)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|----------|-------------|
| AUTH-01 | Registro de usuarios | Alta | Solo admins pueden crear usuarios |
| AUTH-02 | Login con email/password | Alta | Inicio de sesión tradicional |
| AUTH-03 | Login con Google OAuth | Alta | Inicio de sesión con cuenta Google |
| AUTH-04 | Recuperación de contraseña | Media | Reset de password por email |
| AUTH-05 | Renovación de token | Alta | Refresh JWT para mantener sesión |
| AUTH-06 | Cierre de sesión | Media | Invalidar token |

### 2.2 Gestión de Perfiles (USERS)

| ID | Requerimiento | Prioridad | Descripción |
|----|--------------|----------|-------------|
| PERF-01 | Ver mi perfil | Alta | Usuario autenticado ve sus datos |
| PERF-02 | Actualizar mi perfil | Alta | Usuario modifica sus datos |
| PERF-03 | Ver listado de usuarios | ADMIN | Listar todos los usuarios |
| PERF-04 | Ver usuario específico | ADMIN | Detalle de un usuario |
| PERF-05 | Actualizar usuario | ADMIN | Modificar usuario desde admin |
| PERF-06 | Eliminar usuario | ADMIN | Baja lógica de usuario |
| PERF-07 | Asignar cliente a vendedor | ADMIN | Relación cliente-vendedor |
| PERF-08 | Cambiar rol de usuario | ADMIN | admin/vendedor/cliente |

### 2.3 Datos del Perfil

| ID | Campo | Tipo | Requerido | Descripción |
|----|-------|------|----------|-------------|
| PERF-D-01 | email | string | Sí | Email único del usuario |
| PERF-D-02 | password | string | Sí | Contraseña hasheada |
| PERF-D-03 | rol | enum | Sí | admin/vendedor/cliente |
| PERF-D-04 | nombre | string | Parcial | Nombre del usuario |
| PERF-D-05 | apellido | string | Parcial | Apellido del usuario |
| PERF-D-06 | dni | string | Parcial | Documento nacional de identidad |
| PERF-D-07 | telefono | string | Parcial | Teléfono de contacto |
| PERF-D-08 | direccionEntrega | string | Parcial | Dirección de entrega |
| PERF-D-09 | ciudadEntrega | string | Parcial | Ciudad de entrega |
| PERF-D-10 | provinciaEntrega | string | Parcial | Provincia de entrega |
| PERF-D-11 | cpEntrega | string | Parcial | Código postal |
| PERF-D-12 | direccionFacturacion | string | Parcial | Dirección de facturación |
| PERF-D-13 | tipoFactura | enum | Parcial | B o C |
| PERF-D-14 | isActive | boolean | Sí | Usuario activo/inactivo |
| PERF-D-15 | isVerified | boolean |Sí | Email verificado |

---

## 3. Modelo de Datos

### 3.1 Entidad USER

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENTE })
  role: UserRole;

  // Datos personales
  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  apellido: string;

  @Column({ nullable: true })
  dni: string;

  @Column({ nullable: true })
  telefono: string;

  // Dirección de entrega
  @Column({ nullable: true })
  direccionEntrega: string;

  @Column({ nullable: true })
  ciudadEntrega: string;

  @Column({ nullable: true })
  provinciaEntrega: string;

  @Column({ nullable: true })
  cpEntrega: string;

  // Facturación
  @Column({ nullable: true })
  direccionFacturacion: string;

  @Column({ type: 'enum', enum: TipoFactura, nullable: true })
  tipoFactura: TipoFactura;

  // Relaciones
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: User;

  @OneToMany(() => User, (user) => user.vendedor)
  clientes: User[];

  // Estado
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Enums
export enum UserRole {
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
  CLIENTE = 'cliente'
}

export enum TipoFactura {
  B = 'B',
  C = 'C'
}
```

### 3.2 Diagrama de Relaciones

```
┌─────────────────────────────────────────────────┐
│                    USER                          │
├─────────────────────────────────────────────────┤
│                                                 │
│   ADMIN (nosotros)                               │
│       │                                         │
│       ├──► VENDEDOR 1 ──► [Clientes 1..n]      │
│       │        │              │                  │
│       │        │              └── Cliente A     │
│       │        │              └── Cliente B     │
│       │        │              └── Cliente C     │
│       │        │                                 │
│       ├──► VENDEDOR 2 ──► [Clientes 1..n]      │
│       │        │              │                  │
│       │        │              └── Cliente X     │
│       │        │              └── Cliente Y     │
│       │        │                                 │
│       └──► VENDEDOR 3 ──► [Clientes 1..n]      │
│                                                │
│   ⚠️ AISLAMiento:                              │
│   - Vendedor 1 NO ve clientes de Vendedor 2     │
│   - Cliente A NO ve otros vendedores           │
│   - Cada quien solo ve SU ámbito               │
└─────────────────────────────────────────────────┘
```

---

## 4. Endpoints de API

### 4.1 AUTH - Autenticación

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | /auth/login | Público | Login email + password |
| POST | /auth/register | ADMIN | Crear nuevo usuario |
| POST | /auth/google | Público | Login con Google |
| POST | /auth/refresh | Usuario | Renovar JWT |
| POST | /auth/logout | Usuario | Cerrar sesión |

### 4.2 USERS - Gestión de Usuarios

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /users/me | Usuario | Mi perfil actual |
| PATCH | /users/me | Usuario | Actualizar mi perfil |
| GET | /users | ADMIN | Listar todos |
| GET | /users/:id | ADMIN | Ver uno |
| PATCH | /users/:id | ADMIN | Actualizar uno |
| DELETE | /users/:id | ADMIN |Eliminar uno |
| PATCH | /users/:id/asignar-vendedor | ADMIN | Asignar a vendedor |
| PATCH | /users/:id/activar | ADMIN | Activar usuario |
| PATCH | /users/:id/desactivar | ADMIN | Desactivar usuario |

### 4.3 USERS - Relación Vendedor-Cliente

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | /users/mis-clientes | VENDEDOR | Ver mis clientes |
| GET | /users/mi-vendedor | CLIENTE | Ver mi vendedor |
| GET | /users/vendedor/:id/clientes | ADMIN | Ver clientes de vendedor |

---

## 5. Flujo de Acceso

### 5.1 Diagrama de Flujo

```
┌──────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  FASE 1: AUTH                                                 │
│  ┌────────────────┐                                           │
│  │ POST /auth    │                                           │
│  │ /login       │──── OK ───► JWT Token                       │
│  │              │                                           │
│  │ email + pass  │                                           │
│  └──────────────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  FASE 2: PROFILE                                            │
│  ┌──────────────────────────────────────────┐               │
│  │ GET /users/me                          │               │
│  │     │                                 │               │
│  │  Perfil completo?                      │               │
│  │     │                             │               │
│  │   SÍ                            NO           │               │
│  │     │                             │               │
│  │     ▼                             ▼               │
│  │ acceso completo           completar datos         │
│  │ (JWT con datos          (PATCH /users/me)       │
│  │  completas)                                │               │
│  └──────────────────────────────────────────┘               │
│         │                                                    │
│         ▼                                                    │
│  FASE 3: ACCESO POR ROL                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   ADMIN    │   │  VENDEDOR  │   │  CLIENTE   │        │
│  │ (nosotros) │   │  (owner)  │   │(asignado) │        │
│  └─────┬─────┘   └─────┬─────┘   └─────┬─────┘        │
│       │               │               │                    │
│       ▼               ▼               ▼                    │
│  Ve TODO      ▼────────────    ▼────────────           │
│              │ Mis clientes│  Solo MI vendedor         │
│              │ Mis productos  │                         │
│              │ Mis pedidos   │                         │
│              │ Dashboard    │                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Requerimientos No Funcionales

| ID | Requerimiento | Prioridad |
|----|--------------|----------|
| RNF-01 | Passwords hasheadas con bcrypt | Alta |
| RNF-02 | JWT con expiración de 24h | Alta |
| RNF-03 | Aislamiento de datos por vendedor | Alta |
| RNF-04 | Validación de email único | Alta |
| RNF-05 | Logs de autenticación en MongoDB | Media |

---

## 7. Consideraciones de Seguridad

### 7.1 Protección de Cartera

- Un vendedor solo puede ver registros donde `vendedor_id = currentUser.id`
- Un cliente solo puede ver su propio vendedor
- Todas las queries deben incluir filtro por relación

### 7.2 Políticas de Acceso

- Solo ADMIN puede crear usuarios
- Login retorna token JWT con rol y datos básicos
- Rutas protegidas con Guards por rol

---

## 8. Dependencias Técnicas

| Paquete | Versión | Uso |
|---------|--------|-----|
| @nestjs/passport | ^10.0 | Autenticación |
| passport | ^0.7 | Strategy local |
| passport-jwt | ^4.0 | JWT strategy |
| passport-google-oauth20 | ^2.0 | Google OAuth |
| bcrypt | ^5.0 | Hash de passwords |
| class-validator | ^0.14 | Validación DTOs |
| class-transformer | ^0.5 | Transformación DTOs |

---

## 9. Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | Abril 2026 | Versión inicial del documento |

---

**Documento preparado para presentación al equipo**

_AguaFress - Módulo Auth + Users_  
_Febrero 2026_