# Frontend de AguaFress

Frontend Angular 20 standalone para el MVP de AguaFress. Este paquete contiene el flujo de login, los shells por rol y la lista de vendedores del administrador; las llamadas al backend pasan por el gateway de AguaFress.

## Requisitos

- Node.js 22 o superior (`node -v`)
- pnpm `12.3.4` (el repositorio fija esta versión)
- Chrome o Chromium para los tests de Karma
- Docker solo si se quiere levantar el backend local

La versión de pnpm instalada globalmente puede ser rechazada por `engines.pnpm`. Ejecutar todos los comandos con la versión fijada:

```bash
pnpm dlx pnpm@12.3.4 <comando>
```

## Instalar dependencias

Desde la raíz del repositorio:

```bash
pnpm dlx pnpm@12.3.4 install
```

## Ambientes

La aplicación incluye tres configuraciones de Angular:

| Ambiente | Archivo | URL base de la API | Banner inferior | Comando |
| --- | --- | --- | --- | --- |
| Local | `src/environments/environment.local.ts` | `http://localhost:3000` | `AMBIENTE LOCAL` | `start:local` |
| Desarrollo | `src/environments/environment.development.ts` | `https://api-aguafress.eadev.cloud` | `AMBIENTE DESARROLLO` | `start` |
| Producción | `src/environments/environment.ts` | `https://api-aguafress.eadev.cloud` | Ninguno | `build` |

`angular.json` reemplaza `environment.ts` por el archivo correspondiente a cada configuración. El banner lo renderiza el componente raíz `App`, por lo que también aparece en la pantalla de login.

## Ejecutar el frontend

### 1. Ambiente local (API en localhost)

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend start:local
```

Abrir `http://localhost:4200/`. La aplicación redirige a `/auth/login` y llama al gateway en `http://localhost:3000`.

### 2. Ambiente de desarrollo (gateway del VPS)

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend start
```

Abrir `http://localhost:4200/`. Esta configuración usa el gateway del VPS y muestra el banner `AMBIENTE DESARROLLO`.

### 3. Build de producción

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend build
```

La salida se genera en `packages/frontend/dist/frontend`. Producción no renderiza ningún banner de ambiente.

## Backend local (opcional)

Para probar el login contra un gateway local en lugar del VPS:

```bash
cp .env.example .env
# Completar los placeholders de .env
docker compose up -d
```

El gateway escucha en `http://localhost:3000`. Verificar el estado de los contenedores con:

```bash
docker compose ps
```

El frontend local espera ese gateway y que su configuración de CORS permita `http://localhost:4200`.

## Tests

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend test --watch=false --browsers=ChromeHeadless
```

## Rutas

- `/auth/login` — pantalla de login
- `/admin` — inicio del super-administrador
- `/admin/vendedores` — lista paginada de vendedores
- `/vendedor` — placeholder de vendedor
- `/cliente` — placeholder de cliente

## Banner de ambiente

Los builds local y de desarrollo muestran una barra fija en la parte inferior con fondo amarillo y texto rojo. Producción nunca la renderiza. La barra usa `pointer-events: none` e incluye un espaciador para no bloquear la interacción.

## Solución de problemas

- **Errores de versión de pnpm o `Unsupported engine`:** usar `pnpm dlx pnpm@12.3.4` en lugar del pnpm global.
- **El puerto 4200 ya está en uso:** ejecutar `pnpm dlx pnpm@12.3.4 --filter @agua/frontend exec ng serve --configuration local --port 4201`.
- **El login falla contra localhost:** confirmar que el gateway está corriendo en el puerto `3000`, que el frontend se levantó con `start:local` y que CORS permite `http://localhost:4200`.
- **No aparece el banner:** producción lo oculta intencionalmente. Verificar con qué configuración se levantó la aplicación.

## Angular CLI

Generar artefactos de Angular desde el paquete del frontend:

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend ng generate component component-name
```
