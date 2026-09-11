import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { FuelMode, TripStatus, Role, TxnType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { transitionTripStatus } from '../services/trip-status-machine.service';
import { updateTripFigures } from '../services/trip-mutations.service';

const createdTripIds: number[] = [];
const createdCustomerIds: number[] = [];
const createdSupplierIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];

after(async () => {
  if (createdTripIds.length > 0) {
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, createdTripIds));
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

async function createBaseTrip(fuelPriceApplied: number) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [customer] = await db.insert(s.customers).values({ name: `MP customer ${suffix}` }).returning();
  const [supplier] = await db.insert(s.suppliers).values({ name: `MP supplier ${suffix}`, isFuelSupplier: true }).returning();
  const [route] = await db.insert(s.routes).values({ name: `MP route ${suffix}` }).returning();
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `MP cargo ${suffix}` }).returning();
  createdCustomerIds.push(customer.id);
  createdSupplierIds.push(supplier.id);
  createdRouteIds.push(route.id);
  createdCargoTypeIds.push(cargoType.id);
  const [trip] = await db.insert(s.trips).values({
    tripCode: `MP-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargoType.id,
    status: TripStatus.CREATED,
    departureDate: '2026-09-11',
    revenue: '5000000',
    fuelSupplierId: supplier.id,
    fuelPriceApplied: String(fuelPriceApplied),
    fuelMode: 'AUTO',
  }).returning();
  createdTripIds.push(trip.id);
  return { trip, supplier };
}

describe('multi-price fuel allocations', () => {
  test('same supplier twice at different prices: totals, rows, ledger', async () => {
    const { trip, supplier } = await createBaseTrip(24000);
    const updated = await updateTripFigures(trip.id, {
      legs: [],
      fuelMode: FuelMode.FLAT_RATE,
      fuelLitersOverride: 100,
      fuelSupplementLiters: 0,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 60, unitPrice: 23500, paymentMethod: 'CREDIT' },
        { supplierId: supplier.id, liters: 40, unitPrice: 24000, paymentMethod: 'CREDIT' },
      ],
      expectedVersion: trip.version,
      userId: 1,
    });
    assert.equal(updated.totalFuelCost, '2370000');
    const rows = await db.select().from(s.tripFuelAllocations)
      .where(eq(s.tripFuelAllocations.tripId, trip.id));
    assert.deepEqual(rows.map(r => [r.liters, r.unitPrice]).sort(), [
      ['40.00', '24000.00'],
      ['60.00', '23500.00'],
    ]);
    await transitionTripStatus(trip.id, TripStatus.IN_TRANSIT, 1, Role.MANAGER);
    await transitionTripStatus(trip.id, TripStatus.COMPLETED, 1, Role.MANAGER);
    const fuelRows = await db.select().from(s.ledger)
      .where(eq(s.ledger.txnId, trip.id));
    const fuelEntries = fuelRows.filter(row => row.txnType === TxnType.FUEL_EXPENSE);
    assert.equal(fuelEntries.length, 2);
    assert.deepEqual(fuelEntries.map(r => Number(r.credit)).sort((a, b) => a - b), [960000, 1410000]);
  });

  test('patch without allocations keeps saved per-purchase prices', async () => {
    const { trip, supplier } = await createBaseTrip(24000);
    const args = {
      legs: [] as [],
      fuelMode: FuelMode.FLAT_RATE,
      fuelLitersOverride: 100,
      fuelSupplementLiters: 0,
      userId: 1,
    };
    await updateTripFigures(trip.id, {
      ...args,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 60, unitPrice: 23500, paymentMethod: 'CREDIT' },
        { supplierId: supplier.id, liters: 40, unitPrice: 24000, paymentMethod: 'CREDIT' },
      ],
    });
    const patched = await updateTripFigures(trip.id, { ...args });
    assert.equal(patched.totalFuelCost, '2370000');
    const rows = await db.select().from(s.tripFuelAllocations)
      .where(eq(s.tripFuelAllocations.tripId, trip.id));
    assert.deepEqual(rows.map(r => [r.liters, r.unitPrice]).sort(), [
      ['40.00', '24000.00'],
      ['60.00', '23500.00'],
    ]);
  });

  test('rejects explicit row prices on a frozen legacy committed trip', async () => {
    const { trip, supplier } = await createBaseTrip(0);
    await db.update(s.trips).set({
      status: TripStatus.COMPLETED,
      totalFuelCost: '2000000',
      fuelLiters: '100',
    }).where(eq(s.trips.id, trip.id));
    await assert.rejects(
      updateTripFigures(trip.id, {
        legs: [],
        fuelMode: FuelMode.FLAT_RATE,
        fuelLitersOverride: 100,
        fuelSupplementLiters: 0,
        fuelAllocations: [
          { supplierId: supplier.id, liters: 60, unitPrice: 23500, paymentMethod: 'CREDIT' },
          { supplierId: supplier.id, liters: 40, unitPrice: 24000, paymentMethod: 'CREDIT' },
        ],
      }),
      /đơn giá từng lần đổ/,
    );
  });

  test('fuelSupplierId-only save keeps saved priced rows', async () => {
    const { trip, supplier } = await createBaseTrip(24000);
    const args = {
      legs: [] as [],
      fuelMode: FuelMode.FLAT_RATE,
      fuelLitersOverride: 100,
      fuelSupplementLiters: 0,
      userId: 1,
    };
    await updateTripFigures(trip.id, {
      ...args,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 60, unitPrice: 23500, paymentMethod: 'CREDIT' },
        { supplierId: supplier.id, liters: 40, unitPrice: 24000, paymentMethod: 'CREDIT' },
      ],
    });
    // Patch that names only the supplier must not wipe the priced rows.
    await updateTripFigures(trip.id, { ...args, fuelSupplierId: supplier.id });
    const rows = await db.select().from(s.tripFuelAllocations)
      .where(eq(s.tripFuelAllocations.tripId, trip.id));
    assert.deepEqual(rows.map(r => [r.liters, r.unitPrice]).sort(), [
      ['40.00', '24000.00'],
      ['60.00', '23500.00'],
    ]);
  });

  test('unlock reverses per-purchase postings exactly, re-lock posts new prices', async () => {
    const { trip, supplier } = await createBaseTrip(24000);
    const args = {
      legs: [] as [],
      fuelAllocations: [
        { supplierId: supplier.id, liters: 60, unitPrice: 27000, paymentMethod: 'CREDIT' as const },
        { supplierId: supplier.id, liters: 40, unitPrice: 28000, paymentMethod: 'CREDIT' as const },
        { supplierId: supplier.id, liters: 40, unitPrice: 24000, paymentMethod: 'CREDIT' as const },
      ],
      fuelMode: FuelMode.FLAT_RATE,
      fuelLitersOverride: 140,
      fuelSupplementLiters: 0,
      userId: 1,
    };
    await updateTripFigures(trip.id, args);
    await transitionTripStatus(trip.id, TripStatus.IN_TRANSIT, 1, Role.MANAGER);
    await transitionTripStatus(trip.id, TripStatus.COMPLETED, 1, Role.MANAGER);

    // Save again on the COMPLETED trip with changed prices: unlock reverses the
    // original per-purchase postings, re-lock posts the new amounts.
    await updateTripFigures(trip.id, {
      ...args,
      fuelAllocations: [
        { supplierId: supplier.id, liters: 60, unitPrice: 27500, paymentMethod: 'CREDIT' as const },
        { supplierId: supplier.id, liters: 80, unitPrice: 28500, paymentMethod: 'CREDIT' as const },
      ],
      fuelLitersOverride: 140,
    });

    const ledgerRows = await db.select().from(s.ledger)
      .where(eq(s.ledger.txnId, trip.id));
    const reversals = ledgerRows.filter(r => r.txnType === TxnType.UNLOCK_REVERSAL && r.entityType === 'VENDOR');
    const credits = ledgerRows.filter(r => r.txnType === TxnType.FUEL_EXPENSE && r.entityType === 'VENDOR');
    // Reversal debits must exactly cancel the ORIGINAL per-purchase credits.
    assert.deepEqual(reversals.map(r => Number(r.debit)).sort((a, b) => a - b), [960000, 1120000, 1620000]);
    // Re-lock posts at the NEW prices (60×27,500 + 80×28,500).
    assert.deepEqual(credits.map(r => Number(r.credit)).sort((a, b) => a - b), [960000, 1120000, 1620000, 1650000, 2280000]);
  });
});
