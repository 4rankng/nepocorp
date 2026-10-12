import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { assignForwarderTripDriver, listActiveDriversForForwarder } from '../services/forwarder.service';
import { getForwarderTripDetail } from '../services/forwarder-trip-query.service';
import { ApiError } from '../errors';

/**
 * kanban 101026005000 — the Giao nhận portal assigns the trip's driver. The
 * assignment MUST persist (trips.driver_id) and be visible on a fresh read of
 * the forwarder detail projection, i.e. after a page reload.
 */
describe('forwarder trip driver assignment (kanban 101026005000)', () => {
  const ids = {
    customers: [] as number[],
    routes: [] as number[],
    cargoTypes: [] as number[],
    drivers: [] as number[],
    trips: [] as number[],
  };

  let tripId: number;
  let departedTripId: number;
  let driverAId: number;
  let driverBId: number;

  before(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `GN assign customer ${suffix}` }).returning();
    const [route] = await db.insert(s.routes).values({ name: `GN assign route ${suffix}` }).returning();
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `GN assign cargo ${suffix}` }).returning();
    ids.customers.push(customer.id);
    ids.routes.push(route.id);
    ids.cargoTypes.push(cargoType.id);

    const drivers = await db.insert(s.drivers).values([
      { name: `GN assign lái xe A ${suffix}`, status: 'ACTIVE' },
      { name: `GN assign lái xe B ${suffix}`, status: 'ACTIVE' },
      { name: `GN assign lái xe nghỉ ${suffix}`, status: 'INACTIVE' },
      { name: `GN assign lái xe xóa ${suffix}`, status: 'ACTIVE', deletedAt: new Date() },
    ]).returning();
    [driverAId, driverBId] = drivers.map((d) => d.id);
    ids.drivers.push(...drivers.map((d) => d.id));

    const trips = await db.insert(s.trips).values([
      {
        tripCode: `GN-ASSIGN-${suffix}`.slice(0, 50),
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        departureDate: '2026-10-15',
        status: 'CREATED',
      },
      {
        tripCode: `GN-ASSIGN-GONE-${suffix}`.slice(0, 50),
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        departureDate: '2026-10-15',
        status: 'IN_TRANSIT',
      },
    ]).returning();
    [tripId, departedTripId] = trips.map((t) => t.id);
    ids.trips.push(...trips.map((t) => t.id));
  });

  after(async () => {
    if (ids.trips.length) await db.delete(s.trips).where(inArray(s.trips.id, ids.trips));
    if (ids.drivers.length) await db.delete(s.drivers).where(inArray(s.drivers.id, ids.drivers));
    if (ids.cargoTypes.length) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, ids.cargoTypes));
    if (ids.routes.length) await db.delete(s.routes).where(inArray(s.routes.id, ids.routes));
    if (ids.customers.length) await db.delete(s.customers).where(inArray(s.customers.id, ids.customers));
    await client.end();
  });

  test('assignment persists and shows on a fresh detail read (reload)', async () => {
    const assigned = await assignForwarderTripDriver(tripId, driverAId);
    assert.equal(assigned.driverId, driverAId);

    const detail = await getForwarderTripDetail(tripId, 0);
    assert.equal(detail?.driverId, driverAId);
    assert.ok(detail?.driverName?.startsWith('GN assign lái xe A'), `driverName was ${detail?.driverName}`);
  });

  test('changing the driver replaces the previous assignment', async () => {
    await assignForwarderTripDriver(tripId, driverBId);
    const detail = await getForwarderTripDetail(tripId, 0);
    assert.equal(detail?.driverId, driverBId);
    assert.ok(detail?.driverName?.startsWith('GN assign lái xe B'), `driverName was ${detail?.driverName}`);
  });

  test('a departed trip refuses driver changes (409)', async () => {
    await assert.rejects(
      () => assignForwarderTripDriver(departedTripId, driverAId),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 409);
        return true;
      },
    );
  });

  test('an unknown or retired driver is rejected (400)', async () => {
    const retired = ids.drivers[2]; // INACTIVE row seeded above
    for (const driverId of [999999999, retired]) {
      await assert.rejects(
        () => assignForwarderTripDriver(tripId, driverId),
        (err: unknown) => {
          assert.ok(err instanceof ApiError);
          assert.equal(err.statusCode, 400);
          return true;
        },
      );
    }
    // The failed writes must not have touched the stored assignment.
    const detail = await getForwarderTripDetail(tripId, 0);
    assert.equal(detail?.driverId, driverBId);
  });

  test('the picker list offers only active, non-deleted drivers', async () => {
    const items = await listActiveDriversForForwarder();
    assert.ok(items.some((d) => d.id === driverAId));
    assert.ok(items.some((d) => d.id === driverBId));
    assert.ok(!items.some((d) => d.id === ids.drivers[2]), 'INACTIVE driver must not be assignable');
    assert.ok(!items.some((d) => d.id === ids.drivers[3]), 'soft-deleted driver must not be assignable');
  });
});
