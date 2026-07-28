# QA summary — Vehicle schedules

Date: 2026-07-28

## Automated gates

- Frontend: `52` files, `242` tests passed.
- Backend: `152` suites, `772` tests passed on the clean final rerun.
- Shared/backend/frontend production build: passed via `make build`.
- Diff hygiene: `git diff --check` passed.
- Focused schedule regressions: `23` backend/shared tests and `14` frontend tests passed.

One full-backend run made while the local dev server was still sharing the test
database failed an unrelated `SERVICE_FEE` row-count assertion. The failing
file passed `10/10` in isolation, and the complete backend suite passed
`767/767` after stopping the dev processes; the final suite reached `772/772`
after the adversarial-review regressions were added.

## Migration evidence

- Migrations `0112` and `0113` applied successfully to the current development
  database.
- Directly applying final `0113` again completed successfully with:
  `legacy_truck_rows=0`, `renewable_expense_updates=0`,
  `renewable_expense_rows=0`.
- DB-backed tests cover later-valid renewable expense precedence, idempotency
  around user-created active schedules, tractor/trailer identity, and lifecycle
  actions after a vehicle is soft-deleted.

A fresh replay of the repository's complete historical migration journal is
blocked before this feature's migrations by an existing baseline issue:
`0107_fantastic_star_brand.sql` uses `vector(1536)`, but the journal omits the
separate `0104_faq_knowledge_base.sql` pgvector bootstrap. The replay therefore
fails with `type "vector" does not exist` before reaching `0112` or `0113`.
This feature does not change that pre-existing migration chain.

## Role and responsive evidence

- API role matrix:
  - `ADMIN`: 200
  - `MANAGER`: 200
  - `ACCOUNTANT`: 200
  - `FORWARDER`: 403
  - `DRIVER`: 403
- Browser matrix passed for `MANAGER` and `ACCOUNTANT` at 320, 375, 768, and
  1440 px on Dashboard and Fleet.
- The checks assert no horizontal overflow, a visible non-dismissible banner,
  distinct tractor/trailer identity, overdue text and icon, a 44 px visible
  schedule trigger, and a usable schedule drawer.
- Screenshots are stored in the ignored local folder
  `qa/evidence/vehicle-schedules/`.

## Review fixes

The diagnostic review found and the implementation subsequently fixed:

1. schedules that became unresolvable after vehicle soft-delete;
2. Fleet triggers that mislabeled vehicles with future active schedules as
   `Thêm lịch`;
3. renewable backfill reruns that could preserve an older expiry over a newer
   renewable expense;
4. non-atomic update/complete/cancel transitions;
5. canonical terminal schedules that could resurrect legacy driver alerts;
6. timezone-dependent renewal backfill and driver day calculations;
7. decimal or oversized route IDs reaching the database.
