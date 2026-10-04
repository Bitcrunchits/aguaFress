# Modelos de pantallas frontend AguaFress

Guía accionable para diseñar e implementar pantallas Angular del frontend AguaFress. Define modelos de pantalla, patrones de UI, estados y QA mínimo; no reemplaza OpenAPI/Scalar ni el diseño visual final.

Fuente principal: `packages/documentacion/frontend-implementation-map.md`. Antes de implementar cada feature, validar el contrato vigente en Scalar `http://localhost:3000/api/docs` u OpenAPI `http://localhost:3000/api/openapi.json`.

## 1. Resumen ejecutivo

| Tema | Alcance |
| --- | --- |
| Qué define | Modelos de pantalla por ruta, rol, endpoint, componentes visibles, estados UI y QA mínimo. |
| Qué no define | HTML/CSS final, arquitectura Angular detallada, servicios TypeScript ni reemplazo de OpenAPI vivo. |
| Stack objetivo | Angular + Tailwind + PrimeNG + Heroicons. |
| Roles literales | `super_admin`, `vendedor`, `cliente`. |
| Regla crítica de identidad | No enviar `userId` en body para identidad JWT. El actor sale del token. |
| Cliente-proveedor | Cliente puede tener más de un proveedor activo; catálogo, carrito y pedido operan con proveedor seleccionado. |
| Tono visual | Operativo, claro y confiable; referencias sobrias a agua/distribución sin apariencia genérica de template. |

## 2. Principios de pantalla

| Principio | Regla práctica |
| --- | --- |
| Patrones reutilizables | Priorizar layouts y componentes modelo sobre pantallas únicas. Si dos pantallas comparten flujo, deben compartir estructura. |
| Contrato explícito | Cada pantalla declara ruta, rol, endpoint(s), estados y QA mínimo. |
| Copy UI | Español neutral/profesional, orientado a acción. Evitar mensajes técnicos crudos cuando puedan traducirse. |
| Responsive | Desktop-first para operación administrativa; adaptar a tablet/móvil sin esconder acciones críticas. |
| Accesibilidad | Labels visibles, foco de teclado, contraste suficiente, estados anunciables y mensajes de error asociados al campo. |
| Errores | 401, 403, 409 y fallas de red deben tener feedback visible y recuperable. |
| Async | `orders.create` y `deliveries.update-status` muestran aceptación `202` y seguimiento por `trackingId`. |
| IDs | Diferenciar `AUTH_USER.id`, `VENDEDOR.id`, `CLIENTE.id` e ids de entidad. No mezclar. |

## 3. Layouts base

| Layout | Uso | Estructura mínima | Estados transversales |
| --- | --- | --- | --- |
| `PublicLayout` | Login, registro, invitación y reset. | Columna de contenido + panel contextual de marca. En móvil, una sola columna. | Form loading, error de credenciales/token, link de retorno. |
| `RoleShellLayout` | Áreas autenticadas por rol. | Sidebar/nav superior, usuario actual, logout, contenido con ancho operativo. | 401 con logout controlado, 403 por rol, sesión expirando. |
| `DataPageLayout` | Listas, filtros, tablas y acciones masivas/simples. | `PageHeader`, filtros, tabla/cards, paginación, empty/error. | Skeleton table, empty filtrado, error con reintento. |
| `FormPageLayout` | Alta/edición de perfil, catálogo, cliente, reset. | Header, secciones agrupadas, acciones sticky o pie claro. | Validación inline, botón loading, summary de error. |
| `DashboardLayout` | Home por rol. | Cards de métricas, accesos rápidos, actividad reciente. | Skeleton cards, métricas en cero, error parcial por widget. |

## 4. Componentes modelo

