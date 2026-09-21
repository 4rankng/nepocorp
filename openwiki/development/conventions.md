---
type: coding-conventions
title: Coding Conventions
description: Repository conventions — TypeScript strict mode (no any), snake_case response serializer, Vietnamese copy, VND integer formatting, immutable ledger, one-driver-per-trip, Vietnamese audit messages, Casbin dual-layer.
tags: [conventions, typescript, style, vietnamese, vnd, snake-case, ledger]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-5027f8d2099f89169cc95e7d
    resource: repo://backend/drizzle.config.ts
  - id: openwiki-source-d4152f04311d0c8c58c1afbe
    resource: repo://backend/src/casbin/policy.csv
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-833cafcf2b0c8db4a21dde31
    resource: repo://backend/src/middleware/audit.ts
  - id: openwiki-source-372d8e351dc2bc9677967d48
    resource: repo://backend/src/middleware/casbin.ts
  - id: openwiki-source-6d80a02487569bcbb7938d4d
    resource: repo://backend/src/services/audit-templates.ts
  - id: openwiki-source-7610fde5069b313fb993d644
    resource: repo://docs/code-standards.md
  - id: openwiki-source-6cccf1e498f6f40830189fd5
    resource: repo://frontend/src/hooks/useAuth.tsx
  - id: openwiki-source-8c9141522f274f8620a4d150
    resource: repo://frontend/src/hooks/useCatalogs.ts
  - id: openwiki-source-378e3cf05ab0d05d335c68d5
    resource: repo://frontend/vite.config.ts
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
  - id: openwiki-source-5fdaee04264279630f2bb947
    resource: repo://shared/src/calculations/round.ts
  - id: openwiki-source-f7fd2de8ba29e8649d8291fb
    resource: repo://shared/src/calculations/tripTotals.ts
  - id: openwiki-source-f66d3b21b3dac1c048076752
    resource: repo://shared/src/index.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

This page is the newcomer on-ramp. For each rule it points to the authoritative
doc — read `CONTEXT.md` (`/CONTEXT.md`) and `docs/code-standards.md` for the
canonical wording.

## TypeScript

- **Strict mode** is mandatory. No `any` types anywhere.
- Shared types live in `shared/src/types/`. Zod schemas in `shared/src/schemas/`
  mirror them — prefer `z.infer<typeof XxxSchema>` over hand-rolled interfaces.
- Files: `.ts` for backend/shared, `.tsx` for React components.

## Database

- All access through **Drizzle ORM** — no raw SQL, no other query builders.
- Single schema file: `backend/src/db/schema.ts` (all tables + pgEnums at top).
- Migrations: `pnpm db:generate` → `pnpm db:migrate`. Production via
  `make prod-migrate` (excludes `*.revert.sql` — commit 45fbad3).

## Financial rules

- **Ledger is append-only.** Never `UPDATE` or `DELETE` ledger rows. Use
  `ADJUSTMENT` for corrections, `UNLOCK_REVERSAL` for trip unlocks. See
  [backend/ledger.md](../backend/ledger.md).
- All monetary calculations go through `round2dp()` and `computeTripTotals()`
  from `shared/src/calculations/`.
- **VAT asymmetry** — revenue is recorded **ex-VAT** (net), costs are recorded
  **incl-VAT** (gross). Do not normalize.
- **VND has no decimal places** in display. Internal calculations preserve 2dp
  for intermediate rounding (via `round2dp`); the final display rounds to an
  integer.
- `fuelPriceApplied` is a config snapshot at trip creation — never mutate.
  `fuelActualUnitPrice` is the per-trip override. Effective = actual ?? snapshot.
- One driver per trip — even though a truck can have multiple drivers over
  time, each `trips` row points to exactly one driver.

## RBAC

- **Dual-layer pattern** — `casbinAuthz('resource')` plus optional
  `requireRoles(...)`. See [backend/auth-rbac.md](../backend/auth-rbac.md).
- Resources without a Casbin policy row deny everyone except the ADMIN wildcard
  (`p, ADMIN, *, *`). Don't add `requireRoles(ADMIN)` to a route without
  understanding whether you also need a Casbin policy.

## Audit logging

- **One audit row per mutating API call**, regardless of how many tables the
  handler touches. See [backend/services.md](../backend/services.md).
- Audit messages are Vietnamese — templates live in
  `backend/src/services/audit-templates.ts`.
- Records: user, action, entity, timestamp, before/after diff. Query endpoint:
  `GET /api/audit-logs` (ADMIN/MANAGER only).

## API shape

- All REST endpoints are mounted under `/api/...` (no `/v1` segment; the
  codebase uses `/api` only).
- Response format: `{ data: T }` for success, `{ error: string, details? }` for
  errors. Pagination: `{ data: T[], total, page, limit }`.
- Filter via query params (`?status=COMPLETED&driverId=5`); search via `?q=`
  (PostgreSQL `unaccent` extension is loaded at boot for diacritic-insensitive
  search — `backend/src/index.ts:46`).

## Frontend

- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config` file.
- Page-scoped CSS in `frontend/src/styles/` (e.g. `TripDetailPage.css`).
- **No `!important`** — use page-scoped selectors for specificity.
- **No truncation** of column values — wrap, tooltip, or card layout.
- DRIVER and FORWARDER pages are mobile-first responsive.
- `<Money>` component renders VND with the dong sign as a subtitle-sized unit.
- `statusStrip` (3×20px color bar) appears on every status display.
- **No raw DB IDs in UI text** — show meaningful business labels (customer
  name, route name, license plate).
- Empty states use the illustration system in
  `frontend/src/lib/emptyIllustrations.ts`.
- Server state via TanStack Query (`@tanstack/react-query`).
- No global state library — React context (auth) + custom hooks.

## Typography

- Exactly 2 self-hosted fonts (no Google CDN).
- Font files in the repo; loaded via CSS `@font-face`.

## Localization

- User-facing copy is **Vietnamese** — strings like `Lưu`, `Hủy`, `Đang tải…`,
  `Không có quyền truy cập`. Keep Vietnamese diacritics intact when grepping
  (`rg` should match them).
- Money, dates, and distances use `frontend/src/lib/format.ts` helpers.

## Git

- Use conventional commit format (`feat:`, `fix:`, `refactor:`, `docs:`,
  `test:`, `chore:`). No AI references.
- Keep commits focused; do not mix schema migrations with feature code.
- Use `.ua/.understandignore` for paths the knowledge-graph plugin should skip.

## Where to read more

- Architecture overview — [architecture.md](../architecture.md)
- RBAC + audit — [backend/auth-rbac.md](../backend/auth-rbac.md)
- Ledger semantics — [backend/ledger.md](../backend/ledger.md)
- Domain glossary (authoritative) — `/CONTEXT.md`
- Code standards (authoritative) — `docs/code-standards.md`
- Codebase summary — `docs/codebase-summary.md`
