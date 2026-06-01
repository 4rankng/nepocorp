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

## Index — pages to do next

| # | Page | Status | Notes |
|---|------|--------|-------|
| 2 | `/trips` | pending | 11-col grid → mobile cards |
| 3 | `/dashboard` | pending | `.dash-wf` rebuild; check KPI density on <480px |
| 4 | `/users` | pending | Admin table → mobile cards |
| 5 | `/trips/new` & edit | pending | Form-heavy; vertical stack |
| 6 | `/my-trips` | pending | Driver portal — mobile-first |
| 7 | `/my-forwarder-trips` | pending | Forwarder portal |
