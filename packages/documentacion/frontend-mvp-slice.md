# Slice MVP frontend AguaFress

Este documento define un **MVP vertical chico, demostrable y acotado** para implementar el frontend sin intentar cubrir el frontend completo. El objetivo es probar el flujo principal entre roles con Angular + Tailwind + PrimeNG + Heroicons, usando solo endpoints ya documentados en `frontend-implementation-map.md` y `frontend-screen-blueprints.md`.

> Este MVP **no incluye las 23 pantallas** modeladas en `frontend-screen-blueprints.md`. Toma un subconjunto mínimo para demostrar valor de punta a punta.

## 1. Resumen ejecutivo

| Decisión | Alcance MVP |
| --- | --- |
| Tipo de entrega | Slice vertical chico, no frontend completo. |
| Stack | Angular + Tailwind + PrimeNG + Heroicons. |
| Roles incluidos | `super_admin`, `vendedor`, `cliente`. |
| Pantallas objetivo | Login, home por rol, vendedores admin, catálogo vendedor, catálogo cliente, carrito y pedidos cliente. |
| Fuente de verdad | `frontend-implementation-map.md`, `frontend-screen-blueprints.md` y OpenAPI/Scalar vivo antes de conectar cada feature. |
| Regla de alcance | Si una pantalla no aporta al flujo demo, queda fuera aunque esté en el blueprint completo. |

## 2. Objetivo de demo

Demostrar que AguaFress puede operar un flujo comercial básico desde el frontend:

1. Un usuario inicia sesión.
2. El sistema redirige según rol.
3. Admin revisa y habilita vendedores.
4. Vendedor entra a su dashboard y gestiona productos básicos.
5. Cliente entra, selecciona proveedor si corresponde, ve catálogo, arma carrito y crea un pedido básico.

El éxito de la demo no depende de cubrir administración completa, auditoría, invitaciones, entregas ni todas las variantes de catálogo.

## 3. Alcance IN

### Vistas incluidas

| Área | Ruta | Propósito mínimo |
| --- | --- | --- |
| Pública | `/auth/login` | Login real y redirección por rol. |
| Admin | `/admin` | Home simple con acceso a vendedores. |
| Admin | `/admin/vendedores` | Listar, filtrar y cambiar estado de vendedores. |
| Vendedor | `/vendedor` | Home operativo con accesos al catálogo. |
| Vendedor | `/vendedor/catalogo/productos` | Listar, crear, editar y desactivar productos propios. |
| Cliente | `/cliente` | Home con proveedor activo/accesos rápidos. |
| Cliente | `/cliente/catalogo` | Ver productos del proveedor seleccionado y agregar al carrito. |
| Cliente | `/cliente/carrito` | Revisar carrito y crear pedido básico. |
| Cliente | `/cliente/pedidos` | Ver pedidos propios y estado posterior a la creación. |

### Endpoints principales

| Flujo | Endpoint(s) | Nota de alcance |
| --- | --- | --- |
| Login | `POST /api/v1/auth/login`; `GET /api/v1/users/profile` | Usar `role` literal para redirigir. |
| Admin dashboard | `GET /api/v1/super-admin/dashboard` | Mostrar métricas si están disponibles; si falta detalle, marcar por confirmar en OpenAPI vivo. |
| Admin vendedores | `GET /api/v1/vendedores/list`; `GET /api/v1/vendedores/get-by-id/{id}`; `PATCH /api/v1/vendedores/change-estado/{id}` | Cambio de estado con `activo`, `inactivo` o `bloqueado`; no usar `aprobado`. |
| Vendedor dashboard | Composición con `GET /api/v1/vendedores/profile`, `GET /api/v1/products/list`, `GET /api/v1/orders/list` | No inventar `/vendedor/dashboard`; métricas por confirmar en OpenAPI vivo. |
| Productos vendedor | `GET /api/v1/products/list`; `GET /api/v1/products/get?id={id}`; `POST /api/v1/products/create`; `PATCH /api/v1/products/update?id={id}`; `DELETE /api/v1/products/delete?id={id}` | No enviar `vendedorId` en mutaciones. |
| Catálogo cliente | `GET /api/v1/clientes/providers`; `POST /api/v1/clientes/providers/select`; `GET /api/v1/products/list?vendedorId={vendedorId}`; `GET /api/v1/products/search?q={texto}&vendedorId={vendedorId}` | `vendedorId` sale del proveedor seleccionado. |
| Carrito | `GET /api/v1/cart/get?vendedorId={vendedorId}`; `POST /api/v1/cart/items/add`; `PATCH /api/v1/cart/items/update`; `DELETE /api/v1/cart/items/delete` | Confirmar comportamiento vivo de delete porque OpenAPI no exige `cantidad`. |
| Pedido cliente | `POST /api/v1/orders/create`; `GET /api/v1/orders/job-status?id={trackingId}`; `GET /api/v1/orders/list`; `GET /api/v1/orders/get-by-id?id={id}` | `orders.create` requiere `Idempotency-Key` y responde async. |

