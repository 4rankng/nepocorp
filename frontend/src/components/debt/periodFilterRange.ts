// Period-range math for the AR/AP detail ledger filter. Split out of
// `PeriodFilter.tsx` so the component module exports only components (React
// Fast Refresh); both detail pages import the range helpers from here.

export type PeriodMode = 'month' | 'range';

export interface PeriodRange {
  dateFrom: string;
  dateTo: string;
}

/**
 * Resolve the active mode + inputs into a single { dateFrom, dateTo } range
 * the parent can pass into the API hook. Kept here so both detail pages share
 * one source of truth for "first/last day of month" math.
 */
export function resolvePeriodRange(opts: {
  mode: PeriodMode;
  month: number;
  year: number;
  dateFrom: string;
  dateTo: string;
}): PeriodRange {
  if (opts.mode === 'range') {
    return { dateFrom: opts.dateFrom, dateTo: opts.dateTo };
  }
  return monthToRange(opts.year, opts.month);
}

/** [first day, last day] of the given (year, month 1–12), as ISO yyyy-mm-dd. */
export function monthToRange(year: number, month: number): PeriodRange {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // day 0 of next month = last day
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: toIso(firstDay), dateTo: toIso(lastDay) };
}

/**
 * Handle a mode switch so the two modes stay in sync:
 *   - Switching TO range: seed the date inputs from the current month/year so
 *     the user starts from a sensible range rather than whatever stale custom
 *     range was last entered.
 *   - Switching TO month: nothing to re-derive (month mode reads month/year).
 */
export function applyModeSwitch(
  prev: { mode: PeriodMode; month: number; year: number; dateFrom: string; dateTo: string },
  nextMode: PeriodMode,
): { mode: PeriodMode; month: number; year: number; dateFrom: string; dateTo: string } {
  if (nextMode === prev.mode) return prev;
  if (nextMode === 'range') {
    const seeded = monthToRange(prev.year, prev.month);
    return { ...prev, mode: 'range', dateFrom: seeded.dateFrom, dateTo: seeded.dateTo };
  }
  return { ...prev, mode: 'month' };
}

/** Default initial state for a detail page's period filter (current month). */
export function initialPeriodState() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1–12
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    mode: 'month' as PeriodMode,
    month,
    year,
    dateFrom: toIso(firstDay),
    dateTo: toIso(lastDay),
  };
}

/**
 * Period state aligned to the month of the ledger's latest activity. The
 * detail pages call this once their statement loads so the filter opens on
 * the month that actually has data — the current month is often empty and
 * reads as "Không có giao dịch".
 * Returns null when there is no activity (leave the default untouched).
 */
export function periodFromLatestActivity(
  latestActivityDate: string | null | undefined,
): { mode: PeriodMode; month: number; year: number; dateFrom: string; dateTo: string } | null {
  if (!latestActivityDate || !/^\d{4}-\d{2}-\d{2}/.test(latestActivityDate)) return null;
  const [year, month] = latestActivityDate.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  const range = monthToRange(year, month);
  return { mode: 'month', month, year, ...range };
}
