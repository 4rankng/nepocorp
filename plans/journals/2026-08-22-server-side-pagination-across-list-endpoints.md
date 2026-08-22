---
title: Server-side pagination across list endpoints
date: 2026-08-22
summary: "Audited every list surface; converted 7 load-all/client-paginated violations to server pagination or SQL aggregates (users, usage-stats for config pages, ledger balances arDebt/tripRevenue, driver trips +statusCounts, penalties window, forwarder window). 11 new integration tests; live HTTP smoke verified. Found pre-existing: chiho/pnl test files hang without --test-force-exit, suite non-hermetic vs dev DB, check:ui red on main (3 CSS files). Commit dab54734 on main, not pushed."
---

# Server-side pagination across list endpoints

Audited every list surface; converted 7 load-all/client-paginated violations to server pagination or SQL aggregates (users, usage-stats for config pages, ledger balances arDebt/tripRevenue, driver trips +statusCounts, penalties window, forwarder window). 11 new integration tests; live HTTP smoke verified. Found pre-existing: chiho/pnl test files hang without --test-force-exit, suite non-hermetic vs dev DB, check:ui red on main (3 CSS files). Commit dab54734 on main, not pushed.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
