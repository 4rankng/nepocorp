---
type: database-schema
title: Database Schema (Drizzle)
description: Drizzle ORM schema organization — pgEnums mirroring shared enums, table groups, the FK-free ledger reference pattern, pgvector FAQ embeddings, soft-delete conventions, and the dev/prod migration workflow.
tags: [database, drizzle, schema, ledger, enums, migrations, pgvector, postgres]
sources:
  - id: openwiki-source-5027f8d2099f89169cc95e7d
    resource: repo://backend/drizzle.config.ts
  - id: openwiki-source-5441d669e68c735bf877e34d
    resource: repo://backend/drizzle/0014_steady_dust.sql
  - id: openwiki-source-130cdccfe6c7006e29d0a354
    resource: repo://backend/drizzle/0023_fast_the_captain.sql
  - id: openwiki-source-5ef7e101f145c040457d9746
    resource: repo://backend/drizzle/0026_absurd_sphinx.sql
  - id: openwiki-source-ab507bef30071eaad257b92b
    resource: repo://backend/drizzle/0062_billing_documents.sql
  - id: openwiki-source-e950317d923e9724fadfdb37
    resource: repo://backend/drizzle/0084_hard_delete_tires.sql
  - id: openwiki-source-d6e39bd04dd62ee5f2d60fd9
    resource: repo://backend/drizzle/0104_faq_knowledge_base.sql
  - id: openwiki-source-57311abd417ebfaca3f7bbbd
    resource: repo://backend/drizzle/0104_parallel_guardian.sql
  - id: openwiki-source-805c3726080ef2417b7faccf
    resource: repo://backend/drizzle/0116_reclassify_two_point_road_allowance.sql
  - id: openwiki-source-5196b24cbd7bbed9223c0716
    resource: repo://backend/drizzle/0117_fuel_allocation_unit_price_multi_row.sql
  - id: openwiki-source-08404a2bb0d653848da425ec
    resource: repo://backend/drizzle/meta/_journal.json
  - id: openwiki-source-66cbd5bba5561e9a939541db
    resource: repo://backend/src/db/index.ts
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-833cafcf2b0c8db4a21dde31
    resource: repo://backend/src/middleware/audit.ts
  - id: openwiki-source-0a70f06e2ffabc0894af05af
    resource: repo://backend/src/routes/config.ts
  - id: openwiki-source-d6833da0d394bee4af614319
    resource: repo://backend/src/services/audit-query.service.ts
  - id: openwiki-source-3bf87ebeab31f4c3f08dd1d8
    resource: repo://backend/src/services/company-info.service.ts
  - id: openwiki-source-a490be0187e4955ac4723d56
    resource: repo://backend/src/services/ledger.service.ts
  - id: openwiki-source-eca5b5f6c04b01a2bf4277cc
    resource: repo://deploy/docker-compose.prod.yml
  - id: openwiki-source-0c106052b3286e779bed85e7
    resource: repo://docker-compose.dev.yml
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
generated: { by: "openwiki/0.5.2", at: "2026-09-24T15:30:51.512Z" }
verified:
  - by: openwiki/0.5.2
    at: 2026-09-24T15:30:51.512Z
---

NEPO uses Drizzle ORM (`postgres.js` driver) against PostgreSQL 16. The entire
schema is defined in one file, `backend/src/db/schema.ts` (~1,300 lines), which
`backend/src/db/index.ts` turns into a Drizzle instance:

```ts
export const client = postgres(config.databaseUrl);
export const db = drizzle(client, { schema });
```

Migrations live under `backend/drizzle/` — one `NNNN_name.sql` per migration
plus a `meta/` directory holding the drizzle-kit journal and snapshots. There
is no `backend/src/db/migrations/` directory.

## pgEnum declarations mirror shared enums 1:1

