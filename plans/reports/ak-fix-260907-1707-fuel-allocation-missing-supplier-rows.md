# Fix Report — Phân bổ nơi đổ dầu missing supplier rows

- **Date:** 2026-09-07
- **Trigger:** Customer: "Nó chẳng ra bên nào đổ ý anh, có hiện thị bên ngoài đổ tiền mặt thôi" — only "Cây dầu ngoài" renders; supplier rows absent. Second screenshot confirmed "dont see the list".
- **Mode:** ak-fix --auto

## Root cause

Edit-mode trip load reseeds `form.fuelAllocations` with saved-only rows
(`useTripFormDispatch.ts:191`), which **replaces** the catalog-derived standard
rows the editor had added on mount. `FuelAllocationEditor`'s normalize effect
only re-ran on `[setFuelAllocations, fuelSuppliers]` — neither changes on a
reseed, so supplier rows silently vanished whenever the trip query resolved
after the cached catalogs (the normal demo/list→edit flow).

**Deeper (final) root cause:** adding `rowKeys` to the effect deps fixed the
*dev-server* flow but NOT the production bundle. Instrumented runs proved the
repair effect and the reseed write raced inside React's update batching — the
updater computed 3 rows with `changed=true`, yet every commit re-rendered with
the reseed's cash-only rows. The robust fix normalizes **at the reseed write
site** (`useTripFormDispatch`), so reseeded rows are born with the catalog
standard rows and the editor's effect becomes a no-op safety net.

Evidence chain:
1. Demo/prod DBs each have 2 ACTIVE fuel suppliers (`is_fuel_supplier = t`).
2. Demo API `/api/catalogs/bootstrap` returns both (200, 26 suppliers total).
3. Deployed demo frontend bundle contains the fuel-supplier logic.
4. Browser repro on demo trip 275 (OWN): labels = ["Cây dầu ngoài"] only.
5. Fix v1 (rowKeys dep) verified on vite dev — but demo prod bundle still
   cash-only; reproduced locally against the production build (vite preview).
6. Instrumented prod build: effect fired with suppliers=2 → updater 3 rows
   `changed=true` → state never committed (batching race with the reseed).
7. Fix v2 (normalize at reseed) → prod-build local shows all rows on create +
   edit, liters entry correct.

## Changes

| File | Change |
|------|--------|
| `frontend/src/components/trip/FuelAllocationEditor.tsx` | Normalize effect now also depends on `rowKeys` (joined `_key`s) — any reseed re-triggers re-normalization; catalog rows restored. |
| `frontend/src/components/trip/FuelAllocationEditor.test.ts` | New regression test locking the reseed merge shapes (`id`/`legacy-` keys) — 8 tests pass. |

## Verification (Step 5)

- Pre-fix repro on demo trip 275 edit: cash-only rows — post-fix local dev
  shows all rows on **both** create (expanded) + edit flows.
- Typing liters (CDP fill): total "Đã phân bổ" updates, no doubling
  (merge is additive from empty standard rows).
- `npx vitest run` (frontend, full): **302/302 passed** (74 files).
- `npx tsc -b`: no error output (per known quirk, parse text not exit code).
- Code review: see `code-reviewer-260907-1707-fuel-allocation-fix.md`.

## Blast radius checked

- Total-liters invariant (backend `assertFuelAllocationTotal`) unaffected —
  row keys are client-side only; save maps by supplierId/paymentMethod.
- Legacy `fuelSupplierId` path, inactive-supplier retention, CASH semantics,
  EXTERNAL trips (no editor) all unchanged.
- Demo/prod are deployed from images built 2026-09-03 / 2026-08-22 — both
  contain the buggy wiring, so **both need the fix deployed**.

## Unresolved

- Deployment to demo (make demo) + prod (make deploy) pending user decision —
  the customer sees the bug on demo/prod until then.