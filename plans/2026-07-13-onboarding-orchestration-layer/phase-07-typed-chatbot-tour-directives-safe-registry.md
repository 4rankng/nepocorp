---
phase: 7
title: Typed Chatbot Tour Directives & Safe Registry
status: completed
priority: P2
effort: M
dependencies:
  - 4
---

# Phase 7: Typed Chatbot Tour Directives & Safe Registry

## Overview

Extend the chatbot's tour-control surface from `start_tour` only to a full
typed triple — `start_tour` / `continue_tour` / `cancel_tour` — and add a
**server-side tour registry with role validation** so the model can **select**
a tour but **never invent** one, emit selectors, or emit JavaScript. This closes
the brief's §10 safety boundary on top of the existing tour-net guardrail.

This phase touches the orchestrator's final-answer synthesis and the
`AgentResponse` union — the same surface the *chatbot-latency* plan
(`plans/2026-07-13-fast-response-chatbot-lanes/`) branches on. Coordination note
in the plan-level Dependencies.

## Requirements

- **Functional**
  - Two new `AgentResponse` kinds: `continue_tour` and `cancel_tour`, mirroring
    `start_tour`'s shape (`{ type, tourId }`).
  - Frontend `useAgentChat` handles them: `continue_tour` →
    `TourControllerContext.start(tourId, resumeStep, 'chatbot')` using Phase 4's
    server-side resume step; `cancel_tour` → `skip()` + clear.
  - **Server-side tour registry**: the `tours.search` tool + the synthesis path
    resolve `tourId` against `TOUR_CATALOG` and **validate the user's role**
    before emitting any `*_tour` response. Unknown id or role mismatch → the
    response degrades to a text "Bạn không có quyền xem hướng dẫn này" / "Không
    tìm thấy hướng dẫn", never an emitted directive.
  - The orchestrator's tour-net guardrail (`synthesizeStartTourFromResponse`) is
    extended to also rewrite `continue`/`cancel` intent to curated tours — the
    model still cannot emit arbitrary tour content.
  - Hard guard: any model output containing `selector` or `javascript` keys, or
    a `tourId` not in `TOUR_CATALOG`, is dropped before it reaches the frontend
    (existing Zod parse + a new explicit registry check).
- **Non-functional**
  - No new external dependency.
  - The new response kinds are additive to the `AgentResponse` union; existing
    kinds unchanged.
  - All three tour responses carry `tourVersion` (from Phase 2) so the frontend
    can detect stale catalog vs server-progress mismatches.

## Architecture

```
shared/src/schemas/agent.ts                     # + continue_tour / cancel_tour response kinds
shared/src/tours/catalog.ts                     # already the registry (getTour + toursForRole)

backend/src/services/agent/tools/tours.ts       # expose listForRole (already) + assertCanRun
backend/src/services/agent/orchestrator.ts      # validate *_tour responses; tour-net extension
backend/src/services/agent/orchestrator.tours.test.ts  # new

frontend/src/hooks/useAgentChat.ts              # handle continue_tour / cancel_tour
frontend/src/context/TourControllerContext.tsx  # cancel() + chatbot triggerSource
```

### Safe directive contract (brief §10)

```ts
// The ONLY tour-related shapes the model may emit (all Zod-validated):
{ type: 'start_tour',    tourId, tourVersion }
{ type: 'continue_tour', tourId, tourVersion }
{ type: 'cancel_tour',   tourId, tourVersion }
```

Forbidden (dropped by the registry guard):
```ts
{ selector: '…' }                 // ❌ never
{ javascript: '…' }               // ❌ never
{ type: 'start_tour', tourId: 'invented-id' }   // ❌ not in catalog
{ type: 'start_tour' } // for a tour the user's role can't run  // ❌ role-denied
```

### Resolution flow (brief §10)

```
user: "Hướng dẫn tôi chốt chuyến này"
  → orchestrator resolves intent (tutorial.*)
  → tours.search → picks 'lock-trip-and-payment'
  → validateStartTour(user, tourId): registry.get(tourId) + role check
  → ok → emit start_tour { tourId, tourVersion }
  → frontend start(tourId, undefined, 'chatbot')
```

For `continue_tour`, the orchestrator additionally reads the user's
`user_onboarding_progress` (Phase 4) to attach the resume step — or instructs the
frontend to fetch it. Preference: the frontend fetches resume step via Phase 4's
`GET /api/onboarding/progress` on `continue_tour`, keeping the orchestrator
read-only and avoiding a new tool.

## Related Code Files

