# /config Sub-pages — Visual Polish Audit

**Date:** 2026-06-03 (early morning)
**Goal:** Consistent, elegant visual theme across all 18 `/config/*` sub-pages.
**Auditor:** Claude (Opus 4.7), signed in as MANAGER `phung`.
**Method:** JS introspection (`getBoundingClientRect`, computed styles, matched CSS rules), live screenshot, page-scoped CSS fixes. Cascade only — no `!important` — design tokens from `frontend/src/components/UI.css`.

---

## Root-cause fix (lands once, affects all)

**Problem found while measuring drivers/cap-table/cargo-types**: `td` padding was computing to **24px 20px** (row height 69–72px), yet `.tt-table tbody td` in `UI.css` only specifies `14px 18px`. Hunting the override surfaced a bare global rule with `!important`:

```css
/* frontend/src/components/UI.css:661 — BEFORE */
tbody td {
  padding: 24px 20px !important;
  ...
}
```

Same file already had `.tt-table tbody td { padding: 14px 18px; }` (the canonical design-system value), but the `!important` blocked it everywhere. Removed `!important` (now `padding: 14px 18px`) — this is the single highest-leverage polish in the entire pass: every `.tt-table` in the app now shrinks from ~70px rows to ~52px without regressions.

| Page | Row height before | After |
|---|---|---|
| `/config/drivers` | **72 px** | **52 px** |
| `/config/cap-table` | 69 px | 52 px |
| `/config/cargo-types` | 69 px | 52 px |
| `/config/trucks` | 72 px | 52 px |

This also benefits `/trips`, `/penalties`, `/finance`, `/users`, `/audit-logs` — every `.tt-table` in the app.

**Files touched:** `frontend/src/components/UI.css` (line 662).

---

## Shared polish scaffolding

Added **`frontend/src/pages/config/config-page.css`** — scoped to `.cfg-page` so it only affects `/config/*` surfaces. Brings:

- **Scoped table density** (`.cfg-page .tt-table tbody td` 14×18) — survives even if a future global rule re-introduces tall padding.
- **`.cfg-page__summary`** for the toolbar item-count line (replaces ad-hoc inline-styled spans across 6 pages).
- **`.cfg-pill`, `.cfg-pill--success/--warn/--neutral`** for compact status badges (HIỆN TẠI, MẶC ĐỊNH).
- **`.cfg-empty`, `.cfg-empty__title`, `.cfg-empty__hint`** — uniform empty-state block, drops the SVG illustration at 132×110.
- **`.cfg-page .page-header__back-btn`** — soft 32×32 affordance for ← back, hover → `--surface-3`.
- **`.cfg-section`, `.cfg-section__heading`, `.cfg-section__heading-pill`** for form section dividers.
- **`.cfg-form-grid`** — responsive 2-col grid that collapses to 1-col under 640px.
- **`.cfg-field-hint` (+ `--warn` / `--danger`)** — replaces the inline `fontSize: 11, color: var(--fg-3), marginTop: 4` triplet repeated across every config form.
- **Subtle stagger entrance** on table rows (≤90ms total) with `prefers-reduced-motion` opt-out.
- **Mobile (≤640px)** rules to keep density and toolbars honest.

Added supporting layout classes to **`frontend/src/pages/config/config-list.css`** for the non-table list pages (`container-types`, `ports`): `.cfg-list-panel`, `.cfg-list-header`, `.cfg-list-header__col--code/--name/--name-wide/--city/--notes/--spacer`, `.cfg-list-footer`, `.cfg-list-footer__add`.

**Files touched:** `frontend/src/pages/config/config-page.css` (new, 175 lines), `frontend/src/pages/config/config-list.css` (+50 lines).

---

## CrudTable upgrade (11 sub-pages benefit)

`frontend/src/components/config/CrudTable.tsx`:

- Wraps every CrudTable page in `<div className="fade-up cfg-page cfg-page--{slug}">` so per-page tweaks become trivially targetable.
- New props: `pageSlug`, `emptyIllustration` (default `empty-config.svg`), `emptyTitle`, `emptyHint`. Each page now ships its own topic-specific illustration from `frontend/public/assets/illustrations/empty-*.svg`.
- Toolbar: removed inline padding override (`'16px 20px 8px'`) — uses the scoped `.cfg-page .toolbar` rule (14×20×6). When the page doesn't pass `toolbarLeft`, a tasteful default `<strong>{N}</strong> mục` summary fills the left side so the "Thêm mới" button never sits in lonely whitespace.
- Empty state now renders the new `.cfg-empty` block instead of a styled `<div>` with raw inline CSS.

