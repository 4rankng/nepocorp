---
type: "Reference"
title: "Admin and agent"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-a6dc538b375aab6cef75b9f4
    resource: repo://backend/src/routes/admin-chatbot-metrics.ts
  - id: openwiki-source-4b850bebc83698aca62eb3b7
    resource: repo://backend/src/services/gps/capture.service.ts
  - id: openwiki-source-38f1e7541a9ce7aeabafdc43
    resource: repo://backend/src/services/gps/parse.ts
  - id: openwiki-source-811ee46a8cfbeffdbab532bc
    resource: repo://backend/src/services/llm/provider.ts
  - id: openwiki-source-59792ee37d37305acb85c829
    resource: repo://backend/src/services/notification.service.ts
  - id: openwiki-source-6436e1e326aa8abfbc8cf105
    resource: repo://backend/src/services/ocr.service.ts
  - id: openwiki-source-701fb928e8710b0594d638b2
    resource: repo://backend/src/services/photo-authz.service.ts
  - id: openwiki-source-233de833976c011ab32e5520
    resource: repo://docs/adr/0042-photo-authz-exact-storagekey.md
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---


NEPO has several cross-cutting subsystems that sit alongside the core trip/finance
flow. They are mounted under their own `/api/admin/*`, `/api/agent`, `/api/ocr`,
`/api/notifications`, and `/api/photos` routes and have isolated services.

## Admin chatbot metrics (`/api/admin/chatbot`)

Read-only aggregation API in `backend/src/routes/admin-chatbot-metrics.ts:1`. Surfaces
per-turn metrics from `agent_turn_metrics` as rolled-up summaries, latency breakdowns
(p50/p95/p99), per-tool stats, a daily timeseries, and a recent-turns table. Handlers
accept `?range=7d|30d` (default 7d) and filter on `created_at >= (now - range)`.

RBAC is enforced at mount time by `casbinAuthz('chatbot-metrics')`; the existing
ADMIN wildcard (`p, ADMIN, *, *`) is the only policy that matches, so MANAGER and
ACCOUNTANT receive 403 without any policy edits.

The handler preserves `NULL` semantics: `percentile_cont(0.95) WITHIN GROUP (ORDER
BY col)` returns NULL on empty or all-null sets, and the contract is to forward null
(never `COALESCE` to 0) so the frontend renders an honest '—'. `AVG(...)::double
precision` is used for stable JSON number shape.

## Agent / chatbot (`/api/agent`)

Command-and-insight assistant bot. Mounted at `backend/src/index.ts:131` with
`authMiddleware + casbinAuthz('agent')`; returns 503 while the `BOT_ENABLE` env flag
is off. Telemetry is recorded through `backend/src/services/metrics/` (`metric-registry`,
`metric-types`).

LLM provider abstraction lives in `backend/src/services/llm/`:
- `provider.ts` — `LlmProvider` interface (`complete` + `streamComplete`).
- `minimax.client.ts` and `openrouter.client.ts` — concrete providers, both speaking
  the OpenAI Chat Completions surface so the option/result shapes stay uniform
  (`MiniMaxMessage`, `MiniMaxTool`, `MiniMaxCallResult`, …).
- `provider-registry.ts` — selects the active provider/model from `llm-settings`
  without touching call sites.
- `failover.ts` — fallback chain when the primary provider fails.
- `embeddings.ts` — separate embeddings path for the FAQ knowledge base.
- `settings.ts` — admin LLM settings persistence.

Real-time transport is a `socket.io` server attached to the same `http.Server`
Express uses (`initAgentSocket`, `backend/src/index.ts:160`); gracefully closed on
SIGTERM/SIGINT before the HTTP server drains.

## GPS tracking and admin backfill

Two related surfaces:

- **`/api/admin/gps`** — MANAGER/ADMIN-only, gated by
  `casbinAuthz('gps-admin')`. Route-DB admin operations: backfill and recapture
  (`backend/src/routes/admin-gps.ts`), powered by `backend/src/services/gps/route-capture.ts`
  and `route-lookup.ts`.