### Comportamiento mínimo

- [ ] Login guarda sesión y restaura perfil con `GET /api/v1/users/profile`.
- [ ] Redirección por rol: `super_admin` → `/admin`, `vendedor` → `/vendedor`, `cliente` → `/cliente`.
- [ ] Rutas protegidas usan guard por autenticación y rol.
- [ ] Cada lista tiene loading, empty y error básico.
- [ ] Mutaciones críticas usan confirmación visual y botón loading.
- [ ] Cliente no opera catálogo/carrito sin proveedor activo cuando `requiresSelection=true`.
- [ ] Pedido usa `Idempotency-Key` y consulta job-status con `trackingId`.
- [ ] No se envía `userId` en body para identidad JWT.

## 4. Alcance OUT

| Fuera del MVP | Motivo |
| --- | --- |
| Registro vendedor `/auth/register-seller` | Útil, pero no bloquea la demo si existen usuarios seed o creados previamente. |
| Invitación cliente `/invite/:token` | Queda para el siguiente slice; el MVP puede usar cliente existente. |
| Reset password `/auth/reset-password` | Flujo auxiliar, no central para demo comercial. |
| `/admin/clientes` | Administración completa de clientes queda fuera del slice chico. |
| `/admin/auditoria` | Auditoría no bloquea el flujo comercial básico. |
| `/admin/invitaciones` | QR/link admin queda fuera; además tiene endpoints admin registrados que deben consolidarse con el mapa base si entran luego. |
| `/vendedor/perfil` | Perfil completo no bloquea catálogo básico si el vendedor ya existe. |
| `/vendedor/clientes` | Cartera vendedor queda fuera para no inflar alcance. |
| `/vendedor/catalogo/categorias` y `/vendedor/catalogo/marcas` | En MVP se pueden consumir categorías/marcas existentes; gestión completa queda para siguiente slice. |
| `/vendedor/invitaciones` | Registro/invitación de clientes queda fuera del primer demo. |
| `/vendedor/pedidos` | Gestión de pedidos por vendedor queda fuera del primer slice; el MVP prioriza creación y visualización cliente. |
| `/vendedor/entregas` | `deliveries.*` está documentado como gap de OpenAPI vivo; no bloquea MVP. |
| Diseño visual final completo | Se implementa una base consistente; refinamiento visual completo queda posterior. |
| Tests e2e exhaustivos | Solo smoke/manual QA por rol para este slice. |

## 5. Flujo demo paso a paso

| Paso | Actor | Acción | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Usuario | Entra a `/auth/login` e inicia sesión. | La sesión queda guardada y se consulta perfil. |
| 2 | Sistema | Redirige por `role`. | Admin va a `/admin`, vendedor a `/vendedor`, cliente a `/cliente`. |
| 3 | Admin | Entra a `/admin/vendedores`. | Ve listado paginado/filtrable. |
| 4 | Admin | Cambia estado de un vendedor a `activo`. | La tabla refleja el estado actualizado. |
| 5 | Vendedor | Entra a `/vendedor`. | Ve accesos a catálogo y estado operativo. |
| 6 | Vendedor | Entra a `/vendedor/catalogo/productos`. | Lista productos propios y puede crear/editar/desactivar. |
| 7 | Cliente | Entra a `/cliente`. | Ve proveedor activo o selecciona uno disponible. |
| 8 | Cliente | Entra a `/cliente/catalogo`. | Ve productos del proveedor y agrega item al carrito. |
| 9 | Cliente | Entra a `/cliente/carrito`. | Revisa items y confirma pedido con `Idempotency-Key`. |
| 10 | Cliente | Consulta `/cliente/pedidos`. | Ve pedido creado o estado async según `trackingId`. |

## 6. Orden de implementación recomendado

1. [ ] Base Angular, Tailwind, PrimeNG, Heroicons y rutas shell.
2. [ ] `AuthService`, interceptors, guards y login con redirección por rol.
3. [ ] Layout autenticado común: navegación por rol, logout, estados 401/403.
4. [ ] Pantallas admin mínimas: `/admin`, `/admin/vendedores`.
5. [ ] Pantallas vendedor mínimas: `/vendedor`, `/vendedor/catalogo/productos`.
6. [ ] Selector de proveedor cliente y home `/cliente`.
7. [ ] Catálogo cliente con agregar al carrito.
8. [ ] Carrito + creación async de pedido.
9. [ ] Pedidos cliente + job-status básico.
10. [ ] Smoke QA por rol contra OpenAPI/Scalar vivo.

## 7. Componentes y patrones necesarios

