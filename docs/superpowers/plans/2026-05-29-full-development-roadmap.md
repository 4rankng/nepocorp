# NEPOCORP Full Development Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-ready web system for NEPO logistics — replacing 7 Excel files and 300+ sheets with a unified platform for trip management, financial reporting, accounts receivable, and profit distribution.

**Architecture:** React 19 + TypeScript frontend (already built as demo with MockApiClient) → real backend API (Node/TypeScript + PostgreSQL) → replace MockApiClient with real HTTP calls. Shared types package (`@nepocorp/shared`) already defines all interfaces and Zod schemas.

**Tech Stack:** React 19, React Router 7, Tailwind 4, Lucide icons (frontend) · Node.js / Hono or Express, PostgreSQL, Drizzle ORM or Prisma, JWT (backend) · Zod (shared validation)

---

## Current State — What's Already Built

The frontend demo is **~85% UI-complete** running on a `MockApiClient`. No real backend exists yet.

| Feature | Frontend UI | Backend API | Status |
|---|---|---|---|
| Auth / Login | ✅ | ❌ | UI complete, backend missing |
| Dashboard | ✅ | ❌ | UI complete, backend missing |
| Trip Management (full workflow) | ✅ | ❌ | UI complete, backend missing |
| Dispatch Page | ✅ | ❌ | UI complete, backend missing |
| Fleet / Driver CRUD | ✅ | ❌ | UI complete, backend missing |
| Finance P&L (tables, no charts) | ⚠️ | ❌ | Missing charts |
| Profit Distribution | ✅ | ❌ | UI complete, backend missing |
| Debt List + Aging Buckets | ✅ | ❌ | UI complete, backend missing |
| Debt Detail + Payment Modal | ⚠️ | ❌ | Missing FIFO matching logic |
| Penalties (admin + driver) | ✅ | ❌ | UI complete, backend missing |
| All 12 Config Pages | ✅ | ❌ | UI complete, backend missing |
| Driver Mobile Views | ✅ | ❌ | UI complete, backend missing |
| Audit Log Page | ❌ | ❌ | Hardcoded mock only |
| Photo Upload | ⚠️ | ❌ | Mock; needs real file storage |

---

## Task Registry

Tasks are grouped by phase. Each task has an ID, description, dependencies, and can-parallelize flag.

---

### PHASE 0 — Frontend Gap Fixes
*Can start immediately. No backend required. Run in parallel with backend foundation.*

#### FE-01: FIFO Payment Matching in DebtDetailPage
**File:** `frontend/src/pages/DebtDetailPage.tsx`
**Gap:** Payment modal shows unpaid trips in flat list. No FIFO ordering (oldest trip first). Per spec: system must suggest FIFO but accountant can override.
- [ ] Sort unpaid ledger entries by trip departure date ascending (oldest first) in the payment modal
- [ ] Add "Pay All (FIFO)" button that auto-fills amounts oldest → newest until balance exhausted
- [ ] Preserve manual override: accountant can still reorder or enter custom amounts per trip
- [ ] Add visual indicator on trips sorted order (e.g., "#1 oldest" badge on first trip)
- [ ] Test: select 3 unpaid trips, click "Pay All", verify amounts fill FIFO order

#### FE-02: Finance Page Charts
**File:** `frontend/src/pages/FinancePage.tsx`
**Gap:** Zero charts. Spec requires monthly revenue trend, cost breakdown pie, top routes by profit.
- [ ] Add monthly revenue bar chart (12 months, current year) using SVG or a lightweight lib (recharts/chart.js)
- [ ] Add cost breakdown pie chart: fuel vs road allowance vs driver salary
- [ ] Add top-5 routes by gross profit table/bar (from P&L truck breakdown data already fetched)
- [ ] Ensure charts are responsive and match existing Tailwind color scheme
- [ ] Test: verify charts render with mock P&L data, check mobile layout

#### FE-03: Audit Log Page — Wire to Real API
**File:** `frontend/src/pages/AuditLogPage.tsx`
**Gap:** Entirely hardcoded `MOCK_ENTRIES` array. Real API call missing.
- [ ] Replace `MOCK_ENTRIES` with `api.get<{items: AuditLog[]}>('/audit-logs?...')` using existing `api` client
- [ ] Add category filter as query param (`?category=trip&search=...`)
- [ ] Add pagination state (`page`, `pageSize`) matching existing pattern from other list pages
- [ ] Keep all existing UI (category dots, colored badges, pagination controls) — just swap data source
- [ ] Test: verify page loads with mock API, verify search and filter still work

