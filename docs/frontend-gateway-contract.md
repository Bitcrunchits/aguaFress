# Contrato Frontend ↔ API Gateway

Esta guía es el punto de partida para que el frontend consuma el `api-gateway` sin adivinar rutas, roles ni payloads. El gateway expone un único patrón HTTP y traduce cada request a mensajes TCP hacia los microservicios.

## Camino rápido

1. Usar `http://localhost:3000/api` como base URL local.
2. Consumir endpoints con el patrón `/v1/{service}/{action}`.
3. Enviar `Authorization: Bearer <token>` solo en acciones protegidas.
4. Importar contratos desde `@agua/contracts` cuando el frontend esté dentro del monorepo.
5. Verificar rutas disponibles en Swagger: `http://localhost:3000/api/docs`.

## Base URL

| Entorno | Base URL | Docs |
|---------|----------|------|
| Local | `http://localhost:3000/api` | `http://localhost:3000/api/docs` |

El gateway usa prefijo global `/api`, por eso una acción completa queda así:

```txt
POST http://localhost:3000/api/v1/auth/login
```

## Patrón de endpoints

```txt
/{version}/{service}/{action}
```

| Segmento | Ejemplo | Descripción |
|----------|---------|-------------|
| `version` | `v1` | Versión pública del contrato HTTP. |
| `service` | `auth`, `users`, `vendedores`, `cart`, `orders` | Familia funcional que resuelve el gateway. |
| `action` | `login`, `profile/update` | Acción dentro de la familia. Puede tener subpath. |

Ejemplos:

```txt
POST  /api/v1/auth/login
POST  /api/v1/auth/register/vendedor
GET   /api/v1/users/profile
PATCH /api/v1/users/profile/update
GET   /api/v1/vendedores/list
```

## Métodos HTTP soportados

| Método | Uso |
|--------|-----|
| `GET` | Lecturas y consultas. |
| `POST` | Acciones de creación o comandos. |
| `PATCH` | Actualizaciones parciales. |
| `DELETE` | Acciones de borrado/cierre. |

El gateway rechaza `PUT`, `HEAD` y `OPTIONS` con `405 Method Not Allowed` para acciones `/api/v1/{service}/{action}`.

## Autenticación y roles

### Acciones públicas

Estas acciones NO requieren JWT:

| Método sugerido | Endpoint | Request | Response |
|-----------------|----------|---------|----------|
| `POST` | `/api/v1/auth/login` | `LoginRequest` | `LoginResponse` |
| `POST` | `/api/v1/auth/register` | `RegisterRequest` | `RegisterResponse` |
| `POST` | `/api/v1/auth/register/vendedor` | `RegisterVendedorRequest` | `RegisterVendedorResponse` |
| `POST` | `/api/v1/auth/refresh` | `RefreshTokenRequest` | `RefreshTokenResponse` |
| `POST` | `/api/v1/auth/validate` | `ValidateTokenRequest` | `ValidateTokenResponse` |

Importante: en acciones públicas el gateway no decodifica el JWT aunque se mande header `Authorization`. No depender de `user` en el backend para estas acciones.

### Acciones protegidas

Enviar siempre:

```http
Authorization: Bearer <token>
```

| Método sugerido | Endpoint | Rol requerido | Contrato relacionado |
|-----------------|----------|---------------|----------------------|
| `GET` | `/api/v1/auth/me` | Usuario autenticado | `UserProfile` |
| `POST`/`DELETE` | `/api/v1/auth/logout` | Usuario autenticado | `LogoutResponse` |
| `GET` | `/api/v1/users/profile` | Usuario autenticado | `UserProfile` |
| `PATCH` | `/api/v1/users/profile/update` | Usuario autenticado | `UpdateProfileRequest` |
| `GET` | `/api/v1/vendedores/profile` | Usuario autenticado | `VendedorResponse` / `UserProfile` |
| `PATCH` | `/api/v1/vendedores/profile/update` | Usuario autenticado | `UpdateProfileRequest` |
| `GET` | `/api/v1/clientes/list` | Usuario autenticado | `ClienteResponse[]` |
| `GET` | `/api/v1/clientes/cartera` | Usuario autenticado | `ClienteResponse[]` |
| `GET` | `/api/v1/orders/list` | Usuario autenticado | `OrderListResponse[]` |
| `GET` | `/api/v1/orders/get-by-id?id={orderId}` | Usuario autenticado | `OrderResponse` |

