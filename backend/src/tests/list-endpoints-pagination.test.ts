/**
 * Integration test against the dev DB for the newly paginated list services:
 * penalties (date window + page), driver trips (status + page), and forwarder
 * trips (search + page). These endpoints previously returned every row; the
 * envelope {items,total,page,pageSize} is now load-bearing for their pages.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { getPenalties } from '../services/financial.service';
import { getDriverTrips } from '../services/driver.service';
import { getForwarderTrips } from '../services/forwarder-trip-query.service';
import { disconnectRedis } from '../lib/redis';

describe('paginated list services', () => {
  after(async () => {
    await disconnectRedis();
    await client.end();
  });

  test('getPenalties slices pages without overlap and honors the date window', async () => {
    const all = await getPenalties({ page: 1, limit: 200 });
    assert.equal(typeof all.total, 'number');
    assert.equal(all.total, all.items.length);

    const p1 = await getPenalties({ page: 1, limit: 5 });
    assert.ok(p1.items.length <= 5);
    if (all.total > 5) {
      assert.equal(p1.items.length, 5);
      const p2 = await getPenalties({ page: 2, limit: 5 });
      const ids1 = new Set(p1.items.map(x => x.id));
      for (const x of p2.items) {
        assert.ok(!ids1.has(x.id), `penalty ${x.id} appears on two pages`);
      }
    }

    if (all.items.length > 0) {
      const earliest = all.items.map(p => String(p.date)).sort()[0];
      const windowed = await getPenalties({ page: 1, limit: 200, dateFrom: earliest });
      assert.equal(windowed.total, all.total, 'window covering the earliest date keeps every row');
      const strict = await getPenalties({ page: 1, limit: 200, dateFrom: '2999-01-01' });
      assert.equal(strict.total, 0, 'future dateFrom excludes everything');
    }
  });

  test('getDriverTrips paginates and filters by status', async () => {
    const [drv] = await db.select({ id: s.drivers.id }).from(s.drivers).limit(1);
    assert.ok(drv, 'dev DB must have at least one driver');
    const res = await getDriverTrips(drv.id, { page: 1, limit: 5 });
    assert.ok(Array.isArray(res.items));
    assert.ok(res.items.length <= 5);
    assert.ok(res.total >= res.items.length);
    assert.equal(res.pageSize, 5);

    // Tab counts span all statuses and must sum to the unfiltered total.
    const sumCounts = Object.values(res.statusCounts).reduce((a, b) => a + b, 0);
    const unfiltered = await getDriverTrips(drv.id, { page: 1, limit: 1 });
    assert.equal(sumCounts, unfiltered.total);

    const completed = await getDriverTrips(drv.id, { page: 1, limit: 5, status: 'COMPLETED' });
    assert.ok(completed.items.every(t => t.status === 'COMPLETED'));
    assert.equal(completed.total, completed.statusCounts.COMPLETED);
  });

  test('getForwarderTrips paginates and its count survives the search join', async () => {
    const res = await getForwarderTrips(undefined, { page: 1, limit: 5 });
    assert.ok(res.items.length <= 5);
    assert.ok(res.total >= res.items.length);

    const searched = await getForwarderTrips(undefined, { page: 1, limit: 5, search: 'zzz-no-such-customer' });
    assert.equal(searched.total, 0);
    assert.equal(searched.items.length, 0);
  });
});
