# Plan — Reduce ReAct Chatbot Latency (perceived + actual)

**Status:** `pending approval` (ralplan consensus reached — Planner v3 after Architect ITERATE + Critic ACCEPT-WITH-RESERVATIONS; all reservations applied; awaiting user approval to execute)
**Date:** 2026-06-28
**Owner:** backend agent subsystem
**Target:** p50 ≤ 6 s, p95 ≤ 12 s, eliminate the >20 s tail (today: p95 ≈ 17 s, tail > 20 s)

> **Review log**
> - **Architect (ITERATE → accepted):** fixed model version (M2.1, not M2.7 — verified `models.ts:17`); reframed `MODEL_STRONG` (comment only, not an export — must be introduced + validated, not "wired"); pulled MiniMax streaming-shape (R1) spike into Phase 0; reframed Phase 1 as a shared-schema change to `agentEventSchema`; inverted §4.1 (2-call safe default, single-call = Phase 3 optimization); added Case-path instrumentation + per-phase correctness gates; acknowledged P2.2/P3.1 cannibalization; added streaming `<think>` token-delta risk.
> - **Rejected Architect claim:** that the "6-iter / 78s / 145k tokens" citation is missing — it IS at `models.ts:26-28` (verified); kept.
> - **Critic (ACCEPT-WITH-RESERVATIONS → consensus reached; no CRITICAL/MAJOR findings):** pinned the p95 baseline column (`latency_user_perceived_ms`); documented the `agentEventSchema` change as additive/non-breaking + shared-rebuild-before-backend deploy order; resolved the Step-A streaming-source ambiguity (stream the single Case-2 call's tokens live, not a finished message; ≤2 s TTFT scoped to ack/progress); added the `answer_chunk` emit mechanism; added P1.4 streaming kill-switch; added the P2.1 ≤10% misroute-rate gate; anchored the mid-stream abort-semantics test. Deferred to spikes (correctly): MiniMax `stream:true` shape (P0.3), P4.1 cache-invalidation surface.

---

## 1. Problem (evidence-backed, code-verified)

A bot turn is a **sequential chain of LLM calls** to a reasoning model (`MiniMax-M2.1-highspeed`, `models.ts:17`), plus tool/DB work between them. Wall-clock ≈ `(iterations + final calls) × per-call reasoning latency`.

- ReAct loop: up to `AGENT_MAX_ITERATIONS = 4` — `orchestrator.ts:386`; cap rationale + the recorded prod datapoint ("a 6-iter turn hit 78 s / 145 k prompt tokens") at `models.ts:26-30`.
- Final answer is already branched into **3 cases** the Planner must thread any streaming redesign through (`orchestrator.ts:610-635`):
  - **Case 1** — last loop turn already emitted valid structured JSON → `produceFinalAnswer` direct-parse, **0 extra calls** (the existing P1 gate).
  - **Case 2** — no data tool used, prose-style answer → 1 prose/streamed call.
  - **Case 3** — data tools used, model must synthesize a structured `insight_card` → 1 structured call (`+1`), `+1` prose fallback worst case (`orchestrator.ts:773-879`).
- Each call: full reasoning model, `reasoning_split: true` (moves CoT out of billable content, **not** out of wall-clock) — `minimax.client.ts:120-127`.
- Each iteration re-bills the **growing** context; `trimToolHistory` (`orchestrator.ts:1229`, 24k-char budget) trims *old tool results* but **not** the system prompt (`buildSystemPrompt`, ~4–5 kB of rules + `RESPONSE_SHAPE_HINT` + examples) or tool schemas (`toolsToMiniMax`) — those re-bill on every call regardless of trimming.
- Non-streaming: `callMiniMax` does `await res.json()`; one terminal `done` frame per turn — `minimax.client.ts:187`, `agentSocket.ts:218-230`.
- The shared event contract `agentEventSchema` (`shared/src/schemas/agent.ts:316-356`) is a **closed discriminatedUnion of exactly 5 variants** (`tool_start`, `tool_result`, `directive`, `done`, `error`). There is **no `thinking` and no token-stream event** — adding either is a coordinated shared→backend→frontend schema change, parsed on both sides (`useAgentChat.ts:97-188` exhaustive switch; `AgentAssistant.tsx` dispatches on `response.type`).
- `MODEL_STRONG` is **only a comment** (`models.ts:10-14`), not an exported constant — tiering means *introducing + validating* a new model, not wiring an existing one.

**Root cause:** the >20 s tail is multi-iteration Case-3 analytical turns where sequential reasoning calls + context growth + occasional card-schema fallback stack. Already mitigated (do NOT redo): cap 6→4, Case-1 direct-parse gating, `reasoning_split`, `jsonrepair`, `compactToolResult`, `salvageText`, concurrent read-only tools (P1.3), `trimToolHistory`, token-attribution logging.

**Industry guidance (user-supplied):** "a 10–12 s agent feels broken unless it streams or breaks work into visible steps"; "industry treats long ReAct latency as a product/orchestration problem, not just a model problem"; recommended architecture = acknowledge instantly → stream progress → ReAct backend → stream final answer when ready; fast fallback model for short replies + slower model only for deep reasoning. *(Note: this is a stakeholder preference that strongly favors perceived-latency-first; Phase 0 will confirm with data.)*

---

## 2. RALPLAN-DR summary

### Principles (5)
1. **Perceived latency (TTFT) > total for a chat UI.** Streaming + visible progress is the highest-leverage fix. A streamed 12 s turn feels fine; a 12 s blank pause feels broken.
2. **Cut sequential reasoning calls.** The N+1 structure is the root actual-latency cost — collapse simple paths and tier models.
3. **Never regress correctness/safety.** v1 is read-only; keep JSON validation, the `finish_reason='length'` truncation guard, fallback paths, and the event-contract invariants. Streaming must not break the `insight_card` schema contract. **Every phase carries a correctness gate.**
4. **Measure every change** — including *which Case path* fired. No change ships without before/after numbers.
5. **Stage by ROI.** Perceived-latency wins first, actual-latency second, tail/conversation third.

### Decision Drivers (top 3)
1. The "10–12 s feels broken" threshold → streaming + progress is **mandatory** for acceptable UX (stakeholder mandate).
2. Reasoning-model per-call wall-clock × N calls is the dominant actual-latency cost.
3. The final-answer path is already branched (Cases 1/2/3) — so perceived-latency wins can be captured **incrementally per case**, de-risking Phase 1.

### Viable options
- **Option A — Product/orchestration first:** streaming + progress + intent fast-path. Biggest perceived win; modest actual win. Medium effort.
- **Option B — Model/token first:** model tiering + context diet + caching. Biggest actual win; no perceived win (still a blank pause); high effort + high-risk spike.
- **Option C — Hybrid, staged (RECOMMENDED):** A first (perceived), then B (actual), then tail.

**Why C over A alone:** A leaves the >20 s analytical tail intact in total time (just hides it). **Why C over B alone:** B still produces a blank 8–12 s pause until every lever lands (high effort/risk). C delivers acceptable UX in Phase 1 and compounds gains after. **Architect steelman noted:** C optimizes the *demo/first-turn*, B optimizes the *long session* (system prompt + schemas re-bill every call regardless of streaming). C's ordering is preference-driven (stakeholder) until Phase 0 confirms whether perceived-spike or total-floor pain dominates real usage — so Phase 0 can **reorder** C if data says so.

---

## 3. The plan (staged)

### Phase 0 — Measure + spike (gate; blocks Phase 1 streaming & Phase 3 tiering)
- **P0.1 Live metrics pull** from prod `agent_turn_metrics`: p50/p95/p99, turns >20 s, mean `latency_llm_ms` vs `latency_tools_ms` vs `latency_ack_ms`. **Pin the baseline column:** the "p95≈17 s" figure is `latency_user_perceived_ms` (the user-facing end-to-end), reported separately from `latency_total_ms` (LLM+tools+final, excludes ack/persist) — fix this now so post-Phase-1 perceived-vs-total splits aren't apples-to-oranges.
- **P0.2 Case-path instrumentation.** Record which of the 3 final-answer paths (`orchestrator.ts:610-635`) fired per turn + add a `latency_first_token_ms` metric. **Without this, the Phase 0 decision gate cannot answer its own question.**
- **P0.3 MiniMax streaming-shape spike (R1 — pulled forward from Phase 3).** Confirm `stream: true` yields OpenAI-shaped SSE `data:` chunks on `api.minimax.io`; critically, determine whether streamed chunks carry `<think>` content mid-stream — `stripThink` (`minimax.client.ts:94`) only cleans **complete** strings, not token deltas, so raw deltas could render reasoning to the user. This **blocks P1.3 design**.
- **P0.4 Model-tier spike (for Phase 3).** Benchmark a fast non-reasoning MiniMax line vs M2.1-highspeed at equal prompt size: tool-call reliability (≥20 representative intents incl. multi-tool `data.search`+`data.detail`), `insight_card` schema-conformance, wall-clock, and `<think>` behavior in streaming mode.
- **Decision gate:**
  - If Case-1/Case-2 (simple/nav/prose) dominate **volume** → Phase 2 intent fast-path is highest ROI.
  - If Case-3 analytical turns dominate the **>20 s tail** → Phase 3 tiering is highest ROI (and P2.2/P3.1 cannibalization — see §4.5 — decides whether tiering still pays after iteration reduction).

### Phase 1 — Perceived latency (do first; biggest UX win)
**Reframe (Architect):** this is a **shared-schema change**, not backend-only. Sub-tasks:
- **P1.0 Extend `agentEventSchema`** (`shared/src/schemas/agent.ts:316`) with `thinking` and `answer_chunk` variants; update the `useAgentChat.ts:97-188` exhaustive switch; add a streaming-text-bubble render state in `AgentAssistant.tsx`. Cross-package (shared→backend→frontend). **This change is additive and non-breaking:** the switch has no `default`, so a new backend emitting `thinking`/`answer_chunk` to an older frontend silently drops them (no crash), and an old backend never emits them. **Deploy order:** `@tingting/shared` must be rebuilt (`dist/`) and shipped **before** the backend (which imports shared from `dist/`) — a backend-only deploy without the shared rebuild would silently fail to validate the new events.
- **P1.1 Acknowledge instantly.** Emit `thinking` on socket receive, before any LLM call. Kills the blank pause. (`agentSocket.ts`)
- **P1.2 Surface tool-step progress.** `tool_start` events already fire — render them as a live checklist ("Đang tìm dữ liệu…", "Đang tính toán…"). Low effort, high perceived win.
- **P1.3 Stream the final answer — staged per Case (Architect Step-A/Step-B synthesis):** streaming = new `emit({event:'answer_chunk',...})` calls inside the orchestrator, surfaced via the existing `emit` sink → `agentSocket.ts:204-230` (`socket.emit`); the terminal `done` still carries the final structured `response`.
  - **Step A (ship first, zero call-count cost, no schema-streaming problem):** Case-2 turns make **exactly one** prose-producing LLM call — switch THAT call to `stream: true` and emit its tokens live as `answer_chunk`. This is a real **TTFT-vs-completion** win (user sees the first token when the model starts generating, not after the whole response finishes) at **zero extra calls**. *(Clarifies the prior ambiguity: we stream the single Case-2 call's deltas as they arrive — we do NOT stream an already-finished message, which would give only a typewriter effect.)* The "TTFT ≤ 2 s" acceptance below is scoped to the P1.1/P1.2 instant-ack + tool-progress rendering; first-prose-token for Case-2 is bounded by that one call's own TTFT (a reasoning model may exceed 2 s to first token — still far better than waiting for full completion).
  - **Step B (Case 3 analytical):** settle single-call-vs-2-call via the P0.3/P0.4 spike, then ship. **Default = 2-call** (streamed brief prose, then structured `done.response`); single-call "prose + delimited JSON" is an optimization to prove, not assume (see §4.1).
- **P1.4 Ship behind a kill-switch.** All streaming changes (P1.1–P1.3) gate on a new `AGENT_STREAMING_ENABLED` flag (precedent: `agentNavigateGuardrail` at `config/index.ts:91`, plus `BOT_ENABLE`). If streaming destabilizes the bot (this codebase has a history of bot-breaking regressions — see `[[agent-bot-think-parse-bug]]`), flip the flag to fall back to the current non-streaming terminal-`done` path without a redeploy.
- **Acceptance (Phase 1):** TTFT ≤ 2 s on 95% of turns (blocked-on-P0.2 TTFT metric; scoped to P1.1/P1.2 ack+progress per Step A); `tool_start`/`thinking` rendered within 1 s; **correctness gate: no increase in `fallbackUsed` rate and no decrease in navigate-compliance (`navigateDirectiveEmitted`/`guardrailFired`) vs Phase-0 baseline.**

### Phase 2 — Collapse call count (actual latency)
- **P2.1 Intent fast-path.** Before the reasoning loop, a cheap classifier (deterministic keyword/route match first — extend `synthesizeNavigateFromProse` / `matchRoute`; fall back to one non-tool, low-max-tokens call) routes pure-navigation → directive (0 loop calls), "start tour" → `tours.search`+`start_tour` (0 loop calls), simple factual → single `data.search/detail` + 1 streamed answer. Misroute falls through to the full loop (correctness preserved). **Classifier gate:** ≤ 10% misroute rate on a 50-intent labeled set (misroute = a fast-path answer that contradicts what the full loop would have returned); the "≥50% of turns in ≤1 call" acceptance is measured only on correctly-routed turns so it can't be gamed by over-routing.
- **P2.2 Dynamic iteration budget.** `AGENT_MAX_ITERATIONS` becomes intent-dependent: 1–2 for detected-simple, 4 for analytical. Prevents simple-case over-iteration.
- **Acceptance (Phase 2):** ≥50% of turns (simple/nav bucket) complete in ≤ 1 LLM call; p50 ≤ 6 s; **correctness gate as above.**

### Phase 3 — Per-call cost (actual latency, the >20 s tail)
- **P3.1 Model tiering.** Use a fast non-reasoning MiniMax line for tool-selection iterations + simple answers; reserve the reasoning model for final analytical synthesis. **Introduces a `MODEL_STRONG` constant** (currently only a comment, `models.ts:10-14`) and validates the new line against the existing tool-calling + `json_object` surface — gated on P0.4. **Priority is contingent on Phase 0:** see §4.5 cannibalization — if P2.2 reduces simple-case iterations to 1–2, P3.1's per-iteration win is confined to Case-3 analytical turns; if those are a small share of the >20 s tail, P3.1 drops below P4.
- **P3.2 Context diet.** Act on token-attribution: lazy-load only intent-relevant tool schemas (`toolsToMiniMax`), trim the system prompt (move examples to conditional few-shot). Attacks the per-call floor that streaming cannot (Architect's long-session steelman).
- **Acceptance (Phase 3):** mean per-call `latency_llm_ms` ↓ ≥ 30% at equal prompt size; p95 ≤ 12 s; >20 s tail <1% of turns; **correctness gate: schema-conformance rate holds vs baseline.**

### Phase 4 — Tail / conversations (lower priority)
- **P4.1 Tool-result caching.** Short-TTL memo on read-only `data.*` within a session; cache directive resolution. Invalidate on trip/financial mutations — must never show stale P&L/debt.
- **P4.2 Async job pattern (optional).** Formalize acknowledge→background→notify with a job queue only if Phase 1–3 don't clear the threshold.

---

## 4. Key tradeoff tensions (resolved/inverted per Architect)

1. **"Brief first, detailed later" vs "cut sequential calls" (Principle 1 vs 2) — INVERTED.** The structured `insight_card` is JSON and cannot be partially rendered; to stream a brief FIRST you either (a) stream the single structured call's tokens (JSON can't render mid-flight; model emits summary-then-widgets in non-guaranteed order) or (b) make a SEPARATE brief-prose call (+1, violates Principle 2). **Resolution:** 2-call is the **safe default** (correct-by-construction; prose streams first so perceived latency still wins); single-call "prose + `<<CARD>>`-delimited JSON" is a **Phase 3 optimization** to prove via spike — `parseAgentResponseContent` (`orchestrator.ts:893-909`, already does stripThink→extractFirstJsonObject→jsonrepair→Zod) is parsing-ready, but model reliability of emitting the delimiter mid-stream is unverified.
2. **Streaming JSON is fragile** → that's why Step A streams Case-2 prose (text) and Case-3 emits the card as a completion event, not a token stream.
3. **Streaming `<think>` token-delta risk (Architect).** If P0.3 shows MiniMax streams `<think>` chunks, raw token deltas could render reasoning to the user; `stripThink` cannot clean deltas. Mitigation: buffer + clean on sentence boundaries, or stream only after the model's CoT completes — to be settled in P0.3 before P1.3 Step B ships.
4. **Model-tiering fallback risk.** A cheaper non-reasoning model may mis-select tools / fail the strict card schema → higher fallback rate could *increase* total calls (card→salvage→prose), regressing actual latency. Mitigation: keep the reasoning model for final synthesis; gate on fallback-rate (P0.4).
5. **P2.2 / P3.1 cannibalization (Architect).** If P2.2 cuts simple-case iterations to 1–2, P3.1's per-iteration-call win shrinks to Case-3 analytical turns only. P3.1 priority is therefore **contingent on Phase 0's analytical-turn volume**.
6. **Abort semantics under streaming.** Mid-stream client disconnect must stop reading the MiniMax body, clean up the half-rendered bubble, and decide on the metrics row — acceptance must cover this (not just latency).

---

## 5. Verification
- Every phase ships with before/after `agent_turn_metrics` (p50/p95/p99 + TTFT + Case-path).
- **Per-phase correctness gates** (every phase): no increase in `fallbackUsed`; no decrease in navigate-compliance; schema-conformance rate holds; streaming abort semantics tested.
- Tests: SSE chunk parsing in `callMiniMax`; `<think>`-delta cleaning; intent fast-path misroute→full-loop (incl. the ≤10% misroute-rate gate on the labeled set); `agentEventSchema` new-variant round-trip (shared, incl. old-client backward-compat); streaming-bubble render + promote-to-structured (frontend); the streamed final-answer protocol golden contract; **abort-semantics test** (mid-`answer_chunk` client disconnect stops reading the MiniMax body, drops the half-rendered bubble, and writes a metrics row with `aborted=true`).

## 6. ADR
- **Decision:** Stage C — perceived-latency first (Phase 1 streaming + progress, Step-A Case-2 prose first), then collapse calls (Phase 2 fast-path), then per-call cost (Phase 3 tiering + diet, contingent on Phase 0).
- **Drivers:** "feels broken >10–12 s" stakeholder mandate; N+1 reasoning calls dominate; final-answer path already branched per Case so wins are incremental.
- **Alternatives:** A alone (hides but doesn't fix total time); B alone (still blank-pauses; high-risk spike blocks value).
- **Why chosen:** Delivers acceptable UX in Phase 1, compounds actual-latency gains after; each phase independently valuable + measurable; Phase 0 can reorder if data contradicts the perceived-first preference.
- **Consequences:** Streaming = shared-schema (3-package) + render-state work; single-call streaming + model tiering are bets gated behind P0.3/P0.4 spikes.
- **Follow-ups:** P0 gates P1.3/P3.1; P4 caching/async only if tail persists.
