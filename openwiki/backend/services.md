---
type: service-layer
title: Service Layer
description: Business logic services — trip-lifecycle state machine, fuel/road allowance calculations, ledger, financial/reporting, storage, audit, RBAC/user, GPS/OCR/agent, and the createCrudRouter() factory for catalogs.
tags: [services, trip-lifecycle, fuel, allowance, audit, crud, factory]
sources:
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-833cafcf2b0c8db4a21dde31
    resource: repo://backend/src/middleware/audit.ts
  - id: openwiki-source-0a70f06e2ffabc0894af05af
    resource: repo://backend/src/routes/config.ts
  - id: openwiki-source-6d80a02487569bcbb7938d4d
    resource: repo://backend/src/services/audit-templates.ts
  - id: openwiki-source-229fce9104304d0c4fb4e622
    resource: repo://backend/src/services/config.service.ts
  - id: openwiki-source-a490be0187e4955ac4723d56
    resource: repo://backend/src/services/ledger.service.ts
  - id: openwiki-source-a5b0a6a0621820e46d5063cb
    resource: repo://backend/src/services/trip-command.service.ts
  - id: openwiki-source-bff18f46bfb5377ed63bc431
    resource: repo://backend/src/services/trip-mutations.service.ts
  - id: openwiki-source-c6551d55e5de7de94ecf32ca
    resource: repo://backend/src/services/trip-queries.service.ts
  - id: openwiki-source-bfcd93e3d979ef79dcea9cab
    resource: repo://backend/src/services/trip-status-machine.service.ts
  - id: openwiki-source-6c6d42fc83b5f5c4bfd3a3f9
    resource: repo://backend/src/services/trip.service.ts
  - id: openwiki-source-f7fd2de8ba29e8649d8291fb
    resource: repo://shared/src/calculations/tripTotals.ts
  - id: openwiki-source-f66d3b21b3dac1c048076752
    resource: repo://shared/src/index.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO's backend separates transport (thin route handlers in `backend/src/routes/`)
from business logic (the `backend/src/services/` directory). Services own
database writes, calculations (delegating to `@tingting/shared/calculations`),
audit side-effects, and the `ledger.service` integration.

## Trip lifecycle

The trip state machine lives in `backend/src/services/trip-status-machine.service.ts`.
The canonical transition table is:

| From | To | Trigger | Authorization | Side-effect |
|---|---|---|---|---|
| (none) | `CREATED` | `createTripCommand` | office staff with `casbinAuthz('trips')` | `audit_logs` row + notifications event |
| `CREATED` or `COMPLETED` | `IN_TRANSIT` | `dispatchTripCommand` | ADMIN or MANAGER only | `audit_logs` row + truck busy-truck advisory-lock guard |
| `IN_TRANSIT` | `COMPLETED` | `completeTripCommand` | office | pre-departure → actuals copy + `audit_logs` |
| `COMPLETED` | `LOCKED` | `lockTripCommand` | office | `LedgerService.postTripLock` posts revenue/salary/fuel/carrier |
| `LOCKED` | `COMPLETED` | `unlockTripCommand` | ADMIN or MANAGER only | `UNLOCK_REVERSAL` ledger rows |
| `*` | `CANCELED` | `cancelTripCommand` | office | no ledger rows |
| `LOCKED` | reassign | `reassignTripCommand` | office | `audit_logs` row + ledger adjustment |
| `*` | adjust dates | `updateDepartureDateCommand` | office | `audit_logs` row |

`transitionTripStatus(tripId, targetStatus, userId, userRole, ...)`
(`trip-status-machine.service.ts:12`) is the single entry point. The
implementation:

- Wraps everything in a `db.transaction(...)`.
- Acquires `lockTripMutation(tx, tripId)` (Drizzle advisory lock keyed on the
  trip id) so two concurrent transitions on the same trip are serialized.
- Idempotent short-circuit when `currentStatus === targetStatus`.
- Enforces role + transition matrix; e.g. only ADMIN/MANAGER may dispatch, with
  the comment noting that ACCOUNTANT's trip-write permission is for financial
  fields only and shouldn't move the lifecycle forward.
- Guards against double-dispatch by also taking an advisory lock keyed on the
  truck id, then `SELECT ... FROM trips WHERE truck_id = ? AND status =
  'IN_TRANSIT' AND deleted_at IS NULL`. The error message never leaks the
  numeric id — it shows the trip code or a generic phrase.

The trip-command services (`trip-command.service.ts`,
`trip-mutations.service.ts`, `trip-queries.service.ts`) split by intent:

- `trip-command.service.ts` — `createTripCommand`, `copyTripCommand`,
  `dispatchTripCommand`, `completeTripCommand`, `lockTripCommand`,
  `unlockTripCommand`, `cancelTripCommand`. Each invalidates report caches
  on success.
- `trip-mutations.service.ts` — figure updates (pre-departure, actuals,
  bulk-figures, reassign, departure-date, adjustments).
- `trip-queries.service.ts` — read models (list, detail, summaries, fuel-voucher
  HTML/XLSX).

