export function formatNumber(n: number | string | null): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return num.toLocaleString('vi-VN');
}

export function formatCompact(n: number | string | null): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toLocaleString('vi-VN');
}

export function formatCurrency(n: number | string | null): string {
  if (n == null) return '— ₫';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '— ₫';
  return `${num.toLocaleString('vi-VN')} ₫`;
}

/**
 * Read a formatted amount back into a number — the inverse of `formatCurrency`
 * and `formatNumber`.
 *
 * The vi-VN separators are the whole subtlety: a dot groups thousands
 * ("5.159.636 ₫") while a comma marks the decimal ("1.234,5 ₫") — the opposite
 * of what `parseFloat` reads. `parseFloat('5.159.636 ₫')` stops at the second
 * dot and answers 5.159, so every export that handed a `formatCurrency` string
 * over to a workbook or a printed total recorded 5.159 for a 5.159.636 ₫
 * amount: the xlsx column, its `SUM()` and the printed TỔNG CỘNG all came out
 * as 405,159 for a 5.559.636 ₫ sheet (kanban 101026102000).
 *
 * Returns null when the cell holds no recognizable amount, so a caller can keep
 * the original text or leave the cell out of a sum.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  const negative = cleaned.startsWith('-');
  const digits = cleaned.replace(/-/g, '');
  if (!digits) return null;
  // A trailing ",dd" is the vi-VN decimal mark; any other comma groups thousands.
  const decimalMarked = /,\d{1,2}$/.test(digits)
    ? digits.replace(/\./g, '').replace(',', '.')
    : digits.replace(/,/g, '');
  // Dots in repeated 3-digit groups group thousands ("1.234.567"), they are not a decimal point.
  const plain = /^\d{1,3}(?:\.\d{3})+$/.test(decimalMarked)
    ? decimalMarked.replace(/\./g, '')
    : decimalMarked;
  const value = parseFloat(plain);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/**
 * Split a VND amount into a big numeric part and a smaller unit/suffix part,
 * so the unit ("₫", or "tr ₫" / "tỷ ₫" / "k ₫" when compact) can be rendered
 * at subtitle size next to the digits.
 *
 * - `compact: false` → full number, e.g. { num: "12.500.000", unit: "₫" }
 * - `compact: true`  → short number, e.g. { num: "12,5", unit: "tr ₫" }
 *
 * `format` is a live formatter matching the chosen scale, for counter
 * animations that write only the numeric part (unit stays static).
 */
export interface MoneyParts {
  num: string;
  unit: string;
  format: (v: number) => string;
}

export function moneyParts(amount: number, compact: boolean): MoneyParts {
  const abs = Math.abs(amount);
  if (compact && abs >= 1_000) {
    const scale = abs >= 1_000_000_000 ? 1_000_000_000 : abs >= 1_000_000 ? 1_000_000 : 1_000;
    const suffix = scale === 1_000_000_000 ? 'tỷ' : scale === 1_000_000 ? 'tr' : 'k';
    const fmt = (v: number) => (v / scale).toFixed(1).replace(/\.0$/, '');
    return { num: fmt(amount), unit: `${suffix} ₫`, format: fmt };
  }
  const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
  return { num: fmt(amount), unit: '₫', format: fmt };
}

/**
 * The digits only — no unit.
 *
 * For columns and subtotals whose header already carries the unit ("Số tiền
 * (₫)", "Thành tiền"), so repeating ₫ on every row is noise.
 *
 * This replaces the long-standing `formatCurrency(n).replace(' ₫', '')`
 * string-surgery, which broke in two ways: it silently depended on
 * `formatCurrency` keeping that exact space-₫ pair, and callers that then
 * appended their own `'đ'` produced amounts glued to the unit with the wrong
 * glyph — "331.451.555đ" beside tables reading "331.451.555 ₫"
 * (kanban 091026235520).
 */
export function formatAmount(n: number | string | null): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return num.toLocaleString('vi-VN');
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Format a timestamp as Vietnam wall-clock (Asia/Ho_Chi_Minh) on ANY host.
 * The locale argument alone ('vi-VN') only shapes numbers/dates — it does NOT
 * set the timezone, so toLocaleString would otherwise render in the runtime's
 * local zone (e.g. a GMT+8 machine shows device time +8h). GPS "last seen" and
 * other device timestamps must always read as Vietnam time, so set timeZone
 * explicitly here. Accepts ISO string | epoch | Date | null/empty.
 */
export function formatDateTimeVN(
  value: string | number | Date | null | undefined,
): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
}

export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
