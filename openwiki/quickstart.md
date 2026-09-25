---
type: quickstart
title: Quickstart — Reading & Navigating the NEPO Code Wiki
description: Task-routing map for agents and contributors — what to read first, which wiki page owns which job, where the authoritative Vietnamese docs live, and the Makefile entry points for each environment.
tags: [quickstart, onboarding, navigation, task-routing, makefile]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-24T15:30:51.512Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-d86143a5773880ec6502d82c
    resource: repo://backend/src/casbin/enforcer.ts
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-4c03e203b4fc82b1a8a8b318
    resource: repo://backend/src/routes/agent.ts
  - id: openwiki-source-ba8b8ba88cc54fb0fa7745c1
    resource: repo://backend/src/routes/financial/billing-documents.routes.ts
  - id: openwiki-source-568d1b8aa4faf5fb62eff11c
    resource: repo://backend/src/routes/vehicle-schedules.ts
  - id: openwiki-source-3bf87ebeab31f4c3f08dd1d8
    resource: repo://backend/src/services/company-info.service.ts
  - id: openwiki-source-7610fde5069b313fb993d644
    resource: repo://docs/code-standards.md
  - id: openwiki-source-7865fb2b5570e6ebb2f50ca8
    resource: repo://docs/deployment-guide.md
  - id: openwiki-source-e94b00569b611000fb5edfe5
    resource: repo://docs/flows/README.md
  - id: openwiki-source-aab9bb6c95c5f97fceecac29
    resource: repo://docs/project-overview-pdr.md
  - id: openwiki-source-ed669e7378dbf5097d605a1f
    resource: repo://docs/project-roadmap.md
  - id: openwiki-source-62317b515c31ac5b3e190eb4
    resource: repo://docs/system-architecture.md
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
generated: { by: "openwiki/0.5.2", at: "2026-09-24T15:30:51.512Z" }
---

**NEPO** is the production codename for the Vietnamese trucking/logistics
platform (legally **CÔNG TY TNHH NEPO**, Hải Phòng). The historical brand
**TingTing** is still everywhere in day-to-day identifiers — the `@tingting/*`
workspace packages, the `tingting-backend` / `tingting-frontend` Docker images,
the `*.tingting.vip` domains, and the `docs/flows/` user manuals — while the
API logs "NEPO API running on port 3090" and production runs as the `nepocorp`
stack. Both names are the same system.

## If you're new to the codebase

1. **[System architecture](architecture.md)** — monorepo topology, request
   lifecycle, RBAC boundaries.
2. **[Vietnamese domain glossary](domain-glossary.md)** — Vietnamese ↔ English
   term pairs (Chuyến xe, Sổ cái, Tiền đi đường, Giấy báo nợ, …) tied to the
   enums, tables, and services that implement them. The business canon is
   `docs/flows/` (its `README.md` index plus `00-OVERVIEW_VA_PHAN_QUYEN.md` …
   `15-QUAN_LY_LOP_XE.md`); the old `/CONTEXT.md` glossary has been deleted,
   and this wiki page is now the term map.
3. **[Coding conventions](development/conventions.md)** — the rules that every
   PR must satisfy.
4. **[Local setup](development/setup.md)** — prerequisites, `make setup`,
   ports, seeded login.

## If you want to do a specific job

| You need to … | Start here |
|---|---|
| Add a REST endpoint | [backend/api-routes.md](backend/api-routes.md) — pick a router, add `casbinAuthz('resource')`, write the Zod schema in `shared/src/schemas/`, then the service call. Path-specific routers must mount **before** the catch-all `/api` in `backend/src/index.ts`. |
| Add a Drizzle migration | [backend/database-schema.md](backend/database-schema.md) — `pnpm db:generate` from `backend/` (or `make generate`), commit the SQL, apply with `make prod-migrate` (skips `*.revert.sql`) or a single file via `make prod-migrate-file FILE=….sql`. |
| Work on vehicle schedules (lịch bảo dưỡng / đăng kiểm) | [backend/api-routes.md](backend/api-routes.md) + [shared/schemas.md](shared/schemas.md) — `/api/vehicle-schedules` (office roles, complete/cancel lifecycle), `vehicleSchedule*` Zod schemas, `useVehicleSchedules` hooks behind FleetPage and the Dashboard banner. |
| Build debit notes / billing documents | [backend/ledger.md](backend/ledger.md) + [shared/calculations.md](shared/calculations.md) — `billing-documents.routes.ts` + `billingDocument.service.ts`, the `billing_documents` / `billing_document_lines` / `debit_note_templates` tables, Giấy báo nợ / Bảng kê export. |
| Work on the agent / chatbot | [backend/admin-and-agent.md](backend/admin-and-agent.md) — `/api/agent` + socket.io transport, the `BOT_ENABLE` flag, the LLM provider registry, `/api/admin/chatbot` metrics. |
| Edit a page | [frontend/app.md](frontend/app.md) — find the page, follow the role guards in `App.tsx`, compose with the design-system primitives and `features/` sections. |
| Add a custom hook | [frontend/hooks.md](frontend/hooks.md) — colocate `*.test.ts(x)` next to the hook. |
| Touch the ledger | [backend/ledger.md](backend/ledger.md) — never UPDATE/DELETE; post `ADJUSTMENT` or `UNLOCK_REVERSAL` rows. |
| Change fuel or allowance math | [shared/calculations.md](shared/calculations.md) — backend and frontend share the same helpers. |
| Change a Casbin policy | [backend/auth-rbac.md](backend/auth-rbac.md) — edit `backend/src/casbin/policy.csv`; it loads at process boot via `initEnforcer()`, so apply edits with a restart (or a no-op edit to trigger `tsx watch`). |
| Add a Zod schema | [shared/schemas.md](shared/schemas.md) — pair each schema with `z.infer` for the input type. |
| Diagnose a bug | [development/testing.md](development/testing.md) — backend `tsx --test` suites, frontend colocated Vitest suites, Python e2e under `e2e/`, manual scripts under `docs/flows/`. |
| Deploy or operate an environment | [deployment.md](deployment.md) — `make demo*` staging, `make deploy*` production, `make prod-migrate`, and the `backup` / `restore` / `adminer` ops targets. |