| Componente | Responsabilidad | Reglas de uso |
| --- | --- | --- |
| `PageHeader` | Título, descripción, breadcrumbs y CTA principal. | Un CTA primario máximo; secundarios como menú o botones discretos. |
| `DataTablePage` | Tabla con filtros, paginación y acciones por fila. | Usar PrimeNG Table; columnas con labels humanos y estado empty. |
| `FormSection` | Agrupar campos por responsabilidad. | Título breve, ayuda opcional, errores por campo. |
| `EmptyState` | Explicar ausencia de datos y siguiente acción. | Diferenciar “sin datos” de “sin resultados por filtro”. |
| `ErrorState` | Mostrar fallo recuperable. | Mensaje claro, botón Reintentar, detalle técnico colapsado solo en dev. |
| `StatusBadge` | Estados de vendedor, pedido, QR/link, job. | Colores consistentes; texto en español neutral. |
| `ConfirmDialog` | Confirmar cambios destructivos o sensibles. | Debe nombrar entidad y consecuencia: desactivar, cancelar, cambiar estado. |
| `LoadingButton` | Evitar doble envío. | Deshabilitar durante submit y conservar texto de acción. |
| `SkeletonTable` | Carga de listas. | Mantener cantidad aproximada de filas esperadas. |
| `SkeletonCards` | Carga de dashboards/catálogo. | Evitar saltos grandes de layout. |
| `ProviderSelector` | Selección de proveedor activo del cliente. | Debe usar `providers[].id` como `vendedorId`; mostrar default si existe. |
| `AsyncJobStatus` | Seguimiento de operaciones aceptadas. | Consultar `job-status` con `trackingId`, no con `orderId` ni `deliveryId`. |

## 5. Blueprints por pantalla mínima

### Públicas

#### `/auth/login`

| Campo | Definición |
| --- | --- |
| Rol | Público. |
| Layout/patrón | `PublicLayout` + `FormPageLayout`. |
| Objetivo | Iniciar sesión y redirigir por rol. |
| Endpoint(s) | `POST /api/v1/auth/login`; luego `GET /api/v1/users/profile` para restaurar perfil. |
| Componentes visibles | PageHeader, FormSection, LoadingButton, ErrorState inline. |
| Acciones principales | Iniciar sesión, ir a registro vendedor, ir a reset de contraseña. |
| Estados UI | Loading en botón; error 401 como credenciales inválidas; error de red con reintento; forbidden no esperado. |
| Validaciones/gaps | `email` requerido y formato email; `password` requerido. Política final de “recordar sesión” por definir. |
| QA mínimo | Login correcto para `super_admin` y `vendedor`; redirección por `role`; 401 no deja sesión parcial; refresh/profile no genera loop. |

#### `/auth/register-seller`

| Campo | Definición |
| --- | --- |
| Rol | Público. |
| Layout/patrón | `PublicLayout` + `FormPageLayout`. |
| Objetivo | Registrar vendedor con estado inicial pendiente. |
| Endpoint(s) | `POST /api/v1/auth/register`. |
| Componentes visibles | PageHeader, FormSection de cuenta, FormSection de datos comerciales, LoadingButton, ErrorState. |
| Acciones principales | Enviar solicitud, volver a login. |
| Estados UI | Loading submit; success con mensaje “Solicitud recibida”; 409 por email/DNI duplicado si backend lo devuelve; error general recuperable. |
| Validaciones/gaps | Campos confirmados: `email`, `emailConfirmation`, `password`, `nombre`, `apellido`, `dni`, `telefono`, `ciudad?`, `empresa?`. Reglas exactas de password/teléfono por confirmar en OpenAPI vivo. |
| QA mínimo | No autentica automáticamente si queda pendiente; confirma email coincidente; no envía campos no documentados. |

#### `/invite/:token`

| Campo | Definición |
| --- | --- |
| Rol | Público. |
| Layout/patrón | `PublicLayout` + `FormPageLayout`. |
| Objetivo | Registrar cliente desde link/QR de invitación y dejarlo autenticado. |
| Endpoint(s) | `POST /api/v1/auth/register-client`. |
| Componentes visibles | PageHeader, FormSection cuenta, FormSection dirección, LoadingButton, ErrorState. |
| Acciones principales | Completar registro, entrar al área cliente. |
| Estados UI | Loading submit; token inválido/vencido como ErrorState; 409 por email/DNI; success con redirect a `/cliente`. |
| Validaciones/gaps | `token` sale de URL; `direccionEntrega` requiere al menos `calle`, `numero`, `ciudad`. Confirmar si `apellido` es requerido por backend vivo. |
| QA mínimo | Token de URL viaja oculto en body; respuesta guarda JWT; cliente entra con proveedor asociado; no se pide `vendedorId` manual. |

