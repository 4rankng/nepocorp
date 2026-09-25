---
type: deployment
title: Deployment & Environments
description: Rollout topology for the three environments — local dev compose, production nepo.tingting.vip, demo staging demo.tingting.vip on an anonymized snapshot — plus Makefile deploy targets, prod-migrate safety rules, backup/restore, and host nginx routing.
tags: [deployment, docker, environments, makefile, migrations, backup-restore, nginx, demo-staging]
sources:
  - id: openwiki-source-600e7dce49b27b22f5486b40
    resource: repo://backend/Dockerfile
  - id: openwiki-source-d90fca79839a07479341ddb0
    resource: repo://backend/Makefile
  - id: openwiki-source-c551540f77e718c2bf033c7d
    resource: repo://deploy/docker-compose.demo.yml
  - id: openwiki-source-eca5b5f6c04b01a2bf4277cc
    resource: repo://deploy/docker-compose.prod.yml
  - id: openwiki-source-f825c52632262762563db4f5
    resource: repo://deploy/nginx-host-demo.conf
  - id: openwiki-source-0ae4098778f09ce3fe60dff6
    resource: repo://deploy/nginx-host.conf
  - id: openwiki-source-4318be312804cfc7f2772a72
    resource: repo://deploy/seed-vantai.sql
  - id: openwiki-source-8ba5c72f69453c2dc085923f
    resource: repo://deploy/setup-demo-server.sh
  - id: openwiki-source-179868937a488ec024f3d143
    resource: repo://deploy/setup-server.sh
  - id: openwiki-source-9ae312e24eb9beaea4597ebe
    resource: repo://deploy/vantai/Makefile
  - id: openwiki-source-0c106052b3286e779bed85e7
    resource: repo://docker-compose.dev.yml
  - id: openwiki-source-7865fb2b5570e6ebb2f50ca8
    resource: repo://docs/deployment-guide.md
  - id: openwiki-source-2e31c9c6e4f71c40fd02e375
    resource: repo://frontend/Makefile
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
generated: { by: "openwiki/0.5.2", at: "2026-09-24T15:30:51.512Z" }
verified:
  - by: openwiki/0.5.2
    at: 2026-09-24T15:30:51.512Z
---

NEPO ships its infrastructure glue under `deploy/` and uses the root `Makefile`
as the single entry point for every rollout. There is **no deploy workflow in
CI** — `.github/workflows/` only holds the OpenWiki docs job — so deploys are
manual `make` targets, cut from a clean detached worktree so uncommitted work
never reaches an image. For authoritative step-by-step commands see
`docs/deployment-guide.md`.

## Environments at a glance

| Environment | Domain | Server path | Compose | Rollout |
|---|---|---|---|---|
| Local dev | `localhost` | dev machine | `docker-compose.dev.yml` | `make dev` / `make setup` |
| Demo staging | `demo.tingting.vip` | `/opt/demo` (vantai droplet) | `deploy/docker-compose.demo.yml` | `make demo` |
| Production | `nepo.tingting.vip` | `/opt/nepocorp` | `deploy/docker-compose.prod.yml` | `make deploy` (user go-ahead required) |
| Vantai (separate) | `vantai.tingting.vip` | `/opt/vantai` | own stack, reserved for the silversea build | `deploy/vantai/Makefile` |

Every hosted environment runs backend + frontend as Docker containers
(`tingting-backend` / `tingting-frontend` from Docker Hub) alongside
PostgreSQL (`pgvector/pgvector:pg16`) and Redis. Release order is local →
demo → prod; production requires an explicit user go-ahead every time, and
agents never log into prod (credential-free checks only).

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart LR
    wt["git worktree of the freeze commit"]
    push["make push-backend / push-frontend<br/>buildx linux/amd64 to Docker Hub<br/>tags latest and short-sha"]
    hub["Docker Hub<br/>tingting-backend / tingting-frontend"]
    demo["make demo-backend / demo-frontend<br/>demo.tingting.vip - /opt/demo<br/>pull, recreate-retry, migrate in container"]
    prod["make deploy-backend / deploy-frontend<br/>nepo.tingting.vip - /opt/nepocorp<br/>pull, recreate-retry, migrate in container"]
    mig["make prod-migrate<br/>psql per SQL file in nepocorp-postgres-1<br/>ON_ERROR_STOP + single transaction<br/>restart backend after"]
    snap["one-time anonymized snapshot<br/>never re-seeded"]

    wt --> push --> hub
    hub --> demo
    hub --> prod
    prod --> mig
    snap -. static data .-> demo
