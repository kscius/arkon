# ARKON API — multi-stage (pnpm monorepo → NestJS + Prisma)
FROM node:20-alpine AS base
RUN apk add --no-cache openssl postgresql-client
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --filter @arkon/api... --no-frozen-lockfile

FROM deps AS build
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
RUN pnpm run build
RUN test -f dist/main.js || (echo "Expected dist/main.js after build" && ls -la dist && exit 1)
RUN test -f prisma/seed.js || (echo "Expected prisma/seed.js after build" && exit 1)
RUN grep -q "cierres ejercicio" prisma/seed.js || (echo "seed.js missing cierre ejercicio block" && exit 1)

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/tsconfig.seed.json ./apps/api/tsconfig.seed.json
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh

RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh && mkdir -p /app/uploads

WORKDIR /app/apps/api
RUN npx prisma generate
EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
