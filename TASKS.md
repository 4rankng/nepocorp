# NEPO Logistics: Development Tasks

## Context

The NEPO logistics system has a comprehensive backend and frontend with most core features implemented: trip lifecycle management, financial ledger, configuration management, penalty system, profit distribution, and audit logging. This document tracks remaining work in two tracks:

1. **Track 1 — E2E Trip Lifecycle Epic:** detailed phased implementation plan
2. **Track 2 — Feature Backlog:** product user stories not covered by the epic

**Key files:**
- Backend routes: `backend/src/routes/config.ts`, `backend/src/routes/trips.ts`
- Backend services: `backend/src/services/trip.service.ts`
- Frontend pages: `frontend/src/pages/*.tsx`
- Shared types/schemas: `shared/src/schemas/index.ts`, `shared/src/constants/index.ts`

---

# Track 1: E2E Trip Lifecycle Epic

> Source: `docs/implementation-plan/trip-lifecycle-epic.md`
> Each task is sized to be implemented in a single focused session.
> **Before starting a task:** read the linked epic section(s) for the contract. **After finishing:** check the box.

## Legend
- **Size:** S (~½ session, 1–2 files) · M (1 session, 2–4 files) · L (split if it grows)
- **Pkg:** SHARED = `@nepocorp/shared` · BE = backend · FE = frontend · DB/OPS = infra
- **Dep:** task IDs that must land first.

---

## Phase 1 — Foundation: Shared math + Backend schema

### Shared package (pure, no I/O — fully unit-testable in isolation)

- [x] **T1.1 — `round2dp` helper** · `S` · SHARED · dep: none
  - File: `shared/src/calculations/round.ts`. Export `round2dp(n)` using the `Number(Math.round(parseFloat(n+'e2'))+'e-2')` form. Re-export from `shared/src/index.ts`.
  - Epic ref: §3.4 Rounding Rule.
  - Done when: function exists, exported, used by T1.2.

- [x] **T1.2 — `computeTripTotals` pure function** · `M` · SHARED · dep: T1.1
  - File: `shared/src/calculations/tripTotals.ts`. Implement exactly the `ComputeTripTotalsInput`/`Output` contract.
  - Cover all 3 modes + supplement modifier per §9 (AUTO standard, AUTO mountain, FLAT_RATE).
  - Enforce the 5 contract rules in §3.4 (mode precedence, mountain null fallback, `legCalculations=0` in non-AUTO, road-allowance clamp ≥0, round-then-sum).
  - Done when: signature matches epic, no I/O, all rates passed as args.

- [x] **T1.3 — `computeTripTotals` exhaustive unit tests** · `M` · SHARED · dep: T1.2
  - File: `shared/src/calculations/tripTotals.test.ts`. Cases per §8.1: AUTO standard, AUTO mountain, AUTO mountain w/ null allowance (fallback), FLAT_RATE, FLAT_RATE on mountain (FLAT wins), supplement in all modes, negative road allowance → 0, `round2dp` `x.xx5` boundaries, 0 legs, 0 revenue.
  - Done when: tests pass, every §9.4 truth-table row asserted.

- [x] **T1.4 — Money Zod `.transform(Number)` boundary** · `S` · SHARED · dep: none
  - File: `shared/src/schemas/index.ts`. Add a reusable `numericMoney`/`numericDecimal` Zod helper that parses Postgres `numeric` strings → `number`. Apply to all monetary + quantity fields on trip schemas.
  - Epic ref: §3.4 Money Representation (the string boundary).
  - Done when: a string like `"1500000"` transforms to number `1500000`; concatenation bug impossible downstream.

- [x] **T1.5 — Conditional `fuelSupplementReason` rule** · `S` · SHARED · dep: T1.4
  - File: `shared/src/schemas/index.ts`. Add `.superRefine`/`.refine`: `fuelSupplementReason` required when `fuelSupplementLiters > 0`. Shared by FE + BE.
  - Epic ref: §3.4 rule 5.
  - Done when: schema rejects supplement>0 with empty reason; unit test added.

### Backend DB schema + migration

- [x] **T1.6 — Extend `trips` table: identity + concurrency cols** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. Add `tripCode varchar`, `version integer default 1`, `createdBy integer FK→users`.
  - Epic ref: §4.1.
  - Done when: columns added (no migration yet — batch in T1.11).

