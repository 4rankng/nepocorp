// Unit tests for the pure helper that resolves the effective
// `fuelFixedAllowanceApplied` value to use when the route is unchanged
// inside updateTripFigures. The fix is status-agnostic: a non-zero
// snapshot is preserved (B3 / D4 anchor for committed trips); a 0
// snapshot falls through to the live route value because 0 means
// "not snapshotted", not "0 by intent".

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFuelFixedAllowanceApplied } from '../services/trip-mutations.service';

describe('resolveFuelFixedAllowanceApplied', () => {
  test('snapshot=0 picks up the live route value (the Lai Châu 378L repro)', () => {
    assert.equal(resolveFuelFixedAllowanceApplied(0, 378), 378);
  });

  test('snapshot>0 keeps the snapshot across every status (CREATED / IN_TRANSIT / COMPLETED / LOCKED)', () => {
    // Even when the live route is updated to a different value, the trip's
    // stored snapshot wins — that's the B3 / D4 anchor.
    assert.equal(resolveFuelFixedAllowanceApplied(240, 378), 240);
    assert.equal(resolveFuelFixedAllowanceApplied(180, 500), 180);
  });

  test('snapshot=0 and live=0 stays 0', () => {
    assert.equal(resolveFuelFixedAllowanceApplied(0, 0), 0);
  });

  test('snapshot=0, live=378 also works for COMPLETED trips (live-DB confirmation: trip 229)', () => {
    // Before this fix trip 229 (COMPLETED, route 40, snapshot=0) could not
    // save with a 382L allocation — the trip total was 338L (per-km norm)
    // and the allocation check rejected the save. The fix lets the trip
    // compute 378L (or 378+supplement) for any status when the snapshot is 0.
    assert.equal(resolveFuelFixedAllowanceApplied(0, 378), 378);
  });
});
