/**
 * Completion is permissive about fuel without a named supplier
 * (kanban 121026194100).
 *
 * The former 422 here ("chưa gán nhà cung cấp…") dead-ended the fleet: xe nhà
 * must reach "Hoàn thành" before the truck can be dispatched on the next trip,
 * while kế toán only chốt số the next day. And xe ngoài carries no company
 * fuel cost at all — its figures schema rejects a supplier/allocations — so
 * its liters are informational and nothing may ever be required.
 *
 * The trade-off this pins: fuel booked without a supplier posts NOTHING to a
 * payable ledger (LedgerService keys the fallback on `trip.fuelSupplierId`).
 * The cost is not lost — the supplier fuel statement lists such trips under
 * "chuyến lấy dầu nhưng chưa gán NCC", and gán NCC + chốt lại chuyến posts
 * it. The trip detail page shows a non-blocking warning for the xe nhà case.
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
  carrierType?: 'OWN' | 'EXTERNAL';
}) {
  const external = values.carrierType === 'EXTERNAL';
  const [trip] = await db.insert(s.trips).values({
    tripCode: `FB-${SUFFIX}-${tripIds.length}`.slice(0, 50),
    customerId, routeId, cargoTypeId,
    ...(external
      ? {
          truckId: null,
          carrierType: 'EXTERNAL' as const,
          externalCarrierId: customerId,
          // The completion plate gate (kanban 20260921_4) stays; satisfy it so
          // these tests exercise the fuel rules only.
          externalPlateNumber: '15C-99999',
        }
      : { truckId, carrierType: 'OWN' as const }),
    status: TripStatus.IN_TRANSIT,
    departureDate: '2026-06-20',
    revenue: '1200000',
    fuelLiters: values.fuelLiters ?? '0',
    totalFuelCost: values.totalFuelCost ?? '0',
    fuelSupplierId: values.fuelSupplierId ?? null,
  }).returning();
  tripIds.push(trip.id);
  return trip;
}

const complete = (tripId: number) =>
  transitionTripStatus(tripId, TripStatus.COMPLETED, 1, Role.ADMIN);

const statusOf = async (tripId: number) => {
  const [row] = await db.select({ status: s.trips.status }).from(s.trips).where(eq(s.trips.id, tripId));
  return row.status;
};

const fuelLedgerRows = (tripId: number) =>
  db.select({ id: s.ledger.id }).from(s.ledger)
    .where(and(eq(s.ledger.txnId, tripId), eq(s.ledger.txnType, 'FUEL_EXPENSE')));

describe('hoàn thành chuyến không bị chặn bởi thiếu NCC nhiên liệu (kanban 121026194100)', () => {
  test('xe nhà: fuel with no supplier still completes; the cost waits for gán NCC + chốt lại', async () => {
    const trip = await makeTrip({ fuelLiters: '152', totalFuelCost: '4550880' });
    await complete(trip.id);
    assert.equal(await statusOf(trip.id), TripStatus.COMPLETED);
    assert.equal((await fuelLedgerRows(trip.id)).length, 0,
      'the unassigned cost posts nothing yet — the supplier statement lists it for the follow-up');
  });

  test('xe ngoài: liters are informational and no supplier is ever required', async () => {
    const trip = await makeTrip({ fuelLiters: '92', totalFuelCost: '2515300', carrierType: 'EXTERNAL' });
    await complete(trip.id);
    assert.equal(await statusOf(trip.id), TripStatus.COMPLETED);
    assert.equal((await fuelLedgerRows(trip.id)).length, 0,
      'a subcontracted trip carries no company fuel payable at all');
  });

  test('xe nhà: fuel reaches the payable ledger once a supplier is assigned', async () => {
    const trip = await makeTrip({ fuelLiters: '100', totalFuelCost: '2774000', fuelSupplierId });
    await complete(trip.id);
    assert.equal(await statusOf(trip.id), TripStatus.COMPLETED);
    assert.equal((await fuelLedgerRows(trip.id)).length, 1, 'the fuel reaches the payable ledger');
  });

  test('allows a cash allocation, whose supplier_id is NULL by schema CHECK', async () => {
    const trip = await makeTrip({ fuelLiters: '100', totalFuelCost: '2774000' });
    await db.insert(s.tripFuelAllocations).values({
      tripId: trip.id, supplierId: null, liters: '100', unitPrice: '27740', paymentMethod: 'CASH',
    });
    await complete(trip.id);
    assert.equal(await statusOf(trip.id), TripStatus.COMPLETED);
  });

  test('allows a trip with no fuel at all', async () => {
    const trip = await makeTrip({ fuelLiters: '0', totalFuelCost: '0' });
    await complete(trip.id);
    assert.equal(await statusOf(trip.id), TripStatus.COMPLETED);
  });
});