#### FE-04: Photo Upload — Real File Storage
**File:** `frontend/src/hooks/useTripForm.ts` (line ~`uploadPhotos`)
**Gap:** `uploadPhotos()` calls `/api/upload` which doesn't exist. Photos show as local blob URLs in demo.
- [ ] Wire `uploadPhotos()` to POST multipart/form-data to real `/upload` endpoint (implement in backend INT-02)
- [ ] Return permanent URLs (S3 / Cloudflare R2 / local disk for dev)
- [ ] Show upload progress indicator (the `uploading` state flag already exists in the hook)
- [ ] Handle upload errors with user-visible message via `setError()`
- [ ] Test: upload a real image in trip form, verify URL persists after page refresh

---

### PHASE 0.5 — UI/UX Workflow Gaps (from user-story audit, 2026-05-29 grilling)
*Frontend-only. No backend dependency except where noted. Run in parallel with Phase 0.*

#### FE-05: Reassign button on TripDetailPage (Module 1.2)
**File:** `frontend/src/pages/TripDetailPage.tsx`
**Gap:** Reassign (truck + driver) is only on `DispatchPage`. A user viewing a specific trip can't reassign without going back to the dispatch board.
- [ ] Add "Phân xe lại" button, visible only when `status === CREATED`
- [ ] Open reassign modal (reuse the truck+driver picker pattern from `DispatchPage`)
- [ ] Call existing `POST /trips/:id/reassign` endpoint, refresh on success
- [ ] Test: open a CREATED trip, reassign truck+driver, verify update persists

#### FE-06: Universal photo-required lock check (Module 2.3 / spec 4.12)
**Files:** `frontend/src/pages/TripDetailPage.tsx`, `frontend/src/lib/demo-data.ts`
**Decision:** All trips require ≥1 photo before locking. No tea-specific Container/Seal logic. `CargoType.requires_photos` stays as a forward-looking config flag but does NOT gate locking.
- [ ] Change lock guard from `requires_photos && length===0` to unconditional `(!trip.photo_urls || trip.photo_urls.length === 0)` blocks lock for ALL trips
- [ ] Remove tea-specific Container+Seal warning text in `TripEditPage` photo section; keep generic "cần ít nhất 1 ảnh" hint
- [ ] (Optional) Add a "Chè" cargo type to demo data for realism — no special photo handling
- [ ] Test: try to lock a COMPLETED trip with 0 photos → blocked; with 1 photo → allowed

#### FE-07: Penalty duplicate detection (Module 7.1 / spec 4.11)
**Files:** `frontend/src/pages/config/PenaltyReasonsConfigPage.tsx`, `frontend/src/pages/PenaltyPage.tsx`
**Decision:** Check duplicates in BOTH places.
- [ ] **A (catalog):** In `PenaltyReasonsConfigPage` form, block save if `reason_text` matches an existing reason case-insensitively (trimmed). Show inline error "Lý do này đã tồn tại."
- [ ] **B (custom reason in penalty drawer):** In `PenaltyPage` drawer, when typed `custom_reason` fuzzy-matches a catalog reason, show a soft suggestion "Đã có lý do tương tự: '...' — dùng lý do này?" with a one-click apply. Free text still allowed.
- [ ] Test: add duplicate catalog reason → blocked; type near-match custom reason → suggestion appears

#### FE-08: Penalty monthly summary — month selector (Module 7.2)
**File:** `frontend/src/pages/PenaltyPage.tsx`
**Gap:** KPIs + driver scoreboard are hardcoded to the current month; admin can't review a past month.
- [ ] Add a month/year selector controlling the WHOLE page (KPIs + scoreboard), defaulting to current month
- [ ] Recompute `monthPenalties`, KPI totals, and per-driver scoreboard from the selected month
- [ ] Keep the existing 7d/30d/90d/ytd scoreboard range filter as a secondary control
- [ ] Test: select a past month, verify KPIs and scoreboard reflect that month

