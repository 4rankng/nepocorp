---
title: Create-trip tutorial usability repair
status: completed
created: '2026-07-13'
---

# Create-trip tutorial usability repair

## Scope

Repair only the **Tạo chuyến vận chuyển** walkthrough shown in the reported screenshots. The guide must remain usable above the trip form's fixed action bar, must not overlap the onboarding checklist, and must give a single unambiguous instruction path.

## Acceptance criteria

- Starting `create-trip` hides the checklist until the tour ends.
- Tour controls remain visible and usable above the create-form action bar on desktop and mobile.
- Curated-tour spotlights retain the overlay/target emphasis but do not show Driver.js's contradictory secondary popover.
- The first step navigates to the create-trip page without spotlighting its whole form; remaining steps retain the exact customer, route, and submit targets.
- The final step still completes from `trip.created`, with its existing manual fallback.
- No API, database, role, or stable target contract changes.

## Phase

1. [Repair implementation and tests](./phase-01-repair.md) — completed
2. [Checklist progress and dismissal repair](./phase-02-checklist-progress.md) — completed

## Validation

Run focused frontend/shared tests, then the affected package typecheck/build if available. Manually verify the tour at desktop and narrow mobile widths.
