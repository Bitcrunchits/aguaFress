# ─── Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/notifications-service/package.json ./MicroServices/notifications-service/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/contracts ./packages/contracts
COPY MicroServices/notifications-service ./MicroServices/notifications-service

# Build de paquetes en orden de dependencia
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/notifications-service build

# ─── Run ─────────────────────────────────────────────────────
FROM node:22-alpine AS run

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/notifications-service/package.json ./MicroServices/notifications-service/

# Instalar solo dependencias de producción del notifications-service
RUN pnpm install --frozen-lockfile --filter @agua/notifications-service --prod

# Copiar artifacts compilados
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/MicroServices/notifications-service/dist ./MicroServices/notifications-service/dist

EXPOSE 3016

WORKDIR /app/MicroServices/notifications-service
CMD ["node", "dist/main.js"]
