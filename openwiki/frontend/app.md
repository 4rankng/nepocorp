---
type: frontend-pages
title: Pages, Components & Routing
description: Routing tree, page-to-role mapping, shared UI primitives, TripForm composition, LocationAutocomplete, Vietnamese copy and VND formatting.
tags: [frontend, pages, routing, role-based, tripform, vietnamese]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-2a2dfd1bcd8735843534fafd
    resource: repo://backend/src/index.ts
  - id: openwiki-source-33c88bdea37bbafe08faa8fd
    resource: repo://backend/src/routes/maps.ts
  - id: openwiki-source-7610fde5069b313fb993d644
    resource: repo://docs/code-standards.md
  - id: openwiki-source-454c9bcdde0b77b35e0fc994
    resource: repo://frontend/src/App.tsx
  - id: openwiki-source-180c691c7ef0a64b48f6f781
    resource: repo://frontend/src/components/LocationAutocomplete.tsx
  - id: openwiki-source-e48c863ade5e596cadaaf23a
    resource: repo://frontend/src/components/trip/FuelAllocationEditor.tsx
  - id: openwiki-source-37ea434326e9b417405bcb34
    resource: repo://frontend/src/components/trip/FuelTollsRevenueCard.tsx
  - id: openwiki-source-922c1428284ba73e103ef19f
    resource: repo://frontend/src/components/trip/JourneyLegsCard.tsx
  - id: openwiki-source-309466e84961287566ae1825
    resource: repo://frontend/src/lib/emptyIllustrations.ts
  - id: openwiki-source-83e07eecdb8292c75c7ec3b7
    resource: repo://frontend/src/lib/format.ts
  - id: openwiki-source-f262a812ce829b2f592bf03c
    resource: repo://frontend/src/pages/TripCreatePage.tsx
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO's frontend is a React 19 + Vite + Tailwind v4 SPA. Routing is centralized
in `frontend/src/App.tsx` with role-based guards; pages are lazy-loaded so each
route pays its own bundle cost only when visited.

## Routing tree (`App.tsx`)

All routes are wrapped in `Layout` and a per-route `ErrorBoundary` so a crash
in one page never blocks navigation. Role-based guards use in-component helpers
defined in `App.tsx`:

| Helper | Allowed roles | Bounce target |
|---|---|---|
| `adminOnly` | ADMIN/MANAGER | portal home if DRIVER/FORWARDER |
| `managerOrAdminOnly` | ADMIN/MANAGER | portal home or staff home otherwise |
| `officeStaffOnly` | ADMIN/MANAGER/ACCOUNTANT | portal home otherwise |
| `strictAdminOnly` | ADMIN | portal home or staff home otherwise |
| `driverOnly` | DRIVER | forwarder/staff home otherwise |
| `forwarderOnly` | FORWARDER | driver/staff home otherwise |

The portal home for DRIVER is `/my-trips`; for FORWARDER it is
`/my-forwarder-trips`; for office staff it is `/dashboard`.

## Pages by role

### Office (ADMIN/MANAGER/ACCOUNTANT)

- **Dashboard** — `/dashboard` — KPIs, decision items, live fleet.
- **Dispatch** — `/dispatch` — ADMIN-only map of IN_TRANSIT trips.
- **Fleet** — `/fleet` — trucks, drivers, trailers overview.
- **Trips** — `/trips` (list), `/trips/new`, `/trips/:id`, `/trips/:id/edit`.
- **Finance** — `/finance` — receivables overview.
- **Profit** — `/profit` — P&L by truck.
- **Debt list & detail** — `/debt`, `/debt/:id`, `/debt/:id/billing/new`.
- **Penalties** — `/penalties`.
- **Advances** — `/advances`, `/admin/advance-settlements` (office staff).
- **Audit log** — `/audit-logs` (MANAGER/ADMIN).
- **Customers** — `/customers`, `/customers/:id`, `/customers/:id/billing/new`.
- **Suppliers & expenses** — `/suppliers`, `/suppliers/:id`, `/expenses`,
  `/expenses/new`, `/expenses/:id/edit`.
- **Payables** — `/payables`, `/payables/:id`.
- **Salary** — `/salary` — attendance + periods.
- **Users** — `/users` (office staff).
- **Config** — `/config/*` (catalog admin: trailers, trucks, owners, routes,
  cargo types, pricing tables, road allowances, penalty reasons, fuel, fuel
  suppliers, app settings, company info, trip expense, cap table, customers,
  salary periods, expense categories, tire positions, forwarder expense
  types, debit-note templates, FAQ entries).
