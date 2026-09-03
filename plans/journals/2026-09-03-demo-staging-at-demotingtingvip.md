---
title: Demo staging at demo.tingting.vip
date: 2026-09-03
summary: "Provisioned second TingTing stack (/opt/demo, ports 3091/3001) on the vantai droplet with a one-time anonymized prod snapshot under generic company 'Công ty vận tải TingTing'; make demo re-added; CI matrix vantai→demo. Leak scan 0/185 identifiers. Commit 9123b6c1, CI green."
---

# Demo staging at demo.tingting.vip

## What happened
- Provisioned a second TingTing stack on the vantai droplet: `/opt/demo` (compose project `demo`, db/user `demo`), host ports 127.0.0.1:3091 (backend) / 3001 (frontend) / 8081 (adminer, profile-gated), redis capped 64MB (1GB box now hosts two stacks; 2G swap present). New LE cert for demo.tingting.vip; DNS already pointed at the droplet.
- Data: one-time anonymized snapshot of prod. Dumped prod read-only → restored into local scratch DB `demo_snapshot` (tingting-db container) → ad hoc SQL (`/tmp/anonymize-demo.sql`, deliberately NOT committed per user request) → `pg_dump --no-owner --no-privileges` → restored on server. 107 migrations applied clean.
- Anonymization approach: self-referential maps (person/org/plate/phone/tax tokens read from the data itself), entity renames with deterministic Vietnamese fake pools, two-phase user rename (avoids transient unique violations), generic longest-first token sweep over ALL text/varchar columns, recursive jsonb walker that only rewrites string leaves (numbers stay — digit-run coincidences in coords/durations are not PII), truncate agent/notifications/push/audit/photo tables, company identity → "Công ty vận tải TingTing" (address 312 Nguyễn Công Hoà, phường An Biên, HP per user).
- Verification: in-transaction residual check (0) + end-to-end scan of 185 real prod identifiers against the LIVE demo DB (0 occurrences, jsonb via string-leaf extraction) + case-insensitive `nepo` scan (0) + puppeteer visual check (dashboard/customers/trips/pnl render, fake orgs, formatted currency). All 3 sites healthy post-ship.
- Deploy wiring: `make demo`/`demo-backend`/`demo-frontend` re-added (root Makefile, self-contained ssh, prod-style readiness wait); CI deploy matrix changed vantai→demo.tingting.vip with per-entry `compose_file`. Commit 9123b6c1 pushed; CI green incl. `Deploy (demo.tingting.vip)`.
- code-reviewer pass: no blockers; fixed M1 (stale pointer to a nonexistent anonymize script in compose comment) and L1 (migration readiness wait).

## Gotchas hit (why this took several passes)
- `setup-demo-server.sh` copy_key: `[ -n "$v" ] && printf` under `set -e` killed the script on the first empty-valued key — use `if; then; fi; return 0`.
- Drizzle property names ≠ DB columns (`app_settings.value` → `setting_value`).
- PG `format()` has no `%d`; and `%` inside format strings must be `%%` even when it comes from `''%''` quoting.
- UPDATE ... FROM with `LEFT JOIN map ON map.old = target.col` is illegal (target not referenceable in JOIN ON) — use correlated scalar subqueries.
- Empty-string tokens produce LIKE '%%' which matches EVERYTHING — delete empty olds before sweeping.
- Blind text replace inside jsonb corrupts numbers (leading zeros = invalid JSON) — recurse and only rewrite strings.
- Username renames can transiently violate uniques (real user already holding 'giamdoc') — park on throwaway values first (two-phase).
- Person-name generator slot math bug ((i-1)/168 never varies under 34 people) gave half the fakes the same given name — follow-up pass to vary.

## Decision
- Repo files are the source of truth for the demo stack (docker-compose.demo.yml, nginx-host-demo.conf, setup-demo-server.sh) — scp'd, not SSH-patched, avoiding the drift the vantai stack suffered.
- CI matrix drops the vantai entry: /opt/vantai now runs diverged `ghcr.io/4rankng/transting-*` images and is reserved for silversea; nepocorp CI was cross-wired into it.
- Anonymization is one-time by user decision; no pipeline committed. If a refresh is ever needed, re-derive from the approach above (journal + /tmp scripts may be gone — this entry is the record).
- Demo login: all accounts → admin123; usernames follow the vantai seed convention (admin, giamdoc, ketoan, laixe1-4, giaonhan1-2).

## Next steps
- Watch box memory for a few days (two stacks, ~167MB for demo; 334MB avail + 2G swap). Resize droplet only if OOM appears.
- Snapshot data ends 2026-08-30 — the dashboard's current-month (Sept 2026) view is empty by design; presenters should switch the month filter.
- vantai.tingting.vip no longer auto-updates from nepocorp CI — silversea takes over that slot when ready.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