```

*Image flow: both stacks pull the same Docker Hub images; demo and prod differ in server, path, compose project, and data policy — demo ships code only.*

## Local dev compose

`docker-compose.dev.yml` brings up the infrastructure the app expects:

- **`db`** (`tingting-db`) — `pgvector/pgvector:pg16` on host port **5440**.
  Required because NEPO uses the `vector(1536)` extension for FAQ embeddings;
  the stock `postgres:16-alpine` image lacks the extension. Healthcheck
  `pg_isready -U postgres`.
- **`redis`** (`tingting-redis`) — `redis:7-alpine` on host port **6390** with a
  `redis-cli ping` healthcheck.
- **`adminer`** (`tingting-adminer`) — Postgres GUI on host port **8081**.

The `tingting-pgdata` named volume keeps Postgres state across
`make down`/`make up` cycles (`make clean` destroys it).

Around that compose file the Makefile provides the dev loop:

- `make dev` — starts the compose stack with `--wait`, blocks until Postgres
  answers on 5440, runs `drizzle-kit generate` + `migrate`, then runs the
  backend (`tsx watch src/index.ts`, port **3090**) and the frontend
  (`vite --port 7173`) in parallel; both die together via a `trap "kill 0"`.
- `make setup` — first-time path: `infra` (db + redis + adminer), generate,
  migrate, seed (`backend/src/seed.ts`). Default login `admin` / `admin123`.
- `make stop` kills only the app processes and keeps the database running;
  `make down` / `make clean` tear down compose services.

## `deploy/` directory

| Path | Purpose |
|---|---|
| `deploy/docker-compose.prod.yml` | Production stack for `nepo.tingting.vip` (`/opt/nepocorp`) |
| `deploy/docker-compose.demo.yml` | Demo staging stack for `demo.tingting.vip` (`/opt/demo`) |
| `deploy/nginx-host.conf` | Host nginx vhost for production |
| `deploy/nginx-host-demo.conf` | Host nginx vhost for demo staging |
| `deploy/nginx-host-vantai.conf` | Host nginx vhost for the separate vantai stack |
| `deploy/nginx-frontend.conf` | In-container frontend nginx (SPA fallback + asset caching) |
| `deploy/setup-server.sh` | One-time provisioning of the production droplet |
| `deploy/setup-demo-server.sh` | One-time provisioning of demo staging |
| `deploy/seed-vantai.sql`, `deploy/seed-vantai-6months.sql` | Seed data for the vantai stack (all accounts `123456`) — not the current demo |
| `deploy/vantai/Makefile` | Per-customer Makefile for the vantai stack |

## Production stack (`nepo.tingting.vip`)

`deploy/docker-compose.prod.yml` is the compose project `nepocorp`, so all
containers are named `nepocorp-<service>-1` — the exact names the Makefile
targets `docker cp`/`docker exec`/`docker restart` against:

- **postgres** — `pgvector/pgvector:pg16`, user/db `nepocorp`, data under
  `/opt/nepocorp/data/postgres`, `pg_isready` healthcheck.
- **redis** — `redis:7-alpine`, capped at `128mb` (`allkeys-lru`, AOF on).
- **backend** — `franknguyenvd/tingting-backend:latest`, publishes only
  `127.0.0.1:3090`; `env_file: .env` (secrets) plus inline `DATABASE_URL`,
  `REDIS_URL`, `CORS_ORIGIN=https://nepo.tingting.vip`, uploads volume
  `/opt/nepocorp/data/uploads`. Starts only after both data services are
  healthy.
- **frontend** — same image tag, loopback `127.0.0.1:3000` → container port 80.
- **adminer** — profile-gated (`--profile adminer`), loopback `127.0.0.1:8080`.

Every service binds to the host loopback only; the host nginx vhost
(`deploy/nginx-host.conf`, live at `/etc/nginx/sites-available/tingting`) is the
single public entrypoint:

- `/api/` → `127.0.0.1:3090` (60s read timeout, 20m upload limit).
- `/socket.io/` → `127.0.0.1:3090` with WebSocket upgrade headers and 300s
  read/send timeouts. This block **must sit above `location /`** — otherwise
  the assistant's polling handshake gets SPA HTML and the chatbot never
  connects.
- `/uploads/` → served straight from `/opt/nepocorp/data/uploads/`.
- `/` → `127.0.0.1:3000` (frontend container).
- `/.well-known/acme-challenge/` → certbot webroot; Certbot adds the TLS block
  on first run (`certbot --nginx -d nepo.tingting.vip`).

The one-time `deploy/setup-server.sh` (piped over SSH) prepares a fresh droplet:
install Docker + nginx + certbot, UFW limited to SSH/HTTP/HTTPS, create
`/opt/nepocorp/{data/postgres,data/redis,data/uploads,deploy}`, generate
`/opt/nepocorp/deploy/.env` with a random `JWT_SECRET` and `DB_PASSWORD`
(chmod 600), and write the nginx vhost. Afterwards: `make push`, `make deploy`,
then certbot for TLS.

