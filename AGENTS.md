# AGENTS.md — NEPO Logistics System

## Project Overview

Vietnamese trucking/logistics management web app replacing 7+ Excel files Monorepo with shared types, Express backend, React frontend. Domain model is in `CONTEXT.md` — read it before touching business logic.

## Commands

```bash
# Install
pnpm install

# Dev (both packages in parallel)
pnpm dev

# Dev individual packages
pnpm dev:backend    # Express on :3001 (tsx watch)
pnpm dev:frontend   # Vite on :5173, proxies /api → :3001

# Build (shared must build first)
pnpm build

# Database
pnpm db:generate    # drizzle-kit generate (from backend)
pnpm db:migrate     # drizzle-kit migrate
pnpm db:studio      # drizzle-kit studio GUI
```

Backend `.env` required (see `packages/backend/.env.example`): `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `NODE_ENV`.

No test runner or linter is configured. No CI pipeline.

## Architecture

```
nepocorp/
├── packages/
│   ├── shared/        # @nepocorp/shared — types, Zod schemas, enums
│   ├── backend/       # @nepocorp/backend — Express 5 + Drizzle ORM + PostgreSQL
│   └── frontend/      # @nepocorp/frontend — React 19 + Vite + Tailwind 4
├── docs/              # product-spec.md, high-level-design.md, company PDFs
├── wireframe/         # HTML wireframes for accountant/director/driver views
└── CONTEXT.md         # Domain glossary & business rules (authoritative)
```

### Backend (`packages/backend/src/`)

| Path | Purpose |
|---|---|
| `index.ts` | Express app, CORS, route mounting, global audit middleware |
| `config/index.ts` | dotenv loading |
| `db/schema.ts` | All Drizzle ORM table definitions + pgEnums |
| `db/index.ts` | Drizzle instance (postgres.js driver) |
| `middleware/auth.ts` | JWT verification + `requireRoles()` RBAC helper |
| `middleware/audit.ts` | Auto-logs mutation requests as Vietnamese audit messages |
| `routes/` | Express routers: `auth`, `config`, `trips`, `financial`, `driver`, `upload` |
| `services/trip.service.ts` | Trip business logic: fuel calc, road allowance, lifecycle transitions |

### Frontend (`packages/frontend/src/`)

| Path | Purpose |
|---|---|
| `api/` | Empty — API calls are currently inline or through `lib/api.ts` |
| `hooks/useAuth.tsx` | Auth context, token in localStorage, auto-fetch `/users/me` |
| `lib/api.ts` | `ApiClient` class wrapping fetch with Bearer token |
| `lib/format.ts` | Vietnamese locale formatters (₫ currency, number, date) |
| `components/Layout.tsx` | Sidebar nav (role-based), topbar |
| `pages/` | All stubs except `LoginPage.tsx` — awaiting implementation |

### Shared (`packages/shared/src/`)

| Path | Purpose |
|---|---|
| `constants/` | Enums (`TripStatus`, `FuelMode`, `Role`, `TxnType`, etc.) + Vietnamese label maps |
| `types/` | TypeScript interfaces for all entities + API request/response shapes |
| `schemas/` | Zod validation schemas for all inputs (mirrors types) |

## Key Patterns & Conventions

### Backend

- **Express 5** (not Express 4) — async error handling differs; route handlers can be async without wrapping.
- **Drizzle ORM** with `postgres.js` driver, not `pg`. Schema is a single file (`db/schema.ts`).
- **pgEnum** for all status/type fields — defined at top of schema.ts, used in table definitions.
- **Route structure**: Each domain area is one router file. `config.ts` uses a generic CRUD factory pattern for catalog tables (customers, trucks, routes, etc.) — check it before creating new CRUD routes.
- **RBAC**: `requireRoles('ADMIN', 'MANAGER')` from `middleware/auth.ts`. Applied per-route.
- **Audit logging**: Global middleware in `audit.ts` intercepts all mutations and writes Vietnamese-language audit messages. One API call = one audit row, regardless of how many tables it touches.
- **Ledger immutability**: No UPDATE/DELETE endpoints on the ledger. Corrections go through `POST /api/ledger/adjustments` as new rows.

### Frontend

- **Vite path aliases**: `@` → `./src`, `@nepocorp/shared` → `../shared/src` (configured in `vite.config.ts`).
- **Tailwind CSS v4** (not v3) — uses `@tailwindcss/vite` plugin, no `tailwind.config.js`.
- **No state management library** — just React context (auth) and local state so far.
- **Role-based routing**: `App.tsx` mounts all routes; `Layout.tsx` conditionally shows nav items by role.

### Shared

- **Zod schemas** mirror TypeScript types. Use `z.infer<typeof XxxSchema>` for input types rather than defining separate interfaces when possible.
- **Enums** are plain TS `enum` types + a separate `xxxLabelMap` for Vietnamese display labels.

## Domain Knowledge (Non-Obvious)

This is a Vietnamese logistics domain with specific business rules. Read `CONTEXT.md` for the full glossary. Key non-obvious points:

- **Trip lifecycle**: 5 statuses (Created → In Transit → Completed → Locked → Canceled). Locking is per-trip, not monthly. Locking triggers immutable ledger entries.
- **Fuel calculation has 3 modes**: AUTO (legs × norms), FLAT_RATE/KHOÁN (manual override), MOUNTAIN (fixed allowance from route record). All modes can have a supplement added on top.
- **One set of fuel fields**, not separate "expected" vs "actual" — the same fields get continuously updated.
- **Road allowance formula**: `Tiền chuẩn - Giảm vé + Tăng vé - (Số trạm × 55.000) + [300.000 if return cargo]`. Base amount is a lookup table keyed by Route × Trailer Type.
- **Penalties are NOT company expenses** — they're salary deductions from drivers and recorded as "Other Income" for the company.
- **Ledger uses running balance**: Current debt = `balance` column of latest row for that entity.
- **entity_type/entity_id on Ledger are loosely coupled** (VARCHAR + Integer, no FK) — `entity_type` is a string like "DRIVER", "CLIENT", "VENDOR".
- **All audit log messages are in Vietnamese** — no English in user-facing audit trails.
- **Currency**: Vietnamese Dong (VNĐ), no decimals. Use `lib/format.ts` formatters.
- **Single trip = single driver** — always 1:1, even though a truck can have multiple drivers over time.

## Current State (as of writing)

- **Backend**: Fully implemented — auth, CRUD, trip lifecycle, fuel/allowance calculations, ledger, payments, P&L, audit logging, file uploads.
- **Frontend**: Shell only — routing, layout, auth, API client, and formatters are done. All page components (except LoginPage) are empty stubs.
- **Shared**: Complete — all types, enums, and Zod schemas.
- **Tests**: None. No test framework installed.
- **Linting**: None configured.

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>diagnose</name>
<description>Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", reports a bug, says something is broken/throwing/failing, or describes a performance regression.</description>
<location>global</location>
</skill>

<skill>
<name>dream</name>
<description>"Memory consolidation skill for Claude Code. Scans session transcripts for corrections, decisions, preferences, and patterns, then merges findings into persistent memory files. Auto-triggers via native Stop hook every 24hrs. Inspired by how sleep consolidates human memory."</description>
<location>global</location>
</skill>

<skill>
<name>grill-with-docs</name>
<description>Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.</description>
<location>global</location>
</skill>

<skill>
<name>improve-codebase-architecture</name>
<description>Find deepening opportunities in a codebase, informed by the domain language in CONTEXT.md and the decisions in docs/adr/. Use when the user wants to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a codebase more testable and AI-navigable.</description>
<location>global</location>
</skill>

<skill>
<name>tdd</name>
<description>Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.</description>
<location>global</location>
</skill>

<skill>
<name>vercel-composition-patterns</name>
<description>React composition patterns that scale. Use when refactoring components with</description>
<location>global</location>
</skill>

<skill>
<name>vercel-optimize</name>
<description>"Use for Vercel cost and performance optimization on deployed projects, especially Next.js, SvelteKit, Nuxt, and limited Astro apps. Collect Vercel metrics, usage, project config, and code scan results first; investigate only metric-backed candidates; produce ranked recommendations grounded in verified files and version-aware Vercel/framework docs. Trigger for Vercel bill reduction, slow or expensive routes, caching opportunities, Function Invocations, Build Minutes, Fast Data Transfer, Core Web Vitals, Bot Management, Fluid compute, or cost breakdown requests."</description>
<location>global</location>
</skill>

<skill>
<name>vercel-react-best-practices</name>
<description>React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.</description>
<location>global</location>
</skill>

<skill>
<name>web-design-guidelines</name>
<description>Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".</description>
<location>global</location>
</skill>

<skill>
<name>write-a-skill</name>
<description>Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.</description>
<location>global</location>
</skill>

<skill>
<name>zoom-out</name>
<description>Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.</description>
<location>global</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
