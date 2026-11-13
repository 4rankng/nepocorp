import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { TxnType } from '@tingting/shared';
import type { FastStatementDetail, StatementLine, StatementPeriodTotals, StatementVoucherLine } from '@tingting/shared';
import { StatementLedger } from './StatementLedger';

/**
 * NEPO-47 — the statement screen renders the customer's Fast 'SỔ CHI TIẾT
 * CÔNG NỢ': header (tài khoản 131111 + KHÁCH HÀNG + TỪ/ĐẾN NGÀY), SỐ DƯ ĐẦU
 * KỲ 2 ô Nợ|Có, bảng STT | CHỨNG TỪ (NGÀY | SỐ) | DIỄN GIẢI | SỐ PHÁT SINH
 * (NỢ | CÓ) với mỗi chứng từ một STT (nhiều dòng nghiệp vụ dưới một STT),
 * TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ 2 ô, khối ký tên. KHÔNG TK ĐỐI ỨNG, KHÔNG
 * cột dư từng dòng. Money renders exactly as delivered by the API (integer
 * VND) — no recomputation.
 */

const tripLine = (description: string, debit: number): StatementVoucherLine => ({
  description,
  debit,
  credit: 0,
});
const paymentLine = (description: string, credit: number): StatementVoucherLine => ({
  description,
  debit: 0,
  credit,
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
    expect(getByText('131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG')).toBeTruthy();
    expect(getByText('KHÁCH HÀNG: Công ty TNHH Test (0312345678)')).toBeTruthy();
    expect(getByText('TỪ NGÀY 01/10/2026 ĐẾN NGÀY 31/10/2026')).toBeTruthy();
  });

  it('renders dư đầu kỳ in the Nợ cell — tháng 10 mở sổ với dư nợ months 1-9', () => {
    const { getByTestId } = render(<StatementLedger fast={fastFixture()} />);
    const openingRow = getByTestId('so-ke-opening-row');
    const cells = within(openingRow).getAllByRole('cell');
    expect(cells[0].textContent).toBe('SỐ DƯ ĐẦU KỲ');
    expect(cells[1].textContent).toBe('12.000.000 ₫'); // dư dương → ô NỢ
    expect(cells[2].textContent).toBe(''); // ô CÓ rỗng khi dư là Nợ
  });

  it('mỗi chứng từ một STT, nhiều dòng nghiệp vụ dưới một STT (cước + chi hộ)', () => {
    const { getAllByRole } = render(<StatementLedger fast={fastFixture()} />);

    const rows = getAllByRole('row');
    const revenueRow = rows.find((r) => r.textContent?.includes('Doanh thu chuyến — Hải Phòng — Hà Nội'));
    const chiHoRow = rows.find((r) => r.textContent?.includes('Phí chi hộ'));
    expect(revenueRow).toBeTruthy();
    expect(chiHoRow).toBeTruthy();
    const revenueCells = within(revenueRow!).getAllByRole('cell');
    const chiHoCells = within(chiHoRow!).getAllByRole('cell');
    expect(revenueCells[0].textContent).toBe('1'); // STT trên dòng đầu của chứng từ
    expect(revenueCells[1].textContent).toBe('04/07/2026');
    expect(chiHoCells[0].textContent).toBe(''); // dòng 2 của chứng từ không lặp STT
    expect(chiHoCells[1].textContent).toBe(''); // dòng 2 không lặp NGÀY chứng từ
    expect(chiHoCells[2].textContent).toBe(''); // dòng 2 không lặp SỐ chứng từ
  });

  it('payment voucher reads KH trả … and carries no TK ĐỐI ỨNG column anywhere', () => {
    const { getByTestId, queryByText } = render(<StatementLedger fast={fastFixture()} />);
    const paymentRow = getByTestId('so-ke-payment-row');
    expect(within(paymentRow).getByText('KH trả 12.000.000 ₫ ngày 15/10/2026 (chuyển khoản)')).toBeTruthy();

    expect(queryByText('TK ĐỐI ỨNG')).toBeNull(); // khách bỏ cột TK đối ứng
    const headers = getAllHeaderCells(paymentRow);
    expect(headers.join(' ')).not.toContain('DƯ');
  });

  it('renders TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ 2 ô Nợ|Có without recomputing', () => {
    const { getByTestId, getByText } = render(<StatementLedger fast={fastFixture()} />);
    const closingRow = getByTestId('so-ke-closing-row');
    const cells = within(closingRow).getAllByRole('cell');
    expect(cells[0].textContent).toBe('SỐ DƯ CUỐI KỲ');
    expect(cells[1].textContent).toBe('15.000.000 ₫');
    expect(cells[2].textContent).toBe('');
    const totalsRow = getByText('TỔNG PHÁT SINH').closest('tr');
    expect(within(totalsRow!).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'TỔNG PHÁT SINH',
      '15.000.000 ₫',
      '12.000.000 ₫',
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
    expect(cells[0].textContent).toBe('SỐ DƯ CUỐI KỲ');
    expect(cells[1].textContent).toBe(''); // ô NỢ rỗng khi dư là Có
    expect(cells[2].textContent).toBe('7.000.000 ₫'); // dư âm → ô CÓ (khách trả trước)
  });

  it('renders the signature block: NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG + ngày tháng năm', () => {
    const { getByText, getByLabelText } = render(<StatementLedger fast={fastFixture()} />);
    const sign = getByLabelText('Chữ ký');
    expect(within(sign).getByText('NGƯỜI LẬP BIỂU')).toBeTruthy();
    expect(within(sign).getByText('KẾ TOÁN TRƯỞNG')).toBeTruthy();
    expect(getByText('Ngày …… tháng …… năm ……')).toBeTruthy();
  });

  it('renders the empty state without footer/signatures when the kỳ has no vouchers', () => {
    const { getByText, queryByText, queryByLabelText } = render(<StatementLedger fast={fastFixture({ vouchers: [] })} isLoading={false} />);
    expect(getByText('Không có giao dịch trong kỳ')).toBeTruthy();
    expect(queryByText('TỔNG PHÁT SINH')).toBeNull();
    expect(queryByLabelText('Chữ ký')).toBeNull();
  });
});

/** Header cells of the table the given row belongs to (asserts column set). */
function getAllHeaderCells(row: HTMLElement): string[] {
  const table = row.closest('table');
  return Array.from(table?.querySelectorAll('thead th') ?? []).map((th) => th.textContent ?? '');
}
