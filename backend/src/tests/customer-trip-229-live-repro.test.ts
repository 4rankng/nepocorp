// Regression from customer trip 229: the route gained a 378L allowance after
// creation, leaving the trip snapshot at 0. A completed trip must accept the
// 382L allocation (378L + 4L supplement). Recreate those facts with owned
// fixtures so the regression runs without reading or changing customer rows.

import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, and, or } from 'drizzle-orm';
import { FuelMode, LoadingType, TripStatus } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { updateTripFigures } from '../services/trip-mutations.service';
import { disconnectRedis } from '../lib/redis';

after(async () => {
  await disconnectRedis();
  await client.end();
});

test('COMPLETED trip with snapshot=0 and route allowance=378L saves 382L allocation', async (t) => {
  const fixtureIds: {
    customerId?: number;
    supplierId?: number;
    routeId?: number;
    cargoTypeId?: number;
    tripId?: number;
  } = {};

  t.after(async () => {
    const { customerId, supplierId, routeId, cargoTypeId, tripId } = fixtureIds;
    if (tripId !== undefined) {
      await db.delete(s.tripFuelAllocations).where(eq(s.tripFuelAllocations.tripId, tripId));
      await db.delete(s.tripLegs).where(eq(s.tripLegs.tripId, tripId));
      await db.delete(s.tripContainers).where(eq(s.tripContainers.tripId, tripId));
      await db.delete(s.ledger).where(and(
        eq(s.ledger.txnId, tripId),
        or(
          and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, customerId!)),
          and(eq(s.ledger.entityType, 'VENDOR'), eq(s.ledger.entityId, supplierId!)),
        ),
      ));
      await db.delete(s.trips).where(eq(s.trips.id, tripId));
    }
    if (cargoTypeId !== undefined) await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargoTypeId));
    if (routeId !== undefined) await db.delete(s.routes).where(eq(s.routes.id, routeId));
    if (supplierId !== undefined) await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
    if (customerId !== undefined) await db.delete(s.customers).where(eq(s.customers.id, customerId));
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `Fuel regression customer ${suffix}` }).returning();
  fixtureIds.customerId = customer.id;
  const [supplier] = await db.insert(s.suppliers).values({ name: `Fuel regression vendor ${suffix}`, isFuelSupplier: true }).returning();
  fixtureIds.supplierId = supplier.id;
  const [route] = await db.insert(s.routes).values({ name: `Fuel regression route ${suffix}`, fixedFuelAllowance: '378' }).returning();
  fixtureIds.routeId = route.id;
  const [cargo] = await db.insert(s.cargoTypes).values({ name: `Fuel regression cargo ${suffix}` }).returning();
  fixtureIds.cargoTypeId = cargo.id;
  const [trip] = await db.insert(s.trips).values({
    tripCode: `FUEL-229-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargo.id,
    status: TripStatus.COMPLETED,
    carrierType: 'OWN',
    departureDate: '2026-09-09',
    fuelMode: FuelMode.AUTO,
    fuelFixedAllowanceApplied: '0',
    fuelPriceApplied: '25000',
    fuelLoadedNormApplied: '43',
    fuelEmptyNormApplied: '25',
    fuelSupplementNormApplied: '3',
    fuelSupplementLiters: '4',
    fuelLiters: '338',
  }).returning();
  fixtureIds.tripId = trip.id;
  const legs = [
    { sequence: 1, origin: 'Nam Định Vũ', destination: 'Lai Châu', km: 487, loadingType: LoadingType.HANG },
    { sequence: 2, origin: 'Lai Châu', destination: 'Nam Định Vũ', km: 487, loadingType: LoadingType.VO },
  ];
  await db.insert(s.tripLegs).values(legs.map(leg => ({ tripId: trip.id, ...leg })));

  const updated = await updateTripFigures(trip.id, {
    legs,
    fuelMode: FuelMode.AUTO,
    fuelLitersOverride: null,
    fuelSupplementLiters: 4,
    fuelAllocations: [{ supplierId: supplier.id, liters: 382, paymentMethod: 'CREDIT' }],
    expectedVersion: trip.version,
  });

  assert.equal(updated.fuelLiters, '382.00', '378L route allowance plus 4L supplement');
  assert.equal(updated.fuelFixedAllowanceApplied, '378.00', 'zero snapshot picks up the route allowance');
  assert.equal(updated.fuelSupplierId, supplier.id, 'allocation determines the primary fuel supplier');

  const [allocation] = await db.select().from(s.tripFuelAllocations).where(and(
    eq(s.tripFuelAllocations.tripId, trip.id),
    eq(s.tripFuelAllocations.liters, '382.00'),
    eq(s.tripFuelAllocations.supplierId, supplier.id),
  ));
  assert.ok(allocation, 'the 382L allocation is persisted');
});
