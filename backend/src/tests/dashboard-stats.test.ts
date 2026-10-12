import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { eq, inArray, isNull, sql } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { cacheInvalidatePattern, disconnectRedis } from '../lib/redis';
import { TripStatus } from '@tingting/shared';
import { getDashboardStats } from '../services/dashboard-stats.service';
import { getPnlReport } from '../services/pnl.service';
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
    await cacheInvalidatePattern('reports:dashboard:*');
  });
  await cacheInvalidatePattern('reports:dashboard:*');

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
    await cacheInvalidatePattern('reports:dashboard:*');
  });
  await cacheInvalidatePattern('reports:dashboard:*');

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
    await cacheInvalidatePattern('reports:dashboard:*');
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
    await cacheInvalidatePattern('reports:dashboard:*');
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

test('dashboard KPIs are pinned to the requested period and reproduce the P&L report for it', async (t) => {
  // kanban 101026003200: KPI values drifted between reloads with no data
  // change. For a fixed dataset the dashboard aggregates must (a) cover exactly
  // the requested (month, year) instead of the server clock's "now", (b)
  // reproduce identically on every recompute, and (c) carry the same KPI
  // figures /reports/pnl serves for that period, so the KPI row cannot render
  // different numbers depending on which query landed first.
  const bustReports = async () => {
    await cacheInvalidatePattern('reports:dashboard:*');
    await cacheInvalidatePattern('reports:pnl:*');
  };
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ids: { customer?: number; route?: number; cargo?: number; supplier?: number; category?: number; trips: number[]; expenses: number[] } = { trips: [], expenses: [] };
  t.after(async () => {
    if (ids.trips.length) await db.delete(s.trips).where(inArray(s.trips.id, ids.trips));
    if (ids.expenses.length) await db.delete(s.expenses).where(inArray(s.expenses.id, ids.expenses));
    if (ids.category) await db.delete(s.expenseCategories).where(eq(s.expenseCategories.id, ids.category));
    if (ids.supplier) await db.delete(s.suppliers).where(eq(s.suppliers.id, ids.supplier));
    if (ids.cargo) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargo));
    if (ids.route) await db.delete(s.routes).where(eq(s.routes.id, ids.route));
    if (ids.customer) await db.delete(s.customers).where(eq(s.customers.id, ids.customer));
    await bustReports();
  });

  await bustReports();
  const before = await getDashboardStats(3, 2026);

  const [customer] = await db.insert(s.customers).values({ name: `DASH period customer ${suffix}` }).returning();
  ids.customer = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `DASH period route ${suffix}` }).returning();
  ids.route = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `DASH period cargo ${suffix}` }).returning();
  ids.cargo = cargo.id;
  const [supplier] = await db.insert(s.suppliers).values({ name: `DASH period supplier ${suffix}` }).returning();
  ids.supplier = supplier.id;
  const [category] = await db.insert(s.expenseCategories).values({ name: `DASH period category ${suffix}` }).returning();
  ids.category = category.id;

  const { start } = await salaryPeriodDateRange(3, 2026);
  const [trip] = await db.insert(s.trips).values({
    tripCode: `DASH-PERIOD-${suffix}`.slice(0, 50),
    customerId: customer.id, routeId: route.id, cargoTypeId: cargo.id,
    departureDate: start, status: TripStatus.COMPLETED, carrierType: 'OWN',
    revenue: '2000000', totalCost: '1200000',
  }).returning({ id: s.trips.id });
  ids.trips = [trip.id];
  const [expense] = await db.insert(s.expenses).values({
    expenseDate: start, supplierId: supplier.id, categoryId: category.id,
    truckId: null, vehicleComponent: null, amount: '500000', paymentStatus: 'PAID',
  }).returning({ id: s.expenses.id });
  ids.expenses = [expense.id];

  await bustReports();
  const first = await getDashboardStats(3, 2026);
  assert.equal(first.tripCount, before.tripCount + 1, 'the requested period must cover the seeded trip');

  await bustReports();
  const second = await getDashboardStats(3, 2026);
  assert.deepEqual(second, first, 'a fixed dataset must reproduce identical figures on every recompute');

  await bustReports();
  const pnl = await getPnlReport(3, 2026);
  assert.equal(first.revenue, pnl.totalRevenue);
  assert.equal(first.costs, pnl.totalCosts);
  assert.equal(first.grossProfit, pnl.grossProfit);
  assert.equal(first.netProfit, pnl.netProfit);
  assert.equal(first.otherIncome, pnl.otherIncome);
  assert.equal(first.companyExpenses, pnl.companyExpenses);
  assert.notEqual(first.netProfit, first.grossProfit, 'the seeded company expense must separate net from gross');
});
