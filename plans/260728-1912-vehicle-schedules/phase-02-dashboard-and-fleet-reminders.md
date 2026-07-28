---
phase: 2
title: Dashboard and Fleet reminders
status: completed
effort: large
---

# Phase 2: Dashboard and Fleet reminders

## Overview

Build the two approved responsive surfaces and the schedule-management workflow
on Đội xe. Keep the presentation flat, compact, and operational.

## Implementation Steps

1. **Red — UI state and permissions**
   - Add tests for hidden-before-reminder, due, overdue, completed/cancelled,
     empty, loading, and API-error states.
   - Cover `ADMIN`, `MANAGER`, `ACCOUNTANT` visibility and explicit
     `DRIVER`/`FORWARDER` exclusion.
2. **Green — data client and reusable banner**
   - Add API client/query keys/hooks for active reminders and mutations.
   - Create a reusable `VehicleScheduleBanner` with severity, plate,
     tractor/trailer label, schedule title, due time, count summary, and a
     Đội xe link/action. Use text/icons in addition to color.
3. **Green — Dashboard**
   - Place the banner in the decision area without nesting another decorative
     card hierarchy. Keep the existing renewable-expense finance report
     separate from the operational banner.
4. **Green — Đội xe**
   - Show the same active reminder summary above the vehicle sections.
   - Add per-row/per-card reminder badges for tractors and trailers.
   - Add a plate-scoped “Lịch nhắc việc” modal/drawer to list history and
     create/edit/complete/cancel schedules.
   - Inputs: type, title, reminder date/time, due date/time, optional document
     number and notes. No upload or recurrence controls.
5. **Refactor and responsive polish**
   - Share labels/status formatting across Dashboard and Fleet.
   - At narrow widths stack banner content, wrap long titles/plates, keep modal
     actions reachable, and maintain minimum 44 px touch targets.

## Success Criteria

- [ ] Both Dashboard and Đội xe show the same active authority and ordering.
- [ ] Tractor and trailer schedule management works without numeric-ID
      collisions.
- [ ] “Quá hạn” and upcoming/due states have clear non-color cues.
- [ ] No banner or schedule controls render for portal roles.
- [ ] 320/375/768/desktop viewport checks show no horizontal overflow.
- [ ] Focused component tests and accessibility assertions pass.

## Likely files

- `frontend/src/api/vehicleScheduleClient.ts`
- `frontend/src/api/keys.ts`
- `frontend/src/features/fleet/schedules/*`
- `frontend/src/pages/DashboardPage.tsx` and CSS
- `frontend/src/pages/FleetPage.tsx` and CSS
- `frontend/src/features/fleet/truck-card.tsx`
- `frontend/src/features/fleet/trailer-card.tsx`
- focused Vitest/Testing Library tests
