FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml ./
COPY package.json ./

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @agua/products-service build

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/MicroServices/products-service/prisma ./prisma
COPY --from=build /app/MicroServices/products-service/package.json ./package.json

EXPOSE 3003
EXPOSE 4003

CMD pnpm --filter @agua/products-service exec prisma generate && \
    pnpm --filter @agua/products-service exec prisma db push && \
    node dist/main