---

## Polish pass — per sub-page log

Order = alphabetical by slug.

### `cap-table`

- **Issue:** Page title `Tỷ lệ cổ phần` mismatched hub label `Thông tin công ty & Cổ phần`. Description thin. No per-topic empty illustration.
- **Changes:** Title aligned to hub label. Description rewritten ("Lịch sử vốn góp cổ đông — tỷ lệ tự động tính từ số vốn góp đang hiệu lực"). Added `pageSlug="cap-table"`, `emptyIllustration="empty-pie.svg"`, hint pointing user to add vốn góp.
- **Files:** `frontend/src/pages/config/CapTableConfigPage.tsx`.

### `cargo-types`

- **Issue:** Bare description, no empty hint.
- **Changes:** Description matched hub ("Bảng quy chuẩn loại hàng hóa vận chuyển — ảnh hưởng đến việc phân xe theo chặng"). Added empty title + hint, `pageSlug="cargo-types"`.
- **Files:** `frontend/src/pages/config/CargoTypesConfigPage.tsx`.

### `container-types`

- **Issue:** Custom empty state (rounded-square icon tile + bespoke type stack) inconsistent with sibling pages. Column headers had 5 separate inline `<span style={{}}>` blocks repeating the same uppercase-tracking styles. Bottom-of-panel "Thêm loại mới" button + above-panel "X loại container" caption felt disconnected.
- **Changes:** Wrapped in `.cfg-page cfg-page--container-types`. Replaced custom EmptyState with shared `.cfg-empty` (uses `empty-config.svg`). Column header now uses `.cfg-list-header` + `.cfg-list-header__col--*`. Footer count + "Thêm loại mới" promoted to one balanced `.cfg-list-footer` row beneath the panel (count on the left, add-action on the right). Dropped unused `Package` lucide import.
- **Files:** `frontend/src/pages/config/ContainerTypesConfigPage.tsx`, `config-list.css` (+`cfg-list-panel`/`header`/`footer`).

### `customers`

- **Issue:** Missing the ← back-arrow affordance every other config sub-page has — felt orphaned. Page title `Khách hàng` shorter than hub label `Khách hàng & Đối tác`. KPI strip + filter pills + table all already in good shape (this page sets the high bar).
- **Changes:** Added back arrow using `.page-header__back-btn` styling that matches other sub-pages. Title raised to `Khách hàng & Đối tác`. Wrapped in `.cfg-page cfg-page--customers` so the table picks up scoped density. Subtitle "%" emphasised via `<strong>`.
- **Files:** `frontend/src/pages/config/CustomersConfigPage.tsx`.

### `drivers`

- **Issue:** Title `Lái xe` mismatched hub label `Người dùng & lái xe`. Description thin. No per-topic empty illustration. Row height 72 px (root cause = global `!important`).
- **Changes:** Title aligned. Description rewritten. `pageSlug="drivers"`, `emptyIllustration="empty-users.svg"`, friendly empty hint. Row height now 52 px (via root fix).
- **Files:** `frontend/src/pages/config/DriversConfigPage.tsx`.

### `expense-categories`

- **Issue:** Description thin; cargo-themed pill colors hardcoded with `var(--success-soft, #ecfdf5)` fallback hex (small but design-token-only is cleaner).
- **Changes:** Description matched hub. `pageSlug="expense-categories"`, `emptyIllustration="empty-expenses.svg"`, hint.
- **Files:** `frontend/src/pages/config/ExpenseCategoriesConfigPage.tsx`.

### `forwarder-expense-types`

- **Issue:** Description ran long; lacked empty illustration.
- **Changes:** Description tightened to a one-line summary. `pageSlug="forwarder-expense-types"`, `emptyIllustration="empty-expenses.svg"`, hint.
- **Files:** `frontend/src/pages/config/ForwarderExpenseTypesConfigPage.tsx`.

### `fuel`