All status/type columns are typed with `pgEnum` at the top of `schema.ts:23-48`
(`salary_confirmation_status` is the one exception, declared at `schema.ts:620`
beside its table), and the string values are kept identical to the TypeScript
enums in `shared/src/constants/index.ts` (`TripStatus`, `FuelMode`,
`LoadingType`, `Role`, `TxnType`, `TrailerType`, `TruckStatus`, …). Changing a
value means changing both sides plus a migration:

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

`forwarder_expense_type` is the cautionary example of why the project now
prefers config tables for user-extensible lists: migration `0014` created the
pgEnum, `0023` created the `forwarder_expense_types` config table and recast
`trip_expenses.expense_type` to `varchar(50)`, and `0026` dropped the pgEnum
entirely. The comment at `schema.ts:38-39` documents the swap — expense types
are now free-growing codes validated against the config table instead of a
database enum that requires a migration per new value.

## Table groups

| Group | Tables | Notes |
|---|---|---|
| Users + roles | `users`, `drivers` | `users.role` is the auth role; `drivers` is the driver profile row (`createCrudRouter(..., { disableDelete: true })` — driver deletion is blocked per spec) |
| Fleet | `trucks`, `trailers`, `tires`, `tire_positions`, `vehicle_schedules` | Tires are first-class entities with install/remove/dispose/transfer lifecycle endpoints. "Vehicle alerts" are **not** a table — they are computed from `trucks.next_inspection_date`/`insurance_expiry_date`/`last_oil_service_date` at read time |
| Catalogs | `customers`, `routes`, `cargo_types`, `pricing_tables`, `road_allowances`, `fuel_config`, `fuel_price_history`, `penalty_reasons`, `management_fees`, `road_config`, `app_settings` | CRUD via `createCrudRouter()` in `routes/config.ts`. `company_info` is **not** a table — it is key/value rows in `app_settings` under the `company.*` prefix, assembled by `company-info.service.ts` |
| Suppliers/expenses | `suppliers`, `expense_categories`, `expenses`, `expense_photos` | Office-side expense entry; payables are *derived* from the ledger by `aging.service.ts`, not stored |
| Trips | `trips`, `trip_legs`, `trip_fuel_allocations`, `trip_containers`, `trip_container_seals`, `trip_instructions`, `trip_expenses`, `trip_expense_photos`, `trip_expense_completion_scopes`, `trip_photos` | Each trip has many legs, allocations, containers, expenses |
| Forwarder flow | `forwarder_expense_types`, `container_types`, `seal_types`, `ports`, `advance_requests`, `advance_settlements`, `advance_settlement_requests`, `settlement_expenses` | FORWARDER-scoped; expense types are config rows |
| Ledger + receivables | `ledger`, `debt_offsets`, `billing_documents`, `billing_document_lines`, `debit_note_templates` | See [backend/ledger.md](ledger.md) |
| Distribution + salary | `cap_table_history`, `truck_cap_table`, `distributions`, `salary_periods`, `salary_confirmations`, `driver_work_days` | Profit distribution + payroll |
| Audit + infra | `audit_logs`, `trip_code_counters` | One audit row per mutating API call (POST/PUT/PATCH/DELETE) |
| GPS | `route_polylines`, `trip_gps_tracks`, `vehicle_last_positions` + settings (Bách Khoa credentials) | Polled by `gps/capture.service.ts`; sole source of driven routes |
| Agent/chatbot | `agent_conversations`, `agent_messages`, `agent_turn_metrics`, `faq_entries`, `knowledge_chunks` | Backed by `agentSocket`; metrics feed the chatbot dashboard |
| Notifications | `notifications`, `push_subscriptions` | `notification.service.ts` + Web Push (410/404 cleanup) |

## The ledger pattern: loosely-coupled entity references

`ledger` (`schema.ts:405`) is the canonical example of the project's
loosely-coupled entity reference convention:

```ts
entityType: varchar('entity_type', { length: 50 }).notNull(),
entityId:   integer('entity_id').notNull(),
```

