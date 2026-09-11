---
phase: 3
title: "Display & verification — voucher line items, FuelCard, E2E, docs"
status: completed
priority: P2
effort: "0.5-1 day"
dependencies: [2]
---

# Phase 3: Display surfaces + E2E + docs

## Overview

Read-side surfaces show per-purchase prices: the fuel voucher (phiếu cấp nhiên liệu) prints per-purchase line items; FuelCard lists each purchase with price and amount. Then end-to-end verification of the customer scenario in local dev and doc updates.

## Requirements

- Voucher for a supplier with N purchases → N line items (liters, price, amount); total = Σ; legacy vouchers (no row prices) unchanged.
- FuelCard lists each purchase: "60 L × 23.500 đ/L = 1.410.000 ₫"; cash rows labeled Tiền mặt.
- E2E in local dev: the full customer scenario (save → reload → totals → ledger on complete/lock → voucher) matches AC1–AC8.
- Docs: lifecycle doc fuel section + regression register entry.

## Architecture sketch

```
buildFuelVoucherData
  ├─ allocations for supplier = filter by supplierId (not find)
  ├─ lineItems: [{liters, unitPrice, amount}]
  │     amount = round(liters × (unitPrice ?? effectivePrice))
  │     legacy (no prices): single line, derived effective price (current behavior)
  ├─ fuelLiters = Σ supplier rows (when supplierId given)
  └─ "Giá áp dụng" footer line only when all rows share one effective price;
     otherwise per-line prices carry it
```

## Related Code Files

- Modify:
  - `backend/src/services/fuel-voucher.service.ts` (data + HTML + XLSX renderers)
  - `frontend/src/features/trip-detail/components/FuelCard.tsx` (per-purchase rows with price × liters = amount)
  - `docs/flows/DELIVERY_TRIP_LIFECYCLE.md` (fuel allocation section)
  - `docs/qa/regression-test-plan.md` (register entry: multi-price save, reseed-merge, voucher lines, legacy invariance)
- Tests: voucher service test (line items + legacy unchanged) — new `backend/src/tests/fuel-voucher.test.ts` (locate any existing voucher test first; extend instead of duplicate).

## Implementation Steps

1. `buildFuelVoucherData`: `filter` (not `find`) supplier allocations; build `lineItems` per row (amount = `round(liters × (unitPrice ?? effectivePrice))`); legacy single-line behavior when no row prices; `fuelLiters` = Σ supplier rows when supplierId given; "Giá áp dụng" footer only when a single effective price applies.
2. `renderFuelVoucherHtml` + `renderFuelVoucherXlsx`: iterate lineItems (1 today → N); total = Σ amounts; meta/vendor/signature sections unchanged.
3. FuelCard (frontend): allocation rows show `N lít × price = amount` (price = row.unitPrice ?? trip effective price; amount = round(liters × price)); cash rows labeled "Tiền mặt".
4. E2E (local dev, admin/admin123 — `testplan/testaccounts.txt`):
   - Trip with 2 Petrolimex rows (60 L @ 23,500 and 40 L @ 24,000 added via the + button) plus a Long Hưng row (40 L @ 24,000) — Σ liters must equal the trip's issued liters (adjust liters to the trip's `totalFuelLiters` when picking the test trip).
   - Save → reload → rows + prices persist through reseed-merge (AC1/AC5).
   - `totalFuelCost` = Σ row amounts — recompute expected values from the inputs actually used (do not trust this doc's illustrative numbers).
   - Complete → lock → ledger shows per-purchase FUEL_EXPENSE entries at their own prices (AC2/AC3).
   - Voucher HTML/XLSX per supplier: per-purchase lines + totals; a legacy trip voucher unchanged (AC7).
   - Screenshot evidence into the phase report.
5. Docs:
   - `docs/flows/DELIVERY_TRIP_LIFECYCLE.md` fuel section: + button, per-row price ("giá để trống = dùng giá chuyến"); the + button makes each purchase its own row, so the blended/weighted-average convention from the earlier single-row design is DROPPED.
   - `docs/qa/regression-test-plan.md`: register a multi-price case (save/reload/ledger/voucher + legacy invariance) per the register's format.
6. Regression gates: backend fuel-scoped tests, shared tsx calc tests, frontend touched-scope vitest, `npx tsc --noEmit` (backend; frontend tsc parse-text quirk [[tsc-no-errors-exit-1-quirk]]), vite build, `npm run check:ui` vs known-red main baseline (fix only new violations).

## Success Criteria

- [ ] Voucher line items + legacy voucher unchanged (test locks both) — AC7.
- [ ] FuelCard per-purchase display verified in browser (screenshot into report) — AC1–AC8 verifiable end-to-end in local dev.
- [ ] Docs updated (lifecycle doc fuel section + regression register) — AC8.
- [ ] Touched-scope test gates green; report at `plans/reports/` per naming convention.
