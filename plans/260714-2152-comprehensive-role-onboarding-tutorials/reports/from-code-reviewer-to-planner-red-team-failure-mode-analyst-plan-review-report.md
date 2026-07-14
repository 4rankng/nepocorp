# Red-Team Failure-Mode Review: Comprehensive Role-Based Onboarding Tutorials

## Scope

Hostile plan review only. Claims were checked against the current repository; no source, plan, build, lint, or test command was changed or run.

## Findings

### 1. CRITICAL — Tour-version bumps and the documented rollback are not safe with the current local cache

**Plan evidence:** Phase 1 requires bumping `create-trip` and `fuel-config` when their sequences/contracts change (`phase-01-curate-role-based-tutorial-catalog.md:43-45`), then claims old in-progress Postgres/localStorage rows are ignored because resume scans current `TOUR_IDS` (`phase-01-curate-role-based-tutorial-catalog.md:145-146`). Phase 3 further claims bumped versions prevent restored old clients from resuming incompatible sequences (`phase-03-build-tutorial-library-and-validate-experience.md:161-166`).

**Code evidence:** The local record has no `tourVersion`, and its storage key is only `tingting:tour:v1:<tourId>` (`frontend/src/lib/tourProgress.ts:7-18`). Resume scans the current IDs and accepts any cached in-progress step for the same ID (`frontend/src/context/TourControllerContext.tsx:117-126`), then clamps that stale numeric step into the new sequence (`frontend/src/context/TourControllerContext.tsx:276-295`). The server is correctly versioned by `(user, tour, version)` (`backend/src/db/schema.ts:1260-1274`), but the local cache is not. The existing `create-trip` ID is already version 2 (`shared/src/tours/catalog.ts:13-20`), proving IDs are deliberately reused across versions.

**Failure mode:** After the planned bump, an in-progress v2 local row can resume directly inside the v3 step sequence. After rollback, the v3 local step can likewise resume inside v2. Because `getUpdatedAt(tourId)` is also version-blind (`frontend/src/lib/tourProgress.ts:51-58`), a newer stale-version local timestamp can prevent the current-version server row from winning the reconciliation at `frontend/src/context/TourControllerContext.tsx:306-325`.

**Required plan correction:** Make local progress version-aware (key or record), define invalidation/migration behavior, and add forward-deploy plus rollback tests for same-ID version changes. Do not claim stale local rows are ignored until this is implemented.

**Contract consumers to enumerate:** `tourProgress` readers/writers; `TourControllerProvider` resume/start/reconcile paths; `TourController` resume prompt; `onboardingClient` progress rows; the new tutorial-library current-version normalization; chatbot `continue_tour` version stamping in `backend/src/services/agent/orchestrator.ts:230-234`; catalog/version tests.

### 2. HIGH — One-shot mutation events can be lost permanently, leaving completed real work marked pending

**Plan evidence:** The plan says mutation tasks complete only from their real success event (`plan.md:32-34`), and Phase 2's event flow assumes a successful mutation emits an event which both advances the controller and persists checklist state (`phase-02-instrument-guided-workflows.md:66-74`). It explicitly rejects backend verification/prerequisite redesign (`phase-02-instrument-guided-workflows.md:16-18,46`).

**Code evidence:** Mutation events are synchronous, in-memory, and discarded when no listener exists (`frontend/src/lib/onboardingEvents.ts:40-63`). Only page-view events are replayable; business mutations are explicitly one-shot (`frontend/src/lib/onboardingEvents.ts:31-38,73-78`). Checklist persistence occurs only inside the live event handler (`frontend/src/hooks/useOnboardingChecklist.ts:109-130`), while the backend task API merely stores whatever status the client submits (`backend/src/services/onboarding.service.ts:101-139`).

**Failure mode:** A mutation completed in another tab, before the hook/controller subscribes, during a remount, or between the HTTP success and client event handling is real business success but never updates the checklist. Retrying may be impossible or harmful (for example, recording another payment). The Phase 3 library can launch a guide, but it cannot reconcile the already-completed outcome.

**Required plan correction:** Define an idempotent recovery/reconciliation rule for each event-gated task (server-derived evidence, durable client outbox, or an explicit acknowledged limitation with a safe manual recovery that updates only the task). Add cross-tab/remount and already-completed-work cases to the validation matrix.

