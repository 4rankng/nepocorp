---
title: Comprehensive Role-Based Onboarding Tutorials
description: >-
  Expand the four-item starter card into role-based guided curricula plus a
  persistent tutorial library, using the existing tour engine and progress APIs.
status: in-progress
priority: P2
branch: feat/onboarding-orchestration
tags:
  - feature
  - frontend
  - onboarding
  - tutorials
blockedBy: []
blocks: []
created: '2026-07-14T14:01:27.255Z'
createdBy: 'ck:plan'
source: skill
---

# Comprehensive Role-Based Onboarding Tutorials

## Overview

The current onboarding foundation is sound, but the content is not: only three
curated tours exist, the ACCOUNTANT checklist shown in the report has four items
but only two guide buttons, one tour combines trip locking with payment, and no
visible guide entry point remains after the checklist reaches 100%.

This plan keeps the existing Driver.js renderer, typed tour controller, product-
event bus, analytics, and generic Postgres progress/task rows. It adds a compact
role curriculum (5 MANAGER, 5 ACCOUNTANT, 3 ADMIN tasks), focused one-job tours,
and an always-available role-filtered tutorial library. No migration, new API,
sample data, runtime dependency, or DRIVER/FORWARDER expansion is required.

## Scope Decisions

- Every starter task has a curated guide; the floating checklist stays small.
- Mutation tasks complete only from their real success event. Finishing a tour
  completes only orientation/reference tasks explicitly configured for that.
- Split `lock-trip-and-payment` into `lock-trip` and
  `record-receivable-payment`; retain and improve `create-trip` and `fuel-config`.
- Follow current frontend permissions without changing RBAC: MANAGER/ADMIN get
  the lock task; ACCOUNTANT gets the editable-trip-figures task instead.
- ADMIN receives readiness, user-access, and audit guides rather than inheriting
  business-operator activation tasks.
- Empty installations get truthful prerequisites and recovery copy; tours never
  create demo customers, trips, users, payments, or configuration.

## Curriculum Summary

| Role | Core outcomes |
|---|---|
| MANAGER | Dashboard orientation; create; dispatch; review/lock; P&L review |
| ACCOUNTANT | Accounting orientation; save trip figures; receive payment; P&L review; fuel config |
| ADMIN | Check system readiness; review users/access; review audit trail |

The library exposes every role-visible tour on demand, including previously viewed
tours, while the checklist shows only the role's activation outcomes.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Curate Role-Based Tutorial Catalog](./phase-01-curate-role-based-tutorial-catalog.md) | In Progress |
| 2 | [Instrument Guided Workflows](./phase-02-instrument-guided-workflows.md) | Pending |
| 3 | [Build Tutorial Library and Validate Experience](./phase-03-build-tutorial-library-and-validate-experience.md) | Pending |

## Dependencies

- Builds on completed `plans/2026-07-13-onboarding-orchestration-layer/` and
  `plans/2026-07-13-create-trip-tutorial-repair/`.
- No blocking unfinished plan. Coordinate the generic tour-prompt edit with
  `plans/2026-07-13-fast-response-chatbot-lanes/` if both branches touch
  `backend/src/services/agent/orchestrator.ts`.
- Research: [curriculum](./research/curriculum-report.md) and
  [technical scout](./research/technical-scout-report.md).

## Acceptance Criteria

- All 13 role tasks are reachable and each shows **Hướng dẫn**.
- Mutation tasks cannot be completed by clicking through instructional steps.
- The tutorial library remains available after checklist dismissal/completion.
- Tours are role-safe, keyboard/mobile usable, resumable, and recover from a
  missing target without blocking normal application work.
- Same-ID version changes cannot resume a stale local step, and fast actions
  cannot fire before their interaction-step listener is registered.
- Focused tests and shared/frontend/backend build gates pass; docs match the
  shipped behavior.

## Open Questions

None for this scope. The existing ACCOUNTANT lock-policy contradiction is
resolved conservatively by not changing RBAC and not assigning that task to
ACCOUNTANT. Any future permission change is a separate product decision.

## Red Team Review

2026-07-14: 19 raw evidence-backed findings reviewed (1 Critical, 10 High,
8 Medium): 13 accepted/accepted with reduced scope, 6 rejected. Duplicate
findings were applied once. Rejections were disproportionate to onboarding's
threat model or unrelated platform-auth work. Accepted corrections cover
versioned local progress, listener ordering, exact mutation owners, explicit
tour-role visibility, shared exports, portal-role tests, and focus behavior.
See `reports/from-code-reviewer-to-planner-red-team-*.md`.

### Whole-Plan Consistency Sweep

- Files reread: `plan.md` and all three phase files.
- Decision deltas checked: 9; stale references reconciled: 9.
- Unresolved contradictions: 0.
