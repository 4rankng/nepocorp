# /config Sub-pages — Visual Polish Audit

**Date:** 2026-06-03
**Goal:** Consistent visual theme + elegance across all 18 config sub-pages.
**Auditor:** Claude (Opus 4.7) signed in as MANAGER `phung`.
**Method:** JS introspection (`getBoundingClientRect`, computed styles) + a11y tree + page-scoped CSS fixes. Cascade-only, no `!important`, design tokens from `frontend/src/components/UI.css`.

> **Screenshots note:** Chrome MCP `save_to_disk: true` did not produce on-disk files in this environment.
> Audit uses measured metrics (rect dimensions, computed properties) as before/after evidence.
> The Penalty Reasons page (S1935, 2026-06-03 1:19am) is the canonical "after" reference.

## Design system reference

| Token | Use |
|---|---|
| `.page-title` | 22px / 800 / -0.02em — global page title |
| `.page-subtitle` | 13px / `--ink-2` / max 60ch |
| `.panel` (`flush`) | 20px radius / `--line` border / glass blur |
| `.tt-table` thead | uppercase 11px / `--ink-3` |
| `.tt-table` tbody td | 13px / `--ink` / 10px vertical |
| `.btn--primary` | green gradient `--accent → --accent-2` |
| Empty illustrations | `/assets/illustrations/empty-{topic}.svg` 120×100 |
| Icon size | 20 header / 16 body / 14 pill |

---

## Polish pass log

