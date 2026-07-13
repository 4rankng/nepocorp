---
phase: 4
title: "P3 — Daily Work Assistant (Summary Lane)"
status: pending
priority: P2
effort: "M (3–5 engineer-weeks)"
dependencies: [2]
---

# Phase 4: P3 — Daily Work Assistant (Summary Lane)

## Overview

Realize **Lane 3 (Summary)** from the HLD: a role-aware "today at a glance" assistant that runs **parallel** deterministic tool calls and a single fast-model synthesis pass — never the ReAct reasoning loop. This is the HLD §10 "Daily Work Assistant": an Accountant opens the drawer and asks "tóm tắt việc hôm nay" and gets missing trip data, outstanding receivables, vendor payables, settlements in one card; a Manager gets trips awaiting approval, customer debt, vehicle profitability, operational alerts.

This is the most user-visible "fast assistant" win: a daily question that today would cost a 4-iteration ReAct loop resolves in one parallel burst + one synthesis call.

## Requirements

- **Functional:** Role-aware daily-summary intents route to Lane 3; produce an `insight_card` with KPI widgets + action chips linking to the relevant pages.
- **Non-functional:** p95 ≤ 3 s (parallel tools + one fast synthesis). Tool calls run concurrently. No ReAct loop.

## Architecture

```
Intent Router (P1)
   │ recognizes summary intent ("tóm tắt" / "việc hôm nay" / "cần làm gì")
   ▼
Lane 3 runner (NEW: orchestrator.runSummary)
   │
   ├─ resolve role → summary template (Accountant vs Manager)
   ├─ Promise.all([report.dailyAccountantWork, report.dailyManagerWork, ...])   ◄── parallel, deterministic
   ├─ one fast-model synthesis pass (P0.4 model) → insight_card
   └─ citations/provenance from each tool result (P4 link)
```

The `report.run` tool already exists (`tools/reports.ts`) and delegates to domain services (`pnl.service`, `aging.service`, `attendance.service`, `dashboard-stats.service`). Lane 3 composes 2–4 of those into a template rather than letting the model choose.

### Role templates (Vietnamese domain)

| Role       | Widgets (from HLD §10)                                           |
|------------|------------------------------------------------------------------|
| ACCOUNTANT | missing trip data · outstanding receivables · vendor payables · settlements · renewals |
| MANAGER    | trips awaiting approval · customer debt · vehicle profitability · operational alerts |
| ADMIN      | superset; role-pickable                                          |

## Related Code Files

- **Create:** `backend/src/services/agent/summary-lane.ts` — `runSummary(ctx, role): Promise<AgentResponse>`; resolves the template, fans out parallel `report.run` calls, synthesizes.
- **Create:** `backend/src/services/agent/summary-templates.ts` — declarative per-role templates: `[{ reportKey, args, widget: 'kpi_grid'|'anomaly_list'|'table', title }]`.
- **Modify:** `backend/src/services/agent/tools/reports.ts` — add `dailyAccountantWork` + `dailyManagerWork` report keys (thin aggregations over `dashboard-stats.service.ts` / `aging.service.ts`).
- **Modify:** `backend/src/services/agent/intent-router.ts` (from P1) — recognize summary intent → `{lane:'summary', template: role}`.
- **Modify:** `backend/src/services/agent/orchestrator.ts` — add `runSummary` entry alongside `runLookup` (P1) and `runAgent` (existing).
- **Modify:** `shared/src/schemas/agent.ts` — `insight_card.widgets[].provenance` field (lands fully in P4; here add the optional field so Lane 3 can populate it).
- **Reuse:** `InsightCard.tsx` (already renders `kpi_grid`/`bar_chart`/`table`/`anomaly_list`/`callout`), `agentActionChipSchema` for "go to receivables" chips.

## Implementation Steps

1. **Report keys** — add the two daily-work report keys to `tools/reports.ts`; each returns a compact KPI set (counts + amounts). Keep them deterministic and fast (single SQL each; reuse existing indexes).
2. **Templates** — declarative per-role template map; each entry maps to a report key + widget type + Vietnamese title + an action chip (route key).
3. **`runSummary`** — `Promise.all` over the template's reports; on all-resolved, one fast-model synthesis pass producing the `summary` text + assembling widgets from tool results (not from the model — the model only writes prose). This avoids hallucinated numbers (HLD §8.2 safeguard).
4. **Router wiring** — summary-intent detection in `intent-router.ts` (keywords: `tóm tắt`, `việc hôm nay`, `cần làm`, `tình hình`); route to Lane 3 with the role template.
5. **Provenance stub** — each widget carries `{source:'tool', toolName, args}` (full provenance lands in P4; here just the field).
6. **Tests** — per-role template test (assert widget set); parallel-execution test (assert `Promise.all` order-independent); synthesis test (assert numbers trace to tool results, not invented).
7. **Caching** — short-TTL Redis cache on the daily reports (e.g. 60–120 s) since "today" doesn't change second-to-second. Invalidate on ledger close / trip lock. (HLD §14.3 tool-result caching item.)

## Success Criteria

- [ ] "tóm tắt việc hôm nay" routes to Lane 3 for ACCOUNTANT and MANAGER; returns an `insight_card` with the role's widget set.
- [ ] Lane 3 turns show `react_iterations = 0`, exactly 1 LLM call (synthesis), `intent_bucket = 'summary'`.
- [ ] p95 ≤ 3 s for Lane 3 turns.
- [ ] Every number in the summary traces to a tool result (synthesis uses tool output verbatim, no model arithmetic) — verified by test.
- [ ] Action chips navigate to the correct pages (reuse existing directive executor).
- [ ] Daily-report cache hit rate ≥ 50% in steady state.

## Risk Assessment

- **Numbers in the prose drift from the widgets** if the model re-computes. Mitigation: synthesis prompt is "summarize these tool results; do not compute"; widgets are assembled from tool data, not model output. Add a numeric-consistency check in the test.
- **Report-key SQL slowness** on large datasets. Mitigation: reuse existing indexes; the dashboard-stats service already powers the human dashboard at acceptable latency; cap with a per-report timeout that fails the widget gracefully (callout: "data unavailable") rather than blocking the whole summary.
- **Role misroute** (DRIVER/FORWARDER have no tools today). Mitigation: the router's role gate already excludes them; Lane 3 inherits that.
