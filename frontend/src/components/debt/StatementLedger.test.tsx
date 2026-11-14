import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import type { FastStatementDetail, StatementPeriodTotals, StatementVoucherLine } from '@tingting/shared';
import { StatementLedger } from './StatementLedger';

/**
 * NEPO-47 — the statement screen renders the customer's Fast 'SỔ CHI TIẾT
 * CÔNG NỢ': letterhead công ty, khối giữa (tài khoản 131111 + KHÁCH HÀNG +
 * TỪ/ĐẾN NGÀY), SỐ DƯ ĐẦU KỲ băng 2 ô Nợ|Có (hiện cả số 0) trên cùng bảng,
 * bảng STT | CHỨNG TỪ (NGÀY | SỐ) | DIỄN GIẢI | SỐ PHÁT SINH
 * (NỢ | CÓ) với mỗi chứng từ một STT (nhiều dòng nghiệp vụ dưới một STT,
 * ngày dd-mm), TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ băng đủ cột, khối ký tên.
 * KHÔNG cột dư từng dòng. Money renders '#,##0' without ₫ exactly as
 * delivered by the API (integer VND) — no recomputation.
 */

const tripLine = (description: string, debit: number): StatementVoucherLine => ({
  description,
  debit,
  credit: 0,
  contraAccount: '5111',
});
const paymentLine = (description: string, credit: number): StatementVoucherLine => ({
  description,
  debit: 0,
  credit,
  contraAccount: '1121',
});

const fastFixture = (overrides: Partial<FastStatementDetail> = {}): FastStatementDetail => {
  const totals: StatementPeriodTotals = { openingBalance: 12_000_000, debitTotal: 15_000_000, creditTotal: 12_000_000, closingBalance: 15_000_000 };
  return {
    opening: { debit: 12_000_000, credit: 0 },
    vouchers: [
      {
        stt: 1,
        kind: 'transaction',
        docDate: '2026-07-04',
        docNo: 'TRP-202607-0001',
        lines: [
          tripLine('Doanh thu chuyến — Hải Phòng — Hà Nội', 10_000_000),
          tripLine('Phí chi hộ', 2_000_000),
        ],
        debit: 12_000_000,
        credit: 0,
      },
      {
        stt: 2,
        kind: 'payment',
        docDate: '2026-10-15',
        docNo: 'R1',
        lines: [paymentLine('KH trả 12.000.000 ₫ ngày 15/10/2026 (chuyển khoản)', 12_000_000)],
        debit: 0,
        credit: 12_000_000,
      },
      {
        stt: 3,
        kind: 'transaction',
        docDate: '2026-10-20',
        docNo: 'TRP-202610-0009',
        lines: [tripLine('Doanh thu chuyến — Hải Phòng — Vĩnh Phúc', 3_000_000)],
        debit: 3_000_000,
        credit: 0,
      },
    ],
    totals,
    closing: { debit: 15_000_000, credit: 0 },
    ...overrides,
  };
};

