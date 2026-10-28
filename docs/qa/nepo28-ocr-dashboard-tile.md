# NEPO-28 — OCR dashboard tile + AI OCR settings — verification

> Ticket: NEPO-28 · Date: 28/10/2026 · Branch: `feat-605-ocr-counter`
>
> Driver: `qa/ocr-settings-qa.mjs` (working-tree only — `qa/` is gitignored as
> local agent state). Re-run it and paste the JSON numbers here; the durable
> evidence is this file + the two card screenshots in this folder.

## 1. The tile was broken — measured before vs after

The screenshot the owner sent (`before-ocr-card.png`) showed the figures glued
to the card border, a wrapped label and an empty right half. Three root
causes, all measured in the live DOM:

| Measurement | Before | After |
|---|---|---|
| `bodyPadding` | `0px` | `12px 16px 14px` |
| content gap from the card border (`contentLeftGap`) | `1px` (flush) | `17px` |
| stats grid columns | 4 columns of ~96px, 2 stats crammed into 1–2 | 4 metric cells of 140px |
| stat label lines | 2 (`ĐÃ DÙNG /` + `10.000`) | 1 |
| bento span (`gridColumn`) | `span 4` (row 6+4 = 10/12) | `span 6` (row 6+6 = 12/12) |
| card size | 414 × 336 | 633 × 336 |

Causes:

1. `.dash-wf .wf-card .body` has no padding rule — only `.wf-fleet`,
   `.wf-cost`, `.wf-audit` and `.wf-chart` have one. The OCR tile got none.
2. `.dash-wf .wf-fstats` is the **fleet** idiom: a 4-column grid sized for four
   stats. The OCR tile had two, so they were squeezed into columns 1–2 and the
   label wrapped.
3. The tile used `wf-bento-third` (4 of 12 columns) while the row it sits in
   is "Top tuyến sinh lời" (6) + OCR — 6+4 leaves two empty columns.

Fix: a dedicated `wf-ocr` scope (own padding, own grid) and `wf-bento-half`.

## 2. The daily request chart

The counter moved from monthly to **daily** grain (migration `0125`), so the
tile can plot the daily rhythm. Decisions taken (owner spec + webchat consult
28/10 + house conventions):

- **Bars, not a cumulative area** — the owner needs to spot daily bursts; a
  cumulative curve flattens exactly that signal.
- **The monthly cap is NOT a line across the daily axis** — a 10.000 cap on a
  0–600 daily scale flattens every bar. The cap lives in the 3px micro-meter
  above the chart.
- **A day without scans is a measured 0**, not a gap. OCR is a 24/7 internal
  service; "no scans that day" is a fact, not missing data. (The revenue hero
  chart gaps days — that is a different meaning: unbilled trips.)
- **Days that have not happened yet** draw a faint empty tick: "not measured
  yet" is a different state from "measured zero".
- **Read-only bars.** There is no per-day OCR log page in the product, so a
  click target would be a dead promise; the tooltip carries the detail.

Hover states (driven in a real browser):

| Hover | Tooltip |
|---|---|
| a measured day | `Ngày 18/10/2026 · 187 lượt chụp · 119% so với TB ngày` |
| a measured zero | `Ngày 02/10/2026 · 0 lượt (không phát sinh)` |
| today | `Ngày 28/10/2026 · hôm nay · 64 lượt chụp · 41% so với TB ngày` |
| a future day | `Ngày 30/10/2026 · Chưa tới ngày này` |

The chart is hand-rolled SVG like the other dashboard charts (`DailyBarsChart`,
`RevenueTrendChart`) — the repo does not use Recharts. It has to opt out of the
dashboard icon reset (`.dash-wf svg { width: 16px !important }`).

## 3. "Cài đặt ứng dụng" is ADMIN-only — verified per role

Driven in a real browser (login → deep-link → API status), not read from code:

| Role | Deep-link to `/config/app-settings` | Page content | `/api/admin/app-settings` | `/api/admin/ocr-ai-settings` | `/api/admin/ocr-usage` | "Cài đặt" on the OCR tile | Nav item |
|---|---|---|---|---|---|---|---|
| ADMIN | stays on the page | app-settings page | 200 | 200 | 200 | shown | shown |
| MANAGER | → `/dashboard` | not rendered | 403 | 403 | 403 | hidden | hidden |
| ACCOUNTANT | → `/dashboard` | not rendered | 403 | 403 | 403 | hidden | hidden |

The guard itself was already in place (route `strictAdminOnly`, role-filtered
nav, `adminOnly` in the search registry, `requireRoles(Role.ADMIN)` on the
API). This ticket **verified** it — including the "Cài đặt" shortcut on the
OCR tile, which is rendered only for ADMIN.

## 4. The AI OCR panel

`Cài đặt ứng dụng` → panel **AI OCR**: provider (OpenRouter, fixed), API key
(masked, encrypted at rest), model dropdown (5 vision models verified to
accept image input via `GET https://openrouter.ai/api/v1/models`, plus a
free-text field), **"Kiểm tra kết nối"** and **"Xoá khoá"**.

Driven end to end in the browser:

- "Kiểm tra kết nối" with an invalid key → `Không kết nối được: HTTP 401`
  (a real call to OpenRouter, the honest failure surfaced).
- "Lưu cấu hình AI OCR" → `Đã lưu cấu hình AI OCR.`; the stored row is
  `enc:v1:…` and does not contain the plaintext key.
- "Xoá khoá" → `Đã xoá API key OCR.`; the stored value is empty and the
  environment key takes over again.

## 5. Gates

| Gate | Result |
|---|---|
| `backend && pnpm test` | 1001 pass / 0 fail |
| `frontend && pnpm test` | 173 files, 833 tests, 0 fail |
| `pnpm lint` | 0 errors (1 pre-existing warning in `tripFilters.tsx`) |
| `pnpm build` | green |

## 6. Bug found while verifying (fixed here)

`isTokenExpired` in `frontend/src/hooks/useAuth.tsx` decoded the JWT payload
with plain `atob`. The payload segment is **base64url**, and `atob` only knows
standard base64 — it **throws** on `-`/`_`. The throw was swallowed by the
catch, so a perfectly valid token was treated as expired, `api.clearToken()`
ran, and the user was **logged out on every page reload**. Any account whose
name carries a non-ASCII character (every Vietnamese name) hit it — reproduced
with the `ketoan` account. Fixed by translating base64url to standard base64
and decoding the bytes as UTF-8; regression test in `useAuth.test.tsx`.
