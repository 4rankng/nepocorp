---
phase: 2
title: "Frontend: rewire pages to server pagination"
status: completed
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Frontend — rewire pages to server pagination

## Overview
Convert the seven violating UIs to consume the phase-1 envelopes: every paginated table gets its page from the server, every client-side aggregate load-all is replaced by its server aggregate.

## Requirements
- Functional: UsersPage server pagination/filter/sort; CustomersConfigPage + RoutesConfigPage use `usage-stats`; CustomersPage uses `/ledger/balances`; DriverTripsPage paginates; PenaltyPage windowed + paginated; forwarder trips page paginated.
- Non-functional: `placeholderData: keepPreviousData` on page-param queries (existing precedent `useCustomerStatement`); debounce search → reset page 1 (precedent SupplierListPage 300ms); page state in URL where the page already uses URL state conventions (only if trivially compatible — otherwise local state).
- UX conventions: Vietnamese labels unchanged; reuse existing footer/pagination styles (UsersPage has its own `users-pagination` styles — keep them, bind server total); no raw IDs; 44px touch targets on mobile pagination (design-system Pagination already conforms).

## Architecture
Fetch layer: `userClient.getUsers(params)`, `tripClient.getUsageStats(month)`, `driverClient.getTrips({page,limit,status})`, penalties via `usePenalties` params, `financialClient.getEntityBalances('CUSTOMER')` (exists? verify — else add `getCustomerBalances()` wrapping `/ledger/balances`). Query keys gain params (`qk` in `frontend/src/api/keys.ts`). No new abstractions — this mirrors the SupplierListPage/useSuppliers pattern exactly.

## Related Code Files
- Modify: `frontend/src/api/userClient.ts`, `frontend/src/hooks/useCatalogQueries.ts` (useUsers params), `frontend/src/api/keys.ts`
- Modify: `frontend/src/pages/UsersPage.tsx`, `frontend/src/features/users/components/UserTable.tsx` (props: server `total`, current-page rows; footer math from server)
- Modify: `frontend/src/api/tripClient.ts` (getUsageStats; fetchAllTrips stays — still used by dispatch/monthly/exports), `frontend/src/pages/config/CustomersConfigPage.tsx`, `frontend/src/pages/config/RoutesConfigPage.tsx`
- Modify: `frontend/src/api/financialClient.ts` (balances getter; delete `getAllLedgerEntries` if no other consumer), `frontend/src/hooks/useFinancialQueries.ts` (replace `useCustomerLedgerEntries` with balances-backed hook), `frontend/src/pages/CustomersPage.tsx` (debtMap ← balance, revenueMap ← tripRevenue)
- Modify: `frontend/src/api/driverClient.ts`, `frontend/src/hooks/useDriverQueries.ts`, `frontend/src/pages/DriverTripsPage.tsx`
- Modify: `frontend/src/hooks/usePenalties.ts`, `frontend/src/pages/PenaltyPage.tsx`, `frontend/src/features/penalties/components/PenaltyTable.tsx` (fetch window = 13 months back from selected month; month KPIs computed over windowed data; visible month rows paginated)
- Modify: forwarder trips page (locate under `frontend/src/pages/` — forwarder portal) + its client/hook
- Delete: none expected; `getAllLedgerEntries` + `useCustomerLedgerEntries` if orphaned