### Acciones protegidas por rol

| Método sugerido | Endpoint | Rol requerido |
|-----------------|----------|---------------|
| `GET` | `/api/v1/vendedores/list` | `super_admin` |
| `GET` | `/api/v1/super-admin/dashboard` | `super_admin` |
| `GET` | `/api/v1/super-admin/audit-log` | `super_admin` |
| `GET` | `/api/v1/super-admin/qr-codes` | `super_admin` |
| `GET` | `/api/v1/super-admin/link-invitacion` | `super_admin` |
| `GET` | `/api/v1/super-admin/vendedores` | `super_admin` |
| `GET` | `/api/v1/qr/vendor/list` | `vendedor` |
| `POST` | `/api/v1/qr/vendor/create` | `vendedor` |
| `GET` | `/api/v1/link-invitacion/vendor/list` | `vendedor` |
| `POST` | `/api/v1/link-invitacion/vendor/create` | `vendedor` |
| `GET` | `/api/v1/cart/get` | `cliente` |
| `POST` | `/api/v1/cart/items/add` | `cliente` |
| `PATCH` | `/api/v1/cart/items/update` | `cliente` |
| `DELETE` | `/api/v1/cart/items/delete` | `cliente` |
| `POST` | `/api/v1/orders/create` | `cliente` |
| `PATCH` | `/api/v1/orders/status/update` | `vendedor` |
| `POST` | `/api/v1/orders/cancel` | `cliente` |
| `POST` | `/api/v1/orders/confirm` | `vendedor` |

### Carrito y pedidos

El frontend debe consumir carrito y pedidos por el gateway; `orders-service` sigue siendo TCP-only y no expone HTTP público.

| Método sugerido | Endpoint gateway | TCP pattern | Request | Response |
|-----------------|------------------|-------------|---------|----------|
| `GET` | `/api/v1/cart/get` | `cart.get` | — | `CartResponse \| null` |
| `POST` | `/api/v1/cart/items/add` | `cart.items_add` | `AddCartItemRequest` | `CartResponse` |
| `PATCH` | `/api/v1/cart/items/update` | `cart.items_update` | `UpdateCartItemRequest` (`cartId`, `productoId`, `cantidad`) | `CartResponse` |
| `DELETE` | `/api/v1/cart/items/delete` | `cart.items_delete` | `{ cartId: string, productoId: string }` | `CartResponse` |
| `GET` | `/api/v1/orders/list` | `orders.list` | query filters | `OrderListResponse[]` |
| `GET` | `/api/v1/orders/get-by-id?id={orderId}` | `orders.get_by_id` | query `id` | `OrderResponse` |
| `POST` | `/api/v1/orders/create` | `orders.create` | `CreateOrderRequest` | `OrderResponse` |
| `PATCH` | `/api/v1/orders/status/update` | `orders.status_update` | `UpdateOrderStatusRequest` + `id` | `OrderResponse` |
| `POST` | `/api/v1/orders/cancel` | `orders.cancel` | `CancelOrderRequest` + `id` | `OrderResponse` |
| `POST` | `/api/v1/orders/confirm` | `orders.confirm` | `ConfirmOrderRequest` + `id` | `OrderResponse` |

Regla de identidad: nunca mandar ni confiar en `userId` dentro del body. El gateway remueve `userId` del payload HTTP —incluyendo cuerpos `DELETE`— y reenvía la identidad confiable desde el JWT en `payload.user`. Las acciones de ciclo de vida del pedido (`orders.status_update` y `orders.confirm`) son acciones de `vendedor`; `orders.cancel` sigue siendo de `cliente` y solo permite cancelar pedidos propios en estado `pendiente`.