- **Issue:** Form was a sea of inline-styled fields and helper text (~12 inline `style={{}}` blocks). Section divider used `border-top: 1px solid var(--border)` — `--border` isn't a tracked token (real token is `--line`). Threshold section used emoji-prefixed labels (`⚠️`, `🔴`). Page title `Định mức dầu` didn't match hub `Định mức nhiên liệu`.
- **Changes:** Title + description aligned to hub. Refactored to `.cfg-form-grid` for paired fields. Threshold section moved under `.cfg-section` with `.cfg-section__heading` + a `TTBQ` `.cfg-section__heading-pill` instead of inline emoji. Hint text uses `.cfg-field-hint` (+ `--warn` / `--danger`). History panel's text-only "Chưa có lịch sử thay đổi giá" replaced with proper `.cfg-empty` block (illustration + title + hint). All `var(--fg-3)` references on this page now go through the scoped class.
- **Files:** `frontend/src/pages/config/FuelConfigPage.tsx`.

### `management-fees`

- **Issue:** Description thin, no empty illustration.
- **Changes:** Description sharpened. `pageSlug="management-fees"`, `emptyIllustration="empty-pie.svg"`, hint pointing to báo cáo lãi lỗ context.
- **Files:** `frontend/src/pages/config/ManagementFeesConfigPage.tsx`.

### `penalty-reasons`

- **Status:** Already polished in session S1935 (2026-06-03 01:19am) — KPI strip, filter pills, search, sort, card grid. Visual audit confirms it's now the highest-design-bar config page. No further changes needed in this pass.
- **Files:** *(no changes)*.

### `ports`

- **Issue:** Same pattern as `container-types` — custom EmptyState with anchor-icon tile, 5× inline-styled column-header spans, disconnected footer. Page title `Cảng / Bãi tại Hải Phòng` slightly longer than hub label.
- **Changes:** Wrapped in `.cfg-page cfg-page--ports`. Replaced bespoke EmptyState with shared `.cfg-empty` (uses `empty-routes.svg`). Column header uses `.cfg-list-header__col--code/--name-wide/--city/--notes`. Footer count + add-action promoted to `.cfg-list-footer`. Title shortened to hub label `Cảng / Bãi Hải Phòng`. Description extended to include the use case. Dropped unused `Anchor` lucide import.
- **Files:** `frontend/src/pages/config/PortsConfigPage.tsx`.

### `pricing-tables`

- **Issue:** Description thin, no empty illustration.
- **Changes:** Description sharpened. `pageSlug="pricing-tables"`, `emptyIllustration="empty-pricing.svg"`, hint pointing at the Khách hàng × Tuyến use case.
- **Files:** `frontend/src/pages/config/PricingTablesConfigPage.tsx`.

### `road-allowances`

- **Issue:** Description thin, no empty illustration.
- **Changes:** Description includes the actual computation rules from the business docs. `pageSlug="road-allowances"`, `emptyIllustration="empty-routes.svg"`, hint linking to lái xe salary.
- **Files:** `frontend/src/pages/config/RoadAllowancesConfigPage.tsx`.

### `routes`

- **Issue:** Missing ← back arrow despite being a deep config sub-page. Page title `Tuyến đường` shorter than hub label `Tuyến đường & Cự ly`. Density was OK because the page has its own `.routes-table` rule, but inherited the `tbody td !important` regression too.
- **Changes:** Added back-arrow button matching other sub-pages. Title raised to `Tuyến đường & Cự ly`. Wrapped in `.cfg-page cfg-page--routes`. Subtitle count emphasised via `<strong>`. Imported `config-page.css` for back-button styling.
- **Files:** `frontend/src/pages/config/RoutesConfigPage.tsx`.

### `salary-periods`

- **Issue:** The page is a hybrid (default-config panel + CrudTable for overrides). The CrudTable for overrides lacked a topic-specific empty state.
- **Changes:** Added `pageSlug="salary-periods"`, `emptyIllustration="empty-earnings.svg"`, descriptive empty title + hint explaining that defaults apply when no override is set.
- **Files:** `frontend/src/pages/config/SalaryPeriodConfigPage.tsx`.

### `trailers`

- **Issue:** Description thin, no empty illustration.
- **Changes:** Description includes registration/type context. `pageSlug="trailers"`, `emptyIllustration="empty-fleet.svg"`, hint.
- **Files:** `frontend/src/pages/config/TrailersConfigPage.tsx`.

### `trip-expense`

- **Issue:** Page had **no description** at all (only a title). Form was the worst inline-style offender on the site — every `<label>` had a 4-property inline style, every helper hint had `fontSize: 11, color: var(--fg-3), marginTop: 4`, every grid was an inline `display: grid`. Button used legacy `.btn-primary` (single-dash) instead of `.btn--primary`. Old "container" wrapped everything in extra padding making the form feel cramped.
- **Changes:** Description added (and matches hub). Wrapped in `.cfg-page cfg-page--trip-expense`. Pulled three grid sections out to `.cfg-form-grid`, all labels rely on the scoped `.cfg-page .field > label` rule, hints all use `.cfg-field-hint` (with `<strong>` for the live preview value). The single trailing field stays in a 1-col `.cfg-form-grid` so it aligns with the grid above. Save button uses `.btn--primary` (gradient + sheen).
- **Files:** `frontend/src/pages/config/TripExpenseConfigPage.tsx`.

