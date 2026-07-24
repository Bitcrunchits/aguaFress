# ─── Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Placeholder requerido por Prisma durante generate en build.
# La URL real la inyecta docker-compose/runtime.
ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua_orders"

# Copiar config del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/orders-service/package.json ./MicroServices/orders-service/

# Instalar TODAS las dependencias (incluye dev para prisma CLI)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/contracts ./packages/contracts
COPY MicroServices/orders-service ./MicroServices/orders-service

# Generar Prisma client ANTES de compilar TypeScript
RUN cd MicroServices/orders-service && npx prisma generate

# Build de paquetes en orden de dependencia
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/orders-service build

# ─── Run ─────────────────────────────────────────────────────
FROM node:22-alpine AS run

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/orders-service/package.json ./MicroServices/orders-service/

# Instalar todo (incluye prisma CLI para db push en desarrollo)
RUN pnpm install --frozen-lockfile --filter @agua/orders-service

# Copiar artifacts compilados
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/MicroServices/orders-service/dist ./MicroServices/orders-service/dist
COPY --from=build /app/MicroServices/orders-service/prisma ./MicroServices/orders-service/prisma

EXPOSE 3014

# db push auto + arranque
CMD cd MicroServices/orders-service && npx prisma generate && npx prisma db push --accept-data-loss && node dist/main.js
