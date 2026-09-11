# Implementation Report — Fuel allocation multi-price (per-purchase rows + row unit price)

Plan: `plans/260911-1338-fuel-allocation-multi-price/` · Implemented 2026-09-11 (cook --auto) · Status: COMPLETE — implemented, E2E-verified in local dev; code review closed (impl-review verdict: DONE, "production-ready from a review standpoint").

## What shipped

**Feature:** a trip can record multiple refuel purchases per supplier/cash counterparty, each with its own pump price. Answers the customer question: *"chuyến đổ dầu 2 lần, mỗi lần một giá thì nhập thế nào?"*

- **DB (migration 0117):** `trip_fuel_allocations.unit_price numeric(12,2)` added; both one-row-per-counterparty unique indexes dropped. Additive; DB backed up to `/tmp/tingting_pre_fuel_multi_price_20260911_1410.sql` before migrating.
- **Totals:** `computeTripTotals` gains an optional `fuelAllocations` input; when any row carries a price, `totalFuelCost = Σ round(liters × (row.unitPrice ?? trip effective price))` and variance = Σ liters × (rowPrice − snapshot). Unpriced (legacy) trips keep the single-multiply path byte-identically (35/35 shared calc tests pass).
- **Save path:** rows persist `unitPrice`; the "patch without allocations" fallback re-maps saved rows INCLUDING prices so totals stay consistent; `postTripLock` args carry unitPrice.
- **Ledger:** `resolveFuelAllocationCosts` priced branch posts one FUEL_EXPENSE per purchase at its own price (legacy derived-price/last-row-absorb path untouched).
- **Voucher (phiếu cấp nhiên liệu):** per-purchase line items (liters × price = amount, "lần 1/lần 2"); total = Σ; "Giá áp dụng" footer only when uniform price; legacy trips keep the single-line voucher. HTML + XLSX.
- **Statement service:** supplier allocation join replaced with a scalar-subquery SUM — prevents join fan-out now that a supplier can have several rows per trip.
- **Zod:** per-row `unitPrice` (positive, ≤1e9 sanity cap, nullable/optional); counterparty-dedupe superRefine deliberately REMOVED (multi-row is the feature; the old uniqueness lived in the dropped DB indexes).
- **Frontend:** price input per enabled row (placeholder "Giá chuyến"), + "Thêm lần đổ" button per enabled row, × on extra rows only; normalizeFuelAllocationRows rewritten to multi-row merge (first saved row per counterparty merges into its catalog slot; 2nd+ rows kept as extras; empty drafts kept so the + button works, submit payload filters liters>0); sameRows includes unitPrice; FuelCard shows `N L × price = amount` per purchase; hint copy in FuelSection.

## Verification evidence

| Gate | Result |
|---|---|
| shared calc tests (tripTotals + 4 new priced tests) | 35/35 ✅ |
| zod schema tests (updateTripFiguresSchema + 2 new multi-row tests, 1 flipped uniqueness test) | 19/19 ✅ |
| backend integration `fuel-multi-price.test.ts` (same-supplier-twice: totals + rows + per-purchase ledger; fallback-patch preserves prices) | 2/2 ✅ |
| trip-ledger-completion suite (legacy invariance incl. voucher) | 14/14 ✅ |
| backend full `npm test` | green except `ledger.service.chiho.test.ts` "PENDING fee" — **reproduces on pristine main (verified via git stash)**, pre-existing, unrelated |
| frontend vitest touched scope (editor 13, form-state, submit, dispatch-utils) | 22/22 ✅ |
| backend tsc, frontend tsc, vite build | ✅ |
| E2E local dev (API + browser): created trip 369 → saved Petrolimex 60 L @ 27,000 + 40 L @ 28,000 → totalFuelCost 2,740,000; rows persisted with prices; edit page shows 2 priced rows + working + button (screenshot `/tmp/fuel-multi-price-ui.png`); voucher HTML shows 2 line items "lần 1/lần 2" with per-line prices; disposable trip deleted after | ✅ |

