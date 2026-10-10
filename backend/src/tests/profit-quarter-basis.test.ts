import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { previewDistribution } from '../services/profit-distribution.service';
import { quarterDateRange } from '../services/reporting-shared';

/**
 * The quarterly distribution preview aggregates LOCKED (chốt sổ) trips inside
 * the quarter's date window, and reports the finished-but-not-locked trips
 * separately.
 *
 * The reported defect was a Q4/2026 preview showing 0 trips / 0 ₫ while the
 * October P&L showed 25 trips: those trips are COMPLETED, not LOCKED, so the
 * plan is right and the page had to say why (kanban 101026211500). These tests
 * pin the window (including its last day) and the locked/pending split.
 */

const createdIds: { trips: number[]; trucks: number[]; routes: number[]; cargoTypes: number[]; customers: number[] } = {
  trips: [], trucks: [], routes: [], cargoTypes: [], customers: [],
};

after(async () => {
  if (createdIds.trips.length > 0) await db.delete(s.trips).where(inArray(s.trips.id, createdIds.trips));
  if (createdIds.trucks.length > 0) await db.delete(s.trucks).where(inArray(s.trucks.id, createdIds.trucks));
  if (createdIds.routes.length > 0) await db.delete(s.routes).where(inArray(s.routes.id, createdIds.routes));
  if (createdIds.cargoTypes.length > 0) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdIds.cargoTypes));
  if (createdIds.customers.length > 0) await db.delete(s.customers).where(inArray(s.customers.id, createdIds.customers));
  await client.end();
});

async function fixtureTrip(
  ctx: { customerId: number; routeId: number; cargoTypeId: number; truckId: number },
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

describe('quarterly distribution basis (kanban 101026211500)', () => {
  const QUARTER = { quarter: 1, year: 2031 };

  test('counts locked trips in the quarter and reports the locked-only basis', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `QAQ customer ${suffix}` }).returning({ id: s.customers.id });
    const [route] = await db.insert(s.routes).values({ name: `QAQ route ${suffix}` }).returning({ id: s.routes.id });
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `QAQ cargo ${suffix}` }).returning({ id: s.cargoTypes.id });
    const [truck] = await db.insert(s.trucks).values({ licensePlate: `QAQ${Date.now() % 100000}` }).returning({ id: s.trucks.id });
    createdIds.customers.push(customer.id);
    createdIds.routes.push(route.id);
    createdIds.cargoTypes.push(cargoType.id);
    createdIds.trucks.push(truck.id);
    const ctx = { customerId: customer.id, routeId: route.id, cargoTypeId: cargoType.id, truckId: truck.id };

    // Inside Q1/2031 — locked, so it is the only distributable trip.
    await fixtureTrip(ctx, 'LOCKED', '2031-02-10', 5_000_000);
    // Finished but never locked → pending, not distributable.
    await fixtureTrip(ctx, 'COMPLETED', '2031-02-11', 7_000_000);
    // Last day of the quarter: the window's exclusive end must still include it.
    await fixtureTrip(ctx, 'COMPLETED', '2031-03-31', 1_000_000);
    // Outside the quarter (Q3/2031) → must not appear anywhere in Q1.
    await fixtureTrip(ctx, 'COMPLETED', '2031-07-01', 9_000_000);

    const preview = await previewDistribution(QUARTER.quarter, QUARTER.year);

    assert.equal(preview.tripCount, 1, 'only the locked trip is distributable');
    assert.equal(preview.netProfit, 5_000_000);
    assert.equal(preview.pendingTripCount, 2, 'the two finished-but-unlocked trips are reported, the Q3 one is not');
    assert.equal(preview.pendingProfit, 8_000_000);
    assert.equal(preview.distributions.length, 0, 'the fixture truck has no owners configured');
    assert.equal(preview.undistributedProfit, 5_000_000);

    // A neighbouring quarter and year stay empty — the aggregation is per quarter.
    const nextQuarter = await previewDistribution(2, 2031);
    assert.equal(nextQuarter.tripCount, 0);
    assert.equal(nextQuarter.pendingTripCount, 0);
    const earlierYear = await previewDistribution(QUARTER.quarter, 2030);
    assert.equal(earlierYear.tripCount, 0);
    assert.equal(earlierYear.pendingTripCount, 0);
  });

  test('the quarter window is [first day of quarter, first day after it)', async () => {
    assert.deepEqual(await quarterDateRange(1, 2031), { start: '2031-01-01', end: '2031-04-01' });
    assert.deepEqual(await quarterDateRange(2, 2031), { start: '2031-04-01', end: '2031-07-01' });
    assert.deepEqual(await quarterDateRange(4, 2031), { start: '2031-10-01', end: '2032-01-01' });
  });
});
