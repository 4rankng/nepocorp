/**
 * Cover for the VISIBLE ledger derivation (NEPO-43/44/50 pairing + NEPO-48
 * owner decision): every UNLOCK_REVERSAL '(Hoàn tác)' row leaves the
 * statement on every surface — paired or not — and the original row each
 * reversal mirrors (same entityType, txnId family, mirrored amount
 * debit↔credit, any instant) leaves with it: TRIP_REVENUE,
 * EXTERNAL_CARRIER_COST, DRIVER_SALARY, fuel/VENDOR_EXPENSE,
 * FORWARDER_ADVANCE alike, regardless of posting instant. Chi-hộ rows pair
 * inside a `fee:` namespace so trip_expenses ids never cross-pair a
 * same-numbered trip's rows. Unpaired originals and non-reversal rows
 * (payments, penalties, odd-sign revenue) stay. Dropping a lone reversal
 * changes the net by design — callers must derive balances/totals/aging
 * from the returned set, never from the raw rows.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { visibleLedgerRows } from '../services/statement.service';
import type { EnrichedLedgerRow } from '../services/statement.service';
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
    const rows = [reversal({ timestamp: instant }), revenue({ timestamp: instant })];
    assert.equal(visibleLedgerRows(rows).length, 0);
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

  it('keeps the live cost and hides only the churn — prod carrier 21/9 shape (cước lặp 3 lần)', () => {
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
    assert.equal(collapsed[0].id, rows[4].id, 'the newest re-posted charge survives');
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
