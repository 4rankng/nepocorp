# Journal — 2026-09-11 — Fuel allocation multi-price (per-purchase rows + row unit price)

**Trigger:** Customer asked how to enter a trip that refuels twice at different pump prices. Answer before this change: impossible — rows carried liters only, one trip-level price multiplied all liters.

**What changed:** per-purchase allocation rows with optional `unit_price` (migration 0117; the two one-row-per-counterparty unique indexes dropped), Σ-row-amounts totals when any row priced (legacy single-multiply untouched), per-purchase FUEL_EXPENSE ledger entries, per-purchase voucher line items, + button / price inputs / multi-row reseed-merge in the trip form.

**What worked:**
- Test-first on `normalizeFuelAllocationRows` (the exact logic that regressed Sep-7/11) caught a real design flaw: the normalize effect fires on rowKeys change, so an empty draft row added by + would have been instantly dropped — extras are now always kept, submit filters them instead.
- The "patch without allocations" fallback must re-map saved rows WITH prices, else a patch silently prices rows at the trip-level price.
- Zod strips unknown keys: adding unitPrice to the request schema is required, and the counterparty-dedupe superRefine (plan missed it) had to go.

**Environment gotchas:** system-wide file-watch exhaustion killed tsx watch reloads AND Vite transform invalidation — the dev servers were silently serving 12:32 code (the "old dedupe error" during E2E was stale code, not a bug). Servers restarted fresh.

**Pre-existing failure (not ours):** `ledger.service.chiho.test.ts` "PENDING fee" fails on pristine main too (verified via git stash).

**Status:** implemented + verified in local dev (API E2E: trip totals 2,740,000 from 60 L @ 27,000 + 40 L @ 28,000; voucher 2 line items; UI rows/+ button verified; screenshot). Code review in flight at journal time.
