# PENDING TASKS — E2E Trip Lifecycle Epic

> Source: `docs/implementation-plan/trip-lifecycle-epic.md`
> Each task is sized to be implemented in a single focused session without needing the full epic in context.
> **Before starting a task:** read the linked epic section(s) for the contract. **After finishing:** check the box and update notes.

## Legend
- **Size:** S (~½ session, 1–2 files) · M (1 session, 2–4 files) · L (split if it grows)
- **Pkg:** SHARED = `@nepocorp/shared` · BE = backend · FE = frontend · DB/OPS = infra
- **Dep:** task IDs that must land first.

---

## Phase 1 — Foundation: Shared math + Backend schema

### Shared package (pure, no I/O — fully unit-testable in isolation)

- [ ] **T1.1 — `round2dp` helper** · `S` · SHARED · dep: none
  - File: `shared/src/calculations/round.ts`. Export `round2dp(n)` using the `Number(Math.round(parseFloat(n+'e2'))+'e-2')` form. Re-export from `shared/src/index.ts`.
  - Epic ref: §3.4 Rounding Rule.
  - Done when: function exists, exported, used by T1.2.

- [ ] **T1.2 — `computeTripTotals` pure function** · `M` · SHARED · dep: T1.1
  - File: `shared/src/calculations/tripTotals.ts`. Implement exactly the `ComputeTripTotalsInput`/`Output` contract.
  - Cover all 3 modes + supplement modifier per §9 (AUTO standard, AUTO mountain, FLAT_RATE).
  - Enforce the 5 contract rules in §3.4 (mode precedence, mountain null fallback, `legCalculations=0` in non-AUTO, road-allowance clamp ≥0, round-then-sum).
  - Done when: signature matches epic, no I/O, all rates passed as args.

- [ ] **T1.3 — `computeTripTotals` exhaustive unit tests** · `M` · SHARED · dep: T1.2
  - File: `shared/src/calculations/tripTotals.test.ts`. Cases per §8.1: AUTO standard, AUTO mountain, AUTO mountain w/ null allowance (fallback), FLAT_RATE, FLAT_RATE on mountain (FLAT wins), supplement in all modes, negative road allowance → 0, `round2dp` `x.xx5` boundaries, 0 legs, 0 revenue.
  - Done when: tests pass, every §9.4 truth-table row asserted.

- [ ] **T1.4 — Money Zod `.transform(Number)` boundary** · `S` · SHARED · dep: none
  - File: `shared/src/schemas/index.ts`. Add a reusable `numericMoney`/`numericDecimal` Zod helper that parses Postgres `numeric` strings → `number`. Apply to all monetary + quantity fields on trip schemas.
  - Epic ref: §3.4 Money Representation (the string boundary).
  - Done when: a string like `"1500000"` transforms to number `1500000`; concatenation bug impossible downstream.

- [ ] **T1.5 — Conditional `fuelSupplementReason` rule** · `S` · SHARED · dep: T1.4
  - File: `shared/src/schemas/index.ts`. Add `.superRefine`/`.refine`: `fuelSupplementReason` required when `fuelSupplementLiters > 0`. Shared by FE + BE.
  - Epic ref: §3.4 rule 5.
  - Done when: schema rejects supplement>0 with empty reason; unit test added.

### Backend DB schema + migration

- [ ] **T1.6 — Extend `trips` table: identity + concurrency cols** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. Add `tripCode varchar`, `version integer default 1`, `createdBy integer FK→users`.
  - Epic ref: §4.1.
  - Done when: columns added (no migration yet — batch in T1.11).

- [ ] **T1.7 — Extend `trips` table: 7 rate-snapshot cols** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. Add `roadAllowanceBaseApplied`, `fuelLoadedNormApplied`, `fuelEmptyNormApplied`, `fuelFixedAllowanceApplied`, `tollPerStationApplied`, `returnCargoBonusApplied`, `fuelPriceApplied` (verify which already exist).
  - Epic ref: §4.1 Rate Snapshots.
  - Done when: all 7 snapshot columns present with correct numeric precisions.