## Red-team / review status

- 3 red-team reviewers were launched at the plan gate; the user chose to implement without waiting (cook --auto). The one plan gap I found while scouting (zod counterparty-dedupe superRefine would have rejected multi-row payloads — the plan missed it) was found and fixed during implementation.
- impl-review (code-reviewer) reviewing the diff now — findings will be applied/reported when it returns.

## Dev-environment notes (important for the user)

- The 12:32 `trap kill 0` dev stack had a **stuck watcher** (system-wide file-watch exhaustion — same root cause as the codegraph "watch limit" notice): tsx watch never reloaded backend code and Vite served stale transforms, so I killed it and restarted both servers as tracked background processes (backend tsx watch on 3090 + Vite on 7173 — mine, running now).
- The dev servers now run the NEW code. If you restart your own `make dev` stack later, stop my background processes first (port conflict), or just keep mine.

## Unresolved questions

- None for the feature. Open user decisions: commit/deploy timing, and whether to keep my restarted dev servers or switch back to your own stack.

## Red-team adjudication (2026-09-11, after implementation)

3 plan reviewers returned 21 raw findings (15 unique). Dispositions (full table in the plan's Red Team Review section):

- **Already handled during implementation** (found independently while scouting): zod dedupe refine removal (rt-sec F1 Critical), use-trip-form-submit payload mapping (F3), postTripLock unitPrice map + TripLedgerParams (F5), statement fan-out (F2), unitPrice sanity cap (F13).
- **Fixed after adjudication**, each with a regression test: freeze × priced-rows now rejected 422 on snapshot-missing committed trips; fuelSupplierId-only saves no longer wipe priced rows; FuelCard voucher buttons deduped per supplier; voucher lines ordered by id; TotalsPanel live preview now mirrors Σ-row totals; + button disabled at the 10-row cap.
- **Deploy-runbook requirement (user action):** because deploy swaps the backend container before `drizzle-kit migrate` runs, **migrate must be run via a one-off container BEFORE `up -d`** (old image + migrated DB is safe; the reverse 500s). Applies to this migration (0117) and the Sep-7 fix deployment.
- **Deferred/open for user:** statement fuel lines show trip-level price rather than per-row (cosmetic approximation); DRIVER-role visibility of per-supplier prices (pre-existing GET already returns liters/prices to any authenticated user — strip or accept).
- All gates re-run green after fixes: backend 5/5 fuel tests, shared 36/36 + 19/19, frontend 22/22, tsc ×2, vite build, check:ui at baseline.

## Final review round (impl-review, applied 2026-09-11)

impl-review's pass found 2 blocking test defects, 1 docs defect, 2 display gaps. All resolved:

- **TotalsPanel.test.tsx mock** lacked `fuelAllocations` after the preview wiring → added, 2/2 green.
- **fuel-multi-price.test.ts** expected-array typo + missing `as const` — fixed during the red-team round (reviewer snapshot predated it); verified 5/5 + tsc clean.
- **Regression register entry** was appended after the table with a reused ID → moved into the table as **BUG-REG-013** (next sequential; my 008 guess was wrong — 012 was the tail).
- **Voucher unpriced multi-row**: a supplier with several unpriced rows now aggregates Σ liters on one line at the trip effective price (previously showed only the first row).
- **FuelCard price-0 display**: legacy sentinel trips no longer render "L × 0 = 0 ₫" — liters only when no price applies.
- Cosmetic: duplicated test header comment removed.

Final gates: backend tsc ✅ · fuel 5/5 · shared calc 36/36 · zod 19/19 · frontend tsc ✅ · TotalsPanel+editor vitest 15/15 · vite build ✅ · check:ui at baseline. Deferred items unchanged: statement per-row price display, DRIVER price-visibility decision.