There is **no foreign key**. `entityType` is a string — the service layer
narrows it to `CUSTOMER | DRIVER | VENDOR | FORWARDER | CARRIER`
(`ledger.service.ts:43`) — and `entityId` points to the matching table by
convention (external carriers live in `customers`, vendors in `suppliers`).
This is deliberate: the ledger must outlive the entity (a deleted driver still
has ledger history), and the running-balance lookup
`getBalance(entityType, entityId)` is the hottest query path. The same
polymorphic pattern appears in `billing_documents.entityType/entityId` and in
`expenses.truckId` + `vehicle_component` (no FK because Postgres cannot enforce
a polymorphic reference; integrity is maintained by the service paths).

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
fractional đồng) and reads are exact. Nearly all money columns in the schema
share this `numeric(15, 0)` shape.

## Schema-wide conventions

- **`deletedAt` soft delete** — most business tables carry a nullable
  `deleted_at` timestamp; queries filter `deletedAt IS NULL` instead of
  deleting rows. Uniqueness under soft delete is enforced with *partial*
  indexes (`customers_active_name_tax_code_uniq_idx` only applies
  `WHERE deleted_at IS NULL`). The deliberate exceptions are append-only /
  infra tables (`ledger`, `audit_logs`, `agent_*`, `trip_fuel_allocations`)
  and **tires**: migration `0084_hard_delete_tires.sql` purges soft-deleted
  tire rows and the `/fleet/tires` CRUD router passes `deleteMode: 'hard'`,
  because "deleted tire" is user cleanup that must free the unique serial
  number (business history uses `DISPOSED` instead).
- **`users.fullName` feeds audit labels** — the audit middleware sets
  `actorName` from `req.user.fullName ?? req.user.username`
  (`middleware/audit.ts:167`) and `audit_logs.actor_name` stores it, so audit
  lines read "Quản lý Lê Văn Tài khóa chuyến" instead of an email. Read paths
  fall back via `COALESCE(actor_name, users.full_name, users.username)`.
- **`uniqueIndex(...).where(sql\`...\`)`** — partial uniqueness where a plain
  unique index would be wrong: forwarder-settlement-once only for the
  `FORWARDER_SETTLEMENT` txn type, one active `DEBIT_NOTE` per entity+period
  (`billing_documents_active_period_unique`), one completion scope per
  container.
- **TEXT + CHECK over pgEnum for user-editable vocabularies** —
  `truck_cap_table.role` is `TEXT` with `truck_cap_role_check IN ('INVESTOR','DRIVER')`
  (`schema.ts:572-578`), avoiding enum-migration cost and the name collision
  with the user-role pgEnum. Same philosophy behind the
  `forwarder_expense_types` config table.
- **Single-default enforced in code, not SQL** — `salary_periods.isDefault`
  and `debit_note_templates.isDefault` are plain booleans; the
  "exactly one default" invariant is maintained transactionally by the route
  handlers (precedent noted beside the debit-note templates table and
  migration 0076).
- **Snapshot columns for reproducibility** — trips freeze the rates applied at
  entry (`fuelPriceApplied`, `roadAllowanceBaseApplied`, `tollPerStationApplied`, …)
  and `billing_documents.debitNoteTemplateSnapshot` freezes the template as
  untyped jsonb so historical documents re-render identically after the
  template is edited or deleted.

## pgvector: `vectorColumn1536` and the FAQ embeddings

Drizzle does not know pgvector, so `schema.ts:15-20` declares a `customType`
whose SQL type is `vector(1536)` and exports it as `vectorColumn1536`. The JS
representation is the pgvector string literal `'[0.1,0.2,...]'`. Two tables use
it: `faq_entries.embedding` (chatbot pre-LLM fast lane) and
`knowledge_chunks.embedding` (doc-RAG over CONTEXT.md/ADRs).

Because the column type is opaque to Drizzle, **all vector reads and writes go
through raw SQL**: `faq-fast-lane.ts` runs `db.execute(sql\`... 1 -
(embedding <=> ${lit}::vector) ...\`)` over the HNSW index, and
`db/backfill-faq-embeddings.ts` writes vectors with
`UPDATE faq_entries SET embedding = ${lit}::vector ...`. Embeddings are
produced by OpenRouter `text-embedding-3-small` (1536 dims) and are `NULL`
until the backfill script runs — the semantic stage filters NULLs out and
abstains, so the fast lane degrades to exact + rule matching.

