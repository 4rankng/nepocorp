---
type: shared-calculations
title: Financial Calculations
description: Shared calculation logic — round2dp, computeTripTotals, fuel modes (AUTO/FLAT_RATE/MOUNTAIN), road-allowance formula, profit distribution math, FIFO aging, ISO 6346 container validation, vehicle alerts, trip driver salary.
tags: [calculations, vnd, fuel, allowance, salary, fifo, iso6346, vehicle-alerts]
sources:
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-a490be0187e4955ac4723d56
    resource: repo://backend/src/services/ledger.service.ts
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-83e07eecdb8292c75c7ec3b7
    resource: repo://frontend/src/lib/format.ts
  - id: openwiki-source-9c12d0cb39dad54eff68c786
    resource: repo://shared/src/calculations/fifoAging.ts
  - id: openwiki-source-249687e06566b9db56a11e0b
    resource: repo://shared/src/calculations/iso6346.ts
  - id: openwiki-source-5fdaee04264279630f2bb947
    resource: repo://shared/src/calculations/round.ts
  - id: openwiki-source-edb03f391a9da7cc3425328b
    resource: repo://shared/src/calculations/tripDriverSalary.ts
  - id: openwiki-source-ea90dcce99fd97d1aee39283
    resource: repo://shared/src/calculations/tripFormDefaults.ts
  - id: openwiki-source-f7fd2de8ba29e8649d8291fb
    resource: repo://shared/src/calculations/tripTotals.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

`shared/src/calculations/` is the single source of truth for financial math.
The backend writes it into the ledger and read models; the frontend calls it
inside `TotalsPanel` so the user sees the same numbers the server will write.

`round2dp` and `roundInt` are the only rounding primitives. Internal math
preserves 2 decimal places; the display layer rounds to VND integers.

## Files

| File | Purpose |
|---|---|
| `round.ts` | `round2dp`, `roundInt` |
| `tripTotals.ts` | `computeTripTotals`, `computeRoadAllowance`, `computeDriverRoadAllowance`, `computeExVatAmount` |
| `tripDriverSalary.ts` | `computeTripDriverSalary`, `resolveTripDriverSalary`, `TRIP_SALARY_WORK_DAYS` |
| `fifoAging.ts` | `computeFifoAging` (receivables/payables FIFO aging buckets) |
| `iso6346.ts` | `normalizeContainerNumber`, `validateContainerFormat`, `calculateCheckDigit`, `validateCheckDigit`, `validateContainerNumber`, `suggestCorrections` |
| `vehicleAlerts.ts` | `computeVehicleAlerts`, `VEHICLE_ALERT_LABELS` |
| `billingDocument.ts` | `canonicalFreightDescription` (debit-note text generation) |
| `tripFormDefaults.ts` | `FUEL_PRICE_PER_LITER_FALLBACK`, `FUEL_LOADED_NORM_FALLBACK`, `FUEL_EMPTY_NORM_FALLBACK`, `ROAD_ALLOWANCE_PER_KM_FALLBACK` |

Every file has a colocated `*.test.ts` (Vitest).

## Round (`round.ts`)

`round2dp(n)` rounds to 2 decimal places for intermediate math.
`roundInt(n)` rounds to an integer for display.

> **Storage vs display**: monetary columns are stored as
> `numeric(precision, 0)` for ledger amounts and `numeric(15, 2)` for
> cost/price fields. The display layer (frontend `formatCurrency`) drops the
> decimals — VND never has fractional đồng in the UI.

## Trip totals (`tripTotals.ts`)

`computeTripTotals(input)` is the trip-level calculator. Inputs (see
`ComputeTripTotalsInput`):

- `legs: { sequence, km, loadingType }[]` — multi-leg trip with HANG (loaded)
  or VO (empty) per leg.
- `fuelMode: 'AUTO' | 'FLAT_RATE'` — note that MOUNTAIN is not its own mode;
  mountain routes are encoded as a `mountainFixedAllowance` field (see below).
- `fuelLitersOverride` — used by `FLAT_RATE` (Khoán) mode.
- `fuelSupplementLiters` — additive on top of either mode.
- `fuelLoadedNorm`, `fuelEmptyNorm` — L/100km norms (e.g. 43/25).
- `fuelPerTripSupplement` — fixed +3 L/trip on standard routes.
- `fuelUnitPrice` — config snapshot (`fuelPriceApplied`).
- `fuelActualUnitPrice` — per-trip override.
- `isMountainRoute` — retained for API compat.
- `mountainFixedAllowance` — per-route total fuel allowance (e.g. Yên Sơn
  180L, Mộc Châu 240L). When non-null it overrides the per-km calculation;
  route classification (mountain vs plain) does not gate it.
- `roadAllowanceBase` (Tiền chuẩn), `tollsDiscount` (Giảm vé),
  `tollsAddition` (Tăng vé), `tollsStations` (Số trạm), `tollPerStation`
  (default 55,000).
- `hasReturnCargo`, `returnCargoBonus` — Trả hàng 2 điểm bonus.
- `revenue`, `driverSalary`.
- `twoPointDeliveryBonus`, `vehicleShiftAllowance` (Tiền lưu ca xe).
- `roadAllowanceOverride` — if accountant entered `Tổng tiền đi đường` (>0),
  use it directly; otherwise compute.
