# HANDOFF — Task 1 Complete: P0 Instrumentation Baseline

**Session:** 2026-07-13
**Plan:** `plans/2026-07-13-fast-response-chatbot-lanes/`
**Task completed:** P0 — Instrumentation Baseline (phase-01)
**Next task:** P0.5 `final_schema` error hotfix (highest ROI), then P1 Intent Router

---

## What was done this session

Added the two P0 measurement columns (`latency_first_token_ms`, `intent_bucket`) end-to-end: migration → schema → orchestrator stamping → FAQ-lane metrics persistence → metrics API → shared types → dashboard UI. Also fixed an observability bug (FAQ hits wrote no metrics row).

### Files changed (13 total)

**Backend:**
- `backend/drizzle/0104_parallel_guardian.sql` — **NEW** journal-tracked migration: adds both columns, backfills legacy rows to `intent_bucket='unknown'`, creates the intent-bucket index. (Replaces a hand-written `0105` that bypassed the journal.)
- `backend/src/db/schema.ts` — added `latencyFirstTokenMs` + `intentBucket` to `agentTurnMetrics`.
- `backend/src/services/agent/orchestrator.ts` — (1) extended `MetricsAccumulator` interface; (2) stamp TTFT at first streamed prose delta (probe-commit flush) AND first `TOOL_CALL_START`; (3) `turnStart` anchor; (4) persist both fields in the metrics insert; (5) **NEW exported `recordFaqTurn()`** — persists a FAQ turn (conversation + messages + metrics row tagged `intentBucket='faq'`) so FAQ hits are finally visible.
- `backend/src/agentSocket.ts` — FAQ lane now calls `recordFaqTurn()` and includes `conversationId`/`messageId` in the done event; added `performance` import.
- `backend/src/routes/admin-chatbot-metrics.ts` — summary query adds TTFT p50/p95/p99; new intent-bucket distribution GROUP BY query; latency breakdown adds `firstTokenMs`.
- `backend/src/tests/agent-orchestrator-metrics.test.ts` — fixed 2 `MetricsAccumulator` literals for the new fields.
- `backend/src/tests/agent-p0-instrumentation.test.ts` — **NEW** 5 tests locking the accumulator contract + intent taxonomy.

**Shared:**
- `shared/src/schemas/chatbot-metrics.ts` — added `ttft` percentiles + `intentBuckets[]` to `ChatbotMetricSummary`; `firstTokenMs` to `ChatbotLatencyBreakdown`.

**Frontend:**
- `frontend/src/pages/ChatbotMonitoringPage.tsx` — new "Phân bổ theo lane thực thi" section (intent distribution panel).
- `frontend/src/pages/chatbot-monitoring-summary.tsx` — TTFT KPI card + `IntentDistribution` component + label maps.
- `frontend/src/pages/chatbot-monitoring-details.tsx` — TTFT bar in latency breakdown; skeleton count 5→6.
- `frontend/src/pages/ChatbotMonitoringPage.css` — `.cbm-intent` styles.

### Verification
- **Backend typecheck:** clean.
- **Shared + frontend typecheck:** clean.
- **Test suite:** 473 tests, **472 pass**, 1 fail (`pnl-invariant.test.ts` — **pre-existing**, confirmed fails on clean tree, unrelated to this work).
- **Migration:** journal-tracked (`0104_parallel_guardian`), snapshot reconciled (future `generate` won't re-emit `faq_entries`).

### Key finding during implementation
The FAQ fast lane in `agentSocket.ts` returned early **without writing any metrics row**. This means the production measurement "0 FAQ hits" was partly a measurement blind spot — FAQ hits were invisible even when they happened. Now fixed: every FAQ turn persists a metrics row with `intent_bucket='faq'`, `react_iterations=0`, `model='faq-fast-lane'`, and the lookup latency.

### NOT done (deferred to later tasks)
- **TTFT column not yet populated on prod** — migration exists but isn't applied to `nepo.tingting.vip` yet. After deploy + traffic, re-pull the baseline to get real TTFT p50/p95/p99.
- **P0.3 stream-shape spike** (does MiniMax leak `<think>`?) — not run.
- **P0.4 model-tier spike** (find a genuinely fast model) — not run.

---

## Next task for the next session: P0.5 `final_schema` error hotfix

**Why next:** Production data shows **27% of turns (11/41) error with `final_schema`**, each wasting ~28s before a fallback. This is the single highest-ROI fix and is independent of P1.

**Where:** `backend/src/services/agent/orchestrator.ts` → `produceFinalAnswer()` (~line 854). The error fires when the structured-card `json_object` call returns content that fails `parseAgentResponseContent` (Zod schema validation), setting `fallbackReason='final_schema'`.

**Investigation steps:**
1. Pull a few failing `final_schema` turns from prod: `SELECT tool_trace, response FROM agent_messages WHERE role='assistant' AND tool_trace IS NOT NULL ORDER BY id DESC LIMIT 10;` — look at what the model emitted vs what the schema expects.
2. Check if `salvageText()` (line ~1048) is recovering most of them (if so, the user still gets an answer but it's counted as a fallback + the wasted structured call).
3. Likely fixes (pick based on findings):
   - Loosen `agentResponseSchema` for fields the model frequently gets wrong.
   - Improve `jsonrepair` coverage in `tryParseJson`.
   - For low-confidence analytical turns, skip the structured retry entirely (Case 3 → return prose directly, saving the ~7s final call).

**Acceptance:** `final_schema` error rate drops from 27% to <10%; turns that previously errored now resolve without the 28s wasted call.

---

## Remaining plan tasks (after P0.5)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| P0.5 `final_schema` hotfix | **Highest** | S | None |
| Diagnose dead FAQ fast lane (0 hits) | High | S | None |
| P0.3 MiniMax `<think>` stream-shape spike | Medium | S | None |
| P0.4 model-tier spike (find fast model) | Medium | M | None |
| P1 Intent Router & Lane 0/1 | High | M | P0 (done) |
| P2 Knowledge & Lookup Lanes | Medium | M | P1 |
| P3 Daily Work Assistant (Summary Lane) | Medium | M | P1 |
| P4 Semantic Metric Layer & Provenance | Medium | L | P1, P2 |
| P5 Governance, Scale & Evaluation | Low | L | P1 |

**Staging note (per user preference):** all changes should be tested in staging before prod. The migration is safe (additive columns, nullable, backfilled). Deploy steps: `pnpm db:migrate` then restart backend.
