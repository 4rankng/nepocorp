---
title: "Server-side pagination"
description: "Eliminate every load-all-then-paginate-client-side hack: unbounded list endpoints get parsePagination + {items,total,page,pageSize}; client-side aggregate load-alls get server aggregates."
status: in-progress
priority: P1
effort: "1d"
tags: [backend, frontend, pagination, performance]
created: 2026-08-22
---

# Server-side pagination

## Overview

Audit found the backend pagination standard (`parsePagination` + `{items,total,page,pageSize}` envelope, `crud-factory`, shared `PaginatedResponse<T>`) is already adopted by trips/notifications/config/ledger/expense/audit — but six surfaces still load all records and paginate or aggregate in the browser. This plan converts each to proper server-side pagination or a server-side aggregate, and documents the bounded patterns that are intentionally exempt.

**Mode:** hard (auto-detected). **Scope:** HOLD (full requested scope: "ensure frontend backend use proper pagination, no hack load all records and pagination at frontend"). User directed: plan and implement automatically without human interaction — interactive gates (validation interview, handoff question) are waived; whole-plan consistency self-sweep replaces red-team.

## Audit Result (evidence-based inventory)

### Violations to fix

| # | Surface | Evidence |
|---|---------|----------|
| V1 | `GET /auth/users` → `userService.listUsers()` → `useUsers()` → **UsersPage** + `UserTable` | Returns full list; page does client filter + sort + `filtered.slice(startIndex, startIndex+pageSize)` (`frontend/src/pages/UsersPage.tsx:121`, `features/users/components/UserTable.tsx:278-280`) |
| V2 | **CustomersConfigPage** | `tripClient.fetchAllTrips({})` loads ALL trips ever (paged loop, 100/page) to compute current-month per-customer `{trips, revenue}` (`pages/config/CustomersConfigPage.tsx:125`) |
| V3 | **RoutesConfigPage** | Same `fetchAllTrips({})` for per-route trip counts (`pages/config/RoutesConfigPage.tsx:34`) |
| V4 | **CustomersPage** | `getAllLedgerEntries({entityType:'CUSTOMER'})` = `fetchAllPaginated` loop over the append-only ledger → client-side `debtMap` + `revenueMap` (`hooks/useFinancialQueries.ts:28`, `pages/CustomersPage.tsx:218-245`) |
| V5 | `GET /driver/trips` → **DriverTripsPage** | All driver trips unbounded, client status filter renders all (`backend/src/routes/driver.ts:22-26`) |
| V6 | `GET /penalties` → **PenaltyPage** | All penalties ever returned; table filters/aggregates months client-side (`backend/src/routes/financial/penalties.routes.ts:14-17`, `hooks/usePenalties.ts:24`) |
| V7 | `GET /forwarder/trips` (forwarder portal) | Returns full trip history + counts, no limit (`backend/src/routes/forwarder.ts:44-56`) |

### Already proper (verified — no change)

trips `GET /` (parsePagination + envelope), notifications, all `config.ts` crud-factory lists (customers/suppliers/expense-categories…), debit-note-templates, expense `GET /` (zod page/pageSize), ledger `GET /ledger` (page/limit), vehicle-schedules (zod list query), advances envelopes, audit logs, TripListPage, ExpenseListPage, AuditLogPage, SupplierListPage, CustomersPage list tab.

### Accepted bounded patterns (exempt, documented)

- `/catalogs/bootstrap` + dropdown `getAll*` (customers/suppliers/expenseCategories): bounded reference data for form dropdowns.
- `useDispatchData` `fetchAllTrips({status: CREATED|IN_TRANSIT})`: operationally bounded work queues (boards, not paginated tables).
- `useMonthlyTrips` `fetchAllTrips(dateFrom/dateTo)`: month-bounded salary computation.
- `tripExports` paged fetch loop for CSV export: export assembly over the paginated API (not UI pagination).
- Approval-queue pending set (card slices 15 for display with server `total`).
- Driver `/penalties` (date-windowed per driver), billing-documents list (per-entity), salary periods (tiny domain).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | V1–V7 all fetch only the visible page (or a bounded server aggregate) — zero unbounded load-all in list UIs | P1 |
| 2 | No behavior regression: filters, sorts, KPIs, tabs, exports keep working with identical numbers | P1 |
| 3 | Envelope consistency: changed endpoints return `{items, total, page, pageSize}` (+ additive extras) | P1 |
| 4 | Backend tests for changed endpoints; frontend tsc + vitest + vite build green | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Backend: paginate + aggregate](./phase-01-backend-pagination.md) | Completed |
| 2 | [Frontend: rewire pages to server pagination](./phase-02-frontend-rewiring.md) | Completed |
| 3 | [Verification + consistency sweep](./phase-03-verification.md) | Completed |

## Success Criteria

- [ ] Grep gates: no `fetchAllTrips({})` with empty filter; no `.slice(` pagination over a server list in pages (UsersPage pattern gone); `getAllLedgerEntries` has no consumers (or is deleted).
- [ ] UsersPage: footer range/total from server; KPI counts from server; page 2 request hits `?page=2` (network).
- [ ] CustomersConfigPage / RoutesConfigPage: single `usage-stats` request replaces N-page trip load.
- [ ] `cd backend && npm test` green (incl. new endpoint tests).
- [ ] Frontend `tsc -b` prints "No errors" text; `vite build` succeeds; targeted vitest suites pass.

## Risk Assessment

Biggest risk: silent behavior drift in KPI/count math (users KPIs, penalty month totals, customer debt/revenue maps). Mitigation: replicate exact existing semantics server-side (verified per surface in phase files) + tests asserting the numbers against seeded data. Rollback: each commit is scoped per phase; endpoints keep additive shapes (old array/`{items}` consumers still parse).

## Notes

- Commits land on `main` but are NOT pushed (push = auto-deploy to prod per repo CI; deploy is a human decision).
- `.ua` knowledge graph is 14 commits stale (95 files) — hook protocol classifies as FULL_UPDATE; recommend `/understand --full` separately. Not part of this plan.

<!-- slug: server-side-pagination -->