#### FE-09: Adjustment E-Invoice UI (spec 4.9) — MVP minimal
**Files:** `frontend/src/pages/TripDetailPage.tsx`, `frontend/src/lib/api.ts` (mock route), backend BE-15+
**Gap:** Locked trips can't be corrected — the only legal correction path (Adjustment E-Invoice) has no UI or endpoint, so wrong locked data is stuck.
- [ ] Add "Điều chỉnh" button on `TripDetailPage`, visible only when `status === LOCKED`
- [ ] Adjustment drawer/form: `amount` (allow negative = Credit Note / positive = Debit Note), `note` (required), `signed_agreement_ref` (required) — matches existing `CreateAdjustmentRequest` type
- [ ] Call `POST /trips/:id/adjustment`; backend appends a current-period ledger row `txn_type: ADJUSTMENT` (does NOT mutate original trip/ledger rows)
- [ ] Display list of issued adjustments for the trip on `TripDetailPage`
- [ ] Backend: add adjustment handler + `appendEntry` call (extends BE-18 ledger work)
- [ ] Test: issue a -500.000 adjustment on a locked trip → ledger gains an ADJUSTMENT row, original untouched

#### FE-10: Distribution history view (Module 6) — POST-MVP
**File:** `frontend/src/pages/ProfitPage.tsx`, backend BE-26
**Gap:** Execute/freeze distribution works, but there's no way to view past frozen distributions (needed since "year-end reports just SUM these snapshots").
- [ ] Add "Lịch sử phân chia" table below the live distribution section on `ProfitPage`, calling `GET /distributions`
- [ ] Group by Quarter/Year, show per-partner amount + totals
- [ ] After a successful freeze, mark that quarter/year read-only and block re-distribution (handled in BE-26)
- [ ] Test: freeze a distribution, verify it appears in history and re-freeze is blocked

---

### PHASE 1 — Backend Foundation
*Sequential. Everything else depends on this.*

#### BE-01: Backend Project Setup
**Files to create:** `backend/package.json`, `backend/tsconfig.json`, `backend/src/index.ts`, `backend/.env.example`
- [ ] `mkdir backend && cd backend && npm init -y`
- [ ] Install: `hono` (or `express`), `@hono/node-server`, `dotenv`, `zod`, `@nepocorp/shared`
- [ ] Install dev: `typescript`, `tsx`, `@types/node`
- [ ] `tsconfig.json` with `strict: true`, `moduleResolution: bundler`
- [ ] `src/index.ts`: create Hono app, mount `/api` prefix, listen on `PORT` env
- [ ] Add `dev` script: `tsx watch src/index.ts`
- [ ] Verify: `npm run dev` starts server, `curl localhost:3000/api/health` returns `{ok: true}`

#### BE-02: Database Schema + Migrations
**Files:** `backend/src/db/schema.ts`, `backend/drizzle.config.ts`, migration files
- [ ] Install: `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`
- [ ] Configure `drizzle.config.ts` pointing to `DATABASE_URL` env var
- [ ] Define all tables in `schema.ts` matching shared types exactly:
  - `users` (id, email, password_hash, role, status, created_at, updated_at, deleted_at)
  - `drivers` (id, user_id FK, name, phone, assigned_truck_id, base_salary, status, timestamps)
  - `trucks`, `trailers`
  - `customers`, `routes`, `cargo_types`
  - `pricing_tables` (customer_id FK, route_id FK, price)
  - `road_allowances` (route_id FK, trailer_type, base_amount)
  - `fuel_configs` (singleton: loaded_norm, empty_norm, supplement, unit_price)
  - `penalty_reasons` (reason_text, default_amount)
  - `trips` (all fields from `Trip` type in shared)
  - `trip_legs` (trip_id FK, sequence, origin, destination, km, loading_type, calculated_liters)
  - `penalties` (driver_id FK, trip_id FK nullable, reason_id FK nullable, custom_reason, amount, date)
  - `ledger_entries` (date, txn_type, txn_id, receipt_id, entity_type, entity_id, credit, debit, balance, note)
  - `cap_table_history` (partner_name, percentage, effective_date)
  - `management_fees` (month, year, amount)
  - `distributions` (quarter, year, partner_name, amount)
  - `audit_logs` (timestamp, user_id, message, entity_type, entity_id, payload, ip_address)
- [ ] `npx drizzle-kit generate` and `npx drizzle-kit migrate`
- [ ] Verify: connect to DB, all tables created