#### `/auth/reset-password`

| Campo | Definición |
| --- | --- |
| Rol | Público. |
| Layout/patrón | `PublicLayout` + `FormPageLayout`. |
| Objetivo | Cambiar contraseña usando token generado por admin. |
| Endpoint(s) | `POST /api/v1/auth/reset-password`. |
| Componentes visibles | PageHeader, FormSection contraseña, LoadingButton, ErrorState. |
| Acciones principales | Definir nueva contraseña, volver a login. |
| Estados UI | Loading submit; token inválido/vencido; success con CTA a login. |
| Validaciones/gaps | Campos `token`, `newPassword`. Reglas exactas de password por confirmar en OpenAPI vivo. |
| QA mínimo | Token requerido; no deja enviar contraseña vacía; success no inicia sesión automáticamente salvo contrato futuro. |

### Admin

#### `/admin`

| Campo | Definición |
| --- | --- |
| Rol | `super_admin`. |
| Layout/patrón | `RoleShellLayout` + `DashboardLayout`. |
| Objetivo | Ver estado general de vendedores/clientes y accesos rápidos. |
| Endpoint(s) | `GET /api/v1/super-admin/dashboard`. |
| Componentes visibles | PageHeader, SkeletonCards, StatusBadge, cards de métricas, accesos a vendedores/clientes/auditoría. |
| Acciones principales | Ir a vendedores pendientes, clientes, auditoría e invitaciones. |
| Estados UI | Loading cards; métricas en cero; ErrorState con reintento; 403 ruta restringida. |
| Validaciones/gaps | Métricas exactas adicionales por confirmar en OpenAPI vivo. |
| QA mínimo | Solo `super_admin`; cards muestran cero sin romper; CTA pendientes filtra vendedores por `pendiente`. |

#### `/admin/vendedores`

| Campo | Definición |
| --- | --- |
| Rol | `super_admin`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Listar, filtrar, revisar y cambiar estado de vendedores. |
| Endpoint(s) | `GET /api/v1/vendedores/list`; `GET /api/v1/vendedores/get-by-id/{id}`; `PATCH /api/v1/vendedores/change-estado/{id}`. |
| Componentes visibles | PageHeader, DataTablePage, StatusBadge, ConfirmDialog, ErrorState. |
| Acciones principales | Buscar, filtrar por estado, ver detalle, cambiar a `activo`, `inactivo` o `bloqueado`. |
| Estados UI | SkeletonTable; empty sin vendedores o sin resultados; 409 si transición/estado falla; 403 restringido. |
| Validaciones/gaps | No usar `aprobado`; estados vigentes: `pendiente`, `activo`, `inactivo`, `bloqueado` para lectura; cambio documentado: `activo`, `inactivo`, `bloqueado`. |
| QA mínimo | `id` viaja en path; confirmación antes de cambiar estado; filtros `page`, `limit`, `search`, `estado`. |

#### `/admin/clientes`

