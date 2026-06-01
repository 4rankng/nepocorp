# ── Production ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy only manifests first — pnpm install layer is cached until lock file changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json shared/package.json
COPY backend/package.json backend/package.json

# Install production dependencies + tsx (cached unless lock file changes)
RUN pnpm install --frozen-lockfile

# Copy source after install — code changes don't bust the install cache
COPY shared/src shared/src
COPY backend/src backend/src
COPY backend/drizzle backend/drizzle
COPY backend/drizzle.config.ts backend/drizzle.config.ts

# Create uploads directory
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 3090

CMD ["npx", "tsx", "src/index.ts"]