#### BE-03: Authentication API
**Files:** `backend/src/routes/auth.ts`, `backend/src/lib/auth.ts`
- [ ] Install: `jsonwebtoken`, `bcryptjs`, `@types/jsonwebtoken`, `@types/bcryptjs`
- [ ] `src/lib/auth.ts`: `hashPassword()`, `verifyPassword()`, `signToken()`, `verifyToken()`
- [ ] `POST /auth/login`: accept `{identifier, password}`, validate with `loginSchema` from shared, return `{token, user}`
- [ ] `GET /auth/me`: require `Authorization: Bearer <token>` header, return current `UserPublic`
- [ ] Auth middleware: `requireAuth(role?)` — verify JWT, attach `ctx.user`, optionally check role
- [ ] Seed one admin user in migrations: `email: admin@nepocorp.vn, password: admin123`
- [ ] Verify: `POST /auth/login` with seed credentials returns token; `GET /auth/me` with token returns user

#### BE-04: User Management API
**File:** `backend/src/routes/users.ts`
**Depends on:** BE-03
- [ ] `GET /auth/users`: list all users, admin only, use `createUserSchema` for output
- [ ] `POST /auth/users`: create user, hash password, validate with `createUserSchema`
- [ ] `PATCH /auth/users/:id`: update role/status/password
- [ ] `DELETE /auth/users/:id`: soft-delete (set `deleted_at`)
- [ ] Verify: create a user via API, list users, update role, soft-delete

---

### PHASE 2 — Reference Data APIs
*All can be built in parallel after BE-04 is done.*

**Pattern for all Phase 2 tasks:** Each follows the same structure:
1. Handler: GET (paginated list + optional ?search), POST (create), PUT/:id (update), DELETE/:id (soft-delete)
2. Use Zod schema from `@nepocorp/shared/schemas` for validation
3. All routes behind `requireAuth()` middleware

#### BE-05: Trucks & Trailers API
**File:** `backend/src/routes/fleet.ts`
- [ ] `GET/POST/PUT/DELETE /trucks` using `truckSchema`
- [ ] `GET/POST/PUT/DELETE /trailers` using `trailerSchema`
- [ ] Paginated GET with `?status=ACTIVE&search=plate`

#### BE-06: Customers API
**File:** `backend/src/routes/customers.ts`
- [ ] `GET/POST/PUT/DELETE /customers` using `customerSchema`
- [ ] Paginated GET with `?status=ACTIVE&search=name`

#### BE-07: Routes API
**File:** `backend/src/routes/routes.ts`
- [ ] `GET/POST/PUT/DELETE /routes` using `routeSchema`
- [ ] Include `is_mountain` flag and `fixed_fuel_allowance` field

#### BE-08: Drivers API
**File:** `backend/src/routes/drivers.ts`
- [ ] `GET/POST/PUT/DELETE /drivers` using `driverSchema`
- [ ] `GET /driver/me/*` endpoints (trips, earnings, penalties) — scoped to authenticated driver user

#### BE-09: Cargo Types API
**File:** `backend/src/routes/cargo-types.ts`
- [ ] `GET/POST/PUT/DELETE /cargo-types`

#### BE-10: Fuel Config API
**File:** `backend/src/routes/fuel-config.ts`
- [ ] `GET /fuel-config`: return singleton config (create default if none exists)
- [ ] `PUT /fuel-config`: update loaded_norm, empty_norm, supplement, unit_price

#### BE-11: Penalty Reasons API
**File:** `backend/src/routes/penalty-reasons.ts`
- [ ] `GET/POST/PUT/DELETE /penalty-reasons`
- [ ] On POST: check for duplicate `reason_text` (case-insensitive) and return 409 if duplicate

#### BE-12: Pricing Tables API
**File:** `backend/src/routes/pricing-tables.ts`
**Depends on:** BE-06, BE-07
- [ ] `GET /pricing-tables?customer_id=X&route_id=Y`: supports lookup by both FK for auto-fill in trip form
- [ ] `POST/PUT/DELETE /pricing-tables`

#### BE-13: Road Allowances API
**File:** `backend/src/routes/road-allowances.ts`
**Depends on:** BE-07
- [ ] `GET /road-allowances?route_id=X&trailer_type=Y`: supports lookup for trip form auto-fill
- [ ] `POST/PUT/DELETE /road-allowances`

