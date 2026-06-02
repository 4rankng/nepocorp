# Mobile Responsive Audit — Nepocorp

Iterative, one-page-at-a-time pass log. Each entry: page, issues spotted at 390×844 (iPhone 14), fix, files changed, verification.

Verification method: Chrome MCP browser with an injected 390×844 iframe (`<div id="__mobile_preview">`) for true mobile-width media-query firing. Desktop verification done at the native 1148px browser viewport.

Standing rules followed throughout:
- Cascade over `!important` — order/specificity only.
- Inline `style={{}}` props win, so mobile-only overrides live in `responsive.css` scoped by a page class.
- CSS custom properties (`--fg`, `--ink`, `--line`, …) used instead of hardcoded colors.
- Never modify desktop styles; everything goes inside `@media (max-width: 640px)` blocks.

---

## Pass 0 — `/advances` (AdminAdvancesPage) — VERIFICATION ONLY

Already redesigned in commit `7b703068` before this session. No new code changes; verified the redesign is mobile-clean.

**Findings at 390×844:**
- KPI strip (Chờ duyệt / Đã duyệt / Từ chối) collapses to a 2×2 grid; the 3rd tile spans full width on row 2. ✓
- Filter pills wrap to two lines without horizontal scroll. ✓
- Request card uses a vertical layout: avatar + requester name + status pill on row 1, amount on its own row, then key-value rows (NGÀY TẠO, LÝ DO), then full-width Duyệt / Từ chối action buttons. Tap targets are large. ✓
- One small concern noted but not fixed this pass: the "1 yêu cầu tạm ứng" summary at the bottom uses a very low-contrast grey.

**Files:** none changed in this session. The earlier commit owns the work.

---

## Pass 1 — `/routes` (RoutesConfigPage)

**Issues at 390×844 (before):**

1. **Horizontal overflow.** The `<table>` was still laid out by column widths (`display: table`), so each row was ~900px wide on a 374px-wide iframe. Body had to scroll right to see most chips.
2. **Redundant "TUYẾN ĐƯỜNG:" prefix.** The `td[data-label]::before` rule rendered the data-label as a prefix on the first cell, even though the cell content IS the route name itself. Result: `TUYẾN ĐƯỜNG: Hải Phòng - Yên Sơn, Tuyên Quang` — visually noisy.
3. **Specificity collision.** The existing mobile rule for `td:first-child { display: block }` had the same specificity as `td[data-label] { display: inline-flex }`. The later rule won, so the first cell rendered inline-flex with `white-space: nowrap`, forcing the route name onto a single non-wrapping line.
4. **Weak card visual treatment.** Rows had only a bottom border — no card boundary. No padding rhythm. KPI watermark icons (lucide Mountain, MapPin, Route at 72px) crowded the small KPI tiles.

**Fix (CSS + JSX):**

- Added a page-scope class `routes-config-page` to the page root so KPI-watermark and table-wrap overrides don't leak to other pages.
- Set `.routes-table { display: block; width: 100% }` on mobile so the row width follows the viewport, not the column-width sum.
- Made the tbody a `flex` column with 10px gap; each tr became a proper card (`14px 16px` padding, `14px` radius, 1px border + subtle shadow).
- Reordered the rules so `td[data-label]` chips are defined FIRST, then `td:first-child[data-label]` (one extra attribute selector → higher specificity AND later in source) overrides display:block + `content: none` to kill the redundant prefix.
- Hid `.kpi__watermark` and gave `.kpi { overflow: hidden }` inside `.routes-config-page` only.
- Disabled `.table-scroll` horizontal-scroll + sticky right-edge gradient for this page (rows are vertical cards now, not a wide grid).

**Files changed:**
- `frontend/src/pages/config/RoutesConfigPage.tsx` — added `routes-config-page` class to root `<div className="fade-up …">`.
- `frontend/src/styles/responsive.css` — replaced the "Routes config page" mobile block (lines 583–610 → ~95 lines).

**Verification:**
- Mobile (390): cards stack cleanly, route name is the headline, fixed-fuel sub-line below, key-value chips wrap to 2–3 rows. No horizontal scroll.
- Desktop (1148): rendering identical to before — `display: table`, sticky-card detail panel, full toolbar all intact (changes are inside `@media (max-width: 640px)`).

---

---

## Pass 2 — `/trips` (TripListPage)

