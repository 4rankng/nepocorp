/**
 * Payment intake idempotency (kanban 141026163910).
 *
 * Customer story: the payment form froze, the user resubmitted, and the
 * customer's AR ended up with the same "thanh toán công nợ" twice. These tests
 * pin the dedupe contract: a second identical submission (same receipt id, or
 * same total + row count within the short window) returns `{duplicate:true}`
 * and posts NOTHING, while genuinely different payments still post.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) because the
 * advisory lock and append-only ledger writes are the behavior under test.
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
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
  // Ledger rows have no FK to customers/trips, but trips FK-reference the
  // customer and the catalogs, so they must go before the entities they
  // reference or the deletes block on the constraints.
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

describe('payment intake idempotency (kanban 141026163910)', () => {
  test('first submission posts; exact resubmission is a duplicate that posts nothing', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const payload = {
      customerId,
      receiptId: `PT-DEDUPE-${suffix}`,
      payments: [{ tripId: tripA, amount: 4_000_000 }],
    };

    // First submit — the one that "froze" from the user's point of view.
    const first = await recordPayment(payload);
    assert.deepEqual(first, { duplicate: false });
    assert.equal((await paymentRows(customerId)).length, 1);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 11_000_000); // 15M − 4M

    // Exact resubmit — same receipt, same amount.
    const second = await recordPayment(payload);
    assert.equal(second.duplicate, true);
    if (second.duplicate) {
      assert.equal(typeof second.existingId, 'number');
      assert.equal(second.receiptId, payload.receiptId);
    }
    assert.equal((await paymentRows(customerId)).length, 1, 'no second ledger row');
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 11_000_000);
  });

  test('the same amount with a DIFFERENT receipt still posts (receipt id is the only dedupe key)', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

    const first = await recordPayment({
      customerId,
      receiptId: `PT-WIN1-${suffix}`,
      payments: [{ tripId: tripA, amount: 2_500_000 }],
    });
    assert.equal(first.duplicate, false);

    // A different receipt number is a different payment document — even when
    // the amount and trip match and it arrives moments later. Amount-window
    // matching used to swallow this as a duplicate (the false positive the
    // comprehensive E2E suite caught across back-to-back runs).
    const second = await recordPayment({
      customerId,
      receiptId: `PT-WIN2-${suffix}`,
      payments: [{ tripId: tripA, amount: 2_500_000 }],
    });
    assert.equal(second.duplicate, false);
    assert.equal((await paymentRows(customerId)).length, 2);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 10_000_000); // 15M − 2×2.5M
  });

  test('a different amount with a fresh receipt still posts (no false positive)', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);

    await recordPayment({
      customerId,
      receiptId: `PT-NP1-${suffix}`,
      payments: [{ tripId: tripA, amount: 1_000_000 }],
    });
    // Different amount AND a multi-trip split — must not match the window group.
    const result = await recordPayment({
      customerId,
      receiptId: `PT-NP2-${suffix}`,
      payments: [
        { tripId: tripA, amount: 2_000_000 },
        { tripId: tripB, amount: 3_000_000 },
      ],
    });
    assert.equal(result.duplicate, false);
    // Server-authoritative FIFO (NITODA incident): the 5M total lands as ONE
    // row on trip A (oldest, 9M collectible) regardless of the client split.
    assert.equal((await paymentRows(customerId)).length, 2);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 9_000_000);
  });

  test('receipt-id idempotency is scoped per customer', async () => {
    const suffix = testSuffix();
    const alpha = await seedCustomerWithDebt(`${suffix}-a`, trackers);
    const beta = await seedCustomerWithDebt(`${suffix}-b`, trackers);
    const receiptId = `PT-SHARED-${suffix}`;

    await recordPayment({ customerId: alpha.customerId, receiptId, payments: [{ tripId: alpha.tripA, amount: 1_000_000 }] });
    // Same receipt id, DIFFERENT customer — a different bank statement line.
    const result = await recordPayment({ customerId: beta.customerId, receiptId, payments: [{ tripId: beta.tripA, amount: 1_000_000 }] });
    assert.equal(result.duplicate, false);
    assert.equal((await paymentRows(beta.customerId)).length, 1);
  });
});
