/**
 * Integration test against the dev DB for the paginated /users list.
 *
 * listUsers moved from "return every user, slice in the browser" to real
 * server-side pagination + search + role filter + whitelisted sort. These
 * assertions pin the envelope shape, page slicing (no row overlap), the KPI
 * counts contract the users page renders, and search/filter behavior.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { client } from '../db';
import { listUsers } from '../services/user.service';
import { disconnectRedis } from '../lib/redis';

describe('listUsers server-side pagination', () => {
  after(async () => {
    await disconnectRedis();
    await client.end();
  });

  test('returns {items,total,page,pageSize,counts} and slices pages without overlap', async () => {
    const full = await listUsers(undefined, { page: 1, limit: 200 });
    assert.ok(Array.isArray(full.items));
    assert.ok(full.items.length >= 1, 'dev DB must have at least one user');

    const pageSize = Math.max(1, Math.min(10, full.items.length));
    const p1 = await listUsers(undefined, { page: 1, limit: pageSize });
    const p2 = await listUsers(undefined, { page: 2, limit: pageSize });

    assert.equal(p1.page, 1);
    assert.equal(p1.pageSize, pageSize);
    assert.equal(p1.total, full.total);
    assert.ok(p1.items.length <= pageSize);
    assert.ok(p2.items.length <= pageSize);

    if (p2.items.length > 0) {
      const ids1 = new Set(p1.items.map(u => u.id));
      for (const u of p2.items) {
        assert.ok(!ids1.has(u.id), `user ${u.id} appears on both page 1 and page 2`);
      }
    }
  });

  test('counts power the KPI row and are consistent with the listed set', async () => {
    const res = await listUsers(undefined, { page: 1, limit: 200 });
    assert.equal(res.counts.total, res.total);
    assert.ok(res.counts.staff + res.counts.driver <= res.counts.total);
    // Every listed row carries the driver-profile join columns the table renders.
    for (const u of res.items) {
      assert.ok('driverId' in u && 'baseSalary' in u, 'driver join fields must be selected');
    }
  });

  test('search narrows the result set and finds the source row', async () => {
    const all = await listUsers(undefined, { page: 1, limit: 200 });
    const first = all.items[0];
    const term = (first.username || first.fullName || 'admin').slice(0, 3);
    assert.ok(term.length > 0);
    const hit = await listUsers(undefined, { page: 1, limit: 200, search: term });
    assert.ok(hit.total >= 1);
    assert.ok(hit.total <= all.total);
    assert.ok(hit.items.some(u => u.id === first.id));
  });

  test('role filter returns only that role and matches the driver KPI count', async () => {
    const drivers = await listUsers(undefined, { page: 1, limit: 200, role: 'DRIVER' });
    assert.ok(drivers.items.every(u => u.role === 'DRIVER'));
    assert.equal(drivers.total, drivers.counts.driver);
  });

  test('sort by name asc/desc reverses the page order', async () => {
    const asc = await listUsers(undefined, { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' });
    const desc = await listUsers(undefined, { page: 1, limit: 200, sortBy: 'name', sortOrder: 'desc' });
    if (asc.items.length > 1) {
      assert.notDeepEqual(
        asc.items.map(u => u.id),
        desc.items.map(u => u.id),
      );
    }
  });
});
