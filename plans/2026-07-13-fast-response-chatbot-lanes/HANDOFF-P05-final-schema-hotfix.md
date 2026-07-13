# HANDOFF — Task 2 Complete: P0.5 `final_schema` Error Hotfix

**Session:** 2026-07-13 (continuation)
**Plan:** `plans/2026-07-13-fast-response-chatbot-lanes/`
**Task completed:** P0.5 — `final_schema` error hotfix
**Previous task:** P0 Instrumentation Baseline (complete — see `HANDOFF-P0-instrumentation.md`)
**Next task:** Diagnose dead FAQ fast lane (0 hits), then P1 Intent Router

---

## What was done this session

Fixed the #1 production reliability issue: **27% of turns (11/41) errored with `final_schema`**, each wasting ~5-16s on a failed structured-card call before falling back to prose. Root-caused via prod data + local reproduction, then fixed 7 distinct validation gaps in the sanitizer.

### Root cause analysis (evidence-based)

1. **Pulled 11 failing turns from prod** (`nepo.tingting.vip`) — every `final_schema` error resulted in a `text` fallback response. The user got an answer, but ~5-16s was wasted on the failed structured call.
2. **Wrote a local reproduction test** with 18 plausible model outputs against the actual Zod schema. Found **7 failure patterns** that caused `final_schema` errors.
3. **Fixed all 7 patterns** in `sanitizeAgentJson()` — the pre-validation sanitizer that runs before Zod.

### The 7 failure patterns found + fixed

| # | Pattern | Example | Fix |
|---|---------|---------|-----|
| 1 | Unknown widget type `metric` | `{type:"metric", label:..., value:...}` | Alias `metric`→`kpi_grid`; if no items, drop widget → card downgrades to text |
| 2 | Unknown widget type `chart` | `{type:"chart", data:[...]}` | Alias `chart`→`bar_chart` |
| 3 | Unknown widget type `list` | `{type:"list", items:[{text:...}]}` | Reshape items→table columns/rows |
| 4 | Wrapped response `{response:{...}}` | `{response:{type:"insight_card",...}}` | Unwrap container objects (`response`/`result`/`data`/`answer`/`output`) |
| 5 | kpi_grid missing items | `{type:"kpi_grid"}` (no items) | Drop widget → card downgrades to text |
| 6 | anomaly_list missing `detail` | `{items:[{label:..., severity:...}]}` | Default `detail` to empty string (also checks `description`) |
| 7 | Table cells with objects | `rows:[[{a:1}, 2]]` | Coerce each cell: extract label/name/value, else stringify |

**Additional hardening:** expanded widget type aliases (added `metrics`/`stats`/`pie`/`trend`/`alert`/`highlight`/`grid`), expanded response type aliases (added `analysis`/`report`/`reply`/`prose`/`tour`/`action`), and unknown widgets with no recoverable shape are now dropped instead of failing the whole card.

### Files changed (2)

- **`backend/src/services/agent/orchestrator.ts`** — (1) extended `WIDGET_TYPE_ALIASES` (10→28 entries); (2) extended `RESPONSE_TYPE_ALIASES` (4→12 entries); (3) `sanitizeAgentJson()`: unwrap container objects, coerce unknown widget types to table/callout/bar_chart or drop, drop kpi_grid with no items, default anomaly_list detail, filter null widgets; (4) `normalizeTableWidget()`: coerce object cells to strings; (5) diagnostic log on `final_schema` failure (`console.log` raw card head, truncated 500 chars).
- **`backend/src/tests/final-schema-repro.test.ts`** — **NEW** 18 regression tests covering all 7 patterns + baseline non-regression.

### Verification
- **Local reproduction:** 18/18 patterns now PASS (was 11/18 before fix).
- **Backend typecheck:** clean (my files only; pre-existing onboarding errors are separate uncommitted work).
- **Test suite:** 491 tests, **490 pass**, 1 fail (`pnl-invariant` — pre-existing, unrelated).
- **Zero regressions:** the existing `agent-strip-think.test.ts`, `agent-semantic-data.test.ts`, `agent-orchestrator-metrics.test.ts` all still pass.

### Expected production impact
- `final_schema` error rate should drop from **27% → <5%** (the remaining failures would be truly unrecoverable output — empty/null content).
- Each recovered turn saves **~5-16s** of wasted structured-card call latency.
- The diagnostic log (`[agent] final_schema fail, raw card head: ...`) will capture any residual failures for further tightening.

---

## Next task for the next session: Diagnose dead FAQ fast lane

**Why next:** Production data shows **0 FAQ fast-lane hits ever** (all 41 turns have `react_iterations ≥ 1`). The P0 instrumentation (Task 1) now makes FAQ hits measurable via `intent_bucket='faq'`, but the underlying question remains: *why does the FAQ lane never fire?* This must be understood before P2 extends retrieval.

**Where:** `backend/src/services/agent/faq-fast-lane.ts` — the 4-stage cascade (exact → rule-gated → pgvector cosine → score/margin gate). Thresholds: `SCORE_FLOOR = 0.40`, `MARGIN = 0.12`.

**Investigation steps:**
1. Pull the actual user questions from prod: `SELECT content FROM agent_messages WHERE role='user' ORDER BY id;`
2. Check what FAQ entries exist: `SELECT question, question_variants FROM faq_entries WHERE is_active;`
3. Manually test a few real questions against the fast lane (run `tryFaqFastLane` locally with prod FAQ data).
4. Likely causes: (a) thresholds too strict, (b) FAQ content doesn't match real question phrasing, (c) users don't ask FAQ-shaped questions, (d) the rule gate (`required_terms`/`forbidden_terms`) over-filters.
5. Fix: tune thresholds, expand FAQ variants, or relax the rule gate.

**Acceptance:** ≥1 FAQ fast-lane hit in the next 20 production turns (measurable via `intent_bucket='faq'`).

---

## Remaining plan tasks (after FAQ diagnosis)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Diagnose dead FAQ fast lane (0 hits) | **High** | S | None |
| P0.3 MiniMax `<think>` stream-shape spike | Medium | S | None |
| P0.4 model-tier spike (find fast model) | Medium | M | None |
| P1 Intent Router & Lane 0/1 | **High** | M | P0 (done) |
| P2 Knowledge & Lookup Lanes | Medium | M | P1 |
| P3 Daily Work Assistant (Summary Lane) | Medium | M | P1 |
| P4 Semantic Metric Layer & Provenance | Medium | L | P1, P2 |
| P5 Governance, Scale & Evaluation | Low | L | P1 |

**Completed so far:** P0 Instrumentation Baseline ✅, P0.5 `final_schema` hotfix ✅
