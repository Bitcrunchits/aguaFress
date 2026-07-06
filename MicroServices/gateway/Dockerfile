# ─── Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/gateway/package.json ./MicroServices/gateway/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/contracts ./packages/contracts
COPY MicroServices/gateway ./MicroServices/gateway

# Build de paquetes en orden de dependencia
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/gateway build

# ─── Run ─────────────────────────────────────────────────────
FROM node:22-alpine AS run

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/gateway/package.json ./MicroServices/gateway/

# Instalar solo dependencias de producción del gateway
RUN pnpm install --frozen-lockfile --filter @agua/gateway --prod

# Copiar artifacts compilados
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/MicroServices/gateway/dist ./MicroServices/gateway/dist

EXPOSE 3000

CMD node dist/MicroServices/gateway/src/main.js
