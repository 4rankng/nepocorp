/**
 * Receipt-group edit/delete (NEPO-52) — the sổ chi tiết's Sửa/Xoa on a
 * receipted payment row targets the WHOLE receipt, not one FIFO slice.
 *
 * Customer story: a receipt posted across several trips (recordPayment
 * FIFO-splits it into PAYMENT_RECEIVED slices sharing one receiptId) renders
 * in the sổ as re-derived per-trip rows with synthetic display ids. Editing
 * or deleting from those rows must apply to every slice of the receipt —
 * the per-entry endpoints would leave sibling slices (most of the receipt)
 * on the books, and the display ids would fail the entry-id validation
 * outright (the 'ID bản ghi thanh toán không hợp lệ' 400 the accountant hit
 * on receipt 9399).
 *
 * updatePaymentReceipt() collapses the group onto its oldest slice carrying
 * the corrected total (the stored split is a posting detail the sổ
 * re-derives for display anyway); deletePaymentReceipt() removes every
 * slice. Both recompute the running balance under the same advisory lock and
 * permission gate as the per-entry escape hatches.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) because the
 * advisory lock, the ledger UPDATE/DELETE and the recompute are the behavior
 * under test.
 */
import assert from 'node:assert/strict';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { deletePaymentReceipt, recordPayment, updatePaymentReceipt } from '../services/financial.service';
import { LedgerService } from '../services/ledger.service';
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

/** The FULL ledger must carry a coherent running balance in id order. */
async function assertCoherentRunningBalance(customerId: number, expectedFinal: number) {
  const allRows = await db.select().from(s.ledger)
    .where(and(eq(s.ledger.entityType, 'CUSTOMER'), eq(s.ledger.entityId, customerId)))
    .orderBy(asc(s.ledger.id));
  let expected = 0;
  for (const row of allRows) {
    expected += Number(row.debit) - Number(row.credit);
    assert.equal(
      Number(row.balance),
      expected,
      `row ${row.id} (${row.txnType}) carries the recomputed running balance`,
    );
  }
  assert.equal(expected, expectedFinal);
  assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), expectedFinal);
}

describe('receipt-group edit/delete (NEPO-52)', () => {
  test('editing a multi-slice receipt collapses it to one slice with the corrected total', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    // One receipt bigger than trip A's remainder → recordPayment FIFO-splits
    // it into two PAYMENT_RECEIVED slices sharing the receiptId (exactly the
    // accountant's receipt 9399 shape: one biên lai, nhiều dòng sổ).
    await recordPayment({
      paymentMethod: 'BANK',
      customerId,
      receiptId: `PT-GRP-${suffix}`,
      payments: [{ tripId: tripA, amount: 12_000_000 }],   // 10M into A, 2M into B
    });
    const before = await paymentRows(customerId);
    assert.equal(before.length, 2, 'receipt posts as two FIFO slices');
    assert.ok(before.every(r => r.receiptId === `PT-GRP-${suffix}`));

    const updated = await updatePaymentReceipt(customerId, `PT-GRP-${suffix}`, {
      amount: 1_772_400,          // the NEPO-52 repro figure
      receiptId: `PT-GRP-${suffix}`,
      receivedDate: today,
      paymentMethod: 'BANK',
    });

    assert.equal(updated.customerId, customerId);
    assert.equal(updated.amount, 1_772_400);
    assert.equal(updated.receiptId, `PT-GRP-${suffix}`);
    assert.equal(updated.collapsedCount, 1, 'the second slice is collapsed away');
    assert.equal(updated.id, before[0].id, 'the oldest slice survives');
    // 15M revenue − 1.7724M = 13.2276M outstanding.
    assert.equal(updated.newBalance, 13_227_600);

    const after = await paymentRows(customerId);
    assert.equal(after.length, 1, 'the receipt sits on the books as ONE slice');
    assert.equal(Number(after[0].credit), 1_772_400);
    assert.equal(after[0].id, before[0].id);
    await assertCoherentRunningBalance(customerId, 13_227_600);
  });

  test('deleting a multi-slice receipt removes every slice and rebuilds the balance', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

    await recordPayment({
      paymentMethod: 'CASH',
      customerId,
      receiptId: `PT-DEL-${suffix}`,
      payments: [{ tripId: tripA, amount: 12_000_000 }],   // 10M into A, 2M into B
    });
    const before = await paymentRows(customerId);
    assert.equal(before.length, 2);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 3_000_000);

    const deleted = await deletePaymentReceipt(customerId, `PT-DEL-${suffix}`);

    assert.deepEqual(deleted.ids, before.map(r => r.id), 'every slice of the receipt goes');
    assert.equal(deleted.customerId, customerId);
    assert.equal(deleted.amount, 12_000_000, 'amount is the receipt Σ, not one slice');
    assert.equal(deleted.receiptId, `PT-DEL-${suffix}`);
    assert.equal(deleted.newBalance, 15_000_000, 'back to the full revenue');

    const after = await paymentRows(customerId);
    assert.equal(after.length, 0);
    await assertCoherentRunningBalance(customerId, 15_000_000);
  });

  test('renaming the receipt must not collide with another receipt of the same customer', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    await recordPayment({
      paymentMethod: 'BANK',
      customerId,
      receiptId: `PT-A-${suffix}`,
      payments: [{ tripId: tripA, amount: 1_000_000 }],
    });
    await recordPayment({
      paymentMethod: 'BANK',
      customerId,
      receiptId: `PT-B-${suffix}`,
      payments: [{ tripId: tripB, amount: 1_000_000 }],
    });

    await assert.rejects(
      updatePaymentReceipt(customerId, `PT-A-${suffix}`, {
        amount: 1_000_000,
        receiptId: `PT-B-${suffix}`,   // already used by the other receipt
        receivedDate: today,
      }),
      (e: { statusCode?: number }) => e.statusCode === 409,
      'the intake dedupe key stays unique among the customer\'s payments',
    );

    // Renaming to a receipt the group itself holds is legal (same code).
    const updated = await updatePaymentReceipt(customerId, `PT-A-${suffix}`, {
      amount: 1_000_000,
      receiptId: `PT-A-${suffix}`,
      receivedDate: today,
    });
    assert.equal(updated.receiptId, `PT-A-${suffix}`);
    await assertCoherentRunningBalance(customerId, 13_000_000);
  });

  test('unknown receipt 404s and non-positive amounts are refused', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    await assert.rejects(
      deletePaymentReceipt(customerId, 'PT-MISSING'),
      (e: { statusCode?: number }) => e.statusCode === 404,
    );
    await assert.rejects(
      updatePaymentReceipt(customerId, 'PT-MISSING', {
        amount: 1_000_000,
        receiptId: 'PT-MISSING',
        receivedDate: today,
      }),
      (e: { statusCode?: number }) => e.statusCode === 404,
    );

    await recordPayment({
      paymentMethod: 'BANK',
      customerId,
      receiptId: `PT-ZERO-${suffix}`,
      payments: [{ tripId: tripA, amount: 1_000_000 }],
    });
    await assert.rejects(
      updatePaymentReceipt(customerId, `PT-ZERO-${suffix}`, {
        amount: 0,
        receiptId: `PT-ZERO-${suffix}`,
        receivedDate: today,
      }),
      (e: { statusCode?: number }) => e.statusCode === 422,
    );
    await assertCoherentRunningBalance(customerId, 14_000_000);
  });
});
