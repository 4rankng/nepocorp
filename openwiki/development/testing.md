---
type: testing
title: Testing & Quality Gates
description: Backend tests via tsx --test, frontend tests via Vitest, e2e suite under e2e/, no CI pipeline configured.
tags: [testing, vitest, tsx, e2e, quality-gates]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-cdc6eed158590eedaac10ac0
    resource: repo://backend/src/tests/photo-authz.test.ts
  - id: openwiki-source-2b2ade8f291318eab0f68b01
    resource: repo://backend/src/tests/trip-status-machine.test.ts
  - id: openwiki-source-955a82f4233fdbfd069712ed
    resource: repo://docs/flows/00-OVERVIEW_VA_PHAN_QUYEN.md
  - id: openwiki-source-589f2a59c6c4b820783077da
    resource: repo://docs/flows/01-TRIP_LIFECYCLE.md
  - id: openwiki-source-09e69f217af5193f1226837c
    resource: repo://docs/flows/14-LUONG_VA_CHAM_CONG.md
  - id: openwiki-source-4df0a75a6d40ff5c5d360d97
    resource: repo://docs/qa/regression-test-plan.md
  - id: openwiki-source-89dfc66913138148d6ace042
    resource: repo://docs/qa/test-checklist.md
  - id: openwiki-source-a5570e726df26b60b9b842cc
    resource: repo://e2e/helpers.py
  - id: openwiki-source-df711edafb048423606f68b0
    resource: repo://e2e/run_all.sh
  - id: openwiki-source-d62103267c3351e59c7b703a
    resource: repo://e2e/test_00_auth.py
  - id: openwiki-source-24b87b66c132db4bb24fb1b0
    resource: repo://e2e/test_01_trip_lifecycle.py
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-a809960a2f52b4f758c067e0
    resource: repo://frontend/src/pages/admin-advance-settlement-ledger-density.test.tsx
  - id: openwiki-source-ef869442c2876202a0447738
    resource: repo://frontend/src/pages/admin-advance-settlement-summary.test.ts
  - id: openwiki-source-3fe8e663c4d51af494dfdfbb
    resource: repo://frontend/src/pages/admin-advances-actions.test.tsx
  - id: openwiki-source-6d4d426ba3cf7a28d1fc56a3
    resource: repo://frontend/src/pages/customer-debt-projection.test.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

NEPO has three test surfaces and **no CI pipeline**. Typechecking and the test
runner are the only quality gates.

## Backend tests — `tsx --test`

Backend tests live as many `*.test.ts` files under `backend/src/tests/`. Examples:

- `trip-status-machine.test.ts` — transition matrix + advisory-lock guards.
- `ledger.service.chiho.test.ts`, `ledger-balance-aggregates.test.ts` —
  ledger semantics.
- `photo-authz.test.ts` — exact-storage-key + strictest-match (ADR 0042).
- `pnl-invariant.test.ts`, `financial-overview-lane.test.ts` — financial
  read models.
- `faq-fast-lane.test.ts`, `faq-latency.test.ts` — pgvector FAQ embeddings.
- `gps.service.test.ts`, `gps-settings-schema.test.ts`,
  `gps-admin.rbac.test.ts` — GPS subsystem.
- `comprehensive.test.ts` — broader integration smoke.

Run them with:

```bash
cd backend && pnpm test
# → npx tsx --test --test-concurrency=1 src/tests/*.test.ts
```

`--test-concurrency=1` serializes execution to keep the shared dev DB
deterministic — tests share a Postgres instance and intentionally
introspect each other's rows in places.

## Frontend tests — Vitest

Frontend tests live next to the code they cover as `*.test.ts` or `*.test.tsx`:

- `admin-advance-settlement-summary.test.ts`,
  `admin-advance-settlement-ledger-density.test.tsx`,
  `admin-advances-actions.test.tsx`
- `customer-debt-projection.test.ts`
- `useAuth.test.tsx`, `useAgentChat.test.ts`, `useBottomNavAnimations.test.tsx`

Run with:

```bash
cd frontend && pnpm test    # vitest run
```

ESLint is configured (`pnpm lint`) but is not wired to CI and is not run by
default in the dev loop.

## End-to-end suite — `e2e/`

`e2e/` is a Python-based Playwright suite (separate from `pnpm test`):

- `run_all.sh` — top-level runner.
- `helpers.py`, `seed_ui_audit.py`, `__init__.py` — shared utilities.
- `test_00_auth.py`, `test_01_trip_lifecycle.py`, `test_02_trip_list.py`,
  `test_03_dashboard.py`, `test_04_debt.py`, `test_05_profit.py`, … —
  user-flow tests mapped to the `docs/flows/*.md` indexes.

This suite is **not** run by `pnpm test` — it's a separate workflow that
typically executes against a deployed environment (demo or prod-mirror).

## Manual QA artifacts — `docs/qa/` and `testplan/`

`docs/qa/` holds:

- `regression-test-plan.md` — full regression checklist.
- `test-checklist.md` — release-blocking checks.
- `quan-ly-checklist.md`, `service-cost-checklist.md` — role-specific
  checklists for office staff.
- `iterations/`, `iterations-quan-ly/`, `iterations-service-cost/` — historic
  iteration logs.
- `pete-feedback-2026-06-02.md` — internal feedback ledger.
- `approval-queue-inventory.md`, `config-polish-audit.md` — change-management
  artifacts.

`testplan/` holds account fixtures (e.g. `testaccounts.txt`) used by manual
QA sessions.

## Authoritative Vietnamese test docs

`docs/flows/` contains the role-by-role test scripts the team actually walks
through:

- `00-OVERVIEW_VA_PHAN_QUYEN.md` — overview and role matrix.
- `01-TRIP_LIFECYCLE.md` — trip end-to-end.
- `02-TRIP_LIST_VA_TIM_KIEM.md` — trip list and search.
- `03-DASHBOARD_VA_BAO_CAO.md` — dashboards and reports.
- `04-CONG_NO_VA_THANH_TOAN.md` — debt and payments.
- `05-PHAN_BO_LOI_NHUAN.md` — profit distribution.
- `06-KY_LUAT_VA_PHAT.md` — penalties.
- `07-DOI_XE_VA_FLEET.md` — fleet.
- `08-KHACH_HANG.md` — customers.
- `09-CAU_HINH_HE_THONG.md` — system configuration.
- `10-QUAN_TRI_HE_THONG.md` — admin.
- `11-LAI_XE_MOBILE.md` — driver mobile.
- `12-CHI_PHI_NCC_VA_CONG_NO_PHAI_TRA.md` — supplier costs and AP.
- `13-GIAO_NHAN_VA_TAM_UNG.md` — delivery and advances.
- `14-LUONG_VA_CHAM_CONG.md` — salary and attendance.
- `15-QUAN_LY_LOP_XE.md` — tire management.

## Where to read more

- Setup — [setup.md](setup.md)
- Conventions — [conventions.md](conventions.md)
- Service layer under test — [backend/services.md](../backend/services.md)
