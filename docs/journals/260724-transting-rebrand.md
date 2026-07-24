---
title: TransTing rebrand
date: 2026-07-24
status: implemented
---

# TransTing rebrand

## Context

The frontend product identity moved from TingTing/NEPO labels to **TransTing**, keeping the user-directed deep emerald sidebar and primary CTAs while using transport blue and signal green inside the brand mark.

## What changed

- Added a new road/arrow app mark with favicon and PWA sizes plus a dedicated transparent sidebar mark for the emerald shell.
- Centralized the product name, tagline, exact sidebar descriptor (`Quản lý vận tải và logistics`), and runtime logo paths.
- Fixed the sidebar brand header so the descriptor wraps within its flex column instead of overflowing the 248 px desktop/mobile shell.
- Aligned custom, DaisyUI, and token-driven primary CTAs to deep emerald with a darker emerald hover state.
- Updated login, sidebar, browser/PWA metadata, push notifications, assistant/onboarding labels, route-title fallback, workbook metadata, and product documentation.
- Added a brand-contract check to prevent scoped runtime surfaces from restoring legacy product labels.

## Decisions

- Keep `@tingting/*` package names and other internal identifiers unchanged; this is a product identity change, not a monorepo migration.
- Keep NEPO where it names the operating company or business domain.
- Preserve semantic success, warning, danger, and info colors; primary CTA and shell tokens use deep emerald while transport blue remains a mark detail.
- Approved copy:
  - `Vận tải thông minh. Doanh nghiệp vững mạnh.`
  - `Quản lý vận tải và logistics`

## Verification

- Focused tests: 3 files / 51 tests passed.
- Full frontend tests: 35 files / 180 tests passed.
- UI and brand contract checks passed, including the emerald sidebar tokens, exact Vietnamese copy, and required sidebar/PWA assets.
- Production build passed.
- Changed-file lint passed with one existing unused-disable warning.
- `git diff --check` passed.

## Remaining evidence

Browser-rendered desktop/mobile QA is blocked because enterprise browser policy rejects `localhost:7173`. The source asset and generated small-size assets were inspected, but login, dashboard interactions, responsive wrapping, and console output still need capture in an allowed browser environment. See `plans/260724-transting-rebrand/design-qa.md`.
