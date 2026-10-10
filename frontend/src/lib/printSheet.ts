import type { ColumnType } from './csv';
import { formatCurrency } from './format';
import { BRAND as APP_BRAND } from '../brand';

/**
 * Printable HTML sheet for on-screen pages that have no server-side print
 * endpoint.
 *
 * The supplier statement prints HTML served by the backend; the expense list has
 * no such endpoint, so staff were left with "Tải tổng kết" (.xlsx) and no print
 * or PDF control at all (kanban 091026235500, follow-up to 081026232560).
 *
 * The API mirrors `downloadCSV` — same headers / rows / options shape — so a
 * caller that already builds an export can hand the identical arguments here and
 * get a printable sheet, with no second data path to keep in sync. Values are
 * pre-formatted by the caller, exactly as `downloadCSV` expects.
 */

export interface PrintSheetOptions {
  /** Report title on the brand band. */
  title: string;
  /** Line under the title (period, filter description, …). */
  subtitle?: string;
  /** Per-column type metadata; drives alignment. Defaults to text everywhere. */
  columnTypes?: ColumnType[];
  /** Column indices summed into a totals row. Empty/absent hides the row. */
  totalsColumns?: number[];
  /** Label in the totals row's first cell. Defaults to "TỔNG CỘNG". */
  totalsLabel?: string;
}

const BRAND = '#0f766e';
const BRAND_SOFT = '#f0fdfa';
const INK = '#1e293b';
const INK_3 = '#64748b';

const escapeHtml = (value: string | number): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Currency/litre columns read better right-aligned; dates and text left. */
function alignFor(type: ColumnType): 'left' | 'right' | 'center' {
  switch (type) {
    case 'currency':
    case 'number':
    case 'km':
    case 'liters':
    case 'decimal':
      return 'right';
    case 'date':
      return 'center';
    default:
      return 'left';
  }
}

/** Parse a pre-formatted cell back to a number for the totals row. */
function toAmount(raw: string | number): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  const negative = cleaned.startsWith('-');
  const digits = cleaned.replace(/-/g, '');
  if (!digits) return null;
  // Cells arrive already formatted for display: `formatCurrency` writes vi-VN
  // groups ("5.159.636 ₫"), where the dot groups thousands. `parseFloat` stops
  // at the second dot, so a 5.159.636 ₫ line was summed as 5.159 and the
  // printed TỔNG CỘNG read "405,159" for rows totalling 5.559.636 ₫
  // (kanban 101026102000). A trailing ",dd" is the vi-VN decimal mark; any
  // other comma groups thousands.
  const decimalMarked = /,\d{1,2}$/.test(digits)
    ? digits.replace(/\./g, '').replace(',', '.')
    : digits.replace(/,/g, '');
  // Dots in repeated 3-digit groups are thousands separators, not a decimal point.
  const plain = /^\d{1,3}(?:\.\d{3})+$/.test(decimalMarked)
    ? decimalMarked.replace(/\./g, '')
    : decimalMarked;
  const value = parseFloat(plain);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function sumColumn(rows: (string | number)[][], index: number): number | null {
  let sum = 0;
  let seen = false;
  for (const row of rows) {
    const value = toAmount(row[index] ?? '');
    if (value === null) continue;
    sum += value;
    seen = true;
  }
  return seen ? sum : null;
}

export function buildPrintableSheetHtml(
  headers: string[],
  rows: (string | number)[][],
  options: PrintSheetOptions,
): string {
  const colCount = headers.length;
  const columnTypes: ColumnType[] =
    options.columnTypes && options.columnTypes.length === colCount
      ? options.columnTypes
      : headers.map(() => 'text' as ColumnType);

  const today = new Date();
  const dateStr = today.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const totalsCols = (options.totalsColumns ?? []).filter(i => i >= 0 && i < colCount);
  const showTotals = totalsCols.length > 0 && rows.length > 0;

  const headCells = headers
    .map((h, i) => `<th style="text-align:${alignFor(columnTypes[i])}">${escapeHtml(h)}</th>`)
    .join('');

  const bodyRows = rows
    .map(row => {
      const cells = headers
        .map((_, i) => {
          const raw = row[i];
          const shown = raw === '' || raw == null ? '—' : raw;
          return `<td style="text-align:${alignFor(columnTypes[i])}">${escapeHtml(shown)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const totalsRow = showTotals
    ? `<tr class="totals">${headers
        .map((_, i) => {
          if (i === 0) return `<td class="totals__label">${escapeHtml(options.totalsLabel ?? 'TỔNG CỘNG')}</td>`;
          if (!totalsCols.includes(i)) return '<td></td>';
          const sum = sumColumn(rows, i);
          // Money carries the same unit as the cells above it — never a bare
          // number (house rule: `formatCurrency`).
          return `<td style="text-align:right">${sum === null ? '' : escapeHtml(formatCurrency(sum))}</td>`;
        })
        .join('')}</tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${escapeHtml(options.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16mm 12mm;
    font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: ${INK};
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    margin: 0;
    padding: 10px 12px;
    background: ${BRAND_SOFT};
    border-bottom: 2px solid ${BRAND};
    color: ${BRAND};
    font-size: 16px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .meta { padding: 6px 12px 0; color: ${INK_3}; font-style: italic; }
  .meta span + span::before { content: " · "; font-style: normal; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  thead th {
    background: ${BRAND};
    color: #fff;
    font-weight: 600;
    font-size: 10.5px;
    white-space: nowrap;
  }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tfoot tr.totals td { border-top: 2px solid ${BRAND}; border-bottom: none; font-weight: 700; }
  tfoot .totals__label { text-align: left; }
  .empty { padding: 24px; text-align: center; color: ${INK_3}; font-style: italic; }
  footer {
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    color: ${INK_3};
    font-size: 9.5px;
    font-style: italic;
  }
  @page { size: landscape; margin: 8mm; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(options.title)}</h1>
  <div class="meta">${options.subtitle ? `<span>${escapeHtml(options.subtitle)}</span>` : ''}<span>Ngày xuất: ${escapeHtml(dateStr)}</span></div>
  ${rows.length === 0
    ? '<div class="empty">Không có dữ liệu trong khoảng thời gian đã chọn.</div>'
    : `<table>
        <thead><tr>${headCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>${totalsRow}</tfoot>
      </table>`}
  <footer>${escapeHtml(APP_BRAND.productName)} · Tài liệu nội bộ</footer>
</body>
</html>`;
}