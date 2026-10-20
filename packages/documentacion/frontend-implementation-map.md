# Mapa de implementación frontend AguaFress

Este mapa es suficiente para arrancar el **core Angular, autenticación, sesión, layout base y primer flujo end-to-end**. Para llamar al frontend “completo” con bajo riesgo todavía faltan especificaciones por pantalla/formulario: reglas de validación finas, copy definitivo, diseño visual final, permisos de acciones por pantalla y criterios QA por feature.

## 1. Decisión y fuente de verdad

| Tema | Decisión operativa |
| --- | --- |
| Frontend objetivo | Angular + Tailwind + PrimeNG + Heroicons. Angular Material/ng-bootstrap solo si existe necesidad concreta no cubierta. |
| API pública | El frontend consume únicamente el gateway. Target actual VPS: `https://api-aguafress.eadev.cloud/api/v1/{service}/{action}`. Si los servicios corren localmente, `http://localhost:3000/api/v1/{service}/{action}` queda como alternativa local/dev. |
| Config frontend | `packages/frontend/src/environments/environment.ts` y `environment.development.ts` definen `apiBaseUrl`; los servicios deben consumir `src/app/core/config/api.config.ts` para no depender de environments en cada feature. |
| Docs vivas | Confirmar endpoints en Scalar `https://api-aguafress.eadev.cloud/api/docs` u OpenAPI `https://api-aguafress.eadev.cloud/api/openapi.json` antes de implementar cada feature. Alternativa local/dev: `http://localhost:3000/api/docs` y `http://localhost:3000/api/openapi.json` si el gateway corre local. |
| Roles literales | Usar exactamente `super_admin`, `vendedor`, `cliente`. No inventar aliases sin mapeo explícito. |
| Identidad | No enviar `userId` en body para identidad JWT. El actor sale del token; `clienteId` y `vendedorId` son IDs de perfiles de dominio. |
| Cliente-proveedor | No asumir un único vendedor por cliente. El cliente puede tener proveedores activos y debe operar con proveedor seleccionado. |
| Async | `orders.create` y `deliveries.update-status` devuelven `202` con `jobId`/`trackingId`; la UI debe consultar el `job-status` correspondiente con `id={trackingId}`. |

Fuentes verificadas: `readme.md`, `SPEC.md`, `packages/documentacion/Aguafress_Arquitectura_Frontend_UX_UI_v2_API_REAL.docx`, `MicroServices/gateway/src/actions/action-registry.ts`, `MicroServices/gateway/src/docs/openapi-spec.service.ts`, `MicroServices/gateway/src/gateway.controller.ts`, `MicroServices/gateway/test/gateway.http.spec.ts`, `packages/contracts/src/dto/deliveries.dto.ts`.

Limitación de validación: no se levantaron Docker ni servicios externos. No se obtuvo OpenAPI vivo desde `https://api-aguafress.eadev.cloud/api/openapi.json` ni desde `http://localhost:3000/api/openapi.json`; la evidencia usada es código fuente local. Además, `deliveries.*` y `activity-logs.*` están en `action-registry.ts`, pero no aparecen en `ACTIONS_DOC` de `openapi-spec.service.ts`; por eso quedan marcados como gap de OpenAPI generado aunque las rutas estén registradas en gateway. CORS y credenciales seed del VPS siguen pendientes de verificación.

Contradicciones detectadas para no arrastrar al frontend:

- `vendedores/change-estado`: el schema vigente documenta `activo | inactivo | bloqueado`; no usar `aprobado` aunque aparezca en una receta textual obsoleta.
- Algunas acciones tienen rol documentado en OpenAPI, pero `action-registry.ts` solo declara `authRequired` sin `roles` (`clientes.list`, `clientes.cartera`, `vendedores.profile`, `vendedores.profile/update`). Implementar la UI por rol funcional, pero verificar autorización real en OpenAPI vivo/pruebas antes de cerrar QA.

## 2. Orden recomendado de implementación

### Hito 1 — Base navegable y segura

