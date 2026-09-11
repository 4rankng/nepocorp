---
phase: 1
title: "Shared & Backend — schema, types, totals, save path, ledger"
status: completed
priority: P1
effort: "1 day"
dependencies: []
---

# Phase 1: Shared & Backend

## Overview

Make the persistence + calculation layer support per-purchase allocation rows: multiple rows per counterparty, optional per-row `unit_price`, totals as Σ row amounts when priced, and per-row ledger payables. Legacy rows (null price) keep byte-identical behavior.

## Requirements

- Multiple allocation rows per counterparty persist and validate.
- Each row carries optional `unitPrice` (VND/lít); row amount = `round(liters × (unitPrice ?? trip effective price))`.
- `totalFuelCost` = Σ row amounts when ANY row priced; legacy single-multiply otherwise.
- Ledger FUEL_EXPENSE per row at its own price; legacy fallback untouched.
- EXTERNAL trips still reject allocations (422 + zod refine unchanged).

## Architecture

```
zod tripFuelAllocationsSchema (+unitPrice optional)
  → updateTripFigures: fuelAllocations resolution (order preserved)
      → computeTripTotals({..., fuelAllocations})     ← new optional input
          anyRowPriced → totalFuelCost = Σ round(liters × (row.unitPrice ?? effective))
                       → fuelPriceVariance = Σ liters×(rowPrice − snapshot)
          else → legacy single multiply (byte-identical)
      → applyCommittedLegacyFuelFreeze (untouched, runs after)
      → assertFuelAllocationTotal (liters-only, unchanged)
      → delete+reinsert rows (now with unitPrice)
  → GET assembly site returns unitPrice per row
  → LedgerService.postTripLock/Unlock → resolveFuelAllocationCosts (per-row price)
```

## Related Code Files

- Create: `backend/src/db/migrations/XXXX_*.sql` (drizzle-kit generate)
- Modify:
  - `backend/src/db/schema.ts` (drop 2 unique indexes, add `unit_price`)
  - `shared/src/types/index.ts` (`TripFuelAllocation.unitPrice: string|null`, `TripFuelAllocationInput.unitPrice?: number|null`)
  - `shared/src/schemas/index.ts` (`tripFuelAllocationsSchema` + `unitPrice` optional nullable)
  - `shared/src/calculations/tripTotals.ts` (priced-rows branch)
  - `backend/src/services/trip-mutations.service.ts` (persist unitPrice; pass allocations into totals; fallback maps carry unitPrice)
  - `backend/src/services/ledger.service.ts` (`resolveFuelAllocationCosts` per-row price)
  - GET assembly site (grep `tripFuelAllocations` select/join sites that build `TripFuelAllocation[]` — e.g. trips detail route/service; add unitPrice to the select + shared type)
- Tests:
  - `shared/src/calculations/tripTotals.test.ts` (or the existing calc test file — locate)
  - `backend/src/tests/trip-ledger-completion.test.ts` (or new `fuel-multi-price.test.ts`)
  - `shared/src/schemas/updateTripFiguresSchema.test.ts`

## Implementation Steps

1. **DB backup** (rule: backup before schema change): `docker exec tingting-db pg_dump -U postgres tingting > /tmp/tingting_pre_fuel_multi_price_$(date +%Y%m%d_%H%M).sql`
2. Migration via `npx drizzle-kit generate` then verify the SQL = `ALTER TABLE trip_fuel_allocations ADD COLUMN unit_price numeric(12,2); DROP INDEX IF EXISTS trip_fuel_allocations_supplier_once_idx; DROP INDEX IF EXISTS `trip_fuel_allocations_cash_once_idx`;` (adjust numeric spec to mirror `trips.fuel_actual_unit_price`; IF EXISTS is belt-and-braces)
3. `schema.ts`: remove the two uniqueIndex entries (383-388); add `unitPrice: numeric('unit_price', { precision: 12, step... })` mirroring `trips.fuelActualUnitPrice` spec. Keep liters/paymentMethod/counterparty checks untouched.
4. Shared types: `TripFuelAllocation.unitPrice: string | null`; `TripFuelAllocationInput.unitPrice?: number | null` + re-export via shared barrel (TS2724 guard — [[shared-re-export-barrel]]).
5. Zod: extend `tripFuelAllocations refine...` — careful: `shared/src/schemas/index.ts:262-266` has EXTERNAL refine; extend `tripFuelAllocationsSchema` with `unitPrice: z.number().positive()...` optional nullable. Lock EXTERNAL-reject test in `updateTripFiguresSchema.test.ts`.
6. `computeTripTotals`: add optional `fuelAllocations?: Array<{liters: number; unitPrice: number | null}>` to `ComputeTripTotalsInput`; gate: rows present AND ≥1 non-null `unitPrice` → Σ branch; else legacy. Document gate in JSDoc.
7. `updateTripFigures`: pass `data.fuelAllocations` into `totalsInput.fuelAllocations` (map to {liters, unitPrice}); the legacy fallback branches (trip-mutations.service.ts:922-946) must carry `unitPrice` when re-mapping `existingFuelAllocations` (932-937) so a save that omits allocations keeps priced rows' totals consistent.
8. Persist: insert maps `unitPrice != null ? String(unitPrice) : null`; GET assembly site adds unitPrice; `primaryFuelSupplierId` stays first CREDIT row's supplier.
9. Ledger `resolveFuelAllocationCosts`: gate on any-row-priced → per-row `Math.round(liters × (row.unitPrice priced... ` → no last-row-absorb needed when priced (Σ credit = Σ credit rows; when all rows priced AND all-credit, equals totalFuelCost by same-formula construction); legacy path byte-identical. Verify postTripLock args (trip-mutations.service.ts:1069+) pass rows incl. unitPrice — postTripUnlock re-selects DB rows (includes new column automatically).
10. Shared tests via tsx; backend integration test for the 2-supplier 2-price save → totals + row persistence + ledger posting.

## Success Criteria

- [ ] Migration applies cleanly (dev), `drizzle-kit` journal consistent (see [[drizzle-migrate-timestamp-not-hash]]).
- [ ] AC1/AC2/AC3 save paths green (backend test).
- AC4: legacy-path regression test: null-price rows → totals/ledger identical to current outputs.
- [ ] `npx tsc --noEmit` clean (backend); shared tsx tests pass; backend `npm test` (fuel-scoped files) pass.
- [ ] Re-export barrel updated (no TS2724).

## Risk Assessment

- Migration numbering/journal desync risk: use drizzle-kit generate (never hand-write journal); verify pending-migration state via `npx drizzle-kit migrate` in dev; the [[drizzle-migrate-skips-stale-when]] starvation gotcha applies to prod — verify journal `when` values monotonic.
- The fallback-maps-carry-unitPrice step (7) is subtle: if missed, "save without allocations section" silently drops prices. Signal it broke: after a save that omits `fuelAllocations` from the payload, edit page shows rows without prices. Response: fix the fallback map to carry unitPrice and add a test locking it.
- postTripLock receives pre-save `existingFuelAllocations` (trip-mutations.service.ts:1051-1067 shows postTripUnlock gets existing; postTripLock args unseen at 1069+) — pre-decided response: read the call site; if it passes stale rows, pass the newly-saved rows instead (or re-select within the transaction).
- Shared calc changes: `computeTripTotals` is consumed by 8+ sites (reconcileTrips, seedTrips, main) — the optional-input + gated branch keeps legacy behavior; shared tsx tests + backend integration tests are the net.
