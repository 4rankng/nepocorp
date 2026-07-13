---
phase: 2
title: "P1 — Intent Router & Lane 0/1 Fast Path"
status: pending
priority: P1
effort: "M (2–4 engineer-weeks)"
dependencies: [1]
---

# Phase 2: P1 — Intent Router & Lane 0/1 Fast Path

## Overview

Build the **intent router** — the single highest-leverage change in the plan. Today every non-FAQ message pays for a full ReAct reasoning round-trip, even pure navigation ("mở công nợ"). This phase inserts a deterministic router between the FAQ fast lane and the orchestrator that collapses Lane 0 (navigation) and Lane 2 (single-tool lookup) to zero or one cheap calls.

This is the realization of the HLD §5 ordering: **deterministic rules → FAQ → (small classifier) → ReAct**.

## Requirements

- **Functional:** Recognize navigation intent and resolve it via `routeMatcher` + `PAGE_CATALOG` → emit a `navigate`/`focus` directive directly, **0 LLM calls**. Recognize single-entity lookup and route to one `data.detail`/`data.aggregate` call + a fast synthesis pass.
- **Non-functional:** Misroute rate ≤ 10% (gate). Below-confidence → fail-open to ReAct (correctness preserved). Every routing decision logged to `intent_bucket`.

## Architecture

```
agent:chat
   │
   ▼
[FAQ fast lane]  ──hit──►  Lane 1 (existing)            0 LLM
   │miss
   ▼
[Intent Router]  ◄── NEW: backend/src/services/agent/intent-router.ts
   │
   ├─ deterministic rules ──► Lane 0: resolve via routeMatcher → directive   0 LLM
   ├─ deterministic rules ──► Lane 2: one data.* call + fast synthesis        1 call (fast model)
   ├─ (optional) classifier ─► ambiguous → Lane 2/3                          1 call (fast model)
   └─ else ─────────────────► Lane 4: orchestrator.runAgent (ReAct)          N calls (reasoning)
```

The router is **deterministic-first**, mirroring `faq-fast-lane.ts`'s philosophy. A small classifier model is *optional* and only invoked when deterministic rules abstain with medium confidence — the P0.4 spike result decides whether to enable it.

### Lane 0 navigation rules (deterministic)

Leverage what already exists:
- `backend/src/services/agent/routeMatcher.ts` — path → `{routeKey, params}` resolution.
- `shared/src/navigation/pageCatalog.ts` — `PAGE_CATALOG` with per-entry `agent` metadata.
- `backend/src/services/agent/tools/ui.ts` — already emits `navigate`/`focus` directives.
- The **A3 guardrail** (`orchestrator.ts:236` `synthesizeNavigateFromProse`) already does prose→directive rewriting *post-hoc* — Lane 0 promotes that logic to a *pre-LLM* deterministic path using Vietnamese keyword matching against `PAGE_CATALOG` titles/aliases (Vietnamese diacritic-stripped via the existing `text.ts:normalizeText`).

### Lane 2 lookup rules

Match against `semantic-data.service.ts` entity aliases (the gateway already maintains Vietnamese aliases like "chuyen"→trips, "khach"→customers). If the message resolves to a single entity + identifier with high lexical confidence, run exactly one `data.detail`/`data.aggregate` call and synthesize a one-paragraph answer with the **fast model** (P0.4 result permitting). Anything multi-entity, comparative, or "why/tại sao" → Lane 4.

## Related Code Files

