---
title: TTransport rebrand
date: 2026-11-11
status: implemented
---

# TTransport rebrand

## Context

The application product identity moved from **TransTing** to **TTransport** across the same surfaces as the 260724 rebrand. The double-cap spelling is kept by design; per brand consult (deepseek, 2026-11-11), the double-T must read as deliberately kerned: sidebar wordmark uses Be Vietnam Pro weight 700 with −0.5px letter-spacing, single foreground color on the emerald shell (accent-green "TT" rejected — insufficient contrast on emerald).

## What changed

- Renamed brand assets `transting-*` → `ttransport-*` (master, PWA, favicons, sidebar marks) and the generator to `scripts/generate-ttransport-brand-assets.mjs`; regenerated via `pnpm --dir frontend run generate:brand`.
- Updated `src/brand.ts` (name, productName `TTransport Logistics`; tagline and shell descriptor unchanged — consult verdict: keep), browser/PWA metadata, push notification title/icon/badge, assistant label and backend system prompt, route-title fallback, fuel-voucher HTML/XLSX footers, design guidelines, and CSS header comments.
- Added forward-only migration `0127_ttransport_product_identity.sql` (TransTing → TTransport in `faq_entries.answers`), mirroring 0108.
- Expanded `check-brand-contract.mjs`: legacy-label ban now includes `\bTransTing\b`; migration assertions point at 0127.
- Wordmark treatment: `.sidebar-brand-meta strong` weight 800→700, letter-spacing 0→−0.5px.

## Decisions

- `@tingting/*` package names, `tingting.vip` domains, `tingting-shell-v2` cache key, notification tag, and icon slugs stay unchanged — infrastructure identifiers, not display brand (same call as the 260724 rebrand).
- Login page keeps single-color h1; the accent-TT treatment is only viable on white surfaces and adds brand-string splitting for no measurable gain.
