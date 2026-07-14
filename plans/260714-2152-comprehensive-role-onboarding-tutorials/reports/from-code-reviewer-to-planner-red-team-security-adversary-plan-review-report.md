# Red-Team Security Adversary Plan Review

## Verdict

**REJECT pending security corrections.** The plan relies on frontend event and role checks for the integrity of persisted onboarding state, but the existing REST API accepts caller-selected task IDs, tour IDs, versions, and terminal statuses. That makes several headline acceptance criteria bypassable with an authenticated office-role token. Six Critical/High/Medium flaws are confirmed below; no Low or informational items are included.

## Findings

### 1. Authenticated callers can mark event-gated mutation tasks complete without performing the mutation

- **Severity:** High
- **Location:** `phase-01-curate-role-based-tutorial-catalog.md:34-36,91-93,125-126`; `phase-02-instrument-guided-workflows.md:69-78`; `plan.md:75-76`
- **Flaw:** The plan treats the frontend discriminated completion policy and product-event bus as the enforcement boundary. It leaves the task persistence API unchanged even though that API accepts `status: "completed"` for any caller-supplied `taskId`; it does not resolve the shared catalog, verify the task belongs to the JWT role, or prove its completion event occurred.
- **Failure scenario:** An ACCOUNTANT sends `PUT /api/onboarding/tasks/accountant-record-first-receipt` with `{ "status": "completed" }` without recording a payment. The server persists 100%-eligible completion. The same works for fuel save, figures save, dispatch, create, and lock task IDs. Clicking through a tour may no longer complete the task, but calling the documented API does.
- **Evidence:** `backend/src/routes/onboarding.ts:43-46` validates only the status shape; `backend/src/routes/onboarding.ts:103-116` accepts an arbitrary path `taskId` and immediately calls `upsertTask`; `backend/src/services/onboarding.service.ts:110-139` stores that status without catalog, role, or event verification. By contrast, the proposed control exists only in the client hook: current event subscriptions write completion from the browser at `frontend/src/hooks/useOnboardingChecklist.ts:109-125`, and current tour completion does the same at `frontend/src/hooks/useOnboardingChecklist.ts:134-152`.
- **Suggested fix:** Make completion server-authoritative. At minimum, resolve `getTask(taskId)`, require `task.role === req.user.role`, and forbid clients from setting `completed` for `{type:'event'}` tasks. Prefer having the successful business endpoints record completion transactionally/server-side. Limit the client task endpoint to dismissal/pending UX state, or require a server-issued idempotent completion receipt tied to the successful mutation.

### 2. The progress API permits role-invisible, unknown, and fabricated current-version completions

- **Severity:** High
- **Location:** `phase-03-build-tutorial-library-and-validate-experience.md:33-43,137-139,154-159`; `phase-01-curate-role-based-tutorial-catalog.md:150-154`
- **Flaw:** The plan says current-version state comes from the existing progress API and that role checks remain in `toursForRole`/controller, but the server accepts any `tourId`, any positive `tourVersion`, any step string, and `completed` directly. Neither role visibility nor catalog membership is enforced server-side.
- **Failure scenario:** A MANAGER submits `PUT /api/onboarding/progress/system-readiness` with the catalog's current version and `status:"completed"`, or submits the same for any future ADMIN-only tour. A library implementation that joins role-filtered catalog entries to returned current-version rows will treat a forged row as authoritative completion. Unknown IDs also accumulate indefinitely and are returned on every progress fetch.
- **Evidence:** `backend/src/routes/onboarding.ts:37-41` accepts arbitrary positive versions and terminal statuses; `backend/src/routes/onboarding.ts:75-88` checks only non-empty/length-limited `tourId`; `backend/src/services/onboarding.service.ts:43-49` returns all of the user's rows; `backend/src/services/onboarding.service.ts:52-96` upserts without `getTour`/`toursForRole`. The only role guard is frontend-local in `frontend/src/context/TourControllerContext.tsx:110-115,276-282`. The catalog role filter itself is only a pure shared helper at `shared/src/tours/catalog.ts:143-150`.
- **Suggested fix:** Validate `tourId` against `getTour`, require the JWT role in `tour.roles`, require `tourVersion === tour.version`, and validate `currentStepId` against the tour's real step range. Do not accept `completed` directly for mutation tours; derive it from trusted completion or at least distinguish “guide viewed” from “business outcome completed.” Add denied-role, unknown-ID, forged-version, and direct-completion API tests.

