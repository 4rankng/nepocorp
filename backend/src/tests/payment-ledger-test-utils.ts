/**
 * Shared fixtures for the payment-ledger tests (kanban 141026163910 /
 * 141026163920): a customer with two revenue-posted trips (10M + 5M) and
 * helpers to read back the customer's PAYMENT_RECEIVED rows.
 *
 * Not a *.test.ts file, so the node:test glob never picks it up directly.
 */
import { and, asc, eq } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { db } from '../db';
import * as s from '../db/schema';

export interface SeededDebtCustomer {
  customerId: number;
  tripA: number;
  tripB: number;
}

/** Create a customer with 15M total posted revenue (10M trip A, 5M trip B). */
export async function seedCustomerWithDebt(
  suffix: string,
  trackers: {
    customerIds: number[];
    tripIds: number[];
    routeIds: number[];
    cargoTypeIds: number[];
  },
): Promise<SeededDebtCustomer> {
  const [customer] = await db.insert(s.customers)
    .values({ name: `Dedupe customer ${suffix}` })
    .returning();
  trackers.customerIds.push(customer.id);

  const [route] = await db.insert(s.routes)
    .values({ name: `Route dedupe ${suffix}` })
    .returning({ id: s.routes.id });
  trackers.routeIds.push(route.id);
  const [cargoType] = await db.insert(s.cargoTypes)
    .values({ name: `Cargo dedupe ${suffix}` })
    .returning({ id: s.cargoTypes.id });
  trackers.cargoTypeIds.push(cargoType.id);

  const tripSpecs = [
    { code: `DDA-${suffix}`.slice(0, 50), revenue: '10000000' },
    { code: `DDB-${suffix}`.slice(0, 50), revenue: '5000000' },
  ];
  const tripIds: number[] = [];
  let runningBalance = 0;
  for (const spec of tripSpecs) {
    const [trip] = await db.insert(s.trips)
      .values({
        tripCode: spec.code,
        customerId: customer.id,
        routeId: route.id,
        cargoTypeId: cargoType.id,
        status: 'COMPLETED',
        departureDate: '2026-10-01',
        revenue: spec.revenue,
        totalCost: '0',
      })
      .returning({ id: s.trips.id });
    trackers.tripIds.push(trip.id);
    tripIds.push(trip.id);

    runningBalance += Number(spec.revenue);
    await db.insert(s.ledger).values({
      txnType: TxnType.TRIP_REVENUE,
      txnId: trip.id,
      entityType: 'CUSTOMER',
      entityId: customer.id,
      debit: spec.revenue,
      credit: '0',
      balance: String(runningBalance),
      note: `Doanh thu chuyến ${spec.code}`,
    });
  }

  return { customerId: customer.id, tripA: tripIds[0], tripB: tripIds[1] };
}

/** PAYMENT_RECEIVED rows for a customer, oldest first. */
export async function paymentRows(customerId: number) {
  return db.select().from(s.ledger)
    .where(and(
      eq(s.ledger.entityType, 'CUSTOMER'),
      eq(s.ledger.entityId, customerId),
      eq(s.ledger.txnType, TxnType.PAYMENT_RECEIVED),
    ))
    .orderBy(asc(s.ledger.id));
}

/** Unique-enough suffix so parallel-ish runs never collide. */
export function testSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
