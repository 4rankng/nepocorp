/**
 * Integration test against the dev DB for the monthly usage aggregates.
 *
 * getUsageStats replaced the config pages' load-all-trips client-side reduce
 * (per-customer {trips, revenue} + per-route {trips} for one departure
 * month). This pins the grouping math: the sum over the grouped response
 * must equal a direct ungrouped aggregate over the same month window.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { and, isNull, isNotNull, gte, lt, sql } from 'drizzle-orm';
import { getUsageStats } from '../services/trip-queries.service';
import { disconnectRedis } from '../lib/redis';

describe('getUsageStats monthly aggregates', () => {
  after(async () => {
    await disconnectRedis();
    await client.end();
  });

  test('grouped stats equal a direct aggregate over the same month', async () => {
    // Pick the latest seeded departure month so the window has data.
    const [maxRow] = await db.select({
      last: sql<string>`max(${s.trips.departureDate})::text`,
    }).from(s.trips).where(isNull(s.trips.deletedAt));
    assert.ok(maxRow?.last, 'dev DB must have at least one trip');
    const month = maxRow.last.slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const nextMonthStart = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const window = and(
      isNull(s.trips.deletedAt),
      gte(s.trips.departureDate, `${month}-01`),
      lt(s.trips.departureDate, nextMonthStart),
    );

    const stats = await getUsageStats(month);
    assert.equal(stats.month, month);

    const [direct] = await db.select({
      customerTrips: sql<number>`count(*) filter (where ${s.trips.customerId} is not null)::int`,
      routeTrips: sql<number>`count(*) filter (where ${s.trips.routeId} is not null)::int`,
      revenue: sql<string>`coalesce(sum(${s.trips.revenue}) filter (where ${s.trips.customerId} is not null), 0)::text`,
    }).from(s.trips).where(window);

    const customerTrips = stats.customers.reduce((a, c) => a + c.trips, 0);
    const routeTrips = stats.routes.reduce((a, r) => a + r.trips, 0);
    const revenue = stats.customers.reduce((a, c) => a + parseFloat(c.revenue), 0);

    assert.equal(customerTrips, direct?.customerTrips ?? 0, 'Σ per-customer trips must equal direct count');
    assert.equal(routeTrips, direct?.routeTrips ?? 0, 'Σ per-route trips must equal direct count');
    assert.equal(
      Math.round(revenue),
      Math.round(parseFloat(direct?.revenue ?? '0')),
      'Σ per-customer revenue must equal direct sum',
    );

    // Spot-check one customer group against its own count.
    if (stats.customers.length > 0) {
      const sample = stats.customers[0];
      const [row] = await db.select({ n: sql<number>`count(*)::int` })
        .from(s.trips)
        .where(and(window, isNotNull(s.trips.customerId), sql`${s.trips.customerId} = ${sample.customerId}`));
      assert.equal(row?.n ?? 0, sample.trips);
    }
  });

  test('invalid or missing month falls back to the current month shape', async () => {
    const stats = await getUsageStats('not-a-month');
    assert.match(stats.month, /^\d{4}-\d{2}$/);
    assert.ok(Array.isArray(stats.customers));
    assert.ok(Array.isArray(stats.routes));
  });
});
