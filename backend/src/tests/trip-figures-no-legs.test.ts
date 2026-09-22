// kanban 20260921_3: quick edit could not save a trip that has no route legs —
// the figures payload required `legs` (min 1), so every save failed with the
// cryptic "Array must contain at least 1 element(s)" and the user saw
// "thêm doanh thu nhưng không lưu được". A figures-only update must work without legs.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { FuelMode, LoadingType, Role, TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { updateTripFigures } from '../services/trip-mutations.service';
import { updateTripFiguresSchema } from '@tingting/shared';
import { disconnectRedis } from '../lib/redis';

after(async () => {
  await disconnectRedis();
  await client.end();
});

test('a figures-only update saves revenue on a trip that has no legs', async (t) => {
  const ids: { customerId?: number; routeId?: number; cargoTypeId?: number; tripId?: number } = {};
  t.after(async () => {
    if (ids.tripId !== undefined) {
      await db.delete(s.tripLegs).where(eq(s.tripLegs.tripId, ids.tripId));
      await db.delete(s.tripContainers).where(eq(s.tripContainers.tripId, ids.tripId));
      await db.delete(s.trips).where(eq(s.trips.id, ids.tripId));
    }
    if (ids.cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargoTypeId));
    if (ids.routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, ids.routeId));
    if (ids.customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, ids.customerId));
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `Quick edit customer ${suffix}` }).returning();
  ids.customerId = customer.id;
  const [route] = await db.insert(s.routes).values({ name: `Quick edit route ${suffix}` }).returning();
  ids.routeId = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `Quick edit cargo ${suffix}` }).returning();
  ids.cargoTypeId = cargo.id;
  const [trip] = await db.insert(s.trips).values({
    tripCode: `QE-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargo.id,
    departureDate: '2026-09-21',
    status: TripStatus.CREATED,
    carrierType: 'OWN',
  }).returning();
  ids.tripId = trip.id;

  // The payload the quick-edit row builds for a trip without legs: no `legs` key.
  const payload = {
    version: trip.version,
    departureDate: '2026-09-21',
    fuelMode: FuelMode.AUTO,
    fuelSupplementLiters: 0,
    tollsDiscount: 0,
    tollsAddition: 0,
    tollsStations: 0,
    hasReturnCargo: false,
    driverSalary: 0,
    revenue: 1_000_000,
    customerCommission: 0,
    twoPointDeliveryBonus: 0,
    vehicleShiftAllowance: 0,
    carrierType: 'OWN' as const,
  };

  assert.ok(updateTripFiguresSchema.safeParse(payload).success, 'the schema accepts a payload without legs');
  assert.ok(
    !updateTripFiguresSchema.safeParse({ ...payload, legs: [] }).success,
    'an explicitly empty legs list is still rejected',
  );

  const updated = await updateTripFigures(trip.id, {
    ...payload,
    expectedVersion: trip.version,
    userRole: Role.ADMIN,
  });

  assert.equal(Number(updated.revenue), 1_000_000, 'the revenue typed in quick edit is saved');
});

for (const withAllocation of [false, true]) {
  test(`omitting legs preserves saved segments and AUTO fuel${withAllocation ? ' with a saved fuel allocation' : ''}`, async (t) => {
    const ids: { customerId?: number; routeId?: number; cargoTypeId?: number; tripId?: number } = {};
    t.after(async () => {
      if (ids.tripId !== undefined) {
        await db.delete(s.tripFuelAllocations).where(eq(s.tripFuelAllocations.tripId, ids.tripId));
        await db.delete(s.tripLegs).where(eq(s.tripLegs.tripId, ids.tripId));
        await db.delete(s.trips).where(eq(s.trips.id, ids.tripId));
      }
      if (ids.cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, ids.cargoTypeId));
      if (ids.routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, ids.routeId));
      if (ids.customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, ids.customerId));
    });
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `Keep legs customer ${suffix}` }).returning();
    ids.customerId = customer.id;
    const [route] = await db.insert(s.routes).values({ name: `Keep legs route ${suffix}` }).returning();
    ids.routeId = route.id;
    const [cargo] = await db.insert(s.cargoTypes).values({ name: `Keep legs cargo ${suffix}` }).returning();
    ids.cargoTypeId = cargo.id;
    const [trip] = await db.insert(s.trips).values({
      tripCode: `KEEP-${suffix}`.slice(0, 50), customerId: customer.id, routeId: route.id,
      cargoTypeId: cargo.id, departureDate: '2026-09-21', status: TripStatus.IN_TRANSIT,
      carrierType: 'OWN', fuelMode: FuelMode.AUTO, fuelPriceApplied: '25000',
      fuelLoadedNormApplied: '40', fuelEmptyNormApplied: '20', fuelSupplementNormApplied: '0',
      fuelLiters: '50', totalFuelCost: '1250000', revenue: '2000000', driverSalary: '0',
    }).returning();
    ids.tripId = trip.id;
    const legs = await db.insert(s.tripLegs).values([
      { tripId: trip.id, sequence: 1, origin: 'A', destination: 'B', km: 100, loadingType: 'HANG', calculatedLiters: '40' },
      { tripId: trip.id, sequence: 2, origin: 'B', destination: 'C', km: 50, loadingType: 'VO', calculatedLiters: '10' },
    ]).returning();
    if (withAllocation) {
      await db.insert(s.tripFuelAllocations).values({ tripId: trip.id, liters: '50', unitPrice: '25000', paymentMethod: 'CASH' });
    }

    const updated = await updateTripFigures(trip.id, { fuelMode: FuelMode.AUTO, revenue: 3_000_000, driverSalary: 0 });
    assert.equal(Number(updated.revenue), 3_000_000);
    assert.equal(Number(updated.fuelLiters), 50, 'AUTO fuel must use the saved route distances');
    assert.equal(Number(updated.totalFuelCost), 1_250_000);
    const retained = await db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, trip.id)).orderBy(s.tripLegs.sequence);
    assert.deepEqual(retained, legs, 'an omitted list must not replace or delete stored segments');

    if (!withAllocation) {
      const flat = await updateTripFigures(trip.id, { fuelMode: FuelMode.FLAT_RATE, fuelLitersOverride: 60, driverSalary: 0 });
      assert.equal(Number(flat.fuelLiters), 60);
      const flatLegs = await db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, trip.id)).orderBy(s.tripLegs.sequence);
      assert.deepEqual(flatLegs.map(leg => leg.id), legs.map(leg => leg.id));
      assert.deepEqual(flatLegs.map(leg => Number(leg.calculatedLiters)), [0, 0], 'changing fuel mode still refreshes derived leg figures');

      const replacement = await updateTripFigures(trip.id, {
        fuelMode: FuelMode.AUTO, driverSalary: 0,
        legs: [{ sequence: 1, origin: 'A', destination: 'D', km: 80.4, loadingType: LoadingType.HANG }],
      });
      const replaced = await db.select().from(s.tripLegs).where(eq(s.tripLegs.tripId, trip.id));
      assert.equal(replaced.length, 1, 'an explicit list still replaces existing segments');
      assert.equal(replaced[0].km, 80, 'new distances retain integer normalization');
      assert.equal(replaced[0].destination, 'D');
      assert.equal(Number(replacement.fuelLiters), 32);
    }
  });
}