### 3. Retiring `lock-trip-and-payment` is not enforceable during a rolling deploy or stale browser session

- **Severity:** High
- **Location:** `phase-01-curate-role-based-tutorial-catalog.md:43-45,137-146`; `phase-03-build-tutorial-library-and-validate-experience.md:161-166`
- **Flaw:** The plan calls the retired tour unreachable and its old rows harmless, but retirement exists only in the new shared bundle. A browser tab running the previous bundle still contains and authorizes the old tour for ACCOUNTANT. The unchanged backend neither denies retired IDs nor validates roles, and bumping unrelated tour versions does not invalidate this tour.
- **Failure scenario:** After deployment, an ACCOUNTANT with an already-open old SPA launches or resumes `lock-trip-and-payment`. Its bundled catalog explicitly includes ACCOUNTANT and guides the user through a lock action plus payment. It can continue writing progress for the retired ID. This defeats the plan's conservative removal of the ACCOUNTANT lock guide precisely during the mixed-client window rollback/versioning is supposed to make safe.
- **Evidence:** The current live catalog defines `lock-trip-and-payment` at `shared/src/tours/catalog.ts:54-82` and grants `Role.ACCOUNTANT` at line 61. The controller uses the locally bundled `TOUR_CATALOG` and local role tuple at `frontend/src/context/TourControllerContext.tsx:276-295`. The server accepts that free string at `backend/src/routes/onboarding.ts:75-88`. The database intentionally stores free strings, as documented in `backend/src/db/schema.ts:1278-1288`. There is no server retirement registry, minimum-client version, or deny list in the plan.
- **Suggested fix:** Add server-enforced active catalog validation and a retired-ID deny test before removing the tour from clients. If mixed clients must be supported, return `410 Gone` for retired progress writes and reject chatbot/controller launch through a server capability check. Explicitly include stale-bundle/rolling-deploy QA; version-bumping `create-trip` and `fuel-config` does not address the retired tour.

### 4. The manual escape hatch still records a mutation tour as completed without its success event

- **Severity:** Medium
- **Location:** `plan.md:32-34,76`; `phase-02-instrument-guided-workflows.md:76-78`; `phase-03-build-tutorial-library-and-validate-experience.md:33-35,42-43,138`
- **Flaw:** Phase 1 prevents `tour.completed` from completing an event-gated checklist task, but Phase 3 also displays per-tour “completed” state. The existing interaction-step escape hatch calls the same completion path as a real event when used on the last step, persists `status:'completed'`, and emits `tour.completed`. The plan keeps this behavior and does not define a truthful status distinction.
- **Failure scenario:** A user starts `create-trip`, reaches the final `trip.created` step, clicks **Tôi đã làm xong** without creating anything, and the controller advances past the final step. The checklist may correctly remain pending after the proposed hook change, yet the tutorial library labels that current tour version completed and offers resume/history based on false state.
- **Evidence:** The current create tour's last step waits for `trip.created` at `shared/src/tours/catalog.ts:42-50`. The UI exposes the manual button for every interaction step at `frontend/src/components/agent/TourController.tsx:124-136`. `manualAdvance` is just `advance(1)` at `frontend/src/context/TourControllerContext.tsx:376-380`; passing the last step persists `completed` and emits `tour.completed` at `frontend/src/context/TourControllerContext.tsx:137-161`. The explicit `complete()` path also persists completed at `frontend/src/context/TourControllerContext.tsx:341-377`.
- **Suggested fix:** Split terminal states into at least `verified_completed`, `manually_skipped`, and `viewed/completed_orientation`. On an event-gated final step, **Tôi đã làm xong** must abandon/skip verification, not persist completed. The library must display the verified state separately and tests must cover manual advance on the final mutation step.

### 5. The ADMIN master switch is a stale frontend hint, not an authoritative kill switch

