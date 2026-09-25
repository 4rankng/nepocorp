---
type: frontend-lib
title: Frontend Library Helpers
description: Reference for frontend/src/lib — the transport-level API client (lib/api) with session-expiry handling, the http/ pagination helpers, Vietnamese formatters, routes/route-map, maps and live-fleet helpers, and the overlay/tour UI-state utilities.
tags: [lib, api-client, http, pagination, format, vietnamese, vnd, leaflet, session]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-24T15:30:51.512Z
sources:
  - id: openwiki-source-33c88bdea37bbafe08faa8fd
    resource: repo://backend/src/routes/maps.ts
  - id: openwiki-source-4c204a78898209d84dde235d
    resource: repo://backend/src/routes/utils/pagination.ts
  - id: openwiki-source-4bbcf033d47d4cc2daab316d
    resource: repo://backend/src/services/map4d.ts
  - id: openwiki-source-8b5d43a8d6bc36254a73e5af
    resource: repo://backend/src/services/maps.service.ts
  - id: openwiki-source-bff18f46bfb5377ed63bc431
    resource: repo://backend/src/services/trip-mutations.service.ts
  - id: openwiki-source-433b033f17b1cac24c39391d
    resource: repo://frontend/src/api/tripClient.ts
  - id: openwiki-source-331ede0cc87968d49cae9940
    resource: repo://frontend/src/components/shared/Money.tsx
  - id: openwiki-source-215892ff58f060775493c363
    resource: repo://frontend/src/design-system/hooks/useToken.ts
  - id: openwiki-source-a42a92c05330af4cea9a52db
    resource: repo://frontend/src/features/dispatch/components/DispatchTripCard.tsx
  - id: openwiki-source-1d63b4d9d6dc933b5d524796
    resource: repo://frontend/src/features/dispatch/components/LiveFleetMap.tsx
  - id: openwiki-source-9f3012bd7b3b7e37fa71ae81
    resource: repo://frontend/src/features/trips/tripColumns.tsx
  - id: openwiki-source-bb092e08d1f79eadbe76eaa9
    resource: repo://frontend/src/hooks/useAnimatedOverlay.ts
  - id: openwiki-source-6cccf1e498f6f40830189fd5
    resource: repo://frontend/src/hooks/useAuth.tsx
  - id: openwiki-source-e9557f93f4304771d1c48ad2
    resource: repo://frontend/src/hooks/useBackShortcut.ts
  - id: openwiki-source-dca90ac3cb5827b4d65e5bd4
    resource: repo://frontend/src/hooks/useTripQueries.ts
  - id: openwiki-source-94ae9ba23d812d761cd31bbd
    resource: repo://frontend/src/lib/agentHighlight.ts
  - id: openwiki-source-a37f45340c4d90279983680c
    resource: repo://frontend/src/lib/api.test.ts
  - id: openwiki-source-79cd44ea11c40597832d7dd7
    resource: repo://frontend/src/lib/api/client.ts
  - id: openwiki-source-5540709fa9741b2d00c70d30
    resource: repo://frontend/src/lib/api/errors.ts
  - id: openwiki-source-0108a0a6d0b3476552272ea2
    resource: repo://frontend/src/lib/api/index.ts
  - id: openwiki-source-4a8c5d6fbda12646585a048c
    resource: repo://frontend/src/lib/api/photo.ts
  - id: openwiki-source-0ea6f7e02e080f27ba952776
    resource: repo://frontend/src/lib/api/session.ts
  - id: openwiki-source-61f8b4a0eed6e33b2757b7d4
    resource: repo://frontend/src/lib/audit-helpers.ts
  - id: openwiki-source-94e2e6cf87afd4fcd606def6
    resource: repo://frontend/src/lib/calendar-month.ts
  - id: openwiki-source-2c4b5edb19bf383119d5e452
    resource: repo://frontend/src/lib/cap-table.ts
  - id: openwiki-source-79395e5dd2432d131123d5c9
    resource: repo://frontend/src/lib/chunk-error.ts
  - id: openwiki-source-0b71f70537ffa4945bfa35aa
    resource: repo://frontend/src/lib/csv.ts
  - id: openwiki-source-69b76e0506d65069e7b2f3fa
    resource: repo://frontend/src/lib/date.ts
  - id: openwiki-source-309466e84961287566ae1825
    resource: repo://frontend/src/lib/emptyIllustrations.ts
  - id: openwiki-source-d46c91dee0e3f1dfc0c7eca3
    resource: repo://frontend/src/lib/expense-breakdown.ts
  - id: openwiki-source-83e07eecdb8292c75c7ec3b7
    resource: repo://frontend/src/lib/format.ts
  - id: openwiki-source-12cdb57921e55d32d33542b9
    resource: repo://frontend/src/lib/http/paginate.test.ts
  - id: openwiki-source-bbefe665e05e84bb6704baab
    resource: repo://frontend/src/lib/http/paginate.ts
  - id: openwiki-source-0639dcea6fd4cb7305f2fad0
    resource: repo://frontend/src/lib/http/query.ts
  - id: openwiki-source-dc5ad3e25cb8474fec6308c4
    resource: repo://frontend/src/lib/liveFleet.ts
  - id: openwiki-source-fa7b5f6b32e2beeef1d9eddd
    resource: repo://frontend/src/lib/liveRoute.ts
  - id: openwiki-source-b1871283b007187cb6d6c74a
    resource: repo://frontend/src/lib/maps.ts
  - id: openwiki-source-0b767536e4ff2fd451820cb3
    resource: repo://frontend/src/lib/moneyInput.ts
  - id: openwiki-source-14b61910bf5183e405af62eb
    resource: repo://frontend/src/lib/notificationClient.ts
  - id: openwiki-source-97adf1a273d3126dd6de850a
    resource: repo://frontend/src/lib/overlayState.test.ts
  - id: openwiki-source-81eacac9f0cd63160b00ff17
    resource: repo://frontend/src/lib/overlayState.ts
  - id: openwiki-source-9ba6de533e271b7f19255b9c
    resource: repo://frontend/src/lib/profit-preview.ts
  - id: openwiki-source-45ebca78a07d259caa965262
    resource: repo://frontend/src/lib/round.ts
  - id: openwiki-source-db90a460e9359b20afa8158d
    resource: repo://frontend/src/lib/route.ts
  - id: openwiki-source-5a513435f835adb7bbb06da4
    resource: repo://frontend/src/lib/routes.test.ts
  - id: openwiki-source-f60f9fd50fdfa4d9c70a9232
    resource: repo://frontend/src/lib/routes.ts
  - id: openwiki-source-1702755a291d10a4d7d020c2
    resource: repo://frontend/src/lib/status-variants.ts
  - id: openwiki-source-611c5f8c861a93181072b6cd
    resource: repo://frontend/src/lib/tourTarget.test.ts
  - id: openwiki-source-0d7526c9ba1505ba6e42227f
    resource: repo://frontend/src/lib/tourTarget.ts
  - id: openwiki-source-14d82312bef47575e0aec2f4
    resource: repo://frontend/src/lib/utils.ts
  - id: openwiki-source-4622f09188c7b2fdc738352b
    resource: repo://frontend/src/main.tsx
  - id: openwiki-source-5fdaee04264279630f2bb947
    resource: repo://shared/src/calculations/round.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-24T15:30:51.512Z" }
