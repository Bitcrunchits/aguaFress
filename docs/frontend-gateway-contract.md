# Contrato Frontend ↔ API Gateway

Esta guía es el punto de partida para que el frontend consuma el `api-gateway` sin adivinar rutas, roles ni payloads. El gateway expone un único patrón HTTP: usa TCP para operaciones inmediatas y Redis + BullMQ para comandos críticos asíncronos que no deben perderse.

## Camino rápido

1. Usar `http://localhost:3000/api` como base URL local.
2. Consumir endpoints con el patrón `/v1/{service}/{action}`.
3. Enviar `Authorization: Bearer <token>` solo en acciones protegidas.
4. Importar contratos desde `@agua/contracts` cuando el frontend esté dentro del monorepo.
5. Para comandos async, enviar `idempotencyKey` y esperar `202 Accepted` con `jobId` y `trackingId`.
6. Verificar rutas disponibles en Swagger: `http://localhost:3000/api/docs`.

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
POST  /api/v1/auth/register
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

## Transporte y resiliencia

| Camino | Cuándo se usa | Qué debe hacer el frontend |
|--------|---------------|----------------------------|
| TCP síncrono | Login, perfil, validaciones, lecturas simples y acciones que requieren respuesta inmediata. | Esperar respuesta directa. Si el MS está caído, manejar `503` o `504`; no asumir que quedó en cola. |
| Redis + BullMQ asíncrono | Comandos críticos que no deben perderse y pueden esperar segundos, empezando por creación de órdenes. | Enviar `idempotencyKey`, recibir `202 Accepted` con `jobId`/`trackingId` y consultar estado. |

Kafka no forma parte de esta solución de resiliencia. Para este problema se usa Redis + BullMQ porque el objetivo es conservar jobs y reintentarlos cuando el worker vuelva.

## Autenticación y roles

### Acciones públicas

Estas acciones NO requieren JWT:

| Método sugerido | Endpoint | Request | Response |
|-----------------|----------|---------|----------|
| `POST` | `/api/v1/auth/login` | `LoginRequest` | `LoginResponse` |
| `POST` | `/api/v1/auth/register` | `RegisterRequest` | `RegisterResponse` |
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

El frontend debe consumir carrito y pedidos por el gateway; `orders-service` no expone HTTP público. Las lecturas y acciones inmediatas siguen por TCP interno; la creación de órdenes pasa a ser el piloto async con Redis + BullMQ.

| Método sugerido | Endpoint gateway | Transporte | Request | Response |
|-----------------|------------------|------------|---------|----------|
| `GET` | `/api/v1/cart/get` | TCP `cart.get` | — | `CartResponse \| null` |
| `POST` | `/api/v1/cart/items/add` | TCP `cart.items_add` | `AddCartItemRequest` | `CartResponse` |
| `PATCH` | `/api/v1/cart/items/update` | TCP `cart.items_update` | `UpdateCartItemRequest` (`cartId`, `productoId`, `cantidad`) | `CartResponse` |
| `DELETE` | `/api/v1/cart/items/delete` | TCP `cart.items_delete` | `{ cartId: string, productoId: string }` | `CartResponse` |
| `GET` | `/api/v1/orders/list` | TCP `orders.list` | query filters | `OrderListResponse[]` |
| `GET` | `/api/v1/orders/get-by-id?id={orderId}` | TCP `orders.get_by_id` | query `id` | `OrderResponse` |
| `POST` | `/api/v1/orders/create` | BullMQ `orders.create` | `CreateOrderRequest` + `idempotencyKey` | `202 Accepted` + `AsyncAcceptedResponse` |
| `GET` | `/api/v1/orders/job-status?id={trackingId}` | TCP `orders.job_status` | query `id` | `OrderJobStatusResponse` |
| `PATCH` | `/api/v1/orders/status/update` | TCP `orders.status_update` | `UpdateOrderStatusRequest` + `id` | `OrderResponse` |
| `POST` | `/api/v1/orders/cancel` | TCP `orders.cancel` | `CancelOrderRequest` + `id` | `OrderResponse` |
| `POST` | `/api/v1/orders/confirm` | TCP `orders.confirm` | `ConfirmOrderRequest` + `id` | `OrderResponse` |

Regla de identidad: nunca mandar ni confiar en `userId`, `clienteId` o `vendedorId` dentro del body para autenticación. `userId` siempre es `AUTH_USER.id` desde JWT `sub`; `clienteId`/`vendedorId` son IDs de perfil de dominio salvo compatibilidad documentada. En carrito/pedidos V1, los campos públicos legacy `clienteId`/`usuario_id` representan `clienteUserId` (`AUTH_USER.id`) hasta una migración V2. El gateway remueve identidad enviada por body y reenvía la identidad confiable desde el JWT en `payload.user`. Las acciones de ciclo de vida del pedido (`orders.status_update` y `orders.confirm`) son acciones de `vendedor`; `orders.cancel` sigue siendo de `cliente` y solo permite cancelar pedidos propios en estado `pendiente`.

Mientras products-service no tenga un adaptador real para snapshots, los comandos síncronos que dependen de productos (`cart.items_add` y `cart.items_update`) pueden responder `503 Service Unavailable` controlado desde orders-service. En `orders.create`, el gateway acepta el comando async si el payload es válido; el worker de `orders-service` resuelve la dependencia y refleja el resultado final en el estado del job. El frontend debe mostrar tracking claro y no asumir que el precio del body será aceptado.