**Contract consumers to enumerate:** all success emitters (`TripCreatePage`, dispatch, trip figures, lock/complete, receivable payment, fuel config); `OnboardingEventBus`; `TourControllerProvider`; `useOnboardingChecklist`; onboarding task API/service/table; tutorial-library status UI.

### 3. HIGH — The tour subscribes after awaiting the directive, creating a fast-action race

**Plan evidence:** Phase 2 requires events to emit after successful API resolution and says the controller then advances (`phase-02-instrument-guided-workflows.md:68-74,113-119`). Its tests cover failure, click intent, target retry, and double-submit, but not an event emitted while the current step is still resolving its target (`phase-02-instrument-guided-workflows.md:114-119`).

**Code evidence:** The controller first awaits `sendAndWait(step.directive)` and only afterwards installs `waitFor(completionEvent)` (`frontend/src/context/TourControllerContext.tsx:183-224`). Target resolution deliberately waits at least 180 ms and can poll for 1.8 seconds (`frontend/src/context/AgentDirectiveProvider.tsx:190-203`). Mutation events have no replay (`frontend/src/lib/onboardingEvents.ts:73-78`).

**Failure mode:** A keyboard submit, already-focused control, or fast user action can complete the API while `sendAndWait` is still polling/highlighting. The checklist may complete, but the tour misses the event and remains on “waiting for action,” encouraging duplicate submission or manual escape.

**Required plan correction:** Register the one-shot completion listener before driving the directive, cancel it on target failure/step change, and test an event emitted during target resolution. Preserve generation guards so stale events cannot advance a later step.

**Contract consumers to enumerate:** `TourControllerProvider` drive effect; `OnboardingEventBus.waitFor`; `AgentDirectiveProvider.sendAndWait`; every interaction-step catalog entry; controller recovery/manual-advance UI; controller tests.

### 4. HIGH — The planned `trip.figures_saved` instrumentation misses the actual save path

**Plan evidence:** Phase 2 requires `trip.figures_saved` after the existing successful mutation (`phase-02-instrument-guided-workflows.md:31-37,113-115`), but its related files name only `useTripDetailPage.ts` and `TripHeader.tsx` for trip detail (`phase-02-instrument-guided-workflows.md:91-92`).

**Code evidence:** Financial figures are saved from `TripEditPage.onSubmit`, which awaits the form hook and then navigates (`frontend/src/pages/TripEditPage.tsx:98-105`). The real API success is inside `use-trip-form-submit.ts`, including `PUT /trips/:id/pre-departure` and subsequent container save/invalidation (`frontend/src/hooks/use-trip-form-submit.ts:456-505`). `useTripDetailPage.handleAction` instead owns lifecycle actions (`frontend/src/features/trip-detail/useTripDetailPage.ts:201-217`); it is not the figures-save callback.

**Failure mode:** An implementation following the file map can emit from the wrong lifecycle callback or omit the figures event entirely. Emitting in `use-trip-form-submit` without guarding edit mode could also falsely complete the accountant task from the create flow, because the hook is shared.

**Required plan correction:** Add `TripEditPage.tsx` and/or `use-trip-form-submit.ts` explicitly, specify the exact post-success/edit-mode boundary, and add negative coverage proving trip creation and partial multi-call failure do not emit `trip.figures_saved`.

**Contract consumers to enumerate:** `TripEditPage`; `useTripForm`/`useTripFormDispatch`; shared `use-trip-form-submit`; TripCreatePage (shared-hook non-consumer that must not emit); `OnboardingEventBus`; `TourControllerProvider`; `useOnboardingChecklist`.

### 5. MEDIUM — The portal-role regression matrix does not cover the current `isDriver`/office-role mismatch

**Plan evidence:** The library action must be for office roles only (`phase-03-build-tutorial-library-and-validate-experience.md:30-41`), and DRIVER/FORWARDER are excluded from the curriculum (`phase-01-curate-role-based-tutorial-catalog.md:46-50`). Yet the Phase 3 manual matrix includes only ADMIN/MANAGER/ACCOUNTANT (`phase-03-build-tutorial-library-and-validate-experience.md:129-131`).

**Code evidence:** `Layout` defines `isDriver` only as `user.role === 'DRIVER'` (`frontend/src/components/Layout.tsx:312-315`). `Topbar` uses `!isDriver` as its existing visibility convention for office-style controls (`frontend/src/components/layout/Topbar.tsx:189-208,245-249`). The planned `TopbarProps` change is a public component interface (`frontend/src/components/layout/types.ts:40-50`).