---

The frontend `src/lib/` folder holds pure helpers shared by pages, hooks, and
feature components. Two structural rules hold across the folder:

- **Math is delegated to `@tingting/shared`** wherever backend and frontend
  compute the same number, so both sides stay byte-identical.
- **`lib/api` is transport-only.** Domain endpoint knowledge lives in
  `src/api/*Client.ts`; the client knows nothing about trips, trucks, or Zod.

## API client (`lib/api/`)

There is no single `lib/api.ts` file. The module is a folder whose `index.ts`
barrel re-exports the public surface (`api`, `ApiError`,
`formatErrorMessage`, `getAuthenticatedPhotoUrl`) so the ~46 existing
`import { api } from '../lib/api'` call sites keep working.

### Transport (`client.ts`)

`client.ts` is a thin wrapper around `fetch` for the REST API:

- Base URL is `import.meta.env.VITE_API_BASE`, defaulting to `/api`.
- **Token storage is delegated to
  `design-system/hooks/useToken`** — the only place that touches the
  `localStorage['token']` key (with an in-memory cache;
  `refreshTokenFromStorage()` invalidates it). `api.setToken` /
  `api.clearToken` forward to it, and the constructor hydrates the cache
  eagerly so `getToken()` is O(1) afterwards.
- Every request sends `Content-Type: application/json` (skipped for
  multipart uploads so the browser sets the boundary) and
  `Authorization: Bearer <token>` when a token exists.
