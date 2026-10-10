/**
 * A saved supplier payment statement must list each live fuel charge once.
 *
 * The ledger is append-only: unlocking a trip (or re-dispatching a completed
 * one) posts an UNLOCK_REVERSAL that cancels the fuel charges already booked,
 * and the next lock posts a fresh charge. Both the cancelled charge and its
 * replacement stay in the ledger. The statement builder filtered on credit > 0,
 * which dropped the reversal (credit = 0) but kept *both* charge rows — so the
 * supplier's copy showed "Chi phí N lít dầu chuyến X" twice at the same amount
 * (kanban 081026232520: TRP-202610-0021 ×2, TRP-202609-0054 ×3).
 *
 * The builder now keeps only the newest live charges per trip (mirroring
 * LedgerService.countActiveFuelCharges). These tests fail on the pre-fix code.
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { LedgerService } from '../services/ledger.service';
import { generateDraft } from '../services/billingDocument.service';

const createdSupplierIds: number[] = [];
const createdCustomerIds: number[] = [];
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

const UNIT_PRICE = 29_710;
const LITERS = 225;
const FUEL_COST = UNIT_PRICE * LITERS;

async function seedTrip(suffix: string, litersList: number[]) {
  const [customer] = await db.insert(s.customers)
    .values({ name: `Fuel stmt cust ${suffix}` }).returning();
  const [supplier] = await db.insert(s.suppliers)
    .values({ name: `Fuel stmt sup ${suffix}`, isFuelSupplier: true }).returning();
  const [route] = await db.insert(s.routes)
    .values({ name: `Fuel stmt route ${suffix}` }).returning();
  const [cargoType] = await db.insert(s.cargoTypes)
    .values({ name: `Fuel stmt cargo ${suffix}` }).returning();
  const totalLiters = litersList.reduce((sum, n) => sum + n, 0);
  const [trip] = await db.insert(s.trips).values({
    tripCode: `FUELSTMT-${suffix}`.slice(0, 50),
    customerId: customer.id,
    routeId: route.id,
    cargoTypeId: cargoType.id,
    status: TripStatus.COMPLETED,
    departureDate: '2026-10-05',
    revenue: '5000000',
    carrierType: 'OWN',
    fuelSupplierId: supplier.id,
    fuelLiters: String(totalLiters),
    fuelActualUnitPrice: String(UNIT_PRICE),
    fuelPriceApplied: '27650',
    totalFuelCost: String(UNIT_PRICE * totalLiters),
  }).returning();
  await db.insert(s.tripFuelAllocations).values(litersList.map(liters => ({
    tripId: trip.id,
    supplierId: supplier.id,
    liters: String(liters),
    paymentMethod: 'CREDIT',
  })));
  createdSupplierIds.push(supplier.id);
  createdCustomerIds.push(customer.id);
  createdRouteIds.push(route.id);
  createdCargoTypeIds.push(cargoType.id);
  createdTripIds.push(trip.id);
  return { trip, supplier };
}

const lockArgs = (
  trip: { id: number; tripCode: string | null; customerId: number },
  allocations: Array<{ liters: number; supplierId: number }>,
) => ({
  id: trip.id,
  tripCode: trip.tripCode,
  customerId: trip.customerId,
  driverId: null,
  revenue: '0',
  driverSalary: '0',
  carrierType: 'OWN' as const,
  fuelSupplierId: allocations[0]?.supplierId ?? null,
  fuelActualUnitPrice: String(UNIT_PRICE),
  fuelPriceApplied: '27650',
  totalFuelCost: String(allocations.reduce((sum, a) => sum + a.liters, 0) * UNIT_PRICE),
  fuelAllocations: allocations.map(a => ({
    supplierId: a.supplierId,
    liters: String(a.liters),
    unitPrice: null,
    paymentMethod: 'CREDIT',
  })),
  ancillaryFees: [],
});

/** A statement period wide enough to hold the postings this test makes now. */
const RANGE = { rangeFrom: '2000-01-01', rangeTo: '2099-12-31' };

async function draftLines(supplierId: number) {
  const draft = await generateDraft({
    type: 'PAYMENT_STATEMENT',
    entityType: 'VENDOR',
    entityId: supplierId,
    ...RANGE,
  } as Parameters<typeof generateDraft>[0]);
  return draft;
}

describe('supplier payment statement nets fuel unlock reversals', () => {
  test('a fuel charge reversed and re-posted appears once', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { trip, supplier } = await seedTrip(suffix, [LITERS]);
    const alloc = [{ liters: LITERS, supplierId: supplier.id }];

    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, alloc)));
    // An edit cycle: unlock reverses the charge, the re-lock posts a fresh one.
    await db.transaction(tx => LedgerService.postTripUnlock(tx, lockArgs(trip, alloc)));
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, alloc)));

    const charges = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, 'FUEL_EXPENSE'),
      eq(s.ledger.txnId, trip.id),
    ));
    assert.equal(charges.length, 2, 'the ledger keeps the cancelled charge and its replacement');

    const draft = await draftLines(supplier.id);
    assert.equal(draft.lines.length, 1, 'only the live charge is billed');
    assert.equal(draft.lines[0].baseAmount, FUEL_COST);
    assert.equal(draft.totalInclVat, FUEL_COST);
  });

  test('two edit cycles (three charge rows) still appear once', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { trip, supplier } = await seedTrip(suffix, [LITERS]);
    const alloc = [{ liters: LITERS, supplierId: supplier.id }];

    for (let i = 0; i < 3; i++) {
      await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, alloc)));
      if (i < 2) {
        await db.transaction(tx => LedgerService.postTripUnlock(tx, lockArgs(trip, alloc)));
      }
    }

    const charges = await db.select().from(s.ledger).where(and(
      eq(s.ledger.txnType, 'FUEL_EXPENSE'),
      eq(s.ledger.txnId, trip.id),
    ));
    assert.equal(charges.length, 3, 'three charge rows, two of them cancelled');

    const draft = await draftLines(supplier.id);
    assert.equal(draft.lines.length, 1, 'only the newest live charge is billed');
    assert.equal(draft.totalInclVat, FUEL_COST);
  });

  test('a legitimate per-purchase trip keeps one line per live purchase', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { trip, supplier } = await seedTrip(suffix, [60, 80]);
    const alloc = [
      { liters: 60, supplierId: supplier.id },
      { liters: 80, supplierId: supplier.id },
    ];

    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, alloc)));
    // An edit that reverses both purchases and re-posts both.
    await db.transaction(tx => LedgerService.postTripUnlock(tx, lockArgs(trip, alloc)));
    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, alloc)));

    const draft = await draftLines(supplier.id);
    assert.equal(draft.lines.length, 2, 'each live purchase is one line');
    assert.deepEqual(
      draft.lines.map(l => l.baseAmount).sort((a, b) => a - b),
      [60 * UNIT_PRICE, 80 * UNIT_PRICE],
    );
  });

  test('a charge that was never reversed is always billed', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { trip, supplier } = await seedTrip(suffix, [LITERS]);
    const alloc = [{ liters: LITERS, supplierId: supplier.id }];

    await db.transaction(tx => LedgerService.postTripLock(tx, lockArgs(trip, alloc)));

    const draft = await draftLines(supplier.id);
    assert.equal(draft.lines.length, 1);
    assert.equal(draft.totalInclVat, FUEL_COST);
  });
});
