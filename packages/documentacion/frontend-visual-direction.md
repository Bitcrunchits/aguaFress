# Dirección visual MVP frontend AguaFress

Esta guía define una dirección visual concreta para implementar el MVP de AguaFress con **Angular + Tailwind + PrimeNG + Heroicons** sin caer en un panel administrativo genérico. No reemplaza el diseño final en Figma: fija criterios visuales, tokens y patrones suficientes para construir el primer slice con identidad, claridad operativa y consistencia.

## 1. Resumen ejecutivo

| Decisión | Dirección MVP |
| --- | --- |
| Personalidad | Operativa, clara, local y confiable; comunica agua fresca y distribución cotidiana sin decoración literal excesiva. |
| Firma visual | **Ruta de agua**: una línea fina azul-verde que conecta navegación, estados y progreso de pedido como si fuera una ruta de reparto. Sobria, funcional y repetible. |
| Estética | Superficies claras, bordes suaves, acentos aqua/teal, jerarquía limpia y detalles inspirados en logística local. |
| Evitar | Cyberpunk, SaaS genérico, dashboard gris sin identidad, gradientes decorativos sin función, ilustraciones stock. |
| Alcance | Tokens, layouts, componentes y mini blueprints visuales para el MVP definido en `frontend-mvp-slice.md`. |

La idea rectora: **AguaFress debe sentirse como una herramienta diaria de reparto de agua: fresca, simple, confiable y rápida de leer en operación real.**

## 2. Personalidad visual

| Principio | Regla práctica |
| --- | --- |
| Frescura sobria | Usar aqua y azul profundo como acentos funcionales, no como decoración permanente. El blanco y los tonos hielo dominan. |
| Operación local | Mostrar datos y acciones como una agenda de reparto: estados claros, rutas, proveedor activo, pedido en progreso. |
| Confianza antes que espectáculo | Contraste, legibilidad y confirmaciones visibles valen más que efectos visuales. |
| Una firma, no diez adornos | La “ruta de agua” aparece en navegación activa, timelines y estados async; no agregar olas, burbujas o íconos acuáticos por todos lados. |
| UI de trabajo, no template SaaS | Cada pantalla debe decir qué se controla: vendedores, productos, proveedor, carrito o pedido. Evitar títulos genéricos como “Overview” o “Dashboard” sin contexto. |

## 3. Tokens MVP

### 3.1 Colores

| Token semántico | Hex | Uso |
| --- | --- | --- |
| `agua-primary` | `#0E7490` | CTA principal, navegación activa, links importantes. |
| `agua-primary-dark` | `#155E75` | Hover/pressed del primario, encabezados activos. |
| `agua-flow` | `#22D3EE` | Firma “ruta de agua”, progreso, foco visual controlado. |
| `fresh-mint` | `#A7F3D0` | Fondos suaves de éxito/frescura, highlights no críticos. |
| `ice-surface` | `#F0FDFA` | Fondo alternativo de paneles y PublicLayout. |
| `clean-white` | `#FFFFFF` | Cards, formularios, tablas. |
| `slate-ink` | `#0F172A` | Texto principal. |
| `slate-muted` | `#64748B` | Texto secundario, metadata, hints. |
| `line-soft` | `#D9EEF2` | Bordes, divisores, contornos de cards. |
| `route-warning` | `#F59E0B` | Pendiente, atención, pedido en proceso. |
| `route-success` | `#16A34A` | Activo, entregado, completado. |
| `route-danger` | `#DC2626` | Bloqueado, cancelado, error. |

**Regla de proporción:** 70% superficies claras, 20% texto/bordes neutros, 10% acento aqua/estado. Si la pantalla “grita azul”, está mal calibrada.

### 3.2 Tipografía

| Rol | Recomendación | Uso |
| --- | --- | --- |
| UI principal | `Inter`, fallback `system-ui`, `sans-serif` | Formularios, tablas, navegación y copy operativo. |
| Títulos de sección | `Manrope`, fallback `Inter`, `system-ui` | Page headers, cards destacadas, login. |
| Datos compactos | `Roboto Mono`, fallback `ui-monospace`, `monospace` | IDs cortos, jobId/trackingId truncado, códigos internos visibles solo cuando aporten. |