- [ ] Crear proyecto Angular y estructura feature-based.
- [ ] Integrar Tailwind, tokens visuales, light/dark y layout responsive.
- [ ] Integrar PrimeNG y Heroicons sin duplicar librerías UI.
- [ ] Crear `core/auth`, `core/session`, `core/http`, `core/errors`, guards e interceptors.
- [ ] Implementar `AuthService`, `SessionService`, `AuthInterceptor`, `ErrorInterceptor`.
- [ ] Implementar login real, refresh, logout, profile y redirección por rol.
- [ ] Activar `AuthGuard` y `RoleGuard` con roles reales.

### Hito 2 — Layouts y navegación por rol

- [ ] `public-layout`: login, registro vendedor, registro cliente por invitación.
- [ ] `admin-layout`: dashboard, vendedores, clientes, auditoría, QR/links.
- [ ] `seller-layout`: perfil, cartera, productos, categorías, marcas, QR/links, pedidos.
- [ ] `customer-layout`: proveedor activo, catálogo, carrito, pedidos.

### Hito 3 — Flujos core demostrables

- [ ] Admin habilita vendedor.
- [ ] Vendedor completa perfil y gestiona catálogo.
- [ ] Vendedor genera link/QR o registra cliente directo.
- [ ] Cliente selecciona proveedor, consulta catálogo y arma carrito.
- [ ] Cliente crea pedido async con `Idempotency-Key`.
- [ ] Vendedor confirma/actualiza pedido.

### Hito 4 — Endurecimiento UX/QA

- [ ] Skeleton, empty, error, 401, 403, 409 y estados async en todas las pantallas.
- [ ] Accesibilidad WCAG AA práctica: labels, foco visible, teclado, contraste.
- [ ] Pruebas manuales por rol con Scalar/OpenAPI como referencia.

## 3. Sitemap y rutas sugeridas por rol

> Las rutas Angular son sugeridas. Los endpoints backend son la fuente de verdad.

| Área | Ruta Angular sugerida | Rol | Propósito |
| --- | --- | --- | --- |
| Público | `/auth/login` | público | Login. |
| Público | `/auth/register-seller` | público | Registro de vendedor con estado pendiente. |
| Público | `/invite/:token` | público | Registro de cliente por link/QR. |
| Público | `/auth/reset-password` | público | Reset por token generado por admin. |
| Sesión | `/profile` | autenticado | Perfil base del usuario. Puede redirigir a sección por rol. |
| Admin | `/admin` | `super_admin` | Dashboard general. |
| Admin | `/admin/vendedores` | `super_admin` | Listado, filtros y cambio de estado de vendedores. |
| Admin | `/admin/clientes` | `super_admin` | Listado y administración de clientes. |
| Admin | `/admin/auditoria` | `super_admin` | Logs de auditoría. |
| Admin | `/admin/invitaciones` | `super_admin` | Inspección de QR y links por vendedor. |
| Vendedor | `/vendedor` | `vendedor` | Mini-dashboard operativo. |
| Vendedor | `/vendedor/perfil` | `vendedor` | Perfil comercial propio. |
| Vendedor | `/vendedor/clientes` | `vendedor` | Cartera propia. |
| Vendedor | `/vendedor/catalogo/productos` | `vendedor` | Productos propios. |
| Vendedor | `/vendedor/catalogo/categorias` | `vendedor` | Categorías propias. |
| Vendedor | `/vendedor/catalogo/marcas` | `vendedor` | Marcas propias. |
| Vendedor | `/vendedor/invitaciones` | `vendedor` | QR y links propios. |
| Vendedor | `/vendedor/pedidos` | `vendedor` | Pedidos propios y transición de estados. |
| Vendedor | `/vendedor/entregas` | `vendedor` | Entregas. Detalle por confirmar en OpenAPI. |
| Cliente | `/cliente` | `cliente` | Home simple con proveedor activo y accesos rápidos. |
| Cliente | `/cliente/proveedores` | `cliente` | Selección de proveedor activo. |
| Cliente | `/cliente/catalogo` | `cliente` | Catálogo del proveedor seleccionado. |
| Cliente | `/cliente/carrito` | `cliente` | Carrito scoped por proveedor. |
| Cliente | `/cliente/pedidos` | `cliente` | Historial/estado de pedidos. |

## 4. Matriz pantalla ↔ endpoint/acción gateway

### Autenticación y perfil

| Pantalla/flujo | Método y endpoint confirmado | Rol | Notas frontend |
| --- | --- | --- | --- |
| Login | `POST /api/v1/auth/login` | público | Devuelve `token`, `refreshToken`, `user`. |
| Refresh | `POST /api/v1/auth/refresh` | público | Usar para renovar access token. |
| Validate | `POST /api/v1/auth/validate` | público | Validación explícita si se necesita. |
| Logout | `POST /api/v1/auth/logout` | autenticado | Requiere bearer token. |
| Cambiar contraseña | `POST /api/v1/auth/change-password` | autenticado | Invalida refresh tokens. |
| Reset password admin | `POST /api/v1/auth/admin-generate-reset-token` | `super_admin` | Genera token de un solo uso. |
| Reset password público | `POST /api/v1/auth/reset-password` | público | Usa token de reset. |
| Perfil propio | `GET /api/v1/users/profile` | autenticado | Fuente para restaurar sesión y enrutar. |
| Actualizar perfil base | `PATCH /api/v1/users/profile/update` | autenticado | Campos base: nombre, apellido, teléfono. |

### Admin

| Pantalla/flujo | Método y endpoint confirmado | Rol | Notas frontend |
| --- | --- | --- | --- |
| Dashboard admin | `GET /api/v1/super-admin/dashboard` | `super_admin` | Métricas confirmadas por schema. |
| Perfil admin | `GET /api/v1/super-admin/profile` | `super_admin` | Perfil propio admin. |
| Actualizar perfil admin | `PATCH /api/v1/super-admin/profile/update` | `super_admin` | Form simple. |
| Vendedores | `GET /api/v1/vendedores/list` | `super_admin` | Paginado; filtros `page`, `limit`, `search`, `estado`. |
| Detalle vendedor | `GET /api/v1/vendedores/get-by-id/{id}` | `super_admin` | `id` viaja en path. |
| Cambiar estado vendedor | `PATCH /api/v1/vendedores/change-estado/{id}` | `super_admin` | Body `estado`: `activo`, `inactivo` o `bloqueado` según schema vigente. No usar `aprobado`. |
| Clientes | `GET /api/v1/clientes/list` | `super_admin` | Paginado; filtro `search`. |
| Detalle cliente | `GET /api/v1/clientes/get-by-id/{id}` | `super_admin` | `id` de `CLIENTE.id`. |
| Actualizar cliente | `PATCH /api/v1/clientes/update/{id}` | `super_admin` | Campos confirmados en schema. |
| Reasignar cliente | `PATCH /api/v1/clientes/reassign/{id}` | `super_admin` | Body `vendedorId`. |
| Agregar proveedor a cliente | `POST /api/v1/clientes/providers/add` | `super_admin` | Body `clienteId`, `vendedorId`, `makeDefault?`. |
| Auditoría | `GET /api/v1/super-admin/audit-log` | `super_admin` | Paginado. |
| QR por vendedor | `GET /api/v1/super-admin/qr-codes` | `super_admin` | Query `vendedorId`, `page`, `limit`. |
| Links por vendedor | `GET /api/v1/super-admin/link-invitacion` | `super_admin` | Query `vendedorId`, `page`, `limit`. |
| Activity logs | `GET /api/v1/activity-logs/list` | `super_admin` | Registrado en gateway; ausente en OpenAPI generado local por falta de `ACTIONS_DOC`. Query según contratos: `page`, `limit`, `source`, `action`, `actor`, `result`, `from`, `to`. Confirmar en OpenAPI vivo. |
| Activity log detalle | `GET /api/v1/activity-logs/get-by-id?id={id}` | `super_admin` | Registrado en gateway; ausente en OpenAPI generado local por falta de `ACTIONS_DOC`. `id` viaja por query. Confirmar en OpenAPI vivo. |
| Categorías inactivas | `GET /api/v1/categories/list-inactive?vendedorId={vendedorId}` | `super_admin` | Endpoint de auditoría documentado en OpenAPI; `vendedorId` es opcional. |

### Vendedor

