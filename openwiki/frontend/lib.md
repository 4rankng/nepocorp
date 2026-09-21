---
type: frontend-lib
title: Library Helpers
description: Reference for frontend lib utilities — API client, format, date, round, route, maps, cap-table, csv, money, audit-helpers, profit-preview, calendar, liveFleet, liveRoute, notification client, overlay state, status variants.
tags: [lib, api-client, format, vietnamese, vnd, csv]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-4bbcf033d47d4cc2daab316d
    resource: repo://backend/src/services/map4d.ts
  - id: openwiki-source-8b5d43a8d6bc36254a73e5af
    resource: repo://backend/src/services/maps.service.ts
  - id: openwiki-source-a37f45340c4d90279983680c
    resource: repo://frontend/src/lib/api.test.ts
  - id: openwiki-source-79cd44ea11c40597832d7dd7
    resource: repo://frontend/src/lib/api/client.ts
  - id: openwiki-source-0108a0a6d0b3476552272ea2
    resource: repo://frontend/src/lib/api/index.ts
  - id: openwiki-source-94e2e6cf87afd4fcd606def6
    resource: repo://frontend/src/lib/calendar-month.ts
  - id: openwiki-source-2c4b5edb19bf383119d5e452
    resource: repo://frontend/src/lib/cap-table.ts
  - id: openwiki-source-0b71f70537ffa4945bfa35aa
    resource: repo://frontend/src/lib/csv.ts
  - id: openwiki-source-69b76e0506d65069e7b2f3fa
    resource: repo://frontend/src/lib/date.ts
  - id: openwiki-source-83e07eecdb8292c75c7ec3b7
    resource: repo://frontend/src/lib/format.ts
  - id: openwiki-source-dc5ad3e25cb8474fec6308c4
    resource: repo://frontend/src/lib/liveFleet.ts
  - id: openwiki-source-b1871283b007187cb6d6c74a
    resource: repo://frontend/src/lib/maps.ts
  - id: openwiki-source-0b767536e4ff2fd451820cb3
    resource: repo://frontend/src/lib/moneyInput.ts
  - id: openwiki-source-14b61910bf5183e405af62eb
    resource: repo://frontend/src/lib/notificationClient.ts
  - id: openwiki-source-9ba6de533e271b7f19255b9c
    resource: repo://frontend/src/lib/profit-preview.ts
  - id: openwiki-source-45ebca78a07d259caa965262
    resource: repo://frontend/src/lib/round.ts
  - id: openwiki-source-db90a460e9359b20afa8158d
    resource: repo://frontend/src/lib/route.ts
  - id: openwiki-source-5a513435f835adb7bbb06da4
    resource: repo://frontend/src/lib/routes.test.ts
  - id: openwiki-source-1702755a291d10a4d7d020c2
    resource: repo://frontend/src/lib/status-variants.ts
  - id: openwiki-source-5fdaee04264279630f2bb947
    resource: repo://shared/src/calculations/round.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO's frontend `lib/` holds pure helpers used across pages and hooks. Most
delegate math to `@tingting/shared` so the backend and frontend stay
byte-identical.

## API client

`frontend/src/lib/api.ts` exports a singleton `api` (or `ApiClient` class) that
wraps `fetch` with:

