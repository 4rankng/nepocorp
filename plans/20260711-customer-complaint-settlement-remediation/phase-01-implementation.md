# Phase 01 — Implementation and verification

## Context

- `CONTEXT.md`
- `docs/flows/04-CONG_NO_VA_THANH_TOAN.md`
- `docs/flows/13-GIAO_NHAN_VA_TAM_UNG.md`

## Checklist

- [x] Preserve route-based debit-note descriptions and append-only AR reconciliation.
- [x] Add Ops expense completion scopes and active-settlement edit guards.
- [x] Add accountant expense corrections and atomic settlement composition updates.
- [x] Replace two-stage settlement approval with accountant finalization.
- [x] Add eligible advances/expenses and per-container readiness to accountant UI.
- [x] Add correction/finalization notifications and immutable snapshots.
- [x] Serialize active-link validation and enforce one settlement ledger posting.
- [x] Pass focused regression tests, production builds, and final code review.

## Validation

- Settlement workflow: 10/10 focused tests passed.
- Billing documents: 20/20 focused tests passed.
- Shared, backend, and frontend production builds passed.
- Final code review passed (9/10); `git diff --check` passed.
- The strict frontend size budget (18 existing files over 600 lines) and broader chi-hộ aging environment cleanup remain unrelated baseline findings.

## Deployment

Apply migrations in order before application deployment:

1. `0100_forwarder_expense_workflow.sql` — completion scopes, correction snapshots, and settlement notification type.
2. `0101_debit_note_receivables_sync.sql` — debit-note reconciliation state and active-period uniqueness.
3. `0102_settlement_ledger_guards.sql` — preflight duplicate check and one-post settlement ledger index.

Migration `0102` intentionally stops if duplicate `FORWARDER_SETTLEMENT` rows already exist; reconcile them with append-only accounting entries before retrying.

## Risk and rollback

- Apply migrations before deploying application code.
- Roll back application code before database columns; retained snapshot and ledger indexes are backward-compatible.
- Never delete or update ledger entries during rollback.
