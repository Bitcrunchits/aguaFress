# ───────────────────────────────────────────────────────────────
#  AguaFress — Frontend Web
#  Build stage: compila con Vite
#  Run stage:   sirve con Nginx
# ───────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Corepack + pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencias: copiar solo los archivos de manifiesto
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/frontend/package.json ./packages/frontend/

RUN pnpm install --frozen-lockfile

# Código fuente
COPY packages/contracts/ ./packages/contracts/
COPY packages/frontend/ ./packages/frontend/

# Build contracts primero (dependencia), luego frontend
RUN pnpm --filter @agua/contracts build
RUN pnpm --filter @agua/frontend build

# Stage 2: Nginx
FROM nginx:alpine
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
