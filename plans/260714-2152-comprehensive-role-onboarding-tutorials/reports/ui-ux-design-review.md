# UI/UX design review — persistent tutorial library

## Recommendation

Add a **right-side `Drawer` tutorial library** for office roles, launched from a compact topbar icon button and from a new checklist footer link. Keep the checklist a lightweight progress surface; the drawer is the durable place to browse, replay, and resume every role-appropriate tutorial. Do not turn the checklist itself into a longer scrollable catalog.

This stays in the existing visual language: Forest Sage, subtle outlined/soft actions, 44px controls, existing `Drawer` shell, and the existing `OnboardingChecklist` progress/check states. It avoids a full-screen competing workflow and does not appear for `DRIVER` or `FORWARDER`.

## Existing primitives to reuse

| Need | Existing pattern | Reuse decision |
| --- | --- | --- |
| Durable library container | `Drawer` from `frontend/src/components/UI.tsx` and `Drawer.css` | Reuse the portal, overlay, header, close control, responsive shell, and action footer. Give the tutorial drawer a narrowly scoped class such as `tutorial-library`. |
| Invocation affordance | `.icon-btn` in `frontend/src/components/layout/topbar.css` | Add a 44×44 `GraduationCap`/book icon to `.topbar__actions`; use `aria-label` and `title="Hướng dẫn sử dụng"`. Do not add a text CTA that competes with month/notification/chat controls. |
| Progress language | `OnboardingChecklist` circle/check, `is-done`, progress bar | Keep checklist completion as business-task status. In the library, label a completed walkthrough as “Đã xem hướng dẫn”, not as a completed business task. |
| Narrow-screen behavior | `Drawer.css` + existing 44px drawer close control | Keep the drawer full-width on phones; cards become one column and use 44px touch targets. The checklist remains its existing full-width bottom card at ≤640px. |
| Basic focus movement | `useFocusTrap` | Use it in the tutorial-library component, but supplement it with trigger focus restoration; current generic `Drawer` does not trap focus or return it. |

## Proposed component boundary and props

Create `frontend/src/components/onboarding/TutorialLibrary.tsx` with companion `tutorial-library.css`.

```ts
interface TutorialLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: (tourId: string) => void;
}
```

The component reads the authenticated role, role-filtered `TOUR_CATALOG`, and tour progress internally. It should not own checklist/task status. Its layout:

1. **Drawer header:** “Hướng dẫn sử dụng” and a short role-specific subheading (for example, “Các hướng dẫn dành cho Kế toán”).
2. **Summary strip:** tutorial count plus small “Đã xem X/Y” text; do not reuse the business-task percentage as the library’s state.
3. **Category groups:** use the catalog category metadata proposed in the plan. Within each group, use full-width, wrapping list cards: title, one-line/short wrapped description, estimated minutes, and a trailing `Bắt đầu` or `Xem lại` button. A resumed tour should say `Tiếp tục`.
4. **Empty state:** a text-only office-role-safe state when no tour is available; no new illustration asset is needed.

Avoid a search field and filters in this first pass: there are only 12 tours and role filtering keeps each catalog small. This is easier to scan and preserves the right-drawer width.

## Concrete integration points

