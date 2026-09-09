# Route Fixed-Fuel Allowance — Live Fallback in `updateTripFigures`

**Date**: 2026-09-09
**Customer message**: "Anh ơi phần tuyến đường Lai Châu đã mặc định số lít dầu trên hệ thống là 378l, trên phần đi đường thì hiện đúng là 378l tuy nhiên hệ thống mà phân bổ dầu chỉ lên số dầu tính Km thôi ạ, Em không lưu được. Giờ muốn lưu thì phải điều chỉnh số km tăng lên để đúng số l dầu đó ạ."

**Bug ID**: BUG-REG-012 (`docs/qa/regression-test-plan.md`)
**Component**: Backend — `updateTripFigures` in `backend/src/services/trip-mutations.service.ts`
**Status**: Resolved (red→green against synced prod DB)

## Summary

A trip created while its route had no `fixed_fuel_allowance` carries a
0-valued `fuelFixedAllowanceApplied` snapshot. When ops later sets a fixed
allowance on the route (e.g. Lai Châu → 378L) and the user tries to save
the trip with an allocation that matches the new route value, the backend's
`assertFuelAllocationTotal` rejects with "Tổng phân bổ dầu (378 lít) phải
bằng tổng dầu chuyến (331 lít)" because the trip total is computed from
per-km norms (snapshot=0 → `mountainFixedAllowance: null` in
`computeTripTotals`). The user is forced to inflate km artificially to
make the per-km norm reach 378L — a workaround that corrupts trip data.

## Root cause

`updateTripFigures` resolves `fuelFixedAllowanceApplied` from
`trip.fuelFixedAllowanceApplied` and re-fetches from the route ONLY when
the route is changed (`data.routeId !== trip.routeId`). In the same-route
branch it reads the route from the DB but never re-derives the allowance
from it. This is asymmetric with the other snapshotted rates (fuel/road
config, road-allowance base), which all have a live-fallback for
uncommitted trips.

## Fix

Added a pure helper `resolveFuelFixedAllowanceApplied(snapshot,
liveRouteValue, tripStatus)` that mirrors the B3/D4 invariant: re-read
from the live route only when the trip is uncommitted and the snapshot is
0. Committed trips (IN_TRANSIT / COMPLETED / LOCKED) keep their snapshot
so historical P&L is never silently rewritten.

Wired into the same-route branch of `updateTripFigures` (line 660 area):

```ts
if (existingRoute) {
  fuelFixedAllowanceApplied = resolveFuelFixedAllowanceApplied(
    fuelFixedAllowanceApplied,
    Number(existingRoute.fixedFuelAllowance || 0),
    (trip.status ?? TripStatus.CREATED) as TripStatus,
  );
}
```

The route-change branch already used the new route's value (line 646) —
unchanged, because that path is the user explicitly choosing a different
route.

## Test plan

### Unit (pure, no DB) — `backend/src/tests/route-fixed-fuel-allowance-helper.test.ts`

| Case | Snapshot | Live route | Expected |
|------|----------|------------|----------|
| 1 | 0 | 378 | 378 (Lai Châu repro) |
| 2 | 240 | 378 | 240 (snapshot wins) |
| 3 | 0 | 0 | 0 (no-op) |
| 4 | 0 | 378 | 378 (works for COMPLETED — trip 229 confirmation) |

### Integration (synthetic) — `backend/src/tests/route-fixed-fuel-allowance-live-fallback.test.ts`

| Case | Repro | Expected |
|------|-------|----------|
| A | Route 0, create CREATED trip snapshot=0; set route 378; call updateTripFigures with 378L allocation | `trips.fuel_liters=378.00`, `fuel_fixed_allowance_applied=378.00`; allocation persisted |
| B | Route 0, allocation = per-km total 331L | `trips.fuel_liters=331.00`; allocation persisted |
| C | Snapshot=240, route later set to 378, trip COMPLETED | Snapshot wins: `trips.fuel_liters=240.00`, `fuel_fixed_allowance_applied=240.00` (B3/D4 anchor preserved) |

### Live-DB customer repro — `backend/src/tests/customer-trip-229-live-repro.test.ts`

| Case | Repro | Expected |
|------|-------|----------|
| D | **Trip 229** (synced prod): COMPLETED, route 40 (378L), snapshot=0, fuel_liters=338, supplement=4. Call `updateTripFigures` with 382L allocation. | `trips.fuel_liters=382.00`, `fuel_fixed_allowance_applied=378.00`, `fuel_supplier_id=10` (Petrolimex), allocation row persisted. Test restores trip to original state in `after`. |

### Manual (post-deploy on demo)

1. Open trip 229 (or the equivalent trip on the customer demo).
2. Confirm "Phân bổ nơi đổ dầu" can save with 382L.
3. Confirm `trips.fuel_liters` updates to 382 (not 338).
4. Open a different trip on the same route whose snapshot is 0 and
   whose `fuel_liters` is per-km (e.g. trip 105 / 104 / 103) — confirm
   the same fix applies (they should also be able to save 382L).
5. Find a trip that WAS created with a real fixed allowance (snapshot>0)
   — confirm it is NOT silently rewritten when the route is later
   updated (B3/D4 anchor).

## Verification commands

```bash
cd backend
npx tsc --noEmit
npx tsx --test \
  src/tests/route-fixed-fuel-allowance-helper.test.ts \
  src/tests/route-fixed-fuel-allowance-live-fallback.test.ts \
  src/tests/customer-trip-229-live-repro.test.ts
pnpm test   # full suite — must stay 805/806 green (1 pre-existing chiho failure)
```

## Risk

- **Silent recost for trips with snapshot=0**: yes, by design. The 0
  snapshot is missing data, not a real historical value. The route is
  the source of truth. A non-zero snapshot is preserved.
- B3/D4 freeze (`applyCommittedLegacyFuelFreeze`) untouched: legacy
  trips with all-zero fuel price + loaded norm + empty norm are still
  pinned to stored values. The new helper only affects
  `fuelFixedAllowanceApplied` and cannot mask a missing fuel price.
- Route-change branch (line 646) untouched — user-initiated route
  change has always overridden the snapshot, no behavior change.
- Other live fallbacks (fuel/road config, road-allowance base) untouched.
