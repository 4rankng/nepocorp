---
phase: 1
title: Curate Role-Based Tutorial Catalog
status: in-progress
priority: P1
effort: M
dependencies: []
---

# Phase 1: Curate Role-Based Tutorial Catalog

## Overview

Define the curriculum as typed shared data before adding UI targets. Replace the
current implicit “a tour completion completes every linked task” behavior with
an explicit task completion policy, split the mixed lock/payment guide, and add
the missing role curricula. Existing persisted rows remain valid because tour
and task IDs are free strings; removed IDs become harmless historical rows.

## Context Links

- [Overview plan](./plan.md)
- [Curriculum research](./research/curriculum-report.md)
- [Technical scout](./research/technical-scout-report.md)
- `/Users/dev/Documents/projects/nepocorp/CONTEXT.md`
- `/Users/dev/Documents/projects/nepocorp/plans/2026-07-13-onboarding-orchestration-layer/plan.md`

## Requirements

- Functional:
  - Keep `Tour` as the single curated catalog contract. Add only library-facing
    metadata that is demonstrably needed: `category`, `estimatedMinutes`, and
    optional Vietnamese `prerequisites`.
  - Replace `OnboardingTask.completionEvent` with a discriminated completion
    contract: `{ type: 'event'; event }` for verified work or `{ type: 'tour' }`
    for orientation/reference completion. Every task has a `tourId`.
  - Create 5 MANAGER, 5 ACCOUNTANT, and 3 ADMIN activation tasks with stable,
    role-prefixed IDs and deterministic sort order.
  - Curate 12 focused tours: `manager-dashboard-overview`, `create-trip`,
    `dispatch-trip`, `lock-trip`, `review-pnl`, `accounting-overview`,
    `update-trip-figures`, `record-receivable-payment`, `fuel-config`,
    `system-readiness`, `manage-users`, and `review-audit-log`.
  - Bump `create-trip` and `fuel-config` versions when their step sequence or
    completion contract changes. Retire `lock-trip-and-payment` from the live
    catalog rather than preserving a misleading alias.
  - Make local progress version-aware before either bump: store/require
    `tourVersion`, clear the legacy version-blind key, and ignore any record
    whose version differs from the current catalog tour.
- Non-functional:
  - Vietnamese user copy; 2–10 concise steps; no invented business rules.
  - No new package, database migration, endpoint, or selector/Javascript from
    the chatbot.
  - ADMIN is support/governance; DRIVER/FORWARDER remain excluded.

## Curriculum Contract

| Role | Task | Tour | Completion |
|---|---|---|---|
| MANAGER | Đọc tổng quan vận hành tháng này | `manager-dashboard-overview` | tour |
| MANAGER | Tạo chuyến vận chuyển đầu tiên | `create-trip` | `trip.created` |
| MANAGER | Cho chuyến đầu tiên khởi hành | `dispatch-trip` | `trip.dispatched` |
| MANAGER | Kiểm tra và khóa một chuyến hoàn thành | `lock-trip` | `trip.locked` |
| MANAGER | Đọc báo cáo lãi lỗ theo kỳ | `review-pnl` | tour |
| ACCOUNTANT | Xem công nợ và việc cần xử lý | `accounting-overview` | tour |
| ACCOUNTANT | Hoàn thiện số liệu tài chính một chuyến | `update-trip-figures` | `trip.figures_saved` |
| ACCOUNTANT | Ghi nhận thanh toán khách hàng đầu tiên | `record-receivable-payment` | `receivable.payment_recorded` |
| ACCOUNTANT | Đối chiếu báo cáo lãi lỗ theo kỳ | `review-pnl` | tour |
| ACCOUNTANT | Cập nhật định mức và đơn giá nhiên liệu | `fuel-config` | `config.fuel_saved` |
| ADMIN | Kiểm tra dữ liệu nền sẵn sàng vận hành | `system-readiness` | tour |
| ADMIN | Kiểm tra tài khoản và phân quyền | `manage-users` | tour |
| ADMIN | Kiểm tra nhật ký người dùng | `review-audit-log` | tour |

Task assignment stays exactly as above. Tour visibility is a separate explicit
contract used by the library, chatbot search/net, and controller:

| Tour | MANAGER | ACCOUNTANT | ADMIN |
|---|:---:|:---:|:---:|
| `manager-dashboard-overview` | ✓ |  | ✓ |
| `create-trip` | ✓ |  | ✓ |
| `dispatch-trip` | ✓ |  | ✓ |
| `lock-trip` | ✓ |  | ✓ |
| `review-pnl` | ✓ | ✓ | ✓ |
| `accounting-overview` |  | ✓ | ✓ |
| `update-trip-figures` |  | ✓ | ✓ |
| `record-receivable-payment` | ✓ | ✓ | ✓ |
| `fuel-config` | ✓ | ✓ | ✓ |
| `system-readiness` |  |  | ✓ |
| `manage-users` |  |  | ✓ |
| `review-audit-log` | ✓ |  | ✓ |

