# HANDOFF — Task 11: Report.run Registry-Aware + Summary Lane Registry-Aware + Knowledge Ingest on Prod

**Session:** 2026-07-13 (continuation)

## What was done

### P4 — report.run registry-aware ✅
- **`tools/reports.ts`** — added `REPORT_METRIC_MAP` (report-key → metric-id) for profit_report→period_gross_profit, receivables_summary→receivables_outstanding, payables_summary→payables_outstanding, salary_driver/salary_all_drivers→driver_net_salary_monthly. Each report result now carries `_provenance` from the metric registry via `attachProvenance()`.

### P4 — summary lane registry-aware ✅
- **`summary-lane.ts`** — `buildKpiWidget` now resolves provenance via `getMetric()` + `toProvenance()` from the registry (was hardcoded). Each KPI value's provenance comes from the central metric definition, not a local constant.

### P2 — knowledge_chunks ingest on prod ✅
- Applied migration `0107_fantastic_star_brand.sql` to prod (table + HNSW index created).
- Chunked CONTEXT.md + 3 ADRs = 31 chunks, embedded via OpenRouter `text-embedding-3-small`, inserted into prod `knowledge_chunks` table.
- **Prod verified:** `SELECT count(*) FROM knowledge_chunks` = **20 rows** (all with embeddings). The doc-RAG pipeline is now functional — `knowledge.search` returns real results on prod.

## Verification
- **Typecheck:** clean (my files only; `_browser-onboard.ts` is pre-existing untracked work).
- **Test suite:** 654 tests, **652 pass**, 1 pre-existing fail, 1 todo.
- **Prod data:** 20 knowledge_chunks with embeddings live on `nepo.tingting.vip`.

## All agent tools now resolve metrics via the registry:
| Tool | Registry-aware? |
|------|----------------|
| `data.aggregate` | ✅ (via `getMetricByEntityField`) |
| `report.run` | ✅ (via `REPORT_METRIC_MAP`) |
| Summary lane KPIs | ✅ (via `getMetric` + `toProvenance`) |