| Campo | Definición |
| --- | --- |
| Rol | `super_admin`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout` con edición lateral/modal. |
| Objetivo | Administrar clientes, actualizar datos y relación con vendedores. |
| Endpoint(s) | `GET /api/v1/clientes/list`; `GET /api/v1/clientes/get-by-id/{id}`; `PATCH /api/v1/clientes/update/{id}`; `PATCH /api/v1/clientes/reassign/{id}`; `POST /api/v1/clientes/providers/add`. |
| Componentes visibles | PageHeader, DataTablePage, FormSection, ConfirmDialog, StatusBadge. |
| Acciones principales | Buscar cliente, editar datos, reasignar vendedor, agregar proveedor activo. |
| Estados UI | SkeletonTable; empty; error con reintento; 409 por relación inválida/duplicada si backend lo devuelve. |
| Validaciones/gaps | Usar `CLIENTE.id` para cliente y `VENDEDOR.id` para proveedor. `tipoFactura`: `A | B | C` según schema; confirmar reglas finales. |
| QA mínimo | No confundir `AUTH_USER.id` con `CLIENTE.id`; `providers/add` usa `clienteId`, `vendedorId`, `makeDefault?`. |

#### `/admin/auditoria`

| Campo | Definición |
| --- | --- |
| Rol | `super_admin`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Consultar actividad y auditoría operacional. |
| Endpoint(s) | `GET /api/v1/super-admin/audit-log`; `GET /api/v1/activity-logs/list` y `GET /api/v1/activity-logs/get-by-id?id={id}` registrados en gateway, por confirmar en OpenAPI vivo. |
| Componentes visibles | PageHeader, DataTablePage, StatusBadge, ErrorState. |
| Acciones principales | Filtrar, paginar, ver detalle de evento. |
| Estados UI | SkeletonTable; empty sin eventos; error de contrato si activity logs no aparece; 403 restringido. |
| Validaciones/gaps | `activity-logs.*` está en registry pero ausente en OpenAPI generado local por falta de `ACTIONS_DOC`; confirmar antes de UI final. |
| QA mínimo | `super-admin/audit-log` pagina; no bloquear toda la pantalla si activity logs queda no disponible. |

#### `/admin/invitaciones`

| Campo | Definición |
| --- | --- |
| Rol | `super_admin`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Inspeccionar QR y links de invitación por vendedor. |
| Endpoint(s) | `GET /api/v1/super-admin/qr-codes`; `GET /api/v1/super-admin/link-invitacion`; `PATCH /api/v1/qr/admin/deactivate/{id}` y `PATCH /api/v1/link-invitacion/admin/deactivate/{id}` registrados en gateway; agregar al mapa base si se incorporan al alcance admin. |
| Componentes visibles | PageHeader, DataTablePage, StatusBadge, ConfirmDialog, EmptyState. |
| Acciones principales | Filtrar por `vendedorId`, ver expiración, desactivar QR/link. |
| Estados UI | SkeletonTable; empty si vendedor sin invitaciones; error de filtro inválido; 403 restringido. |
| Validaciones/gaps | Selector/búsqueda de vendedor para obtener `VENDEDOR.id` por confirmar; no inventar endpoint de búsqueda fuera del mapa. Las acciones admin de desactivación están registradas en `MicroServices/gateway/src/actions/action-registry.ts`, pero no figuran en `frontend-implementation-map.md`. |
| QA mínimo | `vendedorId` de filtro es perfil vendedor; desactivar usa `id` de QR/link en path. |

### Vendedor

#### `/vendedor`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DashboardLayout`. |
| Objetivo | Resumen operativo de perfil, cartera, catálogo, pedidos e invitaciones. |
| Endpoint(s) | No hay endpoint único de dashboard confirmado; usar composición con `GET /api/v1/vendedores/profile`, `GET /api/v1/clientes/cartera`, `GET /api/v1/products/list`, `GET /api/v1/orders/list`, `GET /api/v1/qr/vendor/list`, `GET /api/v1/link-invitacion/vendor/list` o confirmar contrato en OpenAPI vivo. |
| Componentes visibles | PageHeader, SkeletonCards, StatusBadge, cards de accesos rápidos. |
| Acciones principales | Completar perfil, gestionar clientes, catálogo, pedidos e invitaciones. |
| Estados UI | Loading parcial por widget; perfil `pendiente`/`inactivo`/`bloqueado` con aviso; error parcial no bloquea todo. |
| Validaciones/gaps | Diseño final de métricas por confirmar; no inventar endpoint `/vendedor/dashboard`. |
| QA mínimo | Token vendedor requerido; estado no activo limita acciones según criterio UX pendiente; links llevan a rutas correctas. |

