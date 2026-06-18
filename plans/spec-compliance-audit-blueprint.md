# Blueprint — Spec-Compliance Audit & Gap-Closure Plan

**Generated:** 2026-06-18 (Blueprint skill; 11-agent parallel audit, adversarial-reviewed)
**Sources audited:** `PRODUCT-SPECS.md` (11 modules, 24 config tables, §4.1–4.18), `docs/feedback202606.docx`, `docs/flows/*`
**Mode:** git + gh present (account `4rankng`, remote `github.com/4rankng/nepocorp`). Project convention = **work-on-main, commit, do not push** unless asked. Steps are PR-able if you prefer.
**Audit method:** read-only agents per domain, file:line evidence, wired-vs-stub (not commit messages).

---

## 0. Headline

**The codebase meets the large majority of PRODUCT-SPECS.md.** Trip lifecycle, fuel/road-allowance, ledger/AR, AP mechanics, salary attendance, cap-table distribution, tires, forwarder portal, RBAC, and all 18 config hubs are wired and functional. The prior `feedback-remaining-blueprint.md` (7 steps) is **complete** (AR card, click-fill, customer/supplier drill-downs, settlement FK, office settlement approval, raw-ID fix all landed).

What remains falls into **four buckets**:

| Bucket | Count | Examples |
|---|---|---|
| **A. Financial-correctness bugs** (money accuracy) | 3 | P&L service-margin double-count; STANDBY_LABOR never posted to P&L; penalty not double-entry |
| **B. Missing spec tables/features** (schema + logic + UI) | 5 | `vehicle_alerts` proper model; `truck_profit_distribution`; `commission_type`; Container-Types fields; `salary_periods` totals |
| **C. Reports / feedback completeness** | 5 | AR real-time + period reports; AP period reports; Debit-Note PDF; penalty summary; driver/forwarder portal polish |
| **D. RBAC / doc / config drift** | several | instructions write-role; CLAUDE.md RBAC table; trailer table duplication; VAT default-from-customer |

Plus **3 spec-vs-code contradictions that need a customer (Pete) decision** before code is changed — these are **decision gates, not build steps** (dailyRate/social-insurance, external-carrier VAT, completion-photo enforcement).

**Do NOT rebuild any ✅ item** in §3 below.

---

## 1. CRITICAL pre-flight (do first) — migration hygiene + customer decisions

Two things gate the schema-adding steps (B5–B9) and the decision steps (A4):

### Migration journal / production state (from memory `feedback-finalization-p0-migration`)
- Committed `_journal.json` reportedly stops at `0049` → prod may never have received tires / COMMISSION / truck_cap via CI. Several hand-authored migrations duplicate each other; `ALTER TYPE ADD VALUE` is non-idempotent.
- **Before any new migration (Steps 5–9):** get prod ground truth with `SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;` (the real migrations ledger) + `\dt tires`, `\d expenses`, `\d cap_table_history`, `\d truck_cap_table`. Hand-align `backend/src/db/_journal.json` hashes to what prod actually ran; delete duplicate hand-authored migration files; ensure every `ALTER TYPE ADD VALUE` is guarded so it can't re-run. Otherwise new migrations will fail or silently no-op on prod.

### Customer decisions (Pete) — needed before A4, and to close doc contradictions
1. **dailyRate formula** — code uses `baseSalary / standard_work_days` (excludes `social_insurance`), matching Pete's 2026-06-12 note ("dailyRate = base/26, cost-allocation only, NO social"). But PRODUCT-SPECS §4.5.3 / Module-10 US4 / schema comment still say `(base+social)/std`. **Confirm social stays OUT → then update spec docs** (preferred), or restore social in code.
2. **External-carrier cost VAT** — §4.7/§4.6 say all costs INCL VAT (no input-VAT deduction); code strips VAT on external cost (`tripTotals.ts:174`). Spec is internally inconsistent (line 65/554 vs 248). **Confirm incl-VAT → drop the `/1+vat` strip.**
3. **Completion-photo enforcement** — §4.12/§540 require photos for ALL cargo on completion (tea = container+seal); code is permissive by design (B2). **Confirm B2 supersedes §4.12 → update spec**, or restore a soft/hard gate.

