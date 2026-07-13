# HANDOFF — Task 4 Complete: P1 Intent Router & Lane 0

**Session:** 2026-07-13 (continuation)
**Plan:** `plans/2026-07-13-fast-response-chatbot-lanes/`
**Task completed:** P1 — Intent Router & Lane 0 (Navigation, 0 LLM)
**Previous tasks:** P0 ✅, P0.5 `final_schema` ✅, FAQ diagnosis ✅
**Next task:** P2 Knowledge & Lookup Lanes (doc-RAG + citations) OR P3 Daily Work Assistant

---

## What was done this session

Built and shipped the **headline architectural deliverable** of the entire plan: a deterministic intent router that resolves navigation requests with **ZERO LLM calls**. Production data validated this as the #1 lever — `ui.navigate` was the most-called tool (21/41 turns, every one paying for a full ReAct reasoning loop at ~15s each).

### Files created/modified (5)

**New:**
- **`backend/src/services/agent/intent-router.ts`** — pure, deterministic, synchronous `routeIntent(message, ctx)`. Classifies messages into Lane 0 (nav → directive, 0 LLM) or Lane 4 (react → orchestrator). Bidirectional Vietnamese diacritic-insensitive matching against PAGE_CATALOG titles + aliases + path basenames. Noise-word stripping + word-boundary token matching + bigram overlap scoring. Score threshold (70) prevents false positives.
- **`backend/src/tests/intent-router.test.ts`** — 36 golden test cases: 14 nav positives, 14 react negatives, 7 edge cases, 1 aggregate misroute-gate test.

**Modified:**
- **`backend/src/agentSocket.ts`** — wired the router between FAQ lane and orchestrator. On `lane='nav'`: emits a navigate directive with ack, persists via `recordNavTurn`, returns. On `lane='react'`: falls through unchanged. Gated by `config.agentIntentRouter`. Added `randomUUID` import + exhaustiveness fix on `renderResponseText`.
- **`backend/src/services/agent/orchestrator.ts`** — new exported `recordNavTurn()` (mirrors `recordFaqTurn`) that persists a Lane 0 turn with `intentBucket='nav'`, `reactIterations=0`, `model='intent-router'`, `navigateDirectiveEmitted=true`.
- **`backend/src/config/index.ts`** — new `agentIntentRouter` flag (default `true`, kill-switch via `AGENT_INTENT_ROUTER` env var).

### How it works

```
agent:chat
   │
   ▼
[FAQ fast lane] ──hit──► Lane 1 (0 LLM, existing)
   │miss
   ▼
[Intent Router] ◄── NEW
   │
   ├─ "mở trang công nợ" → extractPageQuery("trang công nợ")
   │    → findPageMatch → debt (score 95)
   │    → emit navigate directive + ack + persist
   │    → Lane 0, 0 LLM calls ✅
   │
   └─ "lợi nhuận tháng này?" → no nav verb + page match
        → Lane 4 → full ReAct loop (unchanged)
```

### Verification
- **Intent router tests:** 36/36 pass. 14 positive nav cases, 14 negative react cases (zero misroutes), 7 edge cases, misroute gate ≤10%.
- **Backend typecheck:** clean.
- **Full test suite:** 539 tests, **538 pass**, 1 fail (`pnl-invariant` — pre-existing, unrelated).
- **Zero regressions:** existing `agent-strip-think`, `agent-semantic-data`, `agent-orchestrator-metrics`, `final-schema-repro` all still pass.

### Expected production impact
- Navigation turns (the #1 intent at ~50% of traffic) now resolve in **<50ms** (deterministic match + directive emit + ack) instead of **~15-30s** (full ReAct loop with reasoning model).
- `intent_bucket='nav'` will appear on the dashboard intent-distribution panel (built in P0).
- A nav turn's metrics row shows: `react_iterations=0`, `tokens_in=0`, `tokens_out=0`, `model='intent-router'`, `intent_bucket='nav'`.

### What was NOT done (Lane 2 reserved)
Lane 2 (single-tool lookup, 1 fast-model call) is intentionally reserved. It requires the P0.4 model-tier spike to identify a genuinely fast non-reasoning model (all 3 current MiniMax models average ~15s). The router abstains to ReAct for all non-nav turns — correct behavior until Lane 2 is ready.

---

## Cumulative progress: 4 of ~12 tasks done (~33%)

| # | Task | Status | New tests | Key impact |
|---|------|--------|-----------|------------|
| 1 | P0 Instrumentation Baseline | ✅ | 5 | TTFT + intent_bucket columns, dashboard panels |
| 2 | P0.5 `final_schema` hotfix | ✅ | 18 | 27% error rate → <5%; saves ~5-16s/turn |
| 3 | FAQ diagnosis + content expansion | ✅ | 0 | Root-caused 0-hit issue; added 5 FAQs |
| 4 | **P1 Intent Router & Lane 0** | **✅** | **36** | **Nav turns: ~15-30s → <50ms (0 LLM)** |
| | **Total** | | **59 tests** | |

## Next task options

| Task | Why next | Effort |
|------|----------|--------|
| **P2 Knowledge & Lookup Lanes** | Doc-RAG over CONTEXT.md/ADRs + citations; extends the retrieval pipeline. Medium complexity. | M |
| **P3 Daily Work Assistant (Summary Lane)** | Role-aware "tóm tắt việc hôm nay" with parallel tool calls; most user-visible "fast assistant" win. | M |
| P0.3 MiniMax `<think>` stream-shape spike | Gates whether streaming stays on; quick investigation. | S |
| P0.4 model-tier spike | Unblocks Lane 2 (single-tool lookup with a fast model). | M |
| P4 Semantic Metric Layer | Large refactor; centralizes metric definitions. | L |
| P5 Governance, Scale & Evaluation | Provider failover, rate limiting, eval framework. | L |

**Recommended next:** P3 Daily Work Assistant — it's the most user-visible improvement (a daily summary that resolves in seconds instead of a 30s ReAct loop), and it builds on the routing infrastructure just shipped.
