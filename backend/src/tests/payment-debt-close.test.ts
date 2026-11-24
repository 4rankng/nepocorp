/**
 * NEPO-63 Chốt công nợ — close/reopen a customer's receivable book.
 *
 * Customer story: kế toán closes the books for a customer (POST
 * /finance/customers/:id/close-debt). Afterwards money writes dated BEFORE
 * the close day are refused — backdated payment intake, delete of a recorded
 * payment inside the closed range — while entries on/after the close day
 * keep flowing. Mở chốt lifts the freeze.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) — the guard
 * reads customers.debt_closed_until inside the payment transaction.
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  closeCustomerDebt,
  deletePaymentEntry,
  recordPayment,
  reopenCustomerDebt,
} from '../services/financial.service';
import { ApiError } from '../errors';
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

describe('NEPO-63 chốt công nợ — receivable book close guards', () => {
  test('close persists the freeze day; future days are refused', async () => {
    const { customerId } = await seedCustomerWithDebt(`dclose-${testSuffix()}`, trackers);
    const closed = await closeCustomerDebt(customerId, '2026-11-01', 'chốt kỳ 10');
    assert.equal(closed.debtClosedUntil, '2026-11-01');
    const [row] = await db.select({ closed: s.customers.debtClosedUntil })
      .from(s.customers).where(eq(s.customers.id, customerId));
    assert.equal(row?.closed, '2026-11-01');

    await assert.rejects(
      () => closeCustomerDebt(customerId, '2099-01-01'),
      (err: ApiError) => err.statusCode === 422,
    );
  });

  test('backdated intake and pre-close deletes are refused while closed; today flows', async () => {
    const { customerId } = await seedCustomerWithDebt(`dguard-${testSuffix()}`, trackers);

    // A recorded payment INSIDE the future closed range.
    await recordPayment({
      customerId,
      receiptId: `DC-GUARD-${testSuffix()}`,
      payments: [{ tripId: 0, amount: 2_000_000 }],
      receivedDate: '2026-10-15',
      paymentMethod: 'BANK',
    });
    const before = await paymentRows(customerId);
    assert.equal(before.length, 1);

    await closeCustomerDebt(customerId, '2026-11-01');

    // Backdated intake into the closed range → 409.
    await assert.rejects(
      () => recordPayment({
        customerId,
        receiptId: `DC-BACK-${testSuffix()}`,
        payments: [{ tripId: 0, amount: 1_000_000 }],
        receivedDate: '2026-10-20',
        paymentMethod: 'BANK',
      }),
      (err: ApiError) => err.statusCode === 409 && /chốt/.test(err.message),
    );

    // Deleting the pre-close payment → 409.
    await assert.rejects(
      () => deletePaymentEntry(before[0]!.id),
      (err: ApiError) => err.statusCode === 409,
    );

    // An intake dated after the close day still flows.
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await recordPayment({
      customerId,
      receiptId: `DC-TODAY-${testSuffix()}`,
      payments: [{ tripId: 0, amount: 1_000_000 }],
      receivedDate: today,
      paymentMethod: 'BANK',
    });
    assert.equal((await paymentRows(customerId)).length, 2);

    // Mở chốt lifts the freeze: the same backdated intake now posts, and the
    // pre-close entry is deletable again.
    await reopenCustomerDebt(customerId);
    await recordPayment({
      customerId,
      receiptId: `DC-REOPEN-${testSuffix()}`,
      payments: [{ tripId: 0, amount: 500_000 }],
      receivedDate: '2026-10-20',
      paymentMethod: 'BANK',
    });
    const reopened = await paymentRows(customerId);
    assert.equal(reopened.length, 3);
    await deletePaymentEntry(reopened[0]!.id);
    assert.equal((await paymentRows(customerId)).length, 2);
  });
});
