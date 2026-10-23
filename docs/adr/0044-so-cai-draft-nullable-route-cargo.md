# 0044 — Sổ cái drafts: `trips.route_id` / `cargo_type_id` nullable

Date: 2026-10-22 · Status: accepted (demo branch)

## Context

The Sổ cái (`/ledger`) quick-add creates a trip from customer + departure date
only — the sheet lets dispatch open a row before the route/cargo type is known
(info arrives gradually). Both columns were `NOT NULL`, so every draft path had
to invent placeholder route/cargo rows (visible junk data, contingency the
customer explicitly disliked) or the columns had to relax.

## Decision

- Migration `0122_complete_grandmaster.sql`: `trips.route_id` and
  `trips.cargo_type_id` become nullable. Existing rows are all non-null; no
  backfill.
- `createTripSchema` (the full form) is UNTOUCHED — route/cargo stay required
  for the normal create flow. The nullable path is ledger-draft-only.
- `updateTripFigures` treats `trip.routeId == null` as "route-derived terms are
  0/skip" (fixed fuel allowance, road-allowance base, route salary term).
  Leg- and config-derived computation still runs so sheet-style partial entry
  (BOT stations, liters, salary) works before a route is chosen.
- Revenue on a route-less draft stays NULL after plan edits: `updateTripFigures`
  unconditionally rewrites `revenue` (resolveRevenue falls back to 0 for a
  never-priced draft), so `updateLedgerPlan` re-nulls `revenue`/`revenueOriginal`
  when the trip had none — an unknown price is a blank cell, never "0".
- `updateTripPlan` (ledger PLAN group) never sets route/cargo type; completing
  the plan happens through the existing full form, which satisfies the same
  `NOT NULL` expectations at completion as before.

## Consequences

- Downstream consumers must null-check `trip.routeId` / `trip.cargoTypeId`
  (guarded: `trip-mutations.service.ts`, `trip-status-machine.service.ts`;
  read paths already leftJoin).
- Ledger PLAN/MONEY group edits dispatch through `updateTripFigures` with
  stored values merged under the patch, so all accounting invariants
  (recomputation, ledger posting on COMPLETED, optimistic version) remain in
  exactly one place.
- Column-group permissions (`LedgerColumnGroup`/`LEDGER_GROUP_ROLES` in
  `shared/src/constants`) are enforced server-side by `requireGroupRole` and
  mirrored client-side by `features/ledger/ledgerPermissions` so the UI never
  offers an edit the API would answer 403.
