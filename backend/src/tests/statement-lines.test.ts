import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TxnType } from '@tingting/shared';
import type { StatementLine, StatementPeriodTotals } from '@tingting/shared';
import { buildStatementLines, buildFastStatement, computePeriodSummary } from '../services/statement.service';

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
  paymentMethod?: 'BANK' | 'CASH' | null;
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
  paymentMethod: opts.paymentMethod ?? null,
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

describe('buildStatementLines — TK đối ứng (MISA counter account)', () => {
  test('a BANK receipt folding across 2 trips carries TK 1121 and the chuyển khoản suffix', () => {
    const rows = [
      row({ ts: '2026-07-05T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 10_000_000, note: 'Doanh thu chuyến TRP-202607-0001', txnId: 11, tripId: 11, tripCode: 'TRP-202607-0001' }),
      row({ ts: '2026-07-06T00:00:00Z', txnType: TxnType.SERVICE_FEE, debit: 2_000_000, note: 'Phí chi hộ', txnId: 21 }),
      row({ ts: '2026-10-15T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 7_500_000, receiptId: 'RB', paymentMethod: 'BANK', txnId: 11 }),
      row({ ts: '2026-10-15T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 4_500_000, receiptId: 'RB', paymentMethod: 'BANK', txnId: 21 }),
    ];
    const { lines, totals } = buildStatementLines(rows, 1_000_000);

    const payment = lines[lines.length - 1];
    assert.equal(payment.kind, 'payment');
    assert.equal(payment.credit, 12_000_000, 'fold keeps the aggregate receipt total');
    assert.equal(payment.counterAccount, '1121');
    assert.match(payment.description, /\(chuyển khoản\)$/);
    assert.equal(totals.closingBalance, 1_000_000 + 12_000_000 - 12_000_000, 'closing = opening + Σnợ − Σcó');
  });

  test('a CASH receipt carries TK 1111 and the tiền mặt suffix', () => {
    const rows = [
      row({ ts: '2026-07-05T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 5_000_000, tripCode: 'T1' }),
      row({ ts: '2026-07-20T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 5_000_000, receiptId: 'RC', paymentMethod: 'CASH', txnId: 1 }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    const payment = lines[1];
    assert.equal(payment.counterAccount, '1111');
    assert.match(payment.description, /\(tiền mặt\)$/);
  });

  test('a legacy receipt with no recorded channel maps to null without a channel suffix', () => {
    const rows = [
      row({ ts: '2026-07-05T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 5_000_000, tripCode: 'T1' }),
      row({ ts: '2026-07-20T00:00:00Z', txnType: TxnType.PAYMENT_RECEIVED, credit: 5_000_000, receiptId: 'RL', txnId: 1 }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    const payment = lines[1];
    assert.equal(payment.counterAccount, null);
    assert.doesNotMatch(payment.description, /\(chuyển khoản\)|\(tiền mặt\)/);
    assert.match(payment.description, /KH trả 5\.000\.000 ₫ ngày 20\/07\/2026/);
  });

  test('TRIP_REVENUE clears against 5111; ADJUSTMENT carries no counter account', () => {
    const rows = [
      row({ ts: '2026-07-01T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 3_000_000, tripCode: 'T1' }),
      row({ ts: '2026-07-02T00:00:00Z', txnType: TxnType.ADJUSTMENT, debit: 500_000, note: 'Điều chỉnh' }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    assert.equal(lines[0].counterAccount, '5111');
    assert.equal(lines[1].counterAccount, null);
  });
});

describe('buildStatementLines — diễn giải strips the duplicated trip code', () => {
  test('a revenue note loses its own trip code — the Số hiệu column already carries it', () => {
    const rows = [
      row({ ts: '2026-10-23T00:00:00Z', txnType: TxnType.TRIP_REVENUE, debit: 22_000_000, note: 'Doanh thu chuyến TRP-202610-0057', txnId: 57, tripId: 57, tripCode: 'TRP-202610-0057' }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    assert.equal(lines[0].docNo, 'TRP-202610-0057');
    assert.equal(lines[0].description, 'Doanh thu chuyến');
  });

  test('a reversal keeps its (Hoàn tác) marker after the strip', () => {
    const rows = [
      row({ ts: '2026-10-23T00:00:00Z', txnType: TxnType.TRIP_REVENUE, credit: 6_480_000, note: 'Doanh thu chuyến TRP-202610-0020 (Hoàn tác)', txnId: 20, tripId: 20, tripCode: 'TRP-202610-0020' }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    assert.equal(lines[0].description, 'Doanh thu chuyến (Hoàn tác)');
  });

  test('notes without the line code stay untouched', () => {
    const rows = [
      row({ ts: '2026-10-24T00:00:00Z', txnType: TxnType.SERVICE_FEE, debit: 500_000, note: 'Phí chi hộ', txnId: 21 }),
      row({ ts: '2026-10-25T00:00:00Z', txnType: TxnType.ADJUSTMENT, debit: 100_000, note: 'Điều chỉnh theo TRP-202609-0001', tripCode: 'TRP-202610-0057' }),
    ];
    const { lines } = buildStatementLines(rows, 0);
    assert.equal(lines[0].description, 'Phí chi hộ');
    assert.equal(lines[1].description, 'Điều chỉnh theo TRP-202609-0001', 'a different trip reference survives');
  });
});

describe('buildFastStatement — NEPO-47 Fast SỔ CHI TIẾT CÔNG NỢ', () => {
  const tripLine = (id: number, posted: string, docNo: string, debit: number, overrides: Partial<StatementLine> = {}): StatementLine => ({
    id,
    kind: 'transaction',
    month: posted.slice(0, 7),
    postedDate: posted,
    docDate: posted,
    docNo,
    description: 'Phí chi hộ',
    counterAccount: null,
    debit,
    credit: 0,
    balance: debit,
    txnType: TxnType.TRIP_REVENUE,
    tripId: id,
    ...overrides,
  });
  const paymentLine = (id: number, posted: string, credit: number, balance: number, docNo: string | null = 'R1'): StatementLine => ({
    id,
    kind: 'payment',
    month: posted.slice(0, 7),
    postedDate: posted,
    docDate: posted,
    docNo,
    description: `KH trả ${credit.toLocaleString('vi-VN')} ₫ ngày ${posted.slice(8, 10)}/${posted.slice(5, 7)}/${posted.slice(0, 4)}`,
    counterAccount: '1121',
    debit: 0,
    credit,
    balance,
    txnType: TxnType.PAYMENT_RECEIVED,
    tripId: null,
    rowCount: 1,
  });
  const totalsOf = (opening: number, debit: number, credit: number, closing: number): StatementPeriodTotals => ({
    openingBalance: opening, debitTotal: debit, creditTotal: credit, closingBalance: closing,
  });

  test('cước + chi hộ của cùng chuyến gộp một STT dù đăng ký lệch thời điểm', () => {
    const lines = [
      tripLine(1, '2026-07-06', 'TRP-202607-0001', 2_000_000, { description: 'Phí chi hộ', txnType: TxnType.SERVICE_FEE }),
      tripLine(2, '2026-07-05', 'TRP-202607-0001', 10_000_000, { description: 'Doanh thu chuyến' }),
      tripLine(3, '2026-07-10', 'TRP-202607-0002', 8_000_000, { description: 'Doanh thu chuyến' }),
    ];
    const { vouchers, totals } = buildFastStatement(lines, totalsOf(0, 20_000_000, 0, 20_000_000));

    assert.equal(vouchers.length, 2, '2 chuyến = 2 STT');
    assert.equal(vouchers[0].stt, 1);
    assert.equal(vouchers[0].docNo, 'TRP-202607-0001', 'first-occurrence order by ngày ghi sổ');
    assert.equal(vouchers[0].lines.length, 2, 'cước + chi hộ dưới cùng một STT');
    assert.equal(vouchers[0].debit, 12_000_000, 'voucher nợ = cước + chi hộ');
    assert.equal(vouchers[1].stt, 2);
    assert.equal(vouchers[1].docNo, 'TRP-202607-0002');
    assert.equal(totals.debitTotal, 20_000_000);
  });

  test('phiếu thu là chứng từ riêng; phiếu thu legacy không mã tự đứng một STT', () => {
    const lines = [
      tripLine(1, '2026-07-05', 'TRP-202607-0001', 10_000_000),
      paymentLine(2, '2026-10-15', 12_000_000, -2_000_000, 'R1'),
      paymentLine(3, '2026-10-16', 1_000_000, -3_000_000, null),
      paymentLine(4, '2026-10-16', 2_000_000, -5_000_000, null),
    ];
    const { vouchers } = buildFastStatement(lines, totalsOf(0, 10_000_000, 15_000_000, -5_000_000));

    assert.equal(vouchers.length, 4, '1 chuyến + 1 phiếu có mã + 2 phiếu legacy');
    assert.equal(vouchers[1].kind, 'payment');
    assert.equal(vouchers[1].docNo, 'R1');
    assert.equal(vouchers[2].kind, 'payment');
    assert.equal(vouchers[2].docNo, null, 'legacy receipt stands alone');
    assert.equal(vouchers[3].docNo, null);
  });

  test('dư đầu/cuối kỳ tách 2 ô Nợ|Có theo dấu — thang 10 dư nợ months 1-9', () => {
    // Kế toán case NEPO-47: tháng 10 mở sổ với dư Nợ cộng dồn từ các tháng trước.
    const lines = [
      tripLine(1, '2026-10-05', 'TRP-202610-0001', 5_000_000),
      paymentLine(2, '2026-10-20', 8_000_000, 9_000_000),
    ];
    const opening = buildFastStatement(lines, totalsOf(12_000_000, 5_000_000, 8_000_000, 9_000_000));
    assert.deepEqual(opening.opening, { debit: 12_000_000, credit: 0 }, 'dư dương → ô Nợ');
    assert.deepEqual(opening.closing, { debit: 9_000_000, credit: 0 });

    const advance = buildFastStatement([], totalsOf(-4_000_000, 0, 0, -4_000_000));
    assert.deepEqual(advance.opening, { debit: 0, credit: 4_000_000 }, 'dư âm (trả trước) → ô Có');
    assert.deepEqual(advance.closing, { debit: 0, credit: 4_000_000 });
  });

  test('bất biến tiền: Σ voucher = tổng phát sinh; closing = opening + Σnợ − Σcó', () => {
    const lines = [
      tripLine(1, '2026-07-05', 'TRP-202607-0001', 10_000_000),
      tripLine(2, '2026-07-06', 'TRP-202607-0001', 2_000_000, { txnType: TxnType.SERVICE_FEE }),
      paymentLine(3, '2026-10-15', 12_000_000, 0),
    ];
    const totals = totalsOf(3_000_000, 12_000_000, 12_000_000, 3_000_000);
    const { opening, vouchers, closing } = buildFastStatement(lines, totals);

    const sumDebit = vouchers.reduce((s, v) => s + v.debit, 0);
    const sumCredit = vouchers.reduce((s, v) => s + v.credit, 0);
    assert.equal(sumDebit, totals.debitTotal, 'grouping không đổi tiền (Nợ)');
    assert.equal(sumCredit, totals.creditTotal, 'grouping không đổi tiền (Có)');
    assert.equal(closing.debit - closing.credit, opening.debit - opening.credit + sumDebit - sumCredit);
    for (const v of vouchers) {
      const lineSum = v.lines.reduce((s, l) => s + l.debit - l.credit, 0);
      assert.equal(v.debit - v.credit, lineSum, 'voucher tổng = tổng dòng nghiệp vụ dưới nó');
    }
  });

  test('ngày chứng từ = ngày đi chuyến, fallback ngày ghi sổ; STT chạy 1..N', () => {
    const lines = [
      tripLine(1, '2026-10-05', 'TRP-202610-0001', 5_000_000, { docDate: null, description: 'Doanh thu chuyến', routeName: 'Hải Phòng — Hà Nội', containerNumbers: ['ABC-1'] }),
      paymentLine(2, '2026-10-06', 1_000_000, 4_000_000),
    ];
    const { vouchers } = buildFastStatement(lines, totalsOf(0, 5_000_000, 1_000_000, 4_000_000));

    assert.equal(vouchers[0].stt, 1);
    assert.equal(vouchers[0].docDate, '2026-10-05', 'null ngày CT → fallback ngày ghi sổ');
    assert.equal(vouchers[0].lines[0].description, 'Doanh thu chuyến — Hải Phòng — Hà Nội (ABC-1)');
    assert.equal(vouchers[1].stt, 2);
    assert.equal(vouchers[1].docDate, '2026-10-06');
  });
});
