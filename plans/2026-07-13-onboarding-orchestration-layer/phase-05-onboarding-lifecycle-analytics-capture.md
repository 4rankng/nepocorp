---
phase: 5
title: Onboarding Lifecycle Analytics Capture
status: completed
priority: P2
effort: M
dependencies:
  - 3
---

# Phase 5: Onboarding Lifecycle Analytics Capture

## Overview

Record the onboarding lifecycle events the brief §12 enumerates, into a dedicated
analytics table modeled on the existing `agent_turn_metrics` pattern. This phase
does **not** build the analytics dashboard (deferred per the MVP scope decision) —
it only ensures the events are captured with a consistent, queryable schema so a
future dashboard (or the existing Chatbot Monitoring page) can consume them.

The events are emitted from Phase 3's state-machine transitions + Phase 1's event
bus, batched, and flushed to the server periodically / on tour end.

## Requirements

- **Functional** — capture these events (brief §12):
  - `onboarding_tour_started`
  - `onboarding_step_viewed`
  - `onboarding_target_missing`
  - `onboarding_action_completed` (a `completionEvent` fired)
  - `onboarding_step_skipped`
  - `onboarding_tour_completed`
  - `onboarding_tour_abandoned` (tour left in `waiting_for_action`/`showing` and
    session ends / another tour starts)
  - `onboarding_goal_completed` (the tour's business goal event fired, even
    outside the tour — powers "did onboarding drive real work" metrics)
- Each event row carries: `user_id`, `event_name`, `tour_id`, `tour_version`,
  `step_id`, `role`, `route_key`, `duration_ms` (where meaningful),
  `trigger_source` (`chatbot` | `checklist` | `manual`), `target_found`,
  `created_at`.
- **Non-functional**
  - Events are batched client-side (e.g. flush every 5 s or 20 events) and POSTed
    to a single `POST /api/onboarding/events` endpoint — not one request per
    event.
  - Telemetry never blocks the tour or the UI; failures are swallowed + logged.
  - Endpoint is office-role-gated + audited at the coarse level.

## Architecture

```
backend/src/db/schema.ts                    # onboarding_events table
backend/src/services/onboarding.service.ts  # + recordEvents(userId, events[])
backend/src/routes/onboarding.ts            # + POST /events (batch)

frontend/src/lib/onboardingTracker.ts       # batched event queue + flush
frontend/src/context/TourControllerContext.tsx  # emit on every status transition
```

**Schema (single append-only table; cheaper than per-event tables):**

```sql
CREATE TABLE onboarding_events (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  event_name   VARCHAR(60) NOT NULL,      -- onboarding_* closed set
  tour_id      VARCHAR(120),
  tour_version INTEGER,
  step_id      VARCHAR(120),
  role         VARCHAR(20) NOT NULL,
  route_key    VARCHAR(60),
  duration_ms  INTEGER,
  trigger_source VARCHAR(20),             -- chatbot | checklist | manual
  target_found BOOLEAN,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON onboarding_events (user_id, created_at);
CREATE INDEX ON onboarding_events (event_name, created_at);
```

`event_name` is a plain VARCHAR (not a pgEnum) to allow adding events without a
migration — but the **closed set** is enforced in shared TypeScript
(`ONBOARDING_EVENT_NAMES`) and the client only emits from that set.

**Batching client (onboardingTracker):**
- A small in-memory queue + a `setInterval` flush (5 s) + a flush-on-tour-end +
  flush-on-`visibilitychange:hidden`.
- On POST failure: keep the queue (cap size at 200 to avoid unbounded growth),
  retry next flush. Drop oldest if over cap (analytics is best-effort).

## Related Code Files

- **Modify** `backend/src/db/schema.ts` — add `onboardingEvents` table.
- **Modify** `backend/src/services/onboarding.service.ts` — add
  `recordEvents(userId, events[])` (bulk insert; validate `event_name` against
  the shared closed set server-side too).
- **Modify** `backend/src/routes/onboarding.ts` — add `POST /events` accepting
  the batch payload (Zod-validated array).
- **Create** `shared/src/onboarding/events.ts` (already from Phase 1) — extend
  with `ONBOARDING_EVENT_NAMES` const + `TriggerSource` union. (Phase 1 owns the
  product-event catalog; Phase 5 owns the *analytics*-event catalog. Keep both in
  the same `shared/src/onboarding/` directory but distinct exports to avoid
  confusing "business completion events" with "analytics events".)
- **Create** `frontend/src/lib/onboardingTracker.ts` — queue + flush.
- **Modify** `frontend/src/context/TourControllerContext.tsx` — call
  `onboardingTracker.track(...)` at each status transition:
  - `start` → `onboarding_tour_started` (with `trigger_source`).
  - step shown → `onboarding_step_viewed` (start a timer).
  - `completionEvent` fired → `onboarding_action_completed` (+ duration).
  - target missing → `onboarding_target_missing`.
  - skip step / skip tour → `onboarding_step_skipped`.
  - complete → `onboarding_tour_completed`.
  - another tour starts while one is active / unmount-mid-tour →
    `onboarding_tour_abandoned`.

## Implementation Steps

1. Add the `onboardingEvents` table + indexes; `db:generate` + `db:migrate`.
2. Extend `shared/src/onboarding/events.ts` with `ONBOARDING_EVENT_NAMES` +
   `TriggerSource`; export.
3. Add `recordEvents` to the service + the `POST /events` route; server-side
   drop rows whose `event_name` is outside the closed set (defense-in-depth).
4. Build `onboardingTracker.ts`: queue, `track(event)`, flush, cap, retry.
5. Instrument every `TourControllerContext` transition with `track` calls. Use
   the tour's `triggerSource` (set by whoever started the tour — chatbot path
   from Phase 7, checklist from Phase 6, or `manual`).
6. Tests: service bulk-insert + closed-set filter; tracker flush + cap + retry;
   integration test that a started-then-completed tour yields exactly the
   expected event sequence.
7. Manual QA: run a tour end-to-end in staging, query `onboarding_events`,
   confirm the event sequence + durations.

## Success Criteria

- [ ] A full tour run (start → view steps → complete) produces the expected
      ordered event rows in `onboarding_events` (assert in integration test).
- [ ] A target-missing recovery produces an `onboarding_target_missing` row.
- [ ] Events are batched: a single tour run does not produce more than ~2 POSTs
      (start flush + end flush) under normal pacing.
- [ ] `POST /api/onboarding/events` rejects events whose `event_name` is outside
      `ONBOARDING_EVENT_NAMES` (server-side guard).
- [ ] Non-office roles are rejected; office roles accepted.
- [ ] Tracker never throws into the tour UI (failure → swallow + log).

## Risk Assessment

- **Risk:** PII or sensitive business data leaks into event payloads.
  **Mitigation:** payloads carry only IDs + enums + durations — never amounts,
  customer names, or free text. The closed-set server guard rejects unexpected
  fields. Add a test asserting no free-text column exists.
- **Risk:** Unbounded queue growth if the server is down.
  **Mitigation:** cap at 200; drop oldest; analytics is best-effort by design.
- **Risk:** The deferred dashboard never gets built, leaving the data unused.
  **Mitigation:** the events are queryable directly via SQL / Drizzle Studio
  (`make studio`) for ad-hoc inspection; the Chatbot Monitoring page can be
  extended later without schema changes.