| Pantalla/flujo | Método y endpoint confirmado | Rol | Notas frontend |
| --- | --- | --- | --- |
| Perfil vendedor | `GET /api/v1/vendedores/profile` | `vendedor` | Estado puede ser `pendiente`, `activo`, `inactivo`, `bloqueado`. |
| Actualizar perfil vendedor | `PATCH /api/v1/vendedores/profile/update` | `vendedor` | No enviar `userId` ni `vendedorId`; sale del token. |
| Cartera | `GET /api/v1/clientes/cartera` | `vendedor` | Paginado; filtro `search`. |
| Detalle cliente propio | `GET /api/v1/clientes/own/get-by-id/{id}` | `vendedor` | `id` de `CLIENTE.id`. |
| Actualizar cliente propio | `PATCH /api/v1/clientes/own/update/{id}` | `vendedor` | Datos personales y dirección. |
| Registrar cliente directo | `POST /api/v1/auth/register-client/by-vendor` | `vendedor` | Devuelve JWT del cliente; manejarlo sin perder sesión del vendedor. |
| QR propios | `GET /api/v1/qr/vendor/list` | `vendedor` | Paginado. |
| Crear QR | `POST /api/v1/qr/vendor/create` | `vendedor` | Devuelve imagen/url y expiración. |
| Desactivar QR propio | `PATCH /api/v1/qr/vendor/deactivate/{id}` | `vendedor` | `id` de QR. |
| Links propios | `GET /api/v1/link-invitacion/vendor/list` | `vendedor` | Paginado. |
| Crear link | `POST /api/v1/link-invitacion/vendor/create` | `vendedor` | Devuelve `linkUrl`, `token`, `expiresAt`. |
| Desactivar link propio | `PATCH /api/v1/link-invitacion/vendor/deactivate/{id}` | `vendedor` | `id` de link. |
| Productos propios | `GET /api/v1/products/list` | público / `vendedor` | En lectura pública puede recibir `vendedorId`; con token de vendedor se puede omitir y backend lo resuelve del token. |
| Crear producto | `POST /api/v1/products/create` | `vendedor` | No enviar `vendedorId`. |
| Editar producto | `PATCH /api/v1/products/update?id={id}` | `vendedor` | `id` por query. |
| Desactivar producto | `DELETE /api/v1/products/delete?id={id}` | `vendedor` | Baja lógica. |
| Categorías | `GET /api/v1/categories/list` | público / `vendedor` | En lectura pública puede recibir `vendedorId`; con token de vendedor se puede omitir y backend lo resuelve del token. |
| Crear categoría | `POST /api/v1/categories/create` | `vendedor` | Body `nombre`. |
| Editar categoría | `PATCH /api/v1/categories/update?id={id}` | `vendedor` | `id` por query. |
| Desactivar categoría | `DELETE /api/v1/categories/delete?id={id}` | `vendedor` | Baja lógica. |
| Reactivar categoría | `PATCH /api/v1/categories/reactivate?id={id}` | `vendedor` | Puede fallar por conflicto de nombre activo. |
| Marcas | `GET /api/v1/brands/list` | público / `vendedor` | En lectura pública puede recibir `vendedorId`; con token de vendedor se puede omitir y backend lo resuelve del token. |
| Crear marca | `POST /api/v1/brands/create` | `vendedor` | Body `nombre`. |
| Editar marca | `PATCH /api/v1/brands/update?id={id}` | `vendedor` | `id` por query. |
| Desactivar marca | `DELETE /api/v1/brands/delete?id={id}` | `vendedor` | Baja lógica. |
| Reactivar marca | `PATCH /api/v1/brands/reactivate?id={id}` | `vendedor` | Puede fallar por conflicto de nombre activo. |
| Pedidos | `GET /api/v1/orders/list` | `vendedor` | Lista según rol del token. |
| Detalle pedido | `GET /api/v1/orders/get-by-id?id={id}` | `vendedor` | `id` de pedido por query. |
| Confirmar pedido | `PATCH /api/v1/orders/confirm` | `vendedor` | Body `id`. |
| Actualizar estado pedido | `PATCH /api/v1/orders/status/update` | `vendedor` | Body `id`, `estado`, `notas?`. |
| Entregas | `GET /api/v1/deliveries/list` | `vendedor` | Registrado en gateway; ausente en OpenAPI generado local. Query según contratos: `page`, `limit`, `fecha?` (`YYYY-MM-DD`). |
| Detalle entrega | `GET /api/v1/deliveries/get?id={id}` | `vendedor` | Registrado en gateway; ausente en OpenAPI generado local. `id` de entrega por query. |
| Actualizar entrega | `PATCH /api/v1/deliveries/update-status?id={id}` | `vendedor` | Async `202`. Requiere `Idempotency-Key` en header o `idempotencyKey` en body; si ambos existen deben coincidir. Body `estado`, `notas?`; no enviar `userId`. |
| Estado job entrega | `GET /api/v1/deliveries/job-status?id={trackingId}` | `vendedor` | Registrado en gateway; ausente en OpenAPI generado local. `id` es `trackingId`, no `deliveryId`. |

