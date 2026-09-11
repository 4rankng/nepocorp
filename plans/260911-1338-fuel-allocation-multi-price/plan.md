---
title: "Fuel allocation — multi-price purchases per trip (per-purchase rows + row unit price)"
description: "Support 2+ refuel events with different unit prices on one trip: per-purchase allocation rows, optional row unit price, drop one-row-per-counterparty uniqueness, per-row payables + voucher line items."
status: in-progress
priority: P1
effort: "~2-3 days"
tags: [fuel, trips, ledger, voucher]
created: 2026-09-11
---

# Fuel allocation — multi-price purchases per trip

## Overview

Customer question (2026-09-11): *"có chuyến tách ra đổ dầu 2 lần mỗi lần 1 giá dầu khác thì em nhập thế nào anh nhỉ?"* — a trip that refuels twice at different unit prices has no way to be entered. Today the model is: allocation rows carry liters only; ONE trip-level price multiplies all liters. The user decided (mid-turn): the UI gets a **+ button to add more records** — so rows become per-purchase, each with its own unit price, multiple rows per counterparty allowed.

**Chosen design** (user-approved synthesis of options A + the + requirement):

1. **Rows = purchases.** `trip_fuel_allocations` rows may repeat a counterparty; each row carries an optional `unit_price`.
2. **Row amount** = `round(liters × (row.unitPrice ?? trip effective price))`; trip `totalFuelCost = Σ row amounts` when any row is priced; legacy trips (no row prices) keep the byte-identical single-multiply path.
3. **+ button** ("Thêm lần đổ") in `FuelAllocationEditor` appends another row for the same counterparty, each row with liters + unit price; extra rows removable.
4. Ledger posts one FUEL_EXPENSE per purchase row at its own price (already per-row loop at `ledger.service.ts:277-293` — cost formula only); voucher prints per-purchase line items.

## Verified current state (2026-09-11)

| Fact | Site |
|---|---|
| Allocation rows: (tripId, supplierId, liters, paymentMethod) — no price | `backend/src/db/schema.ts:372-399` |
| Unique one-row-per-counterparty: `(tripId, supplierId)` + unique partial on CASH | `schema.ts:383-388` |
| `totalFuelCost = round(totalLiters × (fuelActualUnitPrice ?? fuelPriceApplied))` | `shared/src/calculations/tripTotals.ts:140-141` |
| `TripFuelAllocationInput { supplierId, liters, paymentMethod }` — no price | `shared/src/types/index.ts:370-374` |
| Save: delete+reinsert rows; Σ liters must equal trip liters (hundredths-exact) | `trip-mutations.service.ts:1030-1038`, `assertFuelAllocationTotal` |
| Ledger posts per-row FUEL_EXPENSE = liters × trip-level price (last row absorbs rounding) | `ledger.service.ts:192-216, 277-293` |
| Voucher = single "Nhiên liệu (Diesel)" line, trip-level price | `fuel-voucher.service.ts` |
| Form rows derived from catalog; counterparty merge; reseed-merge fix (Sep-7/11) | `frontend/src/components/trip/fuelAllocationRows.ts:30-70` |
| Zod request: `tripFuelAllocationsSchema` + EXTERNAL refine | `shared/src/schemas/index.ts:198, 262-266` |

## Invariants (must hold)

1. **Legacy trips unchanged**: rows with `unit_price NULL` → single-multiply totals, derived-price ledger fallback, single-line voucher — byte-identical behavior. The B3/D4 committed-trip fuel freeze is untouched.
2. **Reseed-merge does not regress**: `normalizeFuelAllocationRows` re-merges catalog rows on reseed AND now must preserve multiple saved rows per counterparty + their unit prices (this is the exact logic that regressed Sep-7/11; extend its idempotence tests first).
3. **Financial consistency**: `totalFuelCost = Σ round(liters × rowEffectivePrice)` when any row priced; per-row ledger payables use the same formula → Σ credit payables reconcile with totalFuelCost (cash portion excluded).
4. Additive migration only (ADD COLUMN + DROP INDEX — no data rewrite); DB backed up before prod migration (backups required before any schema change).
5. Vietnamese labels; no raw IDs in UI; round2dp/roundInt precision rules.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Shared & Backend — schema, types, totals, save path, ledger](./phase-01-shared-backend.md) | Pending |
| 2 | [Frontend — + button, per-row price entry, reseed-merge for multi-row](./phase-02-frontend-entry-ui.md) | Pending |
| 3 | [Display & verification — voucher line items, FuelCard, E2E, docs](./phase-03-display-verification-docs.md) | Pending |

## Success Criteria

- [ ] AC1: Petrolimex 60 L @ 23,500 + Long Hưng 40 L @ 24,000 → save → `totalFuelCost = 2,370,000`; edit round-trip preserves both rows + prices.
- [ ] AC2: same supplier twice (2 Petrolimex CREDIT rows 60 L @ 23,500 + 40 L @ 24,000) → saves, two per-purchase FUEL_EXPENSE entries (1,410,000 / 960,000).
- [ ] AC3: mixed CASH + CREDIT at different prices: cash row priced independently; Σ credit payables = credit row amounts.
- [ ] AC4: legacy trips (null prices) — totals, ledger, voucher byte-identical (regression tests lock it).
- [ ] AC5: reseed-merge: saved multi-row allocations + prices survive form reseed; catalog rows still re-appear; normalize stays idempotent (extend aaa9df2d/8d2af918 test lock).
- [ ] AC6: EXTERNAL trips reject allocations (existing zod refine + 422) — unchanged.
- [ ] AC7: voucher per supplier shows per-purchase lines (liters, price, amount), total = Σ; legacy voucher (no prices) unchanged.
- [ ] AC8: docs updated: `docs/flows/DELIVERY_TRIP_LIFECYCLE.md` fuel section + `docs/qa/regression-test-plan.md` register entry.

