---
phase: 1
title: Schedule authority and API
status: completed
effort: large
---

# Phase 1: Schedule authority and API

## Overview

Create the canonical schedule model, shared contracts, office-only API, and
query-time reminder rules before any UI work.

## Implementation Steps

1. **Red — contracts and time rules**
   - Add focused tests for schema validation, exact `remindAt` boundaries,
     overdue classification, completed/cancelled suppression, and
     truck/trailer numeric-ID collisions.
   - Freeze `now` in tests and use `Asia/Ho_Chi_Minh` explicitly; never infer
     business-day boundaries from the browser/server locale.
2. **Green — canonical data model**
   - Reuse `vehicle_component`; add `vehicle_schedule_kind`
     (`MAINTENANCE`, `INSPECTION`, `INSURANCE`, `ROAD_FEE`, `DOCUMENT`,
     `OTHER`) and `vehicle_schedule_status`
     (`ACTIVE`, `COMPLETED`, `CANCELLED`).
   - Add `vehicle_schedules`: component + vehicle ID, title, kind, optional
     document number/notes, `dueAt`, `remindAt`, status, completion metadata,
     creator/updater, timestamps, and indexes on status/time and vehicle key.
   - Enforce `remindAt <= dueAt`; service validates that the selected tractor
     or trailer exists. Do not add an unsafe single-table FK for the polymorphic
     vehicle ID.
3. **Green — shared/API layer**
   - Add Zod create/update/query schemas and shared response types with resolved
     `vehiclePlate`, `vehicleComponent`, `isOverdue`, and `status`.
   - Add an office-protected `/api/vehicle-schedules` router for list, create,
     update, complete, and cancel. Permit `ADMIN`, `MANAGER`, and
     `ACCOUNTANT`; reject `DRIVER` and `FORWARDER`.
   - Sort active banners deterministically: overdue first, then nearest due
     time, then ID. Return inactive/history only when explicitly requested.
   - Register Vietnamese audit messages for mutations.
4. **Refactor**
   - Keep time/status classification pure and shared where practical.
   - Centralize component-aware vehicle lookup so list and mutation paths
     cannot accidentally join trailers as trucks.

## Success Criteria

- [ ] Tests fail before implementation and pass afterward.
- [ ] Exact time boundary and timezone behavior are deterministic.
- [ ] CRUD/state transitions are authenticated, role-scoped, audited, and
      component-aware.
- [ ] No scheduler, notification row, or push event is introduced.
- [ ] Migration/schema generation is reviewable and reversible.

## Likely files

- `backend/src/db/schema.ts`
- `backend/drizzle/<next>_*.sql` and generated metadata
- `backend/src/services/vehicle-schedule.service.ts`
- `backend/src/routes/vehicle-schedules.ts`
- `backend/src/index.ts`
- `backend/src/services/audit-types.ts`
- `backend/src/services/audit-templates.ts`
- `shared/src/types/index.ts`
- `shared/src/schemas/index.ts`
- `shared/src/constants/api-paths.ts`
- focused tests under `backend/src/tests/` and `shared/src/`
