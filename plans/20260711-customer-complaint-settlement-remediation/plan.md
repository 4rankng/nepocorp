---
title: Customer complaint settlement remediation
status: completed
priority: P1
effort: large
branch: chore/deps-security-fixes
tags: [finance, settlements, receivables, forwarder]
created: 2026-07-11
---

# Customer complaint settlement remediation

Status: completed (2026-07-11)

## Phases

- [x] Investigate customer complaints and verify existing debit-note behavior.
- [x] Simplify settlement approval and implement accountant corrections.
- [x] Add eligibility, completion readiness, notifications, and ledger guards.
- [x] Complete regression tests and code review.

## Acceptance criteria

- Accounting can correct a pending settlement and finalize it once without manager approval.
- Settled advances and expenses cannot be reused in another active settlement.
- Finalization requires `tạm ứng = chi phí + hoàn lại` and posts one immutable ledger entry.
- Ops and accounting can see per-trip/container readiness plus original-versus-current corrections; the audit log retains mutation history.
- Legacy `CHECKED_BY_ACCOUNTANT` records remain actionable.

See [phase-01-implementation.md](phase-01-implementation.md).

## Verification

- Settlement workflow: 10/10 focused tests passed.
- Billing documents: 20/20 focused tests passed.
- Shared, backend, and frontend production builds passed.
- Code review passed (9/10); `git diff --check` passed.
- Release-gate follow-up removed the strict frontend module-size violations, made the backend integration suites self-contained and serial, and repaired fresh database setup/seed ordering.
- Dependency resolution pins `undici` to the Node-compatible 7.28 line.

## Deployment

Apply migrations `0100` through `0103` in journal order. Migration `0103` installs PostgreSQL `unaccent` when absent and repairs the legacy `trucks.next_inspection_date` schema gap; all fresh-schema migration SQL is safe to reapply during release verification.
