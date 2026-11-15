# Frontend de AguaFress

Cliente Angular de la plataforma AguaFress para gestionar pedidos de distribuidores de agua y soda. Forma parte del monorepositorio de pnpm y se comunica con la API REST del gateway.

## Tecnologías

- Angular 20.3 — componentes independientes, señales y flujo de control `@if`/`@for`
- PrimeNG 20.4 — `AguaPreset` personalizado (derivado de Aura)
- Tailwind CSS v4 y Sass — estilos globales en `src/styles.scss`
- TypeScript 5.9, pnpm 12.3.4 y Node >= 22
- Contratos compartidos de `@agua/contracts` (DTO, enumeraciones y eventos)

## Requisitos

- Node >= 22
- pnpm 12.3.4 (consulte `engines` en el `package.json` de la raíz; si la versión de pnpm disponible en la terminal es diferente, anteponga `pnpm dlx pnpm@12.3.4` a los comandos)

## Instalación

Desde la raíz del repositorio:

```bash
pnpm install
pnpm run build:contracts   # compila @agua/contracts, necesario para el frontend
```

## Ejecución

Servidor de desarrollo conectado al gateway desplegado (configuración `development` predeterminada):

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend start
# http://localhost:4200
```

Para utilizar un gateway local (`http://localhost:3000`):

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend start:local
```

## Entornos y destino de la API

La URL base de la API se define para cada entorno en `src/environments/` y se consulta desde `src/app/core/config/api.config.ts` (`API_CONFIG.baseUrl`). Los servicios importan `API_CONFIG` en lugar de importar directamente los archivos de entorno de Angular.

| Entorno | Comando | URL base de la API |
| --- | --- | --- |
| `development` (predeterminado) | `start` | `https://api-aguafress.eadev.cloud` |
| `local` | `start:local` | `http://localhost:3000` |
| `production` | `build` | `https://api-aguafress.eadev.cloud` |

## Compilación

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend build          # producción, salida en dist/frontend
pnpm dlx pnpm@12.3.4 --filter @agua/frontend build:local    # configuración local
```

## Pruebas

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless
```

Karma y Jasmine. La suite se ejecuta sin interfaz gráfica; utilice `--watch=false` para la integración continua (CI) o las ejecuciones puntuales.

## Estructura del proyecto

```
src/app/
  app.config.ts         # proveedores: enrutador, HTTP (interceptor de autenticación), preset de PrimeNG, animaciones
  app.routes.ts         # árbol de rutas con carga diferida y protección por roles
  core/                 # servicios transversales del marco de trabajo
    auth/               # sesión JWT, rotación del token de renovación, guards, almacenamiento de sesión
    http/               # auth.interceptor (adjunta el token; ante un 401 aplicable, cierra sesión y redirige)
    config/             # API_CONFIG (URL base)
    theme/              # ThemeService (modo claro/oscuro), AguaPreset, inicialización del tema
  features/             # módulos de funcionalidades por rol
    auth/               # funcionalidades de autenticación: login, register-seller, invite
    admin/              # área de trabajo del superadministrador
    vendedor/           # área de trabajo del vendedor (products, clients, invites, orders, profile)
    cliente/            # área de trabajo del cliente (catalog, cart, orders, profile)
  layout/
    app-shell/          # estructura autenticada con navegación según el rol
    environment-banner/ # indicador del entorno de desarrollo/local
  shared/               # componentes de interfaz y utilidades reutilizables (status-label, confirm-dialog,
                        # change-password-form, theme-toggle, upload-url, order-format)
```

## Rutas y roles

Tres roles definidos en `@agua/contracts` (`UserRole`): `super_admin`, `vendedor`, `cliente`.

- Rutas públicas (`guestGuard`): `/auth/login`, `/auth/register-seller`, `/invite/:token`
- Rutas autenticadas (`authGuard`) y restringidas por rol (`roleGuard`): `/admin/*`, `/vendedor/*`, `/cliente/*`
- Las rutas desconocidas redirigen a `/auth/login`

Los guards se encuentran en `core/auth/auth.guard.ts` (`authGuard`, `guestGuard`, `roleGuard`).

## Autenticación

- Tokens JWT de acceso y renovación, almacenados mediante `core/auth/session-storage.service`.
- Rotación del token de renovación (el backend calcula su hash y lo rota).
- `core/http/auth.interceptor.ts` adjunta el token de acceso a las llamadas protegidas del gateway y, ante un `401` de la sesión vigente, la cierra y redirige a `/auth/login`. La renovación mediante `/auth/refresh` ocurre al restaurar la sesión desde `AuthService`, no como reintento automático.
- `auth.guard.ts` recupera y valida la sesión al iniciar la aplicación.

## Tema

- `ThemeService` (`core/theme`) guarda la preferencia entre modo claro y oscuro y alterna el uso del selector `.agua-dark`.
- PrimeNG utiliza el `AguaPreset` personalizado (derivado de Aura) con una paleta de tonos cian y agua.
- Los tokens globales se definen en `src/styles.scss` (propiedades personalizadas de CSS y `@theme` de Tailwind).

## Documentación del backend

Documentación en línea del gateway para consultar al integrar funcionalidades:

- Scalar: `https://api-aguafress.eadev.cloud/api/docs`
- OpenAPI: `https://api-aguafress.eadev.cloud/api/openapi.json`

## Comandos útiles

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend ng generate component features/cliente/my-component
```

Antes de cada commit se ejecuta el hook de revisión de código GGA (Gentle Guardian Angel). Mantenga los commits pequeños y siga las reglas de SOLID y Clean Code del archivo `AGENTS.md` de la raíz.
