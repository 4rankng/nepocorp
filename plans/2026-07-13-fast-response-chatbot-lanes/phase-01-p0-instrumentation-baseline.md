---
phase: 1
title: "P0 — Instrumentation Baseline"
status: pending
priority: P1
effort: "S (1–2 engineer-weeks)"
dependencies: []
---

# Phase 1: P0 — Instrumentation Baseline

## Overview

Establish the measured baseline before any optimization. The HLD's directive #7 is explicit: *"Do not optimize prompts before measuring production telemetry."* Today the codebase already captures per-stage latency (`agent_turn_metrics`) but is missing two columns the rest of this plan depends on: **TTFT** and **intent bucket**. This phase adds them, pulls the baseline, and resolves the model-tier/streaming spikes that gate P1.

> **De-duplication note:** the repo's `docs/plans/chatbot-latency-reduction.md` already scopes the TTFT column (its P0.2) and the MiniMax stream-shape spike (P0.3) and model-tier spike (P0.4). This phase executes those specific items. Do not re-spec them — implement them and record the results here.

## Requirements

- **Functional:** Every chat turn records TTFT and which lane handled it (or `react_fallback`).
- **Non-functional:** Zero behavioral change to user-visible answers (dark launch only).

## Architecture

Two new columns on `agent_turn_metrics` + one new measurement point in the orchestrator. The streaming code path already exists (`openai-runner.ts` SSE) — the gap is *when* we stamp the timestamp.

```
agentSocket.ts (RUN_STARTED) ──► emit accepted (existing)
                                  │
orchestrator.ts (first TEXT_MESSAGE_CONTENT | first tool result)
                                  │
                                  └─► stamp latency_first_token_ms  ◄── NEW measurement point
```

`intent_bucket` is set at dispatch time and persisted at turn end. Until P1 builds the router, every non-FAQ turn is `bucket = 'react_fallback'` and FAQ turns are `bucket = 'faq'` (already distinguishable via `fastLane` on `RUN_FINISHED`).

## Measured Production Baseline (pulled 2026-07-13 from `nepo.tingting.vip`)

**Sample size honesty:** n = 41 turns all-time (8 in the last 7 days), 3 distinct users, 7 conversations. This is a **pilot**, not production-scale — percentile figures are statistically fragile but directionally decisive. Re-pull after P0 ships to grow the sample.

### Latency (perceived, `latency_user_perceived_ms`)

| p50 | p90 | p95 | p99 / max | mean |
|-----|-----|-----|-----------|------|
| 20.7s | 36.7s | **56.2s** | **78.5s** | 22.4s |

**This confirms the HLD's cited figures are current, not stale** — and is materially worse than the "p95 ≈ 17s" in `docs/plans/chatbot-latency-reduction.md`. The latency problem is severe and validates this plan's sequencing.

### Per-stage breakdown (avg / p95)

| Stage | avg | p95 |
|-------|-----|-----|
| LLM (`latency_llm_ms`) | 14.9s | **29.1s** |
| Final answer (`latency_final_ms`) | 7.3s | — |
| Tools (`latency_tools_ms`) | 130ms | 646ms |
| Ack (`latency_ack_ms`) | 137ms | — |
| Persist (`latency_persist_ms`) | 23ms | — |

**LLM time dominates absolutely.** Tools/ack/persist are negligible (<1s combined). The entire latency budget is reasoning-model calls.

### Iterations vs latency/tokens

| iters | n | avg latency | avg tokens_in | avg tokens_out |
|-------|---|-------------|---------------|----------------|
| 1 | 10 | 8.2s | 10,090 | 338 |
| 2 | 14 | 19.8s | 24,898 | 934 |
| 3 | 7 | 30.2s | 33,727 | 1,569 |
| 4 | 8 | 29.8s | 47,091 | 1,489 |
| 6 | 2 | **55.7s** | **121,917** | 2,301 |

**Each iteration ≈ +7–10s and the token bill grows near-linearly** (10k → 122k from 1 to 6 iters). Context is re-billed every iteration. Collapsing iteration count (P1 intent router) is the highest-leverage lever.

### Reliability findings (URGENT — separate from latency)

| Signal | Value | Implication |
|--------|-------|-------------|
| **Error rate** | **16/41 = 39%** | Nearly 4 in 10 turns error out |
| `final_schema` errors | 11 (27%), avg **27.9s** wasted | Top error — model runs full loop then fails JSON final-answer validation (orchestrator `produceFinalAnswer` Case-3). Burns ~28s before fallback. |
| `tool` errors | 5 (12%), avg **42.5s** wasted | Tool failures waste the most time per turn |
| `fallback_used` | 16/41 = 39% | Correlated with errors; final-answer fallback path fires often |
| `data.aggregate` failures | 3/5 = **60%** | A specific tool with a broken schema/args path — quick win |
| `ui.open` failure | 1/1 = 100% | Only one page registers `useAgentOpenable` (DebtDetailPage) — matches HLD §17 gap #11 |

**These reliability issues are arguably more urgent than latency.** A `final_schema` fix (loosen/repair the final-answer schema, or skip Case-3 shaping for low-confidence turns) could recover 27% of errored turns *and* save ~28s each. Consider a **P0.5 hotfix** before P1.

### Intent / lane coverage (today)

