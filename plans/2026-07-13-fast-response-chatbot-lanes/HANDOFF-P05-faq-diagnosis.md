# HANDOFF — Task 3 Complete: FAQ Fast-Lane Diagnosis + Content Expansion

**Session:** 2026-07-13 (continuation)
**Plan:** `plans/2026-07-13-fast-response-chatbot-lanes/`
**Tasks completed this session:**
1. P0.5 `final_schema` error hotfix ✅ (see `HANDOFF-P05-final-schema-hotfix.md`)
2. FAQ fast-lane diagnosis + content expansion ✅ (this doc)
**Next task:** P1 Intent Router & Lane 0/1 (the headline architectural deliverable)

---

## FAQ diagnosis findings (evidence-based)

**Question:** Why has the FAQ fast lane never fired in production (0/41 turns)?

**Answer:** Content mismatch — NOT a threshold or code bug. The system is working correctly.

### Evidence

Pulled all 50 user questions + 30 FAQ entries from prod (`nepo.tingting.vip`):

| What users actually ask | What FAQ covers |
|------------------------|-----------------|
| "Công ty tên là gì" (company name) | Domain rules: penalties, fuel modes |
| "Cty co bao nhieu xe" (fleet count) | Ledger immutability |
| "Số lốp 136.31" (tire count) | Road allowance formula |
| "lợi nhuận xe 15C-136.31" (specific profit) | Profit definitions |
| "dạy tôi cách tạo giấy báo nợ" (tutorial) | Payment matching |

**Root cause:** Users ask **operational data questions** (requiring live DB lookups) and **navigation/tutorial requests** (requiring UI tools). The 30 FAQ entries cover **domain rule questions** (requiring knowledge only). These are fundamentally different intents. The FAQ lane correctly abstains on data queries — those need tools, not knowledge.

### What was done

**`backend/drizzle/0106_faq_operational_expansion.sql`** — adds 5 new FAQ entries for the most common question patterns that ARE answerable as knowledge:
1. "Công ty tên là gì?" — company name (points to config page)
2. "Công ty có bao nhiêu nhân sự?" — staff count (points to users page)
3. "Làm thế nào để tạo giấy báo nợ?" — debit note creation guide
4. "Công nợ phải thu là gì và xem ở đâu?" — receivables definition + location
5. "Bot có thể giúp gì?" — bot capabilities (handles "hi" / greeting intent)

**Important:** These new entries need embeddings backfilled after migration:
```bash
cd backend && pnpm tsx src/db/backfill-faq-embeddings.ts
```
Until backfilled, they match via exact/rule stages only (semantic cosine won't fire). The fast lane fails open, so this is safe.

### What was NOT done (and why)

- **Did NOT tune thresholds** (0.40 floor / 0.12 margin). They're correct — verified against the semantic distance between real questions and FAQ content. Lowering them would cause false matches (wrong answers).
- **Did NOT add FAQs for data questions** like "how many trucks" or "specific profit." Those REQUIRE live data lookups and correctly belong on the LLM+tool path. Adding a static FAQ answer would be misleading (the number changes).
- **The real fix for data questions is P1 (Intent Router)** — it will route "how many trucks" to a single `data.aggregate` call (Lane 2, 1 fast-model call) instead of a full ReAct loop. That's the architectural solution; FAQ expansion is just a content improvement.

### Verification
- Migration SQL is valid (parses cleanly, matches the `0104` format exactly).
- Test suite: 503 tests, **502 pass**, 1 pre-existing fail (`pnl-invariant`).
- Typecheck: clean (my files).

---

## Tasks completed so far (3 of ~12)

| # | Task | Status | Impact |
|---|------|--------|--------|
| 1 | P0 Instrumentation Baseline | ✅ | TTFT + intent_bucket columns, FAQ metrics visibility, dashboard panels |
| 2 | P0.5 `final_schema` hotfix | ✅ | 27% error rate → expected <5%; saves ~5-16s per recovered turn |
| 3 | FAQ diagnosis + content expansion | ✅ | Root-caused 0-hit issue (content mismatch); added 5 high-value FAQs |

## Next task: P1 Intent Router & Lane 0/1

**Why next:** This is the **headline architectural deliverable** of the entire plan — "route before reasoning." Production data validates it:
- `ui.navigate` is the #1 tool (21 calls) — every navigation paid for a full ReAct loop
- p95 = 56s, p99 = 78s — LLM time is 99% of the budget
- The intent router collapses navigation to 0 LLM calls and lookups to 1 call

**What to build:** `backend/src/services/agent/intent-router.ts` — a deterministic router that sits between the FAQ lane and the orchestrator. See `phase-02-p1-intent-router-lane-0-1-fast-path.md` for the full design.

**Key files to read:** `backend/src/agentSocket.ts` (insertion point after FAQ abstain), `backend/src/services/agent/routeMatcher.ts`, `shared/src/navigation/pageCatalog.ts`, `backend/src/services/agent/text.ts` (normalizeText for Vietnamese matching).

**Acceptance:** ≥40% of turns resolve in Lane 0-2 (no reasoning model); navigation turns show 0 LLM calls; misroute ≤10% on golden set.

## Remaining roadmap

| Task | Priority | Effort |
|------|----------|--------|
| **P1 Intent Router & Lane 0/1** | **Highest** | M |
| P0.3 MiniMax `<think>` stream-shape spike | Medium | S |
| P0.4 model-tier spike | Medium | M |
| P2 Knowledge & Lookup Lanes | Medium | M |
| P3 Daily Work Assistant (Summary Lane) | Medium | M |
| P4 Semantic Metric Layer & Provenance | Medium | L |
| P5 Governance, Scale & Evaluation | Low | L |
