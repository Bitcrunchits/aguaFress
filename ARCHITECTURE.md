# Arquitectura AguaFress Mobile — Fuente de Verdad

> Basado en el material de estudio `estudio-react-native.html` (ITS Cipolletti).
> Este documento define los principios arquitectónicos, patrones y convenciones del proyecto.
> Versión actual: **Julio 2026**

## Stack

| Capa       | Tecnología                          |
| ---------- | ----------------------------------- |
| Framework  | React Native 0.81.5 + Expo SDK 54   |
| Lenguaje   | TypeScript 5.9 (strict, sin `any`)  |
| Navegación | Expo Router 6 (file-based routing)  |
| Estado     | React Context + hooks locales       |
| Datos      | Servicios mock con `delay()`        |
| Estilos    | `StyleSheet` + tema centralizado    |
| Persistencia | MMKV (próximamente)              |

## Arquitectura en Capas

```
app/              ← Presentación (pantallas y layouts)
src/
├── components/   ← UI reutilizable (sin lógica de negocio)
├── constants/    ← Tema centralizado + mapeos de estado
├── context/      ← Estado global (Auth, Cart, SelectedProvider)
├── data/         ← Fuente única de datos mock
├── hooks/        ← Lógica reutilizable (formularios, data fetching)
├── services/     ← Acceso a datos (mock → API real)
└── types/        ← Interfaces TypeScript
```

### Reglas por Capa

#### 🎨 Presentación (`app/`)
- Las pantallas **coordinan**, no implementan lógica de negocio.
- Cada pantalla debe contemplar los 4 estados de UI asincrónica: `loading`, `error`, `empty`, `success`.
- Los layouts (`_layout.tsx`) definen navegación y providers.
- Safe areas: usar `useSafeAreaInsets()` — nunca valores fijos.

#### 🧩 Componentes (`src/components/`)
- **Sin lógica de negocio.** Reciben props, renderizan UI, emiten eventos.
- Deben ser reutilizables en distintos contextos.
- Props tipadas con TypeScript siempre.
- No importar hooks de contexto directamente (ej: `ItemCard` no usa `useCart`, recibe `onAddToCart`).
- Variantes mediante props (`variant`, `size`, etc.), no creando componentes duplicados.

#### 🧠 Hooks (`src/hooks/`)
- Encapsulan lógica de estado y efectos reutilizable.
- Separan la lógica del componente visual.
- Convención de nomenclatura: `use[Recurso]` → `useProducts`, `useOrderForm`.

#### 🌐 Context (`src/context/`)
- Estado global compartido: sesión de usuario, carrito, proveedor activo.
- No poner datos de API en Context (para eso están los hooks locales).
- Separar tipos de estado: UI ≠ sesión ≠ datos remotos.
- El Context es la ÚNICA API pública para las screens. Los services son internos del Context.

#### 🔌 Servicios (`src/services/`)
- **Única capa** que conoce endpoints, HTTP, y formato de datos externos.
- Devuelven `Promise` siempre (incluso en mock).
- Usan `delay()` para simular latencia.
- Nunca importan componentes de React Native.
- Si cambia el backend, SOLO se modifica esta capa.
- Incluyen validación de negocio (defense in depth — ej: provider lock en addToCart).

#### 📋 Types (`src/types/`)
- Interfaces para todas las entidades del dominio.
- DTOs separados de modelos de UI cuando sea necesario.
- Tipos estrictos, sin `any`.

#### 📦 Data (`src/data/`)
- Única fuente de verdad para datos mock.
- Todos los servicios importan desde acá, no entre sí.
- SRP: separar datos de la lógica de acceso.

## Flujo Unidireccional

```
Evento (tap/input)
  → Hook/Context (interpreta, valida, orquesta)
    → Service (accede a datos, mock o API)
      → Estado actualizado
        → UI re-renderiza
```

## Tema Centralizado — Paleta Oceánica Profesional

`src/constants/theme.ts` es la ÚNICA fuente de verdad para:

- `colors` — paleta: `#006D77` (teal), `#E29578` (coral), `#1D1D1F` (texto)
- `spacing` — espaciados (xs, sm, md, lg, xl)
- `typography` — estilos de texto con color incluido
- `borderRadius` — esquinas redondeadas
- `shadows` — sombras (small, medium)

