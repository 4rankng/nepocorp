import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { distributeProfit, previewDistribution } from '../services/profit-distribution.service';
import { quarterDateRange } from '../services/reporting-shared';

/**
 * The quarterly distribution preview aggregates the quarter's reportable trips
 * — COMPLETED (hoàn thành) + LOCKED (chốt sổ) — inside the quarter's date
 * window, on the same basis the monthly P&L counts them.
 *
 * The reported defect was a Q4/2026 preview showing 0 trips / 0 ₫ while the
 * October P&L showed 25 trips: the plan counted LOCKED trips only and that
 * quarter holds finished-but-unlocked trips, so the preview computed zero
 * (kanban 101026211500). These tests pin the window (including its last day),
 * the reportable basis, and that the preview equals what distribution pays.
 */

const createdIds: { trips: number[]; trucks: number[]; routes: number[]; cargoTypes: number[]; customers: number[]; capRows: number[] } = {
  trips: [], trucks: [], routes: [], cargoTypes: [], customers: [], capRows: [],
};

after(async () => {
  // FK order matters: distributions and truck_cap_table reference trucks, and
  // trips reference trucks/customers/routes/cargo_types — children first.
  await db.delete(s.distributions).where(and(eq(s.distributions.quarter, 2), eq(s.distributions.year, 2031)));
  if (createdIds.capRows.length > 0) await db.delete(s.truckCapTable).where(inArray(s.truckCapTable.id, createdIds.capRows));
  if (createdIds.trips.length > 0) await db.delete(s.trips).where(inArray(s.trips.id, createdIds.trips));
  if (createdIds.trucks.length > 0) await db.delete(s.trucks).where(inArray(s.trucks.id, createdIds.trucks));
  if (createdIds.routes.length > 0) await db.delete(s.routes).where(inArray(s.routes.id, createdIds.routes));
  if (createdIds.cargoTypes.length > 0) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdIds.cargoTypes));
  if (createdIds.customers.length > 0) await db.delete(s.customers).where(inArray(s.customers.id, createdIds.customers));
  await client.end();
});

async function fixtureTrip(
  ctx: { customerId: number; routeId: number; cargoTypeId: number; truckId: number | null },
  status: 'LOCKED' | 'COMPLETED',
  departureDate: string,
  grossProfit: number,
): Promise<void> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [trip] = await db.insert(s.trips).values({
    tripCode: `QAQ-${suffix}`.slice(0, 50),
    customerId: ctx.customerId,
    routeId: ctx.routeId,
    cargoTypeId: ctx.cargoTypeId,
    truckId: ctx.truckId,
    status,
    departureDate,
    revenue: '0',
    totalCost: '0',
    grossProfit: String(grossProfit),
  }).returning({ id: s.trips.id });
  createdIds.trips.push(trip.id);
}

async function fixtureBase(suffix: string) {
  const [customer] = await db.insert(s.customers).values({ name: `QAQ customer ${suffix}` }).returning({ id: s.customers.id });
  const [route] = await db.insert(s.routes).values({ name: `QAQ route ${suffix}` }).returning({ id: s.routes.id });
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `QAQ cargo ${suffix}` }).returning({ id: s.cargoTypes.id });
  const [truck] = await db.insert(s.trucks).values({ licensePlate: `QAQ${Date.now() % 100000}` }).returning({ id: s.trucks.id });
  createdIds.customers.push(customer.id);
  createdIds.routes.push(route.id);
  createdIds.cargoTypes.push(cargoType.id);
  createdIds.trucks.push(truck.id);
  return { customerId: customer.id, routeId: route.id, cargoTypeId: cargoType.id, truckId: truck.id };
}

