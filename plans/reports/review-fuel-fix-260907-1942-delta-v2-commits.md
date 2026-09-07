# Delta Review — fuel allocation fix v2 (write-site normalization)

Date: 2026-09-07. Delta vs the reviewed v1 (`4ec93de9`, my PASS at 17:xx).
Commits: `0ced9a90` (fix), `aaa9df2d` (idempotence test). Review only; no
files modified. v1 committed diff matches the working-tree diff I reviewed
verbatim (6-line component + 14-line test), so the v1 verdict transfers.

## What v2 changed

- `fuelAllocationRows.ts` (new): verbatim move of `normalizeFuelAllocationRows`,
  `activeFuelSuppliers`, `fuelSupplierLabel` out of the component file. Only
  semantic delta: `activeFuelSuppliers`/`normalizeFuelAllocationRows` now take a
  structural `Pick` subset (`CatalogSuppliers`) instead of `CatalogData['suppliers']`
  — type widening only, no behavior change. Component file re-exports the three
  helpers for API compat (test file imports still resolve).
- `useTripFormDispatch.ts`: reseed's `setFuelAllocations` now wraps its rows in
  `normalizeFuelAllocationRows(..., activeFuelSuppliers(catalogData?.suppliers))`;
  hook gains a `useCatalogs` subscription.
- Editor's normalize effect kept unchanged (incl. the v1 `rowKeys` dep).

## Verdicts

### (a) Do write-site invariants hold? PASS

Same pure function, so every traced invariant holds by construction:
- **Total-liters**: additive merge vs fresh standard rows starting `liters: ''`
  (`fuelAllocationRows.ts:57-63`); payload unchanged; backend
  `assertFuelAllocationTotal` and the DELETE+reinsert reconciliation
  (`trip-mutations.service.ts:988-997`) untouched.
- **Legacy retention**: `legacy-{id}` row still merges into its standard row
  when the supplier is active, or lands in `remaining` when not
  (`fuelAllocationRows.ts:66-72`).
- **Inactive-supplier remaining**: unchanged guard (enabled || liters > 0).
- **CASH merge**: reseeded `OUTSIDE`/CASH rows still fold into `fuel-outside`.

The v2 race reasoning is sound: v1's repair used a functional updater; React
defers updater invocation, so a direct-value `setFuelAllocations` queued later
in the same batch (the reseed) lands last regardless of updater result —
explains "changed=true, cash-only write wins". Normalizing at the write site
removes the second write entirely. Both orderings (reseed-then-effect,
effect-then-reseed) now converge to the same normalized state.

### (b) useTripFormDispatch consuming useCatalogs — PASS, no new failure mode

`useCatalogs` is a thin `useQuery` wrapper over the shared `qk.catalogs.all`
key with 5-min staleTime (`frontend/src/hooks/useCatalogs.ts`) — no side
effects; observers dedupe, so the extra subscription costs one render of the
form page when catalogs arrive (the page already re-renders for its other
in-hook queries, e.g. roadConfig). No duplicate fetch.

Stale catalog at reseed time: `catalogData` is read inside the reseed effect
but is deliberately excluded from its dep array (`[isEditMode, existingTrip,
s.resetToggle]`). If the trip resolves before catalogs, the reseed normalizes
against `[]` → CREDIT saved rows are retained in `remaining` (numeric keys,
values intact) → when catalogs arrive, the **editor's residual effect**
re-fires via its own `fuelSuppliers` dep and completes the merge. The residual
effect is therefore load-bearing for the cold-catalog path, not dead code —
keeping it was correct. Editor unmounted (EXTERNAL) has no exposure: backend
forces `fuelAllocations = []` for EXTERNAL (`trip-mutations.service.ts:~874`),
and re-mounting the editor (EXTERNAL→OWN toggle) repairs on mount.

### (c) Residual editor effect: no-op safety net, not a second racer — PASS

Reseed output is born normalized, so the effect's pass is an identity →
`sameRows` returns `previous` → React bail-out. Its write is guarded and
convergent, so no interleaving (mount effect, catalog refresh, 409 reset
reseed) can fight it. `aaa9df2d` locks `normalize(normalize(rows))` identity on
`_key` and `liters`. The `useState` initializer (`useTripFormState.ts:249-271`)
still seeds raw saved-only rows on the cached-trip mount path — repaired by the
editor effect in the first effect flush (one-render flash, same as v1).
Normalizing in the initializer would require useTripFormState to import
fuelAllocationRows → import cycle (fuelAllocationRows imports
useTripFormState), so the asymmetry is justified, not an oversight.

## Findings (all non-blocking)

1. **Info** — the reseed effect reads `catalogData` while excluding it from
   deps. Correct today only because the editor effect covers the
   late-catalog repair; if the editor is ever unmounted in an OWN context
   (future refactor), a cold-catalog reseed would leave CREDIT rows in
   `remaining` until the next normalize trigger. The comment at the reseed
   site documents the race but not this coupling.
2. **Info** — layering: `hooks/useTripFormDispatch.ts:24` imports from
   `components/trip/fuelAllocationRows`. The module is pure .ts (no React), so
   a future move to `lib/` would clean the direction; not worth churn now.
3. **Info** — the idempotence test asserts only `_key` and `liters` arrays;
   `enabled`/`point`/`supplierId`/`paymentMethod` identity is untested (the
   runtime `sameRows` guard compares all six).

## Verification evidence

- Full frontend suite: 303/303 pass (74 files) — supersedes the reported 302.
- `npx tsc -b`: clean.
- Read at source: fuelAllocationRows.ts, current FuelAllocationEditor.tsx,
  useTripFormDispatch.ts reseed block, useCatalogs.ts, useTripFormState.ts
  initializer, backend reconciliation + total assertion.

## v2 verdict: PASS
