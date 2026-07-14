# Phase 2 — checklist progress and dismissal repair

## Root cause

The manager checklist's dashboard and trip-list tasks shared a dashboard event that no page emitted. In addition, persisted `dismissed` task rows reopened the full checklist after refresh.

## Repair

1. Emit an orientation event when the dashboard mounts.
2. Add and emit a distinct trip-list page-view event.
3. Replay only durable page-view events to the later-mounting checklist, so first visits cannot be lost.
4. Keep a dismissed checklist minimized as its re-open badge without collapsing it again after the user reopens it.
5. Pin the two manager orientation events and replay behavior in regression tests.

## Contract

The change adds one closed-set frontend product event. It does not alter APIs, database rows, roles, or tour target contracts.
