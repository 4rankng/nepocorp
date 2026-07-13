---
phase: 6
title: Role-Based Onboarding Checklists
status: completed
priority: P2
effort: M
dependencies:
  - 4
---

# Phase 6: Role-Based Onboarding Checklists

## Overview

Add a small floating **activation checklist** panel (brief §8) that turns
onboarding into visible, actionable goals — one per role (Manager,
Accountant). Each checklist item completes when its **business event** fires
(Phase 1's bus), not when a tooltip is viewed. Completion persists to the
`user_onboarding_tasks` table from Phase 4. A checklist item can launch a
curated tour (Phase 3's engine) on click.

This is the user-facing onboarding surface that ties Phases 1–4 together —
previously onboarding was chat-only; now it is a persistent, goal-driven panel.

## Requirements

- **Functional**
  - A floating, collapsible "Bắt đầu sử dụng NEPO Logistics" panel (bottom-right,
    distinct from the tour chrome; hidden when 100% complete or dismissed).
  - Two role checklists authored in `shared/src/onboarding/tasks.ts`:
    - **MANAGER**: visit dashboard, open trip list, create first trip, complete a
      trip, lock a trip.
    - **ACCOUNTANT**: visit accounting dashboard, complete trip financials, lock
      a trip, record first receipt.
  - Each item: `id`, `title` (Vietnamese), `completionEvent` (a
    `ProductEventName`), optional `tourId` (launch on click), `role`.
  - Completion is **event-driven**: subscribing to the item's `completionEvent`
    via Phase 1's bus flips it to done and persists via Phase 4's task API.
  - First-login eligibility: show the panel automatically on a user's first
    session (detected via absence of any `user_onboarding_tasks` rows), then only
    on demand via a "Hướng dẫn" entry point.
- **Non-functional**
  - Panel is dismissible; "snooze" writes `dismissed` to the task table.
  - No new dependencies; reuses the existing UI primitives (`components/UI.tsx`).
  - Hidden for DRIVER/FORWARDER (consistent with the chatbot gate).

## Architecture

```
shared/src/onboarding/tasks.ts          # ONBOARDING_TASKS catalog (closed, role-scoped)
shared/src/onboarding/tasks.test.ts

frontend/src/components/onboarding/
  OnboardingChecklist.tsx               # the floating panel
  OnboardingChecklistItem.tsx
frontend/src/hooks/useOnboardingChecklist.ts  # subscribe to events + persist
frontend/src/components/Layout.tsx      # mount the panel (role-gated)
```

### Catalog (closed set)

```ts
// shared/src/onboarding/tasks.ts
export interface OnboardingTask {
  id: string;                       // 'manager-create-first-trip'
  title: string;                    // Vietnamese
  role: Role;
  completionEvent: ProductEventName; // 'trip.created'
  tourId?: TourId;                  // optional curated tour to launch on click
  sortOrder: number;
}
export const ONBOARDING_TASKS: readonly OnboardingTask[] = [ /* … */ ];
export function tasksForRole(role: Role): readonly OnboardingTask[];
```

The Manager "create first trip" item maps to `completionEvent: 'trip.created'`
and `tourId: 'create-trip'` — clicking it launches the Phase 3 tour; completing
the real action (or the tour's final step) flips the item done.

### Completion flow

```
checklist mounts (office role)
  → load task statuses from Phase 4 GET /api/onboarding/tasks
  → for each incomplete task, subscribe onboardingEvents.on(completionEvent, ...)
  → event fires → mark completed locally + PUT /api/onboarding/tasks/:id
  → on click of an item with tourId → TourControllerContext.start(tourId, …,
       triggerSource: 'checklist')
```

## Related Code Files

- **Modify** `shared/src/onboarding/tasks.ts` (created as a stub in Phase 4) —
  fill in the Manager + Accountant task lists.
- **Create** `shared/src/onboarding/tasks.test.ts` — every `completionEvent` is
  in `PRODUCT_EVENTS`; every `tourId` is in `TOUR_IDS`; no duplicate ids per
  role; roles are office roles only.
- **Create** `frontend/src/components/onboarding/OnboardingChecklist.tsx` +
  `OnboardingChecklistItem.tsx` — floating panel, progress %, per-item click.
- **Create** `frontend/src/hooks/useOnboardingChecklist.ts` — loads statuses,
  subscribes to events, persists completions, exposes `launchTour(taskId)`.
- **Modify** `frontend/src/components/Layout.tsx` — render the panel for office
  roles (the Layout already does role-based nav, so the gate is consistent).
- **Modify** `frontend/src/context/TourControllerContext.tsx` — `start()` already
  takes `(tourId, resumeStep?)`; extend to accept an optional
  `triggerSource: 'chatbot' | 'checklist' | 'manual'` (default `manual`) so
  Phase 5 analytics tag the origin.

## Implementation Steps

1. Author `ONBOARDING_TASKS` for MANAGER and ACCOUNTANT. Keep titles short and
   Vietnamese. Map each to a real `completionEvent` already wired in Phase 1.
2. Write `tasks.test.ts` (closed-set membership + uniqueness + role validity).
3. Build `useOnboardingChecklist`: load via Phase 4's `useOnboardingTasks`,
   subscribe per incomplete task to Phase 1's bus, persist on completion.
4. Build the panel components using existing `components/UI.tsx` primitives
   (Button, Card, etc.); bottom-right fixed; collapsible; progress bar.
5. Wire `launchTour` → `TourControllerContext.start(tourId, undefined,
   'checklist')`. Verify the tour launches and analytics tag the source.
6. Implement first-login detection: if `useOnboardingTasks` returns an empty
   array on first load (server has no rows for this user), auto-open the panel;
   otherwise keep it collapsed with a badge.
7. Gate in `Layout.tsx` for ADMIN/MANAGER/ACCOUNTANT only.
8. Manual QA: fresh user → panel auto-opens; perform a real action → item flips
   done; click an item with a tour → tour runs; refresh → state persists.

## Success Criteria

- [ ] A fresh MANAGER sees the 5-item checklist auto-open on first login; a
      DRIVER sees nothing.
- [ ] Creating a real trip flips "Tạo chuyến xe đầu tiên" to done within ~1 s
      (event-driven, no manual check).
- [ ] Clicking an item with a `tourId` launches the curated tour, tagged
      `trigger_source: 'checklist'` in Phase 5 analytics.
- [ ] Completion survives refresh (server-persisted via Phase 4).
- [ ] At 100% the panel hides (or shows a completion state then hides).
- [ ] Catalog test enforces closed-set membership + uniqueness + role validity.
- [ ] All tests green; no new dependencies.

## Risk Assessment

- **Risk:** Checklist feels naggy → users dismiss and never return.
  **Mitigation:** auto-open only on the *first* session (no prior task rows);
  thereafter it's a badge the user opens on demand. Dismiss writes `dismissed`,
  not deleted — re-openable from a "Hướng dẫn" menu entry.
- **Risk:** An item's `completionEvent` never fires because the user does the
  action outside the instrumented path (e.g. seeds, admin tooling).
  **Mitigation:** acceptable for onboarding (the goal is to guide real UI use);
  an admin "reset onboarding" can clear task rows if needed (trivial follow-up).
- **Risk:** Two roles share an event (e.g. both have "lock a trip" →
  `trip.locked`) and completion cross-fires.
  **Mitigation:** subscriptions are per-user + per-role (the hook only
  subscribes to `tasksForRole(user.role)`), so an ACCOUNTANT never subscribes to
  a MANAGER-only event and vice-versa.
