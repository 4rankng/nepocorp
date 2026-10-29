import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import { downloadCSV } from './csv';
import { downloadBlob } from './download';
import { formatCurrency } from './format';

vi.mock('./download', () => ({ downloadBlob: vi.fn() }));

/**
 * The regression these lock down (kanban 101026102000): callers hand the
 * workbook rows that `formatCurrency` already formatted ("5.159.636 ₫"), and the
 * vi-VN dot groups thousands. Reading it with `parseFloat` stored 5.159 for a
 * 5.159.636 ₫ amount, and the totals cell — an Excel SUM() over those cells —
 * then reported 405.159 for a 5.559.636 ₫ sheet.
 */
const captureWorkbook = async (
  rows: (string | number)[][],
  options: Parameters<typeof downloadCSV>[3],
): Promise<ExcelJS.Worksheet> => {
  await downloadCSV('bao-cao.xlsx', ['Mô tả', 'Số tiền'], rows, options);
  const blob = vi.mocked(downloadBlob).mock.calls.at(-1)?.[0];
  if (!blob) throw new Error('downloadBlob was not called');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('workbook has no sheet');
  return sheet;
};

describe('downloadCSV currency cells', () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockClear();
  });

  it('stores a formatCurrency amount as its real value, not its first dot-group', async () => {
    const sheet = await captureWorkbook(
      [
        ['Phí đăng kiểm', formatCurrency(5_159_636)],
        ['Điện đèn còi', formatCurrency(250_000)],
        ['Làm lốp', formatCurrency(150_000)],
      ],
      { columnTypes: ['text', 'currency'], totalsColumns: [1] },
    );

    // header is row 5, so the three data rows are 6..8
    expect(sheet.getCell('B6').value).toBe(5_159_636);
    expect(sheet.getCell('B7').value).toBe(250_000);
    expect(sheet.getCell('B8').value).toBe(150_000);
    // The totals cell sums the cells above it, so it is only right if they are.
    expect(sheet.getCell('B9').value).toEqual({ formula: 'SUM(B6:B8)' });
    const stored = ['B6', 'B7', 'B8'].reduce((sum, ref) => sum + Number(sheet.getCell(ref).value), 0);
    expect(stored).toBe(5_559_636);
  });

  it('keeps a cell with no recognizable amount as text', async () => {
    const sheet = await captureWorkbook([['Không rõ', '— ₫']], {
      columnTypes: ['text', 'currency'],
    });
    expect(sheet.getCell('B6').value).toBe('— ₫');
  });
});

describe('downloadCSV title band (NEPO-620)', () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockClear();
  });

  it('grows and wraps the subtitle row instead of clipping it on a narrow sheet', async () => {
    // The A2:B2 merge on this 2-column sheet is exactly the shape that used to
    // clip: a merged cell does not overflow, so the subtitle was cut mid-word.
    const subtitle =
      'Tháng 10/2026 · Hạn mức 5.000 request · Trung bình 400 lượt/ngày · Phát sinh: 50 request × 200 ₫ = 10.000 ₫';
    const sheet = await captureWorkbook([['Xăng', '100']], { subtitle });

    expect(sheet.getCell('A2').value).toBe(subtitle);
    expect(sheet.getCell('A2').alignment?.wrapText).toBe(true);
    // A single-line height (18) is the bug — the wrapped text needs the row.
    expect(sheet.getRow(2).height ?? 0).toBeGreaterThan(30);
  });

  it('keeps a subtitle that fits at its single-line height', async () => {
    const sheet = await captureWorkbook([['Xăng', '100']], { subtitle: 'Tóm tắt nhanh' });
    expect(sheet.getRow(2).height).toBe(18);
    expect(sheet.getCell('A2').alignment?.wrapText).toBe(true);
  });
});