### Cliente

| Pantalla/flujo | Método y endpoint confirmado | Rol | Notas frontend |
| --- | --- | --- | --- |
| Registro por invitación | `POST /api/v1/auth/register-client` | público | Usa token de invitación y devuelve JWT. |
| Proveedores disponibles | `GET /api/v1/clientes/providers` | `cliente` | Devuelve `providers`, `defaultVendedorId`, `requiresSelection`. |
| Seleccionar proveedor | `POST /api/v1/clientes/providers/select` | `cliente` | Body `vendedorId` de `VENDEDOR.id`. |
| Catálogo | `GET /api/v1/products/list?vendedorId={vendedorId}` | público/cliente | Usar proveedor seleccionado. |
| Buscar productos | `GET /api/v1/products/search?q={texto}&vendedorId={vendedorId}` | público/cliente | Filtros paginados. |
| Ver producto | `GET /api/v1/products/get?id={id}` | público/cliente | `id` de producto. |
| Categorías proveedor | `GET /api/v1/categories/list?vendedorId={vendedorId}` | público/cliente | `vendedorId` obligatorio si no lo resuelve token. |
| Marcas proveedor | `GET /api/v1/brands/list?vendedorId={vendedorId}` | público/cliente | `vendedorId` obligatorio si no lo resuelve token. |
| Carrito activo | `GET /api/v1/cart/get?vendedorId={vendedorId}` | `cliente` | Scope por proveedor seleccionado. |
| Agregar item | `POST /api/v1/cart/items/add` | `cliente` | Body `vendedorId`, `productoId`, `cantidad`. |
| Actualizar item | `PATCH /api/v1/cart/items/update` | `cliente` | Body `vendedorId`, `productoId`, `cantidad`. |
| Eliminar item | `DELETE /api/v1/cart/items/delete` | `cliente` | Body `vendedorId`, `productoId`; `cantidad` existe en el schema compartido pero no está requerida en OpenAPI. Confirmar comportamiento vivo. |
| Crear pedido | `POST /api/v1/orders/create` | `cliente` | Requiere header `Idempotency-Key`; responde async. |
| Estado pedido async | `GET /api/v1/orders/job-status?id={trackingId}` | `cliente` | `id` es `trackingId`, no `orderId`. |
| Pedidos | `GET /api/v1/orders/list` | `cliente` | Lista los pedidos propios. |
| Detalle pedido | `GET /api/v1/orders/get-by-id?id={id}` | `cliente` | `id` de pedido. |
| Cancelar pedido | `PATCH /api/v1/orders/cancel` | `cliente` | Solo mientras esté `pendiente`. |

## 5. Formularios principales