- **Create:** `backend/src/services/agent/intent-router.ts` — `routeIntent(ctx, message): Promise<RouteDecision>` where `RouteDecision = { lane: 'nav'|'lookup'|'react'|'abstain', directive?, toolCall?, confidence, reason }`.
- **Modify:** `backend/src/agentSocket.ts` — insert `routeIntent` after FAQ abstain (near line 222), before `runAgent`. Wire `intent_bucket` from the decision.
- **Modify:** `backend/src/services/agent/orchestrator.ts` — accept an optional pre-resolved `lookupToolCall` for Lane 2 so it skips the ReAct loop and runs one call + synthesis.
- **Modify:** `shared/src/schemas/agent.ts` — add `RUN_FINISHED.metrics.lane` (or reuse a metrics field) so the client can show a subtle provenance badge (FAQ / fast / agent).
- **Reuse (do not modify):** `routeMatcher.ts`, `text.ts`, `tools/ui.ts`, `tools/data.ts`, the existing `navigate`/`focus` directive emission.
- **Create:** `backend/src/tests/intent-router.test.ts` — golden navigation/lookup/abstain cases.

## Implementation Steps

1. **Build `intent-router.ts`** with a pure, testable `routeIntent(ctx, message)` function. Deterministic only in step 1.
   - Lane 0 rules: normalize message; match against `PAGE_CATALOG` `agent.title`/`agent.aliases` + open-verb set (`mở`/`vào`/`đi tới`/`take me to`). On match → return `{lane:'nav', directive: {kind:'navigate', routeKey, params}}`.
   - Lane 2 rules: detect single-entity reference via `semantic-data.service.ts` alias map + an identifier pattern. On match with a clear identifier → return `{lane:'lookup', toolCall}`. On ambiguity → abstain.
   - Default → `{lane:'react'}`.
2. **Wire into `agentSocket.ts`** behind a config flag `config.agentIntentRouter` (kill-switch, mirroring `agentNavigateGuardrail`). On `lane==='nav'` → emit `RUN_FINISHED` with the directive directly (no orchestrator call). On `lane==='lookup'` → call a new `runLookup` path in the orchestrator.
3. **Add `runLookup`** to `orchestrator.ts`: execute the pre-resolved tool call, then one fast-model synthesis pass (P0.4 model) producing a `text` response. No ReAct loop.
4. **Optional classifier** — only if P0.4 fallback rate is acceptable. Add a `routeIntentClassifier` step that fires when deterministic rules return `abstain` with medium confidence. Keep behind `config.agentIntentClassifier`.
5. **`intent_bucket`** values: `faq`, `nav`, `lookup`, `summary` (P3), `react_fallback`. Persist on every turn.
6. **Tests** — golden set: ≥20 nav cases (positive + negative), ≥10 lookup cases, ≥10 abstain cases. Assert misroute ≤ 10% on the set.
7. **Dark launch → measure → enable** — ship behind the flag off, measure `intent_bucket` distribution in shadow (route decided but not acted on), then flip on per role.

## Success Criteria

- [ ] `intent-router.ts` ships behind `agentIntentRouter` flag; deterministic Lane 0 + Lane 2 paths work.
- [ ] Misroute rate ≤ 10% on the golden set (measured, not estimated).
- [ ] `intent_bucket` populated on 100% of turns.
- [ ] Lane 0 turns (navigation) show **0 LLM calls** in `agent_turn_metrics` (`react_iterations = 0`, `tokens_in/out = 0`).
- [ ] Lane 2 turns (lookup) show **≤1 LLM call** and resolve ≥40% faster than `react_fallback` median.
- [ ] ≥40% of all turns resolve in Lane 0–2 (no reasoning model) — read from `intent_bucket` distribution post-launch.
- [ ] No regression in answer correctness (golden Q/A set still green).

## Risk Assessment

- **Misroute → wrong/empty answer** is the primary risk. Mitigations: ≤10% gate; fail-open to ReAct below confidence threshold; `intent_bucket` audit lets us watch for systematic misroutes; kill-switch flag.
- **Router latency becomes the new floor.** Mitigation: deterministic rules are microsecond-scale; the optional classifier is only on the ambiguous tail and has its own budget (e.g. 800 ms hard cap, abstain → ReAct on timeout).
- **`<think>` token leak** in Lane 2 fast-model streaming — gated by the P0.3 spike result; if it leaks, suppress streaming for Lane 2 and deliver whole.
