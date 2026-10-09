/**
 * Fuel supplier payable — posting must be idempotent per trip+supplier.
 *
 * A trip may legitimately refuel the same supplier more than once (one ledger
 * row per CREDIT allocation, at that pump's price). But re-locking a trip
 * without an intervening unlock appended the charge again every time, so a trip
 * could end up with four FUEL_EXPENSE rows against two UNLOCK_REVERSALs — a
 * doubled fuel bill that surfaced as repeated "96 lít TRP-202609-0021
 * 2.663.040₫" lines on the supplier statement (kanban 091026211520).
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TxnType, TripStatus } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { LedgerService } from '../services/ledger.service';

const createdSupplierIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];
const createdTripIds: number[] = [];

after(async () => {
  if (createdTripIds.length > 0) {
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, createdTripIds));
    await db.delete(s.tripFuelAllocations).where(inArray(s.tripFuelAllocations.tripId, createdTripIds));
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdSupplierIds.length > 0) {
    await db.delete(s.ledger).where(and(
      eq(s.ledger.entityType, 'VENDOR'),
      inArray(s.ledger.entityId, createdSupplierIds),
    ));
    await db.delete(s.suppliers).where(inArray(s.suppliers.id, createdSupplierIds));
  }
  if (createdRouteIds.length > 0) {
    await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  }
  if (createdCargoTypeIds.length > 0) {
    await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  }
  await client.end();
});

async function seed(suffix: string) {
  const [customer] = await db.insert(s.customers)
    .values({ name: `Fuel idem cust ${suffix}` }).returning();
  const [supplier] = await db.insert(s.suppliers)
    .values({ name: `Fuel idem sup ${suffix}`, isFuelSupplier: true }).returning();
  const [route] = await db.insert(s.routes)
    .values({ name: `Fuel idem route ${suffix}` }).returning();
  const [cargoType] = await db.insert(s.cargoTypes)
    .values({ name: `Fuel idem cargo ${suffix}` }).returning();
  const [trip] = await db.insert(s.trips).values({
    tripCode: `FUELIDEM-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargoType.id,
    status: TripStatus.IN_TRANSIT,
    departureDate: '2026-06-20',
    revenue: '5000000',
    carrierType: 'OWN',
    fuelSupplierId: supplier.id,
    fuelActualUnitPrice: '29000',
    totalFuelCost: '2900000',
  }).returning();
  createdSupplierIds.push(supplier.id);
  createdRouteIds.push(route.id);
  createdCargoTypeIds.push(cargoType.id);
  createdTripIds.push(trip.id);
  return { trip, supplier };
}

const lockArgs = (trip: { id: number; tripCode: string | null }, supplierId: number) => ({
  id: trip.id,
  tripCode: trip.tripCode,
  customerId: 0,
  driverId: null,
  revenue: '0',
  driverSalary: '0',
  carrierType: 'OWN' as const,
  fuelSupplierId: supplierId,
  fuelActualUnitPrice: '29000',
  totalFuelCost: '2900000',
  ancillaryFees: [],
});

async function fuelRows(tripId: number, supplierId: number) {
  return db.select().from(s.ledger).where(and(
    eq(s.ledger.txnType, TxnType.FUEL_EXPENSE),
    eq(s.ledger.txnId, tripId),
    eq(s.ledger.entityId, supplierId),
  ));
}

describe('fuel supplier payable posting', () => {
  test('a second lock without an unlock does not double-charge the supplier', async () => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    const { trip, supplier } = await seed(suffix);

    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, supplier.id)));
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, supplier.id)));

    const rows = await fuelRows(trip.id, supplier.id);
    assert.equal(rows.length, 1, 'the fuel supplier is charged once, not twice');
  });

  test('a lock → unlock → lock cycle still leaves exactly one live charge', async () => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const { trip, supplier } = await seed(suffix);

    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, supplier.id)));
    await db.transaction(tx => LedgerService.postTripUnlock(tx, lockArgs(trip, supplier.id)));
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, supplier.id)));

    const rows = await fuelRows(trip.id, supplier.id);
    assert.equal(rows.length, 2, 'the unlock reversed the first charge and the re-lock posted a new one');

    const reversals = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, TxnType.UNLOCK_REVERSAL),
      eq(s.ledger.txnId, trip.id),
      eq(s.ledger.entityId, supplier.id),
    ));
    assert.equal(reversals.length, 1, 'exactly one reversal, so the trip nets to a single live charge');
  });

  test('three locks in a row still produce a single charge', async () => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    const { trip, supplier } = await seed(suffix);

    for (let i = 0; i < 3; i++) {
      await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, supplier.id)));
    }

    const rows = await fuelRows(trip.id, supplier.id);
    assert.equal(rows.length, 1, 'repeat locks never accumulate extra charges');
  });
});