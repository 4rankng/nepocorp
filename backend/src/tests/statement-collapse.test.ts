/**
 * Cover for the statement detail edit-cycle collapse (NEPO-43): legacy
 * UNLOCK_REVERSAL + TRIP_REVENUE pairs that share txnId, amount and instant
 * are hidden from the chi tiết table (net 0 ₫), while a genuinely lone
 * UNLOCK_REVERSAL stays visible. Aging/balances are computed upstream and
 * untouched — this function only filters the display rows.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collapseEditCyclePairs } from '../services/statement.service';
import type { EnrichedLedgerRow } from '../services/statement.service';
import { TxnType } from '@tingting/shared';

let nextRowId = 1;

const row = (over: Partial<EnrichedLedgerRow> & Pick<EnrichedLedgerRow, 'txnType'>): EnrichedLedgerRow => ({
  id: nextRowId++,
  timestamp: new Date('2026-10-08T07:24:17.897Z'),
  txnId: 296,
  receiptId: null,
  entityType: 'CUSTOMER',
  entityId: 7,
  debit: '0',
  credit: '0',
  balance: '0',
  note: null,
  createdAt: new Date('2026-10-08T07:24:17.897Z'),
  ...over,
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

describe('collapseEditCyclePairs', () => {
  it('hides a same-instant same-amount pair and keeps the net', () => {
    const rows = [revenue(), reversal()];
    const collapsed = collapseEditCyclePairs(rows);
    assert.equal(collapsed.length, 0);
    assert.equal(net(rows), 0);
  });

  it('keeps a lone UNLOCK_REVERSAL (trip genuinely reopened)', () => {
    const rows = [reversal()];
    const collapsed = collapseEditCyclePairs(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.UNLOCK_REVERSAL);
  });

  it('keeps pairs whose instant differs (real unlock then later re-lock)', () => {
    const rows = [
      revenue(),
      reversal({ timestamp: new Date('2026-10-09T08:00:00.000Z') }),
      revenue({ timestamp: new Date('2026-10-09T08:00:00.000Z'), debit: '7000000', credit: '0' }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 3);
  });

  it('keeps pairs whose amount differs (revenue actually changed)', () => {
    const rows = [revenue({ debit: '7000000' }), reversal()];
    assert.equal(collapseEditCyclePairs(rows).length, 2);
  });

  it('keeps pairs whose txnId differs', () => {
    const rows = [revenue({ txnId: 297 }), reversal({ txnId: 296 })];
    assert.equal(collapseEditCyclePairs(rows).length, 2);
  });

  it('collapses only UNLOCK_REVERSAL vs TRIP_REVENUE — other txn types untouched', () => {
    const rows = [
      row({ txnType: TxnType.PAYMENT_RECEIVED, credit: '6480000' }),
      row({ txnType: TxnType.PENALTY, debit: '500000' }),
      row({ txnType: TxnType.TRIP_REVENUE, credit: '6480000' }), // odd sign, not a matchable debit
      reversal({ txnType: TxnType.UNLOCK_REVERSAL }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 4);
  });

  it('matches 1:1 — one revenue row absorbs one reversal, the extra reversal stays', () => {
    const instant = new Date('2026-10-08T07:24:17.897Z');
    const rows = [revenue({ timestamp: instant }), reversal({ timestamp: instant }), reversal({ timestamp: instant })];
    const collapsed = collapseEditCyclePairs(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.UNLOCK_REVERSAL);
  });

  it('is order-independent within the same instant', () => {
    const instant = new Date('2026-10-08T07:24:17.897Z');
    const rows = [reversal({ timestamp: instant }), revenue({ timestamp: instant })];
    assert.equal(collapseEditCyclePairs(rows).length, 0);
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
    const collapsed = collapseEditCyclePairs(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.PAYMENT_RECEIVED);
    assert.equal(net(rows), net(collapsed));
  });

  it('returns the same array when nothing matches (no allocation churn)', () => {
    const rows = [revenue(), revenue({ txnId: 297 })];
    assert.equal(collapseEditCyclePairs(rows), rows);
  });
});
