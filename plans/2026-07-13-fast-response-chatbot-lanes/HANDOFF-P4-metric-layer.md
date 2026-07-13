# HANDOFF — Task 7 Complete: P4 Semantic Metric Layer & Provenance

**Session:** 2026-07-13 (continuation)
**Plan:** `plans/2026-07-13-fast-response-chatbot-lanes/`
**Task completed:** P4 — Semantic Metric Layer & Provenance (foundation)
**Previous tasks:** P0 ✅, P0.5 ✅, FAQ ✅, P1 ✅, P3 ✅, P2 ✅
**Next task:** P5 Governance, Scale & Evaluation

---

## What was done this session

Built the **semantic metric layer foundation**: a declarative registry of 15 business metrics, the provenance taxonomy (Observed/Calculated/Forecast/Assumption), schema support for provenance on KPI widgets, and the first consumer (summary lane tagging its values). This is the foundation; the full `pnl.service.ts`/`reporting.service.ts` refactor is deferred to staging (needs golden-value parity verification per the user's staging preference).

### Files created/modified (8)

**New:**
- **`backend/src/services/metrics/metric-types.ts`** — `MetricCategory`, `MetricDef`, `ProvenanceTag` interfaces + `toProvenance()` helper.
- **`backend/src/services/metrics/metric-registry.ts`** — 15 metric definitions: revenue_ex_vat, gross_profit, total_cost, period_revenue, period_gross_profit, adjusted_gross_profit, fuel_liters, fuel_cost, road_allowance, driver_salary_per_trip, driver_net_salary_monthly, receivables_outstanding, payables_outstanding, trip_count, trucks_in_transit. Each has formula, unit, category, source, entity-field mapping, and drift notes. Public API: `getMetric(id)`, `getAllMetrics()`, `getMetricIds()`, `getMetricByEntityField()`.
- **`backend/src/tests/metric-registry.test.ts`** — 30 tests: registry contract (4), key metrics present (15), drift documentation (2), entity-field resolution (3), provenance schema (4), KPI widget with provenance (2).

**Modified:**
- **`shared/src/schemas/agent.ts`** — new `provenanceSchema` (`{metricId?, category: 'observed'|'calculated'|'forecast'|'assumption', formula?}`); added optional `provenance` field to `kpi_grid` items.
- **`shared/src/index.ts`** — exported `provenanceSchema` + `Provenance`.
- **`backend/src/services/agent/summary-lane.ts`** — `buildKpiWidget` now tags each value with provenance (revenue/profit = calculated; counts = observed).
- **`frontend/src/components/agent/InsightCard.tsx`** — provenance chip rendering (📏 observed / 🧮 calculated / 🔮 forecast / 💭 assumption) with formula tooltip.
- **`frontend/src/components/agent/agent.css`** — (provenance styles can be added; the emoji chips are inline).

### Drift risks documented (from the scout audit)

The metric scout found two **HIGH drift risks** now documented in the registry:

1. **Revenue**: `pnl.service.ts` strips VAT (`revenue / (1+vat)`) but `trip-queries.service.ts:332` sums raw `revenue` (incl-VAT). The bot and the trip list show **different numbers** for "total revenue." Documented in `revenue_ex_vat.driftNote` and `period_revenue.driftNote`.

2. **Driver salary**: per-trip allocation uses divisor=26 (fixed), monthly payroll uses calendar-days-minus-Sundays (varies). Deliberately different but confusing. Documented in both salary metrics.

### Verification
- **Metric registry tests:** 30/30 pass.
- **Backend + frontend typecheck:** clean.
- **Full suite:** 608 tests, **607 pass**, 1 pre-existing fail.
- **Zero regressions:** all prior tests (P0–P3) still pass.

### What was NOT done (deferred to staging)
- **Porting `pnl.service.ts` / `reporting.service.ts` to consume the registry** — this is the large refactor. It requires golden-value parity verification on a staging DB (snapshot old outputs, port metric-by-metric behind a flag, verify zero drift). Per the user's staging preference, this must be done in staging, not blind in a session.
- **Making `data.aggregate` resolve via `getMetricByEntityField`** — the registry has the entity-field mapping but the semantic-data gateway doesn't yet call it. This is a follow-up wiring task.

---

## Cumulative progress: 7 of ~12 tasks done (~58%)

| # | Task | Status | New tests | Key impact |
|---|------|--------|-----------|------------|
| 1 | P0 Instrumentation | ✅ | 5 | TTFT + intent_bucket |
| 2 | P0.5 final_schema | ✅ | 18 | 27% error → <5% |
| 3 | FAQ diagnosis | ✅ | 0 | 5 new FAQs |
| 4 | P1 Intent Router | ✅ | 36 | Nav: 0 LLM |
| 5 | P3 Summary Lane | ✅ | 19 | Summary: 0 LLM |
| 6 | P2 Knowledge Lanes | ✅ | 15 | doc-RAG + citations |
| 7 | **P4 Metric Layer** | **✅** | **30** | **Registry + provenance** |
| | **Total** | **7 done** | **123 new tests** | **607/608 pass** |

## Remaining tasks

| Task | Priority | Effort |
|------|----------|--------|
| **P5 Governance, Scale & Evaluation** | Medium | L |
| P0.3 MiniMax `<think>` stream spike | Low | S |
| P0.4 model-tier spike | Medium | M |