### Respuesta async de creación de orden

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
```

```json
{
  "jobId": "bullmq-job-id",
  "trackingId": "public-tracking-id",
  "status": "PENDING"
}
```

Estados esperados: `PENDING`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`, `DEAD_LETTER`.

## Estado real del gateway para frontend

El frontend debe consumir la API terminada desde el `api-gateway`. Según el registry vigente, estas familias están disponibles:

| Familia | Estado | Uso principal en frontend |
|---------|--------|---------------------------|
| `auth` | Disponible | Login, refresh, logout, cambio/reset de contraseña, registro de cliente. |
| `users` | Disponible | Perfil del usuario autenticado. |
| `vendedores` | Disponible | Perfil/listado/estado de vendedores. |
| `clientes` | Disponible | Cartera, proveedores, actualización y reasignación de clientes. |
| `super-admin` | Disponible | Dashboard, auditoría, QR, links de invitación y vendedores. |
| `qr` | Disponible | QR de vendedores y desactivación admin/vendor. |
| `link-invitacion` | Disponible | Links de invitación de vendedores y desactivación admin/vendor. |
| `products` | Disponible | Listado, búsqueda, detalle, creación, edición y borrado de productos. |
| `categories` | Disponible | Categorías del catálogo. |
| `brands` | Disponible | Marcas del catálogo. |
| `orders` | Disponible | Listado, detalle, creación async y ciclo de vida de órdenes. |
| `cart` | Disponible | Carrito del cliente. |
| `deliveries` | Disponible | Entregas y actualización async de estado. |
| `activity-logs` | Disponible | Auditoría para `super_admin`. |

Si una ruta responde `503`, tratarlo como indisponibilidad operativa o dependencia caída, no como “servicio no implementado”. El frontend ya no debe bloquear pantallas productivas asumiendo que `products`, `categories`, `brands`, `deliveries` o `activity-logs` son futuros.

## Estado actual del frontend web

| Área | Estado | Qué falta |
|------|--------|-----------|
| Login/session | Base implementada | Validar contra usuarios seed reales y cubrir recuperación/reset en flujo visual completo. |
| API client | Base implementada con Axios, JWT y refresh | Alinear `VITE_API_URL` con `/api/v1`, tipar servicios por dominio y centralizar errores por pantalla. |
| Rutas vendedor/admin | Navegación base implementada | Reemplazar placeholders por pantallas conectadas a endpoints reales. |
| Rutas cliente | Muy incompleto | Catálogo, carrito, pedidos, proveedores y selección de vendedor. |
| Productos | Placeholder | Consumir `products`, `categories`, `brands`; implementar toggle precio final/precio sin IVA. |
| Órdenes/carrito | Placeholder | Manejar creación async con `Idempotency-Key`, `202 Accepted` y polling por `trackingId`. |
| QR/links invitación | Placeholder | Conectar `qr` y `link-invitacion`; registro de cliente por invitación. |
| Super admin | Dashboard base | Conectar dashboard, auditoría, vendedores, QR y links desde `super-admin`. |

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
| `409` | `idempotencyKey` duplicada con payload incompatible. | No reintentar automáticamente; revisar estado del comando original. |
| `413` | Body supera el límite permitido. | Reducir payload/archivo antes de reenviar. |
| `503` | Familia planificada no desplegada o camino TCP síncrono con dependencia caída. | Ocultar feature o mostrar “no disponible”; no asumir que fue encolado. |
| `504` | Timeout del microservicio destino. | Mostrar retry controlado. |

## Headers recomendados

| Header | Cuándo usarlo | Nota |
|--------|---------------|------|
| `Content-Type: application/json` | Requests con body. | Obligatorio en `POST`/`PATCH` JSON. |
| `Authorization: Bearer <token>` | Acciones protegidas. | No hace falta en acciones públicas. |
| `Idempotency-Key` | Comandos async críticos como creación de orden. | Debe ser estable por intento lógico del usuario. |
| `x-request-id` | Debug/tracing opcional. | Si no se manda, el gateway genera uno. |

## Checklist para el frontend

- [ ] Configurar `API_BASE_URL=http://localhost:3000/api` en entorno local.
- [ ] Crear un cliente HTTP que agregue JWT solo en rutas protegidas.
- [ ] Centralizar manejo de `401`, `403`, `503` y `504`.
- [ ] Para comandos async, enviar `Idempotency-Key` y manejar `202 Accepted`.
- [ ] Consultar `trackingId` hasta estado terminal antes de mostrar la orden como confirmada.
- [ ] Importar DTOs desde `@agua/contracts` si el frontend vive en el monorepo.
- [ ] No consumir familias marcadas como no disponibles.
- [ ] Validar roles de UI contra `UserRole` del token/perfil, no con strings sueltos.

## Referencias de código

- Gateway registry: `MicroServices/gateway/src/actions/action-registry.ts`
- Bootstrap HTTP/Swagger/CORS: `MicroServices/gateway/src/main.ts`
- Contratos compartidos: `packages/contracts/src/index.ts`
- Auth DTOs: `packages/contracts/src/dto/auth.dto.ts`
- User DTOs: `packages/contracts/src/dto/user.dto.ts`