## Implementation Steps
1. UsersPage: swap `useUsers()` → `useUsers({page,search,filter,sortBy,sortOrder})`; remove `filtered`/`paginated` slice memo (keep KPIs from `counts`); tabs/search/sort changes reset page (debounce search); UserTable footer `startIdx/endIdx/totalPages` from server `total`; pass `paginated=items`.
2. Config pages: replace fetchAllTrips blocks with `useQuery(qk.trips.usageStats(month), tripClient.getUsageStats)`; build `statsMap`/`routeTripStats` from the aggregate arrays; remove unused imports (`TripDetail`, `tripClient.fetchAllTrips`).
3. CustomersPage: `useCustomerBalances()` → `/ledger/balances?entityType=CUSTOMER`; `debtMap = entityId → balance`; `revenueMap = entityId → tripRevenue`; delete ledger-entries hook + client fn if orphaned. Verify `buildCustomerDebtMap` semantics = latest running balance (if it instead sums debit−credit, replicate server-side in the same balances query and keep the function for the statement page only).
4. DriverTripsPage: `useDriverTrips({page,limit:20,status})`; status tabs drive the server param (tab counts: derive from `getTripsSummary` statusCounts if already fetched by the page, else drop per-tab counts — check page); add design-system `Pagination` (or "Tải thêm" if the list is grouped-scroll — follow existing mobile list conventions).
5. PenaltyPage: `usePenalties({dateFrom: selectedMonthStart−12mo, dateTo: endOfSelectedMonth, page, limit})`; PenaltyTable consumes `{items,total}`; month KPIs (`monthPenalties`, prev-month compare, `totalMonthAmount`) computed from windowed items (unchanged logic, bounded input); CSV export exports the fetched window (same as today's data set).
6. Forwarder trips page: pass `page` + keep filters; footer range from server `total`; wire `Pagination`.
7. Sweep: grep `fetchAllTrips(` — remaining callers must all be in the accepted-bounded list; grep `\.slice(` in pages for any leftover client pagination.

## Success Criteria
- [x] Each rewired page's network tab shows page-scoped requests (page 2 → `?page=2`).
- [x] UsersPage KPI numbers identical to pre-change on same data; config-page trip/revenue counts identical; CustomersPage debt + revenue maps identical (spot-check vs DB).
- [x] `npx tsc -b` prints "No errors" (parse text — exit code unreliable per repo quirk); `npx vite build` succeeds; vitest suites touching changed files pass.

## As-built notes (2026-08-22)

- **UsersPage/UserTable**: full server pagination (tabs/search/sort/page as query params, 300ms debounce, `keepPreviousData`); footer + KPI + active-pill counts all server-sourced; `filtered`/`paginated` slice memo deleted. `UserTable` lost its `users`/`filtered` props, gained `filteredTotal`.
- **Config pages**: single `tripClient.getUsageStats()` call each; both `fetchAllTrips({})` blocks gone.
- **CustomersPage**: `useCustomerBalances()` → `/ledger/balances`; debtMap = `arDebt`, revenueMap = `tripRevenue`. `buildCustomerDebtMap` kept as the typed reference implementation (unit test still passes; SQL in financial.service mirrors it — comment cross-links both).
- **DriverTripsPage**: server pagination + status param + design-system `Pagination` footer; tab pills use server `statusCounts` (pills with 0 hidden, same as before).
- **PenaltyPage** (deviation from original step 5): PenaltyTable is an analytics dashboard (month KPIs, streaks, YTD grades over full history) — a paged fetch would break every KPI. Implemented instead as a **bounded window** fetch (`dateFrom = Jan 1 of min(selYear−2, currentYear)`, `limit=1000`) that covers every visible figure; all table math unchanged. A server-side summary endpoint remains the follow-up if penalty volume grows.
- **Forwarder trips** (deviation from original step 6): portal list is month-bounded; hook fetches the whole window in one large page (`limit=1000`) so hero KPIs (Σ containers, payment highlights) stay exact — endpoint is paginated and additive if a pager is added later.
- `getAllLedgerEntries` deleted (0 survivors); `useCustomerBalances` replaces `useCustomerLedgerEntries`.

## Risk Assessment
- **DriverTripsPage tab counts** — if tabs show counts per status, server pagination by status needs counts per status. Signal: page renders `undefined` counts. Response: reuse `tripClient.getTripsSummary()`-style counts if the endpoint already returns them for the driver scope; else backend adds `byStatus` counts to the driver trips envelope (phase-1 file's additive rule).
- **PenaltyTable hidden dependencies on full history** (e.g. "last 90 days" cutoff list beyond the window). Signal: empty KPI/prev-month section. Response: widen window (e.g. 25 months) — bounded either way.
- **UsersPage secondary consumers of `qk.catalogs.users`** (invalidations elsewhere). Response: keep the key base, add params; invalidations by key prefix still fire.
- **Forwarder portal pages** may not exist in this repo's active routes (vantai demo surface). Signal: no page found. Response: mark V7 backend-only (envelope additive) and note it.