- **Severity:** Medium
- **Location:** `phase-03-build-tutorial-library-and-validate-experience.md:40-41,97-98,154-157`; `phase-02-instrument-guided-workflows.md:141-145`
- **Flaw:** The plan promises both entry points hide and the controller rechecks the switch, but keeps the backend unchanged. `onboardingEnabled` is only a cached `/auth/me` field. Other users do not receive invalidation when an ADMIN flips the switch, and onboarding endpoints do not consult the setting.
- **Failure scenario:** ADMIN disables tutorials while MANAGER and ACCOUNTANT sessions are open. Their auth query does not refetch on focus and remains fresh for five minutes; an already-open library or direct controller call can still start tours, and direct progress/task/event requests remain accepted indefinitely. Only the ADMIN's own mutation invalidates that browser's `/auth/me` cache.
- **Evidence:** Login and `/auth/me` snapshot the switch at `backend/src/routes/auth.ts:51-65`. The frontend caches `/auth/me` for five minutes and disables focus refetch at `frontend/src/hooks/useAuth.tsx:63-72`. Saving settings invalidates only the current browser's auth query at `frontend/src/hooks/useAppSettings.ts:17-25`. The controller checks only cached `user.onboardingEnabled` at `frontend/src/context/TourControllerContext.tsx:276-282`; the backend onboarding mount and handlers contain no settings gate (`backend/src/index.ts:135-138`, `backend/src/routes/onboarding.ts:64-137`).
- **Suggested fix:** Enforce the switch on all onboarding REST routes and agent tour-control responses using the cached server settings service. Broadcast/invalidate the flag for active clients (socket event or short refetch), close any open library/tour when disabled, and test disable-while-active plus direct API denial.

### 6. Role changes leave a seven-day JWT authorization window for onboarding APIs

- **Severity:** Medium
- **Location:** `plan.md:37-40`; `phase-01-curate-role-based-tutorial-catalog.md:136-154`; `phase-03-build-tutorial-library-and-validate-experience.md:136-159`
- **Flaw:** The plan relies on JWT role checks but does not account for permission drift after an admin demotes or disables a user. The general auth middleware trusts the role embedded in the token; only `/auth/me` compares it to the database. Onboarding routes do not perform that comparison, and the default token lifetime is seven days.
- **Failure scenario:** An ADMIN changes an ACCOUNTANT to DRIVER. The old tab/token continues to satisfy Casbin and `requireRoles` for `/api/onboarding`, so it can read/write office progress and tasks for up to seven days or until explicit logout/blacklisting. If it retains an old bundle, it can also exercise the retired-tour scenario above.
- **Evidence:** JWTs embed the role at login (`backend/src/routes/auth.ts:45-49`). `authMiddleware` verifies signature/blacklist and copies the payload directly to `req.user` without loading the current user at `backend/src/middleware/auth.ts:25-37`. The DB-role comparison exists only in `/auth/me` at `backend/src/routes/auth.ts:58-65`. The onboarding route trusts the JWT role at the mount (`backend/src/index.ts:135-138`). The configured default expiry is `7d` at `backend/src/config/index.ts:39-45`.
- **Suggested fix:** Revoke all active tokens when role/status changes, or introduce a token/session version checked on every request. At minimum, load current role/status for onboarding/agent gates and reject mismatches. Add role-change tests proving an old token immediately loses library, progress, tasks, analytics, and chatbot tour control.

## Fact-check coverage

The following plan claims and named integration points were checked directly. This is included to make the hostile review reproducible; it does not add lower-severity findings.

### Phase 1 — 12 claims checked

1. `Tour` is the existing catalog contract — confirmed at `shared/src/tours/schema.ts:22-45`.
2. The current catalog contains three tours — confirmed at `shared/src/tours/catalog.ts:12-135`.
3. The mixed lock/payment tour exists — confirmed at `shared/src/tours/catalog.ts:54-82`.
4. `create-trip` exists and is MANAGER/ADMIN scoped — confirmed at `shared/src/tours/catalog.ts:13-20`.
5. `fuel-config` exists and includes ACCOUNTANT — confirmed at `shared/src/tours/catalog.ts:86-94`.
6. `TourId` is derived from catalog keys — confirmed at `shared/src/tours/catalog.ts:137-141`.
7. `toursForRole` exists — confirmed at `shared/src/tours/catalog.ts:143-150`.
8. Current tasks use one `completionEvent` plus optional `tourId` — confirmed at `shared/src/onboarding/tasks.ts:17-29`.
9. Current task totals are MANAGER 4, ACCOUNTANT 4, ADMIN 0 — confirmed by the rows at `shared/src/onboarding/tasks.ts:48-112`.
10. DRIVER/FORWARDER receive no task rows because `tasksForRole` filters exact role — confirmed at `shared/src/onboarding/tasks.ts:114-120`.
11. The checklist currently treats `tour.completed` as task completion — confirmed at `frontend/src/hooks/useOnboardingChecklist.ts:134-152`.
12. The orchestrator has the two hard-coded three-tour prompt lists and a role-validating tour net — confirmed at `backend/src/services/agent/orchestrator.ts:127-150,205-245`.

