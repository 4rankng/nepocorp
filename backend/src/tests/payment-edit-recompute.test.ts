/**
 * Payment-entry editing — amount / "Ngày nhận" / receipt code with balance
 * recompute (sibling of the kanban 141026163920 delete escape hatch).
 *
 * Customer story: a payment entered with a wrong amount, a receipt number
 * mistyped, or a received date that was actually the bank transfer day had
 * no correction path other than delete + re-enter (losing the original
 * posting). updatePaymentEntry() corrects the row in place under the same
 * advisory lock, permission gate and audit event family as the delete, and
 * rebuilds the running balance exactly like deletePaymentEntry().
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) because the
 * advisory lock, the ledger UPDATE and the recompute are the behavior under
 * test.
 */
import assert from 'node:assert/strict';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { recordPayment, updatePaymentEntry } from '../services/financial.service';
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

/** Calendar date of an instant in the Vietnam office timezone (+07:00). */
function vnDate(d: Date): string {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

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

describe('payment entry editing + balance recompute', () => {
  test('editing amount, received date and receipt code updates the row and rebuilds the balance', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

    await recordPayment({
      customerId,
      receiptId: `PT-EDIT1-${suffix}`,
      payments: [{ tripId: tripA, amount: 4_000_000 }],
    });
    const [row] = await paymentRows(customerId);
    const backdated = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const updated = await updatePaymentEntry(row.id, {
      amount: 6_000_000,
      receiptId: `PT-EDIT1A-${suffix}`,
      receivedDate: backdated,
    });

    assert.equal(updated.id, row.id);
    assert.equal(updated.customerId, customerId);
    assert.equal(updated.amount, 6_000_000);
    assert.equal(updated.receiptId, `PT-EDIT1A-${suffix}`);
    assert.equal(updated.receivedDate, backdated);
    // 15M revenue − 6M edited payment = 9M outstanding.
    assert.equal(updated.newBalance, 9_000_000);

    const [after] = await paymentRows(customerId);
    assert.equal(Number(after.credit), 6_000_000, 'amount edited in place');
    assert.equal(after.receiptId, `PT-EDIT1A-${suffix}`, 'receipt code edited in place');
    assert.equal(vnDate(after.timestamp), backdated, 'received date edited in place');
    await assertCoherentRunningBalance(customerId, 9_000_000);
  });

  test('editing the amount down also recomputes the balance (both directions)', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    await recordPayment({
      customerId,
      receiptId: `PT-EDIT2-${suffix}`,
      payments: [{ tripId: tripA, amount: 5_000_000 }],
    });
    const [row] = await paymentRows(customerId);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 10_000_000);

    const updated = await updatePaymentEntry(row.id, {
      amount: 2_000_000,
      receiptId: `PT-EDIT2-${suffix}`,
      receivedDate: today,
    });
    assert.equal(updated.newBalance, 13_000_000, '15M revenue − 2M edited payment');
    await assertCoherentRunningBalance(customerId, 13_000_000);
  });

  test('a receipt code already used by another payment of the same customer is rejected', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    await recordPayment({
      customerId,
      receiptId: `PT-KEEP-${suffix}`,
      payments: [{ tripId: tripA, amount: 1_000_000 }],
    });
    await recordPayment({
      customerId,
      receiptId: `PT-EDIT3-${suffix}`,
      payments: [{ tripId: tripB, amount: 1_000_000 }],
    });
    const rows = await paymentRows(customerId);
    const editRow = rows[1];

    await assert.rejects(
      updatePaymentEntry(editRow.id, {
        amount: 1_000_000,
        receiptId: `PT-KEEP-${suffix}`,
        receivedDate: today,
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error && (error as { statusCode: number }).statusCode === 409
        && error.message.includes('Mã biên lai'),
    );
    // Nothing changed.
    const rowsAfter = await paymentRows(customerId);
    assert.equal(rowsAfter.length, rows.length);
    assert.equal(rowsAfter[1].receiptId, rows[1].receiptId, 'edit was rejected, row untouched');
  });

  test('an edit may not push the amount past what is still collectible', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    await recordPayment({
      customerId,
      receiptId: `PT-EDIT4-${suffix}`,
      payments: [{ tripId: tripA, amount: 4_000_000 }],
    });
    const [row] = await paymentRows(customerId);

    // Collectible after backing out this entry's 4M: 11M + 4M = 15M ceiling —
    // editing to the full revenue is paying in full, which is legal; 16M must
    // fail and name the ceiling.
    await assert.rejects(
      updatePaymentEntry(row.id, {
        amount: 16_000_000,
        receiptId: `PT-EDIT4-${suffix}`,
        receivedDate: today,
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422
        && error.message.includes('Tổng còn có thể thu: 15.000.000 ₫'),
    );
    // The exact ceiling passes and settles the customer in full.
    const updated = await updatePaymentEntry(row.id, {
      amount: 15_000_000,
      receiptId: `PT-EDIT4-${suffix}`,
      receivedDate: today,
    });
    assert.equal(updated.newBalance, 0);
  });

  test('a future received date is rejected on edit too', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    // "Tomorrow in Vietnam" regardless of run hour (see payment-received-date.test.ts).
    const future = new Date(Date.now() + 7 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await recordPayment({
      customerId,
      receiptId: `PT-EDIT5-${suffix}`,
      payments: [{ tripId: tripA, amount: 1_000_000 }],
    });
    const [row] = await paymentRows(customerId);

    await assert.rejects(
      updatePaymentEntry(row.id, {
        amount: 1_000_000,
        receiptId: `PT-EDIT5-${suffix}`,
        receivedDate: future,
      }),
      (error: unknown) =>
        error instanceof Error
        && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422
        && error.message.includes('Ngày nhận không được lớn hơn ngày hôm nay'),
    );
  });

  test('editing a missing entry 404s; non-payment rows are not editable', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);
    const today = new Date().toISOString().slice(0, 10);

    await assert.rejects(
      updatePaymentEntry(999_999_999, { amount: 1_000, receiptId: 'PT-X', receivedDate: today }),
      (error: unknown) =>
        error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404,
    );

    const [revenueRow] = await db.select().from(s.ledger)
      .where(and(
        eq(s.ledger.entityType, 'CUSTOMER'),
        eq(s.ledger.entityId, customerId),
        eq(s.ledger.txnType, TxnType.TRIP_REVENUE),
        eq(s.ledger.txnId, tripA),
      ))
      .limit(1);
    assert.ok(revenueRow, 'seeded revenue row exists');
    await assert.rejects(
      updatePaymentEntry(revenueRow.id, { amount: 1_000, receiptId: 'PT-X', receivedDate: today }),
      (error: unknown) =>
        error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422,
    );
  });
});
