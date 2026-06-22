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
RUN pnpm --filter @agua/orders-service build

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/MicroServices/orders-service/prisma ./prisma
COPY --from=build /app/MicroServices/orders-service/package.json ./package.json

EXPOSE 3004
EXPOSE 4004

CMD pnpm --filter @agua/orders-service exec prisma generate && \
    pnpm --filter @agua/orders-service exec prisma db push && \
    node dist/main
