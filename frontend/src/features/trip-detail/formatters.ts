/**
 * Pure formatting helpers for the Trip Detail page.
 * No React dependencies — safe to test in isolation.
 */

/** Format a number as Vietnamese currency without the ₫ symbol. */
export function fmtVND(n: number | null | undefined): string {
  if (n == null) return '—';
  return Math.round(n).toLocaleString('vi-VN');
}

/** Format a number as Vietnamese currency with ₫ suffix. */
export function fmtVNDWithUnit(n: number | null | undefined): string {
  if (n == null) return '— ₫';
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

/** Format a number as Vietnamese currency with ₫ symbol. */
export function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

/** Format liters with 1 decimal, e.g. "94,8 L". */
export function fmtLiters(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toFixed(1)} L`;
}

/** Format kilometers with locale grouping, e.g. "135 km". */
export function fmtKM(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} km`;
}

/** Format a percentage with 1 decimal, e.g. "60,9". */
export function fmtPercent(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toFixed(1).replace('.', ',');
}

/**
 * Format a VAT rate held as a fraction as the percentage the label shows:
 * 0.08 → "8", 0.085 → "8,5". Whole rates drop the decimal so the label reads
 * "Thuế VAT đầu ra 8%" rather than "8,0%".
 */
export function formatVatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '0';
  const pct = rate * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace('.', ',');
}

/** Format an ISO date string to Vietnamese locale, e.g. "02/06/2026". */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Calculate fuel consumption rate (liters per 100km). */
export function calcTTBQ(liters: number, km: number): number {
  if (km <= 0 || liters <= 0) return 0;
  return (liters / km) * 100;
}