- **Chatbot monitoring** — `/chatbot-monitoring` (strict ADMIN).

### Driver portal (`/my-*`)

- `/my-trips` — list of own trips.
- `/my-trips/:id` — trip detail.
- `/my-earnings` — earnings + advances.
- `/my-penalties` — own penalty history.

### Forwarder portal (`/my-forwarder-*`)

- `/my-forwarder-trips` — list of own trips.
- `/my-forwarder-trips/:id` — trip detail.
- `/my-advances` — advance requests.
- `/my-settlements`, `/my-settlements/new`, `/my-settlements/:id` — settlement
  creation and print.

Office can also reach settlement print at `/settlements/:id`.

## TripForm composition

The trip create/edit pages are split into composable cards under
`frontend/src/components/trip/`. Each card owns its own state slice, and
`useTripForm` + `useTripFormContext` orchestrate them:

- `TripInfoCard` — driver, truck, trailer, customer, dates, route.
- `JourneyLegsCard` — `JourneyLegRow` instances (origin, destination, km,
  loading type HANG/VO). Leg math flows into AUTO fuel mode.
- `FuelTollsRevenueCard` — `FuelSection` (mode toggle AUTO/FLAT_RATE +
  `FuelAllocationEditor` for per-purchase rows) and tolls/revenue.
- `AncillaryFeesCard` — fees with `ancillary-fees-card-utils` validation.
- `ContainerInstancesCard` — containers and seals (per-trip container list).
- `ImagesNotesCard` — trip photo upload.
- `TripInstructionsCard` — driver instructions.
- `TripChecklistPanel` + `TotalsPanel` — live totals preview backed by
  `computeTripTotals` from `@tingting/shared` so what the user sees matches
  what the server will compute on save.
- `ActionBar` — Save / dispatch / cancel actions with permission-aware
  buttons.
- `AllowanceSection`, `FuelModeToggle`, `FuelAllocationEditor`,
  `RouteChips`, `ProgressPills`, `SectionDivider`, `CardSection`, `TipCard`,
  `TripSummaryCard` are the supporting primitives.

The form uses `useDirtyGuard` to warn on back-navigation and `useBackShortcut`
to handle Escape / hardware back. Validation mirrors the backend Zod schemas.

## Location autocomplete (`LocationAutocomplete.tsx`)

Used by TripForm legs and any "origin/destination" picker. Backed by Map4D
(Vietnamese map provider); calls `backend/src/services/map4d.ts` /
`backend/src/services/maps.service.ts` and the `/api/maps` router
(`casbinAuthz('maps')` — every role can read). Returns Vietnamese-formatted
addresses with lat/lng.

## Formatters (`frontend/src/lib/format.ts`)

Vietnamese-locale formatters used everywhere:

- `formatNumber(n)` — `vi-VN` locale with `.` thousands separator.
- `formatCompact(n)` — abbreviates ≥1M to "tr", ≥1B to "tỷ", ≥1K to "k".
- `formatCurrency(n)` — `12.500.000 ₫`.
- A VND splitter that returns `{ num, unit }` so the dong sign / "tr" / "tỷ"
  renders at subtitle size next to the digits — used by the `<Money>` component.

## Other UI primitives

- `<Money>` — VND with subtitle-sized unit; used in every money cell.
- `<statusStrip>` — 3×20px color bar on every status display (desktop +
  mobile).
- Empty-state illustrations — `frontend/src/lib/emptyIllustrations.ts`.
- `confirm-dialog.tsx`, `Modal.css`, `Drawer.css`, `Toast` (in
  `components/shared/`).
- Charts — `frontend/src/components/charts/` (used by dashboard and P&L).
- Asset icons — `frontend/src/components/AssetIcon.tsx`.

## Vietnamese copy expectations

- User-visible strings: Vietnamese (`Lưu`, `Hủy`, `Đang tải…`, `Không có quyền
  truy cập`, `Không tìm thấy API`).
- Money: `₫` suffix, no decimals.
- Dates: `vi-VN` locale.
- Mobile breakpoints: DRIVER/FORWARDER pages are mobile-first.

## Where to read more

- Routing + role guards — `frontend/src/App.tsx`
- API client wrapper — [frontend/lib.md](lib.md)
- Custom hooks — [frontend/hooks.md](hooks.md)
- API surface (for what each page calls) — [backend/api-routes.md](../backend/api-routes.md)
