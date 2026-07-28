# Problem-first design: vehicle schedules

## Problem

Office staff cannot reliably find upcoming maintenance and document deadlines
when many transport plans and vehicles exist, especially on mobile. Existing
data is split between three tractor-only date fields and renewable expense
records, so neither source can safely support both tractors and trailers.

## Users and outcome

Giám đốc (`MANAGER`) and Kế toán (`ACCOUNTANT`) need a visible operational
warning on Dashboard and Đội xe. `ADMIN` retains visibility under the existing
office-role model. Drivers and forwarders are outside this feature.

## Approved surfaces

- Dashboard warning banner.
- Đội xe warning banner, vehicle badges, and schedule-management modal/drawer.
- Both xe đầu kéo (`TRUCK`) and rơ-moóc (`TRAILER`).

No push notification, topbar bell, driver UI, or background scheduler.

## Authority decision

Create one component-aware `vehicle_schedules` authority. A reminder is active
when its configured `remindAt` timestamp has arrived and its status is active.
The server stores timestamps in UTC and applies the `Asia/Ho_Chi_Minh` business
timezone at input/display boundaries.

Expense rows remain proof of financial transactions. Legacy truck fields are
backfilled and temporarily preserved only for driver compatibility; Fleet
editing moves to the schedule workflow so users do not maintain two truths.

## Interaction model

From a tractor or trailer on Đội xe, office staff opens “Lịch nhắc việc” and
adds a maintenance/document item with reminder time and deadline. When the
reminder time arrives, both approved pages show the plate, component, task, and
deadline. Completing or cancelling the item removes it from active banners.

## Edge cases

- Tractor ID 7 and trailer ID 7 are distinct through the composite identity.
- Items do not appear before `remindAt`; `dueAt < now` is visibly overdue.
- Completed/cancelled items never reappear.
- Long plate/task text wraps on 320 px without horizontal scrolling.
- Re-running backfill does not duplicate reminders.
- Invalid vehicle references and `remindAt > dueAt` are rejected.

## Deliberate exclusions

Document scans, recurrence, mileage rules, cost posting, repeated alerts, and
delivery notifications are deferred until operational use proves they are
needed.

## Success signal

Office users can see and resolve all active tractor/trailer deadlines from the
two agreed pages, with one authoritative reminder per operational obligation
and no regression to existing driver alerts or accounting history.
