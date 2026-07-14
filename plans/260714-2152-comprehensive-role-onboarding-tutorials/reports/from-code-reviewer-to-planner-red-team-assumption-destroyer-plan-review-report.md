# Red-Team Assumption Destroyer Plan Review

## Finding 1

**Severity:** High

**Location:** `phase-02-instrument-guided-workflows.md:90, 107-115, 125-126`

**Flaw:** The plan assigns dispatch-event instrumentation to `DispatchPage.tsx`, but the successful mutation callback is owned by `useDispatchMutations.ts`. The actual owner is absent from the related-files list and from the focused-test requirements, so the planned implementation can stamp UI targets without ever emitting `trip.dispatched` at the real success boundary.

**Failure scenario:** An implementer follows the file list and adds an emitter around `onDispatch={() => handleDispatch(trip.id)}` in the page. That emits on click/intent or requires changing the hook contract, and can fire even when confirmation is canceled or the API rejects. The checklist/tour then records a dispatch that never occurred, violating the plan's “success only” and “exactly once” criteria.

**Evidence:** `frontend/src/pages/DispatchPage.tsx:36` receives `handleDispatch` from the feature hook, and `frontend/src/pages/DispatchPage.tsx:127-129` merely passes it through to each card. The mutation, confirmation, success, error, and invalidation branches all live in `frontend/src/features/dispatch/hooks/useDispatchMutations.ts:22-41`; the only valid success point is after `await tripClient.dispatchTrip(tripId)` at lines 29-33. This file is not named at phase 2 lines 80-103. The direct caller inventory for the changed dispatch callback is complete (2 production files total): `frontend/src/pages/DispatchPage.tsx` and `frontend/src/features/dispatch/hooks/useDispatchMutations.ts`.

**Suggested fix:** Add `frontend/src/features/dispatch/hooks/useDispatchMutations.ts` and its focused test to the phase, place `trip.dispatched` immediately after the awaited mutation succeeds, and require negative coverage for canceled confirmation and rejected API calls. Keep `DispatchPage.tsx` limited to semantic targets unless its callback contract is intentionally changed.

## Finding 2

**Severity:** High

**Location:** `phase-02-instrument-guided-workflows.md:91-92, 107-119, 125-126`

**Flaw:** The plan names `useTripDetailPage.ts` as the place to instrument `trip.figures_saved`, but that hook does not save trip figures. Figure saves are a multi-request workflow owned by `use-trip-form-submit.ts` and invoked by `TripEditPage.tsx`; neither file is in the phase's related-files list. The plan also does not define whether “saved” means the figures PUT alone or the full form workflow, which additionally saves containers and instructions.

**Failure scenario:** Emitting from `useTripDetailPage.ts` is impossible because no figures mutation occurs there. Emitting from `TripEditPage.tsx` only when `handleSubmit` returns a trip ID misses the case where figures and containers commit but the later instructions request fails and returns `undefined`. Emitting immediately after the figures PUT, however, completes the task even if the subsequent container or instructions save fails. The task's truth condition is therefore undefined and cannot satisfy “exactly once on success.”

**Evidence:** `frontend/src/pages/TripEditPage.tsx:65-67` obtains `handleSubmit` from `useTripForm`, and lines 98-105 navigate only when it returns an ID. `frontend/src/hooks/useTripFormDispatch.ts:471` delegates the operation to `useTripFormSubmit`. The actual figures mutation is `frontend/src/hooks/use-trip-form-submit.ts:336-352`; container persistence follows at line 358, and instructions persistence follows at lines 367-381, where failure returns `undefined` after the earlier writes have already committed. By contrast, `frontend/src/features/trip-detail/useTripDetailPage.ts:201-253` owns lifecycle lock handling, not figure saving. Complete direct consumer chain for this changed save signal (5 production files total): `frontend/src/pages/TripEditPage.tsx`, `frontend/src/hooks/useTripForm.ts`, `frontend/src/hooks/useTripFormDispatch.ts`, `frontend/src/hooks/use-trip-form-submit.ts`, and `frontend/src/features/trip-detail/useTripDetailPage.ts` (incorrectly named by the plan, no save call).

**Suggested fix:** Define the business invariant for `trip.figures_saved` explicitly (successful figures PUT versus successful unified edit workflow), add `use-trip-form-submit.ts` and `TripEditPage.tsx` to scope, and test partial-success branches. If the intended outcome is only financial figures, emit after the successful `/pre-departure` or `/actuals` PUT and name/copy the task accordingly; if it means the full form, the current non-transactional workflow needs an explicit aggregate-success boundary.