**Failure mode:** If the new help action follows the surrounding `!isDriver` pattern, FORWARDER receives the office tutorial entry. `toursForRole(FORWARDER)` returning an empty list limits content but still exposes a misleading empty help surface, violating the exclusion requirement.

**Required plan correction:** Require an explicit office-role predicate/capability for the action and add DRIVER and FORWARDER rendering tests plus both roles to the manual matrix.

**Contract consumers to enumerate:** `Layout` prop construction; `TopbarProps`; `Topbar`; any Topbar tests/stories; `toursForRole`; `TutorialLibrary` empty-role behavior; DRIVER/FORWARDER route shells.

### 6. MEDIUM — The plan assumes existing focus utilities that do not provide the required focus trap/return

**Plan evidence:** The library requires focus trap, focus return, Escape close, and a labelled dialog (`phase-03-build-tutorial-library-and-validate-experience.md:44-49`), while implementation step 1 says to build it with existing modal/drawer/focus utilities (`phase-03-build-tutorial-library-and-validate-experience.md:89-93`). No change to the shared modal/drawer primitives is in the file list (`phase-03-build-tutorial-library-and-validate-experience.md:70-87`).

**Code evidence:** The shared `Modal` attaches global Enter/Escape shortcuts and renders `role="dialog"`, but contains no focus-entry, Tab loop, inert/background handling, or trigger-focus restoration (`frontend/src/components/UI.tsx:71-100,423-480`). `Drawer` has the same shortcut/portal structure without those focus behaviors (`frontend/src/components/UI.tsx:496-575`). The current tour chrome is also a separate `role="dialog"` without focus ownership (`frontend/src/components/agent/TourController.tsx:59-77`).

**Failure mode:** Reusing the primitive as directed cannot satisfy the stated accessibility gate. A bespoke library-only trap would leave the shared primitive contract inconsistent and increases the chance of focus being returned to an unmounted checklist button when starting a tour.

**Required plan correction:** Name the concrete focus implementation and ownership: either enhance the shared primitive (with regression tests for all consumers) or implement and test a library-local accessible-dialog primitive. Define the start-tour focus handoff before closing the library.

**Contract consumers to enumerate:** `Modal`; `Drawer`; every existing modal/drawer caller; new `TutorialLibrary`; Topbar/checklist triggers; `TourController`; Escape handlers and focus-return tests.

### 7. MEDIUM — Phase 2's event-definition step is stale and can obscure the real wiring work

**Plan evidence:** The requirements correctly say to add `trip.dispatched` and `trip.figures_saved` while wiring the already-declared `trip.completed` (`phase-02-instrument-guided-workflows.md:31-34`). Implementation step 2 nevertheless says “Add the three event definitions/payloads” (`phase-02-instrument-guided-workflows.md:107-115`).

**Code evidence:** `trip.completed` is already in the closed event catalog and already has a payload (`shared/src/onboarding/events.ts:32-40,63-68`). It is not emitted by the current generic lifecycle handler: `TripDetailPage` passes completion through `handleAction` (`frontend/src/pages/TripDetailPage.tsx:73-74`), and that handler discards its `_action` argument and only awaits/refetches (`frontend/src/features/trip-detail/useTripDetailPage.ts:201-217`).

**Failure mode:** Treating completion as a new definition can yield unnecessary contract churn while missing the actual requirement: emit exactly once from the successful `/complete` path, without also emitting for dispatch/cancel through the same generic helper.

**Required plan correction:** Change step 2 to “add two definitions and wire three emitters,” and require action-specific positive/negative tests around the generic lifecycle helper.

**Contract consumers to enumerate:** shared `PRODUCT_EVENTS` and payload tests; `TripDetailPage` callbacks; `useTripDetailPage.handleAction`; `TourControllerProvider`; any future `trip.completed` tour/checklist consumer.

## Overall verdict

The plan should not enter implementation unchanged. The local-cache/version issue invalidates its stale-progress and rollback claims, while the transient event design and listener ordering can leave successful workflows stuck or invite duplicate mutations. The remaining findings are bounded but should be added to the phase file maps and acceptance matrix before work starts.

Status: DONE
Summary: Seven evidence-backed Critical/High/Medium plan flaws were documented, with exact plan and code locations plus interface consumers.
Concerns/Blockers: Critical version-blind local progress and High one-shot event races must be resolved in the plan before implementation.