## Architecture

```ts
type TaskCompletion =
  | { type: 'event'; event: ProductEventName }
  | { type: 'tour' };

interface OnboardingTask {
  id: string;
  title: string;
  role: Role.ADMIN | Role.MANAGER | Role.ACCOUNTANT;
  tourId: TourId;
  completion: TaskCompletion;
  sortOrder: number;
}
```

`useOnboardingChecklist` subscribes to the event only for `type: 'event'`. Its
`tour.completed` handler updates only `type: 'tour'` tasks whose `tourId`
matches the payload. Server payloads and tables do not change.

## Related Code Files

- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/tours/schema.ts` —
  minimal library metadata.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/tours/catalog.ts` —
  12 role-scoped tours, versions, aliases, prerequisites, focused steps.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/onboarding/tasks.ts` —
  explicit completion policy and 13 tasks.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/onboarding/index.ts` and
  `/Users/dev/Documents/projects/nepocorp/shared/src/index.ts` — export the
  public `TaskCompletion` contract with `OnboardingTask`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/hooks/useOnboardingChecklist.ts` —
  enforce event-vs-tour completion semantics.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/lib/tourProgress.ts` —
  version-aware local record/key and legacy-key invalidation.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/context/TourControllerContext.tsx` and
  `/Users/dev/Documents/projects/nepocorp/frontend/src/components/agent/TourController.tsx` —
  version-aware resume discovery/reconciliation and prompt.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/context/TourControllerContext.test.tsx`
  and create `/Users/dev/Documents/projects/nepocorp/frontend/src/lib/tourProgress.test.ts`
  for upgrade and rollback.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/tours/catalog.test.ts`.
- Modify `/Users/dev/Documents/projects/nepocorp/shared/src/onboarding/tasks.test.ts`.
- Modify `/Users/dev/Documents/projects/nepocorp/frontend/src/hooks/useOnboardingChecklist.test.tsx`.
- Modify `/Users/dev/Documents/projects/nepocorp/backend/src/services/agent/orchestrator.ts` —
  remove the two hard-coded three-tour prompt lists; instruct the model to use
  role-filtered `tours.search` results.
- Modify `/Users/dev/Documents/projects/nepocorp/backend/src/tests/agent-tour-net.test.ts` —
  representative new allowed/denied tour IDs and retired ID behavior.

## Implementation Steps

1. Add the minimal `Tour` metadata and public discriminated task completion
   type; update both shared barrels and every fixture/assertion that still uses
   `completionEvent` directly on a task.
2. Write/adjust catalog integrity tests first: stable unique IDs, positive
   versions/durations, known categories/routes/events, 2–10 non-empty steps,
   non-empty roles, and no DRIVER/FORWARDER exposure.
3. Author the 12 tours from the verified flow docs. Each mutating tour ends on
   its success event; examples explain format only and never prescribe values.
4. Replace the task arrays with the 13-row matrix. Preserve compatible task IDs
   where the outcome is unchanged; intentionally remove the impossible
   accountant lock task.
5. Update checklist subscriptions so tour clicking cannot falsely complete an
   event-gated task. Preserve optimistic local UI and fire-and-forget persistence.
6. Version the local cache before catalog version bumps. Clear legacy keys,
   require exact versions during resume/freshness comparison, and test forward
   deploy plus rollback for same-ID tours.
7. Make the chatbot prompt catalog-driven and update tour-net coverage. Do not
   change the safe response union, `tours.search`, or controller.

## Success Criteria

- [ ] Exactly 5/5/3 ordered tasks exist for MANAGER/ACCOUNTANT/ADMIN.
- [ ] Every task has a known role-visible tour.
- [ ] Event tasks stay pending after their tour completes without the event.
- [ ] Tour tasks complete only for their own `tourId`.
- [ ] ACCOUNTANT has no lock task/tour assignment; no RBAC code changed.
- [ ] Retired `lock-trip-and-payment` cannot be launched by chat or checklist.
- [ ] A v2 local record cannot resume a v3 tour (or vice versa); current-version
      server progress wins over a mismatched local timestamp.
- [ ] Existing persisted rows require no cleanup or migration.
- [ ] Shared, hook, and agent-tour-net focused tests pass.

## Risk Assessment

- Catalog volume can make one file unwieldy. Keep one catalog source for now;
  split only if the implemented file exceeds existing size gates.
- Old server rows remain harmless history. Legacy version-blind local keys are
  cleared; mismatched versioned records are ignored, preventing wrong-step
  resume on forward deploy or rollback.
- Role docs conflict. This phase follows current frontend capability and records
  no permission change; a future RBAC decision must bump affected tour versions.

## Security Considerations

Role checks remain in `toursForRole`, the controller, React routes, and Casbin.
The chatbot still receives only closed tour IDs and typed directives; no DOM
selector, arbitrary route, or mutation payload becomes model-controlled.

## Next Steps

Proceed to Phase 2 only after the catalog compiles and all event-gated steps
have an identified real success callback to instrument.
