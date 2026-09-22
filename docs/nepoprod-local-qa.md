# NEPO local QA evidence

This delivery was tested against the current `main` base
`e69d42c8ef906123a2ce2a6e3f9d3b6210ced68a` with a populated local-only
PostgreSQL dataset. No production service, database, provider, or account was
used.

## Data used

The `QA • OP26` fixture cohort contains 18 customers, 8 suppliers, 6 routes,
40 trips (created, in-transit, completed, locked, and canceled), 16 expenses,
payments, overdue balances, and forwarder settlements. It is created only by
`e2e/seed_operational_qa.py`; the script is pinned to localhost and keeps a
manifest to make repeats read-only.

## Automated and browser checks

- Frontend: 470 tests passed.
- Backend: 849 tests passed using a disposable PostgreSQL database and Redis
  database 15.
- Build, lint, UI contract, and brand contract passed.
- Browser route matrix: 885/885 checks across ADMIN, MANAGER, ACCOUNTANT,
  DRIVER, and FORWARDER at 320, 390, 820, 1024, and 1440px. The matrix checks
  authenticated routing, role guards, API errors, horizontal overflow,
  onboarding absence, and populated control typography.
- Focused rebuilt checks: 85/85 with reduced motion and 85/85 with normal
  motion for dashboard, dispatch, customers, and billing paths. A short
  landscape pass added 34/34 checks at 844x390 and 1920x390.
- User-flow browser checks covered customer create/edit/delete/filter/export,
  expense validation/upload/edit/payment, trip create retry/lock/copy/cancel,
  and forwarder advance/settlement rejection/resubmission/approval.

## Boundaries

The checks use local Chromium and synthetic data. Physical devices, Safari
camera/GPS behavior, printer-native dialogs, live AI/OCR/GPS providers,
production permissions, and real chatbot provider latency were not exercised.
The existing onboarding-removal migration (`0118_remove_onboarding.sql`) and
chatbot fast-lane/latency guards are already in the base; this delivery does
not claim a live 40–60 second chatbot response measurement.
