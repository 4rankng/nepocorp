/**
 * Cover for the statement detail edit-cycle collapse (NEPO-43, generalized in
 * NEPO-44): legacy UNLOCK_REVERSAL + original pairs that share entityType,
 * txnId, mirrored amount (debit↔credit) and instant are hidden from the chi
 * tiết table (net 0 ₫) — TRIP_REVENUE, EXTERNAL_CARRIER_COST, DRIVER_SALARY,
 * fuel/VENDOR_EXPENSE, FORWARDER_ADVANCE alike — while a genuinely lone
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

  it('collapses only UNLOCK_REVERSAL pairs — payments, penalties, odd-sign revenue untouched', () => {
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

  // ── r2 (NEPO-44): generalized pairing — every entity the lock posts to ──

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
    assert.equal(collapseEditCyclePairs(rows).length, 0);
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
    const collapsed = collapseEditCyclePairs(rows);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].txnType, TxnType.EXTERNAL_CARRIER_COST);
    assert.equal(collapsed[0].id, rows[0].id, 'the original live charge survives');
    assert.equal(net(rows), net(collapsed), 'running net preserved');
  });

  it('collapses a DRIVER_SALARY churn pair', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      row({ entityType: 'DRIVER', entityId: 5, txnType: TxnType.DRIVER_SALARY, credit: '4500000', timestamp: instant }),
      row({ entityType: 'DRIVER', entityId: 5, txnType: TxnType.UNLOCK_REVERSAL, debit: '4500000', timestamp: instant }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('collapses a VENDOR fuel-allocation churn pair', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      row({ entityType: 'VENDOR', entityId: 3, txnType: TxnType.FUEL_EXPENSE, credit: '1620000', timestamp: instant }),
      row({ entityType: 'VENDOR', entityId: 3, txnType: TxnType.UNLOCK_REVERSAL, debit: '1620000', timestamp: instant }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('collapses a FORWARDER_ADVANCE churn pair', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      row({ entityType: 'FORWARDER', entityId: 6, txnType: TxnType.FORWARDER_ADVANCE, credit: '50000000', timestamp: instant }),
      row({ entityType: 'FORWARDER', entityId: 6, txnType: TxnType.UNLOCK_REVERSAL, debit: '50000000', timestamp: instant }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 0);
    assert.equal(net(rows), 0);
  });

  it('keeps a lone carrier reversal (genuine unlock — no same-instant repost)', () => {
    const rows = [carrierCost(), carrierReversal({ timestamp: new Date('2026-09-22T08:00:00.000Z') })];
    const collapsed = collapseEditCyclePairs(rows);
    assert.equal(collapsed.length, 2);
    assert.equal(collapsed[1].txnType, TxnType.UNLOCK_REVERSAL);
  });

  it('never cross-pairs ledgers: same txnId/amount/instant on a different entityType stays', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      carrierCost({ timestamp: instant }),
      carrierReversal({ entityType: 'CUSTOMER', entityId: 7, timestamp: instant }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 2);
  });

  it('pairs each row at most once, oldest-first, when identical pairs repeat at one instant', () => {
    const instant = new Date('2026-09-21T10:36:10.000Z');
    const rows = [
      carrierCost({ timestamp: instant }),
      carrierCost({ timestamp: instant }),
      carrierReversal({ timestamp: instant }),
      carrierReversal({ timestamp: instant }),
    ];
    assert.equal(collapseEditCyclePairs(rows).length, 0);
    assert.equal(net(rows), 0);
  });
});
