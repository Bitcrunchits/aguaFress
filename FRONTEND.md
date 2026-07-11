# AguaFress API — Guía para Frontend

## Cómo Levantar

```bash
# Terminal 1 — Infraestructura (PostgreSQL + Redis)
docker compose up -d

# Terminal 2 — Microservicio (usuario-service, TCP 3011)
pnpm --filter @agua/usuario-service dev

# Terminal 3 — API Gateway (HTTP 3000, con docs incluidas)
pnpm --filter @agua/gateway dev
```

> ⚠️ El gateway necesita el usuario-service corriendo para que los endpoints respondan.  
> La documentación se ve igual aunque el service no esté corriendo.

## Base URL

```
http://localhost:3000/api/v1/{service}/{action}
```

## Documentación Interactiva

Una vez que el gateway está levantado, abrí en el navegador:
```
http://localhost:3000/api/docs
```

Ahí están TODOS los endpoints con:
- Método HTTP (GET, POST, PATCH)
- Parámetros que acepta cada uno
- Schema del body (para POST/PATCH)
- Schema de la respuesta
- Botón **"Try it"** para probar desde el navegador
- Roles requeridos (super_admin, vendedor)

Si querés importar en Insomnia/Postman, usá:
```
http://localhost:3000/api/openapi.json
```

## Autenticación

1. **Login**: `POST /api/v1/auth/login` con `{ email, password }`
2. Te devuelve: `{ token, refreshToken, user }`
3. Mandás el token en cada request: `Authorization: Bearer <token>`

Los endpoints públicos (login, register) no necesitan token. El resto sí.

## Endpoints Rápidos

### Públicos
| Qué | Cómo |
|-----|------|
| Login | `POST /api/v1/auth/login` → `{ email, password }` |
| Register | `POST /api/v1/auth/register` → `{ email, password, nombre, telefono, ciudad }` |
| Refresh token | `POST /api/v1/auth/refresh` → `{ refreshToken }` |

### Perfil propio (con JWT)
| Qué | Cómo |
|-----|------|
| Mi perfil | `GET /api/v1/users/profile` |
| Editar perfil | `PATCH /api/v1/users/profile/update` → body con campos a cambiar |

### Vendedores (super_admin)
| Qué | Cómo |
|-----|------|
| Listar vendedores | `GET /api/v1/vendedores/list` |
| Ver vendedor | `GET /api/v1/vendedores/get-by-id?id=uuid` |
| Editar vendedor | `PATCH /api/v1/vendedores/update?id=uuid` |
| Cambiar estado | `PATCH /api/v1/vendedores/change-estado?id=uuid` → `{ estado: "activo" }` |

### Vendedor (mi perfil)
| Qué | Cómo |
|-----|------|
| Mi perfil | `GET /api/v1/vendedores/profile` |
| Editar perfil | `PATCH /api/v1/vendedores/profile/update` |

### Clientes (super_admin)
| Qué | Cómo |
|-----|------|
| Listar | `GET /api/v1/clientes/list` |
| Ver cliente | `GET /api/v1/clientes/get-by-id?id=uuid` |
| Editar | `PATCH /api/v1/clientes/update?id=uuid` |
| Reasignar | `PATCH /api/v1/clientes/reassign?id=uuid` → `{ vendedorId: "uuid" }` |

### Clientes (vendedor)
| Qué | Cómo |
|-----|------|
| Mi cartera | `GET /api/v1/clientes/cartera` |
| Ver cliente | `GET /api/v1/clientes/own/get-by-id?id=uuid` |
| Editar | `PATCH /api/v1/clientes/own/update?id=uuid` |

### QR Codes (admin)
| Qué | Cómo |
|-----|------|
| Listar QR de vendedor | `GET /api/v1/super-admin/qr-codes?vendedorId=uuid` |
| Desactivar QR | `PATCH /api/v1/qr/admin/deactivate?id=uuid` |

### QR Codes (vendedor)
| Qué | Cómo |
|-----|------|
| Mis QR | `GET /api/v1/qr/vendor/list` |
| Crear QR | `POST /api/v1/qr/vendor/create` |
| Desactivar | `PATCH /api/v1/qr/vendor/deactivate?id=uuid` |

### Super Admin
| Qué | Cómo |
|-----|------|
| Dashboard | `GET /api/v1/super-admin/dashboard` |
| Mi perfil | `GET /api/v1/super-admin/profile` |
| Editar perfil | `PATCH /api/v1/super-admin/profile/update` |
| Audit logs | `GET /api/v1/super-admin/audit-log` |

## Paginación

Los endpoints de listas aceptan `?page=1&limit=20` y devuelven:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## IDs en Parámetros

Los IDs van como **query params**, no en la ruta:
```
✅ GET /api/v1/vendedores/get-by-id?id=550e8400-e29b-41d4-a716-446655440000
❌ GET /api/v1/vendedores/550e8400-e29b-41d4-a716-446655440000
```

## Tipos de Datos

Todos los DTOs están en `@agua/contracts` (`packages/contracts/src/dto/`). Los principales:

| DTO | Archivo |
|-----|---------|
| Login/Register/Refresh | `auth.dto.ts` |
| Perfiles de usuario | `user.dto.ts` |
| Paginación | `common.dto.ts` |
| Super admin | `super-admin.dto.ts` |
| Productos | `products.dto.ts` |
| Pedidos | `orders.dto.ts` |
| Entregas | `deliveries.dto.ts` |

## Enums

| Enum | Valores |
|------|---------|
| `UserRole` | `super_admin`, `vendedor`, `cliente` |
| `VendedorEstado` | `pendiente`, `activo`, `inactivo`, `bloqueado` |
| `TipoFactura` | `A`, `B`, `C` |

## Notas

- El gateway corre en **puerto 3000**. Los microservicios NO tienen HTTP directo.
- Todos los endpoints protegidos devuelven `401` sin JWT y `403` si el rol no coincide.
- Fechas siempre en **ISO 8601**.
- Errores siguen el formato `{ statusCode, message, error? }`.