### Phase 2 — 12 claims checked

1. The `data-tour-id` then DOM `id` resolver exists — confirmed at `frontend/src/lib/tourTarget.ts:28-41`.
2. Missing-target polling/recovery exists — confirmed at `frontend/src/lib/tourTarget.ts:75-103` and `frontend/src/components/agent/TourController.tsx:88-113`.
3. The closed product-event catalog exists — confirmed at `shared/src/onboarding/events.ts:32-56`.
4. `trip.completed` is already declared — confirmed at `shared/src/onboarding/events.ts:36-40,63-68`.
5. `trip.dispatched` is not currently declared — confirmed absent from `shared/src/onboarding/events.ts:32-54`.
6. `trip.figures_saved` is not currently declared — confirmed absent from `shared/src/onboarding/events.ts:32-54`.
7. `trip.created` emits after a successful create — confirmed at `frontend/src/pages/TripCreatePage.tsx:42-50`.
8. `trip.locked` emits after successful lock paths — confirmed at `frontend/src/features/trip-detail/useTripDetailPage.ts:219-239`.
9. Receivable payment emits after successful POST — confirmed at `frontend/src/pages/DebtDetailPage.tsx:239-251`.
10. Fuel save emits after `mutateAsync` — confirmed at `frontend/src/pages/config/FuelConfigPage.tsx:48-61`.
11. Dispatch currently has the exact success callback but no onboarding event — confirmed at `frontend/src/features/dispatch/hooks/useDispatchMutations.ts:22-41`.
12. Existing controller waits for event names but accepts manual advancement — confirmed at `frontend/src/context/TourControllerContext.tsx:214-240,376-380`.

### Phase 3 — 11 claims checked

1. `Layout.tsx` exists and currently renders the checklist — confirmed at `frontend/src/components/Layout.tsx:37-45`.
2. `Topbar.tsx` and its props split exist — confirmed at `frontend/src/components/layout/Topbar.tsx:1-15,140-149`.
3. The checklist disappears at 100% — confirmed at `frontend/src/components/onboarding/OnboardingChecklist.tsx:56-58`.
4. The checklist is already office-role filtered — confirmed at `frontend/src/components/onboarding/OnboardingChecklist.tsx:21-35`.
5. The checklist currently hides while a tour is active — confirmed at `frontend/src/components/onboarding/OnboardingChecklist.tsx:56`.
6. `onboardingClient.getProgress()` exists — confirmed at `frontend/src/api/onboardingClient.ts:39-43`.
7. Controller `start(id,resumeStep,source)` exists — confirmed at `frontend/src/context/TourControllerContext.tsx:74,276-332`.
8. Server progress is per JWT user, not a user ID supplied by the client — confirmed at `backend/src/routes/onboarding.ts:66-88`.
9. Progress rows are versioned by `(user,tour,version)` — confirmed at `backend/src/services/onboarding.service.ts:52-95` and `backend/src/db/schema.ts:1250-1274`.
10. Existing UI has reusable modal/drawer/focus utilities — confirmed at `frontend/src/components/UI.tsx:411-423,482-496` and `frontend/src/components/layout/Topbar.tsx:5-7,32-34`.
11. React route permissions differ by page and are not a single generic office gate — confirmed at `frontend/src/App.tsx:105-114,129-200`.

Status: DONE
Summary: Six evidence-backed High/Medium plan flaws were confirmed, centered on server-side completion bypass, role-invisible progress forgery, stale-client retired-tour access, false manual completion, non-authoritative master-switch behavior, and stale JWT permission drift. The report also records 35 direct fact checks across the three phases.
Concerns/Blockers: None.