#### `/vendedor/perfil`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `FormPageLayout`. |
| Objetivo | Ver y actualizar perfil comercial propio. |
| Endpoint(s) | `GET /api/v1/vendedores/profile`; `PATCH /api/v1/vendedores/profile/update`. |
| Componentes visibles | PageHeader, FormSection datos personales, FormSection negocio, StatusBadge, LoadingButton. |
| Acciones principales | Guardar cambios de perfil. |
| Estados UI | Skeleton de perfil; error con reintento; 403 por rol; conflicto si backend informa duplicados. |
| Validaciones/gaps | No enviar `userId` ni `vendedorId`. Formatos CUIL/CUIT, logo URL/upload y límites por confirmar. |
| QA mínimo | Submit solo campos documentados; recarga muestra cambios; estado del vendedor visible. |

#### `/vendedor/clientes`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Gestionar cartera propia de clientes. |
| Endpoint(s) | `GET /api/v1/clientes/cartera`; `GET /api/v1/clientes/own/get-by-id/{id}`; `PATCH /api/v1/clientes/own/update/{id}`; `POST /api/v1/auth/register-client/by-vendor`. |
| Componentes visibles | PageHeader, DataTablePage, FormSection, LoadingButton, EmptyState. |
| Acciones principales | Buscar cliente, ver/editar cliente propio, registrar cliente directo. |
| Estados UI | SkeletonTable; empty cartera; 409 por email/DNI duplicado en registro; 403 si cliente no pertenece al vendedor. |
| Validaciones/gaps | Registro directo devuelve JWT del cliente; la UI no debe perder sesión del vendedor. Confirmar UX de entrega de credenciales al cliente. |
| QA mínimo | `id` de cliente propio viaja en path; búsqueda usa `search`; no se envía `vendedorId` para cartera. |

#### `/vendedor/catalogo/productos`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout` + formulario modal/lateral. |
| Objetivo | Crear, editar y desactivar productos propios. |
| Endpoint(s) | `GET /api/v1/products/list`; `GET /api/v1/products/get?id={id}`; `POST /api/v1/products/create`; `PATCH /api/v1/products/update?id={id}`; `DELETE /api/v1/products/delete?id={id}`. |
| Componentes visibles | PageHeader, DataTablePage, FormSection producto, StatusBadge, ConfirmDialog. |
| Acciones principales | Filtrar, crear, editar, desactivar producto. |
| Estados UI | SkeletonTable; empty catálogo; 409 por categoría/marca inválida o conflicto si backend lo devuelve; error de pertenencia. |
| Validaciones/gaps | No enviar `vendedorId`; `categoriaId` y `marcaId` deben pertenecer al vendedor y estar activos. Imagen URL/upload por confirmar. |
| QA mínimo | `id` de producto viaja por query; baja lógica refleja `activo:false`; precio final lo calcula backend. |

#### `/vendedor/catalogo/categorias`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Gestionar categorías activas y reactivación cuando aplique. |
| Endpoint(s) | `GET /api/v1/categories/list`; `POST /api/v1/categories/create`; `PATCH /api/v1/categories/update?id={id}`; `DELETE /api/v1/categories/delete?id={id}`; `PATCH /api/v1/categories/reactivate?id={id}`. |
| Componentes visibles | PageHeader, DataTablePage, FormSection, ConfirmDialog, StatusBadge. |
| Acciones principales | Crear, editar, desactivar, reactivar categoría. |
| Estados UI | SkeletonTable; empty; 409 por nombre activo duplicado al reactivar; error de pertenencia. |
| Validaciones/gaps | Create solo `nombre`; update puede incluir `orden`. Longitud y duplicados por confirmar. |
| QA mínimo | No enviar `vendedorId`; delete es baja lógica; productos de categoría inactiva se ocultan del catálogo normal. |

