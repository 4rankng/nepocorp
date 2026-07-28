---
title: Vehicle maintenance and document schedules
description: >-
  One operational reminder authority for tractor and trailer
  maintenance/documents, surfaced on Dashboard and Fleet for office roles.
status: completed
priority: P1
branch: main
tags:
  - fleet
  - dashboard
  - maintenance
  - compliance
  - responsive
blockedBy: []
blocks: []
created: '2026-07-28T11:12:52.841Z'
createdBy: 'ck:plan'
source: skill
---

# Vehicle maintenance and document schedules

## Overview

Add date-and-time schedules for maintenance and vehicle documents for both xe
đầu kéo and rơ-moóc. Active reminders are computed on read: a banner appears
when `remind_at <= now` in the Vietnam business timezone and remains until the
schedule is completed or cancelled. The only new surfaces are Dashboard and
Đội xe for `ADMIN`, `MANAGER` (Giám đốc), and `ACCOUNTANT` (Kế toán).

The new schedule table is the operational authority. Existing expense records
remain financial evidence; legacy truck expiry fields remain temporary
compatibility projections so the current driver endpoint does not regress.

Approved design: [research/brainstorm-report.md](./research/brainstorm-report.md)

## Acceptance criteria

- A permitted office user can create, edit, complete, and cancel a schedule for
  either a tractor or trailer, including user-defined maintenance/document
  labels and an exact Vietnam reminder date/time.
- Dashboard and Đội xe show due/overdue banners only after `remindAt`; items
  disappear after completion/cancellation and never leak to driver/forwarder
  views.
- `(vehicleComponent, vehicleId)` is used everywhere, so a tractor and trailer
  with the same integer ID never collide or show the wrong plate.
- Legacy truck dates and latest renewable expense validity dates are backfilled
  idempotently without creating competing reminders.
- Desktop, tablet, 375 px, and 320 px layouts have readable wrapping, 44 px
  actions, and no horizontal overflow.
- Focused shared/backend/frontend tests, full frontend tests/build, backend
  tests, migration checks, and `git diff --check` pass.

## Out of scope

Push notifications, topbar bell rows, driver UI changes, background schedulers,
document scan uploads, mileage-triggered maintenance, recurrence automation,
and service-cost posting.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Schedule authority and API](./phase-01-schedule-authority-and-api.md) | Completed |
| 2 | [Dashboard and Fleet reminders](./phase-02-dashboard-and-fleet-reminders.md) | Completed |
| 3 | [Migration integration and QA](./phase-03-migration-integration-and-qa.md) | Completed |

## Dependencies

- Existing `vehicle_component` enum (`TRUCK` / `TRAILER`).
- Existing office role convention (`ADMIN`, `MANAGER`, `ACCOUNTANT`).
- Preserve the uncommitted dispatch-today changes already in the worktree.
- No blocking dependency on other unfinished plans; avoid global shell and
  branding files owned by the rebrand work.

## Delivery

Implement with `/ck:cook plans/260728-1912-vehicle-schedules/plan.md --tdd`.
Release/deployment remains a separate explicit step.