## Finding 3

**Severity:** High

**Location:** `phase-01-curate-role-based-tutorial-catalog.md:43-45, 141-148`; `phase-03-build-tutorial-library-and-validate-experience.md:42-43, 101-103, 161-166`

**Flaw:** The plan relies on tour-version bumps to isolate incompatible progress, but the controller's local progress cache is keyed only by `tourId` and stores no tour version. The plan does not include `tourProgress.ts` in any phase. Consequently, a user with an in-progress old `create-trip` or `fuel-config` tour can be offered a resume against the new step sequence even though the server rows are versioned correctly.

**Failure scenario:** A browser has `create-trip` v2 at step 5 in local storage. Phase 1 ships v3 with a changed sequence. On refresh, the controller sees an in-progress record for `create-trip`, presents the new v3 tour as resumable, and starts it at the old index (clamped if necessary). A newer version-blind local timestamp can also prevent the current-version server row from winning reconciliation. The user resumes at the wrong instruction, while the library may label the current server version separately, producing contradictory state.

**Evidence:** `frontend/src/lib/tourProgress.ts:7-19` defines a schema and key using only `tingting:tour:v1:${tourId}`; `ProgressRecord` at lines 10-15 contains no `tourVersion`. `getInProgressStep` at lines 61-65 accepts only a tour ID. `frontend/src/context/TourControllerContext.tsx:117-129` scans `TOUR_IDS` and treats any local in-progress record as resumable for the current catalog tour; lines 306-325 compare the version-blind local timestamp with a server row filtered to the current `t.version`. `frontend/src/components/agent/TourController.tsx:32-53` resumes using that version-blind step. Complete production consumer inventory for the changed progress/version contract (3 files total): `frontend/src/lib/tourProgress.ts`, `frontend/src/context/TourControllerContext.tsx`, and `frontend/src/components/agent/TourController.tsx` (plus `frontend/src/context/TourControllerContext.test.tsx` as its test consumer).

**Suggested fix:** Add `tourProgress.ts`, the controller, the resume UI, and tests to phase 1 or 3. Store and require `tourVersion` in local records (or key by ID+version), ignore/migrate mismatched records, and make both resume discovery and freshness comparison version-aware before claiming version-safe rollback/current-state labels.

## Finding 4

**Severity:** High

**Location:** `phase-03-build-tutorial-library-and-validate-experience.md:36-49, 56-68, 91-103, 139-140`

**Flaw:** The proposed overlay coordination accounts for the checklist, tutorial library, and active tour, but omits the existing assistant drawer. The assistant is an independent `aria-modal` drawer with private open state mounted inside `Topbar`; `Layout` cannot close or disable it. Adding another top-bar dialog therefore does not meet the plan's “never stacks overlays,” focus trap/return, or keyboard acceptance criteria.

**Failure scenario:** A user opens the TingTing assistant, then activates **Hướng dẫn sử dụng** from the same top bar. Both the assistant drawer and tutorial library remain mounted as modal surfaces, each can capture Escape/focus, and focus return becomes nondeterministic. Starting a tour from the library can similarly leave the assistant drawer open because only assistant-originated navigate/focus directives close it.

**Evidence:** `frontend/src/components/layout/Topbar.tsx:245-249` always mounts `AgentAssistant` in the action group. `frontend/src/components/agent/AgentAssistant.tsx:26-35` owns private `open` state; lines 37-45 close it only for navigate/focus directives, not when another top-bar surface opens or a tour starts. The component renders `Drawer` at lines 115-128, and `frontend/src/components/UI.tsx:535-549` renders that drawer as `role="dialog" aria-modal="true"`. `frontend/src/components/Layout.tsx:335-372` supplies Topbar props but has no assistant open/close channel. Complete consumer inventory for the changed `TopbarProps`/overlay callback contract (5 files total): `frontend/src/components/layout/types.ts`, `frontend/src/components/layout/Topbar.tsx`, `frontend/src/components/layout/index.ts`, `frontend/src/components/Layout.tsx`, and `frontend/src/components/agent/AgentAssistant.tsx`.

**Suggested fix:** Extend the architecture to coordinate all top-level overlays, including the assistant drawer (and define precedence with profile/password modals). Either lift assistant open state/callbacks to `Layout` or introduce a narrow shared overlay coordinator; add tests that open the assistant first, then the library/tour, and assert exactly one modal plus deterministic focus return.