- **Modify** `shared/src/schemas/agent.ts` — add `continueTourResponseSchema`
  and `cancelTourResponseSchema` to the `AgentResponse` union (mirror
  `startTourResponseSchema`, add `tourVersion`).
- **Modify** `backend/src/services/agent/tools/tours.ts` — add
  `assertTourRunnable(user, tourId): Tour` (throws a `ToolError` on unknown id /
  role mismatch); the tool's description tells the model the available tours for
  the caller's role.
- **Modify** `backend/src/services/agent/orchestrator.ts`:
  - In `produceFinalAnswer` / the tour-net path, validate any `*_tour` response
    via `assertTourRunnable` before emitting; on failure, replace with a text
    response explaining the denial.
  - Extend `synthesizeStartTourFromResponse` → `synthesizeTourDirectiveFromResponse`
    handling `continue`/`cancel` intent keywords ("tiếp tục", "dừng", "thôi").
  - Add an explicit drop for any payload key in a denylist (`selector`,
    `javascript`, `css`) — defense-in-depth even though Zod already rejects.
- **Create** `backend/src/services/agent/orchestrator.tours.test.ts` —
  - role-mismatch degrades to text (no directive emitted);
  - unknown tourId degrades to text;
  - denylist keys are stripped;
  - `continue_tour` synthesizes from "tiếp tục hướng dẫn";
  - happy path emits the right typed response.
- **Modify** `frontend/src/hooks/useAgentChat.ts` — handle `continue_tour`
  (fetch resume step via Phase 4 client, then start) and `cancel_tour` (skip +
  clear progress cache).
- **Modify** `frontend/src/context/TourControllerContext.tsx` — expose
  `cancel()` (alias of `skip()` + clear) and ensure `start()` accepts the
  `triggerSource` param (also needed by Phase 6).
- **Modify** `frontend/src/components/agent/AgentAssistant.tsx` — register
  renderers for the two new response kinds (mirrors the existing
  `RESPONSE_RENDERERS['start_tour']`).

## Implementation Steps

1. Add the two response kinds to the `AgentResponse` union + Zod in shared.
2. Add `assertTourRunnable` to the tours tool; reuse `getTour` + `toursForRole`.
3. Wire the validation into the orchestrator's final-answer + tour-net path;
   replace invalid responses with a Vietnamese text denial.
4. Add the denylist strip (`selector`/`javascript`/`css`) as a belt-and-suspenders
   pass before emit.
5. Extend the synthesizer to recognize `continue`/`cancel` Vietnamese intent.
6. Frontend: handle the two new kinds in `useAgentChat`; render in
   `AgentAssistant`; wire `cancel()` + `triggerSource`.
7. Write the orchestrator tour tests (role denial, unknown id, denylist, intent
   synthesis, happy path).
8. Manual QA: as ACCOUNTANT, ask "hướng dẫn tạo chuyến" (a MANAGER-only tour) →
   get a polite denial, no tour; ask "tiếp tục hướng dẫn chốt chuyến" → resume;
   ask "dừng hướng dẫn" → tour cancels.

## Success Criteria

- [ ] `start_tour` / `continue_tour` / `cancel_tour` all type-check end-to-end
      (shared → backend → frontend).
- [ ] A role-mismatch tour request returns a text denial, never a directive
      (assert in test + manual QA).
- [ ] An invented `tourId` is rejected; a `selector`/`javascript` payload is
      stripped (assert in test).
- [ ] "Tiếp tục hướng dẫn …" resumes the tour from the server-persisted step
      (Phase 4); "dừng hướng dẫn" cancels it.
- [ ] Phase 5 analytics tag these as `trigger_source: 'chatbot'`.
- [ ] All tests green; no new dependencies.

## Risk Assessment

- **Risk:** Adding response kinds conflicts with the in-flight chatbot-latency
  plan's intent router (same `AgentResponse` union).
  **Mitigation:** additive kinds don't break existing union members; coordinate
  so the router treats `*_tour` as one intent bucket (noted in plan.md
  Dependencies). If the router lands first, this phase just adds cases.
- **Risk:** The model emits `continue_tour` for a tour the user never started
  (no progress row).
  **Mitigation:** the frontend's `continue_tour` handler treats a missing resume
  step as "start from 0" — equivalent to `start_tour`. Log it via Phase 5 as an
  anomaly signal.
- **Risk:** Over-aggressive tour-net rewriting turns legitimate non-tutorial
  answers into tours.
  **Mitigation:** the synthesizer only fires on explicit tutorial-intent signals
  (existing behavior, unchanged); the two new intent keywords ("tiếp tục"/"dừng")
  require an *active tour* context to rewrite, else they pass through as text.