**Prohibido**: hardcodear colores, valores de spacing o estilos de texto fuera de este archivo.

## Navegación (Expo Router)

```
app/
├── _layout.tsx       ← Layout raíz (auth condicional)
├── index.tsx         ← Home / Landing (con splash animado)
├── (auth)/
│   └── login.tsx     ← Pantalla de login
├── (tabs)/
│   ├── _layout.tsx   ← Tabs + safe area + botón "Salir" en header
│   ├── index.tsx     ← Catálogo (filtrado por proveedor + search debounce)
│   ├── cart.tsx      ← Carrito de compras
│   ├── orders.tsx    ← Historial de pedidos (filtrado por proveedor)
│   └── profile.tsx   ← Perfil + dirección de entrega + notas
├── order/
│   ├── form.tsx      ← Checkout (solo CartContext)
│   └── [id].tsx      ← Detalle pedido con timeline de estados
├── products/
│   └── [id].tsx      ← Detalle de producto
└── vendor/           ← Dashboard del vendedor
    ├── _layout.tsx
    ├── index.tsx     ← Dashboard
    ├── metrics.tsx   ← Métricas detalladas
    ├── orders.tsx    ← Gestión pedidos
    ├── order-detail/
    │   └── [id].tsx  ← Detalle pedido + acciones
    ├── products.tsx  ← Gestión productos
    └── add-product.tsx
```

## Estados de UI (Patrón Obligatorio)

Toda pantalla con datos asincrónicos DEBE implementar:

```typescript
type LoadingState = 'loading' | 'success' | 'empty' | 'error';

if (state === 'loading') return <Spinner />;
if (state === 'error')   return <ErrorState onRetry={reload} />;
if (state === 'empty')   return <EmptyState />;
return <DataView data={data} />;
```

## Patrones Clave

### Provider Lock (Defense in Depth)
- **Capa UI:** botón de cambio deshabilitado + banner informativo si hay items en carrito.
- **Capa Service:** `addToCart()` valida vendorId contra proveedor activo antes de permitir la operación.
- Siempre validar en la capa de datos como respaldo de la UI.

### Cart Dual State (Anti-Patrón Corregido)
- ❌ No acceder a `getCart()`/`clearCart()` del service directamente desde screens.
- ✅ Todo pasa por `CartContext` — única API pública para el carrito.
- El service es interno del Context, no de las screens.

### Datos Centralizados
- `mockData.ts` → datos mock (única fuente de verdad).
- `orderStatus.ts` → labels y colores de estados (OCP, DRY).
- `theme.ts` → diseño visual centralizado.

### Safe Area
- Usar `useSafeAreaInsets()` con `react-native-safe-area-context`.
- No valores fijos de padding. Cada dispositivo tiene distintas safe areas.

### Search Debounce
- 350ms de debounce para evitar race conditions en búsqueda.
- Cleanup del timer en useEffect para cancelar búsquedas previas.

## Buenas Prácticas

- ✅ Inmutabilidad: siempre devolver copias con spread operator.
- ✅ Pull-to-Refresh en toda lista (`RefreshControl`).
- ✅ Feedback visual inmediato en formularios (borde rojo, error inline).
- ✅ Botón deshabilitado durante envío.
- ✅ No limpiar campos si hay error de red.
- ✅ TypeScript estricto: tipar props, estado, respuestas siempre.
- ✅ Componentes reutilizables con props de variante.
- ✅ Defense in depth: validación en UI + service.
- ✅ Sin `console.log` en producción (TypeScript strict lo marca).

## Próximos Pasos (Planificados)

1. **Persistencia con MMKV** — carrito, sesión, perfil, pedidos cacheados.
2. **Offline-first** — cache-first + cola de pedidos offline + banner sin conexión.
3. **Separar cart.service.ts** — extraer lógica de carrito de `product.service.ts`.
4. **Manejo de errores real** — feedback al usuario en fallos HTTP (cuando haya API real).
5. **Tests** — Jest + React Native Testing Library.
