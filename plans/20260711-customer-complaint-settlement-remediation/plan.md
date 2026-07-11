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
- Known pre-existing checks outside this scope: the strict frontend size budget still reports 18 files over 600 lines, and the broader chi-hộ aging suite requires its existing local unaccent/cleanup setup.