- **`/api/admin/gps-settings`** — ADMIN-only `requireRoles(Role.ADMIN)`. Stores
  Bách Khoa GPS credentials (`backend/src/routes/gps-settings.ts`, schemas in
  `@tingting/shared` `gps-settings.ts`).

Live fleet reads live in `backend/src/services/gps/` with provider-specific modules
under `providers/`. The `capture.service.ts` is the periodic poller; `parse.ts`
normalizes vendor payloads; `reports.ts` exposes read models.

## OCR receipt processing (`/api/ocr`)

Mounted with `authMiddleware + casbinAuthz('ocr')` at `backend/src/index.ts:126`.
Backed by `backend/src/services/ocr.service.ts` for container/seal recognition
supporting the trip container workflow. Returns recognized text plus bounding boxes
for downstream forms.

## Notifications and push (`/api/notifications`)

`backend/src/services/notification.service.ts` is the in-app inbox model
(`notifications` table, paginated reads, unread counts). An in-process
`EventEmitter` (`eventBus`, max 50 listeners) emits `notification:generate` events;
subscribers decide whether to also fan out a push. Audience targeting accepts
`targetUserId`, `targetRoles`, or `targetDriverId`.

`push.service.ts` is the web-push fan-out. `PUSH_RULES` (in `@tingting/shared`)
maps each `NotificationType` to a delivery rule. `FINANCIAL_ROLES` /
`isFinancialRole` determine office-wide fan-out. `initPushService()` is called at
boot alongside `initAuditService()` and `initNotificationService()`
(`backend/src/index.ts:40`).

## Photo authorization (`/api/photos`)

Mounted at `backend/src/index.ts:123` with `assetAuthMiddleware` (JWT signature +
`jti` only — no role resolution) plus `casbinAuthz('photos')`. Photos are served
from the ambiguous storage prefix `expense-photos/<id>/` shared by two independent
sequences — company receipts (`expense_photos`, keyed by `expenses.id`) and
forwarder receipts (`trip_expense_photos`, keyed by `trip_expenses.id`). The
sequences can collide numerically, so path-based authorization is unsafe.

`backend/src/services/photo-authz.service.ts` implements the **exact-storage-key
+ strictest-match** rule (ADR 0042, N5/N6):

1. Run parallel `SELECT … WHERE storage_key = $1 LIMIT 1` against both tables.
2. If both rows are absent → `not_found` (404).
3. Authorize per-table:
   - **trip side** — finance always; `FORWARDER` must own the row AND the owner's
     `users.status = ACTIVE` (re-validated here because `assetAuthMiddleware` only
     checks signature, not active status); `DRIVER` never. `forwarderId` is
     nullable (accountants also create trip expenses), so null ≠ userId denies
     an accountant-created receipt naturally.
   - **expense side** — finance only (company receipts are B1-confidential).
4. **Strictest-match** — allow only if authorized under every table that holds the
   key. A both-tables match that denies is a write-path integrity signal logged at
   `warn` level (N6).

The helper is pure (no `req`/`res`) for unit-testability; the router maps the
decision to `sendFile / 403 / 404`.

## Where to read more

<!-- openwiki: broken internal link [backend/api-routes.md] file "backend/api-routes.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- API surface — [backend/api-routes.md](backend/api-routes.md)
<!-- openwiki: broken internal link [backend/services.md] file "backend/services.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- Service map — [backend/services.md](backend/services.md)
<!-- openwiki: broken internal link [backend/auth-rbac.md] file "backend/auth-rbac.md" does not exist. Fix the href or restore the target, then delete this comment. -->
- RBAC and Casbin — [backend/auth-rbac.md](backend/auth-rbac.md)
- ADR 0042 — `docs/adr/0042-photo-authz-exact-storagekey.md`
