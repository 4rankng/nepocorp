# Phase 1 — repair implementation and tests

## Files

- `frontend/src/components/onboarding/OnboardingChecklist.tsx`
- `frontend/src/components/agent/agent.css`
- `frontend/src/components/trip/ActionBar.tsx`
- `frontend/src/lib/agentHighlight.ts`
- `shared/src/tours/catalog.ts`
- Focused tests for tour state, Driver configuration, checklist visibility, and catalog shape.

## Steps

1. Expose the create form action bar's responsive height as a temporary document CSS variable and use it to position the floating tour and checklist.
2. Suppress the checklist while a tour is active.
3. Keep Driver.js's spotlight for curated tours while removing its duplicate popover; preserve the existing popover for normal chatbot highlights.
4. Make the first create-trip step navigation-only, increment its tour version, and retain precise later targets and completion event.
5. Add regression coverage and validate the affected frontend/shared contracts.

## Risk and rollback

The changes are presentation/state coordination only. Rollback is isolated to the files above; no persisted data or API schema is modified.

