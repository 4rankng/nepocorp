/**
 * Cover for the VISIBLE ledger derivation (NEPO-43/44/50 pairing + NEPO-48
 * owner decision): every UNLOCK_REVERSAL '(Hoàn tác)' row leaves the
 * statement on every surface — paired or not — and pairing happens strictly
 * INSIDE a source family (entity | ledger | txn_id): the original each
 * reversal mirrors (mirrored amount debit↔credit, oldest first) leaves with
 * it; a re-post block that re-states exactly the mirrored amount is
 * presentation noise and drops around the standing booking (NEPO-48 wave 4 —
 * the booking keeps its original posting date), while a block with different
 * amounts re-states for real (mirror out, re-posts in). Families never
 * cross: TRIP_REVENUE, EXTERNAL_CARRIER_COST, DRIVER_SALARY, fuel/
 * VENDOR_EXPENSE, FORWARDER_ADVANCE alike; chi-hộ rows pair inside a `fee:`
 * namespace so trip_expenses ids never cross-pair a same-numbered trip's
 * rows; the txn_id is part of the key so a reversal can never consume a
 * same-amount stranger. Unpaired originals and non-reversal rows (payments,
 * penalties, odd-sign revenue) stay. Dropping a lone reversal changes the
 * net by design — callers must derive balances/totals/aging from the
 * returned set, never from the raw rows.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reattributePaymentRows } from '../services/statement.service';
import { visibleLedgerRows, isOrphanChiHoRow, type EnrichedLedgerRow } from '../services/ledger-visibility';
import { TxnType } from '@tingting/shared';

let nextRowId = 1;

const row = (over: Partial<EnrichedLedgerRow> & Pick<EnrichedLedgerRow, 'txnType'>): EnrichedLedgerRow => ({
  id: nextRowId++,
  timestamp: new Date('2026-10-08T07:24:17.897Z'),
  txnId: 296,
  txnTable: null,
  receiptId: null,
  entityType: 'CUSTOMER',
  entityId: 7,
  debit: '0',
  credit: '0',
  balance: '0',
  note: null,
  createdAt: new Date('2026-10-08T07:24:17.897Z'),
  ...over,
  paymentMethod: over.paymentMethod ?? null,
});

const revenue = (over: Partial<EnrichedLedgerRow> = {}) => row({
  txnType: TxnType.TRIP_REVENUE,
  debit: '6480000',
  note: 'Doanh thu chuyến TRP-202609-0020',
  ...over,
});

const reversal = (over: Partial<EnrichedLedgerRow> = {}) => row({
  txnType: TxnType.UNLOCK_REVERSAL,
  credit: '6480000',
  note: 'Doanh thu chuyến TRP-202609-0020 (Hoàn tác)',
  ...over,
});

const net = (rows: EnrichedLedgerRow[]) => rows.reduce((sum, r) => sum + Number(r.debit) - Number(r.credit), 0);

describe('visibleLedgerRows', () => {
  it('hides a same-instant same-amount pair and keeps the net', () => {
    const rows = [revenue(), reversal()];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 0);
    assert.equal(net(rows), 0);
  });

  it('drops a lone UNLOCK_REVERSAL even with no mirrored original anywhere (NEPO-48)', () => {
    const rows = [reversal()];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 0, 'the owner decision: reversal rows never render, unpaired included');
  });

  it('hides an old-amount correction pair across instants and leaves the new charge only', () => {
    const rows = [
      revenue(),
      reversal({ timestamp: new Date('2026-10-09T08:00:00.000Z') }),
      revenue({ timestamp: new Date('2026-10-09T08:00:00.000Z'), debit: '7000000', credit: '0' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(Number(collapsed[0].debit), 7000000, 'the re-posted (current) amount survives');
    assert.equal(net(rows), net(collapsed), 'running net preserved');
  });

  it('drops the lone reversal and keeps the unpaired original when amounts differ', () => {
    const rows = [revenue({ debit: '7000000' }), reversal()];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.TRIP_REVENUE, 'the real charge stays');
    assert.equal(net(rows) - net(collapsed), -6480000, 'only the reversal amount left the book');
  });

  it('drops the lone reversal and keeps the original when txnIds differ', () => {
    const rows = [revenue({ txnId: 297 }), reversal({ txnId: 296 })];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.TRIP_REVENUE);
  });

  it('drops only UNLOCK_REVERSAL rows — payments, penalties, odd-sign revenue untouched', () => {
    const rows = [
      row({ txnType: TxnType.PAYMENT_RECEIVED, credit: '6480000' }),
      row({ txnType: TxnType.PENALTY, debit: '500000' }),
      row({ txnType: TxnType.TRIP_REVENUE, credit: '6480000' }), // odd sign, not a matchable debit
      reversal({ txnType: TxnType.UNLOCK_REVERSAL }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 3, 'the lone reversal drops; payments/penalties/odd-sign revenue stay');
    assert.ok(!collapsed.some((r) => r.txnType === TxnType.UNLOCK_REVERSAL));
  });

  it('matches 1:1 — one reversal absorbs one original; every reversal row drops regardless', () => {
    const instant = new Date('2026-10-08T07:24:17.897Z');
    const rows = [revenue({ timestamp: instant }), reversal({ timestamp: instant }), reversal({ timestamp: instant })];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 0, 'both reversal rows drop; the absorbed original drops with the first');
  });

  it('is order-independent within the same instant', () => {
    const instant = new Date('2026-10-08T07:24:17.897Z');
    // Creation order fixes the ids (original before its reversal — the ledger
    // is append-only); array order must not change the derivation.
    const charge = revenue({ timestamp: instant });
    const rec = reversal({ timestamp: instant });
    assert.equal(visibleLedgerRows([rec, charge]).length, 0);
    assert.equal(visibleLedgerRows([charge, rec]).length, 0);
  });

  it('collapses multiple legacy pairs and preserves the running net', () => {
    const rows = [
      revenue({ txnId: 296, debit: '6480000', timestamp: new Date('2026-10-08T07:22:26.273Z') }),
      reversal({ txnId: 296, timestamp: new Date('2026-10-08T07:22:26.273Z') }),
      revenue({ txnId: 296, timestamp: new Date('2026-10-08T07:24:17.897Z') }),
      reversal({ txnId: 296, timestamp: new Date('2026-10-08T07:24:17.897Z') }),
      revenue({ txnId: 296, timestamp: new Date('2026-10-08T07:35:29.237Z') }),
      reversal({ txnId: 296, timestamp: new Date('2026-10-08T07:35:29.237Z') }),
      row({ txnType: TxnType.PAYMENT_RECEIVED, credit: '10000000' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.PAYMENT_RECEIVED);
    assert.equal(net(rows), net(collapsed));
  });

  it('returns the same array when nothing matches (no allocation churn)', () => {
    const rows = [revenue(), revenue({ txnId: 297 })];
    assert.equal(visibleLedgerRows(rows), rows);
  });

  // ── generalized pairing — every entity the lock posts to ──

  const carrierCost = (over: Partial<EnrichedLedgerRow> = {}) => row({
    entityType: 'CARRIER',
    entityId: 7,
    txnType: TxnType.EXTERNAL_CARRIER_COST,
    credit: '9288000',
    note: 'Cước thuê ngoài chuyến TRP-202609-0053',
    ...over,
  });

  const carrierReversal = (over: Partial<EnrichedLedgerRow> = {}) => row({
    entityType: 'CARRIER',
    entityId: 7,
    txnType: TxnType.UNLOCK_REVERSAL,
    debit: '9288000',
    note: 'Cước thuê ngoài chuyến TRP-202609-0053 (Hoàn tác)',
    ...over,
  });

  it('collapses an EXTERNAL_CARRIER_COST churn pair (payable-statement noise)', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [carrierCost({ timestamp: instant }), carrierReversal({ timestamp: instant })];
    assert.equal(visibleLedgerRows(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('keeps the standing cost and hides the churn — prod carrier 21/9 shape (cước lặp 3 lần)', () => {
    const rows = [
      carrierCost({ timestamp: new Date('2026-09-21T10:35:22.000Z') }),
      carrierReversal({ timestamp: new Date('2026-09-21T10:36:10.000Z') }),
      carrierCost({ timestamp: new Date('2026-09-21T10:36:10.000Z') }),
      carrierReversal({ timestamp: new Date('2026-09-21T10:36:22.000Z') }),
      carrierCost({ timestamp: new Date('2026-09-21T10:36:22.000Z') }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.EXTERNAL_CARRIER_COST);
    // NEPO-48 wave 4 — identical re-statements are invisible: the cycle drops
    // around the standing booking, which keeps its original posting date (the
    // accountants never booked the unlock). Same amount either way.
    assert.equal(collapsed[0].id, rows[0].id);
    assert.equal(net(rows), net(collapsed), 'running net preserved');
  });

  it('collapses a DRIVER_SALARY churn pair', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      row({ entityType: 'DRIVER', entityId: 5, txnType: TxnType.DRIVER_SALARY, credit: '4500000', timestamp: instant }),
      row({ entityType: 'DRIVER', entityId: 5, txnType: TxnType.UNLOCK_REVERSAL, debit: '4500000', timestamp: instant }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('collapses a VENDOR fuel-allocation churn pair', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      row({ entityType: 'VENDOR', entityId: 3, txnType: TxnType.FUEL_EXPENSE, credit: '1620000', timestamp: instant }),
      row({ entityType: 'VENDOR', entityId: 3, txnType: TxnType.UNLOCK_REVERSAL, debit: '1620000', timestamp: instant }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('collapses a FORWARDER_ADVANCE churn pair', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      row({ entityType: 'FORWARDER', entityId: 6, txnType: TxnType.FORWARDER_ADVANCE, credit: '50000000', timestamp: instant }),
      row({ entityType: 'FORWARDER', entityId: 6, txnType: TxnType.UNLOCK_REVERSAL, debit: '50000000', timestamp: instant }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('hides a carrier charge undone later with no re-post — net 0 leaves nothing to display', () => {
    const rows = [carrierCost(), carrierReversal({ timestamp: new Date('2026-09-22T08:00:00.000Z') })];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 0);
    assert.equal(net(rows), net(collapsed), 'running net preserved');
  });

  // ── any-instant pairing + chi-hộ fee namespace ──

  const chiHoFee = (over: Partial<EnrichedLedgerRow> = {}) => row({
    txnType: TxnType.SERVICE_FEE,
    txnId: 222,
    debit: '1782000',
    note: 'Phí chi hộ chuyến TRP-202607-0002',
    ...over,
  });

  const chiHoReversal = (over: Partial<EnrichedLedgerRow> = {}) => row({
    txnType: TxnType.UNLOCK_REVERSAL,
    txnId: 222,
    credit: '1782000',
    note: 'Phí chi hộ chuyến TRP-202607-0002 (Hoàn tác)',
    ...over,
  });

  it('hides a chi-hộ fee pair across instants and keeps the re-posted charge', () => {
    const rows = [
      chiHoFee({ timestamp: new Date('2026-07-29T10:18:54.000Z') }),
      chiHoReversal({ timestamp: new Date('2026-08-12T03:42:14.000Z') }),
      chiHoFee({ timestamp: new Date('2026-08-12T03:42:14.000Z') }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.SERVICE_FEE);
    assert.equal(net(rows), net(collapsed), 'running net preserved');
  });

  it('never cross-pairs the fee and trip id namespaces (fee: key prefix)', () => {
    const rows = [
      chiHoFee(),
      reversal({ txnId: 222, credit: '1782000', note: 'Doanh thu chuyến TRP-202608-0030 (Hoàn tác)' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1, 'the trip-222 revenue reversal cannot consume the fee-222 charge; it drops alone');
    assert.equal(collapsed[0].txnType, TxnType.SERVICE_FEE, 'the live fee charge survives');
  });

  it('never cross-pairs ledgers: same txnId/amount/instant on a different entityType stays', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      carrierCost({ timestamp: instant }),
      carrierReversal({ entityType: 'CUSTOMER', entityId: 7, timestamp: instant }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1, 'the cross-ledger reversal drops alone; the cost row stays');
    assert.equal(collapsed[0].txnType, TxnType.EXTERNAL_CARRIER_COST);
  });

  it('pairs each row at most once, oldest-first, when identical pairs repeat at one instant', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      carrierCost({ timestamp: instant }),
      carrierCost({ timestamp: instant }),
      carrierReversal({ timestamp: instant }),
      carrierReversal({ timestamp: instant }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('mixed book: paired original + lone reversal + payment → only the payment renders', () => {
    // The demo TRP-202607-0044 shape (NEPO-48): chi-hộ reversals with no
    // mirrored original on this book sat next to real rows and skewed the
    // totals. The visible ledger is exactly the rows a book should show.
    const rows = [
      row({ txnType: TxnType.SERVICE_FEE, txnId: 11, debit: '1404000', note: 'Phí chi hộ TRP-202607-0044' }),
      row({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 11, credit: '1404000', note: 'Phí chi hộ TRP-202607-0044 (Hoàn tác)' }),
      row({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 12, credit: '250000', note: 'Phí chi hộ TRP-202607-0044 (Hoàn tác)' }),
      row({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 13, credit: '1188000', note: 'Phí chi hộ TRP-202607-0044 (Hoàn tác)' }),
      row({ txnType: TxnType.PAYMENT_RECEIVED, credit: '90978520', receiptId: 'PT-9214' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.deepEqual(collapsed.map((r) => r.txnType), [TxnType.PAYMENT_RECEIVED]);
    assert.equal(net(rows) - net(collapsed), -250000 - 1188000, 'only the lone reversal credits left the book');
  });
});

describe('duplicate posting collapse (NEPO-48 QA wave 3)', () => {
  const july = (day: string) => new Date(`2026-07-${day}T04:55:00.000Z`);
  const chiHoCharge = (over: Partial<EnrichedLedgerRow> = {}) => row({
    txnType: TxnType.SERVICE_FEE,
    txnTable: 'trip_expenses',
    entityId: 11,
    debit: '1404000',
    note: 'Phí chi hộ TRP-202607-0044',
    ...over,
  });

  it('shows a twice-posted revenue once — the newest posting survives', () => {
    const rows = [
      revenue({ txnId: 125, entityId: 11, debit: '7728000', timestamp: july('17') }),
      revenue({ txnId: 125, entityId: 11, debit: '7728000', timestamp: july('18') }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].id, rows[1].id);
    assert.equal(net(collapsed), 7728000);
  });

  it('collapses re-priced revenue generations to the newest amount (QA: 13tr + 10tr)', () => {
    const rows = [
      revenue({ txnId: 370, entityId: 20, debit: '13000000', timestamp: july('06') }),
      revenue({ txnId: 370, entityId: 20, debit: '10000000', timestamp: july('07') }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(Number(collapsed[0].debit), 10000000, 'the newest posting is the current trips.revenue');
  });

  it('never merges revenues of different trips, customers, or posting sides', () => {
    const rows = [
      revenue({ txnId: 125, entityId: 11, timestamp: july('17') }),
      revenue({ txnId: 154, entityId: 11, timestamp: july('17') }),
      revenue({ txnId: 125, entityId: 20, timestamp: july('17') }),
      revenue({ txnId: 126, entityId: 11, credit: '500000', timestamp: july('17') }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 4);
  });

  it('collapses an exact double-posted chi hộ charge (same fee, same amount)', () => {
    const rows = [
      chiHoCharge({ txnId: 378, timestamp: july('29') }),
      chiHoCharge({ txnId: 378, timestamp: new Date('2026-08-10T04:40:00.000Z') }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].id, rows[1].id, 'the re-posted charge renders once');
  });

  it('keeps a same-fee chi hộ pair whose amounts differ (owner rule keys on amount)', () => {
    const rows = [
      chiHoCharge({ txnId: 378 }),
      chiHoCharge({ txnId: 378, debit: '1500000', timestamp: new Date('2026-08-10T04:40:00.000Z') }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 2);
  });

  it('keeps distinct same-trip adjustments (different amounts)', () => {
    const rows = [
      row({ txnType: TxnType.ADJUSTMENT, txnTable: 'trips', txnId: 5, entityId: 11, debit: '3000000' }),
      row({ txnType: TxnType.ADJUSTMENT, txnTable: 'trips', txnId: 5, entityId: 11, debit: '2000000' }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 2);
  });

  it('never collapses payments — two identical receipts are two bank lines', () => {
    const rows = [
      row({ txnType: TxnType.PAYMENT_RECEIVED, txnId: 125, entityId: 11, credit: '28200000', receiptId: 'PT-1' }),
      row({ txnType: TxnType.PAYMENT_RECEIVED, txnId: 125, entityId: 11, credit: '28200000', receiptId: 'PT-2' }),
    ];
    assert.equal(visibleLedgerRows(rows).length, 2);
  });

  it('a reversal-explained generation nets out around the standing original (wave 4)', () => {
    const rows = [
      revenue({ txnId: 125, entityId: 11, debit: '7728000', timestamp: july('17') }),
      row({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 125, entityId: 11, credit: '7728000', timestamp: july('17') }),
      revenue({ txnId: 125, entityId: 11, debit: '7728000', timestamp: july('18') }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    // The re-post re-states exactly what the reversal undid — the cycle is
    // invisible and the accountant's original booking stands (NEPO-48 wave 4).
    assert.equal(collapsed[0].id, rows[0].id);
  });
});

describe('NEPO-48 wave 4 — source-family pairing (demo TRP-202607-0044 shapes)', () => {
  const aug10 = new Date('2026-08-10T04:40:00.000Z');
  const jul29 = new Date('2026-07-29T10:09:00.000Z');
  // Demo ground truth: the 29/7 'Điều chỉnh phí chi hộ' originals (fees 378 /
  // 380 / 377) and the 10/8 unlock cycle — reversal credit + re-post debit per
  // fee, same amounts, same instant.
  const stamped = (over: Partial<EnrichedLedgerRow> = {}) => row({
    txnTable: 'trip_expenses', txnType: TxnType.SERVICE_FEE, entityId: 11, ...over,
  });

  it('the 0044 chi-hộ unlock cycle vanishes around its 29/7 originals — zero 10/8 rows', () => {
    const rows = [
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 378, debit: '1404000', timestamp: jul29 }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 380, debit: '250000', timestamp: jul29 }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 377, debit: '1188000', timestamp: jul29 }),
      stamped({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 378, credit: '1404000', timestamp: aug10 }),
      stamped({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 380, credit: '250000', timestamp: aug10 }),
      stamped({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 377, credit: '1188000', timestamp: aug10 }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 378, debit: '1404000', timestamp: aug10 }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 380, debit: '250000', timestamp: aug10 }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 377, debit: '1188000', timestamp: aug10 }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.deepEqual(collapsed.map((r) => [r.txnId, Number(r.debit)]), [
      [378, 1404000], [380, 250000], [377, 1188000],
    ], 'the 29/7 originals stand; reversals and 10/8 re-posts all leave');
    assert.ok(collapsed.every((r) => r.timestamp === jul29), 'no 10/8-dated row renders');
    assert.equal(net(rows), net(collapsed), 'the cycle is net-0 noise');
  });

  it('a reversal never consumes another trip or fee family — the same-amount strangers stay', () => {
    // Demo shapes: trip 125's reversal ate trip 102's original; trip 377's
    // reversal ate fee 382's charge; both were cross-family eats.
    const rows = [
      stamped({ txnTable: 'trips', txnType: TxnType.TRIP_REVENUE, txnId: 91, debit: '7728000' }),
      stamped({ txnTable: 'trips', txnType: TxnType.TRIP_REVENUE, txnId: 102, debit: '7728000' }),
      stamped({ txnTable: 'trips', txnType: TxnType.UNLOCK_REVERSAL, txnId: 125, credit: '7728000' }),
      stamped({ txnTable: 'trips', txnType: TxnType.TRIP_REVENUE, txnId: 125, debit: '7728000' }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 382, debit: '1188000', timestamp: jul29 }),
      stamped({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 377, credit: '1188000' }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 377, debit: '1188000' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.deepEqual(collapsed.map((r) => [r.txnTable, r.txnType, r.txnId]), [
      ['trips', TxnType.TRIP_REVENUE, 91],
      ['trips', TxnType.TRIP_REVENUE, 102],
      ['trips', TxnType.TRIP_REVENUE, 125],
      ['trip_expenses', TxnType.SERVICE_FEE, 382],
      ['trip_expenses', TxnType.SERVICE_FEE, 377],
    ], 'trip 102 and fee 382 survive; trips 91/125 and fee 377 keep their standing originals');
    assert.equal(collapsed.length, 5);
  });

  it('a reversal whose original lives on another book drops alone — its re-post is the charge', () => {
    // Thanh Thịnh October: TRP-202610-0056's chi-hộ original was posted on the
    // previous customer's ledger; this book holds only reversal + re-post.
    const rows = [
      stamped({ txnType: TxnType.UNLOCK_REVERSAL, txnId: 957, credit: '3391200' }),
      stamped({ txnType: TxnType.SERVICE_FEE, txnId: 957, debit: '3391200' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.deepEqual(collapsed.map((r) => r.txnType), [TxnType.SERVICE_FEE], 'the re-post carries the charge');
    assert.equal(net(collapsed) - net(rows), 3391200, 'the net moves by the dropped lone reversal credit');
  });

  it('a cycle that changes the amount re-states — the new value stands', () => {
    const rows = [
      stamped({ txnTable: 'trips', txnType: TxnType.TRIP_REVENUE, txnId: 161, debit: '7074000' }),
      stamped({ txnTable: 'trips', txnType: TxnType.UNLOCK_REVERSAL, txnId: 161, credit: '7074000' }),
      stamped({ txnTable: 'trips', txnType: TxnType.TRIP_REVENUE, txnId: 161, debit: '7674000' }),
    ];
    const collapsed = visibleLedgerRows(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(Number(collapsed[0].debit), 7674000, 'the corrected trips.revenue');
    assert.equal(net(rows), net(collapsed), 'running net preserved');
  });

  it('re-derives a receipt split FIFO over the voucher-day book — the reversed trip gets nothing', () => {
    // Receipt 9214 was stored split across the gross book (28.200.000₫ into
    // TRP-202607-0044). The display split re-derives on the visible book.
    const tripRevenue = (tripId: number, day: string, debit: string) => row({
      txnTable: 'trips', txnType: TxnType.TRIP_REVENUE, txnId: tripId, tripId,
      debit, timestamp: new Date(`${day}T00:00:00.000Z`),
    });
    const rows = [
      tripRevenue(91, '2026-06-29', '11152000'),
      tripRevenue(80, '2026-06-24', '11072200'),
      tripRevenue(102, '2026-07-02', '7728000'),
      tripRevenue(138, '2026-07-17', '6750000'),
      row({ txnTable: 'trips', txnType: TxnType.PAYMENT_RECEIVED, txnId: 91, receiptId: '9214', credit: '15000000', timestamp: new Date('2026-07-18T04:40:00.000Z'), tripId: 91, tripCode: 'TRP-202606-0088' }),
      row({ txnTable: 'trips', txnType: TxnType.PAYMENT_RECEIVED, txnId: 138, receiptId: '9214', credit: '18022400', timestamp: new Date('2026-07-18T04:40:00.000Z'), tripId: 138, tripCode: 'TRP-202607-0044' }),
    ];
    const dayOf = (r: EnrichedLedgerRow) =>
      r.txnType === TxnType.PAYMENT_RECEIVED
        ? '2026-07-18'
        : new Date(r.timestamp).toISOString().slice(0, 10);
    const attributed = reattributePaymentRows(rows, dayOf, new Map([
      [91, { tripCode: 'TRP-202606-0088', routeName: null }],
      [80, { tripCode: 'TRP-202606-0077', routeName: null }],
      [102, { tripCode: 'TRP-202607-0008', routeName: null }],
      [138, { tripCode: 'TRP-202607-0044', routeName: null }],
    ]));
    const payments = attributed.filter((r) => r.txnType === TxnType.PAYMENT_RECEIVED);
    const total = payments.reduce((sum, r) => sum + Number(r.credit), 0);
    assert.equal(total, 33022400, 'the receipt total never moves');
    const byTrip = new Map(payments.map((r) => [r.txnId, Number(r.credit)]));
    assert.equal(byTrip.get(91), 11152000, 'oldest voucher is covered first');
    assert.equal(byTrip.get(80), 11072200);
    assert.equal(byTrip.get(102), 7728000);
    assert.equal(byTrip.get(138), 3070200, 'only the true remainder reaches trip 138 — never the stored 18.022.400₫');
    assert.ok(payments.every((r) => !String(r.note).includes('Hoàn tác')));
  });
});

describe('isOrphanChiHoRow (NEPO-48 QA wave 3)', () => {
  const live = new Set([377, 378, 380]);
  const chiHo = (over: Partial<EnrichedLedgerRow> = {}) => row({
    txnType: TxnType.SERVICE_FEE, txnTable: 'trip_expenses', txnId: 382, note: 'Phí chi hộ TRP-202607-0044', ...over,
  });

  it('flags a chi hộ charge whose fee id no longer exists', () => {
    assert.equal(isOrphanChiHoRow(chiHo({ txnId: 382 }), live), true);
    assert.equal(isOrphanChiHoRow(chiHo({ txnId: 378 }), live), false);
  });

  it('flags legacy stamp-less chi hộ rows by the fee reference, not by a stamp', () => {
    assert.equal(isOrphanChiHoRow(chiHo({ txnTable: null, txnId: 383 }), live), true);
  });

  it('never flags non-chi-hộ rows or rows without a txn_id', () => {
    assert.equal(isOrphanChiHoRow(revenue({ txnId: 9999 }), live), false);
    assert.equal(isOrphanChiHoRow(chiHo({ txnId: null }), live), false);
  });
});