| Componente/patrón | Uso en MVP | Regla práctica |
| --- | --- | --- |
| `PublicLayout` | Login | Pantalla simple, clara y sin navegación autenticada. |
| `RoleShellLayout` | Áreas admin, vendedor y cliente | Sidebar/topbar por rol, usuario actual y logout. |
| `PageHeader` | Todas las vistas | Título, descripción corta y máximo un CTA principal. |
| `DataTablePage` | Vendedores, productos, pedidos | PrimeNG Table, filtros, paginación, loading/empty/error. |
| `FormSection` | Login, producto, checkout | Campos agrupados por responsabilidad. |
| `StatusBadge` | Vendedor, producto, pedido/job | Estados con color y texto consistente. |
| `ConfirmDialog` | Cambiar estado, desactivar producto, confirmar pedido | Nombrar entidad y consecuencia. |
| `LoadingButton` | Login y mutaciones | Evitar doble submit. |
| `ProviderSelector` | Home/catálogo/carrito cliente | Usa `providers[].id` como `vendedorId`; nunca entrada manual. |
| `AsyncJobStatus` | Pedido cliente | Polling con `trackingId`, no con `orderId`. |
| Interceptor auth/error | Todas las llamadas protegidas | Bearer token, refresh si aplica y errores 401/403/409 recuperables. |

## 8. Criterios de aceptación por rol

### Público/auth

- [ ] Login funciona con credenciales válidas.
- [ ] Login inválido muestra error visible sin sesión parcial.
- [ ] Redirección usa `super_admin`, `vendedor`, `cliente` literales.
- [ ] Recarga de página restaura perfil o vuelve a login sin loop infinito.

### Admin

- [ ] Admin accede a `/admin` y `/admin/vendedores`.
- [ ] Admin lista vendedores con `page`, `limit`, `search` y/o `estado` cuando aplique.
- [ ] Admin cambia estado con confirmación y estados válidos (`activo`, `inactivo`, `bloqueado`).
- [ ] Admin no ve rutas de vendedor/cliente como si fueran propias.

### Vendedor

- [ ] Vendedor accede a `/vendedor` y `/vendedor/catalogo/productos`.
- [ ] Vendedor lista productos propios.
- [ ] Vendedor crea/edita/desactiva producto sin enviar `vendedorId` ni `userId`.
- [ ] Estados loading, empty y error están presentes en catálogo.

### Cliente

- [ ] Cliente accede a `/cliente`.
- [ ] Si requiere selección, elige proveedor con `POST /api/v1/clientes/providers/select`.
- [ ] Catálogo usa `vendedorId` del proveedor seleccionado.
- [ ] Cliente agrega producto al carrito y modifica cantidades.
- [ ] Cliente crea pedido con `Idempotency-Key`.
- [ ] UI consulta `orders/job-status?id={trackingId}` y muestra resultado accionable.

## 9. Gaps/riesgos que no bloquean MVP

| Gap/riesgo | Impacto | Acción recomendada |
| --- | --- | --- |
| OpenAPI vivo no verificado en esta documentación | Puede haber diferencias menores con código local. | Confirmar en Scalar/OpenAPI antes de implementar cada feature. |
| Métricas exactas de `/admin` y `/vendedor` | Dashboards pueden necesitar fallback simple. | Usar accesos rápidos y cards básicas; detalles por confirmar en OpenAPI vivo. |
| Categorías/marcas para producto | Crear producto puede depender de datos existentes. | Usar categorías/marcas existentes o confirmar flujo mínimo antes de demo. |
| Delete de carrito | OpenAPI no exige `cantidad`, pero schema compartido la menciona. | Confirmar comportamiento vivo antes de cerrar QA. |
| Estado vendedor no activo | UX final para `pendiente`, `inactivo`, `bloqueado` no está cerrada. | Mostrar aviso y limitar acciones críticas si backend responde 403/409. |
| Imagen de producto | URL/upload no está cerrado. | En MVP permitir campo opcional solo si el contrato vivo lo confirma. |
| Gestión vendedor de pedidos | No incluida en este slice. | Aceptar que la demo termina en pedido cliente visible, no en fulfillment completo. |
| Entregas | `deliveries.*` tiene gap de OpenAPI generado local. | Dejar fuera del MVP. |

## 10. Próximo slice sugerido

El siguiente slice debería ampliar el flujo comercial sin saltar todavía a “frontend completo”:

- [ ] Registro vendedor y estado pendiente.
- [ ] Invitaciones QR/link para registro de cliente.
- [ ] Gestión de categorías y marcas del vendedor.
- [ ] Pedidos vendedor: listar, confirmar y cambiar estado.
- [ ] Perfil vendedor y cliente/cartera básica.
- [ ] QA e2e del circuito invitación → catálogo → pedido → confirmación vendedor.
