---
title: "One-time data anonymization"
status: todo
---

# Phase 3: One-time data anonymization

## Overview

**Scope cut (user, 2026-09-03): no reusable pipeline — the anonymization runs exactly once, ad hoc, and nothing is committed to the repo.** A throwaway SQL script (kept in /tmp, approach recorded in the journal) transforms a local scratch copy of the prod snapshot.

## Requirements

- [x] Prod dumped read-only (same `pg_dump` path as `make backup`), restored into local scratch DB `demo_snapshot` on the `tingting-db` container (pgvector image) — local dev `tingting` DB untouched
- [x] **Entity renames** via SQL (row_number-keyed fake pools): customers, suppliers, drivers, users (role-slug usernames, `admin` for ADMIN; passwords → bcrypt `admin123`), truck/trailer plates, trip external-driver fields, cap-table/distribution partner names, vehicle_last_positions
- [x] **Company identity:** app_settings `company.*` keys → "Công ty vận tải TingTing" + generic address/tax/bank/contact; debit-note template issuer fields → generic
- [x] **Truncate:** agent_conversations, agent_messages, agent_turn_metrics, notifications, push_subscriptions, audit_logs, trip_photos, expense_photos, trip_expense_photos
- [x] **Generic token sweep:** replace old→new tokens (longest-first) across ALL text/varchar columns (+ jsonb via ::text round-trip) in `public` — catches names embedded in ledger descriptions, penalty reasons, notes, billing snapshots, FAQ text
- [x] **Verification:** residual-token count across all swept columns = 0; row counts per table unchanged; financial columns untouched

## Implementation Steps

1. `cd backend && node -e …bcryptjs…` → hash for `admin123`.
2. Dump prod → restore scratch.
3. Write `/tmp/anonymize-demo.sql`; run via `docker exec -i tingting-db psql -U postgres -d demo_snapshot -v ON_ERROR_STOP=1 -f -`.
4. Run verification queries; inspect a few pages' worth of data for realism.

## Todo

- [x] Scratch DB loaded
- [x] Anonymize SQL executed
- [x] Verification: 0 residual tokens, counts intact

## Success Criteria

Zero occurrences of any real customer/supplier/driver/user name, plate, phone, or tax code anywhere in the scratch DB; schema and financial data intact.