---

## 2. Steps

### Step 1 — P&L service-margin double-count (CRITICAL, money)
**ID:** A6/PnL · **Size:** S · **Model:** opus · **Depends on:** nothing

**Context brief.** `pnl.service.ts:67` computes top-level `grossProfit = totalRevenue − totalCosts` correctly (no margin). But the per-truck loop at `:153` does `existing.profit += parseFloat(trip.grossProfit)` — and `trip.grossProfit` already embeds service margin (`tripTotals.ts:183`). Then `:158-163` adds service margin **again**. Result: per-truck profit column inflated by Σ service margin; truck profitability ranking wrong; §4.7 "reconcile > 0.01 VNĐ" fails.

**Tasks.**
1. In the `pnl.service.ts` per-truck loop: `trip.grossProfit` for OWN trips ALREADY embeds `serviceMargin` (`tripTotals.ts:183`), so `existing.profit += parseFloat(trip.grossProfit)` (`:153`) is sufficient — **remove the `:158-163` re-add of serviceMargin into `existing.profit`**. Keep `existing.serviceMargin` as a reporting-only field, not added to profit. **Do NOT touch the external-carrier "Xe ngoài" bucket** (`:232`, computed independently from `extMgmtMargin + extServiceMargin`) — it is already correct. Top-level totals (`:67` / `:176`) must stay unchanged.
2. Add a Vitest regression asserting the real invariant that fails today: `Σ(truckBreakdown.profit) == adjustedGrossProfit` (top-level), with a fixture where one OWN trip carries ancillary fees (non-zero service margin).
3. Manual: 2-truck P&L, one trip with ancillary fees → per-truck profits sum to the top-line gross; service margin counted exactly once.

**Files:** `backend/src/services/pnl.service.ts`, `backend/src/services/__tests__/pnl.test.ts` (new/extend).
**Verify.** `cd backend && npm test` green; 3-CI tsc green; manual P&L tie-out.
**Exit criteria.** Per-truck profit Σ == top-level grossProfit; service margin counted once.
**Rollback.** `git revert`.

---

### Step 2 — Post STANDBY_LABOR to P&L on salary confirm (CRITICAL, money)
**ID:** §4.5.4 · **Size:** M · **Model:** default · **Depends on:** Step 0 (migration hygiene)

**Context brief.** Spec §4.5.4: on salary-period CONFIRM, system auto-creates an `expenses` row type `STANDBY_LABOR` (truck_id null) for `standby_cost`, hitting P&L as unattached indirect-labor cost. Code computes `standby_cost` (`attendance.service.ts`) but `confirmSalary` (`:393-429`) only upserts a confirmation row — no expense write. `STANDBY_LABOR` exists nowhere (0 grep hits; not in `txnTypeEnum`). Entire indirect-labor allocation is unimplemented → P&L understates labor cost.

