---
title: "Fast-Response Chatbot: Lane Architecture & Route-Before-Reasoning"
description: "Evolve the existing TingTing agent into a fast, trustworthy operational assistant by adding an intent router (route-before-reasoning), doc-RAG + citations, a daily-work summary lane, a semantic metric layer with provenance, and governance/scale. Code-grounded gap-closure: de-duplicates the in-flight latency-reduction plan and rebuilds nothing that already works."
status: pending
priority: P2
branch: "main"
tags: [chatbot, agent, performance, architecture]
blockedBy: []
blocks: []
created: "2026-07-13T09:49:45.506Z"
createdBy: "ck:plan"
source: skill
---

# Fast-Response Chatbot: Lane Architecture & Route-Before-Reasoning

## Overview

The refined HLD (`pasted-text-20260713-174818`) restates one principle above all:

> **Route before reasoning.** Never invoke an expensive reasoning model unless deterministic routing, retrieval, and direct business tools cannot satisfy the request. Only Lane 4 should require a reasoning model.

It defines a **5-lane** model:

| Lane | Name            | LLM cost                  |
|------|-----------------|---------------------------|
| 0    | Navigation      | None                      |
| 1    | FAQ             | None                      |
| 2    | Business Lookup | One tool call             |
| 3    | Summary         | Parallel tools + 1 fast synthesis |
| 4    | Complex Analysis| Reasoning model (ReAct)   |

### What already exists (do NOT rebuild)

The repo's own `ChatBotHLD.md` (1,088 lines, `[CONFIRMED]`-tagged) plus scout reports confirm substantial existing infrastructure. **This plan only closes gaps:**

- ✅ **Transport** — Socket.IO `/agent` namespace, AG-UI event protocol (`RUN_STARTED`/`TEXT_MESSAGE_*`/`TOOL_CALL_*`/`DIRECTIVE`/`RUN_FINISHED`/`RUN_ERROR`). `backend/src/agentSocket.ts`, `shared/src/schemas/agent.ts`.
- ✅ **Brain** — ReAct loop (≤4 iters) `backend/src/services/agent/orchestrator.ts`; ~25 tools via `tool.registry.ts`; semantic data gateway `semantic-data.service.ts`.
- ✅ **Lane 1 (FAQ)** — 4-stage zero-LLM cascade `faq-fast-lane.ts` (exact → rule-gated → pgvector HNSW cosine → score/margin gate).
- ✅ **Tooling** — `data.*` semantic gateway, `report.run`, `ui.navigate/focus`, `tours.search`; role-gated read-only via `defineReadTool`.
- ✅ **Directives** — 6-kind typed Zod union (`navigate`/`focus`/`open`/`prefill`/`toast`/`scrollTo`); client executor `AgentDirectiveProvider.tsx`; **no `eval` anywhere**.
- ✅ **Tours** — `shared/src/tours/catalog.ts` (3 tours), `TourControllerContext` state machine, driver.js spotlight, resume-on-refresh, tour-net guardrail.
- ✅ **Observability** — `agent_turn_metrics` table (per-stage latency, tokens, flags), OTel spans (`agent.turn`/`agent.tool.execute`/…), admin `ChatbotMonitoringPage`.
- ✅ **pgvector + embeddings** — `faq_entries.embedding vector(1536)`, HNSW, OpenRouter `text-embedding-3-small`.

### Genuine gaps this plan closes

| # | Gap (from `ChatBotHLD.md` §17)                | Lane/Phase      |
|---|-----------------------------------------------|-----------------|
| 1 | No intent router (every non-FAQ turn = full ReAct) | P1, Lane 0    |
| 2 | p95 ≈ 17s, context growth per call            | P0 measure, P1 collapse |
| 3 | No general RAG (only FAQ)                     | P2, Lane 1 ext  |
| 4 | No citations / provenance                     | P2 + P4         |
| 5 | No semantic metric layer                      | P4              |
| 6 | No daily-work / summary lane                  | P3, Lane 3      |
| 7 | No onboarding (tours not first-class)         | (deferred — note) |
| 8 | No behavioral eval, provider failover, rate limit, Socket.IO Redis adapter | P5 |

### Out of scope (deliberately deferred)

