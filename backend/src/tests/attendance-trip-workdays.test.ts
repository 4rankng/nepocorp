import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { disconnectRedis } from '../lib/redis';
import { syncTripWorkDays } from '../services/attendance.service';

/**
 * syncTripWorkDays used to run one INSERT … ON CONFLICT per date. It now issues
 * a single batched upsert, so this pins the two things a batching refactor can
 * break: every date in the range gets a TRIP_DAY row, and re-running for an
 * overlapping range updates in place instead of inserting duplicates.
 */

const createdDriverIds: number[] = [];
const createdTripIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];

after(async () => {
  if (createdDriverIds.length > 0) {
    await db.delete(s.driverWorkDays).where(inArray(s.driverWorkDays.driverId, createdDriverIds));
    await db.delete(s.drivers).where(inArray(s.drivers.id, createdDriverIds));
  }
  if (createdTripIds.length > 0) {
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdCustomerIds.length > 0) {
    await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  }
  if (createdRouteIds.length > 0) {
    await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  }
  if (createdCargoTypeIds.length > 0) {
    await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  }
  await disconnectRedis();
  await client.end();
});

async function fixtureDriverAndTrip(): Promise<{ driverId: number; tripId: number }> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [driver] = await db.insert(s.drivers).values({ name: `QA workday ${suffix}` }).returning();
  createdDriverIds.push(driver.id);
  const [customer] = await db.insert(s.customers).values({ name: `QA workday cust ${suffix}` }).returning();
  createdCustomerIds.push(customer.id);
  const [route] = await db.insert(s.routes).values({ name: `QA workday route ${suffix}` }).returning();
  createdRouteIds.push(route.id);
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `QA workday cargo ${suffix}` }).returning();
  createdCargoTypeIds.push(cargoType.id);
  const [trip] = await db.insert(s.trips).values({
    tripCode: `WD-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargoType.id,
    departureDate: '2026-01-01',
  }).returning();
  createdTripIds.push(trip.id);
  return { driverId: driver.id, tripId: trip.id };
}

describe('syncTripWorkDays batches the work-day upsert', () => {
  test('creates one TRIP_DAY per date, then upserts overlapping dates in place', async () => {
    const { driverId, tripId } = await fixtureDriverAndTrip();

    await syncTripWorkDays(driverId, tripId, '2026-01-01', '2026-01-03', null);

    const first = await db.select().from(s.driverWorkDays).where(eq(s.driverWorkDays.driverId, driverId));
    assert.equal(first.length, 3);
    assert.deepEqual(
      first.map((r) => r.date).sort(),
      ['2026-01-01', '2026-01-02', '2026-01-03'],
    );
    for (const row of first) {
      assert.equal(row.status, 'TRIP_DAY');
      assert.equal(row.tripId, tripId);
    }
    // Second call overlaps two dates. Backdate the rows first so the assertion
    // that the upsert refreshed updatedAt is deterministic (no wall-clock wait).
    const staleStamp = new Date('2020-01-01T00:00:00Z');
    await db.update(s.driverWorkDays)
      .set({ updatedAt: staleStamp })
      .where(eq(s.driverWorkDays.driverId, driverId));

    await syncTripWorkDays(driverId, tripId, '2026-01-01', '2026-01-02', null);

    const second = await db.select().from(s.driverWorkDays)
      .where(and(eq(s.driverWorkDays.driverId, driverId), inArray(s.driverWorkDays.date, ['2026-01-01', '2026-01-02', '2026-01-03'])));
    assert.equal(second.length, 3, 'upsert must not duplicate rows');
    for (const date of ['2026-01-01', '2026-01-02']) {
      const row = second.find((r) => r.date === date)!;
      assert.ok(row.updatedAt > staleStamp, `${date} updatedAt should be refreshed by the upsert`);
    }
  });
});
