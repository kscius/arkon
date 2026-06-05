# ARKON Web — Vite build + Nginx (proxies /api → api:8000)
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --filter ./apps/web... --no-frozen-lockfile

COPY apps/web ./apps/web

ARG VITE_API_URL=/api
ARG VITE_TENANT=arkon
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_TENANT=${VITE_TENANT}

WORKDIR /app/apps/web
RUN pnpm run build

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