- `api.get/post/put/patch/delete` cover JSON; `getForText`, `getBlob`,
  `postForBlob`, `postForText` cover report/document downloads and
  `upload(url, formData)` covers multipart POST.

### Optimistic-concurrency support

`post` and `put` accept `opts.expectedUpdatedAt`; when present the client
sends it as an `If-Unmodified-Since` header (transport-level plumbing for
conditional writes). The trip-figure saves that motivated it
(`tripClient.updateTripPreDeparture` / `updateTripActuals` →
`PUT /trips/:id/pre-departure` / `/actuals`) enforce the conflict check on
the server through the request body's `version` field instead:
`updateTripFigures` compares it to the trip's stored version and rejects a
stale write with `409 Dữ liệu đã bị thay đổi bởi người khác`, which trip
save flows retry deliberately.

### Session-expiry semantics

The client treats a rejected token as an application-state transition, not a
form error, and guards against cross-account cache pollution:

- A **401 on a request that carried a token** clears the token immediately and
  calls `notifySessionExpired()` (from `api/session.ts`, a framework-agnostic
  listener set). `AuthProvider` subscribes via `onSessionExpired`, sets its
  `sessionExpired` flag, and runs `logout()` — which cancels/removes all
  non-auth TanStack Query caches so nothing from the dead session is reused.
- A **401 without a token** (bad login credentials) stays an ordinary
  `ApiError`.
- Before every response is surfaced (success or error), `assertCurrentSession`
  compares the token the request used against the current token. If they
  differ — a late response from an old session after a new login — the client
  throws `Phiên đăng nhập đã thay đổi. Vui lòng tải lại dữ liệu.` instead of
  feeding another account's data into the current query cache. Writes are
  never retried automatically: the server may already have applied them.

```mermaid
sequenceDiagram
    participant Caller
    participant Client as api client
    participant Backend
    participant Auth as AuthProvider
    Caller->>Client: api.post(path, body)
    Client->>Backend: fetch with Bearer token
    Backend-->>Client: 401
    alt token still current
        Client->>Client: clearToken via useToken
        Client->>Auth: notifySessionExpired
        Auth->>Auth: logout and drop non-auth query caches
    else token already replaced by newer login
        Client-->>Caller: stale-session Error, token untouched
    end
```

Session-expiry behavior is covered end-to-end in `frontend/src/lib/api.test.ts`.

### Error mapping (`errors.ts`)

`ApiError` carries the HTTP status, the raw response body, and a
user-facing message already translated to Vietnamese. `formatErrorMessage`
understands the backend's error body shapes (Zod issue array under
`details`, plain string, or structured object) and joins translated issues
with `; `. Translation uses two maps: `FIELD_VI` (field path → Vietnamese
label, e.g. `legs.km` → `Số km`) and `MSG_VI` (Zod messages, e.g.
`Required` → `Trường bắt buộc`). Numeric indices in Zod paths are stripped
for the label lookup but surface as a `Chặng N — ` prefix so users see which
trip leg failed. Adding a field is one line in `FIELD_VI`.

### Photo URLs (`photo.ts`)

`<img>` tags cannot send `Authorization` headers, so
`getAuthenticatedPhotoUrl` appends `?token=…` to `/api/photos/…` URLs, and
`photoSrc` additionally accepts bare storage keys (encoding them into a
single path segment for the wildcard photo route). The JWT-in-URL tradeoff
(leaks into nginx logs, history, Referer) is documented in the file as a
known limitation with the fix deliberately localized to one file.

## `lib/http/` — pagination helpers

### `fetchAllPaginated` (`paginate.ts`)

The backend's shared `parsePagination` caps `limit` at 100, so any list can
exceed one page. `fetchAllPaginated<T>(endpoint, params?, concurrency = 5)`
walks a server-paginated endpoint:

1. Fetches page 1 with `limit: 100` and reads `total` to compute
   `totalPages`.
2. Fetches pages `2..N` in batches of `concurrency` (default 5) parallel
   requests via `Promise.all`.
3. Concatenates `items` in page order and returns a flat array. The `total`
   count is intentionally dropped — callers display the whole list anyway.