#### BE-14: Cap Table History + Management Fees API
**File:** `backend/src/routes/finance-config.ts`
- [ ] `GET/POST/PUT/DELETE /cap-table`
- [ ] `GET/POST/PUT/DELETE /management-fees`

---

### PHASE 3 — Trip Domain
*Sequential within this phase. Depends on Phase 2 completion.*

#### BE-15: Trip CRUD API
**File:** `backend/src/routes/trips.ts`
**Depends on:** BE-05, BE-06, BE-07, BE-08, BE-09
- [ ] `POST /trips`: validate with `createTripSchema`, create trip in `CREATED` status, auto-lookup revenue from pricing_tables if available
- [ ] `GET /trips`: paginated list with filters `?status=&truck_id=&customer_id=&month=&year=&search=`, join related entities (truck, driver, trailer, customer, route)
- [ ] `GET /trips/:id`: full TripDetail with legs, driver, truck, trailer, route, customer, cargoType

#### BE-16: Trip State Machine
**File:** `backend/src/routes/trips.ts` (extend)
**Depends on:** BE-15
- [ ] `POST /trips/:id/dispatch`: CREATED → IN_TRANSIT. Validate status precondition, insert audit log
- [ ] `POST /trips/:id/complete`: IN_TRANSIT → COMPLETED. Validate status precondition
- [ ] `POST /trips/:id/lock`: COMPLETED → LOCKED. Trigger ledger entry creation (see BE-18). Permanently lock — no further edits
- [ ] `POST /trips/:id/cancel`: CREATED|IN_TRANSIT → CANCELED. Record in audit log
- [ ] `POST /trips/:id/reassign`: update truck_id + driver_id, only allowed in CREATED status

#### BE-17: Trip Legs + Financial Calculations
**File:** `backend/src/routes/trips.ts` + `backend/src/lib/trip-calculations.ts`
**Depends on:** BE-16
- [ ] `PUT /trips/:id/pre-departure`: accept `updateTripFiguresRequest`, validate with schema, save legs + all financial fields. Only allowed in CREATED/IN_TRANSIT/COMPLETED status (not LOCKED/CANCELED)
- [ ] `src/lib/trip-calculations.ts` — pure calculation functions:
  - `calcFuelLiters(legs, fuelMode, fuelConfig, route)`: AUTO → sum legs using norm; MOUNTAIN → fixed allowance from route; FLAT_RATE → override value; + supplement
  - `calcRoadAllowance(route_id, trailer_type, tolls_discount, tolls_addition, tolls_stations, has_return_cargo, roadAllowances)`: lookup base + formula
  - `calcTotalCost(fuelLiters, unitPrice, roadAllowance, driverSalary)`
  - `calcGrossProfit(revenue, totalCost)`
- [ ] Run calculations on save, store results on trip record
- [ ] Verify: create trip with AUTO fuel mode + 2 legs, check calculated values match manual calculation

---

### PHASE 4 — Financial Domain
*All three tasks can run in parallel after BE-17 is done.*

#### BE-18: Ledger API + Trip Locking
**File:** `backend/src/routes/ledger.ts`, `backend/src/lib/ledger.ts`
**Depends on:** BE-17
- [ ] `src/lib/ledger.ts`: `appendEntry(db, entry)` — calculates running balance from last entry for entity, inserts new row
- [ ] In `POST /trips/:id/lock` (BE-16): call `appendEntry` with `txn_type: TRIP_REVENUE`, `entity_type: CUSTOMER`, `entity_id: customer_id`, `debit: revenue`, `txn_id: trip_id`
- [ ] `GET /ledger`: paginated entries with `?entity_type=&entity_id=` filters
- [ ] `GET /ledger/customers/:id/statement`: full statement for a customer — all entries, running balance, aging buckets (0-30, 31-60, 61-90, 90+ days based on `txn_id` trip departure dates)

#### BE-19: Payment Matching API
**File:** `backend/src/routes/payments.ts`
**Depends on:** BE-18
- [ ] `POST /payments/receive`: validate with `createPaymentSchema` (customer_id, receipt_id, payments array)
  - For each `{trip_id, amount}` in payments array: insert ledger entry with `txn_type: PAYMENT_RECEIVED`, `entity_type: CUSTOMER`, `entity_id: customer_id`, `credit: amount`, `txn_id: trip_id`, `receipt_id: shared receipt_id`
  - All entries in single transaction (rollback all if any fails)
