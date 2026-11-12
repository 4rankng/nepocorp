import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TxnType } from '@tingting/shared';
import { buildStatementLines, computePeriodSummary } from '../services/statement.service';

/**
 * Unit tests for the NEPO-46 sổ chi tiết builder (MISA-style customer
 * statement lines): payment receipts fold into ONE aggregate line ('KH trả
 * X ₫ ngày dd/mm'), trips + chi hộ stay per-document, every line carries
 * integer-VND debit/credit plus the running dư cuối, and the totals validate
 * by TOTAL (closing = opening + Σnợ − Σcó) — never against per-trip
 * component sums, because the balance legitimately carries non-trip rows
 * (trả trước credits, adjustments).
 */

type LineRow = Parameters<typeof buildStatementLines>[0][number];

let nextRowId = 1;
const row = (opts: {
  ts: string;
  txnType: TxnType;
  debit?: number;
  credit?: number;
  note?: string | null;
  receiptId?: string | null;
  txnId?: number | null;
  tripId?: number | null;
  tripCode?: string | null;
  routeName?: string | null;
}): LineRow => ({
  id: nextRowId++,
  timestamp: new Date(opts.ts),
  createdAt: new Date(opts.ts),
  txnType: opts.txnType,
  txnId: opts.txnId ?? null,
  receiptId: opts.receiptId ?? null,
  entityType: 'CUSTOMER',
  entityId: 1,
  debit: String(opts.debit ?? 0),
  credit: String(opts.credit ?? 0),
  balance: '0',
  note: opts.note ?? null,
  tripId: opts.tripId ?? null,
  tripCode: opts.tripCode ?? null,
  routeName: opts.routeName ?? null,
  containerNumbers: [],
});

describe('buildStatementLines — payment folding (NEPO-46)', () => {
  test('one bank receipt spanning several trips folds into a single THÀNH TOÁN line', () => {
    // Kế toán case: chuyến tháng 7 + chi hộ, khách trả MỘT khoản gộp tháng 10.
    const rows = [
      row({ ts: '2026-07-05T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 10_000_000, note: 'Doanh thu chuyến TRP-202607-0001', txnId: 11, tripId: 11, tripCode: 'TRP-202607-0001' }),
      row({ ts: '2026-07-06T00:00:00Z', txnType: TxnType.SERVICE_FEE, debit: 2_000_000, note: 'Phí chi hộ', txnId: 21 }),
      row({ ts: '2026-10-15T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 7_500_000, receiptId: 'R1', txnId: 11, note: 'Thanh toán chuyến TRP-202607-0001' }),
      row({ ts: '2026-10-15T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 4_500_000, receiptId: 'R1', txnId: 21, note: 'Thanh toán chuyến TRP-202607-0001' }),
    ];
    const { lines, totals } = buildStatementLines(rows, 0);

    assert.equal(lines.length, 3, '2 transaction documents + 1 aggregate payment');
    const payment = lines[lines.length - 1];
    assert.equal(payment.kind, 'payment');
    assert.equal(payment.docNo, 'R1');
    assert.equal(payment.credit, 12_000_000, 'FIFO split rows sum into the receipt total');
    assert.equal(payment.rowCount, 2);
    assert.match(payment.description, /KH trả 12\.000\.000 ₫ ngày 15\/10\/2026/);
    assert.equal(totals.closingBalance, 0);
    assert.equal(totals.debitTotal, 12_000_000);
    assert.equal(totals.creditTotal, 12_000_000);
  });

  test('payments without a receipt stand alone and do not merge', () => {
    const rows = [
      row({ ts: '2026-10-01T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 1_000_000 }),
      row({ ts: '2026-10-02T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 2_000_000 }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    assert.equal(lines.length, 2);
    assert.ok(lines.every(l => l.kind === 'payment' && l.docNo === null));
  });

  test('running balance seeds from the period opening and accumulates per line', () => {
    const rows = [
      row({ ts: '2026-08-01T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 3_000_000, tripCode: 'T1' }),
      row({ ts: '2026-08-20T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 1_000_000, receiptId: 'R9' }),
    ];
    const { lines, totals } = buildStatementLines(rows, 5_000_000);
    assert.equal(lines[0].balance, 8_000_000);
    assert.equal(lines[1].balance, 7_000_000);
    assert.deepEqual(totals, { openingBalance: 5_000_000, debitTotal: 3_000_000, creditTotal: 1_000_000, closingBalance: 7_000_000 });
    assert.equal(lines[0].month, '2026-08');
  });

  test('order is ngày ghi sổ (timestamp), not insertion id — backdated payments sort into their period', () => {
    const rows = [
      row({ ts: '2026-10-10T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 500_000, receiptId: 'R2' }),
      row({ ts: '2026-09-01T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 700_000, tripCode: 'T0' }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    assert.equal(lines[0].month, '2026-09');
    assert.equal(lines[1].month, '2026-10');
    assert.equal(lines[1].balance, 200_000);
  });

  test('trả trước (advance credit) drives the balance negative and validates by total', () => {
    // NEPO-45 law: overpay is legal — no trip rows at all, balance carries the credit.
    const rows = [
      row({ ts: '2026-11-01T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 7_000_000, receiptId: 'R3' }),
    ];
    const { lines, totals } = buildStatementLines(rows, 0);
    assert.equal(totals.closingBalance, -7_000_000);
    assert.equal(lines[0].balance, -7_000_000);
    assert.equal(totals.creditTotal - totals.debitTotal, -totals.closingBalance);
  });

  test('VND components round to integers (money law: no float leakage)', () => {
    const rows = [
      row({ ts: '2026-07-01T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 1_234.6 }),
      row({ ts: '2026-07-02T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: '99.4' as unknown as number }),
    ];
    const { totals } = buildStatementLines(rows, 0);
    assert.equal(totals.debitTotal, 1_334, '1.234,6 → 1.235 + 99,4 → 99');
    assert.ok(Number.isInteger(totals.debitTotal) && Number.isInteger(totals.closingBalance));
  });

  test('net-0 edit-cycle pairs already removed upstream keep the closing identical to computePeriodSummary', () => {
    const rows = [
      row({ ts: '2026-07-01T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 4_000_000, tripCode: 'T2' }),
      row({ ts: '2026-07-02T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 1_500_000, receiptId: 'R4' }),
    ];
    const summary = computePeriodSummary(rows, '2026-07-01', '2026-07-31', 'CUSTOMER');
    const { totals } = buildStatementLines(rows, summary!.openingBalance);
    assert.equal(totals.closingBalance, summary!.closingBalance);
    assert.equal(totals.debitTotal, summary!.debitTotal);
    assert.equal(totals.creditTotal, summary!.creditTotal);
  });

  test('trip lines carry doc metadata (số hiệu = trip code, ngày CT = departure)', () => {
    const rows = [
      row({ ts: '2026-07-05T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 10_000_000, txnId: 33, tripId: 33, tripCode: 'TRP-202607-0033', routeName: 'Hải Phòng — Hà Nội' }),
    ];
    const departures = new Map([[33, '2026-07-04']]);
    const { lines } = buildStatementLines(rows, 0, departures);
    assert.equal(lines[0].docNo, 'TRP-202607-0033');
    assert.equal(lines[0].docDate, '2026-07-04');
    assert.equal(lines[0].routeName, 'Hải Phòng — Hà Nội');
    assert.equal(lines[0].kind, 'transaction');
  });
});