- Bearer-token injection from `localStorage`.
- Automatic snake_case request keys (so the client matches the backend
  serializer's response shape).
- Error mapping: 4xx → thrown object with Vietnamese message; 409 → conflict;
  5xx → fallback.
- `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete` shortcuts.

Tests live in `frontend/src/lib/api.test.ts`. The `http/` subfolder holds the
fetch wrapper + error mappers (`chunk-error.ts`).

## Formatters (`format.ts`)

Vietnamese-locale formatters used everywhere:

- `formatNumber(n)` — `vi-VN` locale, `.` thousands separator.
- `formatCompact(n)` — abbreviates ≥1M to "tr", ≥1B to "tỷ", ≥1K to "k".
- `formatCurrency(n)` — `"12.500.000 ₫"` (integer, ₫ suffix, no decimals).
- VND splitter that returns `{ num, unit }` so the dong sign / "tr" / "tỷ"
  renders at subtitle size next to the digits — used by the `<Money>` component.
- Money input parser used by `<input type="text">` numeric fields
  (`frontend/src/lib/moneyInput.ts`, tests in `moneyInput.test.ts`).

## Date (`date.ts`)

- `formatDayMonth(iso)` — `DD/MM`.
- `formatRelativeTime(iso)` — `Vừa xong`, `5 phút trước`, `2 giờ trước`,
  `Hôm qua`, `3 ngày trước`.
- Other helpers for month names, week start, etc.

## Round (`round.ts`)

Re-export shim — `frontend/src/lib/round.ts` is literally:

```ts
export { round2dp } from '@tingting/shared';
```

This exists so pages can `import { round2dp } from '@/lib/round'` without
importing from the shared package directly. The math lives in
[`@tingting/shared/calculations/round`](../../../../shared/src/calculations/round.ts).

## Route name parsing (`route.ts`)

- `splitRoute(name)` — splits "Hà Nội → Hải Phòng" into `{ from, to }` using
  one of `→ ⇒ -> - – >` as the separator.
- Used by the dispatch map, trip cards, and search dropdowns.

Tests: `routes.test.ts` and the route-splitter counterpart under
`frontend/src/lib/routes.ts`.

## Maps (`maps.ts`)

- `PlaceSuggestion`, `RouteSuggestion`, `RouteResult` types.
- In-memory autocomplete cache (50 entries, 5-min TTL) with the public
  `suggestions(query)` and `route(origin, destination)` wrappers that hit
  `/api/maps`. The Map4D integration lives on the backend in
  `backend/src/services/map4d.ts` and `maps.service.ts`.

## Cap-table dedup (`cap-table.ts`)

`activePartners(history)` — picks the latest snapshot date reached today and
dedupes to the most-recent entry per partner. Percentages are auto-calculated
from `contributionAmount`; never stored.

## CSV / XLSX export (`csv.ts`)

- `DownloadOptions` interface with title, subtitle, columnTypes (text /
  number / km / liters / currency / date / decimal), totalsColumns,
  totalsLabel (`TỔNG CỘNG`).
- Brand-aware XLSX export (emerald title band) using `exceljs`.
- Test page colocated where used.

## Live fleet (`liveFleet.ts`) and live route (`liveRoute.ts`)

Client wrappers over the live-fleet and live-route endpoints — typed result
shapes for the dispatch map and route preview.

## Notification client (`notificationClient.ts`)

Web-push subscription + payload decoder for service-worker push events.

## Audit helpers (`audit-helpers.ts`)

Frontend-side helpers for rendering audit log entries (color by severity, format
the before/after diff).

## Calendar (`calendar-month.ts`)

Builds the calendar grid for month pickers (with tests in
`calendar-month.test.ts`).

## Profit preview (`profit-preview.ts`)

Pure preview of profit distribution based on the active cap-table snapshot.
Used by `ProfitPage` and the trip-detail summary.

## Expense breakdown (`expense-breakdown.ts`)

Aggregates per-trip expenses by category for the trip-detail "Chi phí" card.

## Status variants (`status-variants.ts`)

Maps `TripStatus`, `PenaltyStatus`, etc. to Tailwind variant tokens (used by
the `statusStrip` component).

## Overlay state (`overlayState.ts`)

Tiny helper for animated overlays — mount → animate-in → unmount lifecycle.

## Agent highlight (`agentHighlight.ts`)

Helpers for the agent-directive UI (highlight cited entity IDs in trip cards).

## Tour target (`tourTarget.ts`)

Remaining onboarding-tour selectors (most onboarding was removed in commit
b9bdfe9; this file persists for any retained highlight points).

## Utils (`utils.ts`)

Generic helpers (`sleep`, `groupBy`, `uniqBy`, etc.).

## Where to read more

- Shared math — [shared/calculations.md](../shared/calculations.md)
- Hooks — [frontend/hooks.md](hooks.md)
- Pages that use these helpers — [frontend/app.md](app.md)
