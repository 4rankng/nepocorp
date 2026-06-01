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

## Index — pages to do next

| # | Page | Status | Notes |
|---|------|--------|-------|
| 6 | `/my-trips` | blocked-by-data | needs `users.user_id` linkage restored for driver accounts |
| 7 | `/trips/new` & edit | pending | Form-heavy; vertical stack |
| 8 | `/finance` | pending | Wide P&L tables — needs scoping |
| 9 | `/profit` | pending | Already has partial mobile rules; verify |
