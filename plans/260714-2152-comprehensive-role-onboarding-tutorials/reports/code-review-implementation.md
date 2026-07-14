# Implementation Code Review — Comprehensive Role-Based Onboarding Tutorials

Reviewed against `plan.md` and phase files on 2026-07-14. Scope was the
onboarding catalog, event lifecycle, role gates, tour progress, and tutorial
library. This review intentionally ignores unrelated document deletions in the
worktree.

## Verdict

**4/10 — do not treat the implementation as complete.** The project compiles
and the targeted pre-existing frontend test suite passes, and the core
event-gated checklist contract is materially improved. However, several of the
new “comprehensive” tours point at targets that do not exist, while important
library requirements (server-backed guide state, auth revalidation, focus trap,
and coverage) are absent.

## Findings

### P0 — Most newly advertised tours immediately enter target-missing recovery

`shared/src/tours/catalog.ts:5-16` references stable targets for dashboard,
trip detail, P&L, configuration, users, and audit pages. The implementation
only added targets on dispatch, debt, and trip-edit screens. A repository-wide
search finds no matching `data-tour-id` or legacy `id` for at least:

- `dashboard-kpis`, `dashboard-attention`
- `trip-detail-financials`, `trip-detail-lock`
- `finance-period`, `finance-kpis`
- `debt-customer-list`
- `config-grid`, `config-master-data`
- `users-role-filters`, `users-table`
- `audit-filters`, `audit-table`

The controller deliberately converts a missing target to recovery state
(`frontend/src/context/TourControllerContext.tsx:202-217`), so the guides do
not crash, but this makes the majority of the new curriculum non-guided in
normal use. This fails Phase 2’s target-map and Phase 3’s “reachable guided
outcomes” criteria.

**Fix:** instrument every catalog target on its actual mounted control/zone, or
remove/rewrite that step before exposing the tour. Add a DOM-level catalog
target verification test per mounted page/workflow.

### P1 — The tutorial library does not implement current-version guide state

`TutorialLibrary.tsx:22-70` reads only browser-local in-progress state via
`getInProgressStep`; it never calls `onboardingClient.getProgress()`, does not
show a new/in-progress/“đã xem hướng dẫn” state, and renders a completed tour
as “Bắt đầu”. This contradicts the library’s server-backed, current-version
state requirement and gives users no visible distinction between a viewed
guide and a verified business task.

**Fix:** load and normalize API progress by `(tourId, tourVersion)`, preserve a
non-blocking unknown/error state, and render the required labels separately
from checklist task completion.

### P1 — Master-switch changes are not revalidated when the library opens

The top-bar callback in `frontend/src/components/Layout.tsx:337-345` only sets
local open state. The library uses the cached `user.onboardingEnabled` value
(`TutorialLibrary.tsx:22-36`) and neither component calls the auth-query
refetch method. An ADMIN change made after login therefore remains invisible
until another auth refresh/reload, contrary to Phase 3.

**Fix:** expose/use the existing auth query refetch on library open; when it
returns disabled, close the library and any active tour.

### P1 — Library dialog lacks the required focus containment

The library only saves/restores its trigger (`TutorialLibrary.tsx:25-34`) and
uses `Drawer`. `Drawer` provides Escape and an ARIA dialog but has no focus
trap (`frontend/src/components/UI.tsx:496-575`). Tab can leave the open
library, violating the explicit Phase 3 keyboard/focus requirement.

**Fix:** use the existing `useFocusTrap` with a library-owned content ref (or
enhance Drawer for an opt-in trap) and add keyboard/focus-return tests.

### P1 — `trip.completed` was added to the event contract but is never emitted

`shared/src/onboarding/events.ts:39,68` declares `trip.completed`, and Phase 2
required wiring it at the successful lifecycle transition. The only completion
action is `TripDetailPage.tsx:74`, which delegates to `handleAction`; no
`onboardingEvents.emit('trip.completed', ...)` exists in frontend source.

**Fix:** emit once after `POST /trips/:id/complete` succeeds in the generic
lifecycle success path, with success/failure/retry coverage.

### P2 — Required new coverage is missing

There is no `TutorialLibrary.test.tsx` or `tourProgress.test.ts`, despite both
being explicit plan artifacts. Existing focused tests pass (22 files / 144
tests), but they do not prove library role matrix, progress version display,
auth switch revalidation, focus behavior, target presence, or version rollback.

**Fix:** add the planned focused tests before relying on the library in a
release.

## Verified strengths

- The discriminated `TaskCompletion` contract is exported and prevents tour
  completion from satisfying event-gated business tasks
  (`shared/src/onboarding/tasks.ts`, `frontend/src/hooks/useOnboardingChecklist.ts:108-157`).
- The task catalog has the planned 5 MANAGER / 5 ACCOUNTANT / 3 ADMIN rows;
  ACCOUNTANT receives figures-save rather than a lock task.
- Dispatch, figures-save, payment, fuel-save, create, and lock emit from
  successful mutation paths; the controller subscribes before awaiting
  directives and cancels its one-shot listener on teardown
  (`TourControllerContext.tsx:194-260`).
- The role filter is explicit for office roles, excluding DRIVER/FORWARDER.
- `pnpm build` in `frontend/` succeeded. Focused frontend tests succeeded:
  22 files, 144 tests.

## Side Effects

- The catalog now presents twelve tours to users, but unresolved targets make
  many launch into the recovery panel instead of guidance.
- Changes to `Tour` metadata and task completion contracts are intentional
  shared public-contract changes; the frontend build is compatible, but there
  is no evidence of full shared/backend test coverage in this review.
- The worktree contains unrelated deleted company source documents and
  untracked artifacts; they were not reviewed or attributed to this feature.
