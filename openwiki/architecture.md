---
type: architecture-overview
title: System Architecture
description: End-to-end architecture of the NEPO Logistics platform — monorepo topology, runtime topology, request lifecycle, RBAC boundaries, and data flow between React, Express, Drizzle, and PostgreSQL.
tags: [architecture, monorepo, request-flow, rbac]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-372d8e351dc2bc9677967d48
    resource: repo://backend/src/middleware/casbin.ts
  - id: openwiki-source-454c9bcdde0b77b35e0fc994
    resource: repo://frontend/src/App.tsx
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-f66d3b21b3dac1c048076752
    resource: repo://shared/src/index.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO Logistics is a Vietnamese trucking/fleet management platform that replaces the
company's prior Excel-based workflows. The codebase is a pnpm monorepo with three
packages plus deploy/infrastructure glue.

## Monorepo topology

```
backend/    Express 5 + Drizzle ORM + PostgreSQL   (port 3090)
frontend/   React 19 + Vite + Tailwind 4         (port 7173, proxies /api → 3090)
shared/     @tingting/shared — enums, types, Zod schemas, calculations
deploy/     Production deploy scripts (docker-compose, prod-migrate)
docs/       Authoritative product and architecture docs (Vietnamese)
```

`shared/` is the contract boundary. Backend and frontend both depend on it;
`pnpm-workspace.yaml` wires the symlink. The shared barrel `shared/src/index.ts:1`
re-exports enums, types, schemas (`z.infer` shape), and calculation helpers
(`round2dp`, `computeTripTotals`, `computeDriverRoadAllowance`, ISO 6346 helpers,
FIFO aging, vehicle alerts). Built output is consumed as `dist/` by both consumers.

## Runtime topology

- **PostgreSQL** on `:5440` (dev compose) — Drizzle ORM via `postgres.js` driver,
  `unaccent` extension enabled at boot (`backend/src/index.ts:46`).
- **Redis** on `:6390` — used for caches and agent socket state.
- **Backend** on `:3090` — Express 5, single HTTP server (`backend/src/index.ts:154`).
- **Frontend** on `:7173` — Vite dev server, `/api` proxied to `:3090`.

Health endpoint is public at `GET /api/health` and returns `{ status, timestamp }`.

## Request lifecycle (React → Express → PostgreSQL)

1. **Browser** dispatches a fetch through the API client wrapper at
   `frontend/src/lib/api.ts`, attaching the JWT bearer token.
2. **Vite dev proxy** (frontend port 7173) forwards `/api/**` to backend port 3090.
3. **Express app** (`backend/src/index.ts:53`) applies the middleware stack in order:
   - `cors` with a configurable allow-list (dev: `http://localhost:7173`).
   - `express.json()` for body parsing.
   - `/uploads` static serving.
   - Inline request logger (skips `/api/health`, `/uploads`, `/favicon.ico`).
   - `auditLogMiddleware` — records every mutation request as a Vietnamese audit
     message before route handlers run.
4. **Route mounting** (`backend/src/index.ts:93`–`146`) — each router is mounted
   with the auth + Casbin gates it needs, e.g.
   `app.use('/api/trips', authMiddleware, casbinAuthz('trips'), tripRoutes)`.
   More sensitive routes add `requireRoles(Role.ADMIN)` as a belt-and-suspenders
   gate (LLM settings, FAQ admin, GPS settings, app settings).
5. **Route handler** parses + validates with a Zod schema from `shared/src/schemas/`,
   calls a service method (`backend/src/services/*.service.ts`), and returns.
6. **Service layer** owns DB writes (Drizzle), calculations (delegating to `shared/`),
   and ledger / audit side-effects.
7. **Drizzle ORM** issues a single SQL statement or a transaction to PostgreSQL.
8. **`globalErrorHandler`** (`backend/src/index.ts:152`) catches `ZodError → 400`,
   `ApiError → custom status`, PG `23505 → 409`, otherwise `500`.
9. **`snake_case` serializer** rewrites response keys before they leave the API.

## RBAC boundaries

Casbin is the single source of truth for resource-level access. The
`backend/src/casbin/` directory holds the model (`model.conf`), the policy
(`policy.csv`), and the enforcer bootstrap (`enforcer.ts`).

Roles (Vietnamese in parens):

| Role | Vietnamese | Scope |
|---|---|---|
| `ADMIN` | Quản trị | Full access |
| `MANAGER` | Giám đốc | Office staff |
| `ACCOUNTANT` | Kế toán | Office staff, scoped reads |
| `DRIVER` | Lái xe | Own trips + earnings only |
| `FORWARDER` | — | Own trip expenses/advances only |

Two distinct middleware:

- `casbinAuthz('resource')` — coarse, per-router resource gate
  (`backend/src/middleware/casbin.ts`).
- `requireRoles(Role.ADMIN, …)` — fine-grained endpoint-level gate.

Both are typically composed on the same route mount to make admin-only resources
"deny by default" (no Casbin policy row means only the ADMIN wildcard
`p, ADMIN, *, *` matches).

Frontend mirrors this with in-component route guards in
`frontend/src/App.tsx:103` (`adminOnly`, `driverOnly`, `forwarderOnly`,
`managerOrAdminOnly`, `officeStaffOnly`, `strictAdminOnly`). Pages are wrapped in
per-route `ErrorBoundary` so a single crash cannot block navigation.

## Cross-cutting middleware

- **Audit** — `auditLogMiddleware` plus `audit-templates.ts` produce Vietnamese
  log messages for every mutating API call (one audit row per request, regardless
  of how many tables the handler touches).
- **Serializer** — snake_case response keys; used uniformly.
- **Trust proxy** — `app.set('trust proxy', config.trustProxy)` so `req.ip`
  reflects the real client IP behind nginx in production.
- **Graceful shutdown** — SIGTERM/SIGINT close the agent socket.io, drain the
  HTTP server, end the Postgres pool, and close Redis before `process.exit(0)`.

## Where to read more

- Backend module map — [backend/api-routes.md](backend/api-routes.md), [backend/services.md](backend/services.md), [backend/database-schema.md](backend/database-schema.md)
- RBAC deep dive — [backend/auth-rbac.md](backend/auth-rbac.md)
- Financial domain — [backend/ledger.md](backend/ledger.md), [shared/calculations.md](shared/calculations.md)
- Frontend layout — [frontend/app.md](frontend/app.md), [frontend/hooks.md](frontend/hooks.md)
- Conventions — [development/conventions.md](development/conventions.md)
- Authoritative architecture docs — `docs/system-architecture.md` (Vietnamese)
