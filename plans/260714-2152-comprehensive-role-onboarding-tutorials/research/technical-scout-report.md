# Technical scout: comprehensive role-based onboarding tutorials

## Bottom line

The existing onboarding stack already supports the requested expansion. Keep the shared, typed catalogs; the root-level `TourControllerProvider`; Driver.js spotlight renderer; frontend product-event bus; and current server progress/task tables. Comprehensive role-based tutorials need catalog content, stable `data-tour-id` stamps, and a small number of success-event emitters. No database migration or new backend progress API is required.

One existing authorization mismatch must be resolved before extending the accountant tutorial: `shared/src/tours/catalog.ts` and `shared/src/onboarding/tasks.ts` offer ACCOUNTANT the lock-trip flow, `CONTEXT.md` says ACCOUNTANT may lock, and `POST /api/trips/:id/lock` has no narrower endpoint role gate; however `frontend/src/features/trip-detail/useTripDetailPage.ts` sets `canLock` only for MANAGER/ADMIN. An accountant cannot complete the advertised action in the UI.

## Existing architecture and reusable seams

- `shared/src/tours/schema.ts`: `Tour` is a stable id/version, Vietnamese metadata, role list, aliases, and 2–10 `AgentTutorialStep`s. Steps already support `navigate`, `scrollTo`, `focus`, optional spotlight, and optional typed `completionEvent`.
- `shared/src/tours/catalog.ts`: single curated-tour registry, typed with `satisfies Record<string, Tour>`; `TourId`, `TOUR_IDS`, `toursForRole`, and `getTour` are derived from it. Current tours: `create-trip`, `lock-trip-and-payment`, `fuel-config`.
- `shared/src/onboarding/events.ts`: closed `PRODUCT_EVENTS` catalog and typed payload map. This is the correct extension point for real UI/business completion events.
- `shared/src/onboarding/tasks.ts`: role-scoped activation checklist. Current tasks exist only for MANAGER and ACCOUNTANT; ADMIN gets none even though the UI treats ADMIN as an office role.
- `frontend/src/context/TourControllerContext.tsx`: complete state machine (`showing`, `waiting_for_action`, `target_missing`, terminal states), role/master-switch gate, resume, local cache, server write-through, interaction-event waiting, and analytics. It is generic; adding tours does not require controller changes.
- `frontend/src/components/agent/TourController.tsx`: persistent route-independent tour chrome with previous/next, manual completion fallback, retry, skip, and resume. Preserve unchanged.
- `frontend/src/lib/agentHighlight.ts` + `frontend/src/lib/tourTarget.ts`: Driver.js remains the renderer. New targets should use `data-tour-id`; legacy stable DOM `id`s remain supported. Missing targets fail gracefully.
- `frontend/src/hooks/useOnboardingChecklist.ts` and `frontend/src/components/onboarding/OnboardingChecklist.tsx`: generic role-task merge, event subscriptions, tour launch, persistence, dismissal, and completion UI. Catalog changes flow through without new rendering logic.
- `frontend/src/App.tsx`: providers/controllers are mounted correctly outside route content, so tours survive navigation.
- `shared/src/navigation/pageCatalog.ts` + `shared/src/schemas/agent.ts`: requested top-level destinations already have agent route keys: `dashboard`, `trips`, `tripNew`, `tripDetail`, `debt`, `debtDetail`, `expenses`, `expenseNew`, `expenseEdit`, `payables`, `payableDetail`, `fleet`, `users`, `auditLogs`, `config`, plus selected config pages. Do not add route keys unless a tour truly needs a currently non-agent config subpage.

## Current stable target inventory

Targets already used by curated tours:

| Area | Stable target | Source |
|---|---|---|
| Create trip | `customerId`, `routeId` | `frontend/src/components/trip/TripInfoCard.tsx` |
| Create trip | `trip-new-submit` | `frontend/src/components/trip/ActionBar.tsx` |
| Fuel config | `fuel-loaded-norm-field`, `fuel-empty-norm-field`, `fuel-supplement-field`, `fuel-unit-price-field`, `fuel-save-config-button` | `frontend/src/pages/config/FuelConfigPage.tsx` |

Additional existing ids that can be reused where they match a semantic tutorial target:

- Fuel config also has `fuel-warning-threshold-field` and `fuel-critical-threshold-field`.
- Receivable payment modal has `pay-amount` and `pay-receipt` in `DebtDetailPage.tsx`; it also registers `debt.record-payment` with `useAgentOpenable`.
- Expense entry has `expenseDate`, `paymentStatus`, `supplierId`, `categoryId`, `truckId`, `amount`, `validFrom`, `validTo`, `receiptId`, and `note` across `ExpenseEntryPage.tsx` and `expense-entry-sections.tsx`.
- Vendor payment modal has `payment-amount`, `payment-date`, and `payment-receipt-id` in `PayableDetailPage.tsx`.
- Fleet forms have stable field ids in `TruckFormModal.tsx`, `TrailerFormModal.tsx`, and `DriverFormModal.tsx`; these are modal-only and are not substitutes for stable page-level open/add targets.

