---
type: api-surface
title: REST API Surface
description: REST endpoints mounted under /api/v1 grouped by domain, with auth/RBAC posture, request/response contract pointers, and links to schema and service pages.
tags: [api, rest, routes, rbac]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-f0338966e492d30da8a52d33
    resource: repo://backend/src/routes/driver.ts
  - id: openwiki-source-add76b23b567527938d4d465
    resource: repo://backend/src/routes/financial/advances.routes.ts
  - id: openwiki-source-637e66b00bf69d09c8bf9e30
    resource: repo://backend/src/routes/financial/ledger.routes.ts
  - id: openwiki-source-797d5b4c0dde227c9606832a
    resource: repo://backend/src/routes/forwarder.ts
  - id: openwiki-source-488ae2ed09004d9ccff9d8ed
    resource: repo://backend/src/routes/trips.ts
  - id: openwiki-source-229fce9104304d0c4fb4e622
    resource: repo://backend/src/services/config.service.ts
  - id: openwiki-source-701fb928e8710b0594d638b2
    resource: repo://backend/src/services/photo-authz.service.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

All NEPO endpoints are mounted under `/api/v1` is **not** the current convention —
the actual prefix is `/api` (see `backend/src/index.ts:93`-`146`). Each router
file under `backend/src/routes/` defines its own sub-prefix; everything rides on
Express 5's automatic async error propagation.

**Cross-cutting middleware on every protected route:**

- `authMiddleware` — verifies JWT signature + `jti`, sets `req.user`.
- `casbinAuthz('resource')` — coarse Casbin gate per router.
- `requireRoles(...)` — added only for admin-only resources where "deny by
  default" is important (see [backend/auth-rbac.md](auth-rbac.md)).
- `auditLogMiddleware` — emits one Vietnamese audit row per mutating request,
  regardless of how many tables the handler touches.

Response bodies pass through the snake_case serializer.

## Endpoint map by domain

Routes are grouped by the directory they live in. The prefix column is what
appears after `/api`.

| Domain | Prefix(es) | Router file | Casbin resource | Notes |
|---|---|---|---|---|
| Health | `/health` | inline in `backend/src/index.ts:88` | — | Public |
| Auth | `/auth` | `routes/auth.ts` | — | Login public; `/me`, `/users` use own middleware |
| Trips | `/trips`, `/dispatch`, `/customers/:id` | `routes/trips.ts` | `trips` | Full lifecycle + bulk figures + adjustments |
| Driver portal | `/driver/me` | `routes/driver.ts` | `driver_portal` | DRIVER-only (own trips, earnings, penalties) |
| Forwarder portal | `/forwarder/me` | `routes/forwarder.ts` | `forwarder_portal` | FORWARDER-only (own trips, advances, settlements) |
| Forwarder expenses (admin) | `/forwarder-expenses` | `routes/forwarder-admin.ts` | `financial` | Office review |
| Financial | `/*` | `routes/financial/index.ts` | `financial` | Mounted at `/api` catch-all |
| Expenses | `/expenses` | `routes/expense.ts` | `financial` | Company expense entry/edit |
| Salary | `/salary` | `routes/salary.ts` | `salary` | Office-only |
| Config (catalogs) | `/`, `/*` | `routes/config.ts`, `routes/config/*` | `config` | CRUD on customers, trucks, trailers, routes, fuel, pricing, etc. |
| Vehicle schedules | `/vehicle-schedules` | `routes/vehicle-schedules.ts` | `config` | Office roles |
| Tire lifecycle | `/fleet/tires` (N1 sub-router) | `routes/config.ts: tireLifecycleRouter` | `config` | Mounted separately to add role check |
| Audit logs | `/audit-logs` | `routes/config.ts: auditLogRouter` | `audit_logs` | MANAGER/ADMIN |
| Maps | `/maps` | `routes/maps.ts` | `maps` | Map4D helpers |
| Photos | `/photos` | `routes/upload.ts: photosRouter` | `photos` | Uses `assetAuthMiddleware` + `photo-authz.service` (ADR 0042) |
| Uploads | `/upload` | `routes/upload.ts: uploadRouter` | `upload` | File uploads |
| OCR | `/ocr` | `routes/ocr.ts` | `ocr` | Container/seal recognition |
| Notifications | `/notifications` | `routes/notifications.ts` | `notifications` | In-app + push fan-out |
| Agent (chatbot) | `/agent` | `routes/agent.ts` | `agent` | 503 when `BOT_ENABLE=off`; office roles only |
| Admin chatbot metrics | `/admin/chatbot` | `routes/admin-chatbot-metrics.ts` | `chatbot-metrics` | ADMIN-only (ADMIN wildcard policy) |
| Admin GPS | `/admin/gps` | `routes/admin-gps.ts` | `gps-admin` | MANAGER/ADMIN — route-DB backfill/recapture |
| Admin GPS settings | `/admin/gps-settings` | `routes/gps-settings.ts` | (requireRoles(ADMIN)) | Bách Khoa credentials |
| Admin LLM settings | `/admin/llm-settings` | `routes/llm-settings.ts` | `llm-settings` | ADMIN-only |
| Admin FAQ entries | `/admin/faq-entries` | `routes/faq-admin.ts` | `faq-admin` | ADMIN-only + embeddings |
| Admin app settings | `/admin/app-settings` | `routes/app-settings.ts` | (requireRoles(ADMIN)) | |
| Salary periods (user) | `/salary-periods` | `routes/config.ts: salaryPeriodsRouter` | — | Auth only, accessible to all signed-in users |
| Salary periods (admin) | `/salary-periods` | `routes/config.ts: salaryPeriodsAdminRouter` | `config` | Office roles |
| 404 catch-all | `/api/*` | inline | — | Vietnamese message: "Không tìm thấy API" |

