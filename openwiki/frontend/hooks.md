---
type: frontend-hooks
title: Custom Hooks
description: Reference for the frontend custom hooks — cataloged by responsibility (data fetch, form, UI helper).
tags: [hooks, react, data-fetch, form, ui-helper]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-a74e5e0242f6e27ed8fcbef9
    resource: repo://frontend/src/hooks/tripFormDispatchUtils.ts
  - id: openwiki-source-c9974da68b2cc68ad5422a8e
    resource: repo://frontend/src/hooks/use-trip-form-submit.ts
  - id: openwiki-source-2d83e9bfd45467b813d5c945
    resource: repo://frontend/src/hooks/useAgentChat.test.ts
  - id: openwiki-source-f467d629132a1ba1837daeb5
    resource: repo://frontend/src/hooks/useAuth.test.tsx
  - id: openwiki-source-6cccf1e498f6f40830189fd5
    resource: repo://frontend/src/hooks/useAuth.tsx
  - id: openwiki-source-e9557f93f4304771d1c48ad2
    resource: repo://frontend/src/hooks/useBackShortcut.ts
  - id: openwiki-source-8c9141522f274f8620a4d150
    resource: repo://frontend/src/hooks/useCatalogs.ts
  - id: openwiki-source-33ddcc2f569a281739dfb1c3
    resource: repo://frontend/src/hooks/useClickOutside.ts
  - id: openwiki-source-c6afdac0de505879dfbb51ca
    resource: repo://frontend/src/hooks/useCRUD.ts
  - id: openwiki-source-6d774b481c753c2765f1ec3e
    resource: repo://frontend/src/hooks/useDirtyGuard.ts
  - id: openwiki-source-c64d2bb6118a1fc66c8bb857
    resource: repo://frontend/src/hooks/useDriverQueries.ts
  - id: openwiki-source-a7b3224a820398bfd42e73c9
    resource: repo://frontend/src/hooks/useFinancialQueries.ts
  - id: openwiki-source-597f81def659b86acf51a908
    resource: repo://frontend/src/hooks/useForwarderQueries.ts
  - id: openwiki-source-aa4f8de70ca2cf4c32255c7a
    resource: repo://frontend/src/hooks/useMediaQuery.ts
  - id: openwiki-source-c7d5625231ea4fb4e3e29ef5
    resource: repo://frontend/src/hooks/useMonth.tsx
  - id: openwiki-source-766e8b04441fd888b5e05ec4
    resource: repo://frontend/src/hooks/usePrefersReducedMotion.ts
  - id: openwiki-source-4dbdab6721ac537abaae5631
    resource: repo://frontend/src/hooks/useTripForm.ts
  - id: openwiki-source-93e5d26f2bcc31b9f47da780
    resource: repo://frontend/src/hooks/useTripFormContext.tsx
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO's frontend has many custom hooks under `frontend/src/hooks/`. They are
cataloged here by responsibility. The actual list evolves; consult
`ls frontend/src/hooks/` for the current ground truth.

## Data-fetch hooks (TanStack Query wrappers)

| Hook | Responsibility | Typical callers |
|---|---|---|
| `useAuth.tsx` (actually `.tsx`) | Auth context — exposes `{ user, isAuthenticated, login, logout, loading }` | `App.tsx`, `Layout.tsx`, every page needing role/identity |
| `useAuditLogs.ts` | Paginated audit log fetch + filters | `AuditLogPage` |
| `useCatalogs.ts` | Reads the bootstrap catalogs (`customers`, `trucks`, `routes`, …) | Pages needing lookups |
| `useCatalogQueries.ts` | Catalog-specific query helpers (separate from `useCatalogs`) | Catalog pages |
| `useDriverQueries.ts` | Driver portal query helpers (own trips, earnings, penalties) | `DriverTripsPage`, `DriverEarningsPage`, `DriverPenaltyPage` |
| `useForwarderQueries.ts` | Forwarder portal query helpers | `ForwarderTripsPage`, `ForwarderAdvancesPage`, `ForwarderSettlementsPage` |
| `useFinancialQueries.ts` | Finance/receivables/expenses query helpers | `FinancePage`, `DebtListPage`, `ExpenseListPage` |
| `useSalaryQueries.ts` | Salary period + work-day queries | `SalaryAttendancePage`, `SalaryPeriodConfigPage` |
| `useTireQueries.ts` | Tire inventory + lifecycle queries | `TruckTiresPage`, `TirePositionsConfigPage` |
| `useNotificationQueries.ts` | Notifications inbox + unread count | Notification badge, `Toast` |
| `useDashboardQueries.ts` | Dashboard stats + decision items | `DashboardPage` |
| `useChatbotMetrics.ts` | Admin chatbot metrics | `ChatbotMonitoringPage` |
| `useAppSettings.ts` | Single-row app settings | `AppSettingsConfigPage` |
| `useGpsSettings.ts` | Bách Khoa GPS credentials | `gps-settings` admin |
| `useLlmSettings.ts` | LLM provider/model selection | `llm-settings` admin |
| `useQueries.ts` | Generic data-fetch helper (TanStack Query aggregations) | Used as a building block |
| `useCRUD.ts` | Generic CRUD factory — wraps list/get/create/update/delete against the API client | Any catalog-style page that just needs standard CRUD |