#### `/vendedor/catalogo/marcas`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Gestionar marcas activas y reactivación cuando aplique. |
| Endpoint(s) | `GET /api/v1/brands/list`; `POST /api/v1/brands/create`; `PATCH /api/v1/brands/update?id={id}`; `DELETE /api/v1/brands/delete?id={id}`; `PATCH /api/v1/brands/reactivate?id={id}`. |
| Componentes visibles | PageHeader, DataTablePage, FormSection, ConfirmDialog, StatusBadge. |
| Acciones principales | Crear, editar, desactivar, reactivar marca. |
| Estados UI | SkeletonTable; empty; 409 por nombre activo duplicado al reactivar; error de pertenencia. |
| Validaciones/gaps | Campo confirmado `nombre`; longitud y duplicados por confirmar. |
| QA mínimo | `id` viaja por query; baja lógica no borra productos; no enviar `vendedorId`. |

#### `/vendedor/invitaciones`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout` con vista de cards para QR/link. |
| Objetivo | Crear, listar y desactivar QR o links propios para registrar clientes. |
| Endpoint(s) | `GET /api/v1/qr/vendor/list`; `POST /api/v1/qr/vendor/create`; `PATCH /api/v1/qr/vendor/deactivate/{id}`; `GET /api/v1/link-invitacion/vendor/list`; `POST /api/v1/link-invitacion/vendor/create`; `PATCH /api/v1/link-invitacion/vendor/deactivate/{id}`. |
| Componentes visibles | PageHeader, DataTablePage/cards, StatusBadge, ConfirmDialog, EmptyState. |
| Acciones principales | Crear QR, crear link, copiar link, desactivar. |
| Estados UI | SkeletonCards/Table; empty con CTA crear; expirado/inactivo visible; error con reintento. |
| Validaciones/gaps | Copy/descarga/compartir QR por confirmar; no inventar canal de envío automático. |
| QA mínimo | Expiración visible por `expiresAt`; desactivar usa id de QR/link en path; link resultante abre `/invite/:token`. |

#### `/vendedor/pedidos`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Ver pedidos propios y ejecutar transiciones permitidas. |
| Endpoint(s) | `GET /api/v1/orders/list`; `GET /api/v1/orders/get-by-id?id={id}`; `PATCH /api/v1/orders/confirm`; `PATCH /api/v1/orders/status/update`. |
| Componentes visibles | PageHeader, DataTablePage, StatusBadge, ConfirmDialog, ErrorState. |
| Acciones principales | Ver detalle, confirmar, cambiar estado con notas. |
| Estados UI | SkeletonTable; empty sin pedidos; 409 transición inválida; 403 por rol. |
| Validaciones/gaps | Matriz exacta de transiciones por confirmar; estados conocidos: `pendiente`, `confirmado`, `en_camino`, `entregado`, `cancelado`, `vencido`. |
| QA mínimo | `orders.get-by-id` usa query `id`; `confirm` body `{ id }`; no enviar `userId`. |

#### `/vendedor/entregas`

