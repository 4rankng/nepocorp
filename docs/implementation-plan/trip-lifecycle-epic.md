# Epic: E2E Trip Lifecycle Implementation

## 1. Overview
This epic covers the end-to-end flow of a single delivery trip, from its creation by a Manager, configuration by an Accountant, execution by a Driver, to finalization and financial locking. Implementing this flow will provide the core operational capability of the NEPO Logistics web platform, replacing the current manual Excel tracking.

---

## 2. User Stories & Operational Context

### Management & Dispatch
- **[Manager]** I want to create a new trip with: customer, route, trailer type, truck, driver, cargo type, start date → status "Mới tạo".
- **[Manager/Accountant]** I want to transition trip states through a strict lifecycle (Mới tạo → Đang chạy → Hoàn thành → Đã chốt).
- **[Manager]** I want to cancel a trip (Mới tạo / Đang chạy → Đã hủy) if the operation falls through, ensuring the record remains for historical auditing without impacting financials.

### Accounting & Operations
- **[Accountant]** I want to input actual figures for the trip: km, fuel liters, loaded/empty (hàng/vỏ), tolls, driver income, revenue.
- **[Accountant]** I want the system to auto-calculate: fuel cost, road allowance, total cost, and gross profit in real-time.
- **[Accountant]** I want to upload container and seal photos when completing a trip. *(Operational note: Drivers send photos to Accountants via Zalo; Accountants handle the system upload. Driver photo upload is deferred to v2).*

### Driver Mobile Experience
- **[Driver]** I want to view my trip schedule on my mobile phone (read-only).
- **[Driver]** I want to view the allocated fuel and road allowance cash for my trip on my mobile phone (read-only).

---

## 3. Project Structure & Tech Stack Strategy

### 3.1. Architecture & Monorepo
The project leverages a strict Monorepo architecture managed by `pnpm` workspaces:
- **`@nepocorp/shared`**: Single source of truth. Contains Zod schemas (derived via `drizzle-zod` where possible), shared Enums, TypeScript types, and **pure business logic functions** (including `computeTripTotals`).
- **`@nepocorp/backend`**: Express 5 REST API using Drizzle ORM and PostgreSQL.
- **`@nepocorp/frontend`**: React 19 SPA built with Vite and Tailwind CSS v4.

### 3.2. Backend Structure (`/backend/src`)
```
backend/src/
├── index.ts                    # Express app, CORS, route mounting
├── config/index.ts             # dotenv loading
├── db/
│   ├── schema.ts               # All Drizzle table definitions + pgEnums
│   └── index.ts                # Drizzle client instance
├── middleware/
│   ├── auth.ts                 # JWT verification + requireRoles() RBAC
│   └── audit.ts                # Global mutation audit logger (Vietnamese)
├── routes/
│   ├── auth.ts                 # Login / register
│   ├── config.ts               # Generic CRUD factory for catalog tables
│   ├── trips.ts                # POST, PUT, PATCH /status (Manager/Accountant only)
│   ├── driver.ts               # Driver-specific read-only endpoints (dedicated DTO)
│   ├── financial.ts            # Ledger, payments, adjustments
│   └── upload.ts               # Multer file upload
├── services/
│   ├── trip.service.ts         # Trip lifecycle + calls shared computeTripTotals
│   ├── ledger.service.ts       # [NEW] Immutable ledger insert with advisory lock
│   ├── storage.service.ts      # [NEW] StorageService interface (local impl for MVP)
│   ├── audit.service.ts        # Audit log helper (synchronous, in-transaction)
│   └── event-bus.ts            # Internal event emitter (non-audit side-effects only)
```

### 3.3. Frontend Structure (`/frontend/src`)
```
frontend/src/
├── api/
│   └── tripClient.ts           # [NEW] Typed fetch wrappers for /api/trips
├── components/
│   └── TripForm/               # [NEW] Extracted sub-components
│       ├── TripLegFields.tsx
│       ├── FuelConfigurator.tsx
│       ├── AllowanceConfigurator.tsx
│       ├── TotalsPanel.tsx
│       └── PhotoUploader.tsx
├── hooks/
│   ├── useAuth.tsx             # Auth context
│   └── useCatalogs.ts          # [NEW] TanStack Query hook for bootstrap data
├── lib/
│   ├── api.ts                  # ApiClient class with Bearer token
│   ├── format.ts               # VNĐ currency, number, date formatters
│   └── round.ts                # [NEW] Shared round2dp helper (banker-safe)
├── pages/
│   ├── TripListPage.tsx        # Dashboard table (TanStack Table)
│   ├── TripCreatePage.tsx      # Dispatch form
│   ├── TripDetailPage.tsx      # [EXISTING] Read-only view
│   ├── TripEditPage.tsx        # [EXISTING] Accountant config form
│   ├── DriverTripsPage.tsx     # Mobile-first list
│   └── DriverTripDetailPage.tsx # Mobile-first detail (read-only)
```

### 3.4. Critical Tech Decisions

#### Shared Financial Math (`computeTripTotals`)
To prevent drift between frontend UI and backend persistence, `computeTripTotals` is a **pure function** in `@nepocorp/shared`. Both the frontend `TotalsPanel` and backend `PUT /api/trips/:id` call the same code. No I/O, no DB access — all rates and constants are passed in as arguments.

