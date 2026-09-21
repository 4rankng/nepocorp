---
type: financial-domain
title: Ledger & Financial Domain
description: Immutable ledger, running-balance semantics, adjustment-as-new-row pattern, receivables/payables, P&L, salary periods, profit distribution, and the penalty-as-salary-deduction rule.
tags: [ledger, receivables, payables, pnl, salary, profit-distribution, penalty]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-4fe4e6e78cb7058e51f7cfa3
    resource: repo://backend/src/routes/financial/penalties.routes.ts
  - id: openwiki-source-488ae2ed09004d9ccff9d8ed
    resource: repo://backend/src/routes/trips.ts
  - id: openwiki-source-ee71c439b5e3791cf6365578
    resource: repo://backend/src/services/billingDocument.service.ts
  - id: openwiki-source-4c23140d2c9fb416956dea50
    resource: repo://backend/src/services/debtOffset.service.ts
  - id: openwiki-source-a490be0187e4955ac4723d56
    resource: repo://backend/src/services/ledger.service.ts
  - id: openwiki-source-46f7138c171061951153155c
    resource: repo://backend/src/services/payables.service.ts
  - id: openwiki-source-18b7360c40cc73753a1e693d
    resource: repo://backend/src/services/pnl.service.ts
  - id: openwiki-source-7a681f65d96f26a1017bbac2
    resource: repo://backend/src/services/profit-distribution.service.ts
  - id: openwiki-source-28b3137f1366e135661d12c6
    resource: repo://backend/src/services/receivables.service.ts
  - id: openwiki-source-646ad8ac7cd3a6ff79080c7f
    resource: repo://backend/src/services/reporting.service.ts
  - id: openwiki-source-3d129a25e9265ff74c4b7551
    resource: repo://backend/src/services/salary-period.service.ts
  - id: openwiki-source-9c12d0cb39dad54eff68c786
    resource: repo://shared/src/calculations/fifoAging.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO's financial domain is built on a small set of disciplined rules. Once you
internalize them, every read model (receivables, payables, P&L, salary,
distribution) is a projection of the same immutable ledger.

## Immutable ledger

`backend/src/services/ledger.service.ts` owns a single ledger table
(`backend/src/db/schema.ts:405`) that **never** supports `UPDATE` or `DELETE`.
Corrections are inserted as new rows via the trip adjustments endpoint
(`POST /api/trips/:id/adjustment`, `backend/src/routes/trips.ts:374`) which
posts a new `ADJUSTMENT` row referencing the original `txn_type` + `txn_id`.

`LedgerPostRequest` (`ledger.service.ts:39`) accepts `txnType`, `txnId`,
`receiptId`, `entityType`, `entityId`, `debit`, `credit`, optional `note` and
`timestamp`. The implementation:

1. Acquires `pg_advisory_xact_lock(entityTypeKey, entityId)` so concurrent
   postings on the same entity are serialized inside the transaction.
2. Reads the latest row by `(entityType, entityId)` (the hot-path index pair
   `ledger_entity_entity_idx` / `ledger_entity_entity_id_idx`).
3. Computes `newBalance = prevBalance + credit − debit` (stored as
   `numeric(15, 0)` for exact VND).
4. Inserts the new row.

The `LedgerService.lockEntities(...)` helper sorts multiple targets by type-key
before acquiring advisory locks — this is the deadlock-prevention pattern for
multi-entity postings such as a trip lock that writes to both the customer and
the driver.

## Entity types

`LedgerPostRequest.entityType` is one of `CUSTOMER | DRIVER | VENDOR | FORWARDER
| CARRIER`. The mapping to numeric keys for `pg_advisory_xact_lock` lives in
`LedgerService.getEntityTypeKey` (`ledger.service.ts:55`). Adding a new entity
type requires (a) a new enum branch, (b) a new advisory-lock key, and (c) any
read model that surfaces the new entity.

## Why no FK on entity_id

`ledger.entityType` is `varchar(50)`, `ledger.entityId` is `integer`, and there
is **no foreign key**. The schema comment is explicit: the ledger must outlive
the entity. A deleted driver still has ledger history, and the running-balance
lookup `getBalance(entityType, entityId)` is the hottest query in the system.

## Trip-lock flow

`LedgerService.postTripLock(tx, trip, opts)` (`ledger.service.ts:249`) is the
canonical "trip locked → ledger writes" seam. It is invoked by the trip-status
machine when a trip transitions to `LOCKED`:

1. **Ancillary fees** — validate (strict by default). Empty/null-counterparty
   buy-sides are rejected or skipped depending on `strict`.
2. **Lock advisory locks** for all entities the post will touch, sorted
   globally by entity-type key.