| Campo | Definición |
| --- | --- |
| Rol | `vendedor`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout` + `AsyncJobStatus`. |
| Objetivo | Listar entregas y actualizar estado de entrega. |
| Endpoint(s) | `GET /api/v1/deliveries/list`; `GET /api/v1/deliveries/get?id={id}`; `PATCH /api/v1/deliveries/update-status?id={id}`; `GET /api/v1/deliveries/job-status?id={trackingId}`. Registrados en gateway; por confirmar en OpenAPI vivo. |
| Componentes visibles | PageHeader, DataTablePage, StatusBadge, ConfirmDialog, AsyncJobStatus. |
| Acciones principales | Filtrar por fecha, ver detalle, marcar `en_camino` o `entregada`. |
| Estados UI | SkeletonTable; empty sin entregas; 202 aceptado con polling; 409 transición inválida si aplica; error si contrato no está publicado. |
| Validaciones/gaps | `deliveries.*` ausente en OpenAPI generado local; confirmar schema final. `update-status` requiere `Idempotency-Key` o `idempotencyKey` consistente. |
| QA mínimo | `job-status` usa `trackingId`; no usar `deliveryId` para polling; no enviar `userId`. |

### Cliente

#### `/cliente`

| Campo | Definición |
| --- | --- |
| Rol | `cliente`. |
| Layout/patrón | `RoleShellLayout` + `DashboardLayout`. |
| Objetivo | Home con proveedor activo, accesos a catálogo, carrito y pedidos. |
| Endpoint(s) | `GET /api/v1/clientes/providers`; `GET /api/v1/orders/list`; opcional `GET /api/v1/cart/get?vendedorId={vendedorId}` si hay proveedor seleccionado. |
| Componentes visibles | PageHeader, ProviderSelector, SkeletonCards, StatusBadge. |
| Acciones principales | Elegir proveedor, ir al catálogo, ver carrito/pedidos. |
| Estados UI | Loading providers; sin proveedores con mensaje de invitación/asociación; requiresSelection bloquea catálogo/carrito; error con reintento. |
| Validaciones/gaps | Persistencia frontend del proveedor activo por definir; fuente principal es backend `providers/select`. |
| QA mínimo | Si `requiresSelection=true`, no permite operar catálogo/carrito sin proveedor; usa `providers[].id`. |

#### `/cliente/proveedores`

| Campo | Definición |
| --- | --- |
| Rol | `cliente`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout` o cards seleccionables. |
| Objetivo | Seleccionar proveedor activo para operar catálogo/carrito/pedido. |
| Endpoint(s) | `GET /api/v1/clientes/providers`; `POST /api/v1/clientes/providers/select`. |
| Componentes visibles | PageHeader, ProviderSelector, StatusBadge, EmptyState, LoadingButton. |
| Acciones principales | Seleccionar proveedor, cambiar proveedor activo. |
| Estados UI | SkeletonCards; empty sin proveedores; 409 relación inactiva si backend lo devuelve; 403 por rol. |
| Validaciones/gaps | `vendedorId` debe venir de `providers[].id`; no aceptar entrada manual de UUID. |
| QA mínimo | Selección actual se marca; cambiar proveedor refresca catálogo/carrito; no usa `AUTH_USER.id`. |

#### `/cliente/catalogo`