- `vatRate` (default 0), `carrierType` (OWN/EXTERNAL), `externalFreightCost`.
- `ancillaryFees[]` — buy/sell/VAT per fee.
- `customerCommission` — per-trip commission deducted from freight ex-VAT.
- `fuelAllocations[]` — per-purchase rows; when any row carries a
  non-null `unitPrice`, totalFuelCost = Σ round(liters × row.unitPrice ?? effective).

### Fuel modes

| Mode | Behavior |
|---|---|
| `AUTO` | `totalLiters = Σ(leg.km × norm/100)` + `fuelPerTripSupplement` |
| `FLAT_RATE` (Khoán) | `totalLiters = fuelLitersOverride` (manually entered) |
| Mountain allowance | If `mountainFixedAllowance` is non-null for the route, it **overrides** the per-km calculation. Route classification does not gate it. |
| Supplement | `fuelSupplementLiters` is **additive** on top of either mode |
| Per-purchase pricing | `totalFuelCost = Σ round(liters × effectivePrice)`; effective price = `row.unitPrice ?? fuelActualUnitPrice ?? fuelUnitPrice`. With at least one priced row, each row rounds at the pump. Without priced rows, the legacy single-multiply applies. |

`effectiveFuelPrice = fuelActualUnitPrice ?? fuelUnitPrice`.
`fuelPriceVariance = totalFuelCost − (totalLiters × fuelUnitPrice)` (the
delta the actual price introduces).

### Road allowance (Tiền đi đường)

```
Tiền đường ròng (Net road money)
  = Tiền chuẩn (roadAllowanceBase, lookup Route × TrailerType)
  − (Số trạm × 55.000)          // tollsStations × tollPerStation
  + returnCargoBonus              // if hasReturnCargo
  − tollsDiscount                 // Tiền vé (công ty) đã thanh toán
  + tollsAddition                 // any manual addition

totalRoadAllowance
  = roadAllowanceOverride ?? Tiền đường ròng
  + twoPointDeliveryBonus         // Trả hàng 2 điểm

Tổng số tiền lái xe thực nhận
  = totalRoadAllowance + Tiền kết hợp + Tiền lưu ca xe
```

`tollCost` is tracked separately from the road allowance (the toll amount is
the per-station fee, not what the driver carries as cash).

### VAT asymmetry

`freightExVat = revenue / (1 + vatRate)` — equals `revenue` when `vatRate=0`.
Revenue is recorded **ex-VAT** (net); costs are recorded **incl-VAT** (gross).
Do not normalize between the two.

### Ancillary fees

Each fee carries `buyAmount` (cost to company, incl-VAT), `sellAmount` (billed
to customer, incl-VAT), and optional `vatRate` (default 0.080). They are
receivables-only — they post `SERVICE_FEE` to the customer ledger for debit
notes, but they never create payable/cost ledger entries.

### Outputs (`ComputeTripTotalsOutput`)

- `totalFuelLiters`, `legCalculations[]` — leg-by-leg liters.
- `totalFuelCost`, `fuelPriceVariance`, `effectiveFuelPrice`.
- `totalRoadAllowance`, `tollCost` (separate).
- `totalCost` — fuel + external carrier + ancillary.
- `grossProfit = recordedRevenue − totalCost`.
- `freightExVat`, `recordedRevenue = freightExVat − customerCommission`.

## Trip driver salary (`tripDriverSalary.ts`)

- `computeTripDriverSalary(input)` — per-trip driver income (Lương sản lượng).
- `resolveTripDriverSalary(trip, period)` — combines base salary +
  productivity bonus + per-trip income − penalties.
- `TRIP_SALARY_WORK_DAYS` — work-day constants.

## FIFO aging (`fifoAging.ts`)

`computeFifoAging({ invoices, asOfDate })` returns bucketed aging
(`AgingBuckets` shape) using FIFO ordering. Used by
`backend/src/services/receivables.service.ts` and `payables.service.ts`.

For payables, the FIFO direction is **inverted** — age open credits, apply
debits FIFO. There is no per-expense matching; payments reduce the running
balance.

## ISO 6346 container validation (`iso6346.ts`)

`validateContainerNumber(value)` runs the full check-digit + format validation
and returns the canonical form. `suggestCorrections(value)` returns candidate
corrections when validation fails (used by trip container input UX).

## Vehicle alerts (`vehicleAlerts.ts`)

`computeVehicleAlerts(input)` returns severity-bucketed vehicle alerts
(insurance expiry, registration, road fee, maintenance). Labels are surfaced
through `VEHICLE_ALERT_LABELS`. Consumed by the dashboard and per-vehicle
drawer.

## Billing document (`billingDocument.ts`)

`canonicalFreightDescription(...)` produces the canonical Vietnamese freight
description string used in debit-note and payment-statement documents.

## Trip form defaults (`tripFormDefaults.ts`)

Fallback constants used when no per-route config is set:

- `FUEL_PRICE_PER_LITER_FALLBACK`
- `FUEL_LOADED_NORM_FALLBACK`
- `FUEL_EMPTY_NORM_FALLBACK`
- `ROAD_ALLOWANCE_PER_KM_FALLBACK`

These are exported from `@tingting/shared` so the backend defaults match the
form defaults shown in the React trip form.

## Where to read more

- Domain glossary — [domain-glossary.md](../domain-glossary.md)
- Ledger semantics — [backend/ledger.md](../backend/ledger.md)
- Trip service flow — [backend/services.md](../backend/services.md)
- Authoritative Vietnamese terms — `/CONTEXT.md`
