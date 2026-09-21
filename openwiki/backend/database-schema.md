---
type: database-schema
title: Database Schema (Drizzle)
description: Drizzle ORM schema overview — pgEnum usage, table groups, the loosely-coupled entity_type/entity_id ledger pattern, indexes, and the migration workflow.
tags: [database, drizzle, schema, ledger, enums, migrations]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-5027f8d2099f89169cc95e7d
    resource: repo://backend/drizzle.config.ts
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO uses Drizzle ORM (`postgres.js` driver) against PostgreSQL. The schema is
defined in a single file `backend/src/db/schema.ts` (≈1,300 lines) and migrations
live under `backend/src/db/migrations/`.

## pgEnum declarations

All status/type fields are typed with `pgEnum` at the top of `schema.ts:23-48`:

- `trip_status` — `CREATED, IN_TRANSIT, COMPLETED, LOCKED, CANCELED`
- `fuel_mode` — `AUTO, FLAT_RATE` (MOUNTAIN allowance comes from the route record, not this enum)
- `loading_type` — `HANG, VO`
- `role` — `ADMIN, MANAGER, ACCOUNTANT, DRIVER, FORWARDER`
- `txn_type` — `TRIP_REVENUE, PAYMENT_RECEIVED, PENALTY, MANAGEMENT_FEE, ADJUSTMENT, DRIVER_SALARY, VENDOR_EXPENSE, VENDOR_PAYMENT, FORWARDER_ADVANCE, FORWARDER_SETTLEMENT, EXTERNAL_CARRIER_COST, FUEL_EXPENSE, UNLOCK_REVERSAL, COMMISSION, DRIVER_PAYOUT, SERVICE_FEE`
- `trailer_type` — `20FT, 40FT`
- `truck_status` / `trailer_status` / `driver_status` / `customer_status`
- `penalty_status`, `trip_photo_type`, `vehicle_component`, `vehicle_schedule_kind/status`
- `advance_request_status`, `advance_settlement_status`
- `notification_type` (event-class enum, see `notification.service.ts`)
- `work_day_status` — `TRIP_DAY, STANDBY, PERSONAL_LEAVE, WEEKLY_OFF`
- `salary_confirmation_status` — `DRAFT, CONFIRMED`

`forwarder_expense_type` was removed in favor of a config table
(`forwarder_expense_types`) — the comment in `schema.ts:38` documents the swap.

## Table groups

| Group | Tables | Notes |
|---|---|---|
| Users + roles | `users`, `drivers` | `users.role` is the auth role; `drivers` is the driver profile row |
| Fleet | `trucks`, `trailers`, `tires`, `tire_positions`, `vehicle_schedules`, `vehicle_alerts` (read model) | Tires are first-class entities with install/dispose/transfer lifecycle |
| Catalogs | `customers`, `routes`, `cargo_types`, `pricing_tables`, `road_allowances`, `fuel_config`, `fuel_price_history`, `penalty_reasons`, `company_info`, `management_fees`, `road_config`, `app_settings` | CRUD via `createCrudRouter()` |
| Suppliers/expenses | `suppliers`, `expense_categories`, `expenses`, `expense_photos`, `payables*` | Office-side expense entry |
| Trips | `trips`, `trip_legs`, `trip_fuel_allocations`, `trip_containers`, `trip_container_seals`, `trip_instructions`, `trip_expenses`, `trip_expense_photos`, `trip_expense_completion_scopes`, `trip_photos` | Each trip has many legs, allocations, containers, expenses |
| Forwarder flow | `forwarder_expense_types`, `advance_requests`, `advance_settlements`, `advance_settlement_requests`, `settlement_expenses` | FORWARDER-scoped |
| Ledger + receivables | `ledger`, `debt_offsets`, `billing_documents`, `billing_document_lines`, `debit_note_templates` | See [backend/ledger.md](ledger.md) |
| Distribution + salary | `cap_table_history`, `truck_cap_table`, `distributions`, `salary_periods`, `salary_confirmations`, `driver_work_days` | Profit distribution + payroll |
| Audit + infra | `audit_logs`, `trip_code_counters` | One audit row per mutating API call |
| GPS | GPS read-model tables + settings (Bách Khoa credentials) | Polled by `gps/capture.service.ts` |
| Agent/chatbot | `agent_*` tables (conversations, turns, tool calls, metrics, FAQ entries, embeddings) | Backed by `agentSocket` and `metrics` |
| Notifications | `notifications`, push subscriptions | `notification.service.ts` |

## The ledger pattern: loosely-coupled entity references

`ledger` (`schema.ts:405`) is the canonical example of the project's
loosely-coupled entity reference convention:

```ts
entityType: varchar('entity_type', { length: 50 }).notNull(),
entityId:   integer('entity_id').notNull(),
```

There is **no foreign key**. `entityType` is one of `DRIVER | CLIENT | VENDOR |
FORWARDER | …` (a string), and `entityId` points to the matching table by
convention. This is deliberate: the ledger must outlive the entity (a deleted
driver still has ledger history), and the running-balance lookup
`getBalance(entityType, entityId)` is the hottest query path.

Indexes that support the hot path:

```ts
index('ledger_entity_entity_idx').on(table.entityType, table.entityId),
index('ledger_entity_entity_id_idx').on(table.entityType, table.entityId, table.id),
index('ledger_entity_txn_timestamp_idx').on(table.entityType, table.txnType, table.timestamp),
uniqueIndex('ledger_forwarder_settlement_once_idx')
  .on(table.txnType, table.txnId, table.entityType, table.entityId)
  .where(sql`${table.txnType} = 'FORWARDER_SETTLEMENT'`),
```

The balance column is `numeric(15, 0)` — VND precision is preserved (no
fractional đồng) and reads are exact.

## Other notable patterns

- **`uniqueIndex(...).where(sql\`...\`)`** — used for partial uniqueness
  (e.g. only enforce forwarder-settlement-once for the FORWARDER_SETTLEMENT txn
  type).
- **TEXT + CHECK over pgEnum** — `truck_cap_table.participant` uses `TEXT` with
  a `CHECK` rather than a pgEnum, because participant names are user-editable
  in the cap table and pgEnum migrations are expensive. The comment in
  `schema.ts:570` documents the rationale.
- **`vector(1536)` column** — used for FAQ embeddings (pgvector extension). See
  `schema.ts:2` (imports) and `vectorColumn1536` helper.
- **Soft "isDefault" flag** — `salary_periods.isDefault` is enforced by the
  transactional route handler, not a partial unique index (precedent noted in
  `schema.ts` near the salary periods table).

## Migration workflow

`drizzle.config.ts` points at `src/db/schema.ts` with `dialect: 'postgresql'`
and `DATABASE_URL` fallback `postgres://postgres:postgres@localhost:5440/tingting`.
Migrations are emitted to `backend/drizzle/`.

```bash
# from backend/
pnpm db:generate   # drizzle-kit generate — diff schema → new migration file
pnpm db:migrate    # drizzle-kit migrate — apply pending migrations
pnpm db:studio     # drizzle-kit studio — GUI at the printed port
```

Production migrations live in `deploy/` and run through a wrapper that excludes
`*.revert.sql` files (see commit 45fbad3 and [deployment.md](../deployment.md)).

## Where to read more

- Ledger semantics and immutability — [backend/ledger.md](ledger.md)
- Service layer that touches the schema — [backend/services.md](services.md)
- Conventions — [development/conventions.md](../development/conventions.md)
- Authoritative db docs — `docs/codebase-summary.md` (Vietnamese)
