# Code Review — Fuel Allocation reseed fix (FuelAllocationEditor)

Date: 2026-09-07. Scope: uncommitted working-tree diff of
`frontend/src/components/trip/FuelAllocationEditor.tsx` (+6/-2) and
`FuelAllocationEditor.test.ts` (+16). Review only; no files modified.

## Verdict per requested check

### (a) Root cause addressed — PASS

Root cause: the normalize `useEffect` deps `[form.setFuelAllocations, fuelSuppliers]`
were unchanged by the trip-load reseed, so saved-only rows replaced the
catalog rows and were never re-normalized. The fix adds `rowKeys`
(joined `_key` string) to the deps — trigger-level fix, not symptom patch.

Reseed paths traced (all covered):

- **Trip resolves after mount** (the bug): reseed at
  `frontend/src/hooks/useTripFormDispatch.ts:191-211` writes saved-only rows
  keyed `String(allocation.id)` (:194) or `legacy-{tripId}` (:203). These are a
  disjoint keyspace from normalized keys (`fuel-supplier-N`, `fuel-outside`),
  so `rowKeys` necessarily changes → effect re-fires.
- **Mount with cached trip**: `useTripFormState.ts:249-271` useState initializer
  seeds the same saved-only keys; the effect runs on mount regardless → covered.
- **Navigation between two trips**: same reseed site; per-trip allocation ids
  (global serial PKs) guarantee different keys. `legacy-{A}` → `legacy-{B}` /
  numeric → changed.
- **409 refetch retry**: `frontend/src/pages/TripEditPage.tsx:132-134` →
  `refetchTrip()` + `resetForm()` → `resetToggle` bump, which is a dep of the
  reseed effect (`useTripFormDispatch.ts:239`) → reseed from a normalized
  (standard-key) state → key change detected → normalize re-fires.

Writers of `setFuelAllocations` exhaustively enumerated: state init
(useTripFormState.ts:249), reseed (useTripFormDispatch.ts:191), and the
editor's own `setRow`/`setLiters` (keys never change while typing). Context
hook merely pipes them (`useTripForm.ts:207`). No uncovered path.

### (b) Business-logic blast radius — PASS

- **Total-liters invariant**: the merge at `FuelAllocationEditor.tsx:76` is
  additive against freshly built standard rows that always start at
  `liters: ''` (:49-58), so `0 + current` — total preserved through every
  normalize pass; duplicate rows merging onto one counterparty also preserve
  the sum (sequential adds). Restored empty catalog rows are dropped by the
  submit filter (`use-trip-form-submit.ts:153`), so the payload is identical to
  pre-fix. Backend `assertFuelAllocationTotal`
  (`backend/src/services/trip-mutations.service.ts:271-295`) compares
  hundredths sums — unaffected.
- **No id/_key contract**: payload sends `{supplierId, liters, paymentMethod}`
  only (`use-trip-form-submit.ts:175-179`); backend does full
  DELETE-by-tripId + re-insert
  (`backend/src/services/trip-mutations.service.ts:988-997`). Re-keying rows
  client-side is contract-free.
- **Legacy `fuelSupplierId` path**: `legacy-{id}` row maps to `CREDIT:{id}`;
  active supplier → merged into its standard row (value + enabled preserved;
  the supplierId overwrite at FuelAllocationEditor.tsx:79-81 is a no-op by map
  key). Inactive supplier → no target → retained in `remaining` when
  enabled or liters > 0 (:71-73). On total catalog-load failure, saved CREDIT
  rows survive in `remaining` with the generic label — no data loss, payload
  still valid.
- **CASH row**: reseeded CASH rows (`point: 'OUTSIDE'`) merge into the
  `fuel-outside` standard row — same point/method, semantics intact.
- **completionStatus / hasOptionalData** key off `liters.trim()` only
  (`useTripFormDispatch.ts:446,497`) — restored empty rows don't flip either.

### (c) New failure modes — PASS (none found)

- **Infinite loop**: converges in ≤2 runs. After a normalize pass all rows
  carry standard keys; a re-run merges `0 + current` and `sameRows`
  (FuelAllocationEditor.tsx:9-19) returns `previous` → React bail-out. The
  effect fires only when `form.setFuelAllocations` (stable useState setter),
  `fuelSuppliers` (useMemo over `catalogData?.suppliers`; TanStack structural
  sharing keeps the ref when data is unchanged), or `rowKeys` changes.
- **Doubling**: impossible — standard rows are rebuilt inside
  `normalizeFuelAllocationRows` at `liters: ''` on every call; merge is
  `0 + existing`.
- **Typing interference**: `setLiters` mutates only liters/enabled; `_key`
  stable → `rowKeys` string unchanged → no re-fire while typing. A real
  catalog change re-fires by design and typed liters survive the additive
  merge.
- **Cosmetic only**: `String(liters)` (:78) rewrites "40.50" → "40.5" on a
  re-fire — one-shot, within the 2-decimal validation on both sides.

### (d) Pattern adherence — PASS

Matches the file's existing derived-dep + effect + `sameRows` identity-guard
style; the comment explains intent (why, not what). `tsc -b` clean; vitest
8/8 pass.

## Findings (all non-blocking)

1. **Low — test fixture cast** `FuelAllocationEditor.test.ts:72`:
   `as ReturnType<typeof normalizeFuelAllocationRows>` is unnecessary
   type-widening; passing the literal inline (as the file's other tests at
   :39-43, :51-53 do) gets contextual typing without a cast.
2. **Low — primaryFuelSupplierId order sensitivity**
   (`use-trip-form-submit.ts:180-182`): primary = first CREDIT row; row order
   shifts from saved-order (pre-fix) to catalog-order (post-fix), so a
   multi-CREDIT-supplier trip's denormalized `trips.fuel_supplier_id` could
   flip on next save. Inert in practice: the ledger derives supplier ids from
   allocations when present and only falls back to the column
   (`backend/src/services/ledger.service.ts:108-112`), and the demo data has
   2 active suppliers. Informational.
3. **Info — coverage gap**: no regression test locking idempotence
   (`normalize(normalize(rows))` unchanged) or duplicate-counterparty
   total-preservation — the two properties check (c) relies on.
4. **Hygiene — working tree mixes scopes**: the uncommitted tree also holds
   unrelated maps work (backend `map4d.ts`/`maps.service.ts`/`maps.ts`/test,
   frontend `LocationAutocomplete.tsx`, `lib/maps.ts`). Commit the 2-file fuel
   fix separately.

## Verification evidence

- `npx vitest run src/components/trip/FuelAllocationEditor.test.ts` → 8/8 pass.
- `npx tsc -b` → no errors.
- Backend reconciliation and total assertion read at source; submit
  serialization read at source.

## Merge verdict: PASS