## Trip lifecycle endpoints (`/api/trips`)

Mounted with `authMiddleware + casbinAuthz('trips')`. Lifecycle transitions each
have their own verb:

- `POST /api/trips` — create (ADMIN/MANAGER for `requireRoles`-protected mutations).
- `GET  /api/trips` — list with summary/sort/filter helpers.
- `GET  /api/trips/:id` — detail.
- `PUT  /api/trips/:id/pre-departure` — pre-departure fields.
- `PUT  /api/trips/:id/actuals` — actuals (fuel, allowance, completion).
- `POST /api/trips/:id/dispatch` — IN_TRANSIT transition.
- `POST /api/trips/:id/complete` — COMPLETED transition.
- `POST /api/trips/:id/lock` — LOCKED transition (creates immutable ledger).
- `POST /api/trips/:id/cancel` — CANCELED transition.
- `POST /api/trips/:id/unlock` — ADMIN/MANAGER unlock.
- `PATCH /api/trips/:id/reassign` — reassign driver/truck.
- `PATCH /api/trips/:id/departure-date` — adjust dates.
- `POST /api/trips/bulk-figures` — bulk update actuals.
- `GET  /api/trips/:id/adjustments` and `POST /api/trips/:id/adjustment` — ledger
  adjustments (new rows, never UPDATE/DELETE — see [backend/ledger.md](ledger.md)).
- `GET  /api/trips/:id/containers`, `PUT` — container and seal batch operations.
- `GET  /api/trips/:id/instructions`, `PUT` — driver instructions.
- `GET  /api/trips/:id/expenses`, `POST`, `PUT`, `DELETE` — per-trip expenses.
- `GET  /api/trips/:id/fuel-voucher/{html,xlsx}` — generated vouchers.

## Financial endpoints (`/api/...`)

Mounted with `authMiddleware + casbinAuthz('financial')`. Sub-routers under
`backend/src/routes/financial/`:

- `advances.routes.ts` — request, approve, reject, balances, settlements.
- `billing-documents.routes.ts` — create / edit / export debit notes and payment
  statements using `debit-note-templates`.
- `debt-offsets.routes.ts` — inter-entity debt offset entries.
- `ledger.routes.ts` — read-only ledger queries by entity.
- `payments.routes.ts` — customer/supplier payment recording.
- `penalties.routes.ts` — driver penalty creation, status, fines.
- `reports.routes.ts` — P&L, aging, customer/supplier statements, dashboard stats.

## Config / catalog endpoints

Mounted with `authMiddleware + casbinAuthz('config')`. Most catalog CRUD is
generated by `createCrudRouter()` in `backend/src/services/config.service.ts`.
The catalog bootstrap (`catalogBootstrapRouter`, mounted at `/api` with auth only)
trims sensitive catalogs before responding to DRIVER/FORWARDER.

## Driver/Forwarder portals

Mounted at `/api/driver/me` and `/api/forwarder/me` with
`casbinAuthz('driver_portal')` / `casbinAuthz('forwarder_portal')`. Routes return
only the calling user's own records.

## Request/response contract

- **Validation** — every handler parses input with a Zod schema from
  `shared/src/schemas/` (`z.infer<typeof XxxSchema>` shapes). Invalid → 400 via
  `globalErrorHandler`.
- **Auth** — missing/expired/invalid JWT → 401. RBAC denial → 403.
- **Conflict** — Postgres unique violation (code `23505`) → 409.
- **Not found** — `/api/*` catch-all returns 404 with Vietnamese message.
- **Server error** — `globalErrorHandler` catches everything else → 500.
- **Response keys** — snake_case via serializer middleware.

## Where to read more

- Architecture — [architecture.md](../architecture.md)
- RBAC and middleware — [backend/auth-rbac.md](auth-rbac.md)
- Service map — [backend/services.md](services.md)
- Database schema — [backend/database-schema.md](database-schema.md)
- Schemas and enums — [shared/schemas.md](../shared/schemas.md)
- Subsystem endpoints (agent, chatbot, GPS, OCR, photo-authz) — [backend/admin-and-agent.md](admin-and-agent.md)