**Contract & Signature:**
```typescript
// @nepocorp/shared/src/calculations/tripTotals.ts

interface ComputeTripTotalsInput {
  legs: { km: number; loadingType: 'HANG' | 'VO' }[];
  fuelMode: 'AUTO' | 'FLAT_RATE';
  fuelLitersOverride: number | null;
  fuelSupplementLiters: number;
  // Snapshotted rates (passed in, not looked up):
  fuelLoadedNorm: number;           // L/100km for loaded
  fuelEmptyNorm: number;            // L/100km for empty
  fuelPerTripSupplement: number;    // +3L standard
  fuelUnitPrice: number;            // VNĐ per liter (integer)
  isMountainRoute: boolean;
  mountainFixedAllowance: number | null; // Total liters for mountain
  // Road allowance (all snapshotted):
  roadAllowanceBase: number;        // From road_allowances lookup (integer VNĐ)
  tollsDiscount: number;
  tollsAddition: number;
  tollsStations: number;
  tollPerStation: number;           // Currently 55000, snapshotted from config
  hasReturnCargo: boolean;
  returnCargoBonus: number;         // Currently 300000, snapshotted from config
  // Direct inputs:
  revenue: number;
  driverSalary: number;
}

interface ComputeTripTotalsOutput {
  totalFuelLiters: number;          // decimal (2dp)
  legCalculations: { sequence: number; calculatedLiters: number }[];
  totalFuelCost: number;            // integer VNĐ
  totalRoadAllowance: number;       // integer VNĐ, clamped to >= 0
  totalCost: number;                // integer VNĐ
  grossProfit: number;              // integer VNĐ (can be negative)
}

export function computeTripTotals(input: ComputeTripTotalsInput): ComputeTripTotalsOutput;
```

**Contract rules (must be unit-tested):**
1. **Mode precedence:** `FLAT_RATE` takes absolute precedence over everything, including mountain routes. Mountain logic only applies within `AUTO` mode.
2. **Mountain fallback:** `(isMountainRoute = true, mountainFixedAllowance = null)` falls through to standard per-leg AUTO calculation.
3. **`legCalculations` in non-AUTO modes:** Populated as `0` for each leg (informational stub). The function does NOT compute per-leg liters when they're not the fuel source.
4. **Negative road allowance:** Clamped to `Math.max(0, ...)`. A negative road allowance (driver owes money for road costs) is operationally nonsensical.
5. **Conditionally-required fields:** `fuelSupplementReason` is required when `fuelSupplementLiters > 0`. This validation lives in the shared Zod schema, enforced by both FE and BE.

#### Money Representation: Integer VNĐ via `number`
- VNĐ has no minor units. All monetary values are stored and computed as **integers**.
- Use JS `number` (NOT `BigInt`). `MAX_SAFE_INTEGER` is ~9×10¹⁵ VNĐ (~$360B) — four orders of magnitude above any realistic balance. `BigInt` breaks `JSON.stringify`, RHF, and Zod.
- **The string boundary:** Drizzle returns Postgres `numeric` as strings. We define a single explicit parse boundary using Zod `.transform(Number)` in `@nepocorp/shared` schemas. After that transform, everything operates on `number`. **Danger:** `revenue + fuelCost` on two strings produces concatenation. The Zod transform is the safety net.
- **Integer applies to money, not quantities.** Fuel liters (152.7 L) and kilometers are `numeric(10, 2)` decimals in the DB and `number` in TS.

#### Rounding Rule (`round2dp`)
- Financial rounding uses **round-half-up**.
- **Implementation:** Do NOT use naive `Math.round(x * 100) / 100` — this has the classic tie/representation bug (`1.005 * 100 → 100.4999…`). Use an explicit helper:
  ```typescript
  function round2dp(n: number): number {
    return Number(Math.round(parseFloat(n + 'e2')) + 'e-2');
  }
  ```