- [ ] **T1.8 — `road_config` single-row table** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts` + seed in `backend/src/seed-data/`. Columns: `tollPerStation` (55000), `returnCargoBonus` (300000), timestamps.
  - Epic ref: §4.6.

- [ ] **T1.9 — `trip_code_counters` table** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. Columns: `yearMonth varchar PK`, `counter integer`.
  - Epic ref: §4.9.

- [ ] **T1.10 — `trip_photos` table + drop `photoUrls` jsonb** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. New table per §4.3 (`type` enum CONTAINER/SEAL/OTHER, `storageKey`, `uploadedBy`, `uploadedAt`). Remove `photoUrls` jsonb from `trips`. Add `effectiveDate` to `pricing_tables` (§4.4).
  - Epic ref: §4.3, §4.4.

- [ ] **T1.11 — Generate + run Drizzle migration** · `S` · BE · dep: T1.6–T1.10
  - Run `pnpm db:generate && pnpm db:migrate`. Review generated SQL for data-loss on `photoUrls` drop / `tripCode` backfill.
  - Done when: migration applies cleanly to a fresh dev DB; seed still runs.

- [ ] **T1.12 — `StorageService` interface + `LocalStorageService`** · `M` · BE · dep: none
  - File: `backend/src/services/storage.service.ts`. Methods `upload(file,key)`, `getSignedUrl(key)`, `delete(key)`. Local impl writes to `UPLOAD_DIR` (config). Store relative keys (`trips/{id}/seal-{uuid}.jpg`).
  - Epic ref: §3.4 File Storage.

---

## Phase 2 — Backend API

### Trip service core

- [ ] **T2.1 — Refactor `trip.service.ts` to use shared `computeTripTotals`** · `M` · BE · dep: T1.2, T1.11
  - File: `backend/src/services/trip.service.ts`. Replace inline fuel/cost math with the shared function. No behavior drift.
  - Epic ref: §10 Phase 2; §3.4.
  - Done when: service imports `@nepocorp/shared` math; old inline math deleted.

- [ ] **T2.2 — Rate snapshotting in createTrip + updateTripFigures** · `M` · BE · dep: T2.1, T1.7, T1.8
  - Snapshot all 7 columns from `fuel_config`, `road_allowances`, `road_config` at save time.
  - Epic ref: §4.1, §6.1.
  - Done when: changing a global rate after save does not change the trip's applied values (verified manually; integ test in T4.4).

- [ ] **T2.3 — Atomic `tripCode` generation** · `S` · BE · dep: T1.9, T2.1
  - In `createTrip` txn: `INSERT ... ON CONFLICT (year_month) DO UPDATE SET counter = counter+1 RETURNING counter`. Format `TRP-{yearMonth}-{counter:0000}`.
  - Epic ref: §4.9.
  - Done when: concurrent creates produce gap-free unique codes.

- [ ] **T2.4 — Pricing lookup on create (timezone-pinned)** · `S` · BE · dep: T1.10, T2.1
  - On create, seed `revenue` from `pricing_tables` via `MAX(effectiveDate) WHERE effectiveDate <= (departureDate AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`. Fallback `0`.
  - Epic ref: §4.4.

- [ ] **T2.5 — `version` optimistic concurrency on `PUT /api/trips/:id`** · `S` · BE · dep: T1.6, T2.1
  - Replace `updatedAt` check. `UPDATE ... WHERE version = ?`; 0 rows → 409. Increment `version` on success. Reject if status LOCKED/CANCELED.
  - Epic ref: §5 Concurrency Guards, §6.1.

### Lock procedure + ledger

- [ ] **T2.6 — `LedgerService` with sorted advisory locks** · `M` · BE · dep: T1.11
  - File: `backend/src/services/ledger.service.ts`. Immutable insert helper. Acquire `pg_advisory_xact_lock` sorted by `(entityType, entityId)` to prevent deadlocks. Maintains running `balance` per sign conventions (§4.8).
  - Epic ref: §4.8.

- [ ] **T2.7 — Lock Procedure on `PATCH /api/trips/:id/status` (→LOCKED)** · `M` · BE · dep: T2.6
  - Implement §5 Lock Procedure exactly: (1) read-first idempotency → already LOCKED returns 200 no double-post; (2) zero-revenue 422 unless `confirmZeroRevenue`; (3) conditional `WHERE status='COMPLETED'` → 0 rows = 409; (4) sorted advisory locks + CUSTOMER debit + DRIVER credit; (5) audit; (6) one txn commit.
  - Epic ref: §5 Lock Procedure.
  - Done when: status flip + ledger + audit are atomic (partial commit impossible).

- [ ] **T2.8 — Full state-transition matrix on status PATCH** · `M` · BE · dep: T2.5
  - Implement all rows of §5 matrix with role checks: CREATED→IN_TRANSIT, IN_TRANSIT→COMPLETED (photo gate, see T2.13), COMPLETED↔IN_TRANSIT, →CANCELED (zero financials, no ledger). Conditional `WHERE status=?` guard on every transition.
  - Epic ref: §5.

- [ ] **T2.9 — `POST /api/ledger/adjustments`** · `S` · BE · dep: T2.6
  - File: `backend/src/routes/financial.ts`. Compensating ADJUSTMENT row, mandatory `note`, Manager/Accountant only.
  - Epic ref: §6.2.

### Upload + photos

- [ ] **T2.10 — Secure `POST /api/upload`** · `M` · BE · dep: T1.12
  - File: `backend/src/routes/upload.ts`. Magic-byte validation, MIME allowlist (jpeg/png/webp/heic), HEIC→JPEG transcode, EXIF GPS strip, 15MB limit, server downscale, UUID filenames. Manager/Accountant only. Returns storage key.
  - Epic ref: §3.4 Upload Security.

- [ ] **T2.11 — `GET /api/photos/:id` authenticated download** · `S` · BE · dep: T1.10, T1.12
  - Role + trip-ownership check before serving via StorageService. No `express.static` on upload dir.
  - Epic ref: §6.4, §3.4.

- [ ] **T2.12 — Persist trip_photos rows on upload** · `S` · BE · dep: T2.10, T1.10
  - Wire upload → insert `trip_photos` row (`type`, `storageKey`, `uploadedBy`).

- [ ] **T2.13 — Photo completion requirement gate** · `S` · BE · dep: T2.8, T2.12
  - Enforce §4.3 at data layer (count query) for IN_TRANSIT→COMPLETED: ≥1 photo general; ≥1 CONTAINER AND ≥1 SEAL when `cargo_types.requiresPhotos = true`.
  - Epic ref: §4.3.

### Read endpoints + driver isolation + audit

- [ ] **T2.14 — `GET /api/catalogs/bootstrap`** · `S` · BE · dep: T1.11
  - Returns all active reference data; excludes `pricing_tables`. All authenticated roles.
  - Epic ref: §6.4, §3.4 Caching.

- [ ] **T2.15 — `GET /api/pricing?customerId&routeId`** · `S` · BE · dep: T2.4
  - On-demand effective-date pricing lookup. Manager/Accountant ONLY (driver must never reach it).
  - Epic ref: §6.4, §4.4.

- [ ] **T2.16 — Driver endpoints with allowlisted DTO** · `M` · BE · dep: T1.11
  - File: `backend/src/routes/driver.ts`. `GET /api/driver/trips` + `/:id`. Build DTO from scratch — never SELECT revenue/grossProfit/totalCost/totalFuelCost/driverSalary. Ownership filter `driverId === currentUser.driverId`.
  - Epic ref: §6.3, §7.1.

- [ ] **T2.17 — Expand synchronous in-transaction audit logging** · `M` · BE · dep: T2.7
  - File: `backend/src/services/audit.service.ts` + `middleware/audit.ts`. Cover all mutations, store before/after diff (not full row), Vietnamese messages, commit in same txn as the change.
  - Epic ref: §4.10.

---

## Phase 3 — Frontend

- [ ] **T3.1 — Install + configure TanStack Query & Table** · `S` · FE · dep: none
  - Add providers in `frontend/src/main.tsx`. QueryClient with sane defaults.
  - Epic ref: §7.3, §3.4.

- [ ] **T3.2 — `tripClient.ts` typed fetch wrappers** · `S` · FE · dep: T3.1
  - File: `frontend/src/api/tripClient.ts`. Typed wrappers for `/api/trips` (create/put/status) using shared types.
  - Epic ref: §3.3.

- [ ] **T3.3 — `useCatalogs` hook + invalidation** · `S` · FE · dep: T3.1, T2.14
  - File: `frontend/src/hooks/useCatalogs.ts`. `staleTime: 5min`. Invalidate `['catalogs']` after any catalog mutation.
  - Epic ref: §3.4 Caching, §7.3.

- [ ] **T3.4 — `round2dp` FE re-export + verify shared import path** · `S` · FE · dep: T1.1
  - File: `frontend/src/lib/round.ts` (or import shared directly). Ensure FE uses the SAME math as BE.
  - Epic ref: §3.3.

- [ ] **T3.5 — `TripLegFields` sub-component** · `S` · FE · dep: T3.2
  - File: `frontend/src/components/TripForm/TripLegFields.tsx`. `useFieldArray` for legs (origin/destination/km/loadingType).
  - Epic ref: §3.3, §7.2.

- [ ] **T3.6 — `FuelConfigurator` sub-component** · `S` · FE · dep: T3.5
  - File: `TripForm/FuelConfigurator.tsx`. Mode toggle AUTO/FLAT_RATE(KHOÁN), override + supplement + reason fields.

- [ ] **T3.7 — `AllowanceConfigurator` sub-component** · `S` · FE · dep: T3.5
  - File: `TripForm/AllowanceConfigurator.tsx`. Tolls discount/addition/stations, return-cargo toggle, driver salary, revenue override.

- [ ] **T3.8 — `TotalsPanel` wired to shared `computeTripTotals`** · `M` · FE · dep: T3.6, T3.7, T1.2
  - File: `TripForm/TotalsPanel.tsx`. React-hook-form `watch()` → call shared math with snapshotted rates → live totals on `number`.
  - Epic ref: §7.2.

- [ ] **T3.9 — `PhotoUploader` sub-component** · `S` · FE · dep: T2.10
  - File: `TripForm/PhotoUploader.tsx`. Upload to `/api/upload`, show CONTAINER/SEAL slots, surface tea-cargo requirement.

- [ ] **T3.10 — Complete `TripCreatePage`** · `M` · FE · dep: T3.3, T3.8, T2.15
  - Catalog dropdowns + on-demand pricing fetch (`GET /api/pricing`) on customer/route select.
  - Epic ref: §7.2.

- [ ] **T3.11 — Complete `TripEditPage` (accountant config)** · `M` · FE · dep: T3.8
  - Full config form assembling the TripForm sub-components.

- [ ] **T3.12 — Complete `TripListPage` with TanStack Table** · `M` · FE · dep: T3.1
  - Headless table, status pills, profit indicators ▲green/▼red (icon + color for colorblind).
  - Epic ref: §7.3.

- [ ] **T3.13 — Driver mobile pages (read-only, allowlisted)** · `M` · FE · dep: T2.16
  - `DriverTripsPage.tsx` + `DriverTripDetailPage.tsx`. Mobile-first. Render ONLY allowlisted fields.
  - Epic ref: §7.1.

- [ ] **T3.14 — 409 optimistic-concurrency error UX** · `S` · FE · dep: T3.2, T2.5
  - On PUT 409 → "Có người khác đã cập nhật chuyến này. Tải lại?"

- [ ] **T3.15 — 422 zero-revenue lock confirmation dialog** · `S` · FE · dep: T3.2, T2.7
  - On lock 422 → "Doanh thu bằng 0. Xác nhận chốt?" → re-send with `confirmZeroRevenue: true`.

---

## Phase 4 — Hardening (tests + infra)

- [ ] **T4.1 — Integ: ledger balance integrity (parallel locks, same customer)** · `M` · BE · dep: T2.7
  - Epic ref: §8.2.
- [ ] **T4.2 — Integ: deadlock prevention (two trips sharing entities)** · `M` · BE · dep: T2.7
- [ ] **T4.3 — Integ: lock atomicity (forced mid-txn failure → full rollback)** · `M` · BE · dep: T2.7
- [ ] **T4.4 — Integ: rate snapshotting (all 7 cols)** · `S` · BE · dep: T2.2
- [ ] **T4.5 — Integ: optimistic concurrency (two PUTs same version → one 409)** · `S` · BE · dep: T2.5
- [ ] **T4.6 — Integ: driver isolation (no sensitive cols in response)** · `S` · BE · dep: T2.16
- [ ] **T4.7 — State-machine transition unit tests** · `M` · BE · dep: T2.8
  - Legal/illegal transitions, idempotent lock 200, zero-revenue 422, read-first ordering. Epic ref: §8.1.
- [ ] **T4.8 — DB: revoke UPDATE/DELETE on `ledger` at role level** · `S` · DB · dep: T1.11
  - Epic ref: §4.8.
- [ ] **T4.9 — OPS: persistent `UPLOAD_DIR` volume + nightly backup cron** · `S` · OPS · dep: T1.12
- [ ] **T4.10 — OPS: periodic ledger reconciliation** · `M` · OPS · dep: T2.6
  - Per-entity balance recompute + trip↔ledger consistency. Epic ref: §4.8.

---

## Suggested execution order (critical path)

1. **Shared math first** (T1.1 → T1.2 → T1.3) — unblocks BE service refactor and FE TotalsPanel in parallel.
2. **Schema + migration** (T1.4, T1.5, T1.6–T1.11, T1.12) — unblocks all of Phase 2.
3. **BE trip core** (T2.1 → T2.2 → T2.3 → T2.4 → T2.5).
4. **BE lock/ledger** (T2.6 → T2.7 → T2.8 → T2.9) — highest-risk, test alongside (T4.1–T4.3, T4.7).
5. **BE upload + reads** (T2.10–T2.17) — parallelizable.
6. **FE** (T3.x) — starts once T3.1/T2.14 land; TotalsPanel waits on T1.2.
7. **Hardening** (T4.x) — interleave with the feature it covers, not all at the end.

## Parallelization notes
- Shared math (T1.1–T1.3) and DB schema (T1.6–T1.11) are independent → two agents.
- FE scaffolding (T3.1, T3.2, T3.12) can start before BE endpoints exist using mock/typed clients.
- Driver track (T2.16 + T3.13 + T4.6) is a self-contained vertical slice.