## Form hooks

| Hook | Responsibility | Typical callers |
|---|---|---|
| `useTripForm.ts` | Owns the trip-form state machine (legs, fuel mode, allocations, allowance, revenue, expenses, instructions). Validates against the backend Zod schemas. | `TripCreatePage`, `TripEditPage` |
| `useTripFormContext.tsx` (actually `.tsx`) | Context provider/consumer pair so deeply-nested trip cards (under `components/trip/`) can read+dispatch | All `components/trip/*.tsx` cards |
| `use-trip-form-submit.ts` | Submit pipeline that turns form state into the API request, runs the lifecycle hook, and invalidates caches | `TripCreatePage` |
| `tripFormDispatchUtils.ts` | Reducer-style dispatch helpers used by the form | `useTripForm` |
| `useDirtyGuard.ts` | Warns on back-navigation / route change when form is dirty | `TripCreatePage`, `TripEditPage` |

## UI helper hooks

| Hook | Responsibility |
|---|---|
| `useClickOutside.ts` | Detects clicks outside a referenced element (dropdowns, modals) |
| `useBackShortcut.ts` | Listens for Escape / hardware back to trigger navigation with the dirty guard |
| `useMonth.tsx` (actually `.tsx`) | Selected-month context (dashboard / P&L period filters) |
| `usePrefersReducedMotion.ts` | Wraps app in `ReducedMotionProvider` and exposes the boolean to animations |
| `useMediaQuery.ts` | SSR-safe media query helper (replaces any useObservedWidth uses) |
| `useFocusDeepLink.ts` | Focuses an element deep-linked from URL hash |
| `useFocusTrap.ts` | Focus trap for modals/dialogs |
| `usePersistedContainerType.ts` | Persists the user's last-used container type in localStorage |
| `useSyncedState.ts` | State that stays in sync with an external store |
| `usePushNotifications.ts` | Service-worker push subscription helpers |
| `useAgentOpenable.ts` | Tracks whether the agent drawer should be open |
| `useAgentChat.ts` | Streaming agent chat (calls `/api/agent` socket) |
| `useBottomNavAnimations.ts` | Per-route bottom-nav transition animations |
| `useSidebarAnimations.ts` | Sidebar open/close animations |
| `useTopbarEntrance.ts` | Topbar entrance animation |
| `useAnimatedOverlay.ts` | Generic overlay mount/unmount animations |
| `animations/` | Animation primitives (used by the above) |

## Animation subdirectory

`frontend/src/hooks/animations/` houses per-page animation hooks (e.g.
`usePageAnimations`). The hero/bento pattern uses `.tc-create-hero` /
`.tc-create-bento` selectors, triggered after the form options finish loading.

## Convention: tests colocate with hooks

`useAuth.test.tsx`, `useAgentChat.test.ts`, `useBottomNavAnimations.test.tsx`,
`use-trip-form-submit.test.ts` live next to their hooks. New hooks should add
tests in the same folder.

## Where to read more

- API client + formatters — [lib.md](lib.md)
- Pages that consume these hooks — [app.md](app.md)
- Backend API contracts — [backend/api-routes.md](../backend/api-routes.md)
