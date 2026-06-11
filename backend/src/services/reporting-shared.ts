/**
 * Reporting Shared Utilities
 *
 * Date-range helpers and utility functions shared across reporting sub-modules.
 */

import { resolveSalaryPeriodDateRange, resolveQuarterDateRange } from './salary-period.service';

/** Local date string (YYYY-MM-DD) using system timezone — avoids toISOString() UTC drift. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Add one day to a YYYY-MM-DD date string using pure arithmetic.
 * Avoids Date/toISOString which shifts dates in non-UTC timezones (e.g. UTC+7 Vietnam).
 */
export function addDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + 1); // day+1 handles month/year rollover
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Build a [start, exclusive_end) date range for a calendar month/year. Used for trip code counters. */
export function calendarMonthDateRange(year: number, month?: number) {
  if (month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    return { start, end };
  }
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

/** @deprecated Use calendarMonthDateRange or salaryPeriodDateRange instead */
export const monthDateRange = calendarMonthDateRange;

/**
 * Resolve salary-period-aware date range for a given month/year.
 * Returns { start, end } where start is inclusive and end is exclusive (next day).
 */
export async function salaryPeriodDateRange(month: number, year: number) {
  const resolved = await resolveSalaryPeriodDateRange(month, year);
  // Convert inclusive end to exclusive end for SQL comparisons
  // Uses local date arithmetic to avoid toISOString() timezone shift
  const exclusiveEnd = addDay(resolved.end);
  return { start: resolved.start, end: exclusiveEnd };
}

/**
 * Resolve quarter date range with exclusive end for SQL comparisons.
 */
export async function quarterDateRange(quarter: number, year: number) {
  const { start: qStart, end: qEndRaw } = await resolveQuarterDateRange(quarter, year);
  const qEnd = addDay(qEndRaw);
  return { start: qStart, end: qEnd };
}

// ─── Cap-table helpers (shared between dashboard-stats and profit-distribution) ──

type CapRow = { partnerName: string; effectiveDate: string; createdAt: Date | string; contributionAmount: string | null; percentage: string | null };

/**
 * Resolve the active cap-table snapshot as of a cutoff date.
 * Picks the latest effective date ≤ cutoff, deduplicates by partner name
 * (keeping the row with the newest createdAt), then auto-calculates
 * percentages from contribution amounts.
 */
export function resolveCapTableSnapshot(
  capRows: CapRow[],
  cutoffDate: string,
): Array<{ partnerName: string; contributionAmount: number; percentage: number }> {
  const reached = capRows.filter(c => c.partnerName && c.effectiveDate <= cutoffDate);
  const pool = reached.length > 0 ? reached : capRows;
  if (pool.length === 0) return [];

  const latestDate = pool.reduce((acc, c) => (c.effectiveDate > acc ? c.effectiveDate : acc), pool[0].effectiveDate);
  const snapshot = pool.filter(c => c.effectiveDate === latestDate);
  const byName = new Map<string, CapRow>();
  for (const row of snapshot) {
    const prev = byName.get(row.partnerName);
    if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) byName.set(row.partnerName, row);
  }

  const rows = Array.from(byName.values());

  // Use stored percentage if all partners have explicit percentages set;
  // otherwise fall back to calculating from contributionAmount.
  const hasStoredPct = rows.every(r => parseFloat(r.percentage ?? '0') > 0);
  if (hasStoredPct) {
    return rows.map(r => ({
      partnerName: r.partnerName,
      contributionAmount: parseFloat(r.contributionAmount ?? '0') || 0,
      percentage: parseFloat(r.percentage ?? '0'),
    }));
  }

  const partners = rows.map(r => ({
    partnerName: r.partnerName,
    contributionAmount: parseFloat(r.contributionAmount ?? '0') || 0,
  }));

  const total = partners.reduce((sum, p) => sum + p.contributionAmount, 0);
  return partners.map(p => ({
    ...p,
    percentage: total > 0 ? Math.round((p.contributionAmount / total) * 10000) / 100 : 0,
  }));
}