**Tasks.**
1. Add `STANDBY_LABOR` to the expense/txn type enum (idempotent migration — `ALTER TYPE ADD VALUE` guarded; see Step 0).
2. In `confirmSalary` (`attendance.service.ts:393-429`), after computing `standby_cost > 0` (`supplementPay = standbyDays × dailyRate`, `:286` — currently computed but **never persisted anywhere**: not to `salary_confirmations`, not to `salary_periods`, not to expenses), create an `expenses` row (reserved standby category, `truckId = null`, `vehicleComponent = null`, internal supplier placeholder, PAID status since it's an allocation). This also stops `supplementPay` being silently discarded.
3. Ensure `pnl.service.ts` unattached-cost path picks it up (it already sums `truck_id IS NULL` expenses) — verify no double-count with any standby field already on salary_periods.
4. Guard re-confirmation idempotency (don't create duplicate STANDBY_LABOR rows on re-confirm).

**Files:** `backend/src/db/schema.ts` (enum), migration `00NN_standby_labor.sql`, `backend/src/services/attendance.service.ts`, `backend/src/services/expense.service.ts` (helper), `pnl.service.ts` (verify).
**Verify.** backend tests; tsc; manual: confirm a period with standby days → P&L unattached cost rises by exactly standby_cost.
**Exit criteria.** Standby cost flows to P&L once, idempotently.
**Rollback.** revert migration + code.

---

### Step 3 — Penalty double-entry: company OTHER_INCOME ledger row (HIGH, money)
**ID:** §4.11 · **Size:** S · **Model:** default · **Depends on:** nothing

**Context brief.** `createPenalty` (`financial.service.ts:128-137`) posts ONLY a DRIVER debit (the salary deduction). The "company other income" side exists only as a runtime `SUM(penalties.amount)` in `pnl.service.ts:77-80` — not in the immutable ledger. Violates §4.10 central-ledger principle; any ledger-only P&L reconciliation misses penalty income.

**Tasks.**
1. In `createPenalty` (`financial.service.ts:128-137`), post a second ledger row: credit to a company/other-income entity for the penalty amount, paired with the existing DRIVER debit.
2. **No double-count risk:** `pnl.service.ts:77-80` sums the `penalties` TABLE (not the ledger), so posting an OTHER_INCOME ledger row does not duplicate it. Leave the pnl SUM as-is; the ledger row just makes the ledger self-contained for ledger-only reconciliation. (Optional later: switch pnl to read penalty income from the ledger.)
3. **Reversal:** `cancelPenalty` (`:170-190`) already reverses the DRIVER debit via `TxnType.ADJUSTMENT` (`:184`) — so the only new reversal work is to **also reverse the new OTHER_INCOME row** in that same path. Don't touch the existing DRIVER reversal.

**Files:** `backend/src/services/financial.service.ts`, `backend/src/services/ledger.service.ts`, `pnl.service.ts`.
**Verify.** backend tests; tsc; manual: create + delete penalty → ledger shows paired entries, net zero after delete.
**Exit criteria.** Penalty is fully double-entry; ledger self-contained.
**Rollback.** `git revert`.

---

### Step 4 — Decision gate: external-VAT + dailyRate/social + photo rule
**ID:** DECISIONS · **Size:** S (memo) · **Model:** opus · **Depends on:** Step 0

**Context brief.** Three places where PRODUCT-SPECS, code, and Pete's clarifications diverge. Building the "wrong" resolution wastes a PR. Produce a short decision memo, get Pete's sign-off, THEN apply.

**Tasks.**
1. Write `docs/adr/2026-06-18-salary-vat-photo-decisions.md` capturing the three questions, current code behavior (file:line), and the recommended resolution.
2. **dailyRate:** if Pete confirms social OUT → update PRODUCT-SPECS §4.5.3, Module-10 US4, schema comment to drop `social_insurance` from `daily_rate` (code already correct). If social IN → restore `(base+social)/std` in `attendance.service.ts:280` + `trip-mutations.service.ts:437`.
3. **External VAT:** if incl-VAT confirmed → drop `/1+vat` strip at `tripTotals.ts:174-175` + `pnl.service.ts:215`; update spec line 65/554.
4. **Photo rule:** if B2 confirmed → update §4.12/§540 to "photos optional, encouraged". Else restore a soft warn-gate on completion.

**Files:** `docs/adr/...`, then PRODUCT-SPECS.md + targeted code.
**Verify.** memo reviewed; spec + code consistent post-decision.
**Exit criteria.** All three contradictions resolved in writing; code matches.
**Rollback.** n/a (doc + trivial code).

---

### Step 5 — vehicle_alerts: ROAD_FEE + per-type lead_days + manager surface (A12)
**ID:** §4.17 / A12 · **Size:** M-L · **Model:** default · **Depends on:** Step 0

**Context brief.** Spec table 22 / §4.17 wants 4 alert types (OIL_CHANGE/INSPECTION/INSURANCE/**ROAD_FEE**) with per-type configurable `lead_days` (7/30/30/15) and `last_checked_at`. Code stores only 3 date columns on `trucks` (`nextInspectionDate`, `insuranceExpiryDate`, `lastOilServiceDate`) — **no ROAD_FEE field**; `lead_days` is a single hardcoded `=30` in `computeVehicleAlerts` (not persisted, not per-type). Worse: **manager Dashboard + Fleet pages show ZERO alerts** (grep 0 matches); only driver-side is done (B4 ✓).

**Tasks.**
1. Add `roadFeeExpiryDate` (or equivalent) to `trucks` + TruckFormModal field.
2. Make `lead_days` configurable per type: either a small `vehicle_alert_config` table or columns on a settings singleton; default 7/30/30/15; surface in config UI.
3. Wire `computeVehicleAlerts` to use configured lead_days.
4. Surface alert pills on `DashboardPage.tsx` (alert strip) and `FleetPage.tsx` truck cards (inspection/insurance/oil/road-fee badges).
5. Keep driver-side (B4) working.

**Files:** `backend/src/db/schema.ts`, migration, `shared/src/calculations/vehicleAlerts.ts`, TruckFormModal, config page, `DashboardPage.tsx`, `FleetPage.tsx`.
**Verify.** tsc + build; manual: a truck with inspection 5 days out → Dashboard + Fleet badge; driver page unchanged.
**Exit criteria.** All 4 alert types, configurable lead_days, visible to managers + drivers.
**Rollback.** revert migration + code.

---

### Step 6 — truck_profit_distribution table (§4.8.1 / spec table 24)
**ID:** §4.8.1 / A7 · **Size:** M-L · **Model:** default · **Depends on:** Step 0

**Context brief.** Spec §4.8.1 defines `truck_profit_distribution` (truck_id, partner_id nullable, period, gross_profit, net_profit, share_pct 5,2, amount, status DRAFT/CONFIRMED). Code has NO such table — current `distributions` is a flat quarter/year snapshot. Draft→confirm per-truck net-profit attribution workflow doesn't exist. (Note: per-truck **ownership** via `truck_cap_table` + TruckOwnersConfigPage IS done; this is the **distribution output** side.)

**Tasks.**
1. Add `truck_profit_distribution` table per spec; idempotent migration.
2. Service to compute, per truck × period, gross/net profit (reuse `pnl.service.ts` per-truck data — mind Step 1 fix) and split by `truck_cap_table.share_pct`; support DRAFT→CONFIRMED.
3. ProfitPage per-truck section: show DRAFT distributions, Confirm action.
4. Keep cap-table (company-wide) dividend path distinct (spec: 3 independent streams).

**Files:** `schema.ts`, migration, `profit-distribution.service.ts`, `ProfitPage.tsx`.
**Verify.** backend tests; tsc + build; manual: create draft distribution for a truck → confirm → immutable row.
**Exit criteria.** Per-truck investor dividend draft→confirm persisted.
**Rollback.** revert migration + code.

---

### Step 7 — commission_type: PARTNER_REFERRAL vs CUSTOMER_REBATE (§4.15 / US9.7)
**ID:** §4.15 / A9 · **Size:** M · **Model:** default · **Depends on:** nothing

**Context brief.** Spec §4.15 splits commission payable into `PARTNER_REFERRAL` (selling expense, vendor credit) and `CUSTOMER_REBATE` (revenue reduction, payable to **customer** — distinct from immediate `customerCommission`). Code has **no** `commission_type` column/enum/UI anywhere (0 grep hits); `commission.service.ts:30-51` posts one generic `COMMISSION` vendor credit.

**Tasks.**
1. Add `commission_type` enum + column on the commission/expense record; migration.
2. Route `PARTNER_REFERRAL` → VENDOR credit (selling expense, current behavior). Route `CUSTOMER_REBATE` → CUSTOMER-side ledger (contra-revenue), since the payee is the customer.
3. UI selector in PayableListPage commission modal; AP filter chip distinguishes the two.
4. P&L: PARTNER_REFERRAL in costs, CUSTOMER_REBATE as revenue contra.

**Files:** `schema.ts`, migration, `commission.service.ts`, `financial.service.ts`, `PayableListPage.tsx`, `pnl.service.ts`.
**Verify.** backend tests; tsc + build; manual: record both types → correct ledger entity + P&L bucket.
**Exit criteria.** Both commission types modeled and routed correctly.
**Rollback.** revert migration + code.

---

### Step 8 — Container Types: add groupSize + status (§4.14 / US8.9)
**ID:** §4.14 · **Size:** S-M · **Model:** default · **Depends on:** nothing

**Context brief.** Spec §4.14 / US8.9 require each container type to have code, display name, **group size (20FT/40FT)**, and status (for trailer-compatibility validation). The `container_types` table, Zod schema, and ContainerTypesConfigPage modal have **only code/name/notes** (verify exact lines — the schema file has shifted). (Seal Types — a separate, orthogonal catalog — is already added.)

**Tasks.**
1. Add `groupSize` (enum 20FT/40FT) + `status` columns; migration; Zod.
2. Modal fields; list display.
3. Optional: soft validation hint when a trip container's groupSize exceeds the assigned trailer type.

**Files:** `schema.ts`, migration, `shared/src/schemas/`, `ContainerTypesConfigPage.tsx`.
**Verify.** tsc + build; manual: add 40HC with groupSize 40FT + inactive status.
**Exit criteria.** Container types carry groupSize + status.
**Rollback.** revert migration + code.

---

### Step 9 — Persist salary_periods monthly totals (spec table 20)
**ID:** §4.5 / table 20 · **Size:** M · **Model:** default · **Depends on:** Step 2 (**HARD** — totals persistence is meaningless until the standby write exists; same `confirmSalary` function), Step 0

**Context brief.** Spec table 20 wants `salary_periods` to hold per-driver/month totals (daily_rate, trip_days, standby_days, total_trip_salary, adjustment, penalties, social_insurance, net_salary, standby_cost, status DRAFT→CONFIRMED). Current `salary_periods` only stores date-range config; totals are computed on-the-fly; `salary_confirmations` stores only status. So confirmed-period numbers aren't auditable/persisted.

**Tasks.**
1. Add totals columns to salary_periods (or a `salary_period_totals` rows-per-driver table); migration.
2. On confirm, persist the computed totals snapshot (immutable once CONFIRMED).
3. Reporting reads persisted totals for confirmed periods; live calc for DRAFT.

**Files:** `schema.ts`, migration, `attendance.service.ts`/`salary-period.service.ts`, SalaryAttendancePage.
**Verify.** backend tests; tsc + build; manual: confirm period → persisted totals survive re-query.
**Exit criteria.** Confirmed period totals persisted and auditable.
**Rollback.** revert migration + code.

---

### Step 10 — AR: real-time refresh + detailed/summary period reports (A8.1/A8.3/A8.4)
**ID:** §4.10 / Module 5 · **Size:** M-L · **Model:** default · **Depends on:** nothing

**Context brief.** (a) Real-time: AR invalidation is client-side only from the mutating page; cross-user/cross-page relies on staleTime (~2m). Spec §4.10 demands immediate refresh. (b) Reports: only point-in-time snapshot + aging list exist — no from/to period filter, no per-customer detailed AR report.

**Tasks.**
1. Real-time: add a pragmatic `refetchInterval` (e.g. 30–60s) on AR queries (DebtList, Dashboard AR card, CustomersPage balance) as the low-risk option; OR a lightweight SSE/poll channel on `LedgerService.postEntry`. Document the tradeoff in the PR.
2. Detailed AR report: new endpoint `/reports/receivables-detail?customerId&from&to` returning ledger movements; ReportPage UI.
3. Summary AR report across all customers by period.
4. Reuse existing `statement.service.ts` / `receivables-report.service.ts`.

**Files:** `backend/src/services/receivables-report.service.ts`, reports routes, `frontend/src/pages/` report page, AR query hooks.
**Verify.** backend tests; tsc + build; manual: record payment in tab A → tab B DebtList updates within interval; period report matches statement.
**Exit criteria.** AR refreshes promptly; period + per-customer reports available.
**Rollback.** `git revert`.

---

### Step 11 — AP: period reports + Debit-Note PDF (A9.7/A9.8, §4.10)
**ID:** §4.15 / §4.10 · **Size:** M · **Model:** default · **Depends on:** nothing

**Context brief.** AP summary only has `asOfDate` (no from/to); Debit Note exports XLSX only (`debitNote.service.ts`) — spec wants PDF/Excel.

**Tasks.**
1. Add `from`/`to` to payables summary + a detailed AP report (per supplier, period) + summary report UI.
2. Add PDF export to debit-note (puppeteer print-to-PDF or pdfkit), alongside XLSX; honor MONTHLY/PER_BATCH.

**Files:** `payables.service.ts`/`aging.service.ts`, reports routes, `debitNote.service.ts`, PayableListPage/report page.
**Verify.** backend tests; tsc + build; manual: period AP report; download debit note PDF.
**Exit criteria.** AP period reports + Debit-Note PDF.
**Rollback.** `git revert`.

---

### Step 12 — Penalty summary by driver/month + dedup-at-entry (US7.2, §4.11)
**ID:** §4.11 · **Size:** S-M · **Model:** default · **Depends on:** nothing

**Context brief.** PenaltyPage is a flat list; no driver×month aggregate (US7.2). Dedup exists only in catalog config, not at penalty-entry (`PenaltyFormDrawer.tsx:57`).

**Tasks.**
1. Add penalty summary endpoint + view (groupBy driver × month, totals).
2. Add dedup check in PenaltyFormDrawer when entering a custom reason (suggest existing catalog match).

**Files:** `penalties.routes.ts`, penalty service, `PenaltyPage.tsx`, `PenaltyFormDrawer.tsx`.
**Verify.** backend tests; tsc + build; manual: summary groups correctly; duplicate reason prompts suggestion.
**Exit criteria.** Penalty summary + entry-time dedup.
**Rollback.** `git revert`.

---

### Step 13 — Portal UI polish: driver itinerary list + forwarder advance breakdown (B1.1, C2)
**ID:** B1.1 / C2 · **Size:** S · **Model:** default · **Depends on:** nothing

**Context brief.** (a) `DriverTripsPage.tsx:110-126` list card omits container number + customer name (spec US6 / B1.1) — the detail page has both; forwarder list already has the pattern. (b) `ForwarderAdvancesPage.tsx` shows total/outstanding/pending-count but feedback C2 wants four distinct figures (total, **requested settlement**, **paid**, remaining).

**Tasks.**
1. Add `containerNumbers` + `customerName` to the driver trip list card (mirror `ForwarderTripsPage.tsx:194-210`).
2. Add requested-settlement + paid figures to ForwarderAdvancesPage (extend `useForwarderAdvanceBalance` payload if needed).

**Files:** `DriverTripsPage.tsx`, `ForwarderAdvancesPage.tsx`, backend balance payload if needed.
**Verify.** tsc + build; manual: driver list shows container+customer; forwarder advance shows 4 figures.
**Exit criteria.** Both portal polish items done.
**Rollback.** `git revert`.

---

### Step 14 — Trip detail: TTBQ display + completion-photo gate [decision] (M3.1, §4.12)
**ID:** Module 3.1 / §4.12 · **Size:** S-M · **Model:** default · **Depends on:** Step 4 (photo decision)

**Context brief.** TTBQ (liters/100km) auto-calc + display was not found in `tripTotals.ts` or trip detail (Module 3.1 — likely missing). Completion-photo enforcement depends on the Step 4 decision.

**Tasks.**
1. Add `ttbq = totalFuelLiters / totalKm × 100` (guard km=0). **Data-source note:** `computeTripTotals` returns total fuel liters but NOT total km today — km is summed from legs only in `pnl.service.ts:305`. Either thread `totalKm` (Σ leg km) into the `computeTripTotals` return, or compute TTBQ at the call-site where km is available. Display on TripDetail alongside the norm comparison.
2. Apply the Step 4 photo decision (soft warn-gate or documented-optional).

**Files:** `shared/src/calculations/tripTotals.ts`, `TripDetailPage.tsx`/detail components.
**Verify.** shared calc test; tsc + build; manual: TTBQ shown on a completed trip.
**Exit criteria.** TTBQ displayed; photo behavior matches decision.
**Rollback.** `git revert`.

---

### Step 15 — RBAC / config / doc fixes (§4.18, §4.13, §4.1.1, CLAUDE.md)
**ID:** cleanup · **Size:** S-M · **Model:** default · **Depends on:** nothing

**Context brief.** Several low-risk drift items: (a) trip-instructions PUT (`routes/trips.ts:357`) lacks `requireRoles` — accountant can write (spec §4.18: manager-only). (b) CLAUDE.md RBAC table lists 4 roles, omits FORWARDER (code+spec have 5). (c) Trailer table duplication (spec §4.13 says no separate table; both `trailers` + truck fields exist). (d) `vatRate` not defaulted from customer on trip create (§4.1.1).

**Tasks.**
1. Add `requireRoles(ADMIN, MANAGER)` to the instructions PUT route (audit the exact route/line first — cited as `routes/trips.ts:357`, unverified) + gate the TripInstructionsCard by role in TripEditPage.
2. Add FORWARDER row to CLAUDE.md RBAC table (and the role doc).
3. Document trailer source-of-truth (pick `trucks.currentTrailerId`→`trailers` as canonical; deprecate redundant `trucks.trailerPlateNumber`/`trailerType` or formalize the sync). At minimum add an ADR; full consolidation optional.
4. Default `vatRate` from customer on create (add `customers.vat_rate` or use pricing-table lookup); migration if column added.

**Files:** `routes/trips.ts`, `TripEditPage.tsx`, `CLAUDE.md`, `trip-mutations.service.ts`, schema (if vat_rate).
**Verify.** tsc + build; manual: accountant PUT instructions → 403; new trip inherits customer VAT.
**Exit criteria.** All four drift items resolved.
**Rollback.** `git revert`.

---

## 3. What is DONE (do NOT rebuild)

Verified wired end-to-end with file:line evidence:

- **Trips:** 5-status machine, completion only via explicit button (A3.1 ✓), external carrier (§4.1.2 ✓), customer reference, multi-container + multi-seal at create/completion, trip legs combobox (ports), A3.2 save bug fixed (optimistic version + 409 retry).
- **Fuel/road:** AUTO/KHOÁN/supplement modes, mountain fixed-norm, `fuel_price_history`, `fuel_price_applied` snapshot (**D3 fixed**), actual unit price + variance, fuel-supplier filter, fuel voucher HTML/XLSX, auto-AP on LOCK/UNLOCK, driver fuel lookup, road-allowance table + formula.
- **Totals/P&L:** `computeTripTotals` OWN/EXTERNAL, 8 ancillary fee types, service margin, recordedRevenue, cap-table distribution snapshot, per-truck profit UI (no raw ID), monthly P&L aggregation (TRUCK/TRAILER split) — *except the Step 1 double-count + Step 2 standby gap*.
- **Receivables:** central ledger, LOCK→debit, payment matching + partial + FIFO, dynamic balance, aging buckets, statements, debt netting, customer inline AR (A13 ✓), payment entry (A8.2 ✓).
- **Payables:** expenses + photos, categories (renewable/reminder), back-dating (column exists; *validation gap → optional add*), PAID/UNPAID, AP mirror, FIFO vendor payment (A9 ✓), supplier inline AP (A14 ✓), ADJUSTMENT edit/delete.
- **Salary:** work-days (4 statuses, auto trip/Sunday), standard_work_days per-month, net formula, RBAC, trip-salary auto-fill, 5 earnings cards (B2 ✓) — *except STANDBY_LABOR (Step 2) + persisted totals (Step 9) + dailyRate decision (Step 4)*.
- **Penalty:** catalog + driver self-view (US7.3 ✓) — *except double-entry (Step 3) + summary/dedup (Step 12)*.
- **Tires:** table (serial/position/warranty/supplier), CRUD, grid, warranty alerts (driver+fleet tire page).
- **Forwarder:** trip search (C1.1 ✓), color-code (C1.2 ✓), container click-fill (C1.3 ✓), settlement per-container + chronological sort (C3 ✓), office settlement approval (D2 ✓), financial-data gating (§2 ✓).
- **Driver:** instructions read-only (B1.3 ✓), salary split display (B1 ✓ pending runtime verify), earnings cards (B2 ✓), vehicle-alert reminder (B4 ✓) — *except itinerary list container/customer (Step 13)*.
- **Admin/RBAC:** JWT+Casbin 5 roles, Users CRUD, audit log (broad), config RBAC.
- **Config:** 19 of 24 tables present & DONE (incl. 2 that are correctly transactional-not-config: Ledger, driver_work_days); 3 partial (fuel norms, container types → Step 8, salary periods → Step 9); 2 functionally-covered-but-not-spec-named (vehicle_alerts → Step 5, truck_profit_distribution → Step 6). 19 + 3 + 2 = 24 ✓.

---

## 4. Parallelism & ordering

```
Step 0 (pre-flight: migrations + Pete decisions)   ← do FIRST; gates schema steps
   │
   ├─ Step 1 (P&L double-count)        ─┐
   ├─ Step 3 (penalty double-entry)     │
   ├─ Step 7 (commission_type)          │
   ├─ Step 8 (container types fields)   ├── independent, concurrent
   ├─ Step 10 (AR reports+realtime)     │
   ├─ Step 11 (AP reports + debit PDF)  │
   ├─ Step 12 (penalty summary)         │
   ├─ Step 13 (portal UI polish)        │
   └─ Step 15 (RBAC/doc/config fixes)  ─┘

   Step 4 (decision gate)  → unblocks Step 14; informs spec text
   Step 2 (STANDBY_LABOR)  → HARD-blocks Step 9 (same confirmSalary fn; totals meaningless without the standby write)
   Step 5, 6 (vehicle_alerts, truck_profit_distribution) → after Step 0 migration hygiene
   ⚠ SERIALIZE file-conflicting steps before merging: Steps 1, 3, 7, 9 all edit `pnl.service.ts`;
     Steps 2, 9 both edit `attendance.service.ts`/`confirmSalary`. Run those sequentially or fold into one PR.
```

**Suggested serialization if not parallel:** 0 → 1 → 2 → 3 (money correctness first) → 4 (decisions) → 7,8,12,13,15 (quick wins) → 5,6,9,10,11,14 (larger). One PR per step.

---

## 5. Cross-cutting invariants (every step)

- **Migrations:** idempotent (`IF NOT EXISTS`, guard `ALTER TYPE ADD VALUE`); update `_journal.json`; reconcile duplicates first (Step 0). Prod uses `make deploy-backend`; dev auto-migrates via `make dev`.
- **Type-check:** the 3 CI tsc commands (`shared/` test files intentionally excluded — see memory). Backend: `cd backend && npm test` (integration suites need Postgres+Redis + fresh `pnpm db:migrate`).
- **Build:** `pnpm build` green.
- **Money:** `round2dp()` / `computeTripTotals()`; VND, no decimals; never truncate a column.
- **No raw IDs** in UI text.
- **RBAC:** new endpoints get `requireRoles`; FORWARDER blocked from financial.
- **Code review:** `/code-review` (max) before each merge. **Commit, do not push** without explicit instruction.

---

## 6. Open questions / out of scope

- **Pete decisions** (Step 4): dailyRate/social, external VAT, photo rule — block final spec text.
- **Prod migration state** (Step 0): must SSH-verify before trusting any "DONE" schema feature in production.
- **Trailer consolidation** (Step 15.3): full de-dup is optional; an ADR may suffice short-term.
- **Audit-log durability** (hardening, not in steps): fire-and-forget EventEmitter → durable sink; nice-to-have, not spec-required.

---

## 7. Acceptance (whole blueprint)

Steps 1–3 merged (money correctness restored); Step 0 migration hygiene verified on prod; Step 4 decisions documented and applied; Steps 5–15 merged per priority; full tsc/test/build green; `/code-review --max` clean per PR. PRODUCT-SPECS.md then fully met modulo the documented Pete decisions.
