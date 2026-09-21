---
type: deployment
title: Deployment
description: Deploy directory contents, prod-migrate flow excluding *.revert.sql files, docker-compose topology, and rollout conventions.
tags: [deployment, docker, production, migrations, prod-migrate]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-eca5b5f6c04b01a2bf4277cc
    resource: repo://deploy/docker-compose.prod.yml
  - id: openwiki-source-29f2805111d42585acfd0803
    resource: repo://deploy/seed-vantai-6months.sql
  - id: openwiki-source-4318be312804cfc7f2772a72
    resource: repo://deploy/seed-vantai.sql
  - id: openwiki-source-179868937a488ec024f3d143
    resource: repo://deploy/setup-server.sh
  - id: openwiki-source-9ae312e24eb9beaea4597ebe
    resource: repo://deploy/vantai/Makefile
  - id: openwiki-source-0c106052b3286e779bed85e7
    resource: repo://docker-compose.dev.yml
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO ships its infrastructure glue under `deploy/` and uses the Makefile as the
single entry point for prod rollout. This page describes the layout; for
authoritative steps see `docs/deployment-guide.md` (Vietnamese).

## Local dev compose

`docker-compose.dev.yml` brings up Postgres (with pgvector), Redis, and an
Adminer GUI:

- **`db`** — `pgvector/pgvector:pg16` image. Required because NEPO uses the
  `vector(1536)` extension for FAQ embeddings. Switched from `postgres:16-alpine`
  because the stock alpine image lacks the extension. Exposes Postgres on
  `:5440`. Healthcheck `pg_isready -U postgres`.
- **`redis`** — `redis:7-alpine` on `:6390` with `redis-cli ping` healthcheck.
- **`adminer`** — Postgres GUI on `:8081` for ad-hoc inspection.

Healthchecks gate the dependent services. The `tingting-pgdata` named volume
keeps Postgres state across `make down`/`make up` cycles.

## `deploy/` directory

| Path | Purpose |
|---|---|
| `deploy/docker-compose.prod.yml` | Production compose definition (backend, frontend, postgres, redis, nginx) |
| `deploy/docker-compose.demo.yml` | Demo/staging compose |
| `deploy/nginx-host.conf` | Host-side nginx reverse proxy |
| `deploy/nginx-host-demo.conf`, `deploy/nginx-host-vantai.conf` | Per-environment host nginx variants |
| `deploy/nginx-frontend.conf` | Frontend-only nginx config |
| `deploy/setup-server.sh`, `deploy/setup-demo-server.sh` | First-boot provisioning scripts |
| `deploy/seed-vantai.sql`, `deploy/seed-vantai-6months.sql` | Production seed data for the vantai deployment |
| `deploy/vantai/Makefile` | Per-customer Makefile (subset of root Makefile targets) |

## Production migration flow

The `prod-migrate` target (`Makefile:166`) is the canonical way to apply Drizzle
SQL migrations to production. It loops over `backend/drizzle/*.sql` and:

1. SCPs each file to the prod server's `/tmp/`.
2. `docker cp`s it into the Postgres container.
3. `docker exec ... psql -U nepocorp -d nepocorp -v ON_ERROR_STOP=1
   --single-transaction -f /tmp/<basename>` — runs inside a single transaction
   so a partial migration rolls back cleanly.
4. Cleans up the `/tmp` file regardless of outcome.

The loop filters with `grep -v '\.revert\.sql'` — dev-rollback pairs must never
run against prod (introduced in commit 45fbad3). The shell snippet continues
on error (`|| echo '  ⚠️ skipped (already applied)'`) so re-running the target
is safe; an already-applied migration just skips. **All scripts that touch
production must use this target — never run `psql` manually.**

## Rolling out a backend change

```bash
make prod-migrate   # apply new Drizzle SQL files to prod DB
make deploy-backend # build, push, restart container with graceful drain
```

The exact names of `deploy-*` targets live in the root `Makefile`; the demo
equivalent (`demo-backend`) uses `DEMO_SERVER` / `DEMO_COMPOSE` / `DEMO_PATH`
variables.

## Rolling out a frontend change

```bash
make deploy-frontend   # build, push, restart nginx-served frontend
```

Demo target is `demo-frontend`.

## Why the dual prod/demo split

The Makefile carries targets for both `prod-*` and `demo-*` because the demo
server is used for stakeholder previews and Vietnamese accounting training. The
demo compose file uses demo-specific seed data (`seed-vantai-6months.sql`) so
training screens are populated.

## Where to read more

- Local dev setup — [development/setup.md](development/setup.md)
- Database schema — [backend/database-schema.md](backend/database-schema.md)
- Architecture — [architecture.md](architecture.md)
- Authoritative Vietnamese steps — `docs/deployment-guide.md`
