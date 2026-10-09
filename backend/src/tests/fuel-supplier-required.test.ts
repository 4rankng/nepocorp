/**
 * A trip that draws fuel but names no supplier must not be completable.
 *
 * LedgerService.postTripEntries books fuel via `trip.fuelSupplierId`, and skips
 * the entry entirely when it is null. The cost is not deferred — it is lost:
 * TRP-202609-0048 completed on 18/09 with 152 lít and 4.550.880đ that reached no
 * bảng kê and no công nợ, which is how the September reconciliation was short.
 *
 * The guard has to spare two legitimate cases: a trip with no fuel at all, and a
 * trip whose fuel is recorded as a CASH allocation (schema CHECK forces
 * supplier_id NULL there, and it must not be forced into a credit purchase).
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TripStatus, Role } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { transitionTripStatus } from '../services/trip-status-machine.service';

const SUFFIX = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const tripIds: number[] = [];
let customerId: number;
let routeId: number;
let cargoTypeId: number;
let truckId: number;
let fuelSupplierId: number;

before(async () => {
  const [customer] = await db.insert(s.customers).values({ name: `KH chặn NCC ${SUFFIX}` }).returning();
  const [route] = await db.insert(s.routes).values({ name: `Tuyến chặn NCC ${SUFFIX}` }).returning();
  const [cargoType] = await db.insert(s.cargoTypes).values({ name: `Loại chặn NCC ${SUFFIX}` }).returning();
  const [truck] = await db.insert(s.trucks).values({ licensePlate: `KT-${SUFFIX}`.slice(0, 15) }).returning();
  const [supplier] = await db.insert(s.suppliers).values({ name: `NCC chặn ${SUFFIX}`, isFuelSupplier: true }).returning();
  customerId = customer.id; routeId = route.id; cargoTypeId = cargoType.id;
  truckId = truck.id; fuelSupplierId = supplier.id;
});

after(async () => {
  if (tripIds.length > 0) {
    await db.delete(s.tripFuelAllocations).where(inArray(s.tripFuelAllocations.tripId, tripIds));
    await db.delete(s.ledger).where(inArray(s.ledger.txnId, tripIds));
    await db.delete(s.trips).where(inArray(s.trips.id, tripIds));
  }
  await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  await db.delete(s.suppliers).where(eq(s.suppliers.id, fuelSupplierId));
  await db.delete(s.customers).where(eq(s.customers.id, customerId));
  await db.delete(s.routes).where(eq(s.routes.id, routeId));
  await db.delete(s.cargoTypes).where(eq(s.cargoTypes.id, cargoTypeId));
  await client.end();
});

async function makeTrip(values: {
  fuelLiters?: string;
  totalFuelCost?: string;
  fuelSupplierId?: number | null;
}) {
  const [trip] = await db.insert(s.trips).values({
    tripCode: `FB-${SUFFIX}-${tripIds.length}`.slice(0, 50),
    customerId, routeId, cargoTypeId, truckId,
    status: TripStatus.IN_TRANSIT,
    departureDate: '2026-06-20',
    revenue: '1200000',
    fuelLiters: values.fuelLiters ?? '0',
    totalFuelCost: values.totalFuelCost ?? '0',
    fuelSupplierId: values.fuelSupplierId ?? null,
    carrierType: 'OWN',
  }).returning();
  tripIds.push(trip.id);
  return trip;
}

const complete = (tripId: number) =>
  transitionTripStatus(tripId, TripStatus.COMPLETED, 1, Role.ADMIN);

describe('chặn hoàn thành chuyến khi nhiên liệu chưa gán nhà cung cấp', () => {
  test('rejects fuel with no supplier and no allocation', async () => {
    const trip = await makeTrip({ fuelLiters: '152', totalFuelCost: '4550880' });
    await assert.rejects(
      () => complete(trip.id),
      (err: Error) => {
        assert.match(err.message, /chưa gán nhà cung cấp/i);
        return true;
      },
      'completing must be refused so the cost is never dropped silently',
    );
    const [after] = await db.select({ status: s.trips.status }).from(s.trips).where(eq(s.trips.id, trip.id));
    assert.equal(after.status, TripStatus.IN_TRANSIT, 'status must be untouched');
  });

  test('allows a trip with fuel once a supplier is assigned', async () => {
    const trip = await makeTrip({ fuelLiters: '100', totalFuelCost: '2774000', fuelSupplierId });
    await complete(trip.id);
    const [after] = await db.select({ status: s.trips.status }).from(s.trips).where(eq(s.trips.id, trip.id));
    assert.equal(after.status, TripStatus.COMPLETED);
    const fuelRows = await db.select({ id: s.ledger.id }).from(s.ledger)
      .where(and(eq(s.ledger.txnId, trip.id), eq(s.ledger.txnType, 'FUEL_EXPENSE')));
    assert.equal(fuelRows.length, 1, 'and the fuel reaches the payable ledger');
  });

  test('allows a cash allocation, whose supplier_id is NULL by schema CHECK', async () => {
    const trip = await makeTrip({ fuelLiters: '100', totalFuelCost: '2774000' });
    await db.insert(s.tripFuelAllocations).values({
      tripId: trip.id, supplierId: null, liters: '100', unitPrice: '27740', paymentMethod: 'CASH',
    });
    await complete(trip.id);
    const [after] = await db.select({ status: s.trips.status }).from(s.trips).where(eq(s.trips.id, trip.id));
    assert.equal(after.status, TripStatus.COMPLETED);
  });

  test('allows a trip with no fuel at all', async () => {
    const trip = await makeTrip({ fuelLiters: '0', totalFuelCost: '0' });
    await complete(trip.id);
    const [after] = await db.select({ status: s.trips.status }).from(s.trips).where(eq(s.trips.id, trip.id));
    assert.equal(after.status, TripStatus.COMPLETED);
  });
});
