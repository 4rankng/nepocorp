---
title: "restore fix, soke default tab, redis auth repair"
date: 2026-11-12
summary: restore precedence trap + stray containers fixed; sao ke tab now default; redis fail-closed auth repaired; deploy from clean worktree
---

# restore fix, soke default tab, redis auth repair

## What happened
- `make restore` failed twice over: (1) stray label-less `tingting-db`/`tingting-redis` containers (created outside compose) blocked `docker compose up` by name; (2) a bare `|| true` mid-`&&`-chain in the restore recipe swallowed the upstream failure and ran the restore body with unset `SQL_FILE` → `/bin/sh: : No such file or directory`.
- Fixed the Makefile precedence trap (parenthesized the CREATE ROLE fallback), removed the stray containers (db mounts compose's own `nepocorp_tingting-pgdata` volume — zero data loss), and verified `make restore` end-to-end against the 17:44 prod dump (12 users, serial bump OK).
- Merged-in `fix/filter-grid-rebuild` regression tests were stale vs the surviving design: fwd date inputs now render via shared DateInput (kanban 101026101520), expense page kept NEPO-24 toolbar. Adapted the tests (d1e8ca17).
- NEPO-46 sao kê sổ chi tiết landed; made the debt detail page default to the **Sao kê** tab (1fdeb03f) and adapted debt-detail-stability tests.
- Browser QA found dev auth broken: my earlier container repair removed `tingting-redis` and the token blacklist is fail-closed → every authed call 401'd. Recreated redis from compose; login + export verified via real browser click (`admin` / admin123 after restore reset).

## Decision
- Deploy builds use a clean worktree pinned to the pushed commit — the tree carries another active session's uncommitted WIP (payment channel / TK đối ứng), which must not ship.

## Next steps
- bg deploy of 1fdeb03f to nepo.tingtingsoft.vn (backend+frontend+migrations) — verify when it lands.
- Concurrent session owns the payment-channel WIP; do not commit it from here.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
