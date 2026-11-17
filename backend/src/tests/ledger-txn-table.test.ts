/**
 * NEPO-50 — the central txn_type → txn_table mapping (lib/ledger-txn-table.ts)
 * must stay in lockstep with the migration 0131 backfill CASE:
 *
 * 1. unit checks pin every note-prefix rule and every unambiguous default;
 * 2. the live-database sweep re-derives the mapping for EVERY ledger row and
 *    fails the suite the moment the SQL CASE and the TS mapping drift — a join
 *    written against one but not the other would silently re-open the
 *    same-numbered-trip bug this column exists to close.
 */
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TxnType } from '@tingting/shared';
import { db, client } from '../db';
import * as s from '../db/schema';
import { txnTableFor } from '../lib/ledger-txn-table';

after(async () => {
  await client.end();
});

describe('txnTableFor — unit rules', () => {
  test('rows without a txn_id have no table', () => {
    assert.equal(txnTableFor(TxnType.PAYMENT_RECEIVED, null, 'Thanh toán chuyến'), null);
    assert.equal(txnTableFor(TxnType.VENDOR_PAYMENT, undefined, 'Thanh toán nhà cung cấp'), null);
    assert.equal(txnTableFor(TxnType.DRIVER_PAYOUT, null, null), null);
  });

  test('unambiguous types map directly', () => {
    assert.equal(txnTableFor(TxnType.TRIP_REVENUE, 96, 'Doanh thu chuyến TRP-x'), 'trips');
    assert.equal(txnTableFor(TxnType.DRIVER_SALARY, 96, 'Lương sản lượng chuyến TRP-x'), 'trips');
    assert.equal(txnTableFor(TxnType.FUEL_EXPENSE, 96, 'Chi phí dầu chuyến TRP-x'), 'trips');
    assert.equal(txnTableFor(TxnType.EXTERNAL_CARRIER_COST, 96, 'Cước thuê ngoài chuyến TRP-x'), 'trips');
    assert.equal(txnTableFor(TxnType.COMMISSION, 96, 'Hoa hồng'), 'trips');
    assert.equal(txnTableFor(TxnType.SERVICE_FEE, 222, 'Phí chi hộ chuyến TRP-x'), 'trip_expenses');
    assert.equal(txnTableFor(TxnType.PENALTY, 5, 'Kỷ luật chuyến TRP-x'), 'penalties');
    assert.equal(txnTableFor(TxnType.VENDOR_EXPENSE, 7, 'Chi phí Cầu đường'), 'expenses');
    assert.equal(txnTableFor(TxnType.FORWARDER_SETTLEMENT, 3, 'Thanh toán tạm ứng #3'), 'advance_settlements');
  });

  test('ambiguous families resolve by note prefix', () => {
    // UNLOCK_REVERSAL — revenue/salary/fuel/carrier default to trips
    assert.equal(txnTableFor(TxnType.UNLOCK_REVERSAL, 96, 'Doanh thu chuyến TRP-x (Hoàn tác)'), 'trips');
    assert.equal(txnTableFor(TxnType.UNLOCK_REVERSAL, 96, 'Chi phí dầu chuyến TRP-x (Hoàn tác)'), 'trips');
    assert.equal(txnTableFor(TxnType.UNLOCK_REVERSAL, 96, 'Cước thuê ngoài chuyến TRP-x (Hoàn tác)'), 'trips');
    // UNLOCK_REVERSAL — chi-hộ fee reversal carries a trip_expenses.id
    assert.equal(txnTableFor(TxnType.UNLOCK_REVERSAL, 222, 'Phí chi hộ chuyến TRP-x (Hoàn tác)'), 'trip_expenses');
    assert.equal(txnTableFor(TxnType.UNLOCK_REVERSAL, 222, 'Phí chi hộ (Hoàn tác)'), 'trip_expenses');
    // legacy 'Chi hộ DV' advance/reversal family (verified on prod data: their
    // txn_ids collide with real trip ids and always point at trip_expenses)
    assert.equal(txnTableFor(TxnType.UNLOCK_REVERSAL, 9, 'Chi hộ DV chuyến TRP-x (Hoàn tác)'), 'trip_expenses');
    assert.equal(txnTableFor(TxnType.FORWARDER_ADVANCE, 9, 'Chi hộ DV chuyến TRP-x'), 'trip_expenses');
    // FORWARDER_ADVANCE — plain advance carries an advance_requests.id
    assert.equal(txnTableFor(TxnType.FORWARDER_ADVANCE, 12, 'Tạm ứng cho Nguyễn Văn A'), 'advance_requests');
    assert.equal(txnTableFor(TxnType.FORWARDER_ADVANCE, 12, 'Ops tạm ứng chuyển từ phiếu P-1'), 'advance_requests');
    // ADJUSTMENT families
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 96, 'Điều chỉnh phí chi hộ chuyến TRP-x'), 'trip_expenses');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 8, 'Đối trừ công nợ #8'), 'debt_offsets');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 8, 'Điều chỉnh công nợ theo Giấy báo nợ #8'), 'billing_documents');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 8, 'Hủy kỷ luật #8'), 'penalties');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 8, 'Điều chỉnh chi phí (sửa/xóa khoản chưa thanh toán)'), 'expenses');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 8, 'Ghi lại chi phí sau điều chỉnh'), 'expenses');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 8, 'Hủy chi phí chưa thanh toán'), 'expenses');
    // ADJUSTMENT — free-form trip note (createAdjustment) defaults to trips
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 96, 'Điều chỉnh chiết khấu cuối tháng (HĐ: AGR-2026-001)'), 'trips');
    assert.equal(txnTableFor(TxnType.ADJUSTMENT, 96, 'Ghi nhận điều chỉnh bất kỳ'), 'trips');
  });
});

describe('migration 0131 backfill matches the TS mapping on live rows', () => {
  test('every STAMPED ledger row agrees with txnTableFor; stamp-less rows are legacy fixtures only', async () => {
    const rows = await db.select({
      id: s.ledger.id,
      txnType: s.ledger.txnType,
      txnId: s.ledger.txnId,
      txnTable: s.ledger.txnTable,
      note: s.ledger.note,
    }).from(s.ledger);

    assert.ok(rows.length > 0, 'the shared database must hold ledger rows');
    const mismatches: string[] = [];
    let stamped = 0;
    for (const row of rows) {
      // Rows the posting path created are stamped; test fixtures that emulate
      // legacy data insert raw rows without a stamp. The invariant the joins
      // rely on: a STAMP must always equal the central mapping — a drift here
      // would silently re-open the same-numbered-trip bug.
      if (row.txnTable == null) continue;
      stamped++;
      const expected = txnTableFor(row.txnType, row.txnId, row.note);
      if (row.txnTable !== expected) {
        mismatches.push(`ledger #${row.id} ${row.txnType} txn=${row.txnId} note=${row.note?.slice(0, 40)}: column=${row.txnTable} mapping=${expected}`);
        if (mismatches.length >= 10) break;
      }
    }
    assert.ok(stamped > 0, 'expected at least some stamped rows in the shared database');
    assert.deepEqual(mismatches, [], 'migration backfill CASE must equal the TS mapping for every stamped row');
  });
});
