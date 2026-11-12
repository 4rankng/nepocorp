import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { TxnType } from '@tingting/shared';
import type { StatementLine, StatementPeriodTotals } from '@tingting/shared';
import { StatementLedger } from './StatementLedger';

/**
 * NEPO-46 — the sổ chi tiết must let kế toán read 'KH trả bao nhiêu, trả
 * thế nào' directly: aggregate THÀNH TOÁN lines ('KH trả X ₫ ngày dd/mm'),
 * month bands, per-line running dư cuối, and the tổng kết kỳ footer. Money
 * renders exactly as delivered by the API (integer VND) — no recomputation.
 */

const trip = (id: number, month: string, posted: string, debit: number, docNo: string, counterAccount: string | null = '5111'): StatementLine => ({
  id,
  kind: 'transaction',
  month,
  postedDate: posted,
  docDate: posted,
  docNo,
  description: `Doanh thu chuyến ${docNo}`,
  counterAccount,
  debit,
  credit: 0,
  balance: debit,
  txnType: TxnType.TRIP_REVENUE,
  tripId: id,
});

const payment = (id: number, month: string, posted: string, credit: number, balance: number, docNo = 'R1', rowCount = 2, counterAccount: string | null = '1121'): StatementLine => ({
  id,
  kind: 'payment',
  month,
  postedDate: posted,
  docDate: posted,
  docNo,
  description: `KH trả ${credit.toLocaleString('vi-VN')} ₫ ngày ${posted.slice(8, 10)}/${posted.slice(5, 7)}/${posted.slice(0, 4)}`,
  counterAccount,
  debit: 0,
  credit,
  balance,
  txnType: TxnType.PAYMENT_RECEIVED,
  tripId: null,
  rowCount,
});

const totals = (opening: number, debit: number, credit: number, closing: number): StatementPeriodTotals => ({
  openingBalance: opening,
  debitTotal: debit,
  creditTotal: credit,
  closingBalance: closing,
});

describe('StatementLedger (NEPO-46 sổ chi tiết)', () => {
  it('renders dư đầu kỳ, month bands, and the aggregate payment line verbatim', () => {
    const lines = [
      trip(1, '2026-07', '2026-07-05', 10_000_000, 'TRP-202607-0001'),
      payment(2, '2026-10', '2026-10-15', 12_000_000, 2_000_000),
    ];
    const { getByTestId, getByText } = render(
      <StatementLedger lines={lines} totals={totals(0, 10_000_000, 12_000_000, 2_000_000)} />,
    );

    expect(getByText('Dư đầu kỳ')).toBeTruthy();
    expect(getByText('Tháng 7/2026')).toBeTruthy();
    expect(getByText('Tháng 10/2026')).toBeTruthy();

    const paymentRow = getByTestId('so-ke-payment-row');
    expect(within(paymentRow).getByText('KH trả 12.000.000 ₫ ngày 15/10/2026')).toBeTruthy();
    expect(within(paymentRow).getByText('R1')).toBeTruthy();
  });

  it('shows the tổng kết kỳ footer totals without recomputing them', () => {
    const lines = [trip(1, '2026-07', '2026-07-05', 10_000_000, 'T1')];
    const { getByText } = render(
      <StatementLedger lines={lines} totals={totals(1_000_000, 10_000_000, 0, 11_000_000)} />,
    );
    expect(getByText('Tổng phát sinh trong kỳ')).toBeTruthy();
    expect(getByText('11.000.000 ₫')).toBeTruthy();
    expect(getByText('Dư cuối kỳ')).toBeTruthy();
  });

  it('labels a negative dư cuối as trả trước (advance credit) instead of debt', () => {
    const lines = [payment(1, '2026-11', '2026-11-01', 7_000_000, -7_000_000, 'R3', 1)];
    const { getByText } = render(
      <StatementLedger lines={lines} totals={totals(0, 0, 7_000_000, -7_000_000)} />,
    );
    expect(getByText(/Dư cuối kỳ — khách đã trả trước 7\.000\.000 ₫/)).toBeTruthy();
  });

  it('renders the empty state without a footer when the kỳ has no lines', () => {
    const { getByText, queryByText } = render(<StatementLedger lines={[]} isLoading={false} />);
    expect(getByText('Không có giao dịch trong kỳ')).toBeTruthy();
    expect(queryByText('Tổng phát sinh trong kỳ')).toBeNull();
  });

  it('renders the TK ĐỐI ỨNG column with the counter account per line kind', () => {
    const lines = [
      trip(1, '2026-07', '2026-07-05', 10_000_000, 'TRP-202607-0001', '5111'),
      payment(2, '2026-07', '2026-07-20', 10_000_000, 0, 'R5', 2, '1121'),
    ];
    const { getByText, getByTestId } = render(
      <StatementLedger lines={lines} totals={totals(0, 10_000_000, 10_000_000, 0)} />,
    );

    expect(getByText('TK ĐỐI ỨNG')).toBeTruthy();
    const paymentRow = getByTestId('so-ke-payment-row');
    expect(within(paymentRow).getByText('1121')).toBeTruthy();
    expect(getByText('5111')).toBeTruthy();
  });

  it('shows — for a line with no counter account (legacy receipt, no channel)', () => {
    const lines = [
      payment(1, '2026-10', '2026-10-15', 12_000_000, 2_000_000, 'R1', 2, null),
    ];
    const { getByTestId } = render(
      <StatementLedger lines={lines} totals={totals(0, 0, 12_000_000, 2_000_000)} />,
    );
    expect(within(getByTestId('so-ke-payment-row')).getByText('—')).toBeTruthy();
  });
});
