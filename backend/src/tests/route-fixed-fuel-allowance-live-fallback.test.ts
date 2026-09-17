// Repro: customer Lai Châu route (e.g. fixedFuelAllowance=378L) is set on the
// route AFTER a trip is created. The trip's snapshotted fuel_fixed_allowance_applied
// was 0 at creation, so the per-km norm is used. When the user enters the 378L
// route fixed allowance into the fuel allocation editor and tries to save, the
// backend's assertFuelAllocationTotal fires (allocation 378 != trip total 338)
// with the "Tổng phân bổ dầu phải bằng tổng dầu chuyến" error — even though
// the route now mandates 378L. Operations work-around was to artificially
// inflate km to bring the per-km norm up to the route's fixed value.
//
// The fix: updateTripFigures must re-fetch the live route's fixed_fuel_allowance
// when the trip is not yet financially committed and the snapshot is 0,
// mirroring the fuel/road config live-fallback pattern.

import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { FuelMode, TripStatus, LoadingType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { updateTripFigures } from '../services/trip-mutations.service';

const createdTripIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdSupplierIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];

after(async () => {
  if (createdTripIds.length > 0) {
    await db.delete(s.tripFuelAllocations).where(inArray(s.tripFuelAllocations.tripId, createdTripIds));
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, createdTripIds));
    await db.delete(s.tripLegs).where(inArray(s.tripLegs.tripId, createdTripIds));
    await db.delete(s.tripContainers).where(inArray(s.tripContainers.tripId, createdTripIds));
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdSupplierIds.length > 0) {
    await db.delete(s.suppliers).where(inArray(s.suppliers.id, createdSupplierIds));
  }
  if (createdCustomerIds.length > 0) {
    await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  }
  if (createdRouteIds.length > 0) {
    await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  }
  if (createdCargoTypeIds.length > 0) {
    await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  }
  await client.end();
});