| Formulario | Campos confirmados | Reglas conocidas | Gaps antes de cerrar UI |
| --- | --- | --- | --- |
| Login | `email`, `password` | Mostrar 401 como credenciales inválidas o sesión vencida según contexto. | Copy final de error y política visual de “recordar sesión”. |
| Registro vendedor | `email`, `emailConfirmation`, `password`, `nombre`, `apellido`, `dni`, `telefono`, `ciudad?`, `empresa?` | `dni` descrito como 8 dígitos; respuesta queda `pendiente`. | Reglas exactas de password, teléfono, ciudad obligatoria/opcional y validaciones de formato. |
| Registro cliente por invitación | `token`, `nombre`, `apellido?`, `email`, `emailConfirmation`, `password`, `telefono`, `dni`, `direccionEntrega` | `dni` 7 a 9 dígitos; dirección requiere al menos `calle`, `numero`, `ciudad` en schema compartido. | Confirmar si `token` viaja oculto desde URL y si `apellido` es requerido por backend vivo. |
| Perfil base | `nombre`, `apellido`, `telefono` | No cambiar identidad desde frontend. | Campos opcionales por rol. |
| Perfil vendedor | `nombre`, `apellido`, `dni`, `cuil`, `cuit`, `telefono`, `empresa`, `logo`, `ciudadDefault`, `zonaEntrega` | El vendedor actualiza su propio perfil; no enviar `vendedorId`. | Formatos exactos CUIL/CUIT, logo upload vs URL, límites de longitud. |
| Perfil admin | `nombre`, `apellido`, `telefono` | Actualización propia. | Reglas de teléfono. |
| Cliente admin | `nombre`, `apellido`, `telefono`, `tipoFactura` | `tipoFactura`: `A | B | C` según schema OpenAPI actual. | Verificar con backend si MVP acepta `A` o solo `B | C`. |
| Cliente vendedor | `nombre`, `apellido`, `telefono`, `direccionEntrega` | Vendedor solo sobre cliente propio. | Campos exactos requeridos de dirección y validación geográfica. |
| Reasignar/agregar proveedor | `vendedorId`, `clienteId`, `makeDefault?` | Usar IDs de perfiles, no `sub` JWT. | UI para buscar vendedor/cliente y prevenir confusión de IDs. |
| Producto | `nombre`, `descripcion?`, `precioSinIva`, `porcentajeIva?`, `porcentajeImpuestos?`, `categoriaId`, `marcaId?`, `imagen?`, `stock`, `mostrarPrecio?` | Backend calcula precio final; no enviar `vendedorId`. | Límites de precio/stock, imagen upload vs URL, decimales aceptados. |
| Categoría | `nombre`, `orden?` | Create solo `nombre`; update puede incluir `orden`. | Longitud y duplicados por vendedor. |
| Marca | `nombre` | Baja lógica y reactivación. | Longitud y duplicados por vendedor. |
| Selección proveedor cliente | `vendedorId` | Debe venir de `providers[].id`. | Persistencia frontend del proveedor activo y fallback si `requiresSelection=true`. |
| Carrito item | `vendedorId`, `productoId`, `cantidad` | Validar cantidad positiva y stock visible. | Para delete, OpenAPI no exige `cantidad`, pero queda por confirmar comportamiento vivo. |
| Crear pedido | header `Idempotency-Key`; body `vendedorId`, `metodoPago`, `direccion`, `observaciones?` | `metodoPago` MVP: `contra_entrega`; identidad sale del JWT. | Generación/reintento de idempotency key, confirmación UX antes de enviar. |
| Estado pedido vendedor | `id`, `estado`, `notas?` | Estados: `pendiente`, `confirmado`, `en_camino`, `entregado`, `cancelado`, `vencido`; backend valida transiciones. | Matriz de transiciones permitidas y copy por estado. |
| Estado entrega vendedor | `id`, header `Idempotency-Key`, `estado`, `notas?` | Estados permitidos por contrato: `en_camino`, `entregada`; identidad sale del JWT y `userId` se elimina del body. | No está documentado en OpenAPI generado local; confirmar en OpenAPI vivo. |

## 6. Estados UI por feature

