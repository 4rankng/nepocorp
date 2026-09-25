---
type: howto
title: Local Setup
description: First-time environment setup for the NEPO pnpm monorepo — prerequisites, pinned dev ports, backend/.env requirements, the make setup → make dev sequence with the seeded admin login, build order across shared/backend/frontend, database tooling, and manual quality gates.
tags: [setup, development, environment, pnpm, docker, make, onboarding]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-24T15:30:51.512Z
sources:
  - id: openwiki-source-6d4b4e707b8d60b6ccfa3425
    resource: repo://.github/workflows/openwiki-update.yml
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-8999fd1e3c1a7be3f902f940
    resource: repo://backend/.env.example
  - id: openwiki-source-5027f8d2099f89169cc95e7d
    resource: repo://backend/drizzle.config.ts
  - id: openwiki-source-d6e39bd04dd62ee5f2d60fd9
    resource: repo://backend/drizzle/0104_faq_knowledge_base.sql
  - id: openwiki-source-95e3052522b9fd2909c40f51
    resource: repo://backend/drizzle/0107_fantastic_star_brand.sql
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-f32f2913872e0d00937c7418
    resource: repo://backend/src/config/index.ts
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-4635521b326b46a9fafb0ce7
    resource: repo://backend/src/lib/redis.ts
  - id: openwiki-source-1e2e94a8c6ca6db2a3a43a64
    resource: repo://backend/src/middleware/auth.ts
  - id: openwiki-source-8efc6ccebcdba87941fa9db3
    resource: repo://backend/src/routes/auth.ts
  - id: openwiki-source-d9f9cda0ed194f79e45167d2
    resource: repo://backend/src/seed.ts
  - id: openwiki-source-2b2ade8f291318eab0f68b01
    resource: repo://backend/src/tests/trip-status-machine.test.ts
  - id: openwiki-source-0c106052b3286e779bed85e7
    resource: repo://docker-compose.dev.yml
  - id: openwiki-source-df711edafb048423606f68b0
    resource: repo://e2e/run_all.sh
  - id: openwiki-source-2fda883e9b76745f69f487f7
    resource: repo://eslint.config.mjs
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-79cd44ea11c40597832d7dd7
    resource: repo://frontend/src/lib/api/client.ts
  - id: openwiki-source-378e3cf05ab0d05d335c68d5
    resource: repo://frontend/vite.config.ts
  - id: openwiki-source-f6ccde2440cc497427ba6702
    resource: repo://frontend/vitest.config.ts
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-592889025dfa2f31c9e5bba0
    resource: repo://shared/package.json
generated: { by: "openwiki/0.5.2", at: "2026-09-24T15:30:51.512Z" }
---

NEPO (the Vietnamese trucking platform codename) is a pnpm workspace monorepo
with three packages — `shared/`, `backend/`, `frontend/` — and a single root
`Makefile` that wraps `docker compose` + backend + frontend. First-time setup is
`pnpm install` followed by `make setup`; every later session starts with
`make dev`. There is **no build/test CI**: lint, typecheck, and tests are gates
you run manually.

## Prerequisites

- **Node.js 20+** — there is no `.nvmrc`; backend dev tooling builds against
  `@types/node` 22. (The OpenWiki CLI, if you maintain the generated wiki, needs
  Node ≥ 22.22.)