- [ ] Validate: amount ≤ outstanding for each trip (sum debits - sum credits for that trip_id)
- [ ] `GET /payments`: list all payments grouped by `receipt_id`

#### BE-20: Penalty Recording API
**File:** `backend/src/routes/penalties.ts`
**Depends on:** BE-17 (needs trip existence check)
- [ ] `GET /penalties`: list with `?driver_id=&month=&year=` filters
- [ ] `POST /penalties`: validate with `createPenaltySchema`, record penalty, also insert into ledger as `txn_type: PENALTY` for driver entity
- [ ] `PUT/DELETE /penalties/:id`

---

### PHASE 5 — Reporting APIs
*All three can run in parallel after BE-18.*

#### BE-21: Dashboard Stats API
**File:** `backend/src/routes/reports.ts`
**Depends on:** BE-18
- [ ] `GET /reports/dashboard`: aggregate for current month:
  - revenue: SUM of `revenue` on LOCKED trips this month
  - costs: SUM of `total_cost` on LOCKED trips this month
  - grossProfit: revenue - costs
  - tripCount, completedTrips, inTransitTrips: COUNT by status
  - pendingPayments: SUM of outstanding debits across all customers

#### BE-22: P&L Report API
**File:** `backend/src/routes/reports.ts` (extend)
**Depends on:** BE-18, BE-25 (management fees)
- [ ] `GET /reports/pnl?month=X&year=Y`:
  - Gross profit per truck: JOIN trips on truck_id, filter by month/year and LOCKED status
  - Total gross profit: SUM across all trucks
  - Net profit: total gross - management fee for month + penalty income (sum of PENALTY ledger entries)
  - Prior year same month for YoY comparison
  - Partner distribution preview based on current cap table percentages

#### BE-23: Customer Statement API
**File:** `backend/src/routes/reports.ts` (extend)
**Depends on:** BE-18
- [ ] `GET /reports/customers/:id/statement?from=&to=`: trip-by-trip statement with partial payment tracking per trip
- [ ] Response: `{customer, trips: [{trip_id, departure_date, revenue, payments_received, outstanding}], total_outstanding, aging_buckets}`

---

### PHASE 6 — Profit Distribution
*Depends on BE-22 (P&L data needed) and BE-14 (cap table + management fees).*

#### BE-26: Profit Distribution API
**File:** `backend/src/routes/distributions.ts`
**Depends on:** BE-22, BE-14
- [ ] `POST /reports/distribute-profit`: accept `{quarter, year}`, calculate net profit for all months in quarter, distribute to partners per cap table percentages at that time, insert immutable `distributions` rows
- [ ] `GET /distributions`: list all distributions with `?quarter=&year=` filter
- [ ] Validation: prevent double-distribution (check if distribution already exists for quarter/year)

---

### PHASE 7 — Audit Logging
*Cross-cutting concern. Thread through all mutation endpoints.*

#### BE-27: Audit Log Middleware + API
**File:** `backend/src/lib/audit.ts`, `backend/src/routes/audit-logs.ts`
**Depends on:** BE-03 (needs auth context)
- [ ] `src/lib/audit.ts`: `logAction(db, ctx, message, entity_type?, entity_id?, payload?)` — insert into `audit_logs` table
- [ ] Call `logAction()` in: trip state transitions, payment recording, penalty creation, config changes
- [ ] `GET /audit-logs`: paginated with `?category=&search=&from=&to=` filters
- [ ] `frontend/src/pages/AuditLogPage.tsx`: wire to real API (FE-03)

---

### PHASE 8 — Integration
*Replace MockApiClient with real HTTP calls.*

#### INT-01: Replace MockApiClient
**File:** `frontend/src/lib/api.ts`
**Depends on:** All backend phases complete
- [ ] Change `MockApiClient.request()` to use `fetch(import.meta.env.VITE_API_URL + path, options)`
- [ ] Keep same interface — all existing page components continue working unchanged
- [ ] Add `VITE_API_URL=http://localhost:3000/api` to `frontend/.env.development`
- [ ] Add `VITE_API_URL=https://api.nepocorp.vn/api` to `frontend/.env.production`

