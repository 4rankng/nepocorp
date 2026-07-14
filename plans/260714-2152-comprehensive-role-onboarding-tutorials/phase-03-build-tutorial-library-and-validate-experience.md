---
phase: 3
title: Build Tutorial Library and Validate Experience
status: completed
priority: P1
effort: M
dependencies:
  - 1
  - 2
---

# Phase 3: Build Tutorial Library and Validate Experience

## Overview

Add an always-available, role-filtered tutorial library and connect it to the
top bar and starter checklist. The checklist remains an activation prompt; the
library is the durable help surface after dismissal or 100% completion. Finish
with automated, accessibility, responsive, role, and empty-data validation plus
the documentation updates required by the user-visible behavior.

## Context Links

- [Overview plan](./plan.md)
- [Phase 1 catalog](./phase-01-curate-role-based-tutorial-catalog.md)
- [Phase 2 instrumentation](./phase-02-instrument-guided-workflows.md)
- `/Users/dev/Documents/projects/nepocorp/docs/design-guidelines.md`
- `/Users/dev/Documents/projects/nepocorp/docs/codebase-summary.md`

## Requirements

- Functional:
  - Add a **Hướng dẫn sử dụng** top-bar action for office roles while the
    app-wide tutorial switch is enabled.
  - Open an accessible dialog/drawer listing `toursForRole(user.role)`, grouped
    by catalog category with title, summary, prerequisites, estimated time, and
    current-version guide state (new/in progress/**đã xem hướng dẫn**). This is
    not presented as proof that an event-gated business task was completed.
  - Starting or resuming closes the library and delegates to the existing
    `TourController.start`; never create a second tour state machine.
  - Add **Xem tất cả hướng dẫn** to the starter checklist. Every pending task
    shows **Hướng dẫn** because every task now has a tour.
  - Keep the top-bar entry after checklist completion/dismissal. Hide both
    checklist and library entry when the ADMIN master switch is off.
  - Current-version progress comes from the existing onboarding progress API;
    stale historical versions do not label the current tour complete.
  - Revalidate `/auth/me` when the library opens so an ADMIN tutorial-switch
    change is observed promptly; close the library/active tour if the refreshed
    flag is disabled. A broader onboarding-API kill switch is outside scope.
- Accessibility/responsive:
  - Keyboard-openable action, focus trap/return, Escape close, labelled dialog,
    visible focus, screen-reader progress labels, and reduced-motion support.
  - No horizontal scroll; touch targets at least 44px where the responsive
    design system requires; the active tour still clears checklist/library
    overlays to prevent stacked dialogs.
- Non-functional:
  - Reuse existing UI primitives, fonts, tokens, and Forest Sage/Deep-Luxe
    direction. No new dependency or generic state library.

## Architecture

```text
Layout owns tutorialLibraryOpen
  ├─ Topbar → onOpenTutorialLibrary
  ├─ OnboardingChecklist → onOpenTutorialLibrary
  └─ TutorialLibrary
       ├─ toursForRole(user.role)
       ├─ existing onboardingClient.getProgress()
       └─ useTourController().start(id, resumeStep, 'manual')
```

Keep local open/close state in `Layout`; a new global context is unnecessary.
A small `useTutorialLibrary` hook may normalize current-version progress and
loading/error state, but must not duplicate controller or checklist state.
Implement focus ownership explicitly with the existing `useFocusTrap` hook plus
captured trigger focus/return; do not assume generic `Modal`/`Drawer` already
provides that full contract.

## Related Code Files

- Create `/Users/dev/Documents/projects/nepocorp/frontend/src/components/onboarding/TutorialLibrary.tsx`.
- Create `/Users/dev/Documents/projects/nepocorp/frontend/src/components/onboarding/tutorial-library.css`.
- Create `/Users/dev/Documents/projects/nepocorp/frontend/src/components/onboarding/TutorialLibrary.test.tsx`.
- Create only if it removes real component complexity:
  `/Users/dev/Documents/projects/nepocorp/frontend/src/hooks/useTutorialLibrary.ts` and test.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/components/Layout.tsx` —
  own library state and render one instance.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/components/layout/Topbar.tsx` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/components/layout/types.ts` — office help action/callback.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/components/onboarding/OnboardingChecklist.tsx` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/components/onboarding/onboarding-checklist.css`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/components/onboarding/OnboardingChecklist.test.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/hooks/useAuth.tsx`
  only as needed to expose the existing auth-query refetch on library open.
- Modify `/Users/dev/Documents/projects/nepocorp/docs/design-guidelines.md` — update the stale
  localStorage-only/on-demand tour description and document checklist/library behavior.
- Modify `/Users/dev/Documents/projects/nepocorp/docs/codebase-summary.md` — add the library/catalog entry points.
- Modify `/Users/dev/Documents/projects/nepocorp/docs/flows/00-OVERVIEW_VA_PHAN_QUYEN.md` — short user-facing access note; do not duplicate all tour copy.

## Implementation Steps

1. Build the role-filtered library with existing portal/focus utilities and an
   explicit `useFocusTrap` plus trigger-focus return implementation.
   Render loading, API-error fallback, empty role state, category groups, and
   current-version progress without blocking tour launch.
2. Connect start/resume to the controller. Prevent concurrent overlays: opening
   the library is disabled/closed while a tour is active; starting a guide closes
   library and checklist before directives execute.
3. Add the top-bar action using an explicit ADMIN/MANAGER/ACCOUNTANT predicate,
   not the existing `!isDriver` shortcut (which also includes FORWARDER). Add
   the checklist footer link; revalidate the flag on open and verify the action
   survives 100% completion/dismissal.
4. Update checklist tests for 5/5/3 role totals, all guide buttons, event-vs-tour
   completion, dismissal recovery, and completed-panel hiding.
5. Add library tests for the explicit tour-role matrix, current-version state,
   stale versions, guide-viewed versus business-task completion, start/resume
   delegation, disabled master switch, keyboard close/focus return, and narrow
   layout semantics. Render DRIVER and FORWARDER and assert no office entry.
6. Run manual QA with real local/staging data for all three office roles and
   representative empty-state accounts. Confirm no writes occur from an
   orientation tour and mutation tasks stay pending until success.
7. Update the three docs only after behavior is verified; ensure role/access
   claims match `App.tsx` and page capabilities, not conflicting legacy prose.

## Test and Validation Gates

Focused first:

```bash
cd /Users/dev/Documents/projects/nepocorp
npx tsx --test shared/src/tours/catalog.test.ts shared/src/onboarding/events.test.ts shared/src/onboarding/tasks.test.ts
cd frontend && pnpm test -- src/context/TourControllerContext.test.tsx src/lib/tourTarget.test.ts src/lib/onboardingEvents.test.ts src/hooks/useOnboardingChecklist.test.tsx src/components/onboarding/OnboardingChecklist.test.tsx src/components/onboarding/TutorialLibrary.test.tsx
cd ../backend && npx tsx --test --test-concurrency=1 src/tests/agent-tour-net.test.ts src/tests/onboarding-progress-task.test.ts
```

Cross-package contracts/build:

```bash
cd /Users/dev/Documents/projects/nepocorp/shared && pnpm typecheck
cd ../frontend && pnpm build
cd ../backend && pnpm build
```

Manual matrix: ADMIN/MANAGER/ACCOUNTANT × desktop/narrow × empty/live data,
plus negative DRIVER and FORWARDER checks;
check master switch off, dismiss, 100%, resume after refresh, target missing,
route changes, modal interaction, keyboard-only, and reduced motion.

## Success Criteria

- [ ] The screenshot's two unguided ACCOUNTANT items are replaced by reachable guided outcomes; all five ACCOUNTANT tasks have **Hướng dẫn**.
- [ ] MANAGER sees five tasks; ACCOUNTANT five; ADMIN three; portal roles none.
- [ ] The library is reachable after dismissal and 100% completion and shows only role-visible tours.
- [ ] New/in-progress/đã-xem labels use the current tour version and remain
      visually distinct from verified checklist task completion.
- [ ] Starting/resuming delegates to one controller and never stacks overlays.
- [ ] Keyboard, focus, screen-reader labels, reduced motion, desktop, and narrow layouts pass.
- [ ] Focused tests, package builds, and manual matrix pass without ignored failures.
- [ ] Design/codebase/user-flow docs match the implementation.

## Risk Assessment

- A top-bar action can crowd narrow layouts. Use the existing icon-action
  pattern and test at the smallest supported office width.
- Progress fetch failure must not remove help. Show tours with unknown state and
  allow start; persistence remains best-effort as today.
- Twelve tours can become stale. Catalog tests, semantic targets, versions, and
  the documented authoring checklist are the maintenance boundary; do not add a
  second content source.

## Security Considerations

The library filters with `toursForRole` before rendering and the controller
rechecks role/master-switch on start. Progress calls address only the JWT user.
No sensitive data, raw IDs, mutation payloads, or unrestricted target selectors
are rendered or sent to the chatbot.

## Rollback

Remove the library entry/component and revert catalog/tasks to the prior IDs.
Generic server rows and analytics history can remain; no down migration or data
rewrite is necessary. Version-aware local keys and mismatch rejection prevent
restored clients from resuming an incompatible step sequence.
