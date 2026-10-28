import { z } from 'zod';

/**
 * AI image OCR usage control (ticket NEPO-27): a monthly allowance of AI OCR
 * requests plus a per-call price charged for usage beyond the allowance.
 *
 * Both values are ADMIN-configurable via /admin/ocr-usage and stored as two
 * app_settings rows under the `ocr_usage.*` prefix. The numbers below are the
 * owner's EXAMPLE defaults (10000 requests/month, 200 ₫/call) — they seed a
 * fresh install but any saved value overrides them.
 */
export const OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE = 10000;
export const OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL = 200;

export const ocrUsageSettingsUpdateSchema = z.object({
  /** AI OCR requests allowed per calendar month before overage billing starts. */
  monthlyAllowance: z
    .number()
    .int('Hạn mức phải là số nguyên')
    .min(0, 'Hạn mức không được âm')
    .max(100_000_000, 'Hạn mức quá lớn'),
  /** VND charged per request beyond the monthly allowance. */
  overagePricePerCall: z
    .number()
    .int('Đơn giá phải là số nguyên')
    .min(0, 'Đơn giá không được âm')
    .max(1_000_000_000, 'Đơn giá quá lớn'),
});

export type OcrUsageSettingsUpdate = z.infer<typeof ocrUsageSettingsUpdateSchema>;

export interface OcrUsageSettingsResponse {
  monthlyAllowance: number;
  overagePricePerCall: number;
}

/** One calendar day of OCR activity. `date` is 'YYYY-MM-DD'. */
export interface OcrUsageDailyPoint {
  date: string;
  count: number;
}

/**
 * Current-month usage snapshot for the dashboard widget. `period` is the
 * 'YYYY-MM' calendar month the counter refers to (server-local), so the UI can
 * label the figures and the counter reset is implicit: a new month simply has
 * no counter row yet.
 *
 * The daily series covers every ELAPSED day of the period, zero-filled: a day
 * without scans is a real measurement of zero, not missing data — the chart
 * must keep the calendar cadence instead of gapping it. Days that have not
 * happened yet are NOT in the series; the chart draws them as empty ticks
 * (a different visual state from a measured zero) using `daysInMonth`.
 */
export interface OcrUsageStatus extends OcrUsageSettingsResponse {
  period: string;
  /** AI OCR requests counted in `period`. */
  used: number;
  /** allowance − used, floored at 0. */
  remaining: number;
  /** used − allowance, floored at 0. */
  overageCount: number;
  /** overageCount × overagePricePerCall, in VND. */
  overageCost: number;
  /** Days elapsed in the period so far (1 on the 1st, 28 on the 28th). */
  elapsedDays: number;
  /** Total days in the period (28/29/30/31). */
  daysInMonth: number;
  /** Daily counts for every day of the period, zero-filled, in date order. */
  daily: OcrUsageDailyPoint[];
  /** Requests per elapsed day — the run-rate baseline. */
  dailyAverage: number;
  /** Straight-line projection of the month-end total at the current run-rate. */
  projectedTotal: number;
}

export const OCR_USAGE_PATHS = {
  /** ADMIN settings (GET/PUT) — mounted under /api/admin. */
  adminBase: '/admin/ocr-usage',
  /** Current-month status for the dashboard — mounted under /api/reports. */
  status: '/reports/ocr-usage',
} as const;
