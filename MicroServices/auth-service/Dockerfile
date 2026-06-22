# ─── Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config del monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/auth-service/package.json ./MicroServices/auth-service/

# Instalar TODAS las dependencias (incluye dev para prisma CLI)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/contracts ./packages/contracts
COPY MicroServices/auth-service ./MicroServices/auth-service

# Build de paquetes en orden de dependencia
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/auth-service build

# Generar Prisma client
RUN cd MicroServices/auth-service && npx prisma generate

# ─── Run ─────────────────────────────────────────────────────
FROM node:22-alpine AS run

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copiar config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY MicroServices/auth-service/package.json ./MicroServices/auth-service/

# Instalar todo (incluye prisma CLI para db push en desarrollo)
RUN pnpm install --frozen-lockfile --filter @agua/auth-service

# Copiar artifacts compilados
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/MicroServices/auth-service/dist ./MicroServices/auth-service/dist
COPY --from=build /app/MicroServices/auth-service/prisma ./MicroServices/auth-service/prisma

EXPOSE 3001

# db push auto + arranque
CMD cd MicroServices/auth-service && npx prisma generate && npx prisma db push && node dist/main
