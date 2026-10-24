# ADR 0045 — Density primitives: shared tokens instead of per-page hero/KPI copies

- **Status:** Accepted
- **Date:** 2026-10-25
- **Relates to:** NEPO-16 (Shared density primitives, audit 24/10); consumes verdict "b" from the DeepSeek consult 24/10 (tokens/components only — do NOT copy the FinancePage layout wholesale).
- **Parts touched:** `frontend/src/design-system/{Pagination,AutoHideColumn,SubLine,DenseKpi}` + `Density.css`, consumers: `/customers`, `/debt`, `/payables`, `/expenses`, `/forwarder-trips`, `/forwarder-advances`, `/forwarder-settlements`, driver `/earnings`.

## Context

The 24/10 UI audit found the same five defects on ≥5 list pages because each
page hand-rolls its own list chrome:

1. Pagination controls render even with ≤1 page (dead buttons + size selector).
2. Hero KPI rows repeat the PageHeader subtitle verbatim (one number, two sources).
3. Columns whose every value is a placeholder ('—') still render full width.
4. Muted sub-lines (phone/alias) render their '—' fallback as a stray underscore.
5. Count-up animations write money values out-of-band of React, so a reload
   catches wrong temporary figures (already removed on /debt, /payables by QA).

FinancePage's summary strip (`FinancePage.css` `.pnl-kpi*`) is the de-facto
house density reference: KPI padding 14–16px, value `--fs-2xl` on one line,
no blank footer under a table that has no rows.

## Decision

Codify the numbers as tokens and small primitives in `design-system/`; pages
consume them instead of copying layouts:

- `Density.css` — `--kpi-pad-y/x` (14/16px), `--kpi-value-size` (`--fs-2xl`),
  `--table-row-min-h` (44px) + `.ds-kpi*` classes (the **zero-row rule** lives
  in the pagination primitive: no controls, only the count line, when a list
  has ≤1 page / no rows).
- `Pagination` — auto-hides prev/next, page buttons, size selector and the
  infinite sentinel when `totalPages <= 1`; the count line stays.
- `AutoHideColumn` — `hasColumnData()` / `useAutoHideColumn()` predicate;
  header and cell sides call it with the same values array so `<th>`/`<td>`
  counts can never disagree.
- `SubLine` — muted second line that renders nothing for null/''/'—'.
- Money values never animate: `useCounterAnimation` is no longer used by any
  `pages/` component (`grep useCounterAnimation frontend/src/pages` = 0). The
  hook remains for the dashboard feature pending its own ticket.

## Consequences

- Per-page content decisions (merging hero bands, aging layouts) stay with the
  per-page wave tickets — the primitives only remove the *mechanical* defects.
- New list pages get the correct behavior by default; the audit's repeat
  defects cannot reintroduce themselves one page at a time.
- The strict `minDistinct` mode of AutoHideColumn is available for later waves
  that want single-value columns collapsed too (default keeps ≥1 value visible,
  per the NEPO-16 acceptance criteria).
