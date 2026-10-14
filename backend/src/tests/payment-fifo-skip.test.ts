/**
 * FIFO allocation skip + total-remaining guard (NITODA production incident).
 *
 * Customer story: recording a 228,120,000 ₫ payment for a customer with 56
 * uncollected trips (FIFO allocation) failed with "Thanh toán vượt quá số
 * còn lại của chuyến TRP-202608-0074 (còn 0 ₫, nhập 18.720.720 ₫)" — the
 * oldest trip was already fully paid and the allocator hard-failed on it
 * instead of skipping to the next trip with remaining balance. These tests
 * pin the fixed contract:
 *   1. fully-paid trips are skipped; the money flows to the next oldest
 *      collectible trip (even when the client's split points at the paid one);
 *   2. a total exceeding the SUM of all remaining balances is rejected with
 *      the TOTAL remaining in the message ("Tổng còn có thể thu"), never a
 *      per-trip figure;
 *   3. an exact-total payment is accepted and zeroes the customer out.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) because the
 * advisory lock, the per-trip sums query and the ledger postings are the
 * behavior under test.
 */
import assert from 'node:assert/strict';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { recordPayment } from '../services/financial.service';
import { LedgerService } from '../services/ledger.service';
// describe/test/after come from the runner-agnostic shim (vitest when run
// under `pnpm exec vitest`, node:test under the canonical `pnpm test`).
import { after, describe, paymentRows, seedCustomerWithDebt, test, testSuffix } from './payment-ledger-test-utils';

const createdCustomerIds: number[] = [];
const createdTripIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];

after(async () => {
  // Same teardown order as payment-delete-recompute: ledger rows first (no
  // FK), then trips, then the catalogs they reference.
  if (createdCustomerIds.length > 0) {
    await db.delete(s.ledger).where(and(
      eq(s.ledger.entityType, 'CUSTOMER'),
      inArray(s.ledger.entityId, createdCustomerIds),
    ));
  }
  if (createdTripIds.length > 0) {
    await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  }
  if (createdRouteIds.length > 0) {
    await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  }
  if (createdCargoTypeIds.length > 0) {
    await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  }
  if (createdCustomerIds.length > 0) {
    await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  }
  await client.end();
});

const trackers = {
  customerIds: createdCustomerIds,
  tripIds: createdTripIds,
  routeIds: createdRouteIds,
  cargoTypeIds: createdCargoTypeIds,
};

/**
 * Third trip on top of seedCustomerWithDebt's two — posted AFTER trip B so
 * insertion order (and the ledger ids my sort tiebreaks on) make it the
 * NEWEST of the three. Revenue rows land within the same millisecond in a
 * fast test run, which is exactly what the id tiebreaker exists for.
 */
async function addThirdTrip(
  customerId: number,
  suffix: string,
  code: string,
  revenue: string,
): Promise<number> {
  const [route] = await db.select({ id: s.routes.id }).from(s.routes)
    .where(eq(s.routes.name, `Route dedupe ${suffix}`)).limit(1);
  const [cargoType] = await db.select({ id: s.cargoTypes.id }).from(s.cargoTypes)
    .where(eq(s.cargoTypes.name, `Cargo dedupe ${suffix}`)).limit(1);
  assert.ok(route && cargoType, 'seed catalogs exist');

  const [trip] = await db.insert(s.trips)
    .values({
      tripCode: code,
      customerId,
      routeId: route.id,
      cargoTypeId: cargoType.id,
      status: 'COMPLETED',
      departureDate: '2026-10-01',
      revenue,
      totalCost: '0',
    })
    .returning({ id: s.trips.id });
  trackers.tripIds.push(trip.id);

  const [lastRevenue] = await db.select({ balance: s.ledger.balance }).from(s.ledger)
    .where(and(
      eq(s.ledger.entityType, 'CUSTOMER'),
      eq(s.ledger.entityId, customerId),
      eq(s.ledger.txnType, TxnType.TRIP_REVENUE),
    ))
    .orderBy(desc(s.ledger.id))
    .limit(1);
  const runningBalance = Number(lastRevenue?.balance ?? 0) + Number(revenue);

  await db.insert(s.ledger).values({
    txnType: TxnType.TRIP_REVENUE,
    txnId: trip.id,
    entityType: 'CUSTOMER',
    entityId: customerId,
    debit: revenue,
    credit: '0',
    balance: String(runningBalance),
    note: `Doanh thu chuyến ${code}`,
  });
  return trip.id;
}

