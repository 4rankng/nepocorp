import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { eq, inArray, isNull, sql } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { cacheInvalidate, disconnectRedis } from '../lib/redis';
import { TripStatus } from '@tingting/shared';
import { getDashboardStats } from '../services/dashboard-stats.service';
import { salaryPeriodDateRange } from '../services/reporting-shared';

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

test('dashboard financial warnings use subcontracted freight instead of company fuel and driver costs', async (t) => {
  const missingCount = async () => {
    await cacheInvalidate('reports:dashboard');
    const stats = await getDashboardStats();
    const item = stats.decisionItems.find(item => item.id === 'missing-trip-financials');
    return item ? Number.parseInt(item.title, 10) : 0;
  };
  const baseline = await missingCount();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ids: { customer?: number; route?: number; cargo?: number; trips: number[] } = { trips: [] };
  t.after(async () => {
    if (ids.trips.length) await db.delete(s.trips).where(inArray(s.trips.id, ids.trips));
    if (ids.cargo) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargo));
    if (ids.route) await db.delete(s.routes).where(eq(s.routes.id, ids.route));
    if (ids.customer) await db.delete(s.customers).where(eq(s.customers.id, ids.customer));
    await cacheInvalidate('reports:dashboard');
  });
  const [customer] = await db.insert(s.customers).values({ name: `DASH financial customer ${suffix}` }).returning();
  ids.customer = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `DASH financial route ${suffix}` }).returning();
  ids.route = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `DASH financial cargo ${suffix}` }).returning();
  ids.cargo = cargo.id;
  const now = new Date();
  const { start } = await salaryPeriodDateRange(now.getMonth() + 1, now.getFullYear());
  const shared = {
    customerId: customer.id, routeId: route.id, cargoTypeId: cargo.id,
    departureDate: start, status: TripStatus.IN_TRANSIT,
    revenue: '2000000',
  };
  const created = await db.insert(s.trips).values([
    { ...shared, tripCode: `DASH-FIN-EXT-${suffix}`.slice(0, 50), carrierType: 'EXTERNAL', externalFreightCost: '1000000', fuelLiters: '0', totalRoadAllowance: '0', driverSalary: '0' },
    { ...shared, tripCode: `DASH-FIN-OWN-${suffix}`.slice(0, 50), carrierType: 'OWN', fuelLiters: '50', totalRoadAllowance: '100000', driverSalary: '200000' },
  ]).returning({ id: s.trips.id });
  ids.trips = created.map(trip => trip.id);

  assert.equal(await missingCount(), baseline, 'a fully priced external trip does not need company fuel, road or salary figures');
  await db.update(s.trips).set({ externalFreightCost: '0' }).where(eq(s.trips.id, created[0].id));
  assert.equal(await missingCount(), baseline + 1, 'external freight is required for its warning');
  await db.update(s.trips).set({ driverSalary: '0' }).where(eq(s.trips.id, created[1].id));
  assert.equal(await missingCount(), baseline + 2, 'the existing own-truck completeness checks remain active');
  await db.update(s.trips).set({ deletedAt: new Date() }).where(inArray(s.trips.id, ids.trips));
  assert.equal(await missingCount(), baseline, 'deleted trips do not contribute warnings');
});