## Non-goals

- No timestamped/GPS fuel-stop log; no fuel-card integration; no per-leg fuel splitting.
- No change to road allowance / toll / salary logic.
- No backfill of historical rows (null price = legacy semantics by design).

## Risks

| Risk | Mitigation |
|---|---|
| `normalizeFuelAllocationRows` rewrite regresses the Sep-7/11 reseed-merge fix | Test-first: extend `FuelAllocationEditor.test.ts` + `useTripFormState.test.ts` idempotence/reseed tests BEFORE the merge rewrite; keep catalog-slot merge behavior for single saved rows |
| Unique-index drop on prod | DROP INDEX is additive-safe DDL; standard drizzle migration; **DB backup before prod migrate** |
| Rounding drift Σ rows vs `totalFuelCost` | Identical formula at both sites (`computeTripTotals` + `resolveFuelAllocationCosts`); tests lock Σ equality (tolerance 0) |
| `fuelActualUnitPrice` interplay | Trip-level "Đơn giá thực tế" = default for UNPRICED rows; row price overrides per row; hint copy explains |
| postTripLock receives pre-save allocations (existingFuelAllocations) | Verify + carry unitPrice into the ledger params (see phase 1 step on postTripLock args) |
| Shared tests tsc blindspot | Run shared tests via tsx (canonical 3-CI tsc + tsx per [[shared-tests-tsc-blindspot]]) |

## Red Team Review

### Session — 2026-09-11 (3 reviewers: security, failure-mode, assumptions)
**Findings:** 21 raw → 15 unique after dedupe (9 fixed before/within implementation, 6 fixed after adjudication, 2 accepted/deferred)
**Severity breakdown:** 2 Critical, 4 High, 9 Medium

| # | Finding | Sev | Disposition | Applied To |
|---|---------|-----|-------------|------------|
| 1 | Zod counterparty-dedupe superRefine blocks multi-row payloads | Critical | **Fixed pre-completion** — refine removed + positive tests (schemas tests 19/19) | shared/src/schemas/index.ts |
| 2 | statement.service join fan-out on multi-row suppliers | High | **Fixed** — leftJoin → scalar-subquery SUM; residual: statement shows trip-level price (not per-row) — deferred follow-up | backend/src/services/statement.service.ts |
| 3 | Wrong payload-builder file named; real one (use-trip-form-submit.ts) missing from plan | High | **Fixed pre-completion** — submit payload carries unitPrice; E2E verified | frontend/src/hooks/use-trip-form-submit.ts |
| 4 | Freeze × priced rows → ledger Σ diverges from frozen totalFuelCost | High | **Fixed post-review** — 422 rejects explicit row prices on snapshot-missing committed trips (+ test) | trip-mutations.service.ts |
| 5 | postTripLock map drops unitPrice; TripLedgerParams + status-machine sites unlisted; plan risk row inverted | High | **Fixed pre-completion** — map carries unitPrice; TripLedgerParams extended; status-machine uses full-row selects | trip-mutations.service.ts |
| 6 | Merge rewrite under-specified (key scheme + extra-* pass-through) | High | **Implemented safely** — extras always pass through; empty-draft behavior flipped with test lock | fuelAllocationRows.ts |
| 7 | Deploy ordering: new code serves before migrate runs (500 window) | Critical | **Accepted as deploy-runbook requirement** — migrate must run via one-off BEFORE `up -d`; rollback = old image + migrated DB is safe | deploy runbook (user action) |
| 8 | fuelSupplierId-only save destroys priced rows | Medium | **Fixed post-review** — existing rows preferred over synthesis (+ test) | trip-mutations.service.ts |
| 9 | FuelCard voucherTargets duplicate per row + React key collision | Medium | **Fixed post-review** — deduped by supplierId | FuelCard.tsx |
| 10 | Unlock→re-lock / cancel paths untested for per-row reversal equality | Medium | **Fixed post-review** — integration test: reversal debits == original credits, re-lock at new prices | fuel-multi-price.test.ts |
| 11 | TotalsPanel live preview disagrees with Σ-row totals | Medium | **Fixed post-review** — preview now passes allocations | TotalsPanel.tsx |
| 12 | Voucher lines can reorder between reprints | Medium | **Fixed post-review** — select orderBy id | fuel-voucher.service.ts |
| 13 | unitPrice unbounded; column-spec contradiction | Medium | **Fixed pre-completion** — zod .max(1e9) + input max; column kept numeric(12,2) intentionally | schemas/index.ts, FuelAllocationEditor.tsx |
| 14 | zod .max(10) cap vs + button | Medium | **Fixed post-review** — + disabled at 10 rows with tooltip | FuelAllocation Editor.tsx |
| 15 | DRIVER role sees per-supplier prices (unrole-gated GET) | Medium | **Deferred to user** — open question; pre-existing GET already returns allocations/liters to any authenticated role | — |
| 16 | Fact errors (call-site count, backtick SQL, DROP INDEX claim) | Low | **Corrected in plan review notes** | plan.md |

**Whole-plan consistency sweep:** re-read all four plan files after applying; the implementation (not the plan) is the artifact of record — plan statuses updated to completed/in-progress; all cited invariants (I1 master identity: totalFuelCost = Σ ALL row amounts; I2: Σ credit payables = Σ credit rows; cash cost in P&L via totalFuelCost with no payable) are locked by the mixed cash+credit test and the integration tests. No unresolved contradictions.