Escala sugerida:

| Uso | Tamaño | Peso |
| --- | --- | --- |
| Título de pantalla | 28-32 px | 700 |
| Título de card/sección | 18-20 px | 650 |
| Texto base | 14-16 px | 400-500 |
| Metadata/ayuda | 12-13 px | 400 |

### 3.3 Radios, sombras y espaciado

| Token | Valor | Uso |
| --- | --- | --- |
| Radio pequeño | 8 px | Inputs, badges, chips. |
| Radio medio | 12 px | Botones, cards pequeñas, filtros. |
| Radio grande | 18 px | Paneles principales y contenedores de login. |
| Sombra card | Suave, corta, sin dramatismo | Cards y paneles sobre fondo hielo. |
| Sombra flotante | Media y controlada | Dialogs, panel lateral, menú usuario. |
| Espaciado base | 4 px | Escala Tailwind compatible. |
| Separación de secciones | 24-32 px | Entre header, filtros, tabla/cards. |
| Padding panel | 20-24 px desktop; 16 px mobile | Cards, formularios y DataPage. |

### 3.4 Light/dark básico

El MVP debe priorizar **light mode**. Dark mode puede prepararse como base, pero no debe consumir diseño fino antes del Figma final.

| Modo | Dirección |
| --- | --- |
| Light | Fondo `ice-surface`, cards `clean-white`, texto `slate-ink`, acento `agua-primary`. |
| Dark básico | Fondo azul petróleo muy oscuro, cards azul grisáceo, texto claro, acento `agua-flow` reducido. |

No implementar contrastes “neón”. El dark, si existe, debe sentirse como turno nocturno de operación, no como estética cyberpunk.

## 4. Layout visual

### 4.1 `PublicLayout` / login

- Pantalla en dos zonas: formulario claro y panel contextual de marca.
- Panel visual con la firma “ruta de agua”: línea fina que conecta tres puntos: **Proveedor → Pedido → Entrega**.
- Fondo hielo, card blanca, título directo y copy de confianza.
- En móvil, el panel contextual se compacta como encabezado superior.

Copy ejemplo:

| Elemento | Texto sugerido |
| --- | --- |
| Título | “Entrar a AguaFress” |
| Ayuda | “Gestiona pedidos, catálogo y reparto desde un solo lugar.” |
| Error 401 | “El email o la contraseña no coinciden. Revisa los datos e intenta nuevamente.” |

### 4.2 `RoleShellLayout`

- Sidebar clara con acento activo `agua-primary` y línea “ruta de agua” en el borde izquierdo del ítem activo.
- Topbar simple: rol, nombre, proveedor activo si aplica, logout.
- Contenido con ancho operativo: evitar pantallas estiradas sin jerarquía.
- Navegación por rol con etiquetas concretas: “Vendedores”, “Productos”, “Catálogo”, “Carrito”, “Pedidos”.

### 4.3 Dashboards

- No usar dashboard genérico de métricas vacías.
- Cada home debe funcionar como “puesto de control” del rol.
- Cards de acceso rápido con estado: pendiente, activo, en proceso, requiere atención.

| Rol | Enfoque visual |
| --- | --- |
| Admin | Control de habilitación y salud operativa: vendedores pendientes, activos y bloqueados. |
| Vendedor | Operación de catálogo: productos activos, pedidos recientes y estado del perfil. |
| Cliente | Proveedor activo, carrito y último pedido. |

### 4.4 `DataPage` / tabla

- Header claro con título, descripción corta y un CTA principal máximo.
- Filtros en banda blanca con borde suave, no como barra gris pesada.
- PrimeNG Table con filas respiradas, estados con badges y acciones discretas.
- En móvil, pasar a cards resumidas si la tabla fuerza scroll horizontal excesivo.

### 4.5 Catálogo / cards