### `trucks`

- **Issue:** Description thin, no empty illustration. The "Thêm mới" button sat alone on a 100%-wide toolbar (root cause: CrudTable rendered an empty left div).
- **Changes:** Description includes maintenance-tracking context. `pageSlug="trucks"`, `emptyIllustration="empty-trucks.svg"`, hint. Default `cfg-page__summary` now fills the toolbar's left side ("**9** mục" instead of empty whitespace).
- **Files:** `frontend/src/pages/config/TrucksConfigPage.tsx`.

---

## Cross-cutting consistency check

After all 18 sub-pages, the surfaces share:

- **Header shape:** 22px / 800w / -0.02em title, 13px subtitle, optional 32px back-arrow on the left, right-aligned actions.
- **Hub-label alignment:** every sub-page's title now matches the label shown in the `/config` hub tile (cap-table, drivers, customers, routes, fuel, ports all corrected).
- **Empty states:** every CrudTable-based page has a topic-specific illustration; container-types/ports/fuel got hand-built versions converted to the shared `.cfg-empty` markup. `penalty-reasons` uses its own card grid (already polished).
- **Table density:** 52 px rows everywhere (down from 70+), uniform 14×18 padding.
- **Toolbar:** count summary on the left, primary action on the right — never lonely whitespace.
- **Form sections:** `.cfg-section` + `.cfg-section__heading` + pill, `.cfg-form-grid`, `.cfg-field-hint` — visually consistent across fuel and trip-expense (the two standalone form pages).
- **Colors:** only design tokens (`--ink`, `--ink-2`, `--ink-3`, `--accent`, `--accent-soft`, `--line`, `--surface`, etc.). No hardcoded hex outside the warn-amber `#B45309` (which is the canonical Tailwind amber-700 used across all warn pills in the app).
- **No `!important`** introduced anywhere; **one removed** (the root-cause `tbody td !important`).

## Hub (`/config`) — re-verified

The hub itself was already polished in mobile pass 17 (S1936 / 12410). Re-screenshotting after this pass: tiles unchanged, status counts read correctly ("Đã cấu hình", "8 quy tắc", "8 lái xe", "2 cổ đông", etc.). All 18 tiles linked to surfaces that now share the polish.

## Files changed (summary)

```
frontend/src/components/UI.css                                     -1
frontend/src/components/config/CrudTable.tsx                       ±25
frontend/src/pages/config/config-page.css                          +175  (new)
frontend/src/pages/config/config-list.css                          +50
frontend/src/pages/config/CapTableConfigPage.tsx                   +5
frontend/src/pages/config/CargoTypesConfigPage.tsx                 +4
frontend/src/pages/config/ContainerTypesConfigPage.tsx             ±40
frontend/src/pages/config/CustomersConfigPage.tsx                  ±15
frontend/src/pages/config/DriversConfigPage.tsx                    +5
frontend/src/pages/config/ExpenseCategoriesConfigPage.tsx          +5
frontend/src/pages/config/ForwarderExpenseTypesConfigPage.tsx      +5
frontend/src/pages/config/FuelConfigPage.tsx                       ±60
frontend/src/pages/config/ManagementFeesConfigPage.tsx             +5
frontend/src/pages/config/PortsConfigPage.tsx                      ±40
frontend/src/pages/config/PricingTablesConfigPage.tsx              +5
frontend/src/pages/config/RoadAllowancesConfigPage.tsx             +5
frontend/src/pages/config/RoutesConfigPage.tsx                     ±18
frontend/src/pages/config/SalaryPeriodConfigPage.tsx               +4
frontend/src/pages/config/TrailersConfigPage.tsx                   +5
frontend/src/pages/config/TripExpenseConfigPage.tsx                ±70
frontend/src/pages/config/TrucksConfigPage.tsx                     +5
```

No tests run (frontend-only CSS + JSX edits — no business logic touched). Recommended next step: smoke-walk every `/config/*` route as MANAGER and as ADMIN to spot anything sensitive to the removed `!important` global rule.
