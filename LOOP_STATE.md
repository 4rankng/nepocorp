# LOOP_STATE.md — Autonomous repair/completion loop

> Memory for the implementation/verification loop (governing spec: autonomous
> senior full-stack engineer mission). Read before every iteration; update after.
> Stop at 30 iterations or when completion criteria (below) are met.

## Verification commands (canonical)

| Layer | Command | Gate |
|-------|---------|------|
| shared typecheck | `cd shared && npx tsc --noEmit` | exit 0 |
| shared catalog test | `cd shared && backend/.../tsx --test src/tours/catalog.test.ts` | 8/8 pass |
| backend typecheck | `cd backend && npx tsc --noEmit` | exit 0 |
| backend tests | `cd backend && pnpm test` | pass |
| frontend typecheck | `cd frontend && npx tsc -b --noEmit` | exit 0 |
| frontend tests | `cd frontend && npx vitest run` | 139 pass |
| frontend build | `cd frontend && npx vite build` | exit 0 |
| root lint | `pnpm lint` | exit 0 |

`tsx` for shared tests is at `backend/node_modules/.bin/tsx` (shared has no test runner wired).

## Baseline (iteration 0, captured 2026-07-13)

- shared typecheck: PASS
- shared catalog test: PASS (8/8)
- backend typecheck: PASS
- backend tests: 652/654 pass — **1 pre-existing failure** (A8 P&L invariant
  `(a.div)`), confirmed failing on clean HEAD too. It's a dev-DB `trips.grossProfit`
  staleness issue (denormalized col stale vs current revenue/cost inputs); diff
  ~231M VND, far beyond rounding. Documented remediation: `backend/scripts/recost-gross-profit.ts`
  (sign-off-gated `--apply`). NOT caused by in-flight work.
- frontend tests: PASS (139/139)
- frontend typecheck: **FAIL → P0 fixed** (`agentHighlight.ts` `as const` on `showButtons` made it readonly vs Driver.js `AllowedButtons[]`; fixed by importing `AllowedButtons` + explicit annotation)
- frontend build: PASS
- lint: not yet run this session

Branch: `feat/onboarding-orchestration`.

## In-flight (uncommitted) work — TWO features

### A. Create-trip tutorial usability repair (plan: plans/2026-07-13-create-trip-tutorial-repair/)
- `catalog.ts`: create-trip version 1→2; first step now navigation-only (no `highlight` of whole form); body reworded. Later steps retain `customerId`, `routeId`, `trip-new-submit` targets; final step keeps `completionEvent: 'trip.created'`.
- `catalog.test.ts`: updated to assert nav-first + required controls.
- `agentHighlight.ts`: when `tourActive`, Driver.js highlight keeps overlay/target emphasis but drops the contradictory second popover.
- `OnboardingChecklist.tsx`: hides checklist while `tour` is active (`if (... || tour) return null`).
- `ActionBar.tsx`: publishes `--trip-action-bar-height` CSS var via ResizeObserver so floating tour/checklist clear the fixed action bar.
- `agent.css` / `onboarding-checklist.css`: bottom offsets + max-heights driven by that var; `.driver-active .agent-tour` pointer-events restored + raised z-index so the persistent tour stays usable under Driver overlay.

### B. Onboarding admin master switch (DB-backed on/off)
- `shared/src/schemas/onboarding-settings.ts`: `ONBOARDING_SETTINGS_PATHS` + response/update types.
- `shared/src/index.ts`: barrel export.
- `backend/src/services/onboarding-settings.service.ts`: cached read of `app_settings` row `onboarding.tutorial_enabled`; default enabled; `setOnboardingEnabled` upserts + invalidates cache.
- `backend/src/routes/onboarding-settings.ts`: GET/PUT, ADMIN-only (Casbin `onboarding-settings` + `requireRoles(Role.ADMIN)`), Zod body.
- `backend/src/index.ts`: mounts `/api/admin/onboarding-settings`.
- `backend/src/routes/auth.ts`: `/login` + `/me` now return `onboardingEnabled`.
- `frontend/src/hooks/useAuth.tsx`: `AuthUser.onboardingEnabled?: boolean`.
- `frontend/src/pages/config/OnboardingSettingsConfigPage.tsx`: admin toggle page (role="switch" a11y).
- `frontend/src/api/onboardingSettingsClient.ts` + `hooks/useOnboardingSettings.ts`: client + RQ hooks (mirrors LlmSettings; invalidates `/auth/me` on save).
- `frontend/src/App.tsx`: route `/config/onboarding-settings` (strictAdminOnly).
- `frontend/src/api/keys.ts`: `qk.onboardingSettings`.
- `frontend/src/data/searchRegistry.ts`: config card + search entry (so ConfigPage grid shows it).
- `frontend/src/context/TourControllerContext.tsx`: tour launch refuses when `onboardingEnabled === false`.
- `OnboardingChecklist.tsx`: reads `user?.onboardingEnabled !== false` (default-on) + hides while tour active.

Feature B is COMPLETE end-to-end (API + admin UI + consumers).

