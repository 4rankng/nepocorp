# Route Fixed-Fuel Allowance — Live Fallback in `updateTripFigures`

**Date**: 2026-09-09
**Severity**: High (blocks saving any trip whose route gained a fixed fuel allowance after trip creation)
**Component**: Backend — `updateTripFigures` in `backend/src/services/trip-mutations.service.ts`
**Status**: Resolved (tested against synced prod DB)

## Customer Request

Ngọc Ánh (via Zalo, 2026-09-09 17:04): the route "Lai Châu" has a default
fixed fuel allowance of 378L configured on the route, and the "đi đường"
section shows the correct 378L — but the "Phân bổ nơi đổ dầu" panel can
only enter the per-km-calculated value (~331L), so saving the trip fails.
Workaround: inflate km until the per-km total reaches 378L, which
corrupts the trip's leg data.

## Durable Decisions

- The invariant — re-read live route config when the trip's snapshot is
  missing — is enforced at the **trip-mutation** layer, in one place.
  This matches the existing live-fallback pattern for `fuelConfig` /
  `roadConfig` / `roadAllowances` (see comment block at
  `trip-mutations.service.ts:718-746`).
- Committed trips (IN_TRANSIT / COMPLETED / LOCKED) keep their snapshotted
  value. Silently rewriting a committed trip's allowance would recost
  stored P&L (B3 / D4 invariant — see `b3-committed-legacy-fuel-freeze.test.ts`).
- The route-change branch (line 646 area) was already correct: when the
  user explicitly changes the route, the new route's `fixedFuelAllowance`
  always wins. The fix targets only the **same-route** branch.
- Pure helper, no DB, no I/O. Co-located with the other pure helpers
  (`applyCommittedLegacyFuelFreeze`, `resolveRevenue`,
  `assertCustomerCommissionWithinRevenue`).

## Root Cause

`updateTripFigures` resolved `fuelFixedAllowanceApplied` from
`trip.fuelFixedAllowanceApplied` and re-fetched from the route ONLY when
`data.routeId !== trip.routeId`. In the same-route branch the trip's
snapshot stayed at 0 (the value captured when the route had no fixed
allowance), so `mountainFixedAllowance` resolved to `null` in
`computeTripTotals` and the per-km norm (487×0.43 + 487×0.25 = 209+122
+ 4 supplement = 338L) became the trip total. The allocation editor's
382L then failed `assertFuelAllocationTotal` with the exact 400 message
the customer saw:
"Tổng phân bổ dầu (382 lít) phải bằng tổng dầu chuyến (338 lít)".

This was asymmetric with the other snapshotted rates (fuel/road config,
road-allowance base) which all have a live-fallback.

## Initial fix (CREATED-only) — REVERTED

First attempt scoped the live-fallback to uncommitted trips only (B3 / D4
invariant). Live-DB probe on the actual customer trip **trip 229**
(synced prod, status=COMPLETED) still failed with the same 400 because
COMPLETED is committed. The B3/D4 invariant was the wrong framing here:
the snapshot is **0** (missing), not a real historical value worth
preserving. A 0 snapshot means "we don't have this info", not "the trip
was costed at 0".

## Final fix (status-agnostic)

`backend/src/services/trip-mutations.service.ts`:

1. Pure helper `resolveFuelFixedAllowanceApplied(snapshot, liveRouteValue)`
   — returns `snapshot` whenever it is > 0 (preserved across all statuses,
   including committed; the snapshot IS the B3/D4 anchor when it
   represents a real value). Returns `liveRouteValue` when `snapshot = 0`
   (the route is the source of truth).
2. Same-route branch (line 689) now invokes the helper with the freshly
   read route's `fixed_fuel_allowance` value. This applies regardless of
   trip status.

Live-DB confirmation: trip 229 (COMPLETED, route 40, snapshot=0, route's
378L, fuel_liters=338, supplement=4 → desired 382L) now saves with a
382L allocation cleanly: `fuel_liters=382`, `fuel_fixed_allowance_applied=378`,
allocation row persisted. Test restores the trip to its original state
(fuel_liters=338, snapshot=0, no allocations, original version) in `after`.

## Non-regression guarantee

- **Non-zero snapshot preserved.** When a trip was created with a real
  allowance (e.g. 240L) and the route is later updated to 378L, the
  trip's stored 240 wins. Test: 240→378 returns 240. This is the
  B3/D4 anchor in its right form: the snapshot is a real value worth
  preserving.
- **B3/D4 "all-0" freeze untouched.** `applyCommittedLegacyFuelFreeze`
  still pins fuel cost / litres to stored values for legacy trips whose
  price + loaded norm + empty norm snapshots are ALL 0 (the
  irrecoverable case). The new helper only deals with
  `fuelFixedAllowanceApplied`; it cannot mask a missing fuel price.
- **Route-change branch unchanged.** User explicitly changing the route
  always takes the new route's value (line 646 area).

7 unit cases + 3 integration cases all pass. Demo verification: open the
specific Lai Châu trip, enter 378L into the fuel-allocation panel, save
succeeds.

## Notes for Next Time

- **Asymmetry test idea:** every `trips.*Applied` snapshot column should
  be checked for a matching live-fallback in `updateTripFigures`. Today
  only `fuelFixedAllowanceApplied` was missing. A future regression sweep
  could be: for each `*Applied` column, write a test that creates a
  CREATED trip with snapshot=0 and verifies the live value flows through.
- **B3/D4 invariant lives in the helper**, not the call site. Keep all
  future live-fallbacks behind a similar pure helper to preserve the
  invariant: committed trips never re-read live.
- Repro log: when a customer reports a fuel-allocation-vs-trip-total
  mismatch, the first question is "when was the route's `fixedFuelAllowance`
  set relative to the trip's creation date?" If after → bug reproduces
  pre-fix.
