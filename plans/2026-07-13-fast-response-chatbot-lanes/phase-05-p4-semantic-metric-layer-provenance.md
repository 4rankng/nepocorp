---
phase: 5
title: "P4 — Semantic Metric Layer & Provenance"
status: pending
priority: P2
effort: "L (4–6 engineer-weeks)"
dependencies: [2, 3]
---

# Phase 5: P4 — Semantic Metric Layer & Provenance

## Overview

Close the HLD §8 + §17 gap #6: there is **no single source of truth for metric definitions** — "lợi nhuận" means whatever the current tool computes, and `reporting.service.ts` can drift from the agent tools. This phase centralizes metric definitions in code, tags every business number with **provenance** (Observed / Calculated / Forecast / Assumption), and ports the reporting service to consume the layer so the bot and the human dashboard agree.

This is the largest phase and the prerequisite for any future forecasting (deferred, see plan overview). It is also where the HLD §6 directive — *"Business rules belong in code, not prompts"* — is enforced structurally.

## Requirements

- **Functional:** A `metric-registry` defines each business metric (formula, unit, source query, category). Both agent tools and `reporting.service.ts` consume it. Every number in an answer carries a provenance tag rendered in the UI.
- **Non-functional:** Golden-value parity test: the layer reproduces the existing reporting service's numbers exactly before cutover. No new microservice.

## Architecture

```
metric-registry.ts (declarative: id, formula, unit, query, category, label_vi)
        │
        ├─► agent tools (data.aggregate, report.run, summary-lane)  ── read definitions
        ├─► reporting.service.ts / pnl.service.ts                   ── ported to consume
        └─► provenance tag on every widget value
```

### Provenance taxonomy (HLD §6)

Every business number is tagged:
- **Observed** — read directly (e.g., a ledger balance).
- **Calculated** — derived via a registry formula (e.g., lợi nhuận gộp).
- **Forecast** — model output (future phase; scaffolded now).
- **Assumption** — user/model-supplied estimate.

Rendered as a small colored chip next to the value.

### Metric registry shape (declarative)

```ts
{
  id: 'gross_profit',
  labelVi: 'Lợi nhuận gộp',
  unit: 'VND',
  category: 'calculated',
  formula: 'revenue - direct_costs',
  source: { service: 'pnl', method: 'grossProfit' },
  provenance: 'calculated',
}
```

The registry is the **only** place metric math is defined. Tools reference by `id`; the system resolves and tags.

## Related Code Files

- **Create:** `backend/src/services/metrics/metric-registry.ts` — declarative metric definitions; `resolveMetric(id, ctx)`.
- **Create:** `backend/src/services/metrics/metric-types.ts` — `MetricCategory` enum (observed/calculated/forecast/assumption), `MetricDef`, `ProvenanceTag`.
- **Create:** `backend/drizzle/00XX_metric_audit.sql` (optional) — an audit row when a calculated metric is computed for the bot, for traceability. Defer if `agent_messages.tool_trace` suffices.
- **Modify:** `backend/src/services/agent/semantic-data.service.ts` — `aggregateMetrics` resolves from the registry instead of inline SQL.
- **Modify:** `backend/src/services/agent/tools/reports.ts`, `tools/analyzers.ts` — delegate to `resolveMetric`.
- **Modify:** `backend/src/services/pnl.service.ts`, `reporting-shared.ts` — port to consume the registry (the big refactor; do metric-by-metric behind a flag).
- **Modify:** `shared/src/schemas/agent.ts` — `widget values[]` carry `{ value, metricId?, provenance, unit }`.
- **Modify:** `frontend/src/components/agent/InsightCard.tsx` — render provenance chip per value; tooltip shows formula.
- **Create:** `backend/src/tests/metric-parity.test.ts` — golden-value parity vs pre-refactor reporting output.

## Implementation Steps

1. **Inventory** — enumerate every metric currently computed across `semantic-data.service.ts` (`aggregateMetrics`), `tools/reports.ts`, `tools/analyzers.ts`, `pnl.service.ts`, `reporting-shared.ts`. This is the discovery deliverable.
2. **Registry v0** — define the top ~15 metrics (lợi nhuận gộp, doanh thu, chi phí, tiền chuẩn, tiền phụ trội, công nợ phải thu, công nợ phải trả, etc.) with formulas + sources. Start with the highest-traffic ones the bot already answers.
3. **Parity harness** — before porting anything, snapshot current reporting outputs on a fixed dataset as golden values.
4. **Port agent tools first** — `data.aggregate` and `report.run` resolve via the registry; provenance tags attached. Run the parity harness; the agent path must reproduce prior numbers exactly.
5. **Port reporting service** — metric-by-metric, behind a flag `REPORTING_USE_REGISTRY`; flip per metric once parity holds. This is the bulk of the effort and the highest-risk step.
6. **Provenance in UI** — `InsightCard` renders a chip (Observed/Calculated/…) per value; hover shows the formula from the registry.
7. **Citations link** — a Calculated metric's chip can link to its registry definition (and the source doc in `CONTEXT.md` via P2's citation system).
8. **Forecast scaffold** — add the `forecast` category to the enum and registry shape but **do not implement** a forecast engine (deferred). This just stops P5/future work from churning the schema.

## Success Criteria

- [ ] `metric-registry.ts` defines ≥ 15 business metrics with formulas + Vietnamese labels + provenance category.
- [ ] Agent tools (`data.aggregate`, `report.run`, summary lane) resolve 100% of their metrics via the registry.
- [ ] `reporting.service.ts` / `pnl.service.ts` ported; `REPORTING_USE_REGISTRY` flag fully on; parity test green (zero numeric drift vs golden values).
- [ ] Every numeric value in an `insight_card` carries a provenance tag rendered in the UI.
- [ ] Registry is the single source of metric math — `grep` confirms no inline metric formulas remain in tools/reporting (except the registry itself).
- [ ] No new microservice; single backend instance unchanged.

## Risk Assessment

- **Reporting-service refactor regressions** — the highest-risk step in the whole plan; a wrong number on the human dashboard or in the bot is a trust-destroying bug. Mitigation: golden-value parity test as a hard gate; per-metric flag rollout; keep the old path reachable for one release cycle.
- **Scope creep** — "define every metric" is unbounded. Mitigation: start with the ~15 the bot actually surfaces; expand incrementally.
- **Provenance taxonomy too coarse** — if users can't tell observed from calculated, the chip is noise. Mitigation: ship with clear Vietnamese labels + tooltip formula; user-test the chip wording.
- **Forecast category added but unused** — acceptable; it's a scaffold. Document clearly that forecasting is deferred (plan overview).