- Cards blancas sobre fondo hielo, imagen opcional, nombre, precio y acción visible.
- Productos sin imagen usan bloque sobrio con inicial o ícono lineal, no placeholders genéricos de stock.
- El proveedor activo debe verse como contexto persistente: “Comprando a: Distribuidora Norte”.
- Filtros como chips: categoría, marca, disponibilidad.

### 4.6 Carrito / pedido async

- Carrito como resumen de reparto: proveedor, items, dirección, método de pago y confirmación.
- Después de crear pedido, mostrar estado con timeline “ruta de agua”: **Aceptado → Procesando → Confirmado / Requiere revisión**.
- El `trackingId` puede mostrarse truncado solo como referencia secundaria.

## 5. Componentes clave

### Botones

| Tipo | Dirección visual | Copy ejemplo |
| --- | --- | --- |
| Primario | Fondo `agua-primary`, texto blanco, radio medio. | “Iniciar sesión”, “Guardar producto”, “Confirmar pedido” |
| Secundario | Fondo blanco, borde `line-soft`, texto `agua-primary-dark`. | “Limpiar filtros”, “Ver detalle” |
| Peligro | Fondo blanco o rojo suave, texto `route-danger`; confirmar antes de ejecutar. | “Bloquear vendedor”, “Cancelar pedido” |
| Async/loading | Mantener ancho y texto de acción con indicador. | “Confirmando pedido…” |

### Inputs/forms

- Labels visibles siempre; no depender solo de placeholder.
- Ayuda breve bajo campos complejos.
- Errores inline concretos y recuperables.
- Agrupar por responsabilidad: cuenta, datos comerciales, dirección, producto.

### Cards

- Borde `line-soft`, radio grande, sombra suave.
- Header con título y metadata; cuerpo con dato útil; footer con acción o estado.
- Evitar cards con solo números gigantes si no hay acción asociada.

### Tablas

- Cabeceras con texto humano: “Vendedor”, “Estado”, “Última actualización”.
- Badges para estados; acciones por fila agrupadas.
- Empty filtrado distinto de empty real.

### Badges de estado

| Estado | Color | Texto sugerido |
| --- | --- | --- |
| Activo / completado / entregado | `route-success` | “Activo”, “Completado”, “Entregado” |
| Pendiente / procesando | `route-warning` | “Pendiente”, “Procesando” |
| Inactivo | `slate-muted` | “Inactivo” |
| Bloqueado / error / cancelado | `route-danger` | “Bloqueado”, “Error”, “Cancelado” |
| Nuevo / información | `agua-primary` | “Nuevo”, “En revisión” |

### `EmptyState`, `ErrorState`, `Skeleton`

| Estado | Regla visual | Copy ejemplo |
| --- | --- | --- |
| Empty real | Card centrada, ícono lineal, CTA útil. | “Todavía no hay productos cargados.” |
| Empty por filtro | Mensaje junto a filtros, CTA limpiar. | “No encontramos vendedores con esos filtros.” |
| Error | Borde suave rojo, acción visible. | “No pudimos cargar el catálogo. Intenta de nuevo en unos segundos.” |
| Skeleton | Mantener forma real de tabla/card. | Sin copy; evitar spinners grandes en listas. |

### Navegación/sidebar

- Ítem activo con línea vertical “ruta de agua” y fondo `ice-surface`.
- Íconos Heroicons lineales, no rellenos pesados.
- Grupos por tarea, no por arquitectura técnica.
- En mobile, navegación inferior o drawer simple según implementación Angular futura.

## 6. Pantallas MVP: mini blueprint visual

### `/auth/login`

| Aspecto | Dirección |
| --- | --- |
| Layout | Card de login + panel de marca con ruta Proveedor → Pedido → Entrega. |
| Jerarquía | Título claro, dos campos, CTA primario, links secundarios discretos. |
| Firma visual | Línea aqua fina en el panel y foco del input. |
| Estado clave | Error 401 inline y sin limpiar todo el formulario. |

