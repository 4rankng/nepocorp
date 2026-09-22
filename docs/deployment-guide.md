# Deployment Guide

> **Audience:** Developers deploying TingTing to dev, production, or demo environments.

## Environments

| Environment | Domain | Path | Deploy |
|-------------|--------|------|--------|
| **Local dev** | `localhost` | Local machine | Manual (`make dev`) |
| **Demo staging** | `demo.tingting.vip` | `/opt/demo/` | Manual (`make demo`) |
| **Production** | `nepo.tingting.vip` | `/opt/nepocorp/` | Manual (`make deploy`) — user go-ahead required |
| **Vantai (separate)** | `vantai.tingting.vip` | `/opt/vantai/` | Own stack, reserved for the silversea build |

There is **no deploy workflow in CI** — `.github/workflows/` only holds the OpenWiki docs job. Deploys are the `make` targets below, cut from a clean detached worktree so uncommitted work never reaches an image.

Every environment runs backend + frontend as Docker containers alongside PostgreSQL and Redis.

## Local Development

### Prerequisites

- pnpm 10.x
- Docker (for PostgreSQL and Redis containers)
- Node.js 20+

### First-Time Setup

```bash
pnpm install
make setup    # Starts infra (Postgres :5440, Redis :6390)
              # Generates Drizzle migrations
              # Applies migrations
              # Seeds sample data
```

Default dev login: `admin` / `admin123`

### Running

```bash
make dev      # Starts backend (:3090) + frontend (:7173) in parallel
              # Auto-generates and applies migrations on startup
```

Frontend dev server at `:7173` proxies `/api` requests to `http://localhost:3090`.

### Individual Services

```bash
make infra          # Start only Postgres + Redis
cd backend && pnpm dev    # Backend only (tsx watch, port 3090)
cd frontend && npx vite --port 7173  # Frontend only
```

### Database Tools

```bash
make studio         # Drizzle Studio GUI (database browser)
make migrate        # Apply pending migrations
make generate       # Generate migration from schema changes
make seed           # Seed sample data
make backup         # Dump production DB to OneDrive
make restore        # Restore latest backup to local dev DB
```

### Production DB Admin

```bash
make adminer       # Opens Adminer over private SSH tunnel -> localhost:8082
                    # Server: postgres | DB: nepocorp | User: nepocorp
                    # Never publicly exposed (loopback-only container)
```

## Production Deployment

### Overview

Production uses Docker containers deployed on a single DigitalOcean droplet at `nepo.tingting.vip`.

- **Postgres** user: `nepocorp`, database: `nepocorp`
- **Docker images:** `tingting-backend`, `tingting-frontend` (Docker Hub)
- **Reverse proxy:** Nginx on the host, configured via `deploy/nginx-host.conf`

### Deploy (manual, from a clean worktree)

Always cut from a **detached worktree of the freeze commit**, never the working tree — both `push` targets run `docker buildx build` with the checkout as build context, so a shared-tree cut would bake uncommitted work into the images:

```bash
git worktree add --detach /tmp/cut-<sha> <freeze-sha>
cp backend/.env /tmp/cut-<sha>/backend/.env     # the Makefiles `include .env` for Docker Hub creds
cd /tmp/cut-<sha>
make demo            # staging first: push images + recreate demo backend/frontend + migrate
make deploy          # production: push images + recreate nepocorp backend/frontend + migrate
git worktree remove --force /tmp/cut-<sha>
```

Images are tagged `:latest` and `:<short-sha>` of the worktree's HEAD (`tingting-backend`, `tingting-frontend` on Docker Hub). `make deploy` == `make push && make deploy-backend && make deploy-frontend`; step by step:

```bash
make push-backend    # Build & push backend image to Docker Hub
make push-frontend   # Build & push frontend image to Docker Hub
make deploy-backend  # Pull & restart backend + run migrations
make deploy-frontend # Pull & restart frontend
```

Release order is local → demo → prod; prod requires explicit user go-ahead every time, and agents never log into prod (credential-free checks only).

### Applying Migrations to Production

```bash
# Apply ALL pending SQL migrations:
make prod-migrate

# Apply a SINGLE migration file:
make prod-migrate-file FILE=0085_your_migration.sql
```

This SCPs the SQL file into the Postgres container and runs it in a single transaction.

### Verification After Deploy

1. SSH into server: `ssh root@nepo.tingting.vip`
2. Check container health: `docker ps`
3. Check backend logs: `docker logs nepocorp-backend-1 --tail 50`
4. Check frontend: `curl -s -o /dev/null -w "%{http_code}" https://nepo.tingting.vip`
5. Check API health: `curl -s https://nepo.tingting.vip/api/health`

## Demo Staging

