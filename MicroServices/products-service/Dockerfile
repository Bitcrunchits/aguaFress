# ─── Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Placeholder requerido por Prisma durante generate en build.
# La URL real la inyecta docker-compose/runtime.
ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/agua"

# Copiar config del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/products-service/package.json ./MicroServices/products-service/
COPY MicroServices/products-service/prisma ./MicroServices/products-service/prisma

# Instalar dependencias (dispara "postinstall": "prisma generate")
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/contracts ./packages/contracts
COPY MicroServices/products-service ./MicroServices/products-service

# Build de paquetes en orden de dependencia
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/products-service build

# ─── Run ─────────────────────────────────────────────────────
FROM node:22-alpine AS run

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/products-service/package.json ./MicroServices/products-service/
COPY MicroServices/products-service/prisma ./MicroServices/products-service/prisma

# Instalar todo (incluye prisma CLI para db push en desarrollo)
# --ignore-scripts porque postinstall falla (prisma generate necesita el schema ya copiado)
RUN pnpm install --frozen-lockfile --filter @agua/products-service --ignore-scripts

# Copiar artifacts compilados
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/MicroServices/products-service/dist ./MicroServices/products-service/dist

EXPOSE 3003 3013

# db push auto + arranque
CMD cd MicroServices/products-service && npx prisma generate && npx prisma db push --accept-data-loss && node dist/main.js
