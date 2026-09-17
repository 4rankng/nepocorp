import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { inArray, isNull, sql } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { cacheInvalidate, disconnectRedis } from '../lib/redis';
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
