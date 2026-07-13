---
phase: 6
title: "P5 — Governance, Scale & Evaluation"
status: pending
priority: P3
effort: "L (4–6 engineer-weeks, composable)"
dependencies: [2]
---

# Phase 6: P5 — Governance, Scale & Evaluation

## Overview

Harden the assistant for trustworthy daily use: provider failover, rate limiting, the Socket.IO Redis adapter (only if a second instance is actually imminent), `agent_messages` retention, a **behavioral eval framework** (offline golden sets + prod metrics + human review), and the `REQUEST_CONFIRMATION` directive scaffolding for a future write-action v2. Each item is independently shippable.

This consolidates HLD §17 gaps #13–#19 and §15 (evaluation). It is composable onto any completed earlier phase — you do not need P3/P4 done to start the eval framework or failover.

> **Defer unless triggered:** the Socket.IO Redis adapter (gap #13) and rate limiting (#14) only matter when a second backend instance or abuse becomes real. The HLD §16 recommendation is single-instance vertical headroom; honor that until there's a concrete scaling trigger.

## Requirements

- **Functional:** A provider outage no longer takes the bot down. Abuse is rate-limited. Conversations have a retention policy. Behavioral regressions are caught in CI by a golden Q/A set.
- **Non-functional:** Failover adds < 200 ms to the failure path. Eval suite runs in < 60 s in CI.

## Architecture

```
Provider failover:  MiniMax ──timeout/error──► OpenRouter (or vice versa)
                                  (config-driven order; both already wired)

Rate limit:         socket middleware, per-user, token-bucket in Redis

Eval framework:     tests/agent-eval/*.json (golden cases)
                    ─► run against staging model ─► assert shape + key facts
                    ─► CI gate on regression
```

## Related Code Files

- **Create:** `backend/src/services/llm/failover.ts` — wraps the provider call; on `MiniMaxError` (timeout/5xx/429) retries the next provider in `config.llmProviderOrder`.
- **Modify:** `backend/src/services/agent/orchestrator.ts` — call LLM via the failover wrapper; record `provider_used` + `fallback_used` (latter already exists on metrics).
- **Modify:** `backend/src/agentSocket.ts` — per-user rate-limit middleware (token bucket in Redis via existing `lib/redis`); emit a typed `RUN_ERROR` with `error_kind='rate_limited'`.
- **Modify:** `backend/src/services/llm/models.ts` — `llmProviderOrder` config.
- **Create:** `backend/drizzle/00XX_agent_retention.sql` + `backend/src/services/agent/retention-job.ts` — scheduled job to prune `agent_messages` older than the policy TTL (configurable; default e.g. 180 days). Audit-deletes (write a summary row, don't hard-delete if audit requires).
- **Create:** `backend/src/tests/agent-eval/golden-qa.json` — ≥ 30 cases: `{ message, expectedLane, expectedShape, keyFacts[], expectedCitations? }`.
- **Create:** `backend/src/tests/agent-eval/runner.ts` — drives the orchestrator in a test harness; asserts lane (via `intent_bucket`), response shape, and that `keyFacts` appear in the answer; runs in `node:test`.
- **Modify:** `backend/src/config/index.ts` — `AGENT_RATE_LIMIT_PER_MIN`, `AGENT_MESSAGE_RETENTION_DAYS`, `LLM_PROVIDER_ORDER`.
- **Modify:** `shared/src/schemas/agent.ts` — add `REQUEST_CONFIRMATION` directive kind (scaffolding only; not emitted by any v1 tool). Keep `requiresConfirmation` semantics from the HLD §9 future contract.

## Implementation Steps

1. **Failover** — wrap provider calls; on timeout/error/429, try the next provider in order; record which provider answered. Unit test the wrapper with mocked providers.
2. **Rate limit** — Redis token bucket per `userId`; configurable burst/sustained; surface a clean Vietnamese `RUN_ERROR` ("Bạn đang gửi quá nhanh…"). Test the middleware.
3. **Retention** — scheduled job (reuse whatever cron the app already uses, or a simple `setInterval` worker); prune by `created_at`; write an audit summary. Make TTL configurable; default conservative.
4. **Eval framework** — author the golden set from real production questions (sample from `agent_messages` content, redact PII); each case asserts the lane, the response shape, and that key facts are present (substring/numeric tolerance). Run as a `node:test` suite gated in CI (or a `pnpm test:eval` script).
5. **Eval in CI** — wire `pnpm test:eval` into the existing test command (`backend/package.json` `test` script). Failures block merge. (Note: repo has no CI pipeline today — flag this as a prerequisite or run manually pre-release.)
6. **`REQUEST_CONFIRMATION` scaffold** — add the directive kind + Zod schema + a no-op handler in `AgentDirectiveProvider.tsx` that renders a confirm dialog and, on confirm, re-emits an `agent:confirmed_action` event (no v1 tool consumes it). This is pure scaffolding so a future write-action phase doesn't churn the contract.
7. **(Conditional) Socket.IO Redis adapter** — only if a second instance is imminent: add `@socket.io/redis-adapter`, configure from existing Redis. Skip otherwise; document the decision.

## Success Criteria

- [ ] Provider failover: simulated primary-provider outage → turn still completes via secondary; `fallback_used = true` on the metrics row; added latency < 200 ms.
- [ ] Rate limit: a user exceeding the bucket receives a clean `RUN_ERROR` with `error_kind='rate_limited'`; legitimate traffic unaffected.
- [ ] `agent_messages` older than `AGENT_MESSAGE_RETENTION_DAYS` is pruned by the scheduled job; audit summary written.
- [ ] Golden Q/A eval suite (≥ 30 cases) green in `pnpm test:eval`; wired into the test command.
- [ ] `REQUEST_CONFIRMATION` directive kind exists in schema + client handler; no v1 tool emits it (confirmed by grep).
- [ ] Socket.IO Redis adapter: either shipped (with a load test) or explicitly deferred with the trigger documented.

## Risk Assessment

- **Failover hides a degraded primary** — silently falling over to a slower provider can mask an outage. Mitigation: log + metric `fallback_used`; alert when rate exceeds a threshold.
- **Rate limit false-positives** on legitimate power users. Mitigation: tune the bucket conservatively, exempt ADMIN during pilot, surface the limit in the error.
- **Retention deletes audit-relevant content** — if Vietnamese audit regulations require keeping chat, hard-delete is wrong. Mitigation: confirm the retention requirement first (HLD §21 D4 open question); default to a long TTL and archive rather than delete if uncertain.
- **Eval suite flakiness** from model non-determinism. Mitigation: assert on shape + key facts + lane, not on exact prose; use a fixed-temperature model config; allow a small retry budget. Flag eval-only model drift separately from code regressions.
- **CI gap** — the repo has no CI today (`AGENTS.md`: "No linter or CI pipeline configured"). The eval suite only catches regressions if someone runs it. Surface this as a prerequisite; minimum viable: a pre-release `pnpm test:eval` run + a git hook.