describe('FIFO allocation skips fully-paid trips (NITODA incident)', () => {
  test('oldest trip already fully paid: money skips it and lands on the next collectible trip', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);

    // Pay trip A (10M) in full first — the oldest trip is now closed.
    await recordPayment({
      customerId,
      receiptId: `PT-FIFO1-${suffix}`,
      payments: [{ tripId: tripA, amount: 10_000_000 }],
    });
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 5_000_000);

    // The production scenario: the client's preview still points at the paid
    // oldest trip (aging view and per-trip ledger sums disagree). The request
    // must NOT fail — the server reallocates the total onto trip B.
    const result = await recordPayment({
      customerId,
      receiptId: `PT-FIFO2-${suffix}`,
      payments: [{ tripId: tripA, amount: 5_000_000 }],
    });
    assert.equal(result.duplicate, false);

    const rows = await paymentRows(customerId);
    assert.equal(rows.length, 2, 'one row per posted allocation');
    const second = rows[1];
    assert.equal(second.txnId, tripB, 'the 5M lands on trip B, the next collectible trip');
    assert.equal(Number(second.credit), 5_000_000);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 0);
  });

  test('paid trips in the middle are skipped: allocation spans the remaining trips in order', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);
    const tripC = await addThirdTrip(customerId, suffix, `DDC-${suffix}`.slice(0, 50), '5000000');

    // A (oldest) fully paid; B (middle) partially paid 3M of 5M; C untouched.
    await recordPayment({
      customerId,
      receiptId: `PT-FIFO3-${suffix}`,
      payments: [{ tripId: tripA, amount: 10_000_000 }],
    });
    await recordPayment({
      customerId,
      receiptId: `PT-FIFO4-${suffix}`,
      payments: [{ tripId: tripB, amount: 3_000_000 }],
    });

    // 10M total, mis-aimed at the fully-paid oldest trip by the client split.
    // Only 7M is still collectible (B's 2M remainder + C's 5M), so 10M must
    // be rejected with the TOTAL in the message.
    await assert.rejects(
      recordPayment({
        customerId,
        receiptId: `PT-FIFO5-${suffix}`,
        payments: [{ tripId: tripA, amount: 10_000_000 }],
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422
        && error.message.includes('Tổng còn có thể thu: 7.000.000 ₫'),
    );

    // The exact collectible total (7M) passes: B soaks its 2M remainder
    // first (older revenue), C takes the remaining 5M, A stays skipped.
    await recordPayment({
      customerId,
      receiptId: `PT-FIFO6-${suffix}`,
      payments: [{ tripId: tripA, amount: 7_000_000 }],
    });
    const rows = await paymentRows(customerId);
    assert.deepEqual(
      rows.map(r => [r.txnId, Number(r.credit)]),
      [[tripA, 10_000_000], [tripB, 3_000_000], [tripB, 2_000_000], [tripC, 5_000_000]],
      'B receives its 2M remainder, C the rest; A gets nothing more',
    );
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 0);
  });

  test('amount exceeding the sum of all remaining balances is rejected with the total, not a per-trip message', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

    await assert.rejects(
      recordPayment({
        customerId,
        receiptId: `PT-FIFO7-${suffix}`,
        payments: [{ tripId: tripA, amount: 15_500_000 }],
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error && 'statusCode' in error);
        assert.equal((error as { statusCode: number }).statusCode, 422);
        assert.ok(
          error.message.includes('Tổng còn có thể thu: 15.000.000 ₫'),
          `message states the total remaining, got: ${error.message}`,
        );
        assert.ok(
          !error.message.includes('còn 0 ₫'),
          'no per-trip remaining figure in the message',
        );
        return true;
      },
    );
    // Nothing was posted — the rejection is atomic.
    assert.equal((await paymentRows(customerId)).length, 0);
  });

  test('exact-total payment is accepted and fully settles every trip', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);

    // Arbitrary "wrong" split on the client — only the 15M total matters.
    await recordPayment({
      customerId,
      receiptId: `PT-FIFO8-${suffix}`,
      payments: [
        { tripId: tripB, amount: 9_000_000 },
        { tripId: tripA, amount: 6_000_000 },
      ],
    });

    const rows = await paymentRows(customerId);
    assert.deepEqual(
      rows.map(r => [r.txnId, Number(r.credit)]),
      [[tripA, 10_000_000], [tripB, 5_000_000]],
      'server FIFO ordering wins over the client split',
    );
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 0);

    // A second payment of any size now exceeds the (zero) total remaining.
    await assert.rejects(
      recordPayment({
        customerId,
        receiptId: `PT-FIFO9-${suffix}`,
        payments: [{ tripId: tripA, amount: 1_000 }],
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422
        && error.message.includes('Tổng còn có thể thu: 0 ₫'),
    );
  });
});