| File | Required change |
| --- | --- |
| `frontend/src/components/Layout.tsx` | Own `tutorialLibraryOpen` state and a `tutorialTriggerRef`. Pass an open callback/ref into `Topbar`; render `TutorialLibrary` next to `OnboardingChecklist`. Opening from either surface sets state; closing restores focus to the initiating control. Gate with explicit `ADMIN` / `MANAGER` / `ACCOUNTANT`, never `!isDriver`. |
| `frontend/src/components/layout/Topbar.tsx` | Add the icon button only when passed the office-role library callback. Put it in `.topbar__actions` before `AgentAssistant`, so the persistent help entry remains visible and does not change driver chrome. |
| `frontend/src/components/layout/types.ts` | Add optional `onOpenTutorialLibrary` and `tutorialTriggerRef` to `TopbarProps`, using the appropriate React button ref type. |
| `frontend/src/components/onboarding/OnboardingChecklist.tsx` | Accept `onOpenTutorialLibrary`; add an explicit footer control such as “Xem tất cả hướng dẫn” before/alongside “Để sau”. Keep every checklist task’s “Hướng dẫn” action as the direct single-tour launch. |
| `frontend/src/components/onboarding/onboarding-checklist.css` | Add a footer layout that wraps cleanly on narrow screens; keep dismiss visually secondary. No change to the fixed panel z-index is needed. |
| `frontend/src/components/onboarding/TutorialLibrary.tsx` | New role-filtered drawer, semantic headings/list, focus handling, and start/resume behavior. |
| `frontend/src/components/onboarding/tutorial-library.css` | New page-scoped styles for summary, category groups, cards, and the single-column mobile layout. |

## Focus, overlay, and tour-start handling

`Drawer` currently portals to `document.body`, handles overlay/Escape closing, and has correct dialog semantics, but it does **not** use `useFocusTrap` or restore focus. `useFocusTrap` focuses the first element on open and cycles Tab only from the first/last element; it also does not restore focus on close.

For this feature:

1. Capture the actual opening button in `Layout` before opening the drawer (topbar button or checklist “Xem tất cả hướng dẫn”).
2. Give `TutorialLibrary` a drawer/content ref and call `useFocusTrap(ref, isOpen)` after it becomes visible.
3. On close and after the user starts a tour, return focus with `triggerRef.current?.focus()`. Clear the stored ref so a stale element is never focused after route/unmount.
4. Close the drawer **before** calling `start(tourId, ...)`; Driver.js needs the underlying target to be visible and interactive. This also prevents the drawer overlay from blocking the first step.
5. Do not mount/open the library while `tour` is active. `OnboardingChecklist` already hides during a tour; the library should follow the same guard.

The existing global z-order supports this: checklist is `60`, sticky topbar `100`, drawer overlay `200`, and drawer `300`. The tutorial library will correctly cover its open trigger and the checklist. No general overlay coordinator is necessary in this scoped change.

## Accessibility and visual details

- Use a real `button` for each launch/replay action, with visible text; avoid card-as-button nesting.
- Keep all titles/descriptions wrapping; this follows the no-truncation rule.
- Use icon plus text or `aria-label` for non-text controls; preserve visible focus states through existing button styles.
- Put the library after the main content in `Layout` as a portal-driven drawer; screen-reader dialog semantics come from `Drawer`.
- The topbar launch must be conditionally rendered for the explicit office-role set. `Topbar` currently only distinguishes `isDriver`, so `FORWARDER` would otherwise be included by mistake.

## Test implications

- Extend `OnboardingChecklist.test.tsx` for the new “Xem tất cả hướng dẫn” callback and retain dismissal behavior.
- Add library tests for role filtering, category/card labels, start/replay/resume labels, drawer close, and `DRIVER`/`FORWARDER` absence.
- Add focus tests: first focus moves into the drawer; close and start-tour restore focus to the correct invocation button.
- Add a layout/topbar test or focused render test that proves the topbar entry is absent for both non-office roles.

## Risks to avoid

- Do not use the checklist’s `pct === 100` condition to hide the library; completion of onboarding tasks must not erase access to reference guidance.
- Do not represent “tour watched” with the green task completion check. It is learning state, not an assertion that a financial/operational mutation happened.
- Do not rely only on `isDriver` for gating, because `FORWARDER` is also non-office.
- Do not start Driver.js until the drawer is closed and its overlay has been removed/finished its exit path; otherwise target elements may be visually or interactively occluded.

Status: DONE
Summary: Proposed a minimal office-only tutorial library using the existing Drawer, topbar action, and checklist surfaces, with exact integration files and focus/overlay safeguards.
Concerns/Blockers: The shared Drawer and useFocusTrap do not restore focus; the feature must implement restoration locally (or safely improve the shared primitive with regression coverage).