| Feature | Loading / skeleton | Empty | Error | 401/403/409 | Async/job |
| --- | --- | --- | --- | --- | --- |
| Auth | Botón disabled + spinner. | No aplica. | Error inline en form. | 401: credenciales/sesión; 403 no esperado en login. | No aplica. |
| Perfil/session | Skeleton de datos de perfil. | Perfil incompleto: CTA completar. | ErrorState con reintento. | 401: logout controlado; 403: acceso restringido. | Refresh silencioso con fallback a login. |
| Admin dashboard | Skeleton de cards. | Métricas en cero con explicación. | ErrorState con reintento. | 403: ruta restringida. | No aplica. |
| Listas admin | Skeleton de tabla. | EmptyState con filtros limpiables. | ErrorState contextual. | 403 restringido; 409 en mutaciones si aplica. | No aplica. |
| Registro vendedor | Botón disabled + spinner. | No aplica. | Error inline/summary. | 409 posible por duplicado: explicar conflicto. | Pantalla “pendiente de aprobación”. |
| QR/links | Skeleton de tabla/cards. | CTA crear invitación. | ErrorState. | 403 por rol; 409 si backend devuelve conflicto. | Expiración visible por `expiresAt`. |
| Proveedor cliente | Skeleton de providers. | Si no hay proveedores: explicar que necesita invitación/asociación. | ErrorState. | 403 si rol incorrecto; 409 si relación inválida. | No aplica. |
| Catálogo | Skeleton de cards/filtros. | Sin productos: mensaje según filtros/proveedor. | ErrorState con reintento. | 403 no esperado en lectura pública; 409 no esperado. | No aplica. |
| Carrito | Skeleton de items/resumen. | Carrito vacío: volver a catálogo. | ErrorState. | 401 login; 409 stock/proveedor inválido si backend lo informa. | No aplica. |
| Pedido cliente | Loading button en checkout. | Sin pedidos: CTA catálogo. | ErrorState. | 401/403 según sesión; 409 para conflicto de negocio. | Mostrar `PENDING/PROCESSING/RETRYING/COMPLETED/FAILED/DEAD_LETTER` desde job-status. |
| Pedidos vendedor | Skeleton de tabla/cards. | Sin pedidos pendientes/historial. | ErrorState. | 403 por rol; 409 transición inválida. | Si actualización futura fuera async, usar estado job; hoy pedido async confirmado solo en creación. |
| Entregas | Skeleton de tabla. | Sin entregas. | ErrorState. | 403 por rol; 409 transición inválida si aplica. | `deliveries.update-status` responde `202`; consultar `deliveries/job-status?id={trackingId}`. Falta documentación en OpenAPI generado local. |

## 7. Flujos críticos

### 7.1 Login, refresh y profile

1. `POST /api/v1/auth/login`.
2. Guardar `token`, `refreshToken` y `user` según estrategia definida.
3. Cargar `GET /api/v1/users/profile` para perfil completo.
4. Redirigir por `role`: `super_admin` → `/admin`, `vendedor` → `/vendedor`, `cliente` → `/cliente`.
5. En 401 de endpoint protegido: intentar refresh si corresponde; si falla, limpiar sesión y volver a login.

### 7.2 Registro vendedor pendiente

1. Usuario completa `/auth/register-seller`.
2. `POST /api/v1/auth/register`.
3. Mostrar pantalla de recepción con estado `pendiente` y mensaje seguro.
4. No redirigir al dashboard hasta que pueda autenticarse y su estado/rol lo permita.

### 7.3 Invitación QR/link cliente

1. Vendedor crea QR o link: `POST /api/v1/qr/vendor/create` o `POST /api/v1/link-invitacion/vendor/create`.
2. Cliente entra a `/invite/:token`.
3. Front completa `token` desde URL en el body de `POST /api/v1/auth/register-client`.
4. Backend crea usuario, perfil cliente y relación activa con vendedor.
5. Usar JWT devuelto para entrar al área cliente.

### 7.4 Selección de proveedor cliente

1. Cliente carga `GET /api/v1/clientes/providers`.
2. Si `requiresSelection=true`, bloquear catálogo/carrito hasta elegir proveedor.
3. Seleccionar con `POST /api/v1/clientes/providers/select` usando `providers[].id`.
4. Usar ese `vendedorId` para catálogo, categorías, marcas, carrito y pedido.

### 7.5 Catálogo, carrito y pedido

1. Cargar categorías/marcas/productos con `vendedorId` del proveedor activo.
2. Mutar carrito con `cart/items/add`, `cart/items/update`, `cart/items/delete`.
3. Confirmar pedido con `POST /api/v1/orders/create` y header `Idempotency-Key` único.
4. Mostrar estado aceptado y consultar `GET /api/v1/orders/job-status?id={trackingId}`.
5. Al completar, refrescar `GET /api/v1/orders/list` y/o detalle por `orderId` si existe.

### 7.6 Vendedor gestiona cartera, productos y pedidos

1. Dashboard vendedor resume cartera, catálogo y pedidos desde endpoints disponibles.
2. Cartera: `clientes/cartera`, detalle/update propio.
3. Catálogo: productos, categorías, marcas; no enviar `vendedorId` en mutaciones.
4. Pedidos: listar, confirmar o cambiar estado. Mostrar conflictos de transición como 409 si backend los devuelve.

### 7.7 Admin habilita vendedor

