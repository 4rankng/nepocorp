---
phase: 2
title: Instrument Guided Workflows
status: completed
priority: P1
effort: L
dependencies:
  - 1
---

# Phase 2: Instrument Guided Workflows

## Overview

Make every curated step land on a stable, meaningful control and make every
mutation tour wait for the corresponding successful API result. Reuse the
existing `data-tour-id` → `id` resolver, target-missing recovery, and route-
persistent controller. Do not introduce DOM polling for business completion or
a generic prerequisite service.

## Context Links

- [Overview plan](./plan.md)
- [Phase 1 catalog](./phase-01-curate-role-based-tutorial-catalog.md)
- [Technical target/event inventory](./research/technical-scout-report.md)

## Requirements

- Functional:
  - Add semantic `data-tour-id` only to controls/zones referenced by a tour.
    Keep all existing DOM IDs and form behavior intact.
  - Add `trip.dispatched` and `trip.figures_saved` to the closed product-event
    catalog; emit only after the existing successful API mutation resolves.
  - Wire the already-declared `trip.completed` event at its actual successful
    transition, even though it is not a checklist completion in this scope.
  - Keep existing `trip.created`, `trip.locked`,
    `receivable.payment_recorded`, and `config.fuel_saved` emitters; attach the
    relevant event to each tour's final actionable step.
  - For list-to-detail tours, guide the user to choose a real entity. The tour
    survives navigation; advancing too soon uses existing target-missing retry/
    skip recovery. Never auto-select the first trip/customer/user.
  - Orientation tours explain valid empty states and prerequisites, then link
    to the real page/responsible role. They do not create data.
- Non-functional:
  - Targets name business meaning (`trip-detail-lock`, `debt-record-payment`),
    not CSS layout or generated row IDs.
  - No controller, Driver.js, database, or onboarding endpoint redesign.
  - Register an interaction step's one-shot listener before awaiting navigation/
    highlight resolution; cancel it on target failure, step change, retry, skip,
    or unmount.

## Target Map

| Tour area | Minimum semantic targets |
|---|---|
| Dashboard/accounting | `dashboard-kpis`, `dashboard-attention`, `dashboard-finance` |
| Trip list/create | `trip-list-filters`, `trip-list-add`; retain `customerId`, `routeId`, `trip-new-submit` |
| Dispatch | `dispatch-ready-list`, `dispatch-primary-action` |
| Trip detail | `trip-detail-financials`, `trip-detail-complete`, `trip-detail-lock` |
| Receivables | `debt-aging`, `debt-customer-list`, `debt-record-payment`, `debt-payment-submit`; retain `pay-amount`, `pay-receipt` |
| P&L | `finance-period`, `finance-kpis`, `finance-truck-breakdown` |
| Fuel | retain the five existing `fuel-*-field`/save IDs |
| System readiness | `config-grid` plus semantic cards for required master data |
| Users | `users-role-filters`, `users-table`, `users-add`, `users-save` |
| Audit | `audit-filters`, `audit-search`, `audit-table` |

Use fewer targets when one semantic zone explains a page; do not stamp every
input merely because it exists.

## Event Flow

```text
User action → existing API mutation resolves successfully
            → onboardingEvents.emit(product event)
            → TourController advances matching interaction step
            → useOnboardingChecklist completes matching event task
            → existing onboarding progress/task API persists state
```

Errors, validation failures, canceled dialogs, and click intents do not emit
success events. Existing manual “Tôi đã làm xong” remains a tour escape hatch,
but Phase 1 prevents it from completing event-gated checklist tasks.

## Related Code Files

- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/onboarding/events.ts`.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/onboarding/events.test.ts`.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/tours/catalog.ts` —
  final directives/targets and completion events after DOM verification.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/context/TourControllerContext.tsx`
  and its test — pre-register/cancel interaction listeners while retaining the
  existing generation guard against stale advances.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/lib/onboardingEvents.ts`
  and `/Users/dev/Documents/projects/nepocorp/frontend/src/lib/onboardingEvents.test.ts`
  only as needed to expose a cancellable one-shot subscription; preserve the
  existing `emit/on/off/waitFor` behavior for all other consumers.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/DashboardPage.tsx` and
  the smallest relevant files under `/Users/dev/Documents/projects/nepocorp/frontend/src/features/dashboard/`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/TripListPage.tsx` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/trip-list-hero.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/DispatchPage.tsx` for targets and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/features/dispatch/hooks/useDispatchMutations.ts`
  for the success-only `trip.dispatched` emitter and cancel/error tests.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/features/trip-detail/useTripDetailPage.ts` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/features/trip-detail/components/TripHeader.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/TripEditPage.tsx` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/hooks/use-trip-form-submit.ts` — emit
  `trip.figures_saved` only after the edit-mode financial figures PUT succeeds;
  later container/instruction failure does not undo that narrower outcome.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/DebtListPage.tsx` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/DebtDetailPage.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/FinancePage.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/config/FuelConfigPage.tsx` only if the
  final step lacks the existing save target/event association; keep its IDs.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/ConfigPage.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/UsersPage.tsx` and the
  specific controls under `/Users/dev/Documents/projects/nepocorp/frontend/src/features/users/components/`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/pages/AuditLogPage.tsx`.
- Modify/add focused tests beside affected hooks/pages/components. Do not add a
  brittle test that greps source text for attributes.

## Implementation Steps

1. Trace each planned directive to the mounted element and successful mutation
   callback. Remove any speculative target from the catalog if it cannot be
   attached to a stable semantic control.
2. Add two event definitions/payloads (`trip.dispatched`,
   `trip.figures_saved`) and wire three emitters, including the already-declared
   `trip.completed`; update event-bus/catalog tests.
3. Stamp page-level targets in small batches by workflow. Prefer `data-tour-id`;
   preserve legacy IDs consumed by forms, labels, tests, or agent directives.
4. Emit dispatch after `dispatchTrip` resolves; emit figures only from the
   edit-mode financial PUT boundary (never the shared create path); emit
   completed only for the complete action in the generic lifecycle handler.
   Test cancel, rejection, create-mode, and partial multi-call branches.
5. Refactor the controller drive effect to subscribe before `sendAndWait`, then
   cancel safely on missing target/step teardown. Test an event fired during
   target resolution and prove no stale listener advances a later step.
6. Complete catalog directives and attach final mutation `completionEvent`s.
   Keep explanatory steps manually advanceable.
7. Test dynamic navigation, hidden role controls, empty lists, modal open/close,
   target retry, and double-submit/zero-revenue retry paths.

## Success Criteria

- [ ] Every catalog target resolves on the intended desktop and narrow layout.
- [ ] No tour targets a generated entity ID, CSS class, or hidden unauthorized action.
- [ ] Dispatch, figures-save, and complete events emit exactly once on success and never on failure.
- [ ] An action completed while its highlight is resolving advances the correct
      step; target failure or teardown leaves no stale listener.
- [ ] Create, dispatch, figures, lock, receivable, and fuel tours auto-advance only from their own events.
- [ ] Empty trip/debt/config/user/audit states provide truthful recovery copy.
- [ ] ACCOUNTANT never receives a lock spotlight; DRIVER/FORWARDER see none of the office tutorial UI.
- [ ] Existing create-trip fixed-action-bar and single-popover repairs remain green.

## Risk Assessment

- Responsive/conditional controls may not mount. Target the shared semantic
  control when possible and retain target-missing retry/skip for legitimate
  absence.
- Duplicate emitters can complete twice. Place one emitter at the terminal
  success callback and test alternate/retry branches explicitly.
- Dynamic records can disappear during a tour. Never cache a row ID in catalog
  data; return to the list and let the user choose another real entity.

## Security Considerations

Spotlights and guide text do not grant access. Every action remains protected by
the existing React capability check, auth middleware, Casbin policy, and API
validation. A missing/unauthorized target degrades to recovery UI, not a bypass.

## Next Steps

Phase 3 consumes the now-stable catalog and targets to expose the library and
run the complete role/accessibility QA matrix.