Missing page/action targets needed for reliable tours:

| Area | Minimum targets to stamp with `data-tour-id` | Primary source files |
|---|---|---|
| Dashboard | page overview/KPI zone and role-relevant action/attention zone | `DashboardPage.tsx`, dashboard feature cards |
| Trip list/detail | add-trip button; status/filter area; trip-row/detail entry; edit/complete/lock buttons | `trip-list-hero.tsx`, `TripListPage.tsx`, `features/trip-detail/components/TripHeader.tsx` |
| Receivables | debt list/aging area; customer-row/detail entry; payment trigger and submit button | `DebtListPage.tsx`, `DebtDetailPage.tsx` |
| Expenses | add-expense trigger; form sections; final save button | `ExpenseListPage.tsx`, `ExpenseEntryPage.tsx`, `expense-entry-sections.tsx` |
| Payables | payable list/aging area; supplier-row/detail entry; vendor-payment trigger and submit button | `PayableListPage.tsx`, `PayableDetailPage.tsx` |
| Fleet | truck/trailer/driver sections and their add buttons | `FleetPage.tsx`, `features/fleet/{truck-card,trailer-card,driver-card}.tsx` |
| Users | add-user button, role filters, user table, form save control | `UsersPage.tsx`, `features/users/components/{UserTable,UserForm}.tsx` |
| Audit | filters/search, log table, detail drawer trigger/content | `AuditLogPage.tsx` |
| Configuration | config grid and individual semantic cards; keep existing fuel targets | `ConfigPage.tsx`, `data/searchRegistry.ts`, requested config pages |

Use semantic names (for example `trip-list-add`, `trip-detail-lock`, `debt-record-payment`, `expense-save`, `users-add`) and stamp the actual interactive element. Do not target CSS classes, generated row ids, or whole forms. For list-to-detail flows, spotlight the list/row affordance, let the user choose a real entity, then continue on the mounted detail page; tours persist across that route change.

## Product-event inventory

Declared and currently emitted:

| Event | Emitter |
|---|---|
| `fleet.dashboard_viewed` | `DashboardPage.tsx` first mount (name is legacy/misleading; used as manager dashboard completion) |
| `trips.list_viewed` | `TripListPage.tsx` first mount |
| `ui.trip_create_clicked` | add action in `TripListPage.tsx` |
| `trip.created` | successful submit in `TripCreatePage.tsx` |
| `trip.locked` | successful lock, including zero-revenue retry, in `features/trip-detail/useTripDetailPage.ts` |
| `receivable.payment_recorded` | successful receipt in `DebtDetailPage.tsx` |
| `config.fuel_saved` | successful save in `FuelConfigPage.tsx` |
| `tour.completed` | `TourControllerContext.tsx` terminal completion |

Declared but with no production emitter found: `trip.completed`. Do not use it in a new interaction step until the success path emits it after `POST /trips/:id/complete` succeeds (the generic `handleAction` currently only refetches).

Missing events should be added only for steps/checklist tasks that require proof of completed work. Likely minimum closed-set additions are `expense.created`, `payable.payment_recorded`, and—only if activation tasks require them—`fleet.truck_created` / `user.created` or page-view events. Emit at existing API success call sites, never from clicks or DOM polling. Pure orientation tours can remain explanatory and complete through normal tour completion without adding events.

Risk: `useOnboardingChecklist` also completes any task whose `tourId` matches `tour.completed`, even when its stated `completionEvent` did not fire. That is suitable for “finish this guide” tasks but weakens “perform real work” semantics. For real-action activation tasks, either remove that tour-completion shortcut for those tasks or model task completion mode explicitly; do not silently claim a mutation happened merely because the user clicked through a guide.

## Role and route constraints

