---
phase: 1
title: "Backend: paginate + aggregate"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Backend — paginate + aggregate

## Overview
Add server-side pagination (or SQL aggregation) to the six endpoints that currently return unbounded lists, keeping response shapes additive so existing consumers keep parsing.

## Requirements
- Functional: V1 users `{items,total,page,pageSize,counts}` with search/filter/sort; V2+V3 new `GET /trips/usage-stats?month=`; V4 `tripRevenue` added to `/ledger/balances` payload; V5 driver `/trips` paginated + status filter; V6 `/penalties` dateFrom/dateTo + paginated envelope; V7 forwarder `/trips` paginated.
- Non-functional: count query runs in parallel with page query; no N+1; whitelisted sort columns only (no dynamic SQL from user input).

## Architecture
Standard = `parsePagination(req, {limit, maxLimit})` from `backend/src/routes/utils/pagination.ts` + total via `count(*)` on the same WHERE. Envelope `{items, total, page, pageSize}` matches `PaginatedResponse<T>` (`shared/src/types`) and `crud-factory` precedent. Aggregates (usage-stats, tripRevenue) replace client-side reduce loops with SQL `GROUP BY`.

## Related Code Files
- Modify: `backend/src/services/user.service.ts` (listUsers paginated variant), `backend/src/routes/auth.ts` (/users query params)
- Modify: `backend/src/routes/trips.ts` (new GET /usage-stats — MUST register before GET /:id), `backend/src/services/trip-queries.service.ts` or a new small aggregate fn
- Modify: `backend/src/routes/driver.ts`, `backend/src/services/driver.service.ts` (getDriverTrips pagination + status)
- Modify: `backend/src/routes/financial/penalties.routes.ts`, `backend/src/services/financial.service.ts` (getPenalties dateFrom/dateTo + envelope)
- Modify: `backend/src/routes/forwarder.ts` + its service (getForwarderTrips limit/offset)
- Modify: `backend/src/services/financial.service.ts` `getEntityBalances` (add tripRevenue aggregate)
- Create: `backend/src/tests/users-pagination.test.ts`, `backend/src/tests/trip-usage-stats.test.ts` (follow existing node:test + tsx patterns; integration style against dev PG)
- Modify: `shared/src/index.ts` barrel if any new shared type is added

## Implementation Steps
1. Pre-check (grep): consumers of `AUTH.USERS`, `/penalties`, forwarder `/trips`, `getDriverTrips` beyond the known pages — confirm additive envelope is safe for every consumer.
2. V1 users: `listUsersPaginated({page,limit,search,roleGroup,status,sortBy,sortOrder})` — rows query + one conditional-aggregate count query (`count(*) FILTER (WHERE role='DRIVER')` etc. for staffCount/driverCount/inactiveCount/total). Sort whitelist: `username|fullName|role|status|createdAt`. Search: `unaccent(full_name) ILIKE unaccent(%q%) OR username ILIKE` (crud-factory escaping precedent). Route passes parsed params; keep Casbin `users` authz untouched.
3. V2+V3 usage-stats: `GET /trips/usage-stats?month=YYYY-MM` (default current month). Two GROUP BY queries over trips in `[monthStart, monthEnd)` on `departure_date`: per-customer `{customerId, trips, revenue}` (revenue = SUM(revenue), matching `parseFloat(t.revenue)` sum) and per-route `{routeId, trips}`. No status filter (matches current client logic). Cache-invalidate not needed (derived read).
4. V4: `getEntityBalances` — keep `selectDistinctOn` latest balance; add second query `SUM(CASE WHEN txn_type='TRIP_REVENUE' THEN debit ELSE 0 END) GROUP BY entity_id`; merge → rows gain `tripRevenue: number`. Additive.
5. V5 driver trips: `getDriverTrips(driverId, {page,limit,status})` → `{items,total,page,pageSize}`, ORDER BY departure_date DESC, id DESC (stable).
6. V6 penalties: `getPenalties({driverId,dateFrom,dateTo,page,limit})` → `{items,total,page,pageSize}`; ORDER BY date DESC, id DESC. Response envelope replaces bare array (`usePenalties` already parses `{items} | array`, so additive).
7. V7 forwarder trips: `getForwarderTrips(status, {search,dateFrom,dateTo,page,limit})` → keep `{items, counts}` + add `total, page, pageSize`; ORDER BY departure_date DESC.
8. Tests: users pagination (page 2 slice, search, counts math vs seeded users); usage-stats numbers vs seeded trips (compare against manual sum of same-month trips); penalties envelope + date filter; driver trips pagination.

## Success Criteria
- [x] All six endpoints compile and return envelopes; `curl`-able with page params (verified via tests).
- [x] `cd backend && npm test` green.
- [x] No consumer of a changed endpoint breaks (grep-verified list in step 1).

## As-built notes (2026-08-22)

- users: `total` = **filtered** count (pagination footer); KPI `counts` = unfiltered visibility set — caught by `users-pagination.test.ts` (7≠4 mismatch on first run), fixed with a third parallel count query.
- driver trips: envelope also carries `statusCounts` (all-status FILTER counts) so the portal's status pills keep counts while a filtered page is open.
- penalties + forwarder trips: routes pass `parsePagination(req, { limit: 200, maxLimit: 1000 })` — their pages fetch one bounded window (multi-year / month) whole; see phase-02 as-built.
- getEntityBalances: gained BOTH `tripRevenue` and `arDebt` (Σ debit − Σ credit excluding EXTERNAL_CARRIER_COST, VENDOR_PAYMENT, and carrier-note UNLOCK_REVERSAL — the exact `buildCustomerDebtMap` rule).
- Tests: `users-pagination` (5), `trip-usage-stats` (2), `list-endpoints-pagination` (3), `ledger-balance-aggregates` (1) — all green against dev PG.

## Risk Assessment
- **Sort/search semantics drift (users)** — UsersPage sorts by `fullName || username`. Signal: KPI/footer numbers differ from old UI on same data. Response: replicate exact coalesce in SQL (`COALESCE(full_name, username)`); test asserts order matches old client sort on seeded data.
- **usage-stats month math** — client used `departureDate.startsWith('YYYY-MM')`; DB column may be `date` or text. Signal: test totals mismatch. Response: build `[start, nextMonthStart)` bounds; verify column type in schema first.
- **Forwarder counts shape** — `counts` must stay; only additive fields. Pre-check consumers.
- If a change turns out to break an unknown consumer (agent semantic gateway hitting these endpoints): revert that endpoint's shape to additive-only (keep old field, add page fields) rather than replanning.