- **`ui.navigate` is the most-called tool (21 calls)** → navigation is the #1 intent, and every one paid for a ReAct loop. **Directly validates P1 Lane 0** (0-LLM navigation).
- **FAQ fast lane: 0 hits ever.** All 41 turns have `react_iterations ≥ 1` (no 0-iteration turns exist), meaning the FAQ fast lane has **never intercepted a production turn** despite 30 active FAQ entries. Either FAQ content doesn't match real questions, the thresholds (score floor 0.40 / margin 0.12) are too strict, or users don't ask FAQ-shaped questions. **P2 must investigate this before building doc-RAG on top of a non-firing retrieval path.**
- `guardrail_fired = 0` → the A3 navigate guardrail never triggers (navigation resolved via `ui.navigate` tool calls, not prose). P1 Lane 0 wraps the tool path, not the guardrail.

## Related Code Files

- **Modify:** `backend/src/db/schema.ts` — add `latency_first_token_ms integer` and `intent_bucket text` to `agent_turn_metrics` (lines ~1148–1181).
- **Create:** `backend/drizzle/00XX_agent_metrics_intent_ttft.sql` — migration for the two columns.
- **Modify:** `backend/src/services/agent/orchestrator.ts` — stamp TTFT on first streaming delta (near line 442 `TEXT_MESSAGE_CONTENT` emit) and on first tool result (line ~565); pass `intent_bucket` into `persistTurn` (line ~1409).
- **Modify:** `backend/src/routes/admin-chatbot-metrics.ts` — surface TTFT p50/p95/p99 and `intent_bucket` distribution in `/metrics` and `/metrics/latency` (line ~211 TODO for per-tool p95 is adjacent but separate — leave it).
- **Modify:** `shared/src/schemas/chatbot-metrics.ts` — add the two fields to response types.
- **Modify:** `frontend/src/pages/ChatbotMonitoringPage.tsx` — add a TTFT panel and an intent-distribution panel.

## Implementation Steps

> **Step 4 (baseline pull) is largely DONE** — the measured production numbers above were pulled 2026-07-13. Remaining baseline work: the two columns below don't exist yet, so TTFT and `intent_bucket` distributions can't be measured until steps 1–3 ship. Re-pull the full baseline (including the new columns) after step 7, on a larger sample.

0. **(NEW — P0.5 hotfix) `final_schema` error recovery** — 27% of turns error here at ~28s each. Investigate `produceFinalAnswer` Case-3 in `orchestrator.ts` (~line 704): either loosen the schema, improve `jsonrepair` coverage, or for low-confidence analytical turns skip shaping and return prose. This is the single highest ROI fix available and is independent of P1.
1. **Migration** — `pnpm db:generate` then add the two nullable columns; backfill existing rows to `intent_bucket = 'unknown'`.
2. **TTFT stamp** — in `orchestrator.ts`, capture `performance.now()` at (a) first `TEXT_MESSAGE_CONTENT` emit and (b) first `ToolResult` resolution, whichever is earlier; subtract turn start; store in the metrics accumulator (already plumbed near line 809–849).
3. **Intent bucket plumbing** — extend the metrics accumulator with a `bucket` field defaulting to `'react_fallback'`; set `'faq'` when `tryFaqFastLane` hits (the `agentSocket.ts:222` path).
4. **Baseline pull** — ✅ partially complete (see "Measured Production Baseline" above). Re-pull with the new columns post-deploy; record updated numbers in `docs/plans/chatbot-latency-reduction.md`.
5. **MiniMax stream-shape spike (P0.3)** — confirm whether MiniMax emits `<think>` tokens in the stream and whether they leak to the client; document the result. This gates whether streaming can stay on for prose answers (P1 depends on it).
6. **Model-tier spike (P0.4)** — benchmark a fast non-reasoning model (e.g. `deepseek/deepseek-v4-flash` already wired via OpenRouter, or a MiniMax fast variant) for tool-selection accuracy on a 20-case probe set. Record fallback rate. This gates whether P1 can route simple lookups to a fast model. **Note: the three MiniMax models in rotation (M2.1/M2.5/M2.7) all average ~15s LLM time — none are fast; a genuinely different tier is needed.**
7. **Dashboard** — wire TTFT + intent panels; verify the dashboard renders with real data.

## Success Criteria

- [ ] `agent_turn_metrics` has `latency_first_token_ms` and `intent_bucket` columns, deployed.
- [ ] Baseline p50/p95/p99 + TTFT + iteration/token distributions documented (numbers, not estimates) in `docs/plans/chatbot-latency-reduction.md`.
- [ ] MiniMax stream-shape spike result documented (`<think>` leak: yes/no + mitigation).
- [ ] Model-tier spike result documented (fast-model fallback rate on probe set).
- [ ] `ChatbotMonitoringPage` shows TTFT and intent panels with live data.
- [ ] No user-visible behavior change (dark launch confirmed by parity of answer shapes).

## Risk Assessment

- **Spikes block P1.** If the model-tier spike shows >15% fallback, P1 Lane 2/3 cannot use a fast model — fall back to routing lookups through the existing reasoning model with a single-call budget instead. Document and proceed; do not let P1 stall.
- **TTFT measurement skew** if the JSON-probe suppression path (orchestrator ~line 423) buffers the first token. Handle both the prose-stream and JSON-suppress paths explicitly.