- **pnpm** — `npm i -g pnpm`. pnpm 10 semantics apply (see
  [pnpm 10 notes](#pnpm-10-notes)).
- **Docker + Docker Compose** — provides PostgreSQL, Redis, and Adminer via
  `docker-compose.dev.yml`.
- **make** — for the standard workflow (`make help` prints all targets).
- Python 3 + Playwright only if you run the e2e suite (`make e2etest`).

## Ports

| Service | Port | Notes |
|---|---|---|
| PostgreSQL (dev compose) | **5440** | `pgvector/pgvector:pg16`, container `tingting-db`, db/user/password `tingting`/`postgres`/`postgres`, named volume `tingting-pgdata` |
| Redis (dev compose) | **6390** | `redis:7-alpine`, container `tingting-redis` |
| Adminer (dev compose) | **8081** | DB GUI; waits for `db` healthcheck |
| Backend Express | **3090** | `PORT` in `backend/.env` |
| Frontend Vite dev | **7173** | `strictPort: true` — refuses to drift to 7174 |

`docker-compose.dev.yml` exposes the containers on the host. The Vite dev server
proxies `/api` **and** `/socket.io` (WebSocket upgrade, needed by the assistant
transport) to `http://localhost:3090`. A separate `make adminer` target opens
**production** Adminer over an SSH tunnel on **8082** — unrelated to the local
8081 instance.

```mermaid
flowchart TD
    S["make setup — first time"] --> INF["infra: docker compose up -d --wait (db, redis, adminer)"]
    INF --> GEN["backend: drizzle-kit generate"]
    GEN --> MIG["backend: drizzle-kit migrate"]
    MIG --> SEED["backend: tsx src/seed.ts — login admin / admin123"]
    SEED --> DEV["make dev — every session"]
    DEV --> UP["infra: docker compose up -d --wait"]
    UP --> RDY["wait until PostgreSQL :5440 accepts connections"]
    RDY --> GEN2["drizzle-kit generate + migrate (best-effort)"]
    GEN2 --> RUN["tsx watch src/index.ts :3090 and vite --port 7173 in parallel"]
```

_Control flow of `make setup` (one-time) and `make dev` (daily) from the root `Makefile`._

## Required environment variables

Copy `backend/.env.example` → `backend/.env`. The required keys are:

| Variable | Purpose | `.env.example` value |
|---|---|---|
| `PORT` | Express listen port | `3090` |
| `DATABASE_URL` | Postgres DSN | `postgres://postgres:postgres@localhost:5440/tingting` |
| `JWT_SECRET` | JWT signing secret | `change-me-in-production` (≥32 chars required in production) |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `UPLOAD_DIR` | Where uploads are written/served | `./uploads` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |

`backend/src/config/index.ts` validates everything with Zod at boot. In
development it logs warnings and falls back to defaults; in **production an
invalid config exits the process**. Note the dev fallback `DATABASE_URL` points
at `localhost:5432` — not the compose port 5440 — so a missing `.env` makes the
backend unreachable; copying the example file is not optional in practice.

`REDIS_URL` (`redis://localhost:6390`) should also be set; auth token
blacklisting runs through Redis (see [Troubleshooting](#troubleshooting)).

### Optional keys — features degrade, nothing crashes

Each integration is enabled by key presence; leaving it empty disables the
feature gracefully:

- `OPENROUTER_API_KEY` — primary container/seal OCR (Qwen3-VL); falls back to
  `GEMINI_API_KEY` (Gemini) on any error. Only the keys are env-driven; base
  URL and model are hardcoded in `services/ocr.service.ts`.
- `BACH_KHOA_USERNAME` / `BACH_KHOA_PASSWORD` (with `BACH_KHOA_API_URL`,
  `_TIMEOUT_MS`, `_PROVIDER`) — Bách Khoa GPS live vehicle tracking. Empty → the
  live-fleet endpoint returns an empty result. Server-side only.
- `MAP4D_API_KEY` — place autocomplete/geocoding. Empty → search and geocoding
  return empty.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — Web Push;
  push silently no-ops while empty.
- `BOT_ENABLE=true` + `MINIMAX_API_KEY` — the command-and-insight assistant.
  While `BOT_ENABLE` is off, `/api/agent` routes return 503 and the frontend
  launcher stays hidden. Agent behavior toggles (`AGENT_STREAMING_ENABLED`,
  `AGENT_FAILOVER`, `AGENT_INTENT_ROUTER`, …) are env kill-switches.
- `CORS_ORIGIN` (comma-separated allow-list; dev default allows
  `http://localhost:7173`), `TRUST_PROXY` (hop count for reverse proxies;
  `1` in production, `false` in dev), `SETTINGS_ENCRYPTION_KEY` (falls back to
  a key derived from `JWT_SECRET`), and `OTEL_EXPORTER_OTLP_ENDPOINT` /
  `OTEL_TRACES_SAMPLER_ARG` for trace export.

The frontend needs no `.env` for local dev — `VITE_API_BASE` defaults to `/api`
and is only needed to point the SPA at another API host. `VITE_*` values are
baked in at build time.

## First-time setup

```bash
pnpm install
make setup        # infra + generate + migrate + seed (first run only)
make dev          # start backend (:3090) and frontend (:7173) with hot reload
```

`make setup` depends on `infra`, which runs
`docker compose -f docker-compose.dev.yml up -d --wait` (db, redis, adminer),
then — inside `backend/` — `drizzle-kit generate`, `drizzle-kit migrate`, and
`npx tsx src/seed.ts`. It prints the URLs and the login when done.

**Seeded login: `admin` / `admin123`.** `src/seed.ts` creates eight
role-diverse users (`admin`, `giamdoc`, `ketoan`, `laixe`, `giaonhan`, `thu`,
`pho`, `quyet`) who all share the bcrypt hash of `admin123`, plus driver
profiles linked to user accounts via `drivers.user_id` (the driver portal
depends on that link). Seeding is idempotent — `onConflictDoNothing` and name
checks make re-runs safe.

Health check: `http://localhost:3090/api/health` returns
`{ status: "ok", timestamp: "…" }`. The app is at `http://localhost:7173`.

## Daily dev loop

```bash
make dev          # db + redis (+adminer), migrate, backend (:3090) + frontend (:7173)
make stop         # kill tsx watch + vite (db stays up)
make down         # stop all compose services (volume kept)
make clean        # down -v — removes the DB volume, full reset
make seed         # reseed sample data
make studio       # Drizzle Studio GUI
make logs-db / make logs-redis   # follow container logs
```

`make dev` is safe to re-run: it brings compose up with `--wait`, polls until
PostgreSQL answers on :5440, re-runs `drizzle-kit generate` (best-effort) and
`migrate` (filtering "already exists, skipping" noise), then starts
`tsx watch src/index.ts` and `vite --port 7173` as one process group
(`trap "kill 0"` tears both down together). A stale hot-reload watch is fixed
with `make stop && make dev`.

## Build order & package boundaries

```bash
make build        # shared → backend → frontend, in that order
```

Build order matters because the packages consume `@tingting/shared` in two
different ways:

- **backend** depends on the workspace package and resolves it from
  `shared/dist/` (`main: dist/index.js`; `tsc && node fix-esm-imports.js`
  post-build rewrites ESM import specifiers). After editing `shared/`, rebuild
  it (`cd shared && npx tsc`) before running the backend or its tests.
- **frontend** aliases `@tingting/shared` to `../shared/src` in
  `vite.config.ts` (and identically in `vitest.config.ts`), so dev and tests
  read TypeScript sources directly — no shared build needed on the frontend.
  `@` aliases to `frontend/src`.

`pnpm build` at the root and the `make build` steps are equivalent.

### pnpm 10 notes

- Dependency overrides live in `pnpm-workspace.yaml`, not `package.json` —
  pnpm 10 no longer reads the `pnpm` field there. The file carries the security
  pins (`csv-parse`, `esbuild`, `undici`, `react-router`, …); keep it in sync
  with `pnpm audit`.
- pnpm 10 blocks postinstall build scripts except the allow-list
  `onlyBuiltDependencies: esbuild, protobufjs, puppeteer, sharp`. If a native
  dependency silently skips its build script, add it there deliberately.

## Database workflow

From `backend/`:

```bash
pnpm db:generate    # drizzle-kit generate — diff src/db/schema.ts → new SQL under backend/drizzle/
pnpm db:migrate     # drizzle-kit migrate — apply pending migrations
pnpm db:studio      # drizzle-kit studio — GUI
```

`drizzle.config.ts` points at `./src/db/schema.ts`, outputs to `./drizzle`,
dialect `postgresql`, with `DATABASE_URL` defaulting to
`localhost:5440/tingting`. Migrations are numbered `0001…0118+`; a `*.revert.sql`
twin accompanies some of them for dev rollback only.

Production migrations are a **separate workflow** — `make prod-migrate` copies
each `backend/drizzle/*.sql` **except `*.revert.sql`** (dev-rollback pairs must
never run against prod) into the `nepocorp-postgres-1` container and applies
them with `psql --single-transaction`; `make prod-migrate-file FILE=…` applies a
single file. See [deployment.md](../deployment.md) for the full deploy targets
(`push`, `deploy`, `demo`, `backup`, `restore`, `adminer`).

## Tests & quality gates

```bash
# backend — Node test runner via tsx
cd backend && pnpm test      # npx tsx --test --test-concurrency=1 src/tests/*.test.ts

# frontend — vitest, colocated
cd frontend && pnpm test     # vitest run

# end-to-end (separate; needs make dev already running)
make e2etest                 # bash e2e/run_all.sh, Python + Playwright suites 00–13
```

- **Backend** suites live under `backend/src/tests/` (`trip-status-machine.test.ts`,
  `ledger.service.chiho.test.ts`, `photo-authz.test.ts`, `comprehensive.test.ts`,
  plus many `agent-*` suites). They run through `tsx --test` with concurrency 1
  and **need the local DB migrated first** (`make setup` or `make dev` covers it).
- **Frontend** tests are colocated `src/**/*.test.{ts,tsx}` files run by vitest
  (jsdom environment, globals on, same `@tingting/shared` → `../shared/src` alias).
- **E2E** is a Python/Playwright suite under `e2e/`; `run_all.sh` refuses to run
  unless frontend :7173 and backend :3090 are already up, and installs Chromium
  on first use. It is not part of any default or CI gate.

Gates are **manual**. `pnpm lint` runs ESLint 10 from the root
`eslint.config.mjs` (covers backend + shared; the frontend package has its own
`eslint.config.js` and `lint` script and is excluded from the root run).
Typecheck via `cd shared && pnpm typecheck` (`tsc --noEmit`) and the packages'
builds. The only GitHub Actions workflow is
`.github/workflows/openwiki-update.yml` — a daily docs PR, not a build/test CI.

## Troubleshooting

- **Backend can't reach the database** — without `backend/.env` the dev fallback
  DSN points at `localhost:5432`, but compose exposes **5440**. Copy
  `.env.example` to `.env`.
- **Migration fails on `CREATE EXTENSION vector`** — the compose file
  deliberately uses `pgvector/pgvector:pg16` (postgres 16 + the `vector`
  extension preinstalled). Migrations `0104_faq_knowledge_base.sql` and
  `0107_fantastic_star_brand.sql` create `vector(1536)` embedding columns with
  HNSW cosine indexes backing the FAQ fast lane; a stock `postgres:16-alpine`
  image cannot apply them.
- **Everyone is logged out after a Redis restart** — intentional. Login issues
  JWTs with a random `jti`; logout blacklists the `jti` in Redis until token
  expiry, and every request's `authMiddleware` checks that blacklist. The check
  fails **closed** — if Redis is unreachable, tokens are rejected — so Redis
  must be running for auth at all.
- **Vite exits immediately** — `strictPort: true` makes the dev server fail
  instead of silently moving to 7174 (a second server would serve a stale HMR
  bundle). Free :7173 (`make stop`) and restart.

## Where to read more

- Root command reference — `AGENTS.md` (repo root)
- Conventions — [development/conventions.md](conventions.md)
- Testing — [development/testing.md](testing.md)
- Deployment & production targets — [deployment.md](../deployment.md)
- Navigation index — [../quickstart.md](../quickstart.md)
