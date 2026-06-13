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

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN');
}

export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