| Campo | Definición |
| --- | --- |
| Rol | `cliente`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout` con cards de producto. |
| Objetivo | Explorar productos del proveedor seleccionado y agregarlos al carrito. |
| Endpoint(s) | `GET /api/v1/products/list?vendedorId={vendedorId}`; `GET /api/v1/products/search?q={texto}&vendedorId={vendedorId}`; `GET /api/v1/products/get?id={id}`; `GET /api/v1/categories/list?vendedorId={vendedorId}`; `GET /api/v1/brands/list?vendedorId={vendedorId}`; `POST /api/v1/cart/items/add`. |
| Componentes visibles | PageHeader, ProviderSelector compacto, filtros, SkeletonCards, EmptyState, LoadingButton. |
| Acciones principales | Buscar, filtrar, ver detalle, agregar al carrito. |
| Estados UI | SkeletonCards; empty por proveedor/filtro; error con reintento; 409 stock/proveedor inválido si backend lo informa. |
| Validaciones/gaps | `vendedorId` obligatorio desde proveedor seleccionado; validar cantidad positiva y stock visible. |
| QA mínimo | Cambiar proveedor cambia catálogo; productos con categoría/marca inactiva no aparecen; add cart usa `productoId`, `cantidad`, `vendedorId`. |

#### `/cliente/carrito`

| Campo | Definición |
| --- | --- |
| Rol | `cliente`. |
| Layout/patrón | `RoleShellLayout` + `FormPageLayout` para checkout simple. |
| Objetivo | Revisar carrito por proveedor y crear pedido async. |
| Endpoint(s) | `GET /api/v1/cart/get?vendedorId={vendedorId}`; `PATCH /api/v1/cart/items/update`; `DELETE /api/v1/cart/items/delete`; `POST /api/v1/orders/create`; `GET /api/v1/orders/job-status?id={trackingId}`. |
| Componentes visibles | PageHeader, ProviderSelector compacto, tabla/lista de items, FormSection dirección, LoadingButton, AsyncJobStatus. |
| Acciones principales | Cambiar cantidades, eliminar items, confirmar pedido. |
| Estados UI | Skeleton items; carrito vacío con CTA catálogo; 409 stock/proveedor; 202 pedido aceptado con seguimiento. |
| Validaciones/gaps | `orders.create` requiere header `Idempotency-Key`; `metodoPago` MVP: `contra_entrega`. Para delete, OpenAPI no exige `cantidad`, pero el schema compartido la contiene; confirmar comportamiento vivo. |
| QA mínimo | Idempotency key única por intento; polling usa `trackingId`; no duplica pedido al reintentar; no enviar `userId`. |

#### `/cliente/pedidos`

| Campo | Definición |
| --- | --- |
| Rol | `cliente`. |
| Layout/patrón | `RoleShellLayout` + `DataPageLayout`. |
| Objetivo | Consultar historial y estado de pedidos propios. |
| Endpoint(s) | `GET /api/v1/orders/list`; `GET /api/v1/orders/get-by-id?id={id}`; `PATCH /api/v1/orders/cancel`; `GET /api/v1/orders/job-status?id={trackingId}` cuando viene de creación async. |
| Componentes visibles | PageHeader, DataTablePage/cards, StatusBadge, ConfirmDialog, AsyncJobStatus. |
| Acciones principales | Ver detalle, cancelar pedido pendiente, seguir pedido recién creado. |
| Estados UI | SkeletonTable/cards; empty con CTA catálogo; 409 cancelación no permitida; error con reintento. |
| Validaciones/gaps | Sin filtros confirmados para `orders.list`; no inventar filtros hasta OpenAPI vivo. |
| QA mínimo | Cliente solo ve propios; cancelar solo pendiente; `get-by-id` usa `ORDER.id`; job-status usa `trackingId`. |

## 6. Gaps antes de UI final

- [ ] Confirmar OpenAPI vivo para `deliveries.*` y `activity-logs.*`.
- [ ] Definir matriz final de transiciones para pedidos y entregas.
- [ ] Definir política de token storage, refresh, logout multi-tab y sesión expirada.
- [ ] Cerrar validaciones finas por formulario: regex, longitudes, rangos, nullable/opcional.
- [ ] Definir UX para vendedor `pendiente`, `inactivo` o `bloqueado` después del login.
- [ ] Resolver estrategia de imágenes: URL, upload, almacenamiento o flujo pendiente.
- [ ] Definir fixtures QA para cliente, proveedores, carrito, pedidos y entregas.
- [ ] Confirmar métricas exactas de dashboards sin inventar endpoints nuevos.
- [ ] Definir copy final de errores de negocio frecuentes: duplicados, stock, proveedor inválido, transición inválida.
- [ ] Validar contraste, foco visible y navegación por teclado con diseño visual final.

## 7. Checklist para empezar Angular

- [ ] Crear rutas por rol con `PublicLayout` y `RoleShellLayout`.
- [ ] Implementar guards con roles literales `super_admin`, `vendedor`, `cliente`.
- [ ] Crear servicios HTTP contra gateway `/api/v1/{service}/{action}`.
- [ ] Implementar interceptors de auth, error y refresh sin loops infinitos.
- [ ] Modelar `ProviderSelector` antes de catálogo/carrito cliente.
- [ ] Implementar componentes base: `PageHeader`, `DataTablePage`, `FormSection`, `EmptyState`, `ErrorState`, `StatusBadge`.
- [ ] Usar `SkeletonTable` y `SkeletonCards` desde el primer hito, no al final.
- [ ] Implementar `AsyncJobStatus` para pedidos antes de cerrar checkout.
- [ ] Preparar QA por rol con credenciales seed y cliente creado por invitación/vendedor.
- [ ] Validar cada endpoint en Scalar/OpenAPI vivo antes de conectar la pantalla final.
