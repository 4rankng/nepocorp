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
- frontend tests: PASS (139/139)
- frontend typecheck: **FAIL → P0 fixed** (`agentHighlight.ts` `as const` on `showButtons` made it readonly vs Driver.js `AllowedButtons[]`; fixed by importing `AllowedButtons` + explicit annotation)
- Frontend build/lint/backend tests: not yet run this session

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
- `OnboardingChecklist.tsx`: reads `user?.onboardingEnabled !== false` (default-on).

**Note:** feature B's admin UI (a page/control to flip the switch) is NOT yet present — only the API + the `/auth/me` exposure + the checklist consumer. Need to verify whether a settings UI is expected.

## Prioritized backlog

### P0 — blockers / build/startup
- [x] Fix frontend typecheck break in `agentHighlight.ts` (DONE iter 0).

### P1 — verify in-flight features do what they claim
- [ ] Commit in-flight work as coherent, reviewed changes (tutorial repair + onboarding switch — may be 2 commits).
- [ ] Add regression coverage for: checklist hidden while tour active; action-bar CSS var published; agentHighlight popover suppressed under tour; onboarding master switch default-on + flip behavior (backend).
- [ ] Decide + implement: onboarding master-switch admin UI (or confirm API-only is the intended scope).
- [ ] Verify the create-trip tour journey end-to-end in a browser (desktop + mobile).

### P2 — quality / coverage
- [ ] Run frontend build + backend tests (not yet run this session).
- [ ] Two dead-click KPI cards: `AdminAdvancesPage.tsx:337`, `AdminAdvanceSettlementsPage.tsx:389` (`onClick` no-op). Either wire to a real filter or render as non-interactive.
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
- **iter 0 (baseline):** Captured baseline; fixed P0 frontend typecheck (`AllowedButtons` annotation). shared/backend tc pass, frontend tc now pass, frontend tests 139/139, catalog test 8/8. Next: commit in-flight work + add regression coverage.