## Rolling out production (`make deploy`)

```bash
make deploy   # == push (via dependencies) + deploy-backend + deploy-frontend
```

The root targets delegate: `deploy-backend` runs `push-backend` then
`$(MAKE) -C backend deploy`; `deploy-frontend` does the same for the frontend.

**Push** (`backend/Makefile`, `frontend/Makefile`): build the repo root as
context with `docker buildx` (builder `bb`, `linux/amd64`), tag the image
`:latest` **and** `:<short HEAD sha>`, enable inline registry cache, and push
to Docker Hub. Credentials come from `include .env` — the backend Makefile
loads `backend/.env` and the frontend Makefile shares it via
`include ../backend/.env`.

**Deploy** (identical mechanics in both Makefiles):

1. `ssh` → `docker compose pull` the service (prod server `nepo.tingting.vip`,
   `/opt/nepocorp`, `deploy/docker-compose.prod.yml`).
2. `up -d --force-recreate --no-deps` inside a **recreate-retry loop** (5
   attempts, 5s apart): a concurrent deploy or a removal left half-finished by
   an interrupted run makes compose fail with *"removal of container … is
   already in progress"* — transient, and the next attempt converges.
3. Wait for the new container to accept `docker exec … echo ok` (10 × 2s).
4. Backend only: run migrations **inside the container** —
   `docker exec nepocorp-backend-1 npx drizzle-kit migrate`. The migration SQL
   is baked into the image (`COPY backend/drizzle backend/drizzle` in the
   backend Dockerfile), so the container always migrates with its own code.
5. Reclaim disk: `docker image prune -af --filter 'until=72h'` — `-a` plus the
   `until` filter keeps the current and recent rollback tags while dropping
   build history (plain `prune -f` only removes dangling images, which let
   110 tagged images fill the demo box to 100% disk).

Because the frontend rollout skips migrations and the backend migrates inside
its fresh container, `make deploy-backend` is also the lightweight way to ship
a schema-only change.

### Release discipline

Both `push` targets build with the **checkout as build context**, so cutting a
release from a dirty working tree would bake uncommitted work into the images.
The guide's flow:

```bash
git worktree add --detach /tmp/cut-<sha> <freeze-sha>
cp backend/.env /tmp/cut-<sha>/backend/.env     # Docker Hub creds for include .env
cd /tmp/cut-<sha>
make demo            # staging first
make deploy          # production — explicit user go-ahead
git worktree remove --force /tmp/cut-<sha>
```

Verify after deploy: `docker ps`, `docker logs nepocorp-backend-1 --tail 50`,
`curl -s https://nepo.tingting.vip/api/health`.

## Demo staging (`demo.tingting.vip`)

Demo staging is a **second stack on the vantai droplet**, defined by
`DEMO_SERVER=demo.tingting.vip`, `DEMO_PATH=/opt/demo`, and
`DEMO_COMPOSE=deploy/docker-compose.demo.yml` in the root Makefile, next to
the (silversea-bound) `/opt/vantai` stack. Differences from the prod compose:

- Compose project / db / user are `demo`, so containers are `demo-*-1` and
  data lives under `/opt/demo/data`.
- Host loopback ports are **3091** (backend), **3001** (frontend), and **8081**
  (profile-gated adminer) — 3090/3000/8080 are taken by the vantai stack.
- Redis is capped at **64MB** (the droplet is 1GB RAM hosting two stacks).
- `CORS_ORIGIN=https://demo.tingting.vip`.
- Served by the host vhost `deploy/nginx-host-demo.conf` (same routing shape as
  prod, but proxying to 3091/3001).

**Data policy:** the demo database is a **one-time anonymized production
snapshot** (taken 2026-09-03 via ad hoc SQL, deliberately not committed).
Deploys ship **code only** — never re-seed, never wipe. All demo accounts share
the password `Abc123`. This is the opposite of the old vantai demo, whose
`seed-vantai*.sql` files truncate the schema on every load.

`make demo` / `demo-backend` / `demo-frontend` mirror the prod flow through the
`DEMO_*` variables: pull, recreate with the same retry loop, wait for
`demo-backend-1`, then `docker exec demo-backend-1 npx drizzle-kit migrate`
(migrations run inside the app container), followed by the 72h image prune.
`demo-backend` prints the API health URL `https://demo.tingting.vip/api/health`.

