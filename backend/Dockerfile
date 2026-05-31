# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace root files for pnpm install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy shared package (workspace dependency)
COPY shared/package.json shared/package.json
COPY shared/tsconfig.json shared/tsconfig.json
COPY shared/src shared/src

# Copy backend package
COPY backend/package.json backend/package.json

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build shared first (backend imports from it)
RUN cd shared && pnpm build

# Copy backend source and config
COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/drizzle.config.ts backend/drizzle.config.ts
COPY backend/src backend/src
COPY backend/drizzle backend/drizzle

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy shared (workspace dependency, resolved at runtime via pnpm link)
COPY shared/package.json shared/package.json
COPY shared/src shared/src

# Copy backend source (run via tsx, not compiled output)
COPY backend/package.json backend/package.json
COPY backend/src backend/src
COPY backend/drizzle backend/drizzle
COPY backend/drizzle.config.ts backend/drizzle.config.ts

# Install production dependencies + tsx (needed to run ESM TypeScript)
RUN pnpm install --frozen-lockfile

# Create uploads directory
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 3090

CMD ["npx", "tsx", "src/index.ts"]