3. **Post ledger rows** — `TRIP_REVENUE` on the customer, `DRIVER_SALARY` on
   the driver, `FUEL_EXPENSE` on the supplier (or split per allocation when
   multi-supplier / multi-price), and `EXTERNAL_CARRIER_COST` when
   `carrierType === 'EXTERNAL'`.
4. **Per-purchase fuel pricing** — when any `fuelAllocations[]` row carries an
   explicit `unitPrice`, each credit-priced row is priced independently
   (`Math.round(liters × rowPrice)`). Otherwise the legacy algorithm absorbs
   rounding remainder into the last row so the Σ of credit-row costs equals
   `totalFuelCost` exactly.

`UNLOCK_REVERSAL` posts the inverse set so an unlocked trip can be re-edited
and re-locked without leaving stale revenue/expense rows.

## Penalties: deduction, not expense

Penalties are **NOT company expenses** — they are salary deductions from the
driver, surfaced as **Other Income** in P&L. The flow:

1. `POST /api/financial/penalties` (`backend/src/routes/financial/penalties.routes.ts`)
   creates a `penalties` row referencing `penalty_reasons`.
2. The status machine flows `ACTIVE → CANCELED` (cancellation posts a
   reversal).
3. When the matching salary period is closed, the penalty is deducted from the
   driver's salary in `salary_period.service.ts` and a `PENALTY` ledger row
   posts on the driver entity (credit balance owed = salary reduction).
4. P&L reports `penalties_collected` as **other income** for the period, not
   as a cost.

## Receivables & payables

These are **read models** over the ledger, not separate ledgers:

- `backend/src/services/receivables.service.ts` — customer-facing debt aging,
  statements, FIFO allocation. Reuses `computeFifoAging` from
  `@tingting/shared/calculations/fifoAging`.
- `backend/src/services/payables.service.ts` — supplier / forwarder / driver
  payable balances with the same running-balance pattern.
- `backend/src/services/receivables-report.service.ts` — projection views for
  the customer-debt-projection page and similar reports.
- `backend/src/services/debtOffset.service.ts` — inter-entity offset entries
  (e.g. a customer's credit note offset against outstanding payables).

All read models respect the immutable-ledger rule: corrections come from new
rows, never in-place updates.

## Billing documents (debit notes & payment statements)

`billing_documents` and `billing_document_lines` plus `debit_note_templates`
compose the debit-note (Giấy báo nợ) workflow. `document_type` is
forward-compatible; today only `DEBIT_NOTE` is supported by the resolver.
`PAYMENT_STATEMENT` is a pure presentation snapshot. `DEBIT_NOTE` edits
reconcile amount overrides, ad-hoc rows, and exclusions through append-only
customer-ledger adjustments — never direct updates.

## P&L

`backend/src/services/pnl.service.ts` rolls up ledger rows by period and by
truck, exposing per-truck profitability (`PnlTruck`), maintenance cost
breakdown (`PnlMaintenanceItem`), and per-trip detail (`PnlTripDetail`,
`PnlReport`). `backend/src/services/reporting.service.ts` is the broader
read-model aggregator (dashboard stats, aging summaries, statements).

## Salary periods

`backend/src/services/salary-period.service.ts` and `salary_confirmations`
maintain the period lifecycle (`DRAFT → CONFIRMED`). The driver salary
calculation is shared with the frontend in
`@tingting/shared/calculations/tripDriverSalary` (`computeTripDriverSalary`,
`resolveTripDriverSalary`, `TRIP_SALARY_WORK_DAYS`). `driver_work_days` records
each driver's `workDayStatus` per day (`TRIP_DAY | STANDBY | PERSONAL_LEAVE |
WEEKLY_OFF`) for the salary rollup.

## Profit distribution

`cap_table_history` records ownership %, `truck_cap_table.participant` holds the
per-truck equity splits, `distributions` records actual payouts, and
`management_fees` holds the management-fee table. `commission.service.ts`
honors per-driver commission rules on top of the base salary.

The `truck_cap_table.participant` column is `TEXT + CHECK` (not `pgEnum`) so
edits don't require a pgEnum migration — documented inline in
`backend/src/db/schema.ts:570`.

## Recompute triggers

Because the ledger is the source of truth, any change to upstream entities
(`trips`, `customers`, `suppliers`) that affects a posted row must be followed
by a `postAdjustment` row. Service callers wrap these in transactions so the
ledger and the source row move together.

## Where to read more

- Schema details — [backend/database-schema.md](database-schema.md)
- Service layer — [backend/services.md](services.md)
- Calculation helpers (FIFO aging, salary math) — [shared/calculations.md](../shared/calculations.md)
- Authoritative Vietnamese flows — `docs/flows/01-TRIP_LIFECYCLE.md`,
  `docs/flows/04-CONG_NO_VA_THANH_TOAN.md`, `docs/flows/14-LUONG_VA_CHAM_CONG.md`
