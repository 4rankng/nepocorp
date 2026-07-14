# Independent Validation Report

Date: 2026-07-14

## Result

**DONE_WITH_CONCERNS.** Type/build checks and the frontend test suite pass, but
the implementation does not yet satisfy the plan's target-resolution and
tutorial-library acceptance criteria.

## Commands Run

| Command | Result |
|---|---|
| `cd shared && pnpm build` | Passed. `tsc` completed and `fix-esm-imports.js` ran. |
| `cd frontend && pnpm exec vitest run src/components/onboarding/OnboardingChecklist.test.tsx src/context/TourControllerContext.test.tsx src/hooks/useOnboardingChecklist.test.tsx` | Passed: 3 files, 9 tests. |
| `cd frontend && pnpm test` | Passed: 22 files, 144 tests. |
| `cd frontend && pnpm build` | Passed. Vite warned that existing chunks exceed 500 kB. |
| `cd backend && pnpm build` | Passed. `tsc` completed and `fix-esm-imports.js` ran. |
| `cd backend && ./node_modules/.bin/tsx --test ../shared/src/onboarding/tasks.test.ts` | Passed: 8/8 tests. |
| `cd backend && ./node_modules/.bin/tsx --test ../shared/src/tours/catalog.test.ts` | **Failed: 7/8 tests.** `fuel-config` is missing `fuel-supplement-field`; the test also expects `fuel-unit-price-field`. |
| `git diff --check` | Passed. |

The initially prescribed `pnpm exec vitest` and `npx tsx` commands cannot run
from `shared` because that package does not declare either executable. The
shared Node tests were instead run using the installed backend `tsx` binary.

## Verified Catalog/Curriculum Counts

- MANAGER: 5 checklist tasks; 8 role-visible tours.
- ACCOUNTANT: 5 checklist tasks; 5 role-visible tours.
- ADMIN: 3 checklist tasks; 12 role-visible tours.
- DRIVER/FORWARDER: no checklist tasks and no role-visible tours.
- All 13 checklist tasks declare a tour ID, so the checklist can render a
  guide action for each task.

## Blocking Findings

### 1. Most catalog spotlight targets cannot resolve

The catalog references 25 targets. Source inspection finds only 11 existing
`id`/`data-tour-id` targets. The following 14 are absent:

`audit-filters`, `audit-table`, `config-grid`, `config-master-data`,
`dashboard-attention`, `dashboard-kpis`, `debt-customer-list`, `finance-kpis`,
`finance-period`, `trip-detail-financials`, `trip-detail-lock`,
`users-role-filters`, and `users-table`.

Consequently, the associated tours enter the existing missing-target recovery
path instead of delivering their intended guide. This violates Phase 2's
"Every catalog target resolves" success criterion.

### 2. Fuel tutorial regressed existing coverage

`shared/src/tours/catalog.ts` reduces the `fuel-config` tour to three steps,
but its integrity test still requires the prior supplement and unit-price
targets. The failing test is real: the catalog no longer references
`fuel-supplement-field` or `fuel-unit-price-field` even though both controls
still exist in `FuelConfigPage`.

### 3. Tutorial library does not provide planned guide state or API revalidation

`TutorialLibrary.tsx` only calls local `getInProgressStep`; it does not read
the onboarding progress API, show new/in-progress/"đã xem hướng dẫn" state,
or revalidate `/auth/me` when opening. It also has no dedicated test file
(`TutorialLibrary.test.tsx` was planned but is absent). This leaves several
Phase 3 success criteria unverified and the documented master-switch refresh
behavior unimplemented.

## Additional Unverified Criteria

- No focused tests were added for version-aware `tourProgress` migration,
  listener ordering/teardown, dispatch and figure-save failure/cancel paths,
  or library keyboard/focus behavior.
- No manual role × viewport × empty/live-data validation was performed here;
  it remains necessary after target stamping.
- The plan's Phase 2 requested a `trip.completed` success emitter. It was not
  verified in this pass because the current diff only introduces/uses
  `trip.dispatched` and `trip.figures_saved`.

## Non-blocking Note

The worktree contains unrelated deleted company source documents and untracked
document folders. This validation did not modify or rely on them.