Staging is `demo.tingting.vip` (`/opt/demo/`, `deploy/docker-compose.demo.yml`) — a second stack on the vantai droplet, next to the separate `/opt/vantai` stack reserved for the silversea build.

```bash
make demo           # Build + push + deploy backend + frontend to demo.tingting.vip
```

### Demo Details

| Property | Value |
|----------|-------|
| Domain | `demo.tingting.vip` |
| Path | `/opt/demo/` |
| Containers | `demo-backend-1`, `demo-frontend-1`, `demo-postgres-1`, `demo-redis-1` |
| Compose file | `deploy/docker-compose.demo.yml` |
| Data | one-time anonymized prod snapshot — **code-only deploys: never re-seed, never wipe** |
| Account | `admin` / `Abc123` (all demo accounts share it) |
| Nginx config | `deploy/nginx-host-demo.conf` |

`vantai.tingting.vip` (`/opt/vantai/`, DB user `vantai`, seed `deploy/seed-vantai.sql`, accounts `123456`) is a **separate** stack, reserved for the silversea build — not the current demo.

## Nginx Configuration

### Required Blocks

```nginx
# Frontend (SPA)
location / {
    proxy_pass http://localhost:7173;  # or Docker internal port
}

# API
location /api/ {
    proxy_pass http://backend:3090;    # or localhost:3090
}

# Socket.io (REQUIRED for agent chatbot)
location /socket.io/ {
    proxy_pass http://backend:3090;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
}
```

The socket.io block was missing from the vantai server initially (see memory: `socketio-nginx-routing-vantai.md`). Without it, `/socket.io/` returns the SPA HTML and the chatbot cannot connect.

Production nginx config: `deploy/nginx-host.conf`. Demo: `deploy/nginx-host-vantai.conf`.

## Drizzle Migration Behavior

### How It Works

Drizzle-kit uses a **journal-based** migration system:

1. Each migration has a SQL file in `backend/drizzle/*.sql`
2. A `__drizzle_migrations` journal table tracks applied migrations via `created_at` timestamps
3. The migrator decides pending by: `journal.when >= max(created_at)` (inclusive)

### Common Gotchas

**Journal desync:** If the journal's `when` timestamp is non-monotonic or future-dated, migrations silently skip. This can happen when migrations are manually edited or restored from backup.

**Diagnostic:** Compare `SELECT * FROM __drizzle_migrations ORDER BY created_at;` with `ls backend/drizzle/*.sql`.

**Fix pattern:** Delete the newest journal row, ensure migration SQL is idempotent, re-apply in a single transaction. See memory: `drizzle-migrate-timestamp-not-hash.md` for the full diagnostic recipe.

**Idempotent migrations:** Always write migration SQL with `IF NOT EXISTS` / `IF EXISTS` guards. `ALTER TYPE ADD VALUE` is NOT idempotent (Postgres limitation).

## Docker Images

| Image | Source | Registry |
|-------|--------|----------|
| `tingting-backend` | `backend/Dockerfile` | Docker Hub |
| `tingting-frontend` | `frontend/Dockerfile` | Docker Hub |
| `postgres` | Official image | Docker Hub |
| `redis` | Official image | Docker Hub |

Build targets: `make push-backend` (backend/Makefile), `make push-frontend` (frontend/Makefile).

## Build Order

```
shared (tsc) -> backend (tsc) -> frontend (vite build)
```

Backend reads shared from `shared/dist/`. Frontend reads shared from `shared/src/`. This asymmetry matters: after editing shared, rebuild it before backend tests or Docker build.

```bash
make build         # Builds all three in correct order
```

## Environment Variables

See `backend/.env.example` for the full list. Key variables:

| Variable | Dev | Production | Description |
|----------|-----|------------|-------------|
| `PORT` | 3090 | 3090 | Backend port |
| `DATABASE_URL` | `postgres://postgres@localhost:5440/tingting` | Set via deploy `.env` | Postgres connection |
| `JWT_SECRET` | Any string | Strong random string | Token signing |
| `JWT_EXPIRES_IN` | `24h` | `24h` | Token expiry |
| `UPLOAD_DIR` | `./uploads` | Container-mounted path | File storage |
| `NODE_ENV` | `development` | `production` | Environment |
| `CORS_ORIGIN` | `http://localhost:7173` | `https://nepo.tingting.vip` | Allowed origins |
| `TRUST_PROXY` | `false` | `1` | Proxy trust (for X-Forwarded-For) |

## Related Documents

| Document | Purpose |
|----------|---------|
| [System Architecture](system-architecture.md) | Component diagram, request lifecycle |
| [Codebase Summary](codebase-summary.md) | Repository structure |
| [Code Standards](code-standards.md) | Build and test commands |