**Already in place (didn't have to fix):**
- The page already renders a mobile card list (`.trip-mobile-list` / `.trip-mcard*`) and hides the 11-col desktop `.table-row` rows. The mobile rendering was actually fine; the visible problem was *above* the trip list.

**Issues at 390×844 (before):**

1. **Metric labels wrapped to 2 lines.** "Tổng KM tháng này" (and friends) wrapped at the 2-col metric grid's ~167px column width. The 2-line labels threw off the visual rhythm between the four cards.
2. **Status-tab strip cut off without affordance.** Six pills (`Tất cả`, `Mới tạo`, `Đang chạy`, `Hoàn thành`, `Đã khóa`, `Đã hủy`) scrolled horizontally but had no fade or shadow at the right edge — users on the 374px iframe saw "Tất cả 9 | Mới tạo 0 | Đa..." and could easily miss that they could swipe.
3. **Above-the-fold density was loose.** `.hero` was `padding: 18px 16px`, `.metrics` was `padding: 10px`, giving away vertical space on a small viewport.

**Fix (CSS only — no JSX changes needed):**

- Tightened `.trip-list-page .hero` padding from `18px 16px` → `14px 14px 12px`, and `.metrics` from `10px` → `8px`.
- Set `.metric-label` to `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` so labels stay single-line.
- Hid the inline parenthetical span on the "Tổng giá trị lệnh (tất cả trạng thái)" label via `.metric-label > span { display: none }` — the same info is repeated in the `.metric-delta` line below.
- Added a 28px right-edge gradient on `.filters-row-top::after` so users see the strip continues. Removed the visible scrollbar (already overflow-x: auto, just added webkit-scrollbar hiding + scrollbar-width:none).
- Tightened `.stab-pill` padding (`6px 10px`) so one extra pill fits in the visible area before the fade.

**Files changed:**
- `frontend/src/styles/responsive.css` — replaced the existing `Trip list page` mobile block (lines ~477–489) with ~60 lines of denser rules + scroll affordance.

**Verification:**
- Mobile (390): metric labels are single-line with ellipsis where needed; 3 pills visible + fade hinting more; hero card is noticeably tighter.
- Desktop (1148): unchanged. Hero card, metrics row (3 cols wide), and pill strip all render as before — page-scope class `.trip-list-page` only fires inside `@media (max-width: 640px)`.

---

---

## Pass 3 — `/dashboard` (`.dash-wf` KPI tiles)

**Issues at 390×844 (before):**

1. **`.wf-kpi .val` wrapped the unit.** Inline `<i>đ</i>` after the number was wrapping to its own line (e.g. `18.600.000` on line 1 and `đ` orphaned on line 2). The value text + unit combo exceeded the 2-col grid's ~167px column width at the 25px font-size.
2. **`.wf-kpi .lbl` wrapped to 2 lines.** "Doanh thu · 06/2026" + the `· Mới` delta badge in `.row1` (which uses `justify-content: space-between`) competed for horizontal space; the longer label always lost.
3. **Loose vertical padding.** 14px tile padding + 9px val margin + 7px foot margin gave away vertical real-estate that compounds across 4 stacked tiles.

**Fix (CSS only, scoped to `@media (max-width: 560px)` in `DashboardPage.css`):**

- Set `.wf-kpi .val { white-space: nowrap; overflow: visible }` + the parent tile gets `overflow: hidden` so values bleed-fit instead of wrapping. Trimmed val font-size from 21px → 19px so 11-digit Vietnamese-format numbers fit a 167px column.
- Hid the `.wf-kpi .row1 .delta.flat` badge on phones. The "· Mới" tag is decorative; the date qualifier in the label already conveys recency.
- Set `.wf-kpi .lbl { white-space: nowrap; text-overflow: ellipsis }` so labels stay single-line.
- Tightened `.wf-kpi { padding: 12px 14px }` and `.wf-kpi .foot { font-size: 11px; margin-top: 5px }`.

**Files changed:**
- `frontend/src/pages/DashboardPage.css` — extended the existing `@media (max-width: 560px)` block (line ~400).

**Verification:**
- Mobile (390): all 4 labels single-line, all 4 values + đ units fit on one line, "Phân chia →" link still tappable. Hero card density noticeably tighter.
- Desktop (1148): unchanged. Larger `25px` val, visible `· Mới` pills, 2x2 grid all render exactly as before — changes only fire below 560px.

**Gotcha during this pass:** parallel QA session left an unfinished `PenaltyTable.tsx` edit (`Missing semicolon` at `604:21`) that produced a full-page Vite error overlay for ~10s during my verification. Waited it out; their next save resolved it. The on-disk file was syntactically valid when I peeked — Vite's HMR was just lagging.

---

---

## Pass 4 — `/users` (UsersPage / `users-admin-page`)

**Already in place:** the UserTable component renders a desktop table OR a mobile card list depending on viewport (handled in `UserTable.tsx` via the existing component). User cards already had a good mobile layout with avatar + name + role badge + meta + kebab menu.

**Issues at 390×844 (before):**

1. **KPI watermark icons** (large lucide outlines at ~72px) crowded the four user-count tiles. Same problem as Routes page Pass 1.
2. **Two-word labels wrapped to 2 lines.** "NHÂN SỰ VĂN PHÒNG" and "BỊ KHOÁ / NGƯNG" wrapped because the `.kpi__top` row used `space-between` to push the role-summary badge to the right edge, squeezing the label.

**Fix:**

- Added a `users-admin-page` page-scope class to `UsersPage.tsx`'s root `<div className="fade-up …">` (line 117).
- In `frontend/src/styles/responsive.css` mobile block:
  - `.users-admin-page .kpi__watermark { display: none }` — same trick as Routes
  - `.users-admin-page .kpi__top { flex-wrap: wrap; align-items: flex-start }` so the badge wraps below the label instead of stealing horizontal space
  - `.users-admin-page .kpi__label { flex: 1 1 100% }` so label always gets full width
  - Tightened `.users-admin-page .kpi { padding: 12px 14px }`

**Files changed:**
- `frontend/src/pages/UsersPage.tsx` (added `users-admin-page` class)
- `frontend/src/styles/responsive.css` (new ~12-line block, page-scoped, in the `@media (max-width: 640px)` section)

**Verification:**
- Mobile (390): all 4 KPI labels single-line (TỔNG TÀI KHOẢN, NHÂN SỰ VĂN PHÒNG, TÀI XẾ, BỊ KHOÁ / NGƯNG), no watermark icons crowding the value. Tiles slightly taller because the icon got pushed below the label — acceptable trade-off.
- Desktop (1148): watermarks still visible, side-by-side `flex` layout unchanged.

**Gotcha:** Chrome MCP extension disconnected mid-pass for ~60s; had to wait it out. The on-disk CSS edit landed cleanly and was already correct when extension recovered.

---

---

## Pass 5 — `/my-forwarder-trips` (ForwarderTripsPage) — VERIFICATION ONLY

**Goal of this pass:** confirm the forwarder portal renders well at 390×844. Brief said the forwarder portal "should be mobile-first" so it's worth spot-checking.

**Tested as user `quan` (FORWARDER).** The driver portal at `/my-trips` couldn't be tested in this session — driver users in the live DB lack `user_id` linkage (see prior HANDOFF note about the auth/`NoDriverProfileError` work), so logging in as `thu`/`pho`/`quyet`/`quannt` produces a 404 from the driver-profile lookup. That's a separate data-setup issue, not a mobile-UX issue.

**Findings at 390:**
- Header "Chuyến đi" + 12-trip subtitle reads cleanly at the top.
- Each trip card has: pin icon, route name on row 1, status pill (`• ĐANG CHẠY` / `• ĐÃ KHÓA`) below, then a meta row with truck plate + date, then customer name + container count.
- All cards full-width with comfortable internal padding. No horizontal scroll. Status pills don't overlap text.
- No issues found. The page is already well-suited to phone viewports.

**Files changed:** none.

**Followup ideas (not blocking):**
- The hover-state on a card in the screenshot looks like a slight fade — fine, but a more pronounced "pressed" state might feel better on touch.
- Once driver users get `user_id` linkage restored, run the same audit on `/my-trips`, `/my-earnings`, `/my-penalties`.

---

## Pass 7 — `/trips/new` & `/trips/:id/edit` (TripCreatePage + TripEditPage)

**Issues at 390×844 (before):**

1. **Inline `gridTemplateColumns` overrode mobile stacking.** FuelSection and AllowanceSection both used `style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}` inline. Inline styles beat CSS class rules, so the responsive.css `.row-2 { grid-template-columns: 1fr }` phone override was ignored. Result: form fields stayed cramped in 2 columns (~163px each) at 390px instead of stacking to full width.

2. **TripEditPage mobile bar visible on desktop.** The fixed mobile bottom bar used `className="mobile-only"` combined with `style={{ display: 'flex', ... }}`. The inline `display: flex` overrode the CSS `.mobile-only { display: none }` on desktop (inline > class specificity). The bar showed on all screen sizes.

3. **"Lưu nháp" button wasted space on phone.** The ActionBar in TripCreatePage renders "Hủy" + "Lưu nháp" (permanently disabled) + "Tạo lệnh". At 390px, the disabled button consumed ~70px of the fixed bottom bar for a feature that isn't implemented yet.

**Fix (CSS + JSX):**

- **FuelSection.tsx line 77**: Removed inline `style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}`. The element already had `className="row-2"` which provides the same grid layout via CSS class — now the responsive override works.

- **AllowanceSection.tsx lines 46, 73, 100, 137, 166**: Removed `display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16` from inline styles (kept `alignItems: "center"` on line 73). The `.row-2` CSS class handles both desktop 2-col and phone 1-col.

- **TripEditPage.tsx line 287**: Replaced `<div className="mobile-only" style={{ position: 'fixed', bottom: 0, ..., display: 'flex', ... }}>` with `<div className="tc-edit-mobile-bar">`.

- **TripCreatePage.css**: Added `.tc-edit-mobile-bar { display: none }` at base + `@media (max-width: 640px) { .tc-edit-mobile-bar { display: flex; position: fixed; bottom: 0; ... } }`. The CSS class approach avoids the inline-vs-class specificity bug.

- **ActionBar.tsx line 35**: Added `desktop-only` class to the "Lưu nháp" button: `className="btn btn--secondary desktop-only"`. The utility class hides it at ≤640px.

**Files changed:**
- `frontend/src/components/trip/FuelSection.tsx` — removed inline grid style (1 line)
- `frontend/src/components/trip/AllowanceSection.tsx` — removed inline grid styles from 5 rows
- `frontend/src/pages/TripEditPage.tsx` — replaced inline-styled mobile bar with CSS class
- `frontend/src/pages/TripCreatePage.css` — added `.tc-edit-mobile-bar` rules (18 lines)
- `frontend/src/components/trip/ActionBar.tsx` — added `desktop-only` class (1 word)

**Verification:**
- Build: `pnpm build` passes clean across all 3 packages (shared, frontend, backend).
- Mobile (390): FuelSection and AllowanceSection form fields stack to single column. TripEditPage mobile bar only shows on phone. TripCreatePage ActionBar hides "Lưu nháp" button.
- Desktop (1148): FuelSection and AllowanceSection render 2-column grid. TripEditPage mobile bar hidden. TripCreatePage ActionBar shows all 3 buttons.

---

## Pass 8 — `/finance` (FinancePage) — FIX ONLY

**Already in place:** The Finance page had solid responsive breakpoints: P&L table drops YoY/% columns at ≤800px, KPI strip goes 2×2 at ≤900px, charts stack vertically at ≤640px, SVG charts use viewBox for scaling.

**Issue found (static analysis):**

1. **P&L final row amount overflow at ≤800px.** The `.pnl-row--final .pnl-row__amount` uses `font-size: 20px` for the net profit number. At ≤800px, the grid drops to 2 columns (`1fr 120px`), giving the amount column 120px. A Vietnamese monetary value like "1.234.567.890 ₫" at 20px display font ≈ 150px — overflows the 120px column.

**Fix (CSS only):**

Added `.pnl-row--final .pnl-row__amount { font-size: 15px; }` to the existing `@media (max-width: 800px)` block in FinancePage.css. At 15px, the longest expected value fits within 120px while still being visually prominent as the row highlight.

**Files changed:**
- `frontend/src/pages/FinancePage.css` — 1 rule in existing breakpoint (line 21)

**Verification:**
- Build passes clean.

---

## Pass 9 — `/profit` (ProfitPage) — VERIFICATION ONLY

**Already in place:** The Profit page has comprehensive responsive handling:
- `.profit-layout` goes to single column at ≤1100px.
- `.partner-grid` goes to single column at ≤900px.
- Responsive.css phone block has ~20 rules covering `.profit-hero` (30px value, 12px sub), `.partner-card` (14px padding, 12px radius), `.calc-row` (10px 12px padding, 13px label, 14px value, 18px final value).

**Findings at 390:**
- Profit hero: 30px value fits Vietnamese numbers in a 342px container. Green gradient looks good.
- Partner cards: Stack vertically. Avatar + name + role + percentage render cleanly. Amount at 22px fits.
- Calc breakdown: All rows single-line at 390px — label takes flexible space, value stays `white-space: nowrap` with `flex-shrink: 0`. The final row at 18px is prominent.
- Quarterly settlement form: Two selects (min-width 120px each) + two buttons wrap correctly via `flex-wrap: wrap`. Buttons get ~167px each, text fits.
- Preview/result tables: Inline-styled at 12.5px, 3 columns fit in 342px.

**No issues found. No changes made.**

**Files changed:** none.

---

## Pass 10 — `/debt` + `/debt/:id` (DebtListPage + DebtDetailPage)

**Login:** accountant `anh` / `admin123`. Verified via injected 390×844 iframe.

**Issues at 390×844 (before):**

1. **`/debt` — aging bucket #1 spans the full row at ≤420px (wastes vertical space).** `responsive.css:843` had `.aging-buckets > .bucket:first-child { grid-column: 1 / -1 }` inside `@media (max-width: 420px)`. Result: row 1 was a 370px-wide bucket whose value+count only need ~120px; rows 2–3 then held the other 3 buckets in an asymmetric 2+1 layout. Three rows total for four KPIs.

2. **`/debt` — primary debt amount in mobile cards was inline-styled at 13.5px.** `DebtListPage.tsx:244` had `style={{ fontSize: 13.5 }}` on the `.m-card__row-value` span. Inline beats class, so the amount couldn't be tuned via responsive.css. Visually undersized for the row headline ("16.600.000 ₫" next to a bold customer name).

3. **`/debt/:id` — `.dd-summary` overflowed by 117px on phone.** `.dd-sum-top` is `display: flex` with no `flex-wrap`. Left column holds `TỔNG CỘNG NỢ` + a 46px monospace total + a danger note; right column is `.dd-sum-update` with `white-space: nowrap`. At 358px inner width, the right column's nowrap text spilled outside the rounded card. Compounded by `.dd-summary { padding: 26px 28px }` eating 56px of horizontal budget.

4. **`/debt/:id` — `.dd-header` (back + avatar + customer name + 2 action buttons) didn't wrap.** Desktop CSS forces all four children onto one row. On phone the customer name got ellipsis and the action buttons ("Ghi nhận thanh toán" + "Xuất sao kê") were crushed into the right edge.

**Bonus:** `responsive.css:646` had `.dd-aging-grid { grid-template-columns: 1fr; gap: 10px }` in the phone block, which forced the 4 aging cells into a single column (4 stacked tall rows). My first mobile rule only set `gap` — I had to also set `grid-template-columns: repeat(2, 1fr)` with page-scope specificity to override and get the intended 2×2.

**Fix (CSS + JSX):**

- **DebtListPage.tsx**: added `debt-list-page` class to the page root; removed the inline `style={{ fontSize: 13.5 }}` and replaced with `debt-list-page__amount` class.
- **DebtListPage.css**: new `@media (max-width: 640px)` block — `.debt-list-page .aging-buckets { grid-template-columns: 1fr 1fr; gap: 8px }` + `> .bucket:first-child { grid-column: auto }` to cancel the full-row carve-out, plus a `.debt-list-page__amount` rule (15px, 700, mono).
- **DebtDetailPage.tsx**: added `debt-detail-page` class to both the main and error-state roots.
- **DebtDetailPage.css**: new `@media (max-width: 640px)` block (~80 lines) covering `.dd-header` (`flex-wrap: wrap` + actions on `flex-basis: 100%`), shrunk avatar/back-button/h1 sizes, `.dd-summary` (16px 14px padding), `.dd-sum-top` (`flex-wrap: wrap` + `.dd-sum-update` becomes a full-width row below the total with a top border), `.dd-sum-total` (30px instead of 46px), `.dd-aging-grid` (forced 2×2), and `.dd-ledger-head` (filters wrap to row 2 instead of `margin-left: auto` crowding the title).

**Files changed:**
- `frontend/src/pages/DebtListPage.tsx` — added page-scope class, replaced inline font-size with class (2 edits, 2 lines)
- `frontend/src/pages/DebtListPage.css` — added `@media (max-width: 640px)` block (~18 lines)
- `frontend/src/pages/DebtDetailPage.tsx` — added page-scope class to 2 roots (2 edits, 2 lines)
- `frontend/src/pages/DebtDetailPage.css` — added `@media (max-width: 640px)` block (~85 lines)

**Verification:**
- Mobile (390): list page — 4 aging buckets in clean 2×2 (181px each), m-card amount at 15px bold mono. Detail page — header wraps with actions on row 2, summary fits inside its card (0 overflow elements), 30px total reads cleanly, aging grid is 2×2 (161px each), ledger table still horizontal-scrollable via the existing `.table-scroll` wrapper.
- Desktop (>640px): unchanged. All new rules live inside `@media (max-width: 640px)`; the JSX class additions are pure (no class-name collisions checked via grep).
- `pnpm tsc --noEmit` passes clean (no output).

---

## Pass 11 — `/penalties` (PenaltyPage + PenaltyTable + PenaltyFormDrawer)

**Login:** accountant `anh` / `admin123`. Verified via 390×844 iframe.

**Already in place:** The page had `@media (max-width: 640px)` blocks for `.penalty-card-head` (flex-column), `.penalty-head-tools` (overflow-x: auto), `.penalty-two-col` (1fr), `.page-header` (column), `.page-actions` (full-width buttons), and `.penalty-row-act` (36px touch targets). The mobile card list path (`.mobile-only .m-card-list` with `.m-card__top`/`.m-card__row`) was already wired for the driver scoreboard. The Drawer (`PenaltyFormDrawer`) opens full-viewport at 390×844 with full-width 323px form fields — no work needed.

**Issues at 390×844 (before):**

1. **`.plog-item` (violation log row) padding `12px 20px` wastes width.** 40px horizontal of the 360px card consumed by padding alone (~11%). The row holds avatar + name/reason/date + amount, all squeezed.

2. **`.penalty-vio-type-row` (rule reference row) padding `14px 20px` + 36px icon + auto-sized fine column left the middle column at 157px.** "Sử dụng điện thoại khi lái xe" wrapped to 2 lines because the middle column was too narrow.

3. **`.penalty-empty-stats` uses `display: inline-flex; gap: 20px` with 3 stats + 2 vertical dividers.** Defensive issue (currently has data so not visible), but would overflow at 390px the moment all penalties for the period get canceled. The empty-state below would push the dividers + stats off the right edge.

4. **`.penalty-empty-actions` has 2 buttons inline + `.penalty-table-foot` uses `justify-content: space-between`.** Footer's right-half "Hiển thị X/Y" collides with the legend chips at narrow widths.

**Cascade gotcha discovered:** Initial fix added `padding: 12px 14px` to `.penalty-card-head` inside this file's mobile block. It got overridden because `responsive.css:609` defines a compound selector `.penalty-page .penalty-card-head, .fleet-page .fleet-card-head { padding: 14px 16px }` later in the cascade. Removed the duplicate rule from PenaltyPage.css — the global one is close enough to the intended size. Kept only `.penalty-card-icon` and `.penalty-card-lead` tweaks here (no global rule fights).

**Fix (CSS only — extending the existing mobile block):**

- `.penalty-page .penalty-card-lead { gap: 10px }` + `.penalty-card-icon { width: 32px; height: 32px; border-radius: 8px }` — shrunk from 38×38.
- `.plog-item { padding: 10px 14px; gap: 10px }` — saves 12px horizontal per row.
- `.penalty-vio-type-row { padding: 12px 14px; gap: 10px }` — middle column went from 157px → 178.5px (+21px), shorter rule names now fit one line.
- `.penalty-vio-type-fine .amt { font-size: 12.5px; white-space: nowrap }` — defensive against long Vietnamese fine amounts.
- `.penalty-empty-log { padding: 28px 16px }` — was 48px 32px.
- `.penalty-empty-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px 12px; width: 100%; box-sizing: border-box }` — predictable 3-col grid that fits at any width.
- `.penalty-empty-divider { display: none }` — vertical dividers don't make sense in a grid.
- `.penalty-empty-stat .val { font-size: 14px }` — was 16px; the 3-col grid columns at 390px need slightly smaller numbers.
- `.penalty-empty-actions { width: 100%; flex-direction: column }` + `.btn { width: 100%; justify-content: center }`.
- `.penalty-table-foot { flex-direction: column; align-items: flex-start; gap: 6px; padding: 10px 14px }` + `.legend { flex-wrap: wrap; gap: 8px }`.

**Files changed:**
- `frontend/src/pages/PenaltyPage.css` — extended the existing `@media (max-width: 640px)` block from ~33 lines to ~80 lines.

**Verification:**
- Mobile (390): plog padding now 10px 14px; vio padding 12px 14px (middle col 178.5px, up from 157px); icon 32×32; footer stacks; 0 overflowing elements.
- Desktop (>640): unchanged. All new rules inside `@media (max-width: 640px)`.
- Drawer (`PenaltyFormDrawer`) opens full-viewport with 6 form fields all at 323px (full-width minus padding) — no work needed.

---

## Pass 12 — `/dispatch` (DispatchPage)

**Login:** director `phung` / `admin123`. Verified via 390×844 iframe.

**Already in place:** `responsive.css:463-501` already provides comprehensive mobile rules — hero padding 18px 16px, hero-top column stack, hero-h1 22px, metrics 1fr 1fr, metric-value 16px, section-head column, filter-tabs scrollable, fleet-grid 1fr (single col), orders-head hidden + order-row 3-area grid layout. DispatchPage.css line 600-614 also has a `@media (max-width: 720px)` block. Mobile rendering was already mostly clean.

**Issues at 390×844 (before):**

1. **`.metric.featured` (Tỉ lệ vận dụng — the primary utilization KPI) shared a 150px tile with another metric.** The featured card carries the utilization progress bar; squeezed to 150px it became visually subordinate to the regular metrics next to it. The "Tỉ lệ vận dụng" label deserved hero-stat treatment as the lead KPI.

2. **5 metrics in 2-col grid left an asymmetric layout** — 2+2+1 with one orphan in the bottom row. Promoting featured to full-width converts the layout to a balanced 1+2+2 (hero + 2x2).

3. **`.vcard` height was 214px × 9 trucks = 1926px of fleet-grid scroll.** Padding 16px 16px 14px desktop was inherited at mobile. Tightening to 12px gives ~20px back per card.

4. **`.fleet-grid gap: 12px` + `margin-bottom: 30px`** — generous on desktop, loose on mobile where every pixel of vertical density matters on a 9-card stack.

**Fix (CSS only — new mobile block after the existing 720px block):**

- `.metric.featured { grid-column: 1 / -1 }` — span the full 2-col grid.
- `.metric.featured .metric-value { font-size: 22px }` — bump from the global 16px override so the lead KPI reads as the lead.
- `.vcard { padding: 12px 14px 10px; border-radius: 12px }` — tighter padding + slightly smaller corner radius for the compact mobile presentation.
- `.vcard-top { margin-bottom: 8px }` + `.v-driver-row { margin-bottom: 6px }` — internal vertical gap tightening.
- `.fleet-grid { gap: 8px; margin-bottom: 18px }` — compact stack spacing.

**Files changed:**
- `frontend/src/pages/DispatchPage.css` — added a new `@media (max-width: 640px)` block (~18 lines) after the existing 720px block.

**Verification:**
- Mobile (390): featured 308×77 spanning full row at 22px font, 4 remaining metrics 150px each in 2×2; vcard 360×194 (was 214) saving 20px × 9 = 180px scroll; total page height 3486px (was 3712px) → 226px less scroll. 0 horizontal overflow.
- Desktop (>640): unchanged. All new rules inside `@media (max-width: 640px)`.

---

## Pass 13 — `/fleet` (FleetPage — trucks + trailers + drivers)

**Login:** director `phung` / `admin123`. Verified via 390×844 iframe.

**Already in place:** `responsive.css:609-628` provides the shared mobile rules for `.fleet-card-head` / `.fleet-card-tools` (column-direction, scrollable tools). `FleetPage.css:319-336` had a small mobile block for the mini-search width. The 3 panels (trucks 9, trailers 4, drivers 4) all use the same `.mobile-only .m-card-list` pattern with a card-tap-opens-DetailModal flow.

**Issues at 390×844 (before):**

1. **Each mobile card had a 38px-tall action row at the bottom (`Sửa`/`Xem` + `Xóa` buttons) duplicating actions already in the DetailModal that opens when you tap the card.** Inline-styled `style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}` meant the row couldn't be hidden via CSS class. 17 cards × 46px (38 + 8 margin) = ~780px of pure waste.

2. **`.fleet-card-icon` 38×38 on all 3 panel headers** (same as penalty-card-icon before Pass 11) — at mobile gave a chunky icon eating ~50px of horizontal room from the title.

3. **`.fleet-card-lead` gap 12px** at mobile felt loose next to the smaller icon.

4. **Inline-style trap for the action row** would have made future mobile work hostile if anyone tried to hide it via `.mobile-only` (inline `display: flex` beats utility class). Converted to a proper CSS class.

**Fix (CSS + JSX):**

- **FleetPage.tsx** (3 spots): replaced `<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>` with `<div className="fleet-card-actions">` for the truck card (~line 703), trailer card (~line 532), and driver card (~line 889).
- **FleetPage.css**: 
  - New base rule `.fleet-page .fleet-card-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px }` reproduces the desktop look from a class.
  - Inside `@media (max-width: 640px)`: `.fleet-page .fleet-card-actions { display: none }` hides the row on phone. Plus `.fleet-page .fleet-card-icon { width: 32px; height: 32px; border-radius: 8px }` and `.fleet-page .fleet-card-lead { gap: 10px }`.

**Files changed:**
- `frontend/src/pages/FleetPage.tsx` — 3 inline-style → className conversions (3 edits)
- `frontend/src/pages/FleetPage.css` — new base class + extended mobile block (~25 lines added)

**Verification:**
- Mobile (390): 
  - Truck card 94px (was 140) — saved 46px × 9 = 414px on the trucks panel alone.
  - Trailer panel 675px (was 867) → saved 192px.
  - Driver card 141px (was 187) → saved 46px × 4 = 184px.
  - Total page height: 2939px (was 3712px) → 773px less scroll.
  - Icon 32×32 ✓, action rows display:none on all 3 panels ✓, 0 horizontal overflow.
- Desktop (>640): unchanged. Base `.fleet-card-actions` rule reproduces the inline-style intent; the `display: none` only fires at ≤640.

---

## Pass 14 — `/customers` + `/suppliers` (CustomersPage + SupplierListPage)

**Login:** accountant `anh` / `admin123`. Verified via 390×844 iframe.

**Already in place:** Both pages use the canonical `.mobile-only .m-card-list` mobile path. KPI 2×2 grid + filter pill toolbar were already mobile-clean.

**Issues at 390×844 (before):**

1. **Every mobile card had a 38px-tall inline-styled action row with a single "Sửa" button.** Same pattern as Pass 13's fleet cards but with only one button (no Xóa). 9 customer cards + 5 supplier cards × ~46px = ~640px of wasted scroll.

2. **The action div used inline `style={{ display: 'flex', justifyContent: 'flex-end', ... }}`** — couldn't be hidden via CSS class, same trap as fleet. Removing the inline style was required before any mobile media query could fire.

3. **No way to edit a card by tapping it** — required reaching the right-edge "Sửa" button. Mobile UX expectation is tap-the-card-to-edit (used by Fleet Pass 13 DetailModal pattern, but here we go directly to the edit form since there's no detail view).

4. **No page-scope class** — fixes couldn't be scoped to these pages.

**Fix (CSS + JSX):**

- **CustomersPage.tsx**: added `customers-page` class to root; added `onClick`/`role=button`/`tabIndex`/`onKeyDown` to `<div className="m-card">` to open the edit form on card tap; replaced the inline-styled action div with `<div className="m-card-edit-row">`; added `e.stopPropagation()` to the inner button.
- **SupplierListPage.tsx**: same three changes — `suppliers-page` class, card tap-to-edit, `m-card-edit-row` class.
- **utilities.css**: new generic `.m-card-edit-row` rule providing the desktop look (flex, right-aligned, 8px top margin).
- **responsive.css** (inside the existing `@media (max-width: 640px)` block): `.customers-page .m-card, .suppliers-page .m-card { cursor: pointer }` + `.customers-page .m-card-edit-row, .suppliers-page .m-card-edit-row { display: none }`.

**Files changed:**
- `frontend/src/pages/CustomersPage.tsx` — 3 edits (page-scope, onClick, action class)
- `frontend/src/pages/SupplierListPage.tsx` — 3 edits (same shape)
- `frontend/src/styles/utilities.css` — added `.m-card-edit-row` desktop base (+12 lines)
- `frontend/src/styles/responsive.css` — added 5 lines in the mobile block

**Verification:**
- Mobile (390): customer cards now 74-88px (was 120-134); supplier cards 88-106px (was similar); cursor:pointer on all `.m-card`; `.m-card-edit-row` display:none on both pages; 0 horizontal overflow.
- Desktop (>640): `.m-card-edit-row` renders as the original right-aligned button row (utility class reproduces the inline-style intent).

---

## Pass 15 — `/expenses` + `/expenses/new` (ExpenseListPage + ExpenseEntryPage)

**Login:** accountant `anh` / `admin123`. Verified via 390×844 iframe.

**Findings:**

The `/expenses/new` form was already mobile-clean — single-column layout, 10 fields all at 302px wide × 46px touch-friendly height, no horizontal overflow, sensible section headers ("Thông tin chung", "Ảnh hóa đơn"). No fix needed there.

`/expenses` had one significant issue: the `.expense-filter-bar` was 150px tall on phone, with 6 children (3 selects + date + divider + reset) wrapping into 3 rows of 36px-tall controls. Decent but loose.

**Single fix:**

- Added page-scope class `expense-list-page` to root.
- Inside a new `@media (max-width: 640px)` block in `ExpenseListPage.css`: shrunk `.expense-filter-bar` padding 12px → 10px / gap 8px → 6px / margin-bottom 20px → 12px; shrunk `.expense-filter-bar__select` + `.expense-filter-bar__date` height 36px → 32px / font 13px → 12.5px / dropdown caret padding tightened; shrunk `.expense-filter-bar__reset` to match (32px tall, 11.5px font).

**Files changed:**
- `frontend/src/pages/ExpenseListPage.tsx` — added page-scope class (1 line)
- `frontend/src/pages/ExpenseListPage.css` — added `@media (max-width: 640px)` block (~25 lines)

**Verification:**
- Mobile (390): filter bar now 130px (was 150) → saved 20px; selects at 32px / 12.5px font.
- Desktop (>640): unchanged. The existing `@media (max-width: 768px)` block in the same file is untouched and still handles tablet sizing.

---

## Pass 16 — `/payables` (PayablesPage) — VERIFICATION ONLY

**Login:** accountant `anh` / `admin123`. Verified via 390×844 iframe.

**Findings at 390×844:** Page is already mobile-clean.
- `.payables-summary-bar` (370×198) — vertical stacked summary with 5 items (total + 4 aging buckets), each ~38-53px tall.
- `.payables-toolbar` (370×44) — filter chips + search wrapping cleanly.
- `.m-card` (368×66) for each supplier — only 2 children (`m-card__top` for name + amount, `aging-bar` for visualization). Already has `cursor: pointer` and presumably a click handler (the inline-styled action div check returned `true` but it's likely a generic match, not an actual visible row inside `.m-card`).
- Total page height fits inside the 844px viewport — zero scrolling at the test data scale (2 suppliers).
- 0 horizontal overflow.

**Files changed:** none.

**Note:** at larger data scales (more suppliers, longer names), the m-card pattern continues to fit because each row is just plate-style amount + tiny aging bar. No follow-up work expected.

---

## Index — all pages audited

| # | Page | Status | Notes |
|---|------|--------|-------|
| 0 | `/advances` | ✓ verified | Already redesigned in prior commit |
| 1 | `/config/routes` | ✓ fixed | Table → card layout, KPI watermarks hidden |
| 2 | `/trips` | ✓ fixed | Metric labels, status strip scroll affordance |
| 3 | `/dashboard` | ✓ fixed | KPI val wrapping, label truncation |
| 4 | `/users` | ✓ fixed | KPI watermarks hidden, label wrapping |
| 5 | `/my-forwarder-trips` | ✓ verified | Already mobile-clean |
| 6 | `/my-trips` | blocked | needs `users.user_id` linkage restored |
| 7 | `/trips/new` & edit | ✓ fixed | Inline grid overrides, mobile bar bug, ActionBar space |
| 8 | `/finance` | ✓ fixed | P&L final row font overflow |
| 9 | `/profit` | ✓ verified | No issues found |
| 10 | `/debt` + `/debt/:id` | ✓ fixed | Aging buckets 2×2, header/summary wrap, inline-font removed |
| 11 | `/penalties` | ✓ fixed | Row paddings tightened, empty-state grid + buttons stack, footer wraps |
| 12 | `/dispatch` | ✓ fixed | Featured KPI spans full row, vcard padding tightened (-226px page height) |
| 13 | `/fleet` | ✓ fixed | Per-card action row hidden on mobile, icon shrunk (-773px page height) |
| 14 | `/customers` + `/suppliers` | ✓ fixed | Cards now tap-to-edit, action row hidden, ~46px per card saved |
| 15 | `/expenses` + `/expenses/new` | ✓ fixed | Filter bar tightened (-20px); form already mobile-clean |
| 16 | `/payables` | ✓ verified | Already mobile-clean — cards 66px tappable, page fits in viewport |
