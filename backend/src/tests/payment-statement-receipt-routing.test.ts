/**
 * NEPO-60 — the sổ chi tiết's receipted payment rows must NEVER route a
 * request the payment endpoints reject with 'ID bản ghi thanh toán không
 * hợp lệ'. The frontend router (paymentActionUrl) decides per-row between
 * the by-receipt endpoints and the per-entry ones from exactly two wire
 * fields: the display id and receiptId. This suite pins the wire contract
 * both decisions rest on:
 *
 * 1. getStatementData() output — every PAYMENT_RECEIVED display row carries
 *    a non-empty receiptId, and rows with synthetic display ids (id ≤ 0)
 *    are always receipted. The sổ rows for HTX CHÈ NÀ TÂN's receipt 9399
 *    (17.724.000₫ FIFO-split + surplus) are the reported shape.
 * 2. The accountant's edit of receipt 9399 — the whole journey: render the
 *    split book, save the corrected total 1.772.400₫ (biên lai 9399, ngày
 *    nhận 05/10/2026, TK 1121), re-render, and edit AGAIN — every step's
 *    rows stay receipted, so every derived PUT targets by-receipt and saves.
 *
 * A pipeline refactor that drops receiptId from a synthetic row (the exact
 * 'mất receiptId trong đường dẫn giữa' suspicion on the ticket) turns these
 * red before an accountant can see the 400.
 *
 * Integration-tier: needs the local dev Postgres (docker, :5440) — the
 * statement rendering, the collapse and the balance recompute are the
 * behavior under test.
 */
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { getStatementData } from '../services/statement.service';
import type { EnrichedLedgerRow } from '../services/ledger-visibility';
import { recordPayment, updatePaymentReceipt } from '../services/financial.service';
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
  if (createdTripIds.length > 0) await db.delete(s.trips).where(inArray(s.trips.id, createdTripIds));
  if (createdRouteIds.length > 0) await db.delete(s.routes).where(inArray(s.routes.id, createdRouteIds));
  if (createdCargoTypeIds.length > 0) await db.delete(s.cargoTypes).where(inArray(s.cargoTypes.id, createdCargoTypeIds));
  if (createdCustomerIds.length > 0) await db.delete(s.customers).where(inArray(s.customers.id, createdCustomerIds));
  await client.end();
});

const trackers = {
  customerIds: createdCustomerIds,
  tripIds: createdTripIds,
  routeIds: createdRouteIds,
  cargoTypeIds: createdCargoTypeIds,
};

/**
 * The frontend router's decision, mirrored from
 * frontend/src/features/debt/paymentGroupActions.ts paymentActionUrl():
 * receipted rows go to by-receipt, everything else to /payments/:id. These
 * two named invariants (3+ lockstep uses below) are the wire contract the
 * Sửa/Xóa decisions rest on — any row failing them is the doomed URL the
 * payment guards reject with 'ID bản ghi thanh toán không hợp lệ'.
 */
const routesByReceipt = (row: EnrichedLedgerRow): boolean =>
  row.receiptId != null && row.receiptId !== '';

const hasDoomedPerEntryUrl = (row: EnrichedLedgerRow): boolean =>
  !routesByReceipt(row) && row.id <= 0;

describe('NEPO-60 — statement wire keeps receipted rows routable', () => {
  test('rendered receipt rows stay receipted through edit → collapse → re-render → re-edit', async () => {
    const suffix = testSuffix();
    const { customerId, tripA, tripB } = await seedCustomerWithDebt(suffix, trackers);

    // Receipt 9399, the accountant's shape: 17.724.000₫ on 04/10 against a
    // 15M book → FIFO posts trip slices + one surplus (trả trước) slice.
    await recordPayment({
      paymentMethod: 'BANK',
      customerId,
      receiptId: '9399',
      payments: [
        { tripId: tripA, amount: 10_000_000 },
        { tripId: tripB, amount: 7_724_000 },
      ],
      receivedDate: '2026-10-04',
    });
    const posted = await paymentRows(customerId);
    assert.equal(posted.length, 3, 'trip slices + surplus slice share the receipt');
    assert.ok(posted.every((r) => r.receiptId === '9399'), 'every slice carries the biên lai');

    // ── Wire contract: the sổ rows the accountant's Sửa routes on ──
    const splitBook = await getStatementData(customerId);
    assert.ok(splitBook);
    const splitPaymentRows = splitBook.ledgerRows.filter((r) => r.txnType === TxnType.PAYMENT_RECEIVED);
    assert.ok(splitPaymentRows.length >= 3);
    assert.ok(
      splitPaymentRows.every((r) => !hasDoomedPerEntryUrl(r)),
      `every rendered payment row is receipted or carries a real entry id: ${JSON.stringify(splitPaymentRows.map((r) => ({ id: r.id, receiptId: r.receiptId })))}`,
    );
    assert.ok(
      splitPaymentRows.filter((r) => r.id <= 0).every((r) => routesByReceipt(r)),
      'synthetic display rows are always receipted',
    );

    // ── The accountant's edit: 1.772.400₫, 05/10/2026, TK 1121 ──
    const updated = await updatePaymentReceipt(customerId, '9399', {
      amount: 1_772_400,
      receiptId: '9399',
      receivedDate: '2026-10-05',
      paymentMethod: 'BANK',
    });
    assert.equal(updated.amount, 1_772_400);
    assert.equal(updated.collapsedCount, 2, 'the split collapses onto one slice');
    assert.equal((await paymentRows(customerId)).length, 1, 'the receipt sits as ONE slice after the edit');

    // ── Re-render + edit AGAIN: the post-collapse book stays routable ──
    const collapsedBook = await getStatementData(customerId);
    assert.ok(collapsedBook);
    const collapsedPaymentRows = collapsedBook.ledgerRows.filter((r) => r.txnType === TxnType.PAYMENT_RECEIVED);
    assert.equal(collapsedPaymentRows.length, 1);
    const renderRow = collapsedPaymentRows[0];
    assert.ok(routesByReceipt(renderRow), 'the collapsed receipt row still carries the biên lai');
    assert.ok(!hasDoomedPerEntryUrl(renderRow));
    assert.equal(renderRow.credit, '1772400', 'the sổ shows the corrected total');

    const again = await updatePaymentReceipt(customerId, '9399', {
      amount: 1_000_000,
      receiptId: '9399',
      receivedDate: '2026-10-05',
      paymentMethod: 'BANK',
    });
    assert.equal(again.amount, 1_000_000, 'the second edit (lần 2) saves too');
    assert.equal(again.collapsedCount, 0, 'nothing left to collapse');
  });
});
