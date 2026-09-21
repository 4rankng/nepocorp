---
type: quickstart
title: Quickstart — Reading & Navigating the NEPO Code Wiki
description: Task-routing map for new contributors and agents. What to read first, where authoritative answers live, and which wiki pages map to which jobs.
tags: [quickstart, onboarding, navigation]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-7610fde5069b313fb993d644
    resource: repo://docs/code-standards.md
  - id: openwiki-source-7865fb2b5570e6ebb2f50ca8
    resource: repo://docs/deployment-guide.md
  - id: openwiki-source-62317b515c31ac5b3e190eb4
    resource: repo://docs/system-architecture.md
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

**NEPO** is the production codename for the Vietnamese trucking/logistics
platform. The historical brand `TingTing` still appears in marketing docs
and some seed scripts — they're the same system.

## If you're new to the codebase

<!-- openwiki: broken internal link [../architecture.md] file "../architecture.md" does not exist. Fix the href or restore the target, then delete this comment. -->
1. **[Architecture](../architecture.md)** — monorepo topology, request
   lifecycle, RBAC.
<!-- openwiki: broken internal link [../domain-glossary.md] file "../domain-glossary.md" does not exist. Fix the href or restore the target, then delete this comment. -->
2. **[Domain glossary](../domain-glossary.md)** — Vietnamese ↔ English term
   pairs (Chuyến xe, Sổ cái, Tiền đi đường, …). Authoritative source is
   [`/CONTEXT.md`](../../../../CONTEXT.md).
<!-- openwiki: broken internal link [../development/conventions.md] file "../development/conventions.md" does not exist. Fix the href or restore the target, then delete this comment. -->
3. **[Coding conventions](../development/conventions.md)** — the rules that
   every PR must satisfy.
<!-- openwiki: broken internal link [../development/setup.md] file "../development/setup.md" does not exist. Fix the href or restore the target, then delete this comment. -->
4. **[Setup](../development/setup.md)** — to run the app locally.

## If you want to do a specific job

| You need to … | Start here |
|---|---|
<!-- openwiki: broken internal link [../backend/api-routes.md] file "../backend/api-routes.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Add a REST endpoint | [backend/api-routes.md](../backend/api-routes.md) — pick a router, add `casbinAuthz('resource')`, write the Zod schema in `shared/src/schemas/`, then the service call. |
<!-- openwiki: broken internal link [../backend/database-schema.md] file "../backend/database-schema.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Add a Drizzle migration | [backend/database-schema.md](../backend/database-schema.md) — `pnpm db:generate` from `backend/`, commit the SQL, run `make prod-migrate` (excludes `*.revert.sql`). |
<!-- openwiki: broken internal link [../frontend/app.md] file "../frontend/app.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Edit a page | [frontend/app.md](../frontend/app.md) — find the page, follow role guards in `App.tsx`, add your card under `components/trip/` or compose with the existing primitives. |
<!-- openwiki: broken internal link [../frontend/hooks.md] file "../frontend/hooks.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Add a custom hook | [frontend/hooks.md](../frontend/hooks.md) — colocate `*.test.ts(x)` next to the hook. |
<!-- openwiki: broken internal link [../backend/ledger.md] file "../backend/ledger.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Touch the ledger | [backend/ledger.md](../backend/ledger.md) — never UPDATE/DELETE; post `ADJUSTMENT` or `UNLOCK_REVERSAL` rows. |
<!-- openwiki: broken internal link [../shared/calculations.md] file "../shared/calculations.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Change fuel or allowance math | [shared/calculations.md](../shared/calculations.md) — backend and frontend share the same helpers. |
<!-- openwiki: broken internal link [../backend/auth-rbac.md] file "../backend/auth-rbac.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Change a Casbin policy | [backend/auth-rbac.md](../backend/auth-rbac.md) — edit `backend/src/casbin/policy.csv`; reload via `initEnforcer()`. |
<!-- openwiki: broken internal link [../shared/schemas.md] file "../shared/schemas.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Add a Zod schema | [shared/schemas.md](../shared/schemas.md) — pair each schema with `z.infer` for the input type. |
<!-- openwiki: broken internal link [../development/testing.md] file "../development/testing.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Diagnose a UI bug | [development/testing.md](../development/testing.md) — frontend colocated tests; e2e under `e2e/`; manual scripts under `docs/flows/`. |
<!-- openwiki: broken internal link [../deployment.md] file "../deployment.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Deploy | [deployment.md](../deployment.md) — `make prod-migrate`, `make deploy-backend`, `make deploy-frontend`. |

