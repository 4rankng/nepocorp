/**
 * Payment-entry deletion + balance recompute (kanban 141026163920).
 *
 * Customer story: a duplicated payment had no removal path. These tests pin
 * the delete contract: deletePaymentEntry() removes a PAYMENT_RECEIVED row
 * only (404 for missing, 422 for non-payment rows), and the customer's
 * running balance — including the balance column of rows behind the deleted
 * one — is rebuilt in id order.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) because the
 * advisory lock, the ledger DELETE and the recompute UPDATE are the behavior
 * under test.
 */
import assert from 'node:assert/strict';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { deletePaymentEntry, recordPayment } from '../services/financial.service';
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

describe('payment entry deletion + balance recompute (kanban 141026163920)', () => {
  test('deleting a payment removes the row and rebuilds the running balance of later rows', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);

    // Payment 1: 4M on trip A. Payment 2: 5M total — the client split says
    // 2M(A) + 3M(B), but allocation is server-authoritative FIFO (NITODA
    // incident): A still has 6M collectible, so all 5M lands on A as ONE row.
    await recordPayment({
      customerId,
      receiptId: `PT-DEL1-${suffix}`,
      payments: [{ tripId: tripA, amount: 4_000_000 }],
    });
    await recordPayment({
      customerId,
      receiptId: `PT-DEL2-${suffix}`,
      payments: [
        { tripId: tripA, amount: 2_000_000 },
        { tripId: tripB, amount: 3_000_000 },
      ],
    });
    // 15M revenue − 9M paid = 6M outstanding.
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 6_000_000);

    const rowsBefore = await paymentRows(customerId);
    assert.equal(rowsBefore.length, 2);
    const firstPaymentRowId = rowsBefore[0].id; // the 4M entry

    // Delete the 4M payment (the duplicate the customer complained about).
    const deleted = await deletePaymentEntry(firstPaymentRowId);
    assert.equal(deleted.amount, 4_000_000);
    assert.equal(deleted.receiptId, `PT-DEL1-${suffix}`);
    assert.equal(deleted.customerId, customerId);
    assert.equal(deleted.newBalance, 10_000_000, '15M revenue − 5M remaining paid');

    // Row is gone; exactly the one row of payment 2 remains.
    const rowsAfter = await paymentRows(customerId);
    assert.equal(rowsAfter.length, 1);
    assert.ok(!rowsAfter.some((r) => r.id === firstPaymentRowId));

    // The FULL ledger for this customer must carry a coherent running balance
    // in id order (this is what getBalance + the statement tab read).
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
    assert.equal(expected, 10_000_000);
    assert.equal(await LedgerService.getBalance('CUSTOMER', customerId), 10_000_000);
  });

  test('deleting a missing entry 404s', async () => {
    await assert.rejects(
      deletePaymentEntry(999_999_999),
      (error: unknown) =>
        error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404,
    );
  });

  test('non-payment ledger rows are not deletable through the payment endpoint', async () => {
    const suffix = testSuffix();
    const { customerId, tripA } = await seedCustomerWithDebt(suffix, trackers);

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
      deletePaymentEntry(revenueRow.id),
      (error: unknown) =>
        error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 422,
    );
    // Untouched — the revenue row is still there.
    const [stillThere] = await db.select().from(s.ledger)
      .where(eq(s.ledger.id, revenueRow.id));
    assert.ok(stillThere);
  });
});
