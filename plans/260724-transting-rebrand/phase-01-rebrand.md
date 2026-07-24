---
phase: 1
title: Implement and verify the rebrand
status: in-progress
---

# Phase 01 — Implement and verify the rebrand

Progress: 9/10 checks complete.

## Implementation

1. Generate a square TransTing road/arrow brand mark matching the supplied navy, blue, and green reference direction; save responsive PNG sizes without overwriting the legacy files.
2. Keep the established deep emerald sidebar and primary actions, using transport blue in the brand mark and signal green for secondary accents while preserving semantic status colors and flat surfaces.
3. Replace user-facing TingTing/NEPO identity on the login screen, sidebar, browser/PWA metadata, application version, assistant/onboarding labels, route-title fallback, and workbook metadata.
4. Add focused brand-contract tests for required TransTing strings and forbidden legacy labels on scoped runtime surfaces.

## Checklist

- [x] Generate and install the TransTing brand mark and responsive PWA assets.
- [x] Add a compact transparent sidebar mark and constrain the Vietnamese brand descriptor so it cannot overflow the shell.
- [x] Centralize the approved Vietnamese identity copy.
- [x] Rebrand login, sidebar, titles, assistant, onboarding, export, PWA, and push-notification surfaces.
- [x] Apply emerald primary CTA/shell tokens with blue/green mark accents without changing semantic status colors.
- [x] Add automated brand-contract coverage.
- [x] Pass focused and full frontend tests.
- [x] Pass UI contract, production build, changed-file lint, and diff hygiene.
- [x] Complete adversarial code review and resolve all P0–P2 code findings.
- [ ] Capture and pass desktop/mobile browser design QA.

## Verification

- Run focused route and onboarding tests plus the brand-contract test.
- Run `pnpm --filter @tingting/frontend run check:ui`.
- Run the frontend test suite and production build.
- Run changed-file lint and `git diff --check`.
- Verify login and `/dashboard` at desktop and mobile widths, primary navigation, title/manifest, and browser console.
- Compare the rendered brand surfaces with the supplied reference and record the result in `design-qa.md`.

## Risks and rollback

- Internal `@tingting/*` names remain unchanged to avoid a cross-monorepo contract migration.
- If the generated mark loses clarity at 40px, use the same mark with a tighter crop rather than changing the UI footprint.
- Rollback is limited to the files listed in the phase report and the newly added TransTing assets.