## Authoritative Vietnamese documents

When the wiki says "see CONTEXT" or "see docs/flows", that's the canon — these
wiki pages are a navigation index, not a re-authoring.

- `/CONTEXT.md` — domain glossary.
- `docs/flows/DELIVERY_TRIP_LIFECYCLE.md` — trip-lifecycle QA guide.
- `docs/flows/00-OVERVIEW_VA_PHAN_QUYEN.md` through `15-QUAN_LY_LOP_XE.md` —
  role-by-role test scripts.
- `docs/code-standards.md` — authoritative coding conventions.
- `docs/codebase-summary.md` — authoritative codebase map.
- `docs/system-architecture.md` — authoritative architecture doc (Vietnamese).
- `docs/deployment-guide.md` — authoritative deployment doc.
- `PRODUCT-SPECS.md` — product requirements.
- `ROADMAP.md` — project roadmap.

## Conventions at a glance

- TypeScript strict, no `any`. Shared types from `shared/src/types/`.
- Zod schemas in `shared/src/schemas/`; use `z.infer<typeof XxxSchema>` over
  hand-rolled interfaces.
- Vietnamese user copy; VND display has no decimals; money columns stored
  exact (`numeric(15, 0)` for ledger, `numeric(15, 2)` for cost/price).
- One driver per trip. Ledger is append-only. Audit messages in Vietnamese.
- `casbinAuthz('resource')` + optional `requireRoles(...)` (dual-layer RBAC).
- Frontend: Tailwind v4 (no `tailwind.config`), no `!important`, no raw DB
  IDs in UI text, mobile-first for DRIVER/FORWARDER.

<!-- openwiki: broken internal link [../development/conventions.md] file "../development/conventions.md" does not exist. Fix the href or restore the target, then delete this comment. -->
See [development/conventions.md](../development/conventions.md) for the full
list.

## Where to read more

<!-- openwiki: broken internal link [../architecture.md] file "../architecture.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- Architecture — [architecture.md](../architecture.md)
<!-- openwiki: broken internal link [../backend/services.md] file "../backend/services.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../backend/api-routes.md] file "../backend/api-routes.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../backend/database-schema.md] file "../backend/database-schema.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../backend/ledger.md] file "../backend/ledger.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- Backend module map — [backend/services.md](../backend/services.md), [backend/api-routes.md](../backend/api-routes.md), [backend/database-schema.md](../backend/database-schema.md), [backend/ledger.md](../backend/ledger.md)
<!-- openwiki: broken internal link [../frontend/app.md] file "../frontend/app.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../frontend/hooks.md] file "../frontend/hooks.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../frontend/lib.md] file "../frontend/lib.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- Frontend module map — [frontend/app.md](../frontend/app.md), [frontend/hooks.md](../frontend/hooks.md), [frontend/lib.md](../frontend/lib.md)
<!-- openwiki: broken internal link [../shared/schemas.md] file "../shared/schemas.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../shared/calculations.md] file "../shared/calculations.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- Shared package — [shared/schemas.md](../shared/schemas.md), [shared/calculations.md](../shared/calculations.md)
<!-- openwiki: broken internal link [../development/setup.md] file "../development/setup.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../development/testing.md] file "../development/testing.md" does not exist. Fix the href or restore the target, then delete this comment. -->
<!-- openwiki: broken internal link [../deployment.md] file "../deployment.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- Workflows — [development/setup.md](../development/setup.md), [development/testing.md](../development/testing.md), [deployment.md](../deployment.md)
