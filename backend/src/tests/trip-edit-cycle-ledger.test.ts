/**
 * NEPO-43 source-fix cover: updateTripFigures on a COMPLETED trip used to run
 * postTripUnlock + postTripLock on every save, minting a net-zero
 * UNLOCK_REVERSAL + TRIP_REVENUE pair per save (the "Hoàn tác khóa chuyến"
 * noise on the customer statement). With ledgerInputsChanged gating the pair:
 * — saving figures with no ledger-relevant change posts no new rows;
 * — changing revenue posts exactly one new pair (reversal of the old amount,
 *   revenue of the new amount), which stays visible on the statement.
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { FuelMode, Role, TripStatus, TxnType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { transitionTripStatus } from '../services/trip-status-machine.service';
import { updateTripFigures } from '../services/trip-mutations.service';
import { getStatementData } from '../services/statement.service';

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

async function ledgerRowsForTrip(tripId: number) {
  return db.select().from(s.ledger)
    .where(eq(s.ledger.txnId, tripId))
    .orderBy(s.ledger.id);
}

describe('COMPLETED-trip edit cycle ledger gating', () => {
  test('no-op save posts no rows; revenue change posts exactly one pair', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `Edit-cycle customer ${suffix}` }).returning();
    const [supplier] = await db.insert(s.suppliers).values({ name: `Edit-cycle supplier ${suffix}`, isFuelSupplier: true }).returning();
    const [route] = await db.insert(s.routes).values({ name: `Edit-cycle route ${suffix}` }).returning();
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Edit-cycle cargo ${suffix}` }).returning();
    createdCustomerIds.push(customer.id);
    createdSupplierIds.push(supplier.id);
    createdRouteIds.push(route.id);
    createdCargoTypeIds.push(cargoType.id);

    const [trip] = await db.insert(s.trips).values({
      tripCode: `EC-${suffix}`.slice(0, 50),
      customerId: customer.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: TripStatus.IN_TRANSIT,
      departureDate: '2026-06-20',
      revenue: String(1_000_000),
      totalFuelCost: String(250_000),
      fuelLiters: '250',
      fuelPriceApplied: '1000',
      fuelSupplierId: supplier.id,
      carrierType: 'OWN',
    }).returning();
    createdTripIds.push(trip.id);
    await db.insert(s.tripFuelAllocations).values({
      tripId: trip.id,
      supplierId: supplier.id,
      liters: '250',
      paymentMethod: 'CREDIT',
    });

    await transitionTripStatus(trip.id, TripStatus.COMPLETED, 1, Role.MANAGER);

    const afterCompletion = await ledgerRowsForTrip(trip.id);
    const initialCustomerRevenue = afterCompletion.filter(r => r.entityType === 'CUSTOMER' && r.txnType === TxnType.TRIP_REVENUE);
    assert.equal(initialCustomerRevenue.length, 1);
    assert.equal(Number(initialCustomerRevenue[0].debit), 1_000_000);

    const noOpPayload = {
      legs: [] as never[],
      fuelMode: FuelMode.FLAT_RATE,
      fuelLitersOverride: 250,
      fuelSupplementLiters: 0,
      fuelAllocations: [{ supplierId: supplier.id, liters: 250, paymentMethod: 'CREDIT' as const }],
    };

    // 1. No-op save (no ledger-relevant input changed) → no new ledger rows.
    const afterNoOp = await updateTripFigures(trip.id, {
      ...noOpPayload,
      expectedVersion: trip.version,
      userId: 1,
    });
    const rowsAfterNoOp = await ledgerRowsForTrip(trip.id);
    assert.deepEqual(
      rowsAfterNoOp.map(r => r.id),
      afterCompletion.map(r => r.id),
      'no-op save must not post any ledger row',
    );
    assert.equal(afterNoOp.version, trip.version + 1);

    // 2. Revenue change → exactly one new customer pair (reversal + revenue).
    await updateTripFigures(trip.id, {
      ...noOpPayload,
      revenue: 2_000_000,
      expectedVersion: afterNoOp.version,
      userId: 1,
    });
    const rowsAfterRevenueChange = await ledgerRowsForTrip(trip.id);
    const customerRows = rowsAfterRevenueChange.filter(r => r.entityType === 'CUSTOMER');
    const revenueRows = customerRows.filter(r => r.txnType === TxnType.TRIP_REVENUE);
    const reversalRows = customerRows.filter(r => r.txnType === TxnType.UNLOCK_REVERSAL);
    assert.equal(revenueRows.length, 2, 'original revenue + one repost');
    assert.equal(reversalRows.length, 1, 'exactly one unlock reversal');
    assert.deepEqual(revenueRows.map(r => Number(r.debit)).sort((a, b) => a - b), [1_000_000, 2_000_000]);
    assert.equal(Number(reversalRows[0].credit), 1_000_000);
    // Customer ledger: exactly the revenue pair. Vendor ledger: the unlock
    // reverses the fuel charge and the lock reposts it — real-change behavior
    // is kept unchanged (fuel inputs did not move here).
    assert.equal(rowsAfterRevenueChange.length - rowsAfterNoOp.length, 4);
    const noOpRowIds = new Set(rowsAfterNoOp.map(r => r.id));
    const newRows = rowsAfterRevenueChange.filter(r => !noOpRowIds.has(r.id));
    const newVendorRows = newRows.filter(r => r.entityType === 'VENDOR');
    assert.equal(newVendorRows.length, 2);
    assert.deepEqual(newVendorRows.map(r => Number(r.debit) || Number(r.credit)).sort((a, b) => a - b), [250_000, 250_000]);

    // 3. Statement: the new pair has different amounts, so nothing collapses;
    //    the net moves exactly by the revenue delta.
    const statement = await getStatementData(customer.id);
    assert.ok(statement);
    const statementTripRows = statement.ledgerRows.filter(r => r.txnType === TxnType.TRIP_REVENUE || r.txnType === TxnType.UNLOCK_REVERSAL);
    assert.equal(statementTripRows.length, 3);
    assert.equal(statement.totalOutstanding, 2_000_000);
  });

  test('no-op save after a revenue change stays silent too', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [customer] = await db.insert(s.customers).values({ name: `Edit-cycle steady customer ${suffix}` }).returning();
    const [supplier] = await db.insert(s.suppliers).values({ name: `Edit-cycle steady supplier ${suffix}`, isFuelSupplier: true }).returning();
    const [route] = await db.insert(s.routes).values({ name: `Edit-cycle steady route ${suffix}` }).returning();
    const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Edit-cycle steady cargo ${suffix}` }).returning();
    createdCustomerIds.push(customer.id);
    createdSupplierIds.push(supplier.id);
    createdRouteIds.push(route.id);
    createdCargoTypeIds.push(cargoType.id);

    const [trip] = await db.insert(s.trips).values({
      tripCode: `EC-${suffix}`.slice(0, 50),
      customerId: customer.id,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: TripStatus.IN_TRANSIT,
      departureDate: '2026-06-20',
      revenue: String(1_000_000),
      totalFuelCost: String(250_000),
      fuelLiters: '250',
      fuelPriceApplied: '1000',
      fuelSupplierId: supplier.id,
      carrierType: 'OWN',
    }).returning();
    createdTripIds.push(trip.id);
    await db.insert(s.tripFuelAllocations).values({
      tripId: trip.id,
      supplierId: supplier.id,
      liters: '250',
      paymentMethod: 'CREDIT',
    });

    await transitionTripStatus(trip.id, TripStatus.COMPLETED, 1, Role.MANAGER);

    const payload = {
      legs: [] as never[],
      fuelMode: FuelMode.FLAT_RATE,
      fuelLitersOverride: 250,
      fuelSupplementLiters: 0,
      fuelActualUnitPrice: 1000,
      fuelAllocations: [{ supplierId: supplier.id, liters: 250, paymentMethod: 'CREDIT' as const }],
    };
    // Real edit (revenue 1M → 2M): the pair posts with different amounts.
    const first = await updateTripFigures(trip.id, {
      ...payload,
      revenue: 2_000_000,
      expectedVersion: trip.version,
      userId: 1,
    });
    const rowsAfterFirst = await ledgerRowsForTrip(trip.id);
    assert.equal(rowsAfterFirst.filter(r => r.entityType === 'CUSTOMER' && r.txnType === TxnType.UNLOCK_REVERSAL).length, 1);

    // Same figures saved again (the accountant polishing actuals): silent.
    await updateTripFigures(trip.id, {
      ...payload,
      revenue: 2_000_000,
      expectedVersion: first.version,
      userId: 1,
    });

    const rowsAfterSecond = await ledgerRowsForTrip(trip.id);
    assert.deepEqual(rowsAfterSecond.map(r => r.id), rowsAfterFirst.map(r => r.id));
    assert.equal(rowsAfterSecond.filter(r => r.entityType === 'CUSTOMER' && r.txnType === TxnType.UNLOCK_REVERSAL).length, 1);
  });
});
