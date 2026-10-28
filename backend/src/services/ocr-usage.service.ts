// AI OCR usage tracking (ticket NEPO-27, daily series NEPO-28) — request
// counter plus the ADMIN-configurable allowance / overage price settings.
//
// Storage mirrors services/llm/settings.ts:
//   - the counter lives in its own table (ocr_usage_counters, one row per
//     calendar DAY — the monthly total is the SUM of the month's rows, so a
//     new month resets implicitly with no cron job);
//   - the two settings live as app_settings rows under the `ocr_usage.*`
//     prefix, cached in memory and invalidated after an admin save.
//
// Defaults are the owner's example figures (10000 requests/month, 200 ₫/call)
// carried by @tingting/shared so a fresh install behaves sensibly before any
// admin save — they are defaults, not hard-coded limits.
import { db } from '../db';
import * as s from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE,
  OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL,
  buildOcrUsageDailySeries,
  computeOcrUsageStatus,
  ocrUsageDateKey,
  ocrUsageDaysInMonth,
  ocrUsagePeriodKey,
  type OcrUsageSettingsResponse,
  type OcrUsageStatus,
} from '@tingting/shared';

const KEY_ALLOWANCE = 'ocr_usage.monthly_allowance';
const KEY_OVERAGE_PRICE = 'ocr_usage.overage_price_per_call';

interface OcrUsageSettings {
  monthlyAllowance: number;
  overagePricePerCall: number;
}

let cached: OcrUsageSettings | null = null;

/** Parse a stored setting, falling back to the default on absence/corruption. */
function parseCount(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Load the allowance + per-call price, falling back to the example defaults. */
export async function getOcrUsageSettings(): Promise<OcrUsageSettings> {
  if (cached) return cached;
  const rows = await db
    .select()
    .from(s.appSettings)
    .where(inArray(s.appSettings.key, [KEY_ALLOWANCE, KEY_OVERAGE_PRICE]));

  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const settings: OcrUsageSettings = {
    monthlyAllowance: parseCount(byKey.get(KEY_ALLOWANCE), OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE),
    overagePricePerCall: parseCount(byKey.get(KEY_OVERAGE_PRICE), OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL),
  };
  cached = settings;
  return settings;
}

/** Drop the in-memory settings cache — called by the admin PUT after a save. */
export function invalidateOcrUsageSettings(): void {
  cached = null;
}

/** Admin-facing settings snapshot (the two configured numbers). */
export async function getOcrUsageSettingsResponse(): Promise<OcrUsageSettingsResponse> {
  const { monthlyAllowance, overagePricePerCall } = await getOcrUsageSettings();
  return { monthlyAllowance, overagePricePerCall };
}

/**
 * Persist the settings atomically (two upserts) and drop the cache so the next
 * read — and the next billing computation — sees the new values immediately.
 */
export async function saveOcrUsageSettings(
  next: OcrUsageSettings,
): Promise<OcrUsageSettingsResponse> {
  const rows = [
    { key: KEY_ALLOWANCE, value: String(next.monthlyAllowance) },
    { key: KEY_OVERAGE_PRICE, value: String(next.overagePricePerCall) },
  ];
  await db
    .insert(s.appSettings)
    .values(rows)
    .onConflictDoUpdate({
      target: s.appSettings.key,
      set: { value: sql`excluded.setting_value`, updatedAt: new Date() },
    });
  invalidateOcrUsageSettings();
  return { monthlyAllowance: next.monthlyAllowance, overagePricePerCall: next.overagePricePerCall };
}

/**
 * Count ONE AI image OCR request against the current calendar day.
 *
 * Called once per recognition request from the OCR route (internal provider
 * fallback — OpenRouter miss → Gemini retry — is one user-facing request, not
 * two). Never throws: a counter hiccup must not fail an OCR the driver is
 * standing in front of; it only logs.
 */
export async function recordOcrRequest(): Promise<void> {
  const usageDate = ocrUsageDateKey();
  try {
    await db
      .insert(s.ocrUsageCounters)
      .values({ usageDate, requestCount: 1 })
      .onConflictDoUpdate({
        target: s.ocrUsageCounters.usageDate,
        set: {
          requestCount: sql`${s.ocrUsageCounters.requestCount} + 1`,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error(`[ocr-usage] failed to increment ${usageDate}:`, error);
  }
}

/**
 * Dashboard snapshot for the current calendar month: used vs allowance,
 * remaining, the overage count/cost once the allowance is exceeded, and the
 * daily series + run-rate figures the chart needs (NEPO-28).
 */
export async function getOcrUsageStatus(): Promise<OcrUsageStatus> {
  const period = ocrUsagePeriodKey();
  const daysInMonth = ocrUsageDaysInMonth(period);
  const today = new Date();
  const elapsedDays = Math.min(daysInMonth, Math.max(1, today.getDate()));

  const [settings, rows] = await Promise.all([
    getOcrUsageSettings(),
    db
      .select({ usageDate: s.ocrUsageCounters.usageDate, requestCount: s.ocrUsageCounters.requestCount })
      .from(s.ocrUsageCounters)
      .where(sql`${s.ocrUsageCounters.usageDate} LIKE ${`${period}-%`}`),
  ]);

  const counts = new Map<string, number>();
  let used = 0;
  for (const row of rows) {
    counts.set(row.usageDate, row.requestCount);
    used += row.requestCount;
  }

  return computeOcrUsageStatus(settings, used, period, {
    elapsedDays,
    daysInMonth,
    daily: buildOcrUsageDailySeries(period, counts, elapsedDays),
  });
}
