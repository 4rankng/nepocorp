# Fuel Allocation Rows Vanish on Trip Edit (Reseed Race)

**Date**: 2026-09-07
**Severity**: Medium
**Component**: Trip form — Phân bổ nơi đổ dầu (FuelAllocationEditor)
**Status**: Resolved (undeployed)

## Customer Request

Customer (via screenshot + "Nó chẳng ra bên nào đổ ý anh, có hiện thị bên
ngoài đổ tiền mặt thôi" / "dont see the list"): the "Phân bổ nơi đổ dầu"
section showed only "Cây dầu ngoài" (cash row) — the fuel-supplier rows
(Petrolimex / Long Hưng) never rendered when editing a trip.

## Durable Decisions

- The invariant is enforced at the UI layer, in **one place**: the editor's
  normalize effect re-fires on any row-key change (`rowKeys` dep), so any
  reseed — trip load, navigation between trips, 409-refetch reset — re-merges
  the catalog standard rows. The reseed writer (`useTripFormDispatch`) stays
  decoupled from the supplier catalog.
- Rows are keyed client-side (`fuel-supplier-N` / `fuel-outside` / `legacy-N` /
  saved allocation id) and never leave the client; the save payload only sends
  `{supplierId, liters, paymentMethod}` and the backend re-inserts allocations,
  so re-keying is contract-free.
- Merge is additive from empty standard rows (`liters: ''` rebuilt each
  normalize pass), which makes normalize idempotent and doubling impossible.

## Root Cause

Edit-mode trip load (`useTripFormDispatch.ts:191`) reseeds
`form.fuelAllocations` with saved-only rows **after** the editor had already
normalized (bootstrap cached → catalogs instant; trip query resolves later).
The normalize effect's deps `[setFuelAllocations, fuelSuppliers]` don't change
on reseed → supplier rows silently dropped. Reproduced live on demo trip 275.

**The dep-array fix alone was NOT enough**: the production build kept failing
while vite dev passed. Instrumented prod-build runs proved the repair effect
and the reseed write raced inside React's update batching — the updater
computed the restored rows (`changed=true`) but the reseed's cash-only write
landed last in every batch. The durable fix normalizes **at the reseed write
site** (`useTripFormDispatch`), via the new shared `fuelAllocationRows` module;
the editor's effect is now just a safety net.

## Fix

`FuelAllocationEditor.tsx`: normalize effect also depends on `rowKeys`
(joined row `_key`s). One dep, +6/-2 lines. Test added locking the reseed merge
shapes. Full frontend suite 302/302 green; verified visually in local dev
(edit + create flows, liters typing, no doubling).

## Notes for Next Time

- **When a form section derives state from a catalog AND the form is reseeded
  from saved data, normalize at the reseed write site — a repair-after-reseed
  effect can lose the race inside React's update batching, and the failure
  only reproduces on the production build.** Guard: `FuelAllocationEditor.test.ts`
  reseed test + prod-build (vite preview) check of the edit page.
- Regression register created: `docs/qa/regression-test-plan.md` (BUG-REG-001
  … 010) — run before deploys; append every fixed bug as a new case.
- Demo + prod DBs were verified healthy (2 ACTIVE fuel suppliers each);
  the bug was pure frontend wiring. Demo/prod images predate the fix — deploy
  (`make demo` / `make deploy`) required for the customer to see it.
- Concurrent sessions were editing maps/map4d in the same tree during this
  fix; commit scoping (fuel files only) was required — same hazard as
  [[auto-commit-hook-commits-mid-session]].