#### INT-02: Real File Storage
**File:** `backend/src/routes/upload.ts`
**Depends on:** BE-03
- [ ] `POST /upload`: accept multipart/form-data with `file` field, save to disk (`/uploads/`) for dev or S3 for prod, return `{url: "..."}`
- [ ] Frontend FE-04 then wires to this endpoint

#### INT-03: Environment Configuration
**Files:** `backend/.env.example`, `frontend/.env.example`, root `docker-compose.yml`
- [ ] Document all required env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `STORAGE_TYPE`, `S3_BUCKET` etc.
- [ ] Docker Compose: `postgres` service + `backend` service + optional `frontend` service
- [ ] Add DB connection pool config, JWT expiry config

---

## Dependency Graph

```
BE-01 → BE-02 → BE-03 → BE-04
                          │
         ┌────────────────┼────────────────────────┐
       BE-05            BE-06                     BE-07
      BE-08            BE-09                     BE-10
      BE-11              │                         │
         │             BE-12 (Pricing)          BE-13 (RoadAllowance)
         │               │                         │
         └───────────────┴─────────────────────────┘
                                │
                              BE-15 (Trip CRUD)
                                │
                              BE-16 (State Machine)
                                │
                              BE-17 (Calculations + Legs)
                          ┌─────┴──────┬──────────────┐
                        BE-18        BE-19          BE-20
                       (Ledger)    (Payments)     (Penalties)
                          │
               ┌──────────┼─────────────┐
             BE-21       BE-22        BE-23
           (Dashboard)   (P&L)     (Statement)
                          │
                        BE-26 (Distribution)
                        (needs BE-14 too)

FE-01..04 ──────────────────────────────────────── (parallel with all BE phases)
BE-03 → INT-02 (upload endpoint)
All BE → INT-01 (swap MockApiClient)
BE-27 threads through all mutation endpoints
```

---

## Parallel Development Streams

### Stream A — Backend (1 developer)
Sequential through phases: BE-01 → BE-02 → BE-03 → BE-04 → [Phase 2 fans out] → BE-15 → ...

### Stream B — Frontend Gaps (1 developer, can start Day 1)
All four FE tasks are independent of each other and independent of backend:
- FE-01 (FIFO matching) — ~0.5 day
- FE-02 (Finance charts) — ~1 day
- FE-03 (Audit log wiring) — ~0.5 day
- FE-04 (Photo upload hook) — ~0.5 day

### Stream C — Phase 2 Reference APIs (can fan out to multiple developers)
BE-05 through BE-14 can be split across developers once BE-04 is done.
Each takes ~0.5-1 day and follows the exact same CRUD pattern.

### Stream D — Integration (after all backend, ~last week)
INT-01, INT-02, INT-03 are sequential and fast once backend is complete.

---

## MVP Milestones

### MVP 1 — Trip Recording
**Tasks:** BE-01 → BE-17 + INT-01 (partial, just trip endpoints)
**Delivers:** Manager creates trips, accountant enters figures, workflow moves through all 5 states, financial calculations work.

### MVP 2 — Financial Dashboard
**Tasks:** + BE-18 + BE-21 + BE-22
**Delivers:** Dashboard shows real revenue/cost/profit. Finance P&L page shows real data by month and truck.

### MVP 3 — Accounts Receivable
**Tasks:** + BE-19 + BE-23 + FE-01
**Delivers:** Debt aging page works. Accountant records payments. Customer statements exportable.

### Full Product
**Tasks:** + BE-20 + BE-24-26 + BE-27 + FE-02-04 + INT-02-03
**Delivers:** Penalties, profit distribution, audit trail, photo evidence, real file storage.

---

## Effort Estimate (1 developer)

| Phase | Tasks | Est. Days |
|---|---|---|
| FE Gaps (parallel) | FE-01..04 | 3 days |
| Backend Foundation | BE-01..04 | 4 days |
| Reference Data APIs | BE-05..14 | 5 days |
| Trip Domain | BE-15..17 | 4 days |
| Financial Domain | BE-18..20 | 4 days |
| Reporting | BE-21..23 | 3 days |
| Profit Distribution | BE-26 | 2 days |
| Audit Logging | BE-27 | 1 day |
| Integration | INT-01..03 | 2 days |
| **Total** | | **~28 days** |

With 2 developers running Stream A + B in parallel: **~20 days to MVP 3**.
