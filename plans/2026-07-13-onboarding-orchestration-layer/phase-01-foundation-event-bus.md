---
phase: 1
title: 'Foundation: Typed Product-Event Bus'
status: completed
priority: P1
effort: M
dependencies: []
---

# Phase 1: Foundation: Typed Product-Event Bus

## Overview

Introduce a small, typed, **frontend-only** product-event bus
(`onboardingEvents`) with `emit` / `on` / `waitFor` semantics, backed by a
**closed catalog of business event names** authored in `@tingting/shared`. This
is the completion-signal substrate that Phase 3's event-driven step model will
wait on, and that Phase 5's analytics will record. No business logic changes in
this phase — only the bus + the catalog + the first emitters at existing API
success call sites.

This phase adds **no behavior visible to the user yet**. It is pure
infrastructure; Phase 3 consumes it.

## Requirements

- **Functional**
  - A singleton typed emitter with `emit(name, payload?)`, `on(name, handler)`,
    `off(...)`, and `waitFor(name, { timeoutMs }) → Promise<payload | null>`.
  - A closed, exhaustively-checked catalog of product event names (e.g.
    `trip.created`, `trip.locked`, `receivable.payment_recorded`,
    `config.fuel_saved`, `ui.trip_create_clicked`, `accounting.dashboard_viewed`).
  - Emitters wired at the **existing** API success paths (no new fetch logic):
    trip create, trip lock, receivable payment record, fuel config save.
- **Non-functional**
  - Zero new npm dependencies (hand-rolled emitter, ~60 LOC).
  - `waitFor` must not leak listeners if the caller navigates away — returns
    `null` on timeout and unregisters.
  - Type-safe: a typo in an event name fails `tsc`.

## Architecture

The bus is a thin typed wrapper over a `Map<eventName, Set<handler>>`. It lives
in `frontend/src/lib/onboardingEvents.ts`. The **event-name catalog** and the
**payload types** live in `shared/src/onboarding/events.ts` so both the catalog
authors and (later) the backend analytics can reference one source.

```
shared/src/onboarding/
  events.ts            # ProductEventName union + per-event payload map (closed set)
  events.catalog.test.ts

frontend/src/lib/
  onboardingEvents.ts  # typed singleton emitter: emit / on / off / waitFor
  onboardingEvents.test.ts
```

**Type design (closed-set, typo-proof):**

```ts
// shared/src/onboarding/events.ts
export const PRODUCT_EVENTS = [
  'ui.trip_create_clicked',
  'trip.created',
  'trip.locked',
  'trip.completed',
  'receivable.payment_recorded',
  'config.fuel_saved',
  'accounting.dashboard_viewed',
  'fleet.dashboard_viewed',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

// Optional payload per event. Unknown events get `undefined`.
export interface ProductEventPayloads {
  'trip.created':       { tripId: number };
  'trip.locked':        { tripId: number };
  'receivable.payment_recorded': { customerId: number; amountVnd: number };
  // events not listed here carry no payload (undefined)
}
```

**Emitter API (frontend):**

```ts
// frontend/src/lib/onboardingEvents.ts
export const onboardingEvents = {
  emit<P>(name: ProductEventName, payload?: P): void;
  on(name: ProductEventName, handler: (payload: unknown) => void): () => void; // returns unsubscribe
  off(name: ProductEventName, handler): void;
  waitFor(name: ProductEventName, opts: { timeoutMs: number }): Promise<unknown | null>;
};
```

**`waitFor` semantics** (critical for Phase 3):
- Resolves with the payload when the event fires within `timeoutMs`.
- Resolves with `null` on timeout (Phase 3 decides what to do — keep waiting or
  surface a hint; the default tour policy is *never* to force-advance).
- Always cleans up its temporary listener on resolve/timeout (no leak).

## Related Code Files

- **Create** `shared/src/onboarding/events.ts`
- **Create** `shared/src/onboarding/events.catalog.test.ts`
- **Create** `frontend/src/lib/onboardingEvents.ts`
- **Create** `frontend/src/lib/onboardingEvents.test.ts`
- **Modify** `shared/src/index.ts` — barrel-export the new `onboarding/` module.
- **Modify** (emitter wiring, ~1 line each):
  - `frontend/src/hooks/useTripQueries.ts` (or the trip-create mutation's
    `onSuccess`) → emit `trip.created` with `{ tripId }`
  - the trip-lock success handler → emit `trip.locked`
  - `frontend/src/hooks/useQueries.ts` or the receivable payment hook → emit
    `receivable.payment_recorded`
  - the fuel-config save handler (`pages/config/FuelConfigPage`-adjacent) → emit
    `config.fuel_saved`
  - the trip-create **button** onClick → emit `ui.trip_create_clicked`

> Exact hook/component names for the emitters will be confirmed during
> implementation by grepping for the existing mutation success callbacks; the
> constraint is *emit at the success call site, do not add new fetch logic*.

## Implementation Steps

1. Author `shared/src/onboarding/events.ts` with the `PRODUCT_EVENTS` const, the
   `ProductEventName` union, and the `ProductEventPayloads` interface. Export
   from `shared/src/index.ts`.
2. Write `events.catalog.test.ts` asserting the array has no duplicates and
   every payload-typed event name actually appears in the array (compile-time +
   runtime closed-set guarantee).
3. Implement `frontend/src/lib/onboardingEvents.ts` — a module singleton with
   `emit/on/off/waitFor`. Keep it framework-agnostic (no React import) so it is
   trivially testable.
4. Write `onboardingEvents.test.ts`: emit→on fires; waitFor resolves on emit;
   waitFor resolves `null` on timeout; waitFor cleans up its listener (assert
   `on`-registered count drops).
5. Wire the four business-event emitters + the one UI-click emitter at their
   existing success/onClick sites. Each is a single `onboardingEvents.emit(...)`
   line; verify no double-emit (e.g. guard against React StrictMode double-mount
   for the click event — use the click handler, not an effect).
6. Run `pnpm build` (shared must build first) + the new tests; fix type errors
   from the closed-set enforcement.

## Success Criteria

- [ ] `onboardingEvents.emit('trip.created', { tripId: 1 })` type-checks;
      `emit('trip.craeted')` fails `tsc`.
- [ ] `waitFor('trip.created', { timeoutMs: 1000 })` resolves with the payload
      when `emit` fires, and with `null` after 1 s of silence.
- [ ] No listener leak: after a timed-out `waitFor`, a later `emit` does not
      resurrect the dead handler (assert in test).
- [ ] Creating a trip in the UI emits `trip.created` (verifiable via a temporary
      `on(...)` listener or the Phase 5 analytics stub).
- [ ] `pnpm build` passes; `shared` + `frontend` test suites green.
- [ ] No new runtime dependencies added.

## Risk Assessment

- **Risk:** Emitting from a mutation's `onSuccess` can double-fire in React
  StrictMode dev. **Mitigation:** emit from the user-gesture handler or a stable
  callback, never from a bare effect; the click event uses the button `onClick`.
- **Risk:** Event-name proliferation later. **Mitigation:** closed catalog +
  test; adding an event is a deliberate PR-visible edit to `PRODUCT_EVENTS`.
