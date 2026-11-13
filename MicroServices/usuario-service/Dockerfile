# ─── Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@12.3.4 --activate
WORKDIR /app

# Copiar config del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/usuario-service/package.json ./MicroServices/usuario-service/

# Instalar TODAS las dependencias (incluye dev para prisma CLI)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/contracts ./packages/contracts
COPY MicroServices/usuario-service ./MicroServices/usuario-service

# Generar Prisma client ANTES de compilar TypeScript
RUN cd MicroServices/usuario-service && npx prisma generate

# Build de paquetes en orden de dependencia
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/usuario-service build

# ─── Run ─────────────────────────────────────────────────────
FROM node:22-alpine AS run

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@12.3.4 --activate
WORKDIR /app

# Copiar config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/usuario-service/package.json ./MicroServices/usuario-service/

# Instalar todo (incluye prisma CLI para db push en desarrollo)
RUN pnpm install --frozen-lockfile --filter @agua/usuario-service

# Copiar artifacts compilados
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/MicroServices/usuario-service/dist ./MicroServices/usuario-service/dist
COPY --from=build /app/MicroServices/usuario-service/prisma ./MicroServices/usuario-service/prisma

EXPOSE 3011

# db push auto + arranque. El seed NO se ejecuta en el arranque de producción:
# tocaría datos persistentes en cada recreo del contenedor. Para poblar datos
# de prueba ejecutarlo manualmente dentro del contenedor: node prisma/seed.cjs
CMD cd MicroServices/usuario-service && npx prisma generate && npx prisma db push && node dist/main.js