**Failure semantics: one failed page rejects the whole list**
(`Promise.all` semantics), so callers retry rather than render an incomplete
catalog with incorrect totals. `paginate.test.ts` pins both the
fail-the-whole-list behavior and order preservation under concurrent
fetching.

`configClient` uses it for nearly every catalog list (trucks, drivers,
routes, customers, suppliers, ports, tire positions, pricing tables, …).

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart TD
    A["fetchAllPaginated(endpoint, params)"] --> B["GET page 1 with limit=100"]
    B --> C{"totalPages <= 1?"}
    C -- "yes" --> D["return first page items"]
    C -- "no" --> E["pages 2..N fetched in batches of 5"]
    E --> F{"any page rejected?"}
    F -- "yes" --> G["reject the whole list"]
    F -- "no" --> H["concatenate items in page order"]
```

Auto-pagination of a server-capped list endpoint (page size 100, concurrency 5)

### `toQuery` (`query.ts`)

Builds a query string from a record, skipping `null`, `undefined`, and
empty-string values so callers can spread optional filters without guarding
each key. Numbers and booleans are stringified; the result carries a leading
`?` (or is empty). Every `api/*Client.ts` composes URLs with
`shared` path constants + `toQuery`.

## Formatters (`format.ts`)

Vietnamese-locale formatters used everywhere:

- `formatNumber(n)` — `vi-VN` locale, `.` thousands separator; `null`/NaN →
  `—`.
- `formatCompact(n)` — abbreviates ≥1B to `tỷ`, ≥1M to `tr`, ≥1K to `k`
  (one decimal, trailing `.0` stripped).
- `formatCurrency(n)` — `"12.500.000 ₫"` (integer, ₫ suffix, no decimals;
  `null` → `— ₫`).
- `moneyParts(amount, compact)` — splits a VND amount into
  `{ num, unit, format }` so the unit (`₫`, or `tr ₫` / `tỷ ₫` / `k ₫` when
  compact) renders at subtitle size next to the digits. `format` is a live
  formatter matching the chosen scale for counter animations that write only
  the numeric part. The shared `<Money>` component is built on it (as are the
  debt/payables hero counters, which keep the manual split because counters
  write `textContent` directly).
- `formatDate` / `formatDateTimeVN` — the latter forces
  `timeZone: 'Asia/Ho_Chi_Minh'` explicitly: a `vi-VN` locale argument alone
  only shapes numbers, not the zone, so GPS "last seen" and other device
  timestamps must go through it to read as Vietnam wall-clock on any host.
- `removeDiacritics(str)` — NFD strip + `đ/Đ` mapping for search matching.

Money input parsing lives in `frontend/src/lib/moneyInput.ts`
(`normalizeMoneyInput`, `formatMoneyInput`, `moneyInputToNumber`; tests in
`moneyInput.test.ts`): digits only, so Vietnamese `.` is always a thousands
separator, and blank input stays `undefined` for fallback semantics.

## Date (`date.ts`)

- `formatDayMonth(iso)` — `DD/MM`.
- `formatRelativeTime(iso)` — `Vừa xong`, `5 phút trước`, `2 giờ trước`,
  `Hôm qua`, `3 ngày trước`, then a `DD/MM` date after a week.

That is the whole file — the old month-name/week-start helpers are gone.

## Round (`round.ts`)

Re-export shim — `frontend/src/lib/round.ts` is literally:

```ts
export { round2dp } from "@tingting/shared";
```

This exists so pages can `import { round2dp } from '@/lib/round'` without
importing from the shared package directly. The math lives in
[`@tingting/shared/calculations/round`](../../../../shared/src/calculations/round.ts)
— the canonical example of the byte-identical rule above.

## Routing (`routes.ts`) and route-name parsing (`route.ts`)

`routes.ts` is the frontend projection of the shared page catalog
(`PAGE_CATALOG` in `@tingting/shared`), which is the single source of truth
for every path string and page title:

- `routes` exposes static paths as string constants and parametric paths as
  functions (`routes.tripDetail(id)`), so calling them without the param is
  a compile error.
- `titleForPath(pathname)` walks the hand-ordered `titleRules` array — the
  order *is* the precedence logic (e.g. `/trips/:id` vs `/trips/:id/edit`,
  specific config sub-paths before the `Cấu hình` catch-all) — and falls
  back to `BRAND.name`. Only the title *strings* come from the catalog,
  killing copy-paste drift.
- `homeForRole(role)` resolves the post-login/404 home (driver →
  `myTrips`, forwarder → `myForwarderTrips`, else `dashboard`).
- `absoluteUrl(path)` builds a shareable `https://host/path` from the
  browser origin; call from handlers, not module top level.
- `routes.legacy` keeps the accept-and-redirect shims (`/routes`,
  `/trucks`, …) outside the catalog, and RBAC deliberately stays out of this
  module — `App.tsx` guards + Casbin remain the authority.

`routes.test.ts` is the regression net: a golden table asserting every
representative pathname resolves to the same Vietnamese title as before the
catalog refactor, plus a runtime mirror of the compile-time
catalog ↔ `AGENT_ROUTE_KEYS` parity assertion (35 keys).

`route.ts` is separate and tiny: `splitRoute(name)` splits
`"Hà Nội → Hải Phòng"` into `{ from, to }`, trying the separators
`→`, `⇒`, `->`, `' - '`, `' – '`, `>` in order and returning `null` when no
separator yields two non-empty halves. The dispatch map card, trip mobile
cards, and trip columns use it to render origin/destination pairs.

## Maps (`maps.ts`)

Typed wrappers over the backend `/maps` endpoints:

- `fetchPlaceSuggestions(input, sessionToken?)` — hits
  `/maps/autocomplete` (minimum 2 characters, optional Places session token)
  behind an in-memory cache: 50 entries, 5-minute TTL, oldest-evicted.
  Network errors degrade to `[]` — never throw into the autocomplete UI.
- `calculateRoute(origin, destination)` — hits `/maps/distance`, normalizes
  the backend shape (`{ routes, selected }` with `km`/`polylinePath` mirrored
  on `selected`) and degrades to an all-null result on any failure.
- `decodePolyline(encoded)` — Google-encoded-polyline decoder used by the
  Leaflet route drawing and by `liveRoute.ts`.

On the backend, `backend/src/services/maps.service.ts` serves both routes:
distances now come from real GPS-captured route polylines (not Google
Directions, which was retired), and place autocomplete comes from the
place-search module in `backend/src/services/map4d.ts` (Google Places
Autocomplete (New) primary with a Geocoding fallback), fronted by Redis
caching.

## Live fleet (`liveFleet.ts`) and live route (`liveRoute.ts`)

Neither file is an API client — they hold the geometry and rendering logic
shared by the dispatch map and the trip-detail tracking card:

- `liveFleet.ts` exports `LIVE_STATUS_COLOR` / `LIVE_STATUS_LABEL`
  (moving / stopped / offline), `liveMarkerIcon(status, angle)` — a Leaflet
  `DivIcon` dot with a heading arrow when moving — and `escapeHtml`, used for
  every GPS-sourced string interpolated into popup/tooltip HTML (Leaflet
  renders `html` via `innerHTML`, and vendor address/driver fields arrive
  unescaped).
- `liveRoute.ts` computes what the truck still has to drive:
  `computeRemainingRoute(lat, lng, heading, legs)` projects the position onto
  each leg polyline, keeps candidates within ~2× the nearest leg's distance
  (GPS jitter, merging roads), and breaks the đi/về tie — a round trip
  retraces the same road — with the GPS heading vs. the closest segment's
  bearing. The chosen leg's `loadingType` labels đi (HANG) vs về (VO). It
  returns the destination point, the remaining path from the projection, and
  a true haversine `distanceKm`.
- The data itself is polled by the `useLiveFleet` hook (10-second
  `refetchInterval`) via `tripClient.getLiveFleet()` → `/trips/live-fleet`;
  `LiveFleetMap` redraws markers each refresh and refits bounds only when
  the truck set changes.

## Cap-table dedup (`cap-table.ts`)

`getActiveCapTable(entries)` resolves the ownership snapshot to display:
filter to the latest `effectiveDate` reached today (falling back to all rows
when none is reached yet), dedupe to the most-recent `createdAt` per partner
name, and compute percentages from `contributionAmount` (2-decimal rounding)
— percentages are derived, never stored. When contributions sum to zero it
falls back to the stored `percentage` field.

## CSV / XLSX export (`csv.ts`)

`downloadCSV(filename, headers, rows, options)` builds a brand-styled XLSX
via `exceljs`:

- `DownloadOptions`: `title`, `subtitle`, `columnTypes`
  (text / number / km / liters / currency / date / decimal),
  `totalsColumns`, `totalsLabel` (default `TỔNG CỘNG`), `hideTotals`.
- Layout: emerald title band (3 rows), frozen header row, zebra data rows,
  optional totals row; landscape print setup with fit-to-width.
- Column types are honored explicitly or inferred from headers + sample
  values; a `.csv` filename is silently renamed to `.xlsx`.

## UI-state helpers

### Overlay state (`overlayState.ts`)

A module-level registry answering "is any overlay open?" so the ESC
"go-back" shortcut (`useBackShortcut`) can yield and let the overlay consume
Escape instead of navigating. Two detection layers:

- A count incremented/decremented by overlay hooks — `useAnimatedOverlay`
  (Modal/Drawer/ConfirmDialog), `useClickOutside` with `escapeKey`, and
  `PhotoViewer` register while visible.
- A DOM fallback querying any portal'd `[role="dialog"]` /
  `[role="alertdialog"]`, catching overlays that don't use those hooks.

The count is clamped at 0 and decremented on effect cleanup (next tick), so
the ESC press that *closes* an overlay still sees it open — exactly the
desired peel-one-layer-per-ESC behavior. `overlayState.test.ts` covers the
toggle, the clamp, and the DOM fallback.

### Tour targets (`tourTarget.ts`) and agent highlight (`agentHighlight.ts`)

`resolveTourTarget(targetId)` finds a spotlight anchor by `data-tour-id`
first (with CSS-attribute escaping), falling back to `getElementById` — so
legacy stable ids and new tour attributes both resolve. `agentHighlight.ts`
uses it for the agent-directive bridge: `highlightElement` scrolls the
target into view and runs a Driver.js spotlight, returning `false` when no
element matched so the agent can acknowledge honestly. `tourTarget.test.ts`
pins the precedence, escaping, and null cases.

## Chunk-failure self-heal (`chunk-error.ts`)

After a deploy, an open tab can reference hashed JS chunks that no longer
exist. `installChunkErrorHandler()` (called in `main.tsx` before React
mounts) listens for `error` / `unhandledrejection` events whose messages
match chunk-load failure patterns, purges all service-worker caches, and
reloads once. The reload is capped at one per browser session
(`sessionStorage` counter); a second failure renders a Vietnamese
"Phiên bản mới đã sẵn sàng" fallback instead of looping. Route-level lazy
chunks are normally caught earlier by the `App.tsx` ErrorBoundary — this is
the safety net for eager imports and rejections outside React's tree.

## Other lib utilities

| File | Responsibility |
| --- | --- |
| `audit-helpers.ts` | `ACTION_LABELS`, `resolveCategory`, and `formatTimeShort` — shared rendering inputs for the audit log page/widget. |
| `calendar-month.ts` | `getCalendarMonthRange(year, month)` — inclusive Gregorian month bounds (`YYYY-MM-01` … last day), used by ops/expense views rather than the salary cycle; leap-year coverage in tests. |
| `profit-preview.ts` | `getProfitPreviewEmptyMessage` — picks the correct Vietnamese empty-state string for a profit-distribution preview (no locked trips vs. unconfigurable ownership vs. no data). |
| `expense-breakdown.ts` | `groupExpensesByType` / `groupExpensesByContainer` — per-category and per-container totals with Vietnamese fallback labels; containers sorted chronologically so screen and print agree. |
| `status-variants.ts` | Maps `AdvanceRequestStatus` / `AdvanceSettlementStatus` to the `neutral/info/warn/success/danger` variant tokens used by status chips. |
| `notificationClient.ts` | Typed client for the notifications API — list, unread count, mark-read — plus web-push subscription management (VAPID key, subscribe, unsubscribe). |
| `emptyIllustrations.ts` | Maps empty-state categories (`trips/fleet/ops/finance`) and legacy svg names to the four on-brand PNG illustrations. |
| `utils.ts` | Just `cn(...)` — class-name joining. The old `sleep`/`groupBy`/`uniqBy` helpers no longer live here. |

## Where to read more

- Shared math — [shared/calculations.md](../shared/calculations.md)
- Hooks (token, live-fleet polling, overlays) — [frontend/hooks.md](hooks.md)
- Domain API clients — [backend/api-routes.md](../backend/api-routes.md)
- Pages that use these helpers — [frontend/app.md](app.md)