describe('StatementLedger (NEPO-47 SỔ CHI TIẾT CÔNG NỢ mẫu Fast)', () => {
  it('renders the Fast header: tài khoản 131111, khách hàng (MST), kỳ báo cáo', () => {
    const { getByText } = render(
      <StatementLedger
        fast={fastFixture()}
        customerName="Công ty TNHH Test"
        customerCode="0312345678"
        dateFrom="2026-10-01"
        dateTo="2026-10-31"
      />,
    );

    expect(getByText('SỔ CHI TIẾT CÔNG NỢ')).toBeTruthy();
    expect(getByText('TÀI KHOẢN: 131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG: HOẠT ĐỘNG SXKD (VND)')).toBeTruthy();
    expect(getByText('KHÁCH HÀNG: Công ty TNHH Test (0312345678)')).toBeTruthy();
    expect(getByText('TỪ NGÀY: 01-10-2026 ĐẾN NGÀY: 31-10-2026')).toBeTruthy();
  });

  it('renders the company letterhead khi có company info', () => {
    const { getByText, rerender } = render(
      <StatementLedger fast={fastFixture()} companyName="CÔNG TY TNHH NEPO" companyAddress="Khu công nghiệp Tân Tạo" />,
    );
    expect(getByText('CÔNG TY TNHH NEPO')).toBeTruthy();
    expect(getByText('Khu công nghiệp Tân Tạo')).toBeTruthy();

    rerender(<StatementLedger fast={fastFixture()} />);
    expect(document.querySelector('.so-ke-letterhead')).toBeNull();
  });

  it('renders dư đầu kỳ băng 2 ô — hiển thị cả số 0 như mẫu Fast', () => {
    const { getByTestId } = render(<StatementLedger fast={fastFixture()} />);
    const openingRow = getByTestId('so-ke-opening-row');
    const cells = within(openingRow).getAllByRole('cell');
    expect(cells.map((c) => c.textContent)).toEqual(['', 'SỐ DƯ ĐẦU KỲ:', '12.000.000', '0']);
  });

  it('mỗi chứng từ một STT, nhiều dòng nghiệp vụ dưới một STT (cước + chi hộ), NGÀY dd-mm', () => {
    const { getAllByRole } = render(<StatementLedger fast={fastFixture()} />);

    const rows = getAllByRole('row');
    const revenueRow = rows.find((r) => r.textContent?.includes('Doanh thu chuyến — Hải Phòng — Hà Nội'));
    const chiHoRow = rows.find((r) => r.textContent?.includes('Phí chi hộ'));
    expect(revenueRow).toBeTruthy();
    expect(chiHoRow).toBeTruthy();
    const revenueCells = within(revenueRow!).getAllByRole('cell');
    const chiHoCells = within(chiHoRow!).getAllByRole('cell');
    expect(revenueCells[0].textContent).toBe('1'); // STT trên dòng đầu của chứng từ
    expect(revenueCells[1].textContent).toBe('04-07'); // NGÀY chứng từ dd-mm
    expect(revenueCells[4].textContent).toBe('10.000.000'); // NỢ của dòng doanh thu
    expect(chiHoCells[0].textContent).toBe(''); // dòng 2 của chứng từ không lặp STT
    expect(chiHoCells[1].textContent).toBe(''); // dòng 2 không lặp NGÀY chứng từ
    expect(chiHoCells[2].textContent).toBe(''); // dòng 2 không lặp SỐ chứng từ
    expect(chiHoCells[4].textContent).toBe('2.000.000'); // NỢ của dòng chi hộ
  });

  it('payment voucher reads KH trả … right after DIỄN GIẢI in the 6-column layout', () => {
    const { getByTestId, queryByText } = render(<StatementLedger fast={fastFixture()} />);
    const paymentRow = getByTestId('so-ke-payment-row');
    expect(within(paymentRow).getByText('KH trả 12.000.000 ₫ ngày 15/10/2026 (chuyển khoản)')).toBeTruthy();
    expect(within(paymentRow).getByText('R1')).toBeTruthy();
    expect(queryByText('Thanh toán')).toBeNull(); // không badge
    expect(queryByText('1121')).toBeNull(); // cột TK Đ.ỨNG đã bỏ

    const headers = getAllHeaderCells(paymentRow);
    expect(headers.indexOf('SỐ PHÁT SINH')).toBe(headers.indexOf('DIỄN GIẢI') + 1);
    expect(headers.indexOf('TK Đ.ỨNG')).toBe(-1);
  });

  it('renders TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ băng đủ cột without recomputing', () => {
    const { getByTestId } = render(<StatementLedger fast={fastFixture()} />);
    const totalsRow = getByTestId('so-ke-total-row');
    expect(within(totalsRow).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '',
      'TỔNG PHÁT SINH:',
      '15.000.000',
      '12.000.000',
    ]);
    const closingRow = getByTestId('so-ke-closing-row');
    expect(within(closingRow).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '',
      'SỐ DƯ CUỐI KỲ:',
      '15.000.000',
      '0',
    ]);
  });

  it('splits a trả trước (advance) closing into the CÓ cell', () => {
    const { getByTestId } = render(
      <StatementLedger
        fast={fastFixture({
          totals: { openingBalance: 0, debitTotal: 0, creditTotal: 7_000_000, closingBalance: -7_000_000 },
          closing: { debit: 0, credit: 7_000_000 },
        })}
      />,
    );
    const cells = within(getByTestId('so-ke-closing-row')).getAllByRole('cell');
    expect(cells.map((c) => c.textContent)).toEqual(['', 'SỐ DƯ CUỐI KỲ:', '0', '7.000.000']);
  });

  it('renders the signature block: NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG + ngày tháng năm', () => {
    const { getByText, getByLabelText } = render(<StatementLedger fast={fastFixture()} />);
    const sign = getByLabelText('Chữ ký');
    expect(within(sign).getByText('NGƯỜI LẬP BIỂU')).toBeTruthy();
    expect(within(sign).getByText('KẾ TOÁN TRƯỞNG')).toBeTruthy();
    expect(within(sign).getAllByText('(Ký, họ tên)').length).toBe(2);
    expect(getByText('Ngày ..... tháng ..... năm .........')).toBeTruthy();
  });

  it('renders the empty state without footer/signatures when the kỳ has no vouchers', () => {
    const { getByText, queryByText, queryByLabelText } = render(<StatementLedger fast={fastFixture({ vouchers: [] })} isLoading={false} />);
    expect(getByText('Không có giao dịch trong kỳ')).toBeTruthy();
    expect(queryByText('TỔNG PHÁT SINH:')).toBeNull();
    expect(queryByLabelText('Chữ ký')).toBeNull();
  });
});

/** Header cells of the table the given row belongs to (asserts column set). */
function getAllHeaderCells(row: HTMLElement): string[] {
  const table = row.closest('table');
  return Array.from(table?.querySelectorAll('thead th') ?? []).map((th) => th.textContent ?? '');
}