One-time provisioning (`deploy/setup-demo-server.sh`, run on the vantai
droplet) is strictly **additive** — nothing under `/opt/vantai` is touched. It
creates the `/opt/demo` directory tree, generates `/opt/demo/deploy/.env` with
a fresh `JWT_SECRET` and `DB_PASSWORD` plus integration keys (Google Maps,
MiniMax/OpenRouter assistant, VAPID push) copied from the vantai stack's env,
issues the certbot certificate for `demo.tingting.vip`, and starts **only
postgres + redis** — backend/frontend come up later against the loaded
snapshot.

## Production migrations (`prod-migrate`)

`make prod-migrate` applies all Drizzle SQL migrations when deploying outside
the container flow (or repairing drift). For every `backend/drizzle/*.sql`
filtered with `grep -v '\.revert\.sql'` it:

1. SCPs the file to `root@nepo.tingting.vip:/tmp/`.
2. `docker cp`s it into the `nepocorp-postgres-1` container.
3. Runs `docker exec … psql -U nepocorp -d nepocorp -v ON_ERROR_STOP=1
   --single-transaction -f /tmp/<basename>` — `ON_ERROR_STOP` aborts on the
   first error and `--single-transaction` rolls back a partial migration
   cleanly.
4. Removes the `/tmp` copy regardless of outcome.

Safety rules:

- **`*.revert.sql` files never run against prod** — those pairs are
  dev-rollback helpers only.
- A failing file is reported as `⚠️ skipped (already applied)` and the loop
  continues, so **re-running the target is safe**. This tolerance means
  migration SQL must be **idempotent** (`IF NOT EXISTS` / `IF EXISTS`);
  `ALTER TYPE ADD VALUE` is not idempotent (Postgres limitation) and needs a
  guard.
- **The target restarts `nepocorp-backend-1` at the end** so the running
  backend picks up the new schema — never apply migrations without that
  restart.
- Never run `psql` against prod manually; all scripts that touch the prod DB
  go through this target.

`make prod-migrate-file FILE=0085_your_migration.sql` applies a single file
through the same scp → `docker cp` → `psql` pipeline (no backend restart), for
surgical fixes. Note Drizzle is journal-based: the `__drizzle_migrations` table
tracks applied migrations by `created_at`, so a non-monotonic or future-dated
journal (manual edits, backup restores) makes migrations silently skip —
diagnose by comparing the journal rows with `ls backend/drizzle/*.sql`.

## Backup & restore

- **`make backup`** — dumps **production** to the operator's OneDrive: runs
  `pg_dump -U nepocorp nepocorp` inside `nepocorp-postgres-1` → `/tmp`, gzips
  the dump, **fails if the `.sql.gz` is empty**, `scp`s it to
  `/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/tingting_db_backup`
  as `tingting_pg_backup_<timestamp>.sql.gz`, and deletes the server copy.
- **`make restore`** — pulls the latest OneDrive backup into **local dev**:
  starts the dev `db` service and waits for `pg_isready`, picks the newest
  `tingting_pg_backup_*.sql.gz`, `gunzip -k`s it, terminates active
  connections and drops/recreates the `tingting` database, recreates the
  `nepocorp` role, restores the dump, then **resets every user's
  `password_hash` to bcrypt of `admin123`** — so restored production data is
  safe to log into and share locally.

## Adminer against prod (private)

`make adminer` opens the profile-gated adminer container on prod — bound to
`127.0.0.1:8080`, **never public** (the nginx `/adminer/` block was removed;
only the legacy vantai vhost still exposes one) — waits up to 30s for the
loopback listener, prints the connection details (Server `postgres`, DB/user
`nepocorp`, password read from `/opt/nepocorp/deploy/.env`), opens
`http://localhost:8082`, and holds an SSH tunnel `localhost:8082 → prod
loopback:8080`. Ctrl-C closes the tunnel; the container stays on prod loopback,
which is safe to leave running. The dev Adminer on `:8081` is a separate,
local-only instance from the dev compose.

## The separate vantai stack

`deploy/vantai/Makefile` drives `vantai.tingting.vip` (`PROD_SERVER`,
`DEPLOY_PATH=/opt/vantai`) — a simpler, older subset of the same flow: pull →
`up -d --force-recreate --no-deps` (no retry loop) → `compose exec -T backend
npx drizzle-kit migrate` → plain `docker image prune -f`, plus toggleable
public `/adminer/`. It is reserved for the silversea build and is **not** the
current demo; its seed files (`seed-vantai.sql`,
`seed-vantai-6months.sql`) wipe and reload the database, unlike the demo
stack's snapshot policy.

## Where to read more

- Local dev setup — [development/setup.md](development/setup.md)
- Database schema — [backend/database-schema.md](backend/database-schema.md)
- Architecture — [architecture.md](architecture.md)
- Authoritative steps — `docs/deployment-guide.md`
