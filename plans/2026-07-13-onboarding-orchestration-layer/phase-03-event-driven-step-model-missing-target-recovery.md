---
phase: 3
title: Event-Driven Step Model & Missing-Target Recovery
status: completed
priority: P1
effort: L
dependencies:
  - 1
  - 2
---

# Phase 3: Event-Driven Step Model & Missing-Target Recovery

## Overview

This is the core engine upgrade. It makes tour steps **wait for a real business
event** before advancing (instead of only the Next button), and it replaces the
current silent `highlight-missed` text with a real **missing-target recovery
UX**. It consumes Phase 1's event bus and Phase 2's target resolver.

Per **decision D1**, the step model is **extended, not replaced**: an optional
`completionEvent?` is added to `AgentTutorialStep`. A step with `completionEvent`
becomes an *interaction step* — the Next button is de-emphasized and the tour
waits on `onboardingEvents.waitFor(completionEvent)`. A step without it keeps
the current explain/navigate behavior. This preserves the shared step type used
by freeform LLM `tutorial` responses.

## Requirements

- **Functional**
  - `AgentTutorialStep` gains an optional `completionEvent?: ProductEventName`
    (and optional `completionTimeoutMs?: number`).
  - When a step has `completionEvent`, the `TourController`:
    1. Renders the step body + spotlight as today.
    2. Calls `onboardingEvents.waitFor(completionEvent, { timeoutMs })`.
    3. On event fire → auto-advances to the next step (with a brief "✓ Hoàn
       thành" confirmation).
    4. Keeps a visible manual **"Tôi đã làm xong"** button as a fallback so a
       missed event never traps the user.
    5. Never force-advances on timeout unless `completionTimeoutMs` is set
       (default: wait indefinitely, fall back to manual button).
  - Missing-target recovery: when `waitForTourTarget` returns null for a step's
    directive target, render a **"Không tìm thấy phần tử — bỏ qua bước?"** panel
    with two actions: *Bỏ qua bước* / *Thử lại*. Emit `onboarding_target_missing`
    (Phase 5 records it).
  - The tour state machine gains explicit statuses: `idle | showing |
    waiting_for_action | target_missing | completed | skipped`.
- **Non-functional**
  - No regression to the 3 existing tours: they have no `completionEvent` today,
    so they keep working as explain/navigate tours. (Optionally, this phase may
    add `completionEvent: 'trip.created'` to the `create-trip` final step as the
    reference interaction step — recommended, since it is the brief's canonical
    example.)
  - `agentHighlight.ts` is migrated to call `resolveTourTarget` (Phase 2) instead
    of raw `getElementById`.
  - `start()` signature is extended to `start(tourId, resumeStep?, triggerSource?: 'manual' | 'chatbot' | 'checklist')` with `'manual'` default — this grounds the
    `trigger_source` field Phases 5/6/7 depend on. Existing call sites (which pass
    no third arg) keep working.

## Architecture

### Step model extension (decision D1)

```ts
// shared/src/schemas/agent.ts — extend, do not replace
export interface AgentTutorialStep {
  title: string;
  body: string;
  example?: string;
  directive?: AgentDirective;
  completionEvent?: ProductEventName;     // NEW — makes this an interaction step
  completionTimeoutMs?: number;           // NEW — 0/undefined = wait forever (manual fallback)
}
```

Because `AgentTutorialStep` is shared with the orchestrator's freeform
`tutorial` synthesis, the new fields are **optional and ignored by the LLM
path** — the model does not (and should not) emit `completionEvent`. Only
curated `TOUR_CATALOG` steps set it. (The tour-net guardrail already rewrites
LLM tutorials to curated ones when a match exists.)

### State machine (in `TourControllerContext`)

Today the context tracks `(tour, currentStep, highlightMissed, resumable)`
implicitly. This phase introduces an explicit `TourStatus` reducer action set:

```ts
type TourStatus =
  | 'idle'
  | 'showing'              // step rendered, spotlight up, waiting for manual Next
  | 'waiting_for_action'   // interaction step: waiting for completionEvent
  | 'target_missing'       // recovery UX shown
  | 'completed'
  | 'skipped';
```

Transitions:
- `start` → showing (or waiting_for_action if step 0 has completionEvent).
- step directive target missing → target_missing.
- target_missing + "thử lại" → showing (re-resolve).
- target_missing + "bỏ qua bước" → advance.
- showing + Next → next step (or completed if last).
- waiting_for_action + completionEvent fires (or manual "tôi đã làm xong") →
  next step.
- skip at any point → skipped.

### Missing-target recovery UX (in `TourController.tsx`)

Replace the current inline `highlightMissed` text block (TourController.tsx
~line 75) with a dedicated recovery panel:

```
┌─────────────────────────────────┐
│ ⚠ Không tìm thấy phần tử        │
│ "trip-new-submit" trên trang.   │
│ Có thể giao diện đã thay đổi.   │
│                                 │
│   [Thử lại]      [Bỏ qua bước]  │
└─────────────────────────────────┘
```

On either action, emit the corresponding Phase 5 analytics event.

### Files

```
shared/src/schemas/agent.ts                # extend AgentTutorialStep
shared/src/tours/catalog.ts                # add completionEvent to create-trip final step (reference)
shared/src/tours/catalog.test.ts           # assert completionEvent names are in PRODUCT_EVENTS

frontend/src/context/TourControllerContext.tsx   # explicit TourStatus reducer + waitFor wiring
frontend/src/components/agent/TourController.tsx # recovery panel + manual-fallback button
frontend/src/lib/agentHighlight.ts              # swap getElementById → resolveTourTarget
```

## Related Code Files

- **Modify** `shared/src/schemas/agent.ts` — add `completionEvent?` /
  `completionTimeoutMs?` to `AgentTutorialStep`. (Note: the `agentTutorialStepSchema`
  Zod schema must also accept — but **not trust** — these fields if they ever
  appear over the wire; the LLM path simply won't set them. Mark them optional
  in Zod.)
- **Modify** `shared/src/tours/catalog.ts` — set
  `completionEvent: 'trip.created'` on the last step of `create-trip` as the
  canonical interaction step.
- **Modify** `shared/src/tours/catalog.test.ts` — every `completionEvent` value
  must be a member of `PRODUCT_EVENTS`.
- **Modify** `frontend/src/context/TourControllerContext.tsx` — introduce
  `TourStatus`, the reducer, and the `waitFor` subscription per interaction step.
  Unsubscribe on step change / unmount / skip.
- **Modify** `frontend/src/components/agent/TourController.tsx` — render the
  recovery panel when `status === 'target_missing'`; render the manual-fallback
  button when `status === 'waiting_for_action'`.
- **Modify** `frontend/src/lib/agentHighlight.ts` — replace
  `document.getElementById(targetId)` with `resolveTourTarget(targetId)`.

## Implementation Steps

1. Extend `AgentTutorialStep` (+ Zod) in shared; rebuild shared; fix any type
   errors (there should be none — fields are optional).
2. In `TourControllerContext`, refactor the implicit state into an explicit
   `status` field on the reducer. Keep the public context value shape
   backward-compatible (add `status`, don't remove existing fields) so
   `TourController.tsx` and `AgentAssistant.tsx` keep compiling. Extend
   `start(tourId, resumeStep?, triggerSource?)` to capture and stash the
   `triggerSource` (default `'manual'`) for Phase 5 analytics tagging.
3. Wire interaction-step waiting: when entering a step with `completionEvent`,
   set `status = 'waiting_for_action'` and subscribe
   `onboardingEvents.waitFor(completionEvent, { timeoutMs })`. On resolve-non-null,
   advance. On null (timeout), **stay** in waiting_for_action and surface the
   manual button prominently (do not auto-advance).
4. Implement the target-missing path: the per-step directive drive (currently
   `sendAndWait`) calls `waitForTourTarget` from Phase 2; on null, set
   `status = 'target_missing'` instead of the current best-effort text.
5. Build the recovery panel in `TourController.tsx` with *Thử lại* (re-resolve,
   re-attempt spotlight) and *Bỏ qua bước* (advance to next step).
6. Swap `agentHighlight.ts` to `resolveTourTarget`. Verify the 3 existing tours
   still spotlight correctly (their `id`s still resolve via the `id` fallback).
7. Add `completionEvent: 'trip.created'` to `create-trip`'s final step; manually
   QA: start the tour, perform a real trip creation, observe auto-advance.
8. Write/update tests: reducer transitions; waitFor subscription cleanup on
   unmount; recovery panel render; catalog completionEvent membership.

## Success Criteria

- [ ] The 3 existing tours still run end-to-end with no behavior change
      (regression check).
- [ ] Starting `create-trip`, navigating to the form, and creating a real trip
      auto-advances the final step (the `trip.created` event fires).
- [ ] If `completionEvent` never fires, the user can still advance via the manual
      "Tôi đã làm xong" button — no trap.
- [ ] A step whose target element is absent shows the recovery panel (not silent
      text); *Thử lại* re-attempts, *Bỏ qua bước* advances.
- [ ] `onboardingEvents.waitFor` listener is cleaned up when the tour advances,
      is skipped, or unmounts (no leak — assert in test).
- [ ] `agentHighlight.ts` resolves targets via `resolveTourTarget` (both
      `data-tour-id` and `id` paths work).
- [ ] All shared + frontend tests green; `pnpm build` clean.

## Risk Assessment

- **Risk:** An interaction step's event never fires (e.g. the user completes the
  action via a path that doesn't hit the emit site) → stuck tour.
  **Mitigation:** mandatory manual-fallback button; default no auto-timeout; the
  emit sites are wired at the canonical success paths in Phase 1.
- **Risk:** Refactoring `TourControllerContext` to an explicit status breaks the
  resume-on-refresh logic. **Mitigation:** resume reads `getInProgressStep` (a
  step index), independent of `status`; status is recomputed on start. Keep
  resume path unchanged in this phase.
- **Risk:** `AgentTutorialStep` extension leaks into the LLM `tutorial` path and
  the model starts emitting `completionEvent`. **Mitigation:** the field is not
  mentioned in the system prompt; the Zod schema accepts but the orchestrator's
  tutorial synthesis never reads it. Defense-in-depth: strip unknown
  `completionEvent` from model-authored tutorials before persisting (Phase 7's
  tour-net already rewrites to curated tours when possible).