- `App.tsx`'s `adminOnly` actually means all office roles (ADMIN/MANAGER/ACCOUNTANT); it excludes only DRIVER/FORWARDER. Dashboard, trips, debt, expenses, payables, fleet, and most config routes are reachable by all three office roles.
- `/users` is office-wide, but `UsersPage.tsx` is capability-aware: ADMIN/MANAGER can manage broadly; ACCOUNTANT is read-only except DRIVER rows.
- `/audit-logs` is MANAGER/ADMIN only. ACCOUNTANT tours must not reference `auditLogs`.
- Strict ADMIN-only pages include app/onboarding settings, LLM settings, FAQ settings, and chatbot monitoring.
- Current tour engine, chatbot tour search/net, onboarding REST routes, and checklist UI exclude DRIVER/FORWARDER. Supporting portal-role tutorials would be a deliberate scope expansion: shared task role types, backend onboarding route gate/Casbin policy, route-key catalog, and UI role gates would all change. It is not part of the minimum office-role implementation.
- `pageCatalog.ts` deliberately does not own RBAC. Every new tour's roles must be checked against `App.tsx` and page-level capability gates.
- Resolve the accountant lock mismatch described above. The smallest domain-consistent fix is to include ACCOUNTANT in `canLock` (and validate the backend/Casbin trip-write policy); otherwise remove ACCOUNTANT from the lock tour/task. Do not leave the current impossible checklist item.

## Recommended minimal architecture and file-level changes

1. Expand `shared/src/tours/catalog.ts` with modular tours, each no more than 10 steps and scoped to the roles that can perform/see the flow. Prefer reusable workflow tours (orientation/dashboard, trip lifecycle, receivables, expenses/payables, fleet, users, audit, configuration) over a single long per-role script. Compose each role's coverage by the tour `roles` arrays.
2. Stamp only the required semantic `data-tour-id`s in the page/component files listed above. Keep existing legacy ids unchanged and keep Driver.js/`agentHighlight.ts` unchanged.
3. Extend `shared/src/onboarding/events.ts` and emit new events only at real success handlers. Fix or avoid the unused `trip.completed` event.
4. Expand `shared/src/onboarding/tasks.ts` only if the floating activation checklist is part of the requested experience. Add ADMIN tasks intentionally; do not assume ADMIN inherits MANAGER tasks because task filtering is exact equality.
5. Update `shared/src/tours/catalog.test.ts`, `shared/src/onboarding/events.test.ts`, and `shared/src/onboarding/tasks.test.ts` with role matrices, target expectations, event membership, unique ids/sort orders, and critical final interaction steps.
6. Update `backend/src/services/agent/orchestrator.ts`: its prompt currently hardcodes the three tour ids/workflows in two places. Replace that enumeration with a generic instruction to use the role-filtered `tours.search` result (or derive the role-visible list from `toursForRole(ctx.role)`) so catalog growth cannot drift. `backend/src/services/agent/tools/tours.ts` itself is already catalog-driven.
7. Update `backend/src/tests/agent-tour-net.test.ts` for representative allowed/denied roles on new tours. No changes are required in the tour net logic.
8. Add focused frontend tests for any new emitters and the accountant lock permission decision. Existing controller/checklist/target-resolver tests should remain unchanged unless checklist completion semantics are tightened.

`shared/src/navigation/pageCatalog.ts` and `shared/src/schemas/agent.ts` need changes only if a tour navigates directly to a config subpage that currently lacks an `agent` entry/route key. All requested top-level modules are already covered. If a new key is necessary, update both together; their compile-time sync guard is intentional.

## Backend/database necessity

No migration is needed. `user_onboarding_progress` already stores free-string `tour_id`, positive `tour_version`, free-string `current_step_id`, and status under unique `(user_id, tour_id, tour_version)`. `user_onboarding_tasks` already stores free-string `task_id` under unique `(user_id, task_id)`. New catalog ids therefore fit the existing schema and endpoints. Analytics also stores tour/step ids as bounded strings, so no enum migration is required.

Backend code changes are limited to the chatbot prompt/tests (to remove the hardcoded three-tour list) and only to RBAC if product scope explicitly expands beyond office roles. Real-API-only behavior is preserved; no demo data, backend mutation proxy, or DOM-based completion verification is needed.

## Verification commands

Run the narrow catalog and UI tests first:

```bash
cd /Users/dev/Documents/projects/nepocorp
npx tsx --test shared/src/tours/catalog.test.ts shared/src/onboarding/events.test.ts shared/src/onboarding/tasks.test.ts
cd frontend && pnpm test -- src/context/TourControllerContext.test.tsx src/context/AgentDirectiveProvider.test.ts src/lib/tourTarget.test.ts src/lib/onboardingEvents.test.ts src/hooks/useOnboardingChecklist.test.tsx src/components/onboarding/OnboardingChecklist.test.tsx
cd ../backend && npx tsx --test --test-concurrency=1 src/tests/agent-tour-net.test.ts src/tests/onboarding-progress-task.test.ts
```

Then run contract/build gates because the shared catalogs and frontend imports are cross-package contracts:

```bash
cd /Users/dev/Documents/projects/nepocorp/shared && pnpm typecheck
cd ../frontend && pnpm build
cd ../backend && pnpm build
```

If trip permission or API success emitters change, add/run the closest page/feature tests and then the backend suite with required local services. There is no need to run a migration for this work.
