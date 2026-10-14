# AguaFress Frontend

Angular frontend for the AguaFress MVP. The app currently points to the VPS gateway by default so early auth and service integration can use the same backend target in development and production.

## API target

| Environment | API base URL |
| --- | --- |
| Production/default | `https://api-aguafress.eadev.cloud` |
| Development | `https://api-aguafress.eadev.cloud` |

Future services should read the API base from `src/app/core/config/api.config.ts` instead of importing Angular environment files directly.

## Run against the VPS gateway

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend start
```

Open `http://localhost:4200/`. Browser requests should target the configured gateway base URL above once real HTTP services are implemented.

## Backend docs to verify

Check the live gateway documentation before wiring each feature:

- Scalar candidate: `https://api-aguafress.eadev.cloud/api/docs`
- OpenAPI candidate: `https://api-aguafress.eadev.cloud/api/openapi.json`

Pending backend/runtime checks:

- CORS from `http://localhost:4200` to the VPS gateway.
- Seed credentials and QA users for the VPS environment.

## Build

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend build
```

The production build writes output under `packages/frontend/dist/frontend`.

## Angular CLI

Generate Angular artifacts from the frontend package when needed:

```bash
pnpm dlx pnpm@12.3.4 --filter @agua/frontend ng generate component component-name
```
