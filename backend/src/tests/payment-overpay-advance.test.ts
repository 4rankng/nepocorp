/**
 * NEPO-45 — payments exceeding the outstanding debt are recorded, not blocked.
 *
 * Accountant report (05/11/2026, customer CHÈ MÓC SƯƠNG): debt 25.883.200,
 * bank transfer received 28.882.200 — the intake used to hard-block with
 * "vượt quá tổng công nợ". The contract now is:
 *
 *   1. an exact-total (integer VND) payment settles in full and posts nothing
 *      beyond the FIFO trip rows;
 *   2. an overpay posts the excess as ONE customer-level advance credit
 *      (txnId null), the running balance goes negative by the excess, and the
 *      row's note names it ("trả trước X ₫");
 *   3. non-positive amounts are refused with 400;
 *   4. aging over an overpaid ledger leaves every bucket at zero — the excess
 *      credit is dropped by FIFO consumption, never lumped into "0-30 ngày".
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) because the
 * advisory lock and append-only ledger writes are the behavior under test.
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { computeFifoAging } from '@tingting/shared';
import { ApiError } from '../errors';
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

describe('NEPO-45 — overpay is recorded as advance credit, not blocked', () => {
  test('exact-total payment settles fully and reports no overpaid field', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);

    // 15M total debt — paying exactly 15M must not error (the old float-based
    // client guard false-positived even on this case) and must not create an
    // advance row.
    const result = await recordPayment({
      customerId,
      receiptId: `PT-OVP-EXACT-${suffix}`,
      payments: [{ tripId: tripA, amount: 15_000_000 }],
    });
    assert.deepEqual(result, { duplicate: false }, 'no overpaid field when the payment fits');

    const rows = await paymentRows(customerId);
    assert.deepEqual(
      rows.map(r => [r.txnId, Number(r.credit)]),
      [[tripA, 10_000_000], [tripB, 5_000_000]],
    );
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 0);
  });

  test('overpay posts the excess as advance credit: negative balance + "trả trước" note', async () => {
    const suffix = testSuffix();
    // 15M collectible; after a 10M part-payment 5M remains, and receiving
    // 18.882.200 → 13.882.200 lands as advance (negative balance).
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    await recordPayment({
      customerId,
      receiptId: `PT-OVP-SEED-${suffix}`,
      payments: [{ tripId: tripA, amount: 10_000_000 }],
    });

    const result = await recordPayment({
      customerId,
      receiptId: `PT-OVP-OVER-${suffix}`,
      payments: [{ tripId: tripA, amount: 18_882_200 }],
    });
    assert.deepEqual(result, { duplicate: false, overpaid: 13_882_200 });
    assert.equal(
      await LedgerService.getBalance('CUSTOMER', customerId),
      15_000_000 - 10_000_000 - 18_882_200,
      'running balance carries the excess and goes negative',
    );

    const rows = await paymentRows(customerId);
    const advance = rows[rows.length - 1];
    assert.equal(advance.txnId, null, 'advance row is customer-level, not tied to a trip');
    assert.equal(Number(advance.credit), 13_882_200);
    assert.ok(
      advance.note?.includes('(trả trước 13.882.200 ₫)'),
      `note names the advance for ledger history, got: ${advance.note}`,
    );
    assert.equal(advance.receiptId, `PT-OVP-OVER-${suffix}`, 'same receipt ties the rows of one posting');
  });

  test('negative and zero amounts are refused with 400', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

    for (const amount of [-4_000_000, 0]) {
      await assert.rejects(
        recordPayment({
          customerId,
          receiptId: `PT-OVP-NEG-${suffix}`,
          payments: [{ tripId: tripA, amount }],
        }),
        (error: unknown) => {
          assert.ok(error instanceof ApiError, `amount ${amount} throws ApiError`);
          assert.equal(error.statusCode, 400);
          return true;
        },
      );
    }
    // Nothing was posted by the refused attempts.
    assert.equal((await paymentRows(customerId)).length, 0);
  });

  test('aging over an overpaid ledger keeps every bucket at zero (no "0-30" lumping)', async () => {
    // The ticket's figures: 25.883.200 billed, then 28.882.200 received.
    const entries = [
      { timestamp: '2026-10-01T00:00:00.000Z', debit: '25883200', credit: '0', ref: 'TRIP_REVENUE' },
      { timestamp: '2026-11-05T00:00:00.000Z', debit: '0', credit: '28882200', ref: 'PAYMENT_RECEIVED' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, new Date('2026-11-05T00:00:00Z'));

    assert.deepEqual(aging, { current: 0, d30: 0, d60: 0, over90: 0 });
    assert.ok(openInvoices.every(inv => inv.open <= 0), 'no invoice stays open, none absorbs the excess');
  });
});
