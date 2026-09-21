---
type: "Reference"
title: "from backend/"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-8999fd1e3c1a7be3f902f940
    resource: repo://backend/.env.example
  - id: openwiki-source-5027f8d2099f89169cc95e7d
    resource: repo://backend/drizzle.config.ts
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-cdc6eed158590eedaac10ac0
    resource: repo://backend/src/tests/photo-authz.test.ts
  - id: openwiki-source-2b2ade8f291318eab0f68b01
    resource: repo://backend/src/tests/trip-status-machine.test.ts
  - id: openwiki-source-0c106052b3286e779bed85e7
    resource: repo://docker-compose.dev.yml
  - id: openwiki-source-097e0c9cfb011c3e4a091e1a
    resource: repo://docs/codebase-summary.md
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---


NEPO uses pnpm workspaces with three packages and a single root Makefile that
wraps docker compose + backend + frontend. **There is no linter or CI
configured** — typechecking (`tsc --noEmit`) and the test runner are the only
quality gates.

## Prerequisites

- **Node.js** — see `.nvmrc` if present, otherwise Node 20+.
- **pnpm** — workspace-aware package manager (`npm i -g pnpm`).
- **Docker** + Docker Compose — for Postgres, Redis, and Adminer.
- **make** — for the standard workflow.
- Optional: `drizzle-kit` for `pnpm db:studio`.

## Ports

| Service | Port | Notes |
|---|---|---|
| PostgreSQL (dev compose) | **5440** | `pgvector/pgvector:pg16` image |
| Redis (dev compose) | **6390** | `redis:7-alpine` |
| Adminer (dev compose) | **8081** | Postgres GUI |
| Backend Express | **3090** | `PORT` in `.env` |
| Frontend Vite dev | **7173** | proxies `/api` → `:3090` |

`docker-compose.dev.yml` exposes these on the host. The frontend dev server
proxies `/api/**` to backend `:3090` (configured in `frontend/vite.config.ts`).

## Required environment variables

`backend/.env` (copy from `backend/.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Express listen port | `3090` |
| `DATABASE_URL` | Postgres DSN | `postgres://postgres:postgres@localhost:5440/tingting` |
| `REDIS_URL` | Redis DSN | `redis://localhost:6390` |
| `JWT_SECRET` | JWT signing secret | **must change in production** |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `UPLOAD_DIR` | Where `POST /api/upload` writes | `./uploads` |
| `NODE_ENV` | `development` / `production` | `development` |
| `TRUST_PROXY` | `app.set('trust proxy', …)` | `1` in prod, `false` in dev |
| `CORS_ORIGIN` | Comma-separated allow-list | dev: `http://localhost:7173` |
| `GEMINI_API_KEY` | OCR fallback (Gemini) | optional |
| `OPENROUTER_API_KEY` | OCR primary (Qwen3-VL) | optional |
| `BACH_KHOA_*` | GPS provider credentials | optional |
| `BOT_ENABLE` | Enables `/api/agent` socket | default off |
| `LLM_PROVIDER` / `LLM_MODEL` | Active agent provider | admin-configurable |

Frontend reads `VITE_*` env vars at build time. Most features do not require
any frontend env.

## First-time setup

```bash
make setup        # infra + generate + migrate + seed (first run only)
make dev          # start backend (:3090) and frontend (:7173) with hot reload
```

`make setup` is `infra` followed by migrations + seed:

- `infra` brings up `db`, `redis`, and `adminer` containers via
  `docker-compose.dev.yml`.
- Builds `@tingting/shared` (consumed by both backend and frontend).
- Generates + applies Drizzle migrations.
- Seeds the database.

## Daily dev loop

```bash
make dev          # db + redis + backend (:3090) + frontend (:7173)
make stop         # stop backend + frontend (keeps db running)
make down         # stop everything (keeps volume)
make clean        # destroy volume too — full reset
make studio       # open Drizzle Studio GUI to inspect the DB
make seed         # reseed with sample data
```

Open http://localhost:7173 to use the app. Backend health check:
http://localhost:3090/api/health returns `{ status: "ok", timestamp: "..." }`.

## Build

```bash
make build        # builds shared → backend → frontend in order
```

Build order matters: shared is built first because the backend reads from
`shared/dist/`. The frontend reads from `shared/src/` directly (no build
needed at dev time).

## Database workflow

```bash
# from backend/
pnpm db:generate    # drizzle-kit generate — diff schema → new SQL file under backend/drizzle/
pnpm db:migrate     # drizzle-kit migrate — apply pending migrations
pnpm db:studio      # open Drizzle Studio GUI
```

Production migrations use `make prod-migrate` which excludes `*.revert.sql`
files (commit 45fbad3) — see [deployment.md](../deployment.md).

## Tests

```bash
# backend integration tests
cd backend && pnpm test           # runs npx tsx --test src/tests/integration.test.ts

# frontend colocated tests
cd frontend && pnpm test          # vitest

# end-to-end suite (separate from default workflow)
e2e/                               # see [development/testing.md](testing.md)
```

## Troubleshooting

- **`pgvector` extension missing** — `pgvector/pgvector:pg16` is the
  authoritative image. Switching to `postgres:16-alpine` will break the FAQ
  embedding fast lane (`vector(1536)` cosine index).
- **Auth rejected after restart** — JWT blacklist in Redis is keyed on `jti`;
  clearing Redis logs everyone out (intentional).
- **Hot-reload watch missed a file** — restart the relevant package with
  `make stop && make dev`.

## Where to read more

- Conventions — [development/conventions.md](conventions.md)
- Testing — [development/testing.md](testing.md)
- Deployment — [deployment.md](../deployment.md)
- Authoritative quickstart — `README.md`
