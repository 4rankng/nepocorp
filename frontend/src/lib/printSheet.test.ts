import { describe, it, expect } from 'vitest';
import { buildPrintableSheetHtml } from './printSheet';

/**
 * The expense pages had no print control at all, only the .xlsx export
 * (kanban 091026235500). These lock the sheet down so the printed output stays
 * consistent with the export it shares its rows with.
 */
const HEADERS = ['Ngày phát sinh', 'Nhà cung cấp', 'Số tiền', 'Trạng thái'];
const TYPES = ['date', 'text', 'currency', 'text'] as const;
const ROWS: (string | number)[][] = [
  ['03/10/2026', 'Trạm dầu Kim Oanh', 1_500_000, 'Đã thanh toán'],
  ['05/10/2026', 'Trạm dầu Kim Oanh', 2_250_000, 'Ghi nợ'],
];

const base = { title: 'Tổng kết chi phí phát sinh', subtitle: 'Kỳ 01/10/2026 – 31/10/2026' };

describe('buildPrintableSheetHtml', () => {
  it('renders a complete document with the title and period', () => {
    const html = buildPrintableSheetHtml(HEADERS, ROWS, { ...base, columnTypes: [...TYPES] });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Tổng kết chi phí phát sinh');
    expect(html).toContain('Kỳ 01/10/2026 – 31/10/2026');
    expect(html).toContain('</html>');
  });

  it('lists every row and sums the currency column', () => {
    const html = buildPrintableSheetHtml(HEADERS, ROWS, {
      ...base,
      columnTypes: [...TYPES],
      totalsColumns: [2],
    });
    expect(html).toContain('Trạm dầu Kim Oanh');
    expect(html).toContain('Ghi nợ');
    expect(html).toContain('TỔNG CỘNG');
    // 1.500.000 + 2.250.000
    expect(html).toContain('3.750.000');
  });

  it('omits the totals row when no column is requested', () => {
    const html = buildPrintableSheetHtml(HEADERS, ROWS, { ...base, columnTypes: [...TYPES] });
    expect(html).not.toContain('TỔNG CỘNG');
  });

  /**
   * The expense list hands over `formatCurrency` output, and vi-VN groups
   * thousands with a dot. `parseFloat` reads "5.159.636 ₫" as 5.159, so the
   * printed sheet totalled a 5.159.636 ₫ column as "405,159" (kanban
   * 101026102000).
   */
  it('sums pre-formatted vi-VN amounts, unit and all', () => {
    const html = buildPrintableSheetHtml(
      ['Ngày phát sinh', 'Số tiền'],
      [['03/10/2026', '5.159.636 ₫'], ['03/10/2026', '250.000 ₫'], ['02/10/2026', '150.000 ₫']],
      { ...base, columnTypes: ['date', 'currency'], totalsColumns: [1] },
    );
    expect(html).toMatch(/<td style="text-align:right">5\.559\.636 ₫<\/td>/);
  });

  it('reads a vi-VN decimal comma and a negative amount', () => {
    const html = buildPrintableSheetHtml(
      ['Mô tả', 'Số tiền'],
      [['A', '1.234,56 ₫'], ['B', '-250.000 ₫']],
      { ...base, columnTypes: ['text', 'currency'], totalsColumns: [1] },
    );
    expect(html).toContain('-248.765,44 ₫');
  });

  it('renders an empty period as a message, not a bare table', () => {
    const html = buildPrintableSheetHtml(HEADERS, [], { ...base, columnTypes: [...TYPES], totalsColumns: [2] });
    expect(html).toContain('Không có dữ liệu');
    expect(html).not.toContain('<table>');
  });

  /**
   * Supplier and note fields are free text. Unescaped, a value containing a
   * closing tag would end the cell early and break the printed layout.
   */
  it('escapes cell content', () => {
    const html = buildPrintableSheetHtml(
      ['Ghi chú'],
      [['<script>alert(1)</script>']],
      { ...base, columnTypes: ['text'] },
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('right-aligns currency columns and centres dates', () => {
    const html = buildPrintableSheetHtml(HEADERS, ROWS, { ...base, columnTypes: [...TYPES] });
    expect(html).toMatch(/<th style="text-align:center">Ngày phát sinh<\/th>/);
    expect(html).toMatch(/<th style="text-align:right">Số tiền<\/th>/);
  });
});