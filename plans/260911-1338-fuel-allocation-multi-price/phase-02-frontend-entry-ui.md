---
phase: 2
title: "Frontend — + button, per-row price entry, reseed-merge for multi-row"
status: completed
priority: P1
effort: "1 day"
dependencies: [1]
---

# Phase 2: Frontend entry UI

## Overview

The + button ("Thêm lần đổ") appends purchase rows for the same counterparty, each with liters + unit price; saved multi-row allocations survive form reseed via the (rewritten) counterparty merge. This phase rewrites `normalizeFuelAllocationRows` for multi-row — the exact logic that regressed Sep-7/11 — so it is test-first.

## Requirements

- Each enabled row (liters > 0) gets a unit-price input (placeholder = trip default price).
- **+ button** ("Thêm lần đổ") per enabled row: appends an extra row for the same counterparty (same supplierId/paymentMethod), with its own liters + price.
- Extra rows removable (× button); standard catalog rows are not removable (empty liters = unused, current behavior).
- Saved multi-row allocations + prices survive form reseed (trip load / navigation); catalog rows still re-appear after reseed (the Sep-7/11 fix must not regress).
- `fuelActualUnitPrice` stays the trip-level default for UNPRICED rows; hint copy explains ("giá để trống = dùng giá chuyến").

## Architecture

```
FuelAllocationEditor (price inputs, + per enabled row, × on extra rows)
  └─ normalizeFuelAllocationRows (rewritten, pure, test-first)
       standard slots: 1 per catalog supplier + Cây dầu ngoài (keys unchanged)
       first saved row per counterparty → merges liters+unitPrice into the slot
       2nd+ saved rows per counterparty → preserved, appended, key `alloc-<id>`
       new extra rows: _key = `extra-<n>` (session-local)
```

## Related Code Files

- Modify:
  - `frontend/src/hooks/useTripFormState.ts` (`FuelAllocationFormRow.unitPrice: string`; row factories + edit-init map `unitPrice`)
  - `frontend/src/hooks/useTripFormDispatch.ts` (payload builder: unitPrice '' → null; only rows with liters > 0 are sent)
  - `frontend/src/components/trip/FuelAllocationEditor.tsx` (+/× buttons, price input, sameRows)
  - `frontend/src/components/trip/FuelAllocationEditor.css` (+/× button styles, touch targets ≥44px)
  - `frontend/src/components/trip/FuelSection.tsx` (hint copy)
- Tests:
  - `frontend/src/components/trip/FuelAllocationEditor.test.ts` (merge idempotence + reseed with multi-row + prices — extend BEFORE the rewrite)
  - `frontend/src/hooks/useTripFormState.test.ts` (edit-init unitPrice mapping)

## Implementation Steps

1. **Test-first on the merge** — extend `FuelAllocationEditor.test.ts` BEFORE rewriting:
   (a) idempotence: normalize(normalize(rows)) === normalize(rows) with a multi-row input;
   (b) reseed merge: saved rows [Petrolimex 60L@23,500, Petrolimex 40L@24,000, Long Hưng  fixtures 60L@24,000] + catalog → all three kept with prices intact + other catalog rows present (disabled, empty);
   (c) empty saved → standard rows only;
   (d) an empty extra row (liters '') is not sent by the dispatch payload builder.
   Run → red (or partially green — run first anyway).
2. Rewrite `normalizeFuelAllocationRows` to the multi-row merge (architecture sketch); keep the "keep unmatched enabled rows" branch; keys: standard `fuel-supplier-${id}`/`fuel-outside` unchanged; saved extra rows keep `alloc-<id>`; new extra rows `extra-<n>`.
3. `sameRows` includes `unitPrice` (else the Sep-7-class "effect doesn't re-fire" bug returns).
4. Row factories: `createDefaultFuelAllocations` + edit-init rows add `unitPrice: ''` (or mapped from saved); edit-init keeps mapping saved rows keyed `alloc-<id>` — normalize consumes the first per counterparty into the catalog slot and appends 2nd+ rows as-is.
5. Editor UI: price input per enabled row (same input style as liters, prefix `đ`); + button per enabled row (aria-label "Thêm lần đổ tại <label>"); × button on extra rows only (aria-label "Xóa lần đổ..."); hint copy in FuelSection: "Mỗi lần đổ một giá? Bấm (+) để thêm lần đổ — giá để trống = dùng giá chuyến."
6. Dispatch payload: `unitPrice: row.unitPrice === '' ? null : Number(row.unitPrice)`; ensure empty/0-liter rows are filtered before submit.
7. Run frontend tests for touched areas (via npm scripts — no direct node_modules paths); `npm run check:ui` vs known-red main baseline (fix only new violations; +/× buttons ≥44px touch targets); tsc quirk: parse output text, gate = vite build.
8. tsc + vite build gates green.

## Success Criteria

- [ ] Merge tests (reseed multi-row + idempotence + payload filter) green; existing assertions may legitimately change to include the new `unitPrice` row field.
- [ ] + adds a counterparty row; × removes extra rows; price input per enabled row; × not shown on standard rows.
- [ ] Edit round-trip: saved multi-row + prices survive reseed; catalog rows re-appear; no doubling (AC1/AC5).
- [ ] check:ui — no new violations vs known-red main baseline; tsc (parse text) + vite build green.
- [ ] AC6 guard: EXTERNAL refine test still green (`shared/src/schemas/updateTripFiguresSchema.test.ts`).

## Risk Assessment

- The merge rewrite is the highest-risk step — the reseed-merge regression (Sep-7/11) happened exactly here. Mitigation: test-first (step 1), keep the single-saved-row merge behavior identical for the common case, run the full `FuelAllocationEditor.test.ts` + `useTripFormState.test.ts` suites after the rewrite.
- Empty extra rows leaking into the payload would 400 on Σ-liters invariant. Signal it broke: save fails with "Tổng phân bổ dầu ... phải bằng tổng dầu chuyến". Response: payload filter (step 6) + test (d).
- `sameRows` missing unitPrice would make the normalize effect not re-fire on price edits — the same failure class as Sep-7. Signal: price edits vanish after a re-normalize pass. Response: sameRows includes unitPrice; the sameRows guard prevents setState churn while typing.
