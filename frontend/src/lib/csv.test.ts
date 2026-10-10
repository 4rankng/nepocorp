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