## Fuel and road allowance

`shared/calculations/tripTotals` exports `computeTripTotals` plus
`computeRoadAllowance` and `computeDriverRoadAllowance`. The three fuel modes
are honored at write-time by `trip.service.ts` and surfaced through the API:

- **`AUTO`** — fuel cost = Σ(leg.distance × norm / 100) × unitPrice. Norms come
  from the route record's `fuel_empty_norm` / `fuel_loaded_norm`.
- **`FLAT_RATE`** — driver-supplied liters × unitPrice (used when the actual
  fill-up happened but leg math is unavailable).
- **`MOUNTAIN`** — the route record carries a `mountainAllowance` amount that
  is added on top of the base fuel cost (see [shared/calculations.md](../shared/calculations.md)).

All three modes can carry a **supplement** (tiền phụ cấp nhiên liệu) added on
top. Per-purchase pricing (commit 1384245) lets each `trip_fuel_allocations`
row carry an explicit `unitPrice` so multi-supplier / multi-price invoices roll
up correctly.

## Ledger integration

`trip.service.ts` does **not** write to the ledger directly. The flow is:

1. `lockTripCommand` succeeds.
2. `transitionTripStatus` reaches the `LOCKED` branch.
3. `LedgerService.postTripLock(tx, trip)` writes revenue, salary, fuel,
   external carrier, and ancillary rows (see [backend/ledger.md](ledger.md)).
4. `unlockTripCommand` calls `LedgerService.postTripLock` with an
   `UNLOCK_REVERSAL` txn-type to invert those rows.

## Catalog CRUD factory

`backend/src/services/config.service.ts` exports `createCrudRouter()` which
generates the standard `GET / GET :id / POST / PUT / DELETE` for any catalog
table (customers, trucks, trailers, routes, cargo types, pricing tables, road
allowances, fuel config, fuel price history, penalty reasons, company info,
suppliers, expense categories, container types, seal types, ports, forwarder
expense types, debit-note templates, etc.). This is the single reason
catalog-domain endpoints stay tiny — new catalogs just need a Zod schema and a
table reference.

## Audit templates

`backend/src/services/audit.service.ts` plus `backend/src/services/audit-templates.ts`
translate `(method, path, payload, user)` into Vietnamese-language audit
messages. `initAuditService()` is awaited at boot
(`backend/src/index.ts:40`) before the server starts accepting requests so the
audit pipeline is always warm.

The middleware invariant: **one audit row per mutating API call**, regardless
of how many tables the handler touches. Audit rows for trip status transitions
are produced by `auditLogMiddleware` on the corresponding endpoint
(`POST /dispatch`, `/lock`, `/cancel`) using full Subject + Verb + Natural Key
sentences — see the comment in
`trip-status-machine.service.ts:21`.

## Other notable services

- **`storage.service.ts`** — disk + (future) cloud upload; writes a
  `storage_key` (Date.now()-based, includes extension) used by
  `photo-authz.service.ts` for exact-key lookup.
- **`fuel-voucher.service.ts`** — generates the HTML and XLSX fuel vouchers
  the driver/office use to reconcile per-trip fuel consumption.
- **`reporting.service.ts`** + **`pnl.service.ts`** — read models.
- **`receivables.service.ts`** + **`payables.service.ts`** + **`debtOffset.service.ts`** — see [backend/ledger.md](ledger.md).
- **`profit-distribution.service.ts`** + **`commission.service.ts`** — payout
  calculations using `cap_table_history` and `truck_cap_table`.
- **`salary-period.service.ts`** — period lifecycle (`DRAFT → CONFIRMED`) and
  per-driver payroll rollup.
- **`notification.service.ts`** + **`push.service.ts`** — see [backend/admin-and-agent.md](admin-and-agent.md).
- **Agent / chat / GPS / OCR** — see [backend/admin-and-agent.md](admin-and-agent.md).
- **`forwarder-trip-query.service.ts`** + **`driver.service.ts`** — portal
  read models filtered by caller.
- **`company-info.service.ts`** + **`app-settings.service.ts`** — single-row
  configs (company header, LLM provider, push rules).

## Service shape rules

- Services accept primitives or shared types (`Trip`, `Driver`, `LedgerPostRequest`).
  They do not take `req`/`res` — the route layer maps HTTP into service calls.
- All multi-table writes run inside `db.transaction(...)`.
- Multi-entity ledger posts acquire `pg_advisory_xact_lock` per entity, sorted
  by entity-type key, to avoid deadlock.
- Calculations delegate to `@tingting/shared`; the math is the same on both
  backend and frontend.

## Where to read more

- API surface — [backend/api-routes.md](api-routes.md)
- Schema — [backend/database-schema.md](database-schema.md)
- Ledger details — [backend/ledger.md](ledger.md)
- Calculation math — [shared/calculations.md](../shared/calculations.md)
- RBAC — [backend/auth-rbac.md](auth-rbac.md)
- Subsystem services — [backend/admin-and-agent.md](admin-and-agent.md)