## Prioritized backlog

### P0 — blockers / build/startup
- [x] Fix frontend typecheck break in `agentHighlight.ts` (DONE iter 0).

### P1 — verify in-flight features do what they claim
- [x] Commit in-flight work as coherent, reviewed changes (`eb96ca6e`).
- [x] Add regression coverage: TourController master-switch guard (2 tests, `4fc202a2`). (checklist-while-tour + action-bar var are DOM-verified in browser; agentHighlight popover-suppression is covered by the existing tourActive guard + catalog test.)
- [x] Verify the create-trip tour journey end-to-end in a browser (desktop + mobile) — iter 4.
- [x] Onboarding master-switch admin UI: complete + browser-verified (iter 4).

### P2 — quality / coverage
- [ ] `A8 P&L invariant (a.div)` dev-DB staleness — run `recost-gross-profit.ts --apply` (sign-off) or accept as dev-data noise. Pre-existing, unrelated to onboarding work.
- [x] Two dead-click KPI cards: fixed (iter 2, `4ffe0f98`).
- [x] Fake "Lưu nháp" disabled button + misleading autosave claim on TripCreate (iter 3, `598006c9`).
- [ ] `shared/src/onboarding/tasks.ts:40` placeholder step 5 (fleet dashboard awareness) — confirm it's intended/complete or fill it.

### P3 — cleanup (only if time remains)
- [ ] Extract shared `<Badge>` (`XeNgoaiBadge.tsx:10`, `CustomersPage.tsx:422`).
- [ ] `audit.service.ts` 10 empty catches — add `logger.warn` for observability (best-effort enrichment).
- [ ] `reporting-shared.ts:42`, `useCRUD.ts:11`, `useTripFormState.ts:48`, `useSalaryPeriod.ts:31` `@deprecated` cleanup.
- [ ] `admin-chatbot-metrics.ts:235` TODO: per-call duration capture.
- [ ] `tripClient.ts:105` — type the bootstrap blob to remove the lone `any` suppression.

## Completion criteria (project-wide)
Track against the autonomous-mission completion criteria. Currently the dominant
remaining work is P1: verify + commit in-flight features, close the onboarding-
switch UI gap, and browser-verify the create-trip tour.

## Architectural decisions
- Onboarding switch stored in existing `app_settings` (key/value text), default-on, cache mirrors `services/llm/settings.ts`.
- Tour/checklist floating chrome positioned via `--trip-action-bar-height` CSS var published by `ActionBar` ResizeObserver (presentation-only, no data contract change).

## Known blockers
- None (no external creds/services required so far).

## Iteration log
- **iter 0 (baseline):** Captured baseline; fixed P0 frontend typecheck (`AllowedButtons` annotation). shared/backend tc pass, frontend tc+build pass, frontend tests 139/139, catalog test 8/8, backend tests 652/654 (1 pre-existing A8 data staleness). Reviewed full in-flight diff (tutorial repair + onboarding master switch incl. admin UI). Committed in-flight work (`eb96ca6e`, via hook).
- **iter 1 (regression coverage):** Added 2 TourControllerContext tests pinning the master-switch guard (tour refuses to start when `onboardingEnabled === false`; starts when `true`). frontend tests 139→141. Committed `4fc202a2`.
- **iter 2 (P2 dead controls):** Made summary-only KPI cards non-interactive on `AdminAdvancesPage` + `AdminAdvanceSettlementsPage` (AdvKPI/AsKPI `onClick` optional → static render, no dead `role="button"` in tab order). +CSS for static affordance. Committed `4ffe0f98`.
- **iter 3 (P1 fake control):** Removed dead disabled "Lưu nháp" button (title="Chưa hỗ trợ") + corrected misleading "Bản nháp được lưu tự động" status (no autosave exists) on TripCreate ActionBar. Committed `598006c9`.
- **iter 4 (browser verification):** Puppeteer-verified both features against live dev stack:
  - create-trip: targets `customerId`/`routeId`/`trip-new-submit`/`trip-new-form` all present; `--trip-action-bar-height`=74px published; 0 console errors, 0 failed API reqs; desktop+mobile layouts clean.
  - onboarding switch: API round-trip default-on→off→on all correct; ADMIN-only RBAC by Casbin design (only `p, ADMIN, *, *` matches `onboarding-settings`) + `requireRoles(ADMIN)`; admin UI renders toggle (`role="switch"`, `aria-checked`) + Save; 0 console errors.
  - Final gate: shared tc PASS / catalog 8/8 / backend tc PASS / frontend tc PASS / frontend tests 141/141 / build PASS / lint clean on changed files.

## Commits this loop
- `eb96ca6e` feat: onboarding admin master switch + create-trip tutorial usability improvements (in-flight work + P0 typecheck fix)
- `4fc202a2` test(onboarding): pin tour-launch master-switch guard
- `4ffe0f98` fix(advances): make summary-only KPI cards non-interactive
- `598006c9` fix(trip-form): remove fake 'Lưu nháp' button and misleading autosave claim
