// kanban 20260921_4: an external carrier's plate is unknown while planning (the
// partner assigns the truck later), so it must not be required to save the plan —
// but a subcontracted trip must not complete without it.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, isNull } from 'drizzle-orm';
import { Role, TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { transitionTripStatus } from '../services/trip-status-machine.service';
import { ApiError } from '../errors';
import { disconnectRedis } from '../lib/redis';

after(async () => {
  await disconnectRedis();
  await client.end();
});

async function fixtureTrip(carrierType: 'OWN' | 'EXTERNAL', externalPlateNumber: string | null) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ids: { customerId?: number; routeId?: number; cargoTypeId?: number; tripId?: number } = {};
  const [customer] = await db.insert(s.customers).values({ name: `Plate gate customer ${suffix}` }).returning();
  ids.customerId = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `Plate gate route ${suffix}` }).returning();
  ids.routeId = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `Plate gate cargo ${suffix}` }).returning();
  ids.cargoTypeId = cargo.id;
  const [trip] = await db.insert(s.trips).values({
    tripCode: `PLT-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargo.id,
    departureDate: '2026-09-21',
    status: TripStatus.IN_TRANSIT,
    carrierType,
    externalPlateNumber,
  }).returning();
  ids.tripId = trip.id;

  const cleanup = async () => {
    if (ids.tripId !== undefined) {
      await db.delete(s.ledger).where(eq(s.ledger.txnId, ids.tripId));
      await db.delete(s.tripContainers).where(eq(s.tripContainers.tripId, ids.tripId));
      await db.delete(s.trips).where(eq(s.trips.id, ids.tripId));
    }
    if (ids.cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargoTypeId));
    if (ids.routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, ids.routeId));
    if (ids.customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, ids.customerId));
  };

  return { trip, cleanup };
}

async function adminUserId(): Promise<number> {
  const [admin] = await db.select({ id: s.users.id })
    .from(s.users)
    .where(and(eq(s.users.role, Role.ADMIN), isNull(s.users.deletedAt)))
    .limit(1);
  assert.ok(admin, 'the local DB needs an ADMIN user to complete a trip');
  return admin.id;
}

test('completing a subcontracted trip without a plate is refused with a Vietnamese message', async () => {
  const { trip, cleanup } = await fixtureTrip('EXTERNAL', null);
  try {
    const userId = await adminUserId();
    await assert.rejects(
      () => transitionTripStatus(trip.id, TripStatus.COMPLETED, userId, Role.ADMIN),
      (err: unknown) => {
        assert.ok(err instanceof ApiError, 'a validation ApiError is raised');
        assert.equal(err.statusCode, 422);
        assert.match(err.message, /biển số xe/i);
        return true;
      },
    );
    const [unchanged] = await db.select({ status: s.trips.status }).from(s.trips).where(eq(s.trips.id, trip.id));
    assert.equal(unchanged.status, TripStatus.IN_TRANSIT, 'the trip does not move to Hoàn thành');
  } finally {
    await cleanup();
  }
});

test('a subcontracted trip with a plate, and an own-truck trip without one, both complete', async () => {
  const withPlate = await fixtureTrip('EXTERNAL', '15C-12345');
  const ownTruck = await fixtureTrip('OWN', null);
  try {
    const userId = await adminUserId();
    const completed = await transitionTripStatus(withPlate.trip.id, TripStatus.COMPLETED, userId, Role.ADMIN);
    assert.equal(completed.status, TripStatus.COMPLETED);
    const ownCompleted = await transitionTripStatus(ownTruck.trip.id, TripStatus.COMPLETED, userId, Role.ADMIN);
    assert.equal(ownCompleted.status, TripStatus.COMPLETED);
  } finally {
    await withPlate.cleanup();
    await ownTruck.cleanup();
  }
});