## Makefile entry points

The root `Makefile` is the single entry point for every environment:

| Target | What it does |
|---|---|
| `make setup` | First-time: infra up → `drizzle-kit generate` + `migrate` → seed (login `admin / admin123`). |
| `make dev` | Daily: db/redis containers, backend `:3090` + frontend `:7173`; best-effort `generate` + `migrate` on boot. |
| `make migrate` / `make generate` | Run drizzle-kit by hand against `backend/`. |
| `make demo` / `demo-backend` / `demo-frontend` | Build + push images and roll the demo staging stack at `demo.tingting.vip` (`/opt/demo`, `deploy/docker-compose.demo.yml`); the backend target runs `drizzle-kit migrate` inside the recreated container. Deploys ship code only — never re-seed or wipe the demo DB. |
| `make prod-migrate` / `make prod-migrate-file FILE=…` | Apply `backend/drizzle/*.sql` to the production DB (skipping `*.revert.sql`), or one named file. |
| `make backup` / `make restore` / `make adminer` | Dump the prod DB to OneDrive; restore a dump into local dev; open prod Adminer over a private SSH tunnel (`localhost:8082`). |

## Authoritative documents

When the wiki says "see docs/flows" or "see docs/code-standards", that's the
canon — these wiki pages are a navigation index, not a re-authoring.

- `docs/flows/README.md` — index of the Vietnamese QA-testing + user-manual
  set, with the routes × documents × roles coverage matrix.
- `docs/flows/00-OVERVIEW_VA_PHAN_QUYEN.md` … `15-QUAN_LY_LOP_XE.md` —
  role-by-role test scripts (00 RBAC overview, 01 trip lifecycle, 04 công nợ,
  11 driver portal, 13 giao nhận + tạm ứng, 14 lương, 15 lốp xe, …).
- `docs/flows/DELIVERY_TRIP_LIFECYCLE.md` — trip-lifecycle QA guide.
- **Terminology:** the former `/CONTEXT.md` domain glossary has been deleted.
  The term map is [domain-glossary.md](domain-glossary.md); the business
  wording lives in `docs/flows/`.
- `docs/code-standards.md` — coding conventions.
- `docs/codebase-summary.md` — codebase map.
- `docs/system-architecture.md` — architecture doc.
- `docs/deployment-guide.md` — deployment doc.
- `docs/project-overview-pdr.md` + `docs/project-roadmap.md` — product
  overview/requirements and roadmap. (The earlier root-level `PRODUCT-SPECS.md`
  and `ROADMAP.md` no longer exist; a few older docs still link to them.)
- `AGENTS.md` / `CLAUDE.md` — repo-root agent briefs: commands, conventions,
  and non-obvious domain rules.

## Conventions at a glance

- TypeScript strict, no `any`. Shared types from `shared/src/types/`.
- Zod schemas in `shared/src/schemas/`; use `z.infer<typeof XxxSchema>` over
  hand-rolled interfaces.
- Vietnamese user copy; VND display has no decimals. Money is stored exact:
  ledger and trip money columns are `numeric(15, 0)` (integer đồng). The
  remaining scale-2 numerics hold fractional quantities and per-liter prices
  (fuel norms L/100km, liters, fuel allowances, `unit_price`), not ledger
  amounts. Round intermediates with `round2dp()`; display via
  `lib/format.ts`.
- One driver per trip (`trips.driver_id`, no per-trip driver list). The ledger
  is append-only. Audit messages are Vietnamese; one mutating API call = one
  audit row.
- `casbinAuthz('resource')` + optional `requireRoles(...)` (dual-layer RBAC).
- Frontend: Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config`), no
  `!important`, no raw DB IDs in UI text, mobile-first for DRIVER/FORWARDER.

See [development/conventions.md](development/conventions.md) for the full
list.

## Where to read more

- Architecture — [architecture.md](architecture.md)
- Deployment — [deployment.md](deployment.md)
- Domain glossary — [domain-glossary.md](domain-glossary.md)
- Backend — [backend/services.md](backend/services.md), [backend/api-routes.md](backend/api-routes.md), [backend/database-schema.md](backend/database-schema.md), [backend/ledger.md](backend/ledger.md), [backend/auth-rbac.md](backend/auth-rbac.md), [backend/admin-and-agent.md](backend/admin-and-agent.md)
- Frontend — [frontend/app.md](frontend/app.md), [frontend/hooks.md](frontend/hooks.md), [frontend/lib.md](frontend/lib.md)
- Shared package — [shared/schemas.md](shared/schemas.md), [shared/calculations.md](shared/calculations.md)
- Workflows — [development/setup.md](development/setup.md), [development/conventions.md](development/conventions.md), [development/testing.md](development/testing.md)