### `/admin/vendedores`

| Aspecto | Dirección |
| --- | --- |
| Layout | `DataPage` con filtros por búsqueda/estado y tabla PrimeNG. |
| Jerarquía | Primero vendedores que requieren acción; estados muy visibles. |
| Firma visual | Estado activo como punto en la “ruta” del vendedor; pendiente como atención operativa. |
| Acción principal | Cambiar estado con confirmación clara. |

### `/vendedor/catalogo/productos`

| Aspecto | Dirección |
| --- | --- |
| Layout | Header operativo, filtros, tabla desktop y cards compactas mobile. |
| Jerarquía | Producto, categoría/marca, stock, precio, estado y acciones. |
| Firma visual | Producto activo como elemento disponible para la ruta de venta. |
| Estado clave | Empty con CTA: “Cargar primer producto”. |

### `/cliente/catalogo`

| Aspecto | Dirección |
| --- | --- |
| Layout | Proveedor activo arriba, filtros por categoría/marca y grid de cards. |
| Jerarquía | Nombre, precio, disponibilidad y CTA “Agregar”. |
| Firma visual | Banda sutil “Comprando a: {proveedor}” con acento aqua. |
| Estado clave | Si no hay proveedor seleccionado, bloquear catálogo con dirección clara para elegir proveedor. |

### `/cliente/carrito`

| Aspecto | Dirección |
| --- | --- |
| Layout | Items a la izquierda, resumen de pedido a la derecha en desktop; una columna en mobile. |
| Jerarquía | Proveedor, items, cantidades, dirección, total estimado y CTA final. |
| Firma visual | Timeline de pedido después de confirmar. |
| Estado clave | Creación async con “Pedido aceptado” y seguimiento por estado. |

### `/cliente/pedidos`

| Aspecto | Dirección |
| --- | --- |
| Layout | Lista de pedidos como cards o tabla responsive, con estado destacado. |
| Jerarquía | Estado, fecha, proveedor, total, acción ver detalle/cancelar si aplica. |
| Firma visual | Mini ruta de estado: Pendiente → Confirmado → En camino → Entregado. |
| Estado clave | Empty con CTA “Ir al catálogo”. |

## 7. Riesgo estético principal y cómo evitarlo

El riesgo principal es terminar en un **dashboard gris genérico**: sidebar estándar, cards con números grandes, tablas sin identidad y botones azules sin relación con AguaFress.

Para evitarlo:

- Usar la firma “ruta de agua” de forma consistente en navegación activa, progreso async y estados de pedido.
- Mantener la paleta hielo/aqua como identidad, no como decoración saturada.
- Escribir títulos y CTAs específicos del negocio: “Cambiar estado del vendedor”, “Agregar al carrito”, “Confirmar pedido”.
- Mostrar siempre el contexto operativo: rol, proveedor activo, estado del pedido o entidad afectada.
- Evitar componentes PrimeNG sin personalización mínima de spacing, bordes, estados y copy.

## 8. Checklist visual antes de implementar Angular

- [ ] Los tokens de color están cargados con nombres semánticos, no colores sueltos por pantalla.
- [ ] `PublicLayout` y `RoleShellLayout` aplican la firma “ruta de agua” sin recargar la UI.
- [ ] PrimeNG Table, Dialog, Input y Button tienen adaptación visual coherente con AguaFress.
- [ ] Cada pantalla MVP tiene loading, empty, error y estado de éxito definidos.
- [ ] La navegación usa etiquetas de negocio, no nombres técnicos de módulos.
- [ ] El proveedor activo del cliente es visible antes de catálogo, carrito y pedido.
- [ ] Los estados usan badges consistentes y textos en español neutral/profesional.
- [ ] El pedido async muestra progreso comprensible, no solo `jobId` o datos técnicos.
- [ ] El diseño se ve operativo y fresco, no cyberpunk, no plantilla SaaS genérica, no dashboard gris.
- [ ] Antes del Figma final, esta guía se usa como base MVP y no como contrato visual definitivo.