Mientras products-service no tenga un adaptador real para snapshots, solo los comandos que dependen de productos (`cart.items_add`, `cart.items_update` y `orders.create`) pueden responder `503 Service Unavailable` controlado desde orders-service. Las lecturas, borrado de items y acciones de estado no dependen del catálogo y no deben tratarse como servicio completo no disponible. El frontend debe mostrar una recuperación clara y no asumir que el precio del body será aceptado.

## Servicios planificados pero no disponibles

Estas familias existen en el mapa del gateway, pero hoy responden `503 Service Unavailable` porque todavía no están desplegadas detrás del gateway:

- `products`
- `categories`
- `brands`
- `deliveries`
- `activity-logs`

El frontend no debería construir pantallas productivas contra estas rutas hasta que pasen a estado disponible.

## Ejemplos de integración

### Login

```ts
import type { LoginRequest, LoginResponse } from '@agua/contracts';

const body: LoginRequest = {
  email: 'vendedor@agua.com',
  password: 'secret',
};

const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (!response.ok) {
  throw new Error(`Login failed: ${response.status}`);
}

const session: LoginResponse = await response.json();
```

### Perfil autenticado

```ts
import type { UserProfile } from '@agua/contracts';

const response = await fetch('http://localhost:3000/api/v1/users/profile', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

if (response.status === 401) {
  // Redirigir a login o refrescar token.
}

const profile: UserProfile = await response.json();
```

### Actualización de perfil

```ts
import type { UpdateProfileRequest } from '@agua/contracts';

const body: UpdateProfileRequest = {
  nombre: 'Ada',
  telefono: '1122334455',
};

await fetch('http://localhost:3000/api/v1/users/profile/update', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});
```

## Manejo de errores esperado

| Status | Causa probable | Acción recomendada en frontend |
|--------|----------------|--------------------------------|
| `401` | Falta JWT o token inválido. | Refrescar sesión o volver a login. |
| `403` | Rol insuficiente. | Mostrar pantalla de acceso denegado. |
| `404` | Service/action no mapeado. | Revisar endpoint; no reintentar automáticamente. |
| `405` | Método HTTP no soportado. | Corregir método usado por el cliente. |
| `413` | Body supera el límite permitido. | Reducir payload/archivo antes de reenviar. |
| `503` | Familia planificada no desplegada, o comando de carrito/pedido dependiente de productos sin adaptador de catálogo disponible. | Ocultar feature o mostrar “no disponible”; no asumir indisponibilidad total de carrito/pedidos. |
| `504` | Timeout del microservicio destino. | Mostrar retry controlado. |

## Headers recomendados

| Header | Cuándo usarlo | Nota |
|--------|---------------|------|
| `Content-Type: application/json` | Requests con body. | Obligatorio en `POST`/`PATCH` JSON. |
| `Authorization: Bearer <token>` | Acciones protegidas. | No hace falta en acciones públicas. |
| `x-request-id` | Debug/tracing opcional. | Si no se manda, el gateway genera uno. |

## Checklist para el frontend

- [ ] Configurar `API_BASE_URL=http://localhost:3000/api` en entorno local.
- [ ] Crear un cliente HTTP que agregue JWT solo en rutas protegidas.
- [ ] Centralizar manejo de `401`, `403`, `503` y `504`.
- [ ] Importar DTOs desde `@agua/contracts` si el frontend vive en el monorepo.
- [ ] No consumir familias marcadas como no disponibles.
- [ ] Validar roles de UI contra `UserRole` del token/perfil, no con strings sueltos.

## Referencias de código

- Gateway registry: `MicroServices/gateway/src/actions/action-registry.ts`
- Bootstrap HTTP/Swagger/CORS: `MicroServices/gateway/src/main.ts`
- Contratos compartidos: `packages/contracts/src/index.ts`
- Auth DTOs: `packages/contracts/src/dto/auth.dto.ts`
- User DTOs: `packages/contracts/src/dto/user.dto.ts`
