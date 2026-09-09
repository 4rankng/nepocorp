// Live-DB regression test: trip 229 on the synced prod DB is the trip the
// customer was trying to save when the "Tổng phân bổ dầu (382 lít) phải bằng
// tổng dầu chuyến (338 lít)" 400 fired. It is COMPLETED, route 40 has a
// 378L fixed allowance, the trip's snapshot is 0 (route gained the
// allowance after the trip was created), the per-km norm gives 338L, and
// the user wanted to save 382L (378 + 4L supplement) into the allocation
// panel. The fix lets the trip compute 382L from the route's allowance
// regardless of status, so the allocation check passes.
//
// This test touches real rows on the synced prod DB and restores them.

import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray, and } from 'drizzle-orm';
import { FuelMode, LoadingType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { updateTripFigures } from '../services/trip-mutations.service';

const TRIP_ID = 229;
const SUPPLIER_ID = 10; // Petrolimex — used by other trips on the same route
const FUEL_LITERS_BEFORE: string[] = [];
const FIXED_ALLOWANCE_BEFORE: string[] = [];
const VERSIONS_BEFORE: number[] = [];
const ALLOCATION_IDS_TO_DELETE: number[] = [];

after(async () => {
  if (ALLOCATION_IDS_TO_DELETE.length > 0) {
    await db.delete(s.tripFuelAllocations)
      .where(inArray(s.tripFuelAllocations.id, ALLOCATION_IDS_TO_DELETE));
  }
  if (FUEL_LITERS_BEFORE.length > 0 && FIXED_ALLOWANCE_BEFORE.length > 0) {
    await db.update(s.trips).set({
      fuelLiters: FUEL_LITERS_BEFORE[0],
      fuelFixedAllowanceApplied: FIXED_ALLOWANCE_BEFORE[0],
      fuelSupplierId: null,
      version: VERSIONS_BEFORE[0],
    }).where(eq(s.trips.id, TRIP_ID));
  }
  await client.end();
});

describe('customer repro: trip 229 (synced prod DB)', () => {
  test('COMPLETED trip with snapshot=0 and route allowance=378L saves 382L allocation', async () => {
    const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, TRIP_ID)).limit(1);
    if (!trip) throw new Error(`Trip ${TRIP_ID} missing — was the prod DB re-synced?`);
    if (trip.status !== 'COMPLETED') {
      throw new Error(`Trip ${TRIP_ID} expected COMPLETED, got ${trip.status}`);
    }

    // Snapshot original values so the test cleans up after itself.
    FUEL_LITERS_BEFORE.push(String(trip.fuelLiters));
    FIXED_ALLOWANCE_BEFORE.push(String(trip.fuelFixedAllowanceApplied));
    VERSIONS_BEFORE.push(trip.version);

    const [route] = await db.select().from(s.routes)
      .where(eq(s.routes.id, trip.routeId)).limit(1);
    if (!route || Number(route.fixedFuelAllowance) !== 378) {
      throw new Error(`Route ${trip.routeId} expected fixedFuelAllowance=378, got ${route?.fixedFuelAllowance}`);
    }

    const legs = await db.select().from(s.tripLegs)
      .where(eq(s.tripLegs.tripId, TRIP_ID))
      .orderBy(s.tripLegs.sequence);
    assert.equal(legs.length, 2, 'Trip 229 should have 2 legs (round trip)');
    assert.equal(Number(legs[0].km), 487);
    assert.equal(legs[0].loadingType, 'HANG');
    assert.equal(legs[1].loadingType, 'VO');

    const updated = await updateTripFigures(TRIP_ID, {
      legs: legs.map(l => ({
        sequence: l.sequence,
        origin: l.origin,
        destination: l.destination,
        km: Number(l.km),
        loadingType: l.loadingType === 'HANG' ? LoadingType.HANG : LoadingType.VO,
      })),
      fuelMode: trip.fuelMode === 'FLAT_RATE' ? FuelMode.FLAT_RATE : FuelMode.AUTO,
      fuelLitersOverride: trip.fuelLitersOverride ? Number(trip.fuelLitersOverride) : null,
      fuelSupplementLiters: Number(trip.fuelSupplementLiters || 0),
      fuelAllocations: [{ supplierId: SUPPLIER_ID, liters: 382, paymentMethod: 'CREDIT' }],
      expectedVersion: trip.version,
      userId: 1,
    });

    assert.equal(updated.fuelLiters, '382.00',
      'Trip total should be route allowance (378) + supplement (4) = 382L');
    assert.equal(updated.fuelFixedAllowanceApplied, '378.00',
      'Snapshot was 0; should re-read live route value');
    assert.equal(updated.fuelSupplierId, SUPPLIER_ID,
      'Primary fuel supplier should be set from the allocation');

    const [allocation] = await db.select().from(s.tripFuelAllocations)
      .where(and(
        eq(s.tripFuelAllocations.tripId, TRIP_ID),
        eq(s.tripFuelAllocations.liters, '382.00'),
        eq(s.tripFuelAllocations.supplierId, SUPPLIER_ID),
      ));
    assert.ok(allocation, 'The 382L allocation row should be persisted');
    ALLOCATION_IDS_TO_DELETE.push(allocation.id);
  });
});