## Finding 5

**Severity:** Medium

**Location:** `phase-01-curate-role-based-tutorial-catalog.md:37-42, 54-72, 116-128, 150-154`; `phase-03-build-tutorial-library-and-validate-experience.md:31-43, 133-139`

**Flaw:** The plan defines task-to-tour assignments but never defines the complete role visibility matrix for the 12 tours. It explicitly leaves open that role arrays “may also expose” reference tours and gives ADMIN visibility as an example, while acceptance and security depend on deterministic `toursForRole` results. This is an unstated product contract, not an implementation detail.

**Failure scenario:** One implementer adds ADMIN to every office tour; another limits ADMIN to its three governance tours. Both satisfy the 13-task table, but they produce different tutorial-library contents and different chatbot/controller launch permissions. Similar ambiguity exists for MANAGER visibility of `fuel-config` or ACCOUNTANT visibility of non-task reference tours. Tests cannot assert the required library contents or allowed/denied chat IDs without inventing policy.

**Evidence:** The plan's only exact matrix at phase 1 lines 54-68 maps tasks to tours, not every tour to every visible role; lines 70-72 explicitly make additional role exposure optional. In code, `shared/src/tours/schema.ts:38-45` makes `Tour.roles` the authoritative visibility field. `shared/src/tours/catalog.ts:143-150` filters the library/search catalog directly from it, and `frontend/src/context/TourControllerContext.tsx:110-115, 276-282` rechecks the same field on start. Backend chat validation also relies on the same decision at `backend/src/services/agent/orchestrator.ts:216-235`. Complete production consumer inventory for tour role visibility (6 files total): `shared/src/tours/schema.ts`, `shared/src/tours/catalog.ts`, `backend/src/services/agent/tools/tours.ts`, `backend/src/services/agent/orchestrator.ts`, `frontend/src/context/TourControllerContext.tsx`, and the planned `frontend/src/components/onboarding/TutorialLibrary.tsx` (plus catalog/tour-net/controller tests).

**Suggested fix:** Add an explicit 12-tour × 3-office-role visibility table and make it an acceptance contract. Use that table to drive catalog tests, chatbot allowed/denied cases, library counts, and controller role tests; remove “may also expose” from executable scope.

## Finding 6

**Severity:** Medium

**Location:** `phase-01-curate-role-based-tutorial-catalog.md:34-36, 74-93, 95-113, 116-139`

**Flaw:** The plan introduces `TaskCompletion` as a shared discriminated contract but scopes edits only to `tasks.ts` and consumer tests; it does not decide whether or where the new named type is exported. The repository uses explicit two-level barrels, so defining the type in `tasks.ts` does not make it available from `@tingting/shared`. This creates export drift for the public contract shown in the architecture.

**Failure scenario:** The checklist or future library/test imports `TaskCompletion` from `@tingting/shared` as implied by the architecture and receives no export. An implementer can avoid the error by duplicating the union locally or never exporting it, leaving the documented shared contract unavailable to consumers. The plan's build gate may catch this only late, after phase 1's claimed catalog completion.

**Evidence:** `shared/src/onboarding/index.ts:22-23` explicitly exports only `OnboardingTask` from `tasks.ts`; `shared/src/index.ts:182-183` explicitly re-exports only the listed onboarding types. The current frontend imports the public `OnboardingTask` through `@tingting/shared` at `frontend/src/hooks/useOnboardingChecklist.ts:21-26`, demonstrating that the barrels are the supported boundary. Complete direct consumer/export inventory for the changed task contract (5 files total): `shared/src/onboarding/tasks.ts`, `shared/src/onboarding/index.ts`, `shared/src/index.ts`, `frontend/src/hooks/useOnboardingChecklist.ts`, and `shared/src/onboarding/tasks.test.ts` (with fixture consumers in `frontend/src/hooks/useOnboardingChecklist.test.tsx` and `frontend/src/components/onboarding/OnboardingChecklist.test.tsx`).

**Suggested fix:** State whether `TaskCompletion` is public. If yes, add both barrel files to phase 1 and test importing it from `@tingting/shared`; if no, remove the named public-looking architecture type and describe it as an internal field union. Update every old `completionEvent` fixture/assertion to the discriminated shape in the same phase.

Status: DONE
Summary: Six evidence-backed plan flaws found: two wrong mutation ownership assumptions, version-blind resume state, incomplete modal coordination, undefined tour-role visibility, and a missing shared export decision.
Concerns/Blockers: None.