- [x] **T1.7 — Extend `trips` table: 7 rate-snapshot cols** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. Add `roadAllowanceBaseApplied`, `fuelLoadedNormApplied`, `fuelEmptyNormApplied`, `fuelFixedAllowanceApplied`, `tollPerStationApplied`, `returnCargoBonusApplied`, `fuelPriceApplied` (verify which already exist).
  - Epic ref: §4.1 Rate Snapshots.
  - Done when: all 7 snapshot columns present with correct numeric precisions.

- [x] **T1.8 — `road_config` single-row table** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts` + seed in `backend/src/seed-data/`. Columns: `tollPerStation` (55000), `returnCargoBonus` (300000), timestamps.
  - Epic ref: §4.6.

- [x] **T1.9 — `trip_code_counters` table** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. Columns: `yearMonth varchar PK`, `counter integer`.
  - Epic ref: §4.9.

- [x] **T1.10 — `trip_photos` table + drop `photoUrls` jsonb** · `S` · BE · dep: none
  - File: `backend/src/db/schema.ts`. New table per §4.3 (`type` enum CONTAINER/SEAL/OTHER, `storageKey`, `uploadedBy`, `uploadedAt`). Remove `photoUrls` jsonb from `trips`. Add `effectiveDate` to `pricing_tables` (§4.4).
  - Epic ref: §4.3, §4.4.

- [x] **T1.11 — Generate + run Drizzle migration** · `S` · BE · dep: T1.6–T1.10
  - Run `pnpm db:generate && pnpm db:migrate`. Review generated SQL for data-loss on `photoUrls` drop / `tripCode` backfill.
  - Done when: migration applies cleanly to a fresh dev DB; seed still runs.

- [x] **T1.12 — `StorageService` interface + `LocalStorageService`** · `M` · BE · dep: none
  - File: `backend/src/services/storage.service.ts`. Methods `upload(file,key)`, `getSignedUrl(key)`, `delete(key)`. Local impl writes to `UPLOAD_DIR` (config). Store relative keys (`trips/{id}/seal-{uuid}.jpg`).
  - Epic ref: §3.4 File Storage.

---

## Phase 2 — Backend API

### Trip service core

- [x] **T2.1 — Refactor `trip.service.ts` to use shared `computeTripTotals`** · `M` · BE · dep: T1.2, T1.11
  - File: `backend/src/services/trip.service.ts`. Replace inline fuel/cost math with the shared function. No behavior drift.
  - Epic ref: §10 Phase 2; §3.4.
  - Done when: service imports `@nepocorp/shared` math; old inline math deleted.

- [x] **T2.2 — Rate snapshotting in createTrip + updateTripFigures** · `M` · BE · dep: T2.1, T1.7, T1.8
  - Snapshot all 7 columns from `fuel_config`, `road_allowances`, `road_config` at save time.
  - Epic ref: §4.1, §6.1.
  - Done when: changing a global rate after save does not change the trip's applied values (verified manually; integ test in T4.4).

- [x] **T2.3 — Atomic `tripCode` generation** · `S` · BE · dep: T1.9, T2.1
  - In `createTrip` txn: `INSERT ... ON CONFLICT (year_month) DO UPDATE SET counter = counter+1 RETURNING counter`. Format `TRP-{yearMonth}-{counter:0000}`.
  - Epic ref: §4.9.
  - Done when: concurrent creates produce gap-free unique codes.

- [x] **T2.4 — Pricing lookup on create (timezone-pinned)** · `S` · BE · dep: T1.10, T2.1
  - On create, seed `revenue` from `pricing_tables` via `MAX(effectiveDate) WHERE effectiveDate <= (departureDate AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`. Fallback `0`.
  - Epic ref: §4.4.

- [x] **T2.5 — `version` optimistic concurrency on `PUT /api/trips/:id`** · `S` · BE · dep: T1.6, T2.1
  - Replace `updatedAt` check. `UPDATE ... WHERE version = ?`; 0 rows → 409. Increment `version` on success. Reject if status LOCKED/CANCELED.
  - Epic ref: §5 Concurrency Guards, §6.1.

### Lock procedure + ledger

- [x] **T2.6 — `LedgerService` with sorted advisory locks** · `M` · BE · dep: T1.11
  - File: `backend/src/services/ledger.service.ts`. Immutable insert helper. Acquire `pg_advisory_xact_lock` sorted by `(entityType, entityId)` to prevent deadlocks. Maintains running `balance` per sign conventions (§4.8).
  - Epic ref: §4.8.

- [x] **T2.7 — Lock Procedure on `PATCH /api/trips/:id/status` (→LOCKED)** · `M` · BE · dep: T2.6
  - Implement §5 Lock Procedure exactly: (1) read-first idempotency → already LOCKED returns 200 no double-post; (2) zero-revenue 422 unless `confirmZeroRevenue`; (3) conditional `WHERE status='COMPLETED'` → 0 rows = 409; (4) sorted advisory locks + CUSTOMER debit + DRIVER credit; (5) audit; (6) one txn commit.
  - Epic ref: §5 Lock Procedure.
  - Done when: status flip + ledger + audit are atomic (partial commit impossible).

- [x] **T2.8 — Full state-transition matrix on status PATCH** · `M` · BE · dep: T2.5
  - Implement all rows of §5 matrix with role checks: CREATED→IN_TRANSIT, IN_TRANSIT→COMPLETED (photo gate, see T2.13), COMPLETED↔IN_TRANSIT, →CANCELED (zero financials, no ledger). Conditional `WHERE status=?` guard on every transition.
  - Epic ref: §5.

- [x] **T2.9 — `POST /api/ledger/adjustments`** · `S` · BE · dep: T2.6
  - File: `backend/src/routes/financial.ts`. Compensating ADJUSTMENT row, mandatory `note`, Manager/Accountant only.
  - Epic ref: §6.2.

### Upload + photos

- [x] **T2.10 — Secure `POST /api/upload`** · `M` · BE · dep: T1.12
  - File: `backend/src/routes/upload.ts`. Magic-byte validation, MIME allowlist (jpeg/png/webp/heic), HEIC→JPEG transcode, EXIF GPS strip, 15MB limit, server downscale, UUID filenames. Manager/Accountant only. Returns storage key.
  - Epic ref: §3.4 Upload Security.

- [x] **T2.11 — `GET /api/photos/:id` authenticated download** · `S` · BE · dep: T1.10, T1.12
  - Role + trip-ownership check before serving via StorageService. No `express.static` on upload dir.
  - Epic ref: §6.4, §3.4.

- [x] **T2.12 — Persist trip_photos rows on upload** · `S` · BE · dep: T2.10, T1.10
  - Wire upload → insert `trip_photos` row (`type`, `storageKey`, `uploadedBy`).

- [x] **T2.13 — Photo completion requirement gate** · `S` · BE · dep: T2.8, T2.12
  - Enforce §4.3 at data layer (count query) for IN_TRANSIT→COMPLETED: ≥1 photo general; ≥1 CONTAINER AND ≥1 SEAL when `cargo_types.requiresPhotos = true`.
  - Epic ref: §4.3.

### Read endpoints + driver isolation + audit

- [x] **T2.14 — `GET /api/catalogs/bootstrap`** · `S` · BE · dep: T1.11
  - Returns all active reference data; excludes `pricing_tables`. All authenticated roles.
  - Epic ref: §6.4, §3.4 Caching.

- [x] **T2.15 — `GET /api/pricing?customerId&routeId`** · `S` · BE · dep: T2.4
  - On-demand effective-date pricing lookup. Manager/Accountant ONLY (driver must never reach it).
  - Epic ref: §6.4, §4.4.

- [x] **T2.16 — Driver endpoints with allowlisted DTO** · `M` · BE · dep: T1.11
  - File: `backend/src/routes/driver.ts`. `GET /api/driver/trips` + `/:id`. Build DTO from scratch — never SELECT revenue/grossProfit/totalCost/totalFuelCost/driverSalary. Ownership filter `driverId === currentUser.driverId`.
  - Epic ref: §6.3, §7.1. Acceptance criteria: driver sees fuel allocation with breakdown by leg (§US-4.3), earnings summary (§US-4.2), trip cards with schedule (§US-4.1).

- [x] **T2.17 — Expand synchronous in-transaction audit logging** · `M` · BE · dep: T2.7
  - File: `backend/src/services/audit.service.ts` + `middleware/audit.ts`. Cover all mutations, store before/after diff (not full row), Vietnamese messages, commit in same txn as the change.
  - Epic ref: §4.10.

---

## Phase 3 — Frontend

- [x] **T3.1 — Install + configure TanStack Query & Table** · `S` · FE · dep: none
  - Add providers in `frontend/src/main.tsx`. QueryClient with sane defaults.
  - Epic ref: §7.3, §3.4.

- [x] **T3.2 — `tripClient.ts` typed fetch wrappers** · `S` · FE · dep: T3.1
  - File: `frontend/src/api/tripClient.ts`. Typed wrappers for `/api/trips` (create/put/status) using shared types.
  - Epic ref: §3.3.

- [x] **T3.3 — `useCatalogs` hook + invalidation** · `S` · FE · dep: T3.1, T2.14
  - File: `frontend/src/hooks/useCatalogs.ts`. `staleTime: 5min`. Invalidate `['catalogs']` after any catalog mutation.
  - Epic ref: §3.4 Caching, §7.3.

- [x] **T3.4 — `round2dp` FE re-export + verify shared import path** · `S` · FE · dep: T1.1
  - File: `frontend/src/lib/round.ts` (or import shared directly). Ensure FE uses the SAME math as BE.
  - Epic ref: §3.3.

- [x] **T3.5 — `TripLegFields` sub-component** · `S` · FE · dep: T3.2
  - File: `frontend/src/components/TripForm/TripLegFields.tsx`. `useFieldArray` for legs (origin/destination/km/loadingType).
  - Epic ref: §3.3, §7.2.

- [x] **T3.6 — `FuelConfigurator` sub-component** · `S` · FE · dep: T3.5
  - File: `TripForm/FuelConfigurator.tsx`. Mode toggle AUTO/FLAT_RATE(KHOÁN), override + supplement + reason fields.

- [x] **T3.7 — `AllowanceConfigurator` sub-component** · `S` · FE · dep: T3.5
  - File: `TripForm/AllowanceConfigurator.tsx`. Tolls discount/addition/stations, return-cargo toggle, driver salary, revenue override.

- [x] **T3.8 — `TotalsPanel` wired to shared `computeTripTotals`** · `M` · FE · dep: T3.6, T3.7, T1.2
  - File: `TripForm/TotalsPanel.tsx`. React-hook-form `watch()` → call shared math with snapshotted rates → live totals on `number`.
  - Epic ref: §7.2. Acceptance criteria: show calculated liters per leg with norm breakdown (§US-1.1.1), visual distinction for AUTO vs FLAT_RATE (§US-1.1.2), mountain route indicator (§US-1.1.3), supplement liters separately (§US-1.1.4).

- [x] **T3.9 — `PhotoUploader` sub-component** · `S` · FE · dep: T2.10
  - File: `TripForm/PhotoUploader.tsx`. Upload to `/api/upload`, show CONTAINER/SEAL slots, surface tea-cargo requirement.

- [x] **T3.10 — Complete `TripCreatePage`** · `M` · FE · dep: T3.3, T3.8, T2.15
  - Catalog dropdowns + on-demand pricing fetch (`GET /api/pricing`) on customer/route select.
  - Epic ref: §7.2. Acceptance criteria: show "Giá tự động: X VNĐ" badge when auto-populated (§US-1.2.1), confirmation dialog on revenue override (§US-1.2.2).

- [x] **T3.11 — Complete `TripEditPage` (accountant config)** · `M` · FE · dep: T3.8
  - Full config form assembling the TripForm sub-components.

- [x] **T3.12 — Complete `TripListPage` with TanStack Table** · `M` · FE · dep: T3.1
  - Headless table, status pills, profit indicators ▲green/▼red (icon + color for colorblind).
  - Epic ref: §7.3.

- [x] **T3.13 — Driver mobile pages (read-only, allowlisted)** · `M` · FE · dep: T2.16
  - `DriverTripsPage.tsx` + `DriverTripDetailPage.tsx`. Mobile-first. Render ONLY allowlisted fields.
  - Epic ref: §7.1. Acceptance criteria: mobile-first card layout with tabs "Sắp chạy"/"Đã hoàn thành" (§US-4.1), earnings summary cards (§US-4.2), prominent fuel section with breakdown (§US-4.3), pull-to-refresh.

- [x] **T3.14 — 409 optimistic-concurrency error UX** · `S` · FE · dep: T3.2, T2.5
  - On PUT 409 → "Có người khác đã cập nhật chuyến này. Tải lại?"

- [x] **T3.15 — 422 zero-revenue lock confirmation dialog** · `S` · FE · dep: T3.2, T2.7
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
- [x] **T4.8 — DB: revoke UPDATE/DELETE on `ledger` at role level** · `S` · DB · dep: T1.11
  - Epic ref: §4.8.
- [x] **T4.9 — OPS: persistent `UPLOAD_DIR` volume + nightly backup cron** · `S` · OPS · dep: T1.12
- [x] **T4.10 — OPS: periodic ledger reconciliation** · `M` · OPS · dep: T2.6
  - Per-entity balance recompute + trip↔ledger consistency. Epic ref: §4.8.

---

## Track 1 Execution Order (critical path)

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

---

# Track 2: Feature Backlog

> User stories not covered by the E2E Trip Lifecycle Epic. These are product-level enhancements for post-epic iterations.

## Epic A: Fuel Norm Thresholds & Warnings

### US-A.1: Configurable fuel norm thresholds with warnings
**As a** quản lý (manager),
**I want to** see warnings when a trip's fuel consumption exceeds configured norms,
**So that** I can identify fuel waste or theft proactively.

**Status:** TripListPage has hardcoded thresholds (37/40 L/100km). Need configurable thresholds from `fuel_config`.

- [ ] **T-A.1.1:** Add `warning_threshold` and `critical_threshold` fields to `fuel_config` table and schema
- [ ] **T-A.1.2:** Add threshold configuration UI in ConfigPage fuel-config tab
- [ ] **T-A.1.3:** Update TripListPage and TripDetailPage to use configured thresholds instead of hardcoded 37/40 values
- [ ] **T-A.1.4:** Show TTBQ comparison against norm in TripDetailPage: "TTBQ: 42.5 L/100km (Định mức: 43 L/100km — ✅ Trong định mức)"
- [ ] **T-A.1.5:** Add fuel warning indicator on DashboardPage for recent trips exceeding norms

---

## Epic B: Accounts Receivable (Công nợ phải thu)

### US-B.1: Record payments with FIFO suggestion
**As a** kế toán,
**I want to** record customer payments with the system suggesting oldest unpaid trips first,
**So that** I can quickly allocate payments without manually sorting through trips.

**Status:** DebtDetailPage supports payment recording and trip-specific allocation. Missing FIFO suggestion.

- [ ] **T-B.1.1:** Add backend endpoint or modify existing `GET /ledger/customers/:id/statement` to return unpaid trips sorted by date (oldest first) with outstanding amounts
- [ ] **T-B.1.2:** In DebtDetailPage payment modal, add "Gợi ý FIFO" button that auto-fills payment amounts starting from oldest unpaid trip
- [ ] **T-B.1.3:** Allow accountant to override FIFO suggestions — select specific trips and enter custom amounts
- [ ] **T-B.1.4:** Show running total: "Đã phân bổ: X / Y VNĐ" as accountant fills in amounts

### US-B.2: Overdue customer alerts
**As a** quản lý,
**I want to** see automatic 30/60/90-day overdue alerts on the dashboard,
**So that** I can prioritize debt collection for high-risk customers.

**Status:** Backend `GET /ledger/customers/:id/statement` returns aging data. No dashboard alerts.

- [x] **T-B.2.1:** Add overdue summary endpoint: `GET /reports/receivables-summary` returning counts/amounts for 30/60/90+ day buckets
- [ ] **T-B.2.2:** Add alerts widget to DashboardPage showing: "X khách hàng quá hạn 30 ngày (Y VNĐ), Z khách hàng quá hạn 60 ngày (W VNĐ)"
- [ ] **T-B.2.3:** Color-code customers in DebtListPage: green (< 30d), yellow (30-60d), red (60-90d), dark red (90d+)
- [ ] **T-B.2.4:** Click alert to navigate to DebtListPage filtered by overdue status

### US-B.3: Export customer statement
**As a** kế toán,
**I want to** export a customer debt statement as PDF/Excel,
**So that** I can send it to customers for payment follow-up.

**Status:** Not implemented. DebtDetailPage shows data but has no export.

- [ ] **T-B.3.1:** Add backend endpoint `GET /ledger/customers/:id/statement/export?format=pdf|xlsx` that generates downloadable file
- [ ] **T-B.3.2:** Add "Xuất sao kê" button to DebtDetailPage with PDF/Excel format selector
- [ ] **T-B.3.3:** PDF template: company header, customer info, trip-by-trip ledger with running balance, aging summary at bottom
- [ ] **T-B.3.4:** Excel export with same data in tabular format, auto-column-widths, conditional formatting for overdue rows

---

## Epic C: Dashboard & Reporting Enhancements

### US-C.1: Manager views real-time dashboard
**As a** quản lý,
**I want to** see a comprehensive dashboard with revenue, costs, gross profit, and fleet status,
**So that** I can make quick operational decisions.

**Status:** DashboardPage exists with KPIs and charts.

- [ ] **T-C.1.1:** Verify dashboard data matches backend `GET /reports/dashboard` endpoint
- [ ] **T-C.1.2:** Add monthly revenue trend line chart
- [ ] **T-C.1.3:** Add cost breakdown pie chart (fuel vs road allowance vs driver salary)
- [ ] **T-C.1.4:** Add top 5 profitable routes table
- [ ] **T-C.1.5:** Add fleet status overview (trucks in transit, available, maintenance)

### US-C.2: P&L report with drill-down
**As a** quản lý,
**I want to** view a monthly P&L report with drill-down to individual trips,
**So that** I understand what drives profitability.

**Status:** FinancePage calls `GET /reports/pnl`. Needs drill-down capability.

- [ ] **T-C.2.1:** In FinancePage, make monthly rows clickable to show trip-level breakdown
- [ ] **T-C.2.2:** Drill-down shows: per-trip revenue, cost components, gross profit
- [ ] **T-C.2.3:** Add export button for P&L report (Excel)
- [ ] **T-C.2.4:** Add year-over-year comparison view

---

## Epic D: Profit Distribution

### US-D.1: Profit distribution with cap table history
**As a** quản lý,
**I want to** execute quarterly profit distribution based on partner equity percentages,
**So that** each partner receives their correct share.

**Status:** ProfitPage and backend endpoint exist. Cap table management in ConfigPage.

- [ ] **T-D.1.1:** Verify distribution calculation uses correct cap table history percentages for the period
- [ ] **T-D.1.2:** Show distribution preview before execution: "Q1/2026 — Ông Thương: X VNĐ (29.55%), Ông Phụng: Y VNĐ (70.45%)"
- [ ] **T-D.1.3:** After execution, show immutable distribution records with confirmation
- [ ] **T-D.1.4:** Add historical distribution view: list all past distributions by quarter/year

---

## Epic E: Tech Debt & Bug Fixes

### US-E.1: Fix frontend TypeScript compilation errors
**As a** developer,
**I want to** have zero TypeScript compilation errors in the frontend,
**So that** the codebase is maintainable and type-safe.

- [x] **T-E.1.1:** Fix snake_case/camelCase property mismatches between backend API responses and frontend types (e.g., `entityType` vs `entity_type`, `distance` vs `distance_km`)
- [x] **T-E.1.2:** Align frontend TypeScript interfaces with shared package types from `shared/src/types/index.ts`
- [x] **T-E.1.3:** Run `cd frontend && npx tsc --noEmit` and fix all errors to zero

### US-E.2: Fix API endpoint consistency
**As a** developer,
**I want to** ensure all frontend API calls match backend endpoints,
**So that** no silent failures occur in production.

- [ ] **T-E.2.1:** Audit all `api.get/post/put/delete` calls across frontend for path correctness
- [ ] **T-E.2.2:** Ensure frontend uses shared constants for API paths where possible
- [ ] **T-E.2.3:** Verify all 96+ API calls return expected response shapes

---

## Overall Priority

| Priority | Track | Epic | Rationale |
|----------|-------|------|-----------|
| **P0** | 1 | Phase 1–2 (Trip lifecycle core) | Foundation must be solid before adding features |
| **P0** | 2 | Epic E (Bug fixes) | TypeScript + API consistency enables all other work |
| **P1** | 1 | Phase 3 (Frontend) | Core operational flow — highest business value |
| **P1** | 2 | Epic B (Receivables) | Financial control — 71% debt concentrated in 4 customers |
| **P2** | 1 | Phase 4 (Hardening) | Reliability and safety nets |
| **P2** | 2 | Epic A (Fuel control) | Cost optimization |
| **P2** | 2 | Epic C (Dashboard) | Decision support |
| **P3** | 2 | Epic D (Profit distribution) | Quarterly action, not daily |

---

## Verification

After implementation of each epic:
1. `cd backend && npx tsc --noEmit` — zero errors
2. `cd frontend && npx tsc --noEmit` — zero errors
3. Start dev environment: `cd backend && npm run dev` + `cd frontend && npm run dev`
4. Login with each role (admin, manager, accountant, driver) and verify role-appropriate access
5. Test the specific epic's user stories manually in the browser
6. Verify audit logs capture all mutation actions with proper Vietnamese messages
