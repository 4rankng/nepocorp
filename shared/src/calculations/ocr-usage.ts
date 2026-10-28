/**
 * OCR usage billing + run-rate math (ticket NEPO-27, chart series NEPO-28) —
 * pure, shared by the backend status endpoint and the dashboard widget so both
 * sides can never disagree on what "over the allowance" means.
 *
 * All inputs are integers; VND has no decimals (project convention).
 */
import type { OcrUsageDailyPoint, OcrUsageStatus } from '../schemas/ocr-usage';

export interface OcrUsageSettingsInput {
  monthlyAllowance: number;
  overagePricePerCall: number;
}

/** Optional context the status snapshot needs beyond the two settings. */
export interface OcrUsagePeriodContext {
  /** Days elapsed in the period so far (1 on the 1st). */
  elapsedDays: number;
  /** Total days in the period. */
  daysInMonth: number;
  /** Daily counts, zero-filled for the whole period, in date order. */
  daily: OcrUsageDailyPoint[];
}

/**
 * Compose the dashboard snapshot from the live settings and this month's
 * counter. Remaining and overage are mutually exclusive by construction:
 * below the allowance everything left is `remaining`; from the first request
 * past it, every extra request is `overageCount` and costed at the configured
 * per-call price.
 *
 * `context` is optional so the original three-argument call keeps working —
 * without it the run-rate figures (daily series, average, projection) are
 * reported as zero/empty rather than guessed.
 */
export function computeOcrUsageStatus(
  settings: OcrUsageSettingsInput,
  used: number,
  period: string,
  context?: OcrUsagePeriodContext,
): OcrUsageStatus {
  const safeUsed = Math.max(0, Math.floor(used));
  const overageCount = Math.max(0, safeUsed - settings.monthlyAllowance);
  const elapsedDays = Math.max(0, Math.floor(context?.elapsedDays ?? 0));
  const daysInMonth = Math.max(0, Math.floor(context?.daysInMonth ?? 0));
  const daily = context?.daily ?? [];
  const dailyAverage = elapsedDays > 0 ? Math.round(safeUsed / elapsedDays) : 0;
  const projectedTotal = elapsedDays > 0 ? Math.round((safeUsed / elapsedDays) * daysInMonth) : 0;

  return {
    monthlyAllowance: settings.monthlyAllowance,
    overagePricePerCall: settings.overagePricePerCall,
    period,
    used: safeUsed,
    remaining: Math.max(0, settings.monthlyAllowance - safeUsed),
    overageCount,
    overageCost: overageCount * settings.overagePricePerCall,
    elapsedDays,
    daysInMonth,
    daily,
    dailyAverage,
    projectedTotal,
  };
}

/**
 * Calendar-month key ('YYYY-MM') in the SERVER-LOCAL timezone. Mirrors
 * reporting-shared's localDateStr — toISOString() would drift to the previous
 * day/month for UTC+7 evenings after midnight UTC. The key IS the reset
 * mechanism: each month writes its own counter row, so no reset job exists.
 */
export function ocrUsagePeriodKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Calendar-day key ('YYYY-MM-DD') in the SERVER-LOCAL timezone. Same drift
 * caveat as {@link ocrUsagePeriodKey}.
 */
export function ocrUsageDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days in the given 'YYYY-MM' period (1..31). */
export function ocrUsageDaysInMonth(period: string): number {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return 30;
  return new Date(year, month, 0).getDate();
}

/**
 * Zero-filled daily series for a whole period: every day of the month is
 * present, in date order, with 0 for the days without scans.
 *
 * A day without OCR requests is a MEASUREMENT of zero, not missing data —
 * the series must keep the calendar cadence so the chart's x-axis stays
 * continuous. Days beyond today are NOT included: the chart draws them as
 * empty ticks, which is a different visual state from a measured zero.
 */
export function buildOcrUsageDailySeries(
  period: string,
  counts: Map<string, number>,
  elapsedDays: number,
): OcrUsageDailyPoint[] {
  const days = ocrUsageDaysInMonth(period);
  const series: OcrUsageDailyPoint[] = [];
  for (let day = 1; day <= Math.min(days, elapsedDays); day++) {
    const date = `${period}-${String(day).padStart(2, '0')}`;
    series.push({ date, count: counts.get(date) ?? 0 });
  }
  return series;
}

/**
 * Attribute the month's overage to the days that generated it (NEPO-620).
 * `count` in each returned point is the number of OVERAGE requests that day —
 * costed at `overagePricePerCall` by the caller.
 *
 * Overage starts at the first request past `monthlyAllowance` and lands on the
 * day that request happened: day k carries
 *
 *   max(0, cum_k − allowance) − max(0, cum_{k−1} − allowance)
 *
 * so the series always sums to exactly `overageCount`
 * (used − allowance, floored at 0) — the daily report and the monthly tile
 * can never disagree. Days within the allowance report 0.
 */
export function buildOcrUsageDailyOverage(
  daily: OcrUsageDailyPoint[],
  monthlyAllowance: number,
): OcrUsageDailyPoint[] {
  let cumulative = 0;
  let overSoFar = 0;
  return daily.map(({ date, count }) => {
    cumulative += Math.max(0, Math.floor(count));
    const overNow = Math.max(0, cumulative - monthlyAllowance);
    const dayOverage = overNow - overSoFar;
    overSoFar = overNow;
    return { date, count: dayOverage };
  });
}