This is why both database images are `pgvector/pgvector:pg16` (upstream
postgres:16 + the `vector` extension preinstalled):

- dev: `docker-compose.dev.yml` switched from `postgres:16-alpine` because the
  stock alpine image lacks the extension;
- prod: `deploy/docker-compose.prod.yml` uses the same image.

Migration `0104_faq_knowledge_base.sql` runs `CREATE EXTENSION IF NOT EXISTS
vector;` and creates the partial HNSW cosine index
(`USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL AND
is_active = TRUE`); `0107` repeats the pattern for `knowledge_chunks`. 1536
dims sit within the native HNSW 2000-dim cap, so no halfvec cast is needed.

## Migration workflow (dev)

`drizzle.config.ts` points at `./src/db/schema.ts`, emits to `./drizzle`, uses
`dialect: 'postgresql'`, and falls back to
`postgres://postgres:postgres@localhost:5440/tingting`. The backend package
scripts and the root Makefile targets wrap the same drizzle-kit commands:

```bash
# from backend/
pnpm db:generate   # drizzle-kit generate — diff schema → new migration file
pnpm db:migrate    # drizzle-kit migrate — apply pending migrations (journal order)
pnpm db:studio     # drizzle-kit studio — GUI at the printed port
pnpm seed          # tsx src/seed.ts

# from repo root
make generate      # same as db:generate
make migrate       # same as db:migrate
make seed          # same as seed
make studio        # same as db:studio
make setup         # infra + generate + migrate + seed (first-time)
make dev           # starts compose, then generate + migrate, then backend/frontend (no seed)
```

Two file populations coexist in `backend/drizzle/`:

1. **drizzle-kit generated files** (`0000_flat_doctor_spectrum.sql`,
   `0050_worried_gladiator.sql`, …) — random two-word names, always recorded in
   `meta/_journal.json`, which `drizzle-kit migrate` follows.
2. **Hand-written, descriptively named files** (`0062_billing_documents.sql`,
   `0083_agent_turn_metrics.sql`, `0117_fuel_allocation_unit_price_multi_row.sql`,
   …) — some are registered in the journal, some (like
   `0104_faq_knowledge_base.sql`) were applied outside it. `drizzle-kit
   migrate` only runs the journaled ones; `make prod-migrate` runs **all** of
   them in filename order, so every environment converges either way.

### Numbering collisions and gaps are normal — do not renumber

The sequence is *not* strictly unique and not contiguous. Several numbers
carry **two distinct forward migrations** (`0050_commission_txn_type.sql` +
`0050_worried_gladiator.sql`, `0051_daily_iceman.sql` + `0051_tires.sql`,
`0062_billing_documents.sql` + `0062_backfill_completed_trip_ledger.sql`,
`0104_faq_knowledge_base.sql` + `0104_parallel_guardian.sql`,
`0106_faq_operational_expansion.sql` + `0106_onboarding_events.sql`), others
pair a migration with a same-numbered `*.revert.sql` rollback file
(`0048_cute_wong.sql` + `0048_trip_instructions.revert.sql`), and some numbers
are simply skipped (`0060`, `0089`–`0093` — the journal jumps `0088` → `0094`).

**Never renumber by hand.** `make prod-migrate` processes files in plain
filename (lexicographic) order, and `drizzle-kit migrate` follows the journal —
both orderings already account for the existing collisions. Renumbering would
desync environments that already applied the old names.

A related gotcha is recorded in `0104_parallel_guardian.sql`: the FAQ table was
applied manually (outside the journal), so the next `drizzle-kit generate`
emitted a duplicate `CREATE TABLE faq_entries` that had to be removed by hand.
If you apply SQL manually, remember the snapshot doesn't know about it — check
whether `drizzle-kit generate` proposes to recreate an existing object before
committing a generated file.