describe('quarterly distribution basis (kanban 101026211500)', () => {
  const QUARTER = { quarter: 1, year: 2031 };

  test('counts every completed and locked trip in the quarter window', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ctx = await fixtureBase(suffix);

    // Completed and locked trips both carry the quarter's profit.
    await fixtureTrip(ctx, 'LOCKED', '2031-02-10', 5_000_000);
    await fixtureTrip(ctx, 'COMPLETED', '2031-02-11', 7_000_000);
    // Last day of the quarter: the window's exclusive end must still include it.
    await fixtureTrip(ctx, 'COMPLETED', '2031-03-31', 1_000_000);
    // A trip without a truck still counts in the quarter's profit, but reaches
    // no owner pool — its money is held aside.
    await fixtureTrip({ ...ctx, truckId: null }, 'COMPLETED', '2031-02-12', 2_000_000);
    // Outside the quarter (Q3/2031) → must not appear anywhere in Q1.
    await fixtureTrip(ctx, 'COMPLETED', '2031-07-01', 9_000_000);

    const preview = await previewDistribution(QUARTER.quarter, QUARTER.year);

    assert.equal(preview.tripCount, 4, 'every reportable trip in the window counts');
    assert.equal(preview.netProfit, 15_000_000);
    assert.equal(preview.distributions.length, 0, 'the fixture truck has no owners configured');
    assert.equal(preview.undistributedProfit, 15_000_000, 'no payee → the whole quarter is held aside');

    // A neighbouring quarter and year stay empty — the aggregation is per quarter.
    const nextQuarter = await previewDistribution(2, 2031);
    assert.equal(nextQuarter.tripCount, 0);
    assert.equal(nextQuarter.netProfit, 0);
    const earlierYear = await previewDistribution(QUARTER.quarter, 2030);
    assert.equal(earlierYear.tripCount, 0);
    assert.equal(earlierYear.netProfit, 0);
  });

  test('the preview equals the total the real distribution pays', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ctx = await fixtureBase(suffix);
    const owners = await db.insert(s.truckCapTable).values([
      { truckId: ctx.truckId, partnerName: `QAQ owner A ${suffix}`, percentage: '60.00', effectiveDate: '2020-01-01' },
      { truckId: ctx.truckId, partnerName: `QAQ owner B ${suffix}`, percentage: '40.00', effectiveDate: '2020-01-01' },
    ]).returning({ id: s.truckCapTable.id });
    createdIds.capRows.push(...owners.map(o => o.id));

    // Q2/2031 — one locked and one completed trip: both belong to the plan.
    await fixtureTrip(ctx, 'LOCKED', '2031-05-10', 6_000_000);
    await fixtureTrip(ctx, 'COMPLETED', '2031-05-11', 4_000_000);

    const preview = await previewDistribution(2, 2031);
    assert.equal(preview.tripCount, 2);
    assert.equal(preview.netProfit, 10_000_000);
    assert.equal(preview.undistributedProfit, 0);
    assert.deepEqual(preview.distributions.map(d => Number(d.amount)).sort((a, b) => a - b), [4_000_000, 6_000_000]);

    const result = await distributeProfit(2, 2031);
    assert.deepEqual(result, { ...preview, quarter: 2, year: 2031 }, 'the run reports exactly what the preview promised');

    const persisted = await db.select().from(s.distributions)
      .where(and(eq(s.distributions.quarter, 2), eq(s.distributions.year, 2031)));
    const paid = persisted.reduce((sum, r) => sum + Number(r.amount), 0);
    assert.equal(paid, preview.netProfit - preview.undistributedProfit);
    assert.equal(paid, 10_000_000);
  });

  test('the quarter window is [first day of quarter, first day after it)', async () => {
    assert.deepEqual(await quarterDateRange(1, 2031), { start: '2031-01-01', end: '2031-04-01' });
    assert.deepEqual(await quarterDateRange(2, 2031), { start: '2031-04-01', end: '2031-07-01' });
    assert.deepEqual(await quarterDateRange(4, 2031), { start: '2031-10-01', end: '2032-01-01' });
  });
});
