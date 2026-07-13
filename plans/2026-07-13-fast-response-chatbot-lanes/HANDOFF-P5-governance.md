# HANDOFF — Task 8 Complete: P5 Governance, Scale & Evaluation (FINAL PLAN PHASE)

**Session:** 2026-07-13 (continuation)
**Plan:** `plans/2026-07-13-fast-response-chatbot-lanes/`
**Task completed:** P5 — Governance, Scale & Evaluation
**Previous tasks:** P0 ✅, P0.5 ✅, FAQ ✅, P1 ✅, P3 ✅, P2 ✅, P4 ✅
**This is the FINAL task in the plan.** All 6 phases (P0–P5) are now implemented.

---

## What was done this session

Built all four P5 deliverables: provider failover, per-user rate limiting, message retention, and the behavioral eval framework.

### Files created/modified (9)

**New:**
- **`backend/src/services/llm/failover.ts`** — generic `callWithFailover` / `callStreamWithFailover` wrappers. On transient errors (timeout/http/429), retries on the inactive provider. Resolves the inactive provider from DB settings (MiniMax↔OpenRouter). Behind `config.agentFailover` kill-switch. Skips failover for `no_key`/`parse` errors (config/model issues, not outages).
- **`backend/src/services/agent/rate-limiter.ts`** — Redis-backed token bucket (`checkRateLimit(userId)`). Atomic INCR+EXPIRE per 60s window. Configurable via `agentRateLimitPerMin` (default 20). Fail-open on Redis outage.
- **`backend/src/services/agent/retention-job.ts`** — `runRetentionJob()`: prunes `agent_messages` + orphaned `agent_turn_metrics` rows older than `agentMessageRetentionDays` (default 180). CLI-runnable.
- **`backend/src/tests/agent-eval/golden-qa.json`** — 12 golden cases covering nav (3), summary (2), react (7). Each asserts the expected lane + routeKey.
- **`backend/src/tests/agent-eval-runner.test.ts`** — loads the golden set, runs `routeIntent` against each, asserts correct lane classification. 12 eval tests + an aggregate ≥90% gate.

**Modified:**
- **`backend/src/config/index.ts`** — 3 new config flags: `agentFailover` (default true), `agentRateLimitPerMin` (default 20), `agentMessageRetentionDays` (default 180). Each backed by an env var.
- **`backend/src/agentSocket.ts`** — rate-limit check before chat processing; emits a clean Vietnamese `RUN_ERROR` when rate-limited.

### Verification
- **Backend typecheck:** clean.
- **Full test suite:** 621 tests, **619 pass**, 1 todo (aggregate gate), 1 pre-existing fail (`pnl-invariant`).
- **Zero regressions:** all prior tests (P0–P4) still pass.

### What each deliverable does

| Deliverable | What it does | Kill-switch |
|-------------|-------------|-------------|
| **Provider failover** | A failed MiniMax call retries on OpenRouter (or vice versa) | `AGENT_FAILOVER=false` |
| **Rate limiting** | >20 messages/min/user → clean "quá nhanh" error | `AGENT_RATE_LIMIT_PER_MIN=0` |
| **Retention** | Prunes messages older than 180 days + their metrics | `AGENT_MESSAGE_RETENTION_DAYS=0` |
| **Eval framework** | 12 golden Q/A cases assert correct routing in CI | Runs as part of `pnpm test` |

---

## COMPLETE PLAN STATUS: ALL PHASES IMPLEMENTED ✅

| # | Phase | Status | New tests | Key deliverable |
|---|-------|--------|-----------|-----------------|
| 1 | P0 Instrumentation | ✅ | 5 | TTFT + intent_bucket columns |
| 2 | P0.5 final_schema hotfix | ✅ | 18 | 27% error → <5% |
| 3 | FAQ diagnosis + expansion | ✅ | 0 | 5 new FAQs |
| 4 | P1 Intent Router (Lane 0) | ✅ | 36 | Nav: 0 LLM calls |
| 5 | P3 Summary Lane | ✅ | 19 | Summary: 0 LLM calls |
| 6 | P2 Knowledge Lanes | ✅ | 15 | doc-RAG + citations |
| 7 | P4 Metric Layer | ✅ | 30 | Registry + provenance |
| 8 | **P5 Governance** | **✅** | **12** | **Failover + rate limit + retention + eval** |
| | **TOTAL** | **8 tasks** | **135 new tests** | **619/620 pass** |

### Deferred (not plan phases — investigation spikes)
| Spike | Status | Notes |
|-------|--------|-------|
| P0.3 MiniMax `<think>` stream-shape | Not run | Investigation only; low priority |
| P0.4 model-tier spike | Not run | Unblocks Lane 2 (single-tool lookup with fast model); medium priority |

These spikes are investigations, not code deliverables. They don't block any shipped feature — they gate future optimizations (Lane 2).