## Production migrations

```mermaid
flowchart TD
    S["backend/src/db/schema.ts — schema source of truth"] --> G["pnpm db:generate — drizzle-kit diff"]
    G --> M["backend/drizzle/NNNN_*.sql + meta/_journal.json"]
    M --> D["Dev: make migrate or make dev — drizzle-kit, journal order"]
    M --> E["Deploy: backend containers run npx drizzle-kit migrate"]
    M --> P["Prod: make prod-migrate — filename order, skips *.revert.sql"]
    P --> X["psql -v ON_ERROR_STOP=1 --single-transaction on nepocorp-postgres-1"]
    M --> R["NNNN_*.revert.sql — dev rollback pairs, never run on prod"]
```

*How a schema change reaches each environment; only `make prod-migrate`
bypasses the drizzle journal.*

`make prod-migrate` (`Makefile:180-198`) is the canonical prod path. It loops
over `$(shell ls backend/drizzle/*.sql | grep -v '\.revert\.sql')` and for each
file:

1. `scp`s it to `root@nepo.tingting.vip:/tmp/`;
2. `docker cp`s it into the `nepocorp-postgres-1` container;
3. runs `psql -U nepocorp -d nepocorp -v ON_ERROR_STOP=1
   --single-transaction -f /tmp/<basename>` — a failure rolls the whole file
   back, and `|| echo skipped (already applied)` makes re-runs safe;
4. removes the `/tmp` copy, then restarts `nepocorp-backend-1` at the end.

The `grep -v '\.revert\.sql'` exclusion is the safety rule: `*.revert.sql`
files are dev-rollback pairs and must never execute against prod. Two other
paths apply migrations through the *journal* (`npx drizzle-kit migrate` inside
the backend container): the root `demo-backend` target and
`backend/Makefile deploy`. `make prod-migrate-file FILE=0084_hard_delete_tires.sql`
applies a single file through the same scp/psql pipeline.

## Recent structural changes to know about

- **`0117_fuel_allocation_unit_price_multi_row.sql`** — drops the
  `trip_fuel_allocations_supplier_once_idx` / `_cash_once_idx` partial unique
  indexes (which had limited a trip to one supplier purchase and one cash
  purchase) and adds a nullable `unit_price numeric(12, 2)`. A trip can now
  record multiple fuel purchases; `NULL` means legacy/derive-at-read — the row
  is priced with the trip's effective price (`fuelActualUnitPrice ??
  fuelPriceApplied`). `ledger.service.ts` prices rows with an explicit
  `unitPrice` at that price and the rest at the trip base price. The table's
  CHECK constraints still hold per row: `liters > 0`, `CREDIT` rows must carry
  a `supplierId`, `CASH` rows must have none.
- **`0116_reclassify_two_point_road_allowance.sql`** — a data migration that
  folds `two_point_delivery_bonus` into `total_road_allowance` for OWN,
  non-canceled trips whose total still equals the old formula; it is
  idempotent by construction (re-classified rows no longer match) and leaves
  `total_cost`/`gross_profit` untouched because it moves money between
  components rather than adding cost.
- **`0084_hard_delete_tires.sql`** — see the soft-delete convention above.
- **`0062_billing_documents.sql`** — introduces `billing_documents` +
  `billing_document_lines` (debit notes and payment statements, with a frozen
  template snapshot and a separate `ledger_adjustment_amount` so repeated
  saves stay idempotent). See [backend/ledger.md](ledger.md).
- **`0100_forwarder_expense_workflow.sql`** — forwarder expense approvals;
  `0104` the FAQ knowledge base; `0118_remove_onboarding.sql` drops the
  onboarding tables/types cleanly without touching unrelated objects.

## Where to read more

- Ledger semantics, immutability, and posting flow — [backend/ledger.md](ledger.md)
- Service layer that touches the schema — [backend/services.md](services.md)
- Deployment topology and the prod/demo split — [deployment.md](../deployment.md)
- Dev environment and ports — [development/setup.md](../development/setup.md)