async function seedFixture(opts: { initialRouteAllowance: number | null }) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `Lai Chau customer ${suffix}` }).returning();
  const [supplier] = await db.insert(s.suppliers).values({
    name: `Lai Chau supplier ${suffix}`,
    isFuelSupplier: true,
  }).returning();
  const [route] = await db.insert(s.routes).values({
    name: `Lai Chau ${suffix}`,
    distanceKm: 974,
    isMountain: false,
    fixedFuelAllowance: opts.initialRouteAllowance != null
      ? String(opts.initialRouteAllowance)
      : null,
  }).returning();
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Lai Chau cargo ${suffix}` }).returning();
  createdCustomerIds.push(customer.id);
  createdSupplierIds.push(supplier.id);
  createdRouteIds.push(route.id);
  createdCargoTypeIds.push(cargoType.id);
  return { customer, supplier, route, cargoType, suffix };
}

async function seedCreatedTrip(opts: {
  customerId: number;
  routeId: number;
  cargoTypeId: number;
  supplierId: number;
  fuelFixedAllowanceApplied: number | null;
  legs?: Array<{ sequence: number; origin: string; destination: string; km: number; loadingType: 'HANG' | 'VO' }>;
}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [trip] = await db.insert(s.trips).values({
    tripCode: `LC-${suffix}`.slice(0, 50),
    customerId: opts.customerId,
    routeId: opts.routeId,
    cargoTypeId: opts.cargoTypeId,
    status: TripStatus.CREATED,
    departureDate: '2026-09-09',
    carrierType: 'OWN',
    fuelPriceApplied: '1000',
    fuelLoadedNormApplied: '43',
    fuelEmptyNormApplied: '25',
    fuelFixedAllowanceApplied: opts.fuelFixedAllowanceApplied != null
      ? String(opts.fuelFixedAllowanceApplied)
      : null,
    fuelLiters: '0',
  }).returning();
  createdTripIds.push(trip.id);

  const legs = opts.legs ?? [
    { sequence: 1, origin: 'Nam Định Vũ', destination: 'Lai Châu', km: 487, loadingType: 'HANG' as const },
    { sequence: 2, origin: 'Lai Châu', destination: 'Nam Định Vũ', km: 487, loadingType: 'VO' as const },
  ];
  for (const leg of legs) {
    await db.insert(s.tripLegs).values({ tripId: trip.id, ...leg });
  }
  return trip;
}

describe('updateTripFigures re-reads live route fixed fuel allowance for uncommitted trips', () => {
  test('CREATED trip with 0 snapshot picks up the live route allowance (Lai Châu 378L)', async () => {
    const { customer, supplier, route, cargoType } = await seedFixture({ initialRouteAllowance: null });
    // Pre-create the trip while the route had no fixed fuel allowance.
    const trip = await seedCreatedTrip({
      customerId: customer.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      supplierId: supplier.id,
      fuelFixedAllowanceApplied: 0,
    });

    // Ops later sets the Lai Châu route's fixed allowance to 378L.
    await db.update(s.routes).set({ fixedFuelAllowance: '378' }).where(eq(s.routes.id, route.id));

    // Save the trip with a single 378L allocation that exactly matches the route's
    // new fixed allowance. Before the fix, totalFuelLiters comes from per-km norm
    // (487×43/100≈209 + 487×25/100≈122 = 331) and the allocation 378 fails the
    // "tổng phân bổ dầu phải bằng tổng dầu chuyến" assertion with the exact
    // message the customer reported on demo trip.
    const updated = await updateTripFigures(trip.id, {
      legs: [
        { sequence: 1, origin: 'Nam Định Vũ', destination: 'Lai Châu', km: 487, loadingType: LoadingType.HANG },
        { sequence: 2, origin: 'Lai Châu', destination: 'Nam Định Vũ', km: 487, loadingType: LoadingType.VO },
      ],
      fuelMode: FuelMode.AUTO,
      fuelLitersOverride: null,
      fuelSupplementLiters: 0,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 378, paymentMethod: 'CREDIT' },
      ],
      expectedVersion: trip.version,
      userId: 1,
    });

    assert.equal(updated.fuelLiters, '378.00');
    assert.equal(updated.fuelFixedAllowanceApplied, '378.00');

    const [stored] = await db.select().from(s.trips).where(eq(s.trips.id, trip.id)).limit(1);
    assert.equal(stored.fuelFixedAllowanceApplied, '378.00');
    assert.equal(stored.fuelLiters, '378.00');
  });

  test('AUTO with 331 per-km norm still works when the route has NO fixed allowance', async () => {
    const { customer, supplier, route, cargoType } = await seedFixture({ initialRouteAllowance: null });
    const trip = await seedCreatedTrip({
      customerId: customer.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      supplierId: supplier.id,
      fuelFixedAllowanceApplied: 0,
    });
    // Route has no allowance — per-km norm applies. 487×43/100 = 209.41 → 209,
    // 487×25/100 = 121.75 → 122; total = 331 (per-trip supplement is 0 in seed).
    const updated = await updateTripFigures(trip.id, {
      legs: [
        { sequence: 1, origin: 'Nam Định Vũ', destination: 'Lai Châu', km: 487, loadingType: LoadingType.HANG },
        { sequence: 2, origin: 'Lai Châu', destination: 'Nam Định Vũ', km: 487, loadingType: LoadingType.VO },
      ],
      fuelMode: FuelMode.AUTO,
      fuelLitersOverride: null,
      fuelSupplementLiters: 0,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 331, paymentMethod: 'CREDIT' },
      ],
      expectedVersion: trip.version,
      userId: 1,
    });
    assert.equal(updated.fuelLiters, '331.00');
  });

  test('non-zero snapshot is preserved across all statuses (B3 / D4 anchor)', async () => {
    // Trip was created when the route had a 240L fixed allowance. Ops later
    // updates the route to 378L. The trip's stored 240 must NOT be silently
    // rewritten — it is the value the trip was costed at.
    const { customer, supplier, route, cargoType } = await seedFixture({ initialRouteAllowance: 240 });
    const trip = await seedCreatedTrip({
      customerId: customer.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      supplierId: supplier.id,
      fuelFixedAllowanceApplied: 240,
    });
    await db.update(s.routes).set({ fixedFuelAllowance: '378' }).where(eq(s.routes.id, route.id));
    await db.update(s.trips).set({ status: TripStatus.COMPLETED }).where(eq(s.trips.id, trip.id));

    const updated = await updateTripFigures(trip.id, {
      legs: [
        { sequence: 1, origin: 'Nam Định Vũ', destination: 'Lai Châu', km: 487, loadingType: LoadingType.HANG },
        { sequence: 2, origin: 'Lai Châu', destination: 'Nam Định Vũ', km: 487, loadingType: LoadingType.VO },
      ],
      fuelMode: FuelMode.AUTO,
      fuelLitersOverride: null,
      fuelSupplementLiters: 0,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 240, paymentMethod: 'CREDIT' },
      ],
      expectedVersion: trip.version,
      userId: 1,
    });
    assert.equal(updated.fuelLiters, '240.00');
    assert.equal(updated.fuelFixedAllowanceApplied, '240.00');
  });
});
