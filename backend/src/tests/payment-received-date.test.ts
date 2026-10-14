/**
 * Payment "Ngày nhận" (received date) — parity with the supplier-payment form.
 *
 * Customer story: payables already carry a payment date; receivables posted
 * everything at "now", so back-dated bank transfers landed on the wrong day,
 * showed wrong dates in the ledger rows and aged wrong. These tests pin:
 *   1. an explicit receivedDate persists as the ledger row's timestamp
 *      (the field the ledger display and FIFO aging buckets both read);
 *   2. no receivedDate defaults to the moment of posting;
 *   3. a future date is rejected (422, Vietnamese message) by the service
 *      and by the route schema.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440).
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { createPaymentSchema } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { recordPayment } from '../services/financial.service';
// describe/test/after come from the runner-agnostic shim (vitest when run
// under `pnpm exec vitest`, node:test under the canonical `pnpm test`).
import { after, describe, paymentRows, seedCustomerWithDebt, test, testSuffix } from './payment-ledger-test-utils';

const createdCustomerIds: number[] = [];
const createdTripIds: number[] = [];
const createdRouteIds: number[] = [];
const createdCargoTypeIds: number[] = [];

after(async () => {
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

/** Calendar date of an instant in the Vietnam office timezone (+07:00). */
function vnDate(d: Date): string {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Today (YYYY-MM-DD) in +07:00 — same rule the service validates against. */
function todayVN(): string {
  return vnDate(new Date());
}

describe('payment received date (Ngày nhận)', () => {
  test('an explicit back-dated receivedDate persists as the ledger row timestamp', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

    // A bank transfer that actually landed 5 days ago, entered today.
    const backdated = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await recordPayment({
      customerId,
      receiptId: `PT-DATE1-${suffix}`,
      payments: [{ tripId: tripA, amount: 4_000_000 }],
      receivedDate: backdated,
    });

    const [row] = await paymentRows(customerId);
    assert.ok(row, 'payment row exists');
    assert.equal(
      vnDate(row.timestamp),
      backdated,
      'ledger timestamp (what ledger rows display and aging ages) is the received date',
    );
    assert.ok(
      row.timestamp.toISOString().endsWith('17:00:00.000Z'),
      `stored at midnight Indochina time, got ${row.timestamp.toISOString()}`,
    );
  });

  test('omitted receivedDate defaults to the moment of posting', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const before = Date.now();

    await recordPayment({
      customerId,
      receiptId: `PT-DATE2-${suffix}`,
      payments: [{ tripId: tripA, amount: 1_000_000 }],
    });

    const [row] = await paymentRows(customerId);
    assert.ok(row);
    const delta = Math.abs(row.timestamp.getTime() - before);
    assert.ok(delta < 60_000, `posted within a minute of now, delta ${delta}ms`);
  });

  test('a future receivedDate is rejected by the service with nothing posted', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await assert.rejects(
      recordPayment({
        customerId,
        receiptId: `PT-DATE3-${suffix}`,
        payments: [{ tripId: tripA, amount: 1_000_000 }],
        receivedDate: future,
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422
        && error.message.includes('Ngày nhận không được lớn hơn ngày hôm nay'),
    );
    assert.equal((await paymentRows(customerId)).length, 0, 'rejection is atomic');
  });

  test('the route schema enforces format and no-future on receivedDate', () => {
    const base = {
      customerId: 1,
      receiptId: 'PT-SCHEMA',
      payments: [{ tripId: 1, amount: 1000 }],
    };
    assert.ok(createPaymentSchema.safeParse(base).success, 'absent date is valid (defaults)');
    assert.ok(
      createPaymentSchema.safeParse({ ...base, receivedDate: '2026-01-05' }).success,
      'a past date is valid',
    );
    assert.equal(
      createPaymentSchema.safeParse({ ...base, receivedDate: '2999-01-01' }).success,
      false,
      'future date rejected',
    );
    assert.equal(
      createPaymentSchema.safeParse({ ...base, receivedDate: '01-01-2026' }).success,
      false,
      'non-ISO format rejected',
    );
    assert.equal(
      createPaymentSchema.safeParse({ ...base, receivedDate: todayVN() }).success,
      true,
      'today itself is valid (back-dating boundary)',
    );
  });
});