- **Forecasting/anomaly engine** — `ChatBotHLD.md` §17 gap #4/#5, medium severity, multi-week sub-project; depends on the P4 metric layer. Revisit after P4 lands.
- **Onboarding / first-run flow** — HLD §10, separate UX track; reuses the existing tour engine so it can be done without blocking this plan.
- **Write actions** — HLD §9 + §12 defer all writes to a future v2; this plan keeps v1 read-only. `REQUEST_CONFIRMATION` directive lands in P5 only as scaffolding.

## Engineering Directives (from the HLD — non-negotiable)

1. Do not rebuild as microservices.
2. Do not send every request to an LLM.
3. Do not use an LLM for deterministic UI commands.
4. Do not generate arbitrary SQL (typed tools only).
5. Do not encode business rules only in prompts.
6. Do not expose write actions without confirmation.
7. **Do not optimize prompts before measuring production telemetry.** ← this is why P0 precedes P1.

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [P0 — Instrumentation Baseline](./phase-01-p0-instrumentation-baseline.md) | Pending | S |
| 2 | [P1 — Intent Router & Lane 0/1 Fast Path](./phase-02-p1-intent-router-lane-0-1-fast-path.md) | Pending | M |
| 3 | [P2 — Knowledge & Lookup Lanes](./phase-03-p2-knowledge-lookup-lanes.md) | Pending | M |
| 4 | [P3 — Daily Work Assistant (Summary Lane)](./phase-04-p3-daily-work-assistant-summary-lane.md) | Pending | M |
| 5 | [P4 — Semantic Metric Layer & Provenance](./phase-05-p4-semantic-metric-layer-provenance.md) | Pending | L |
| 6 | [P5 — Governance, Scale & Evaluation](./phase-06-p5-governance.md) | Pending | L |

## Dependencies

```
P0 (measure) ──► P1 (router: needs intent_bucket data + TTFT) ──► P2 (knowledge/lookup) ─┐
                                                                                          ├──► P3 (summary lane)
                                                                                          └──► P4 (metric layer)
                                                                                          └──► P5 (governance/eval)
```

- **P1 blocks P2/P3** — the router is the front door for every lane.
- **P4 (metric layer) unblocks future forecasting** but is not required by P3.
- **P5 is composable** onto any completed phase.

### Cross-plan relationship

- **`docs/plans/chatbot-latency-reduction.md`** (in-flight, status: pending approval) covers perceived-latency wins (instant ack, streaming, tool progress, context diet). This plan **references it rather than re-specs it**: P0 pulls its baseline; P1's router is the highest-leverage latency item it identifies (Phase 2 of that doc). Do not duplicate — link.
- **`docs/plans/agent-semantic-data-gateway.md`** covers tool consolidation; P2/P4 build on that gateway. Reference, don't redo.
- **`docs/plans/bot-navigate-and-spotlight.md`** covers the existing navigation directive design; P1 Lane 0 wraps it, does not replace it.
- **`plans/2026-07-13-onboarding-orchestration-layer/`** — the onboarding UX track deferred above. Its Phase 7 adds `continue_tour`/`cancel_tour` to the same `AgentResponse` union this plan's intent router branches on, and edits `orchestrator.ts` final-answer synthesis. No hard block either way; coordinate so the intent classifier buckets all `*_tour` responses together.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Intent router misroutes a real analytical question to a fast lane (wrong/empty answer) | ≤10% misroute gate (P1); fail-open to ReAct on low confidence; `intent_bucket` logged for audit |
| New metric layer diverges from existing `reporting.service.ts` numbers | P4 ports reporting service to consume the layer; golden-value parity test before cutover |
| doc-RAG retrieval injects untrusted content into prompts | P2 marks retrieved chunks as untrusted; isolated prompt segment; never executed as directive |
| Router latency itself becomes the new floor | P1 keeps deterministic rules first; small-classifier is a fallback, not the default path |

## Acceptance Criteria (whole plan)

- [ ] p95 end-to-end ≤ 8s (down from ~17s), TTFT p95 ≤ 2s — measured, not estimated.
- [ ] ≥40% of turns resolved in Lane 0–3 (no reasoning model) — read from `intent_bucket`.
- [ ] Every grounded answer carries a citation or provenance tag visible in the UI.
- [ ] Behavioral eval set green (offline golden Q/A) in CI.
- [ ] No new microservices; single backend instance unchanged.
