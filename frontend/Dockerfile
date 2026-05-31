# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy shared package (Vite resolves @nepocorp/shared via alias to ../shared/src)
COPY shared/package.json shared/package.json
COPY shared/tsconfig.json shared/tsconfig.json
COPY shared/src shared/src

# Copy frontend package
COPY frontend/package.json frontend/package.json

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build shared first
RUN cd shared && pnpm build

# Copy frontend source
COPY frontend/index.html frontend/index.html
COPY frontend/vite.config.ts frontend/vite.config.ts
COPY frontend/tsconfig.json frontend/tsconfig.json
COPY frontend/public frontend/public
COPY frontend/src frontend/src

# Build frontend (vite build → frontend/dist)
RUN cd frontend && pnpm build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