- Rounding is applied **per-leg** (each leg's liters rounded to 2dp), then legs are summed, then the final `totalFuelCost = Math.round(totalLiters * unitPrice)` produces an integer.
- This "round-then-sum" approach is documented and deterministic. Unit-test all `x.xx5` boundary cases.

#### Caching: No Redis for V1
- **Why not:** Catalog tables are dozens to low hundreds of rows. Redis adds operational overhead, failure modes, and cache-invalidation risk disproportionate to the benefit.
- **Alternative:** A single `GET /api/catalogs/bootstrap` endpoint returns all active reference data. The frontend caches it with **TanStack Query** (`staleTime: 5 * 60 * 1000`).
- **Invalidation:** After any catalog mutation (create/update customer, add truck, etc.), the frontend invalidates the `['catalogs']` query key to force a refetch — so a newly-added customer appears immediately on the create form.
- **Exclusion:** `pricing_tables` is NOT included in bootstrap (sensitive + potentially large). It is fetched on-demand during trip creation. The pricing lookup endpoint is **Manager/Accountant-only** — a driver must never reach it.

#### File Storage: Local MVP with Swappable Interface
- **`StorageService` interface** with a `LocalStorageService` implementation for MVP:
  - `upload(file, key): Promise<string>` — stores file, returns the key.
  - `getSignedUrl(key): Promise<string>` — resolves key to a URL.
  - `delete(key): Promise<void>`.
- **`trip_photos.storageKey` stores a relative key** (e.g., `trips/1234/seal-uuid.jpg`), NOT an absolute URL. Migrating to S3/R2/MinIO later requires zero DB changes.
- **Authenticated downloads:** `GET /api/photos/:id` checks role/ownership before serving. No `express.static()` on the upload directory.
- **Persistence:** The `UPLOAD_DIR` must be a persistent, backed-up volume outside the app directory. A nightly `rsync` or equivalent backup is mandatory since these photos are dispute-resolution evidence.

#### Upload Security
- `POST /api/upload` requires authentication (Manager/Accountant only).
- **Content validation:** Validate magic bytes (file header sniffing), not just `Content-Type` header (spoofable). Confirm the image actually decodes.
- **MIME allowlist:** `image/jpeg`, `image/png`, `image/webp`, `image/heic` (drivers often send HEIC from iPhones via Zalo). Server-side transcode HEIC → JPEG for storage.
- **EXIF handling:** Strip EXIF GPS/personal data before storage (privacy). Optionally preserve timestamps for evidence if needed.
- Max file size: 15MB (raw phone photos can exceed 10MB). Server-side downscale to normalize evidence size.
- Filename sanitization: UUIDs replace original filenames to prevent path traversal.

---

## 4. Database Table Design & Schema Definitions

### 4.1. `trips` (Master Record)
| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `tripCode` | `varchar` | Human-readable (e.g., "TRP-202605-0042"). Generated via `trip_code_counters` table (see §4.9). |
| `version` | `integer` | **Optimistic concurrency.** Starts at 1, incremented on every `PUT`. Client sends `version` in request; `WHERE version = ?` rejects stale writes with 409. |
| `customerId`, `truckId`, `driverId`, `routeId`, `trailerId`, `cargoTypeId` | `integer FK` | |
| `status` | `tripStatusEnum` | CREATED, IN_TRANSIT, COMPLETED, LOCKED, CANCELED |
| `departureDate` | `timestamptz` | Supports time windows for container schedules. Pin `Asia/Ho_Chi_Minh`. |
| **Inputs (User-entered)** | | |
| `fuelMode` | `fuelModeEnum` | AUTO or FLAT_RATE (labeled "KHOÁN" in UI) |
| `fuelLitersOverride` | `numeric(10,2)` | Used only when `fuelMode = FLAT_RATE` |
| `fuelSupplementLiters` | `numeric(10,2)` | Added in all modes |
| `fuelSupplementReason` | `text` | Required if supplement > 0 (enforced in shared Zod) |
| `tollsDiscount`, `tollsAddition` | `numeric(15,0)` | Integer VNĐ |
| `tollsStations` | `integer` | |
| `hasReturnCargo` | `boolean` | Adds `returnCargoBonus` VNĐ to road allowance |
| `driverSalary` | `numeric(15,0)` | Integer VNĐ. User input. |
| `revenue` | `numeric(15,0)` | Seeded from pricing, overridable by Accountant. |
| `revenueOriginal`, `revenueOverriddenBy`, `revenueOverriddenAt` | | Audit trail for revenue overrides |
| **Rate Snapshots (Captured at save time)** | | Snapshot every `computeTripTotals` input from mutable shared sources. |
| `fuelPriceApplied` | `numeric(10,0)` | VNĐ/liter at time of calculation |
| `roadAllowanceBaseApplied` | `numeric(15,0)` | Base amount from `road_allowances` at time of save |
| `fuelLoadedNormApplied` | `numeric(6,2)` | L/100km loaded norm snapshot |
| `fuelEmptyNormApplied` | `numeric(6,2)` | L/100km empty norm snapshot |
| `fuelFixedAllowanceApplied` | `numeric(10,2)` | [NEW] Mountain route fixed liters snapshot (from `routes.fixedFuelAllowance`) |
| `tollPerStationApplied` | `numeric(15,0)` | [NEW] Currently 55000. Snapshotted from `road_config` |
| `returnCargoBonusApplied` | `numeric(15,0)` | [NEW] Currently 300000. Snapshotted from `road_config` |
| **Derived Fields (Cache — authoritative only at LOCKED)** | | |
| `fuelLiters` | `numeric(10,2)` | Total liters after calculation |
| `totalFuelCost` | `numeric(15,0)` | `fuelLiters × fuelPriceApplied`, rounded |
| `totalRoadAllowance` | `numeric(15,0)` | From formula (clamped ≥ 0) |
| `totalCost` | `numeric(15,0)` | `fuelCost + roadAllowance + driverSalary` |
| `grossProfit` | `numeric(15,0)` | `revenue - totalCost` |
| **Audit** | | |
| `notes` | `text` | |
| `createdAt`, `updatedAt` | `timestamptz` | |
| `createdBy` | `integer FK → users` | |
| **Indexes** | | On `status`, `departureDate`, `driverId`, `customerId` |

### 4.2. `trip_legs` (Physical driving segments)
- **Route vs. Legs:** Route = billing lane (e.g., "Hải Phòng → Hà Nội"), used as key for `pricing_tables` and `road_allowances`. Legs = actual driving segments (port → factory A → warehouse B), used for granular fuel calculation. In FLAT_RATE/mountain modes, legs are still recorded for operational history but don't drive the fuel total.
- **Fields:** `tripId` (FK with `ON DELETE CASCADE`), `sequence`, `origin` (free text), `destination` (free text), `km` (`numeric(10,2)` — supports half-km legs), `loadingType` (HANG / VO), `calculatedLiters` (`numeric(10,2)` — `0` in non-AUTO modes).

### 4.3. `trip_photos` (Replaces jsonb array)
| Column | Type | Notes |
|---|---|---|
| `id` | `serial PK` | |
| `tripId` | `FK → trips` | |
| `type` | Enum: `CONTAINER` / `SEAL` / `OTHER` | |
| `storageKey` | `varchar` | Relative path. Resolved by StorageService. |
| `uploadedBy` | `FK → users` | |
| `uploadedAt` | `timestamptz` | |

**Completion photo requirement:** To transition `IN_TRANSIT → COMPLETED`, `trip_photos` must have **≥ 1 photo of any type**. For cargo types where `cargo_types.requiresPhotos = true`, we enforce **≥ 1 CONTAINER photo AND ≥ 1 SEAL photo** (the "Chè" rule). This is enforced at the data layer via a count query, not by convention.

### 4.4. `pricing_tables` (The Revenue Matrix)
- **Key:** `customerId × routeId`. *(Confirmed: price does NOT vary by cargo type or trailer type for this company.)*
- **Fields:** `customerId`, `routeId`, `price` (integer VNĐ), `effectiveDate`.
- **Price selection rule:** `MAX(effectiveDate) WHERE effectiveDate <= (trip.departureDate AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`. Timezone-pinned to prevent boundary mismatches between `date` and `timestamptz`.
- **Fallback:** If no matching row, `revenue` defaults to `0` and requires Accountant override.
- **Re-seeding:** If `departureDate` is edited into a different price period, `PUT /api/trips/:id` re-lookups the price and warns the Accountant if revenue would change.

### 4.5. `road_allowances` (Lookup — Base road cash)
- **Key:** `routeId × trailerType` (unique index). ~38 routes × 2 types = ~76 rows.
- **Fields:** `id`, `routeId` (FK), `trailerType` (20FT / 40FT), `baseAmount` (integer VNĐ), `createdAt`, `updatedAt`.
- Not effective-dated (rarely changes). The snapshotted `roadAllowanceBaseApplied` on `trips` protects locked trips from retroactive changes.

### 4.6. `road_config` (Global road constants)
- **[NEW table]** Stores the two mutable road allowance constants that `computeTripTotals` consumes:
  - `tollPerStation` (currently 55000 VNĐ)
  - `returnCargoBonus` (currently 300000 VNĐ)
- Single-row config table, like `fuel_config`. Accountant-editable. Snapshotted onto trips at save time.

### 4.7. `fuel_config` (Global fuel rates)
- **Fields:** `loadedNorm` (L/100km), `emptyNorm` (L/100km), `supplement` (L/trip), `unitPrice` (VNĐ/liter), `createdAt`, `updatedAt`.
- These are the current global rates. When saving a trip, the backend snapshots these values onto the trip's `fuelPriceApplied`, `fuelLoadedNormApplied`, `fuelEmptyNormApplied` columns so locked trips never retroactively change.

### 4.8. `ledger` (Immutable AR/Payable Tracker)
- **Scope:** Tracks operational debt (who owes whom). NOT a full P&L. Gross profit lives on the trip row. Driver payouts (settling accrued salary) are **out of scope for v1** — the ledger only accrues driver payables; actual payroll settlement happens outside this system.
- **Fields:** `id`, `txnType` (TRIP_REVENUE, DRIVER_SALARY, PAYMENT_RECEIVED, ADJUSTMENT), `sourceTripId` (FK → `trips`), `entityType` ('CUSTOMER', 'DRIVER'), `entityId`, `credit`, `debit`, `balance`, `note`, `timestamp`.
- **Sign Conventions:**
  - Customer `TRIP_REVENUE`: `debit` (increases their debt to us).
  - Driver `DRIVER_SALARY`: `credit` (increases what we owe them).
  - `ADJUSTMENT`: New compensating row; positive = debit note, negative = credit note.
- **Concurrency — Deadlock Prevention:** When locking a trip, two advisory locks are acquired (one for CUSTOMER, one for DRIVER). **Always acquire locks in a fixed global order** — sort by `(entityType, entityId)` before locking. This prevents `(C, D)` vs `(D, C)` deadlocks when two trips share entities. Integration test required.
- **Immutability:** `UPDATE` and `DELETE` privileges revoked at the Postgres role level.
- **Reconciliation:** A periodic check (cron or manual) performs two verifications:
  1. **Per-entity balance:** Recomputes `SUM(debit - credit)` vs. stored `balance` for each entity.
  2. **Trip↔ledger consistency:** Every `LOCKED` trip has exactly its expected postings (one TRIP_REVENUE + one DRIVER_SALARY, no duplicates, no missing).

### 4.9. `trip_code_counters` (Atomic code generation)
- **[NEW table]** Generates gap-free, per-month human-readable trip codes.
- **Fields:** `yearMonth` (varchar PK, e.g., "202605"), `counter` (integer).
- **Logic:** `INSERT INTO trip_code_counters(year_month, counter) VALUES (?, 1) ON CONFLICT (year_month) DO UPDATE SET counter = counter + 1 RETURNING counter`. Run inside the `createTrip` transaction.
- **Format:** `TRP-{yearMonth}-{counter zero-padded to 4}` → "TRP-202605-0042".

### 4.10. `audit_logs`
- **Fields:** `userId`, `action` (Enum: TRIP_CREATED, TRIP_UPDATED, STATUS_CHANGED, TRIP_LOCKED, FINANCIAL_EDIT), `message` (Vietnamese), `entityType`, `entityId`, `payload` (JSONB — stores **before/after diff** of changed fields, not full row), `createdAt`.
- **Execution model:** Audit writes are **synchronous and in-transaction** — the business change and its audit record commit together or neither does. The event-bus is used only for non-critical side-effects (e.g., notifications).

---

## 5. State Transition Matrix & Validations

| Current State | Target State | Allowed Roles | Validation Rules / Logic |
|---|---|---|---|
| `-` | `CREATED` | Manager | Creates record, snapshots rates, sets initial revenue. |
| `CREATED` | `IN_TRANSIT` | Manager, Accountant | Basic dispatch config present (truck, driver, route). |
| `IN_TRANSIT` | `COMPLETED` | Manager, Accountant | `trip_photos` must meet §4.3 photo requirements. |
| `COMPLETED` | `LOCKED` | Manager, Accountant | See Lock Procedure below. |
| `COMPLETED` | `IN_TRANSIT` | Manager, Accountant | Allowed for corrections before locking. |
| `CREATED` / `IN_TRANSIT` | `CANCELED` | Manager | Leaves historical trail. Financial fields zeroed. |

### Lock Procedure (COMPLETED → LOCKED)
The lock is the most critical transition. The procedure is:
1. **Read current status.** If `status === 'LOCKED'`, return **200** immediately (idempotent, no ledger post). This short-circuits before the conditional guard.
2. **Soft guard:** If `revenue === 0`, return **422** with warning "Doanh thu bằng 0. Vui lòng xác nhận." Unless the request includes `confirmZeroRevenue: true`. This prevents accidentally locking a trip where the accountant forgot to override the pricing fallback.
3. **Conditional guard:** `UPDATE trips SET status = 'LOCKED' WHERE id = ? AND status = 'COMPLETED'`. If 0 rows affected → **409 Conflict** (another request already changed the status).
4. **Ledger posts:** Inside the same transaction, acquire advisory locks in sorted `(entityType, entityId)` order, then insert CUSTOMER debit and DRIVER credit.
5. **Audit write:** In the same transaction.
6. **Commit.** Status flip + ledger inserts + audit = one atomic transaction. A partial commit (e.g., status = LOCKED but missing ledger row) must be impossible.

### Concurrency Guards
- **`PUT /api/trips/:id`:** Uses `version` integer (not `updatedAt`). Client sends current `version`; `UPDATE ... WHERE version = ?` rejects stale writes with 409.
- **`PATCH /api/trips/:id/status`:** Uses conditional `WHERE status = ?`. Prevents a reopen (`COMPLETED → IN_TRANSIT`) from racing a lock.

### Double-booking
A truck or driver being assigned to multiple `IN_TRANSIT` trips simultaneously is **allowed** for MVP (real-world scheduling prevents it). Formal resource reservation is deferred.

---

## 6. Required API Endpoints

### 6.1. Trip Mutations
- `POST /api/trips` — **Roles:** Manager. Creates trip. Snapshots all rate columns from `fuel_config`, `road_allowances`, and `road_config`. Looks up `pricing_tables` with effective date rule (timezone-pinned).
- `PUT /api/trips/:id` — **Roles:** Manager, Accountant.
  - **Status check:** Fails if `LOCKED` or `CANCELED`.
  - **Optimistic concurrency:** Compares `version` from request body against the DB row. If mismatch, returns 409.
  - Calls shared `computeTripTotals()` with snapshotted rates, saves derived fields. Increments `version`.
- `PATCH /api/trips/:id/status` — **Roles:** Manager, Accountant. Executes the state transition matrix (§5). Concurrency-guarded with conditional `WHERE status = ?`.

### 6.2. Ledger Correction
- `POST /api/ledger/adjustments` — **Roles:** Manager, Accountant. Creates a compensating `ADJUSTMENT` row. Mandatory `note` field. Used when a locked trip is later found to be incorrect.

### 6.3. Driver Endpoints (Dedicated, not shared)
- `GET /api/driver/trips` — **Roles:** Driver. Returns trips filtered by `driverId === currentUser.driverId`. Builds an allowlisted DTO from scratch (never SELECTs revenue/profit columns). The driver cannot read another driver's trips.
- `GET /api/driver/trips/:id` — **Roles:** Driver. Same ownership check and allowlisted DTO.

### 6.4. Utilities
- `POST /api/upload` — **Roles:** Manager, Accountant. Content-validated (magic bytes), HEIC-transcoded, EXIF-stripped, 15MB limit, UUID filenames. Returns storage key.
- `GET /api/photos/:id` — Authenticated download. Checks role and trip ownership before serving.
- `GET /api/catalogs/bootstrap` — **Roles:** All authenticated. Returns all active reference data. Excludes `pricing_tables`.
- `GET /api/pricing?customerId=X&routeId=Y` — **Roles:** Manager, Accountant only. On-demand pricing lookup for the create/edit form.

---

## 7. Frontend Component & RBAC Design

### 7.1. Driver Isolation (Allowlist, NOT Blocklist)
Driver data flows through **dedicated backend endpoints** (`/api/driver/trips`) that build the DTO from scratch. The driver receives:
- `tripCode`, `departureDate`, route origin/destination, `fuelLiters` (allocated), `totalRoadAllowance` (cash), trip status, `notes`.
- Sensitive columns (`revenue`, `grossProfit`, `totalCost`, `totalFuelCost`, `driverSalary`) are **never SELECTed** — not stripped after query, but never queried in the first place.

### 7.2. Accountant UI (`/trips/:id`)
- Uses `react-hook-form` with `useFieldArray` for trip legs.
- **`TotalsPanel`:** Calls the shared `computeTripTotals` function with snapshotted rates to display real-time totals as the accountant types. All math happens on `number` (post-Zod transform), never on strings.

### 7.3. Dashboard UI (`/trips`)
- **`TripListTable`:** Built with **TanStack Table** (headless). Profit indicators use **icons + color** (▲ green / ▼ red) for colorblind accessibility.
- **Catalog invalidation:** After any catalog mutation (add customer, update route, etc.), the `['catalogs']` query key is invalidated so fresh data appears immediately on the create form.

### 7.4. Driver Auth UX
- Phone number + PIN login (not email/password). Drivers are truck drivers; minimize friction. (Deferred to v2; MVP uses username/password.)
- PWA consideration: the driver schedule caches well for offline/poor-connectivity scenarios in transit. (Deferred to v2.)

---

## 8. Testing Strategy

### 8.1. Unit Tests (Priority Targets)
- **`computeTripTotals`** — Exhaustive tests covering: AUTO standard, AUTO mountain, AUTO mountain with `null` fixedAllowance (falls back to per-leg), FLAT_RATE, FLAT_RATE on a mountain route (FLAT_RATE wins), supplement in all modes, negative road allowance clamped to 0, `round2dp` boundary cases (`x.xx5`), 0 legs, 0 revenue.
- **State machine transitions** — Verify all legal/illegal transitions, idempotent lock (already-LOCKED → 200 with no ledger double-post), zero-revenue guard (422), and the read-first/then-guard ordering.
- **Zod schema transforms** — Verify that all `numeric` strings transform to `number` correctly, and that `fuelSupplementReason` is required when `fuelSupplementLiters > 0`.

### 8.2. Integration Tests
- **Ledger balance integrity** — Lock multiple trips for the same customer in parallel; verify final balance matches `SUM(debits - credits)`.
- **Deadlock prevention** — Lock two trips sharing entities (trip A: customer C + driver D, trip B: customer C + driver D) in parallel; verify no deadlock due to sorted lock acquisition order.
- **Rate snapshotting** — Create trip, change global fuel price / mountain allowance / road constants, re-save trip: verify the original snapshotted rates are used, not the new ones.
- **Lock atomicity** — Force a failure after the status update but before the ledger insert (mock); verify the entire transaction rolls back (status stays COMPLETED).
- **Optimistic concurrency** — Two concurrent PUTs with the same `version` → one succeeds, one gets 409.
- **Driver isolation** — Verify that `/api/driver/trips` never returns `revenue`, `grossProfit`, or `totalCost` in the response body, even for the driver's own trips.

---

## 9. Fuel Calculation Model (The Algorithm)

This is the math that `computeTripTotals` performs. It has three modes and one additive modifier.

### 9.1. AUTO Mode (Standard Routes)
```
For each leg:
  norm = (loadingType === 'HANG') ? fuelLoadedNorm : fuelEmptyNorm
  legLiters = round2dp(leg.km * norm / 100)

legsTotal = SUM(all legLiters)
totalLiters = round2dp(legsTotal + fuelPerTripSupplement + fuelSupplementLiters)
```
- `fuelLoadedNorm`: Currently 43 L/100km (configurable in `fuel_config`).
- `fuelEmptyNorm`: Currently 25 L/100km (configurable in `fuel_config`).
- `fuelPerTripSupplement`: Currently +3 L/trip (configurable). Applied once per trip in AUTO mode only.

### 9.2. AUTO Mode (Mountain Routes)
```
If isMountainRoute AND mountainFixedAllowance is not null:
  totalLiters = round2dp(mountainFixedAllowance + fuelSupplementLiters)
  // fuelPerTripSupplement is NOT added (the fixed allowance covers the entire round trip)
  // Legs are still recorded for operational history; legCalculations are set to 0

If isMountainRoute AND mountainFixedAllowance IS null:
  // FALLBACK: treat as standard AUTO (per-leg calculation above)
```
- Mountain fixed allowances: Mộc Châu 240L, Sơn La 320L, Lai Châu 365L (stored on `routes.fixedFuelAllowance`).

### 9.3. FLAT_RATE Mode (KHOÁN)
```
totalLiters = round2dp(fuelLitersOverride + fuelSupplementLiters)
// fuelPerTripSupplement is NOT added (accountant manually accounts for everything)
// Legs are recorded but legCalculations are set to 0
// FLAT_RATE takes precedence even if isMountainRoute = true
```

### 9.4. Three-Mode Truth Table

| Input | AUTO (Standard) | AUTO (Mountain) | FLAT_RATE |
|---|---|---|---|
| Legs → fuel calculation | ✅ Used | ❌ Ignored (recorded) | ❌ Ignored (recorded) |
| `fuelPerTripSupplement` (+3L) | ✅ Added | ❌ Not added | ❌ Not added |
| `fuelSupplementLiters` (breakdown/repair) | ✅ Added | ✅ Added | ✅ Added |
| `fuelLitersOverride` | ❌ Ignored | ❌ Ignored | ✅ Used as base |
| Source of base liters | `SUM(legLiters)` | `mountainFixedAllowance` | `fuelLitersOverride` |
| `legCalculations` output | Per-leg liters | All `0` | All `0` |

### 9.5. Cost & Profit Derivation
```
totalFuelCost      = Math.round(totalLiters * fuelUnitPrice)
                     // integer VNĐ

rawRoadAllowance   = roadAllowanceBase
                     - tollsDiscount
                     + tollsAddition
                     - (tollsStations * tollPerStation)
                     + (hasReturnCargo ? returnCargoBonus : 0)
totalRoadAllowance = Math.max(0, rawRoadAllowance)
                     // clamped to ≥ 0; negative road cash is nonsensical
                     // Code comment: "more toll stations → less road cash"
                     // because the company covers tolls via corporate accounts

totalCost          = totalFuelCost + totalRoadAllowance + driverSalary
grossProfit        = revenue - totalCost
```

---

## 10. Implementation Tasks (Prioritized)

### Phase 1: Foundation (Shared + Backend Core)
- [ ] **[SHARED]** Create `shared/src/calculations/tripTotals.ts` with `computeTripTotals` pure function.
- [ ] **[SHARED]** Create `shared/src/calculations/round.ts` with banker-safe `round2dp` helper.
- [ ] **[SHARED]** Add Zod `.transform(Number)` boundary for all monetary schema fields.
- [ ] **[SHARED]** Add conditional `fuelSupplementReason` required rule to shared Zod schema.
- [ ] **[SHARED]** Write exhaustive unit tests for `computeTripTotals` (all modes, edge cases, `round2dp` boundaries).
- [ ] **[BE]** Add new columns to `trips` schema: `tripCode`, `version`, `createdBy`, `roadAllowanceBaseApplied`, `fuelLoadedNormApplied`, `fuelEmptyNormApplied`, `fuelFixedAllowanceApplied`, `tollPerStationApplied`, `returnCargoBonusApplied`.
- [ ] **[BE]** Create `road_config` single-row table. Create `trip_code_counters` table.
- [ ] **[BE]** Add `effectiveDate` to `pricing_tables` schema.
- [ ] **[BE]** Create `trip_photos` table. Remove `photoUrls` jsonb from `trips`.
- [ ] **[BE]** Create `StorageService` interface + `LocalStorageService` implementation.
- [ ] **[BE]** Generate and run Drizzle migration (`pnpm db:generate && pnpm db:migrate`).

### Phase 2: Backend API
- [ ] **[BE]** Refactor `trip.service.ts` to call shared `computeTripTotals` instead of inline math.
- [ ] **[BE]** Implement full rate snapshotting in `createTrip` and `updateTripFigures` (all 7 snapshot columns).
- [ ] **[BE]** Implement `tripCode` atomic generation via `trip_code_counters` table.
- [ ] **[BE]** Replace `updatedAt` concurrency check with `version` integer on `PUT /api/trips/:id`.
- [ ] **[BE]** Implement the Lock Procedure (§5): read-first idempotency → zero-revenue guard → conditional WHERE → sorted advisory locks → ledger + audit in one txn.
- [ ] **[BE]** Create `LedgerService` with sorted `pg_advisory_xact_lock` for multi-entity deadlock prevention.
- [ ] **[BE]** Add `POST /api/ledger/adjustments` endpoint.
- [ ] **[BE]** Secure upload endpoint: magic-byte validation, HEIC transcode, EXIF strip, 15MB limit, UUID filenames.
- [ ] **[BE]** Create `GET /api/photos/:id` authenticated download route with ownership check.
- [ ] **[BE]** Create `GET /api/catalogs/bootstrap` batched endpoint.
- [ ] **[BE]** Create `GET /api/pricing` (Manager/Accountant only) with timezone-pinned effective date lookup.
- [ ] **[BE]** Build dedicated `/api/driver/trips` endpoints with allowlisted DTO (never SELECT sensitive columns).
- [ ] **[BE]** Expand audit logging: synchronous in-transaction, cover all mutations, store before/after diff.
- [ ] **[BE]** Implement photo completion requirements (§4.3): general ≥1 photo, and CONTAINER+SEAL for `requiresPhotos` cargo types.

### Phase 3: Frontend
- [ ] **[FE]** Install and configure TanStack Query + TanStack Table.
- [ ] **[FE]** Create `useCatalogs` hook with query invalidation after catalog mutations.
- [ ] **[FE]** Build `TripForm/` sub-components: `TripLegFields`, `FuelConfigurator`, `AllowanceConfigurator`, `TotalsPanel`, `PhotoUploader`.
- [ ] **[FE]** Wire `TotalsPanel` to call shared `computeTripTotals` reactively via `react-hook-form` `watch()`.
- [ ] **[FE]** Complete `TripCreatePage.tsx` with catalog dropdowns and on-demand pricing fetch.
- [ ] **[FE]** Complete `TripEditPage.tsx` with full accountant configuration form.
- [ ] **[FE]** Complete `TripListPage.tsx` with TanStack Table, status pills, profit indicators (▲/▼ + color).
- [ ] **[FE]** Complete `DriverTripsPage.tsx` and `DriverTripDetailPage.tsx` (mobile-first, allowlisted data only).
- [ ] **[FE]** Add optimistic concurrency error handling (409 → "Có người khác đã cập nhật chuyến này. Tải lại?").
- [ ] **[FE]** Add zero-revenue lock confirmation dialog (422 → "Doanh thu bằng 0. Xác nhận chốt?").

### Phase 4: Hardening
- [ ] **[BE]** Write integration tests for ledger concurrency (parallel locks on same entity).
- [ ] **[BE]** Write integration test for deadlock prevention (two trips sharing entities locked in parallel).
- [ ] **[BE]** Write integration test for lock atomicity (forced failure mid-transaction → full rollback).
- [ ] **[BE]** Write integration test for rate snapshotting (all 7 snapshot columns).
- [ ] **[BE]** Write integration test for driver isolation (verify no sensitive data in response).
- [ ] **[DB]** Revoke `UPDATE`/`DELETE` on `ledger` table at DB role level.
- [ ] **[OPS]** Configure persistent volume for `UPLOAD_DIR` and nightly backup cron.
- [ ] **[OPS]** Set up periodic ledger reconciliation (per-entity balance + trip↔ledger consistency).

---

## 11. Risks & Deferred Items

| Item | Decision | Rationale |
|---|---|---|
| Redis | **Deferred.** | Small dataset, single instance. TanStack Query handles client caching. |
| S3/Object Storage | **Deferred to v2.** | Local storage with `StorageService` interface makes migration trivial. |
| Driver photo upload | **Deferred to v2.** | MVP: Drivers send photos via Zalo → Accountant uploads. |
| Driver payout recording | **Out of scope v1.** | Ledger accrues driver payables; actual payroll settlement happens outside the system. |
| Truck/driver reservation | **Deferred.** | Real-world scheduling prevents conflicts. |
| PWA / offline mode | **Deferred to v2.** | Read-only trip data caches well, but service worker setup is non-trivial. |
| Phone + PIN auth | **Deferred to v2.** | MVP uses username/password. |
| `drizzle-zod` auto-generation | **Evaluate.** | May replace manually-maintained Zod schemas. |
| Full P&L in ledger | **Out of scope.** | Ledger tracks AR/payables only. Gross profit lives on the trip row. |
| Variable pricing | **Out of scope.** | Fixed price matrix per `PRODUCT-SPECS.md`. |

---

## 12. E2E Acceptance Criteria

### Happy Path
- [ ] Manager creates a trip → `tripCode` is auto-generated (gap-free per month), revenue is populated from `pricing_tables`, status is `CREATED`, all 7 rate snapshots are captured.
- [ ] Accountant adds trip legs (AUTO mode) → `TotalsPanel` shows correct fuel liters, fuel cost, road allowance, total cost, and gross profit in real-time.
- [ ] Accountant switches to KHOÁN mode → total liters switch to `fuelLitersOverride` + supplement; per-leg calculations show `0`.
- [ ] Manager transitions to `IN_TRANSIT` → Driver logs into mobile, sees ONLY: trip code, dates, origin/destination, fuel liters, and road cash. No revenue, profit, cost, or salary data.
- [ ] Accountant uploads photos → trip can transition to `COMPLETED`. Tea cargo requires both CONTAINER and SEAL photos.
- [ ] Manager locks the trip (`COMPLETED → LOCKED`) → Ledger has one `TRIP_REVENUE` debit for the Customer and one `DRIVER_SALARY` credit for the Driver. Running balances are correct. `version` is incremented.
- [ ] Locked trip cannot be edited via `PUT` (returns 403/409).

### Edge Cases
- [ ] Locking an already-locked trip returns **200** (idempotent short-circuit before conditional guard) without double-posting to ledger.
- [ ] Two accountants editing the same trip concurrently → second save gets **409** (version mismatch).
- [ ] A `COMPLETED → IN_TRANSIT` reopen racing a `COMPLETED → LOCKED` lock → one succeeds, the other gets **409** (conditional status guard).
- [ ] Global fuel price changes after a trip is saved → re-opening the trip still uses the snapshotted `fuelPriceApplied`, not the new global price. Same for mountain allowance and road constants.
- [ ] Mountain route trip → fuel calculation uses `fuelFixedAllowanceApplied`, ignores per-leg math.
- [ ] Mountain route with `null` fixed allowance → falls back to standard per-leg AUTO calculation.
- [ ] FLAT_RATE on a mountain route → FLAT_RATE takes precedence; mountain logic is ignored.
- [ ] Negative road allowance scenario (high toll discount) → clamped to `0`.
- [ ] No matching price in `pricing_tables` → revenue defaults to `0`. Locking with revenue `0` returns **422** unless explicitly confirmed.
- [ ] Trip canceled from `IN_TRANSIT` → financial fields zeroed, historical record preserved, no ledger entry created.
- [ ] Two trips sharing the same customer and driver locked in parallel → no deadlock (sorted lock acquisition).
