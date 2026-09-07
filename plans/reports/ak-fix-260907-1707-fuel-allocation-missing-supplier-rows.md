# Fix Report — Phân bổ nơi đổ dầu missing supplier rows

- **Date:** 2026-09-07
- **Trigger:** Customer: "Nó chẳng ra bên nào đổ ý anh, có hiện thị bên ngoài đổ tiền mặt thôi" — only "Cây dầu ngoài" renders; supplier rows absent. Second screenshot confirmed "dont see the list".
- **Mode:** ak-fix --auto

## Root cause

Edit-mode trip load reseeds `form.fuelAllocations` with saved-only rows
(`useTripFormDispatch.ts:191`), which **replaces** the catalog-derived standard
rows the editor had added on mount. `FuelAllocationEditor`'s normalize effect
only re-ran on `[form.setFuelAllocations, fuelSuppliers]` — neither changes on a
reseed, so supplier rows silently vanished whenever the trip query resolved
after the cached catalogs (the normal demo/list→edit flow).

Evidence chain:
1. Demo/prod DBs each have 2 ACTIVE fuel suppliers (`is_fuel_supplier = t`).
2. Demo API `/api/catalogs/bootstrap` returns both (200, 26 suppliers total).
3. Deployed demo frontend bundle contains the fuel-supplier logic.
4. Browser repro on demo trip 275 (OWN): labels = ["Cây dầu ngoài"] only.
5. Local dev with the fix: ["Petrolimex", "Long Hưng", "Cây dầu ngoài"].

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