import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { eq, inArray, isNull, sql } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { cacheInvalidate, disconnectRedis } from '../lib/redis';
import { TripStatus } from '@tingting/shared';
import { getDashboardStats } from '../services/dashboard-stats.service';

after(async () => {
  await disconnectRedis();
  await client.end();
});

test('dashboard sums real PostgreSQL fleet counts as numbers and excludes deleted trucks', async (t) => {
  const [baseline] = await db.select({ count: sql<number>`count(*)::int` })
    .from(s.trucks).where(isNull(s.trucks.deletedAt));
  const prefix = `DASH-${Date.now()}`;
  const trucks = await db.insert(s.trucks).values([
    { licensePlate: `${prefix}-A`, status: 'ACTIVE' },
    { licensePlate: `${prefix}-B`, status: 'ACTIVE' },
    { licensePlate: `${prefix}-M`, status: 'MAINTENANCE' },
    { licensePlate: `${prefix}-I`, status: 'INACTIVE' },
    { licensePlate: `${prefix}-D`, status: 'ACTIVE', deletedAt: new Date() },
  ]).returning({ id: s.trucks.id });
  t.after(async () => {
    await db.delete(s.trucks).where(inArray(s.trucks.id, trucks.map((truck) => truck.id)));
    await cacheInvalidate('reports:dashboard');
  });
  await cacheInvalidate('reports:dashboard');

  const stats = await getDashboardStats();

  assert.equal(typeof stats.totalTrucks, 'number');
  assert.equal(stats.totalTrucks, baseline.count + 4);
  assert.equal(stats.totalTrucks, Object.values(stats.fleetStatus).reduce((total, count) => total + count, 0));
  for (const count of Object.values(stats.fleetStatus)) assert.equal(typeof count, 'number');
});

test('dashboard splits in-transit trips into own-truck and subcontracted counts', async (t) => {
  // The fleet-utilization widget divides OUR running trips by OUR usable trucks.
  // Folding subcontracted trips into that numerator made the ratio exceed 100%
  // while the bar stayed clamped at 100 (kanban 20260922_32).
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `DASH split customer ${suffix}` }).returning();
  const [route] = await db.insert(s.routes).values({ name: `DASH split route ${suffix}` }).returning();
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `DASH split cargo ${suffix}` }).returning();
  const created = await db.insert(s.trips).values([
    { tripCode: `DASH-IT-OWN-${suffix}`.slice(0, 50), customerId: customer.id, routeId: route.id, cargoTypeId: cargo.id, status: TripStatus.IN_TRANSIT, carrierType: 'OWN', departureDate: '2026-09-20' },
    { tripCode: `DASH-IT-EXT-${suffix}`.slice(0, 50), customerId: customer.id, routeId: route.id, cargoTypeId: cargo.id, status: TripStatus.IN_TRANSIT, carrierType: 'EXTERNAL', departureDate: '2026-09-20' },
  ]).returning({ id: s.trips.id });
  t.after(async () => {
    await db.delete(s.trips).where(inArray(s.trips.id, created.map((trip) => trip.id)));
    await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargo.id));
    await db.delete(s.routes).where(eq(s.routes.id, route.id));
    await db.delete(s.customers).where(eq(s.customers.id, customer.id));
    await cacheInvalidate('reports:dashboard');
  });
  await cacheInvalidate('reports:dashboard');

  const stats = await getDashboardStats();

  assert.equal(typeof stats.inTransitInternalTrips, 'number');
  assert.equal(typeof stats.inTransitExternalTrips, 'number');
  assert.equal(
    stats.inTransitInternalTrips! + stats.inTransitExternalTrips!,
    stats.inTransitTrips,
    'internal + external must account for every in-transit trip',
  );
  assert.ok(stats.inTransitExternalTrips! >= 1, 'the seeded EXTERNAL trip must land in the external bucket');
});