1. Admin lista vendedores pendientes con `GET /api/v1/vendedores/list?estado=pendiente`.
2. Admin revisa detalle con `GET /api/v1/vendedores/get-by-id/{id}`.
3. Admin cambia estado con `PATCH /api/v1/vendedores/change-estado/{id}`.
4. La UI debe usar los estados reales del backend vigente. Si OpenAPI/Scalar muestra un valor distinto a `activo`, ajustar antes de implementar.

## 8. Gaps pendientes antes de llamar esto “front completo”

- [ ] Especificación por pantalla: objetivo, permisos, componentes, copy, responsive y aceptación QA.
- [ ] Matriz exacta de validaciones por formulario: required, longitud, regex, rangos, nullable/opcional.
- [ ] Estrategia de almacenamiento de tokens: memoria, storage, refresh, expiración y logout multi-tab.
- [ ] Política final de errores: traducción de `ErrorResponse.message` y códigos de negocio.
- [ ] Matriz de estados/transiciones de pedidos y entregas.
- [ ] Contrato detallado confirmado para `deliveries.*` y `activity-logs.*` en OpenAPI vivo.
- [ ] Criterio UX para vendedor `pendiente`, `inactivo` o `bloqueado` después del login.
- [ ] Decisión de imagen de productos/logo: URL, upload local, CDN o flujo pendiente.
- [ ] Definición de seed/fixtures QA para cliente, carritos y pedidos.
- [ ] Diseño final de dashboards: métricas exactas y endpoints fuente.
- [ ] Tests frontend esperados: unitarios, integración de servicios, e2e por flujo crítico.

## 9. Checklist de aceptación

### Core/auth/layout

- [ ] Angular compila con estructura `core`, `layout`, `features`, `shared`.
- [ ] Login real funciona contra el gateway VPS configurado; gateway local solo aplica si los servicios se levantan localmente.
- [ ] `Authorization: Bearer <token>` se adjunta solo donde corresponde.
- [ ] Refresh token y expiración tienen comportamiento definido.
- [ ] `GET /api/v1/users/profile` restaura identidad al recargar.
- [ ] Redirección por rol usa `super_admin`, `vendedor`, `cliente` literales.
- [ ] 401 limpia sesión o renueva token sin loops infinitos.
- [ ] 403 muestra acceso restringido claro.

### Admin

- [ ] Admin ve dashboard y vendedores paginados.
- [ ] Admin puede filtrar vendedores por estado/search.
- [ ] Admin puede cambiar estado de vendedor con confirmación.
- [ ] Admin distingue `AUTH_USER.id`, `VENDEDOR.id` y `CLIENTE.id` en acciones internas.
- [ ] Auditoría, QR y links tienen estados loading/empty/error.

### Vendedor

- [ ] Vendedor ve/edita perfil propio sin enviar `vendedorId`.
- [ ] Vendedor lista cartera propia y actualiza cliente propio.
- [ ] Vendedor crea/lista/desactiva QR y links propios.
- [ ] Vendedor gestiona productos, categorías y marcas sin enviar `vendedorId` en mutaciones.
- [ ] Baja lógica y reactivación de categorías/marcas se reflejan en UI.
- [ ] Vendedor lista pedidos y ejecuta transiciones permitidas.

### Cliente

- [ ] Cliente puede registrarse por invitación y queda autenticado.
- [ ] Cliente carga proveedores disponibles y selecciona proveedor activo.
- [ ] Catálogo/carrito/pedido usan el `vendedorId` del proveedor seleccionado.
- [ ] Crear pedido envía `Idempotency-Key` único.
- [ ] UI consulta `orders/job-status` con `trackingId`, no con `orderId`.
- [ ] Pedido completado o fallido se comunica con estado accionable.

### UX transversal

- [ ] Todas las pantallas tienen skeleton/loading.
- [ ] Todas las listas tienen empty state útil.
- [ ] Todos los errores tienen feedback visible y accesible.
- [ ] Estados 401/403/409 están contemplados en flujos críticos.
- [ ] Formularios tienen labels, mensajes inline y navegación por teclado.
- [ ] Light/dark mantienen contraste y foco visible.
- [ ] No hay copy técnico crudo cuando pueda traducirse a acción de usuario.
