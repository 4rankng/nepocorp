# Completion report — create-trip tutorial and checklist repair

Status: completed

| Acceptance criterion | Evidence |
|---|---|
| Tour remains usable above the create action bar | Floating tour reserves the action bar height; checklist hides during a tour. |
| Tutorial instructions are unambiguous | Curated Driver.js highlights no longer render the conflicting secondary popover. |
| Orientation tasks progress | Dashboard and trip-list page-view events are distinct and replayed to the later-mounting checklist. |
| “Để sau” remains dismissible | Persisted dismissal renders as a compact badge and a reopened panel survives later task updates. |
| Contracts remain safe | No API/database/role changes; shared event catalog only adds `trips.list_viewed`. |

Validation: 143 frontend tests passed; 653 backend tests passed; shared task catalog tests passed; shared typecheck passed; frontend production build passed.

## Staging verification — 2026-07-14

- Rebuilt and deployed the backend and frontend to `vantai.tingting.vip`; health check passed and database migrations completed.
- As a manager, visiting the dashboard and trip list completed the distinct onboarding milestones.
- The create-trip tour opened on `/trips/new` and its skip control closed the tour.
- The admin onboarding setting was turned off through its UI; the manager checklist disappeared, then the setting was restored to enabled.
