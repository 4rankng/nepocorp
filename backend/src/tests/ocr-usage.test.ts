import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { eq, inArray, like } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE,
  OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL,
  ocrUsageDateKey,
  ocrUsageDaysInMonth,
  ocrUsagePeriodKey,
  type OcrUsageStatus,
} from '@tingting/shared';
import {
  getOcrUsageSettings,
  getOcrUsageStatus,
  invalidateOcrUsageSettings,
  recordOcrRequest,
  saveOcrUsageSettings,
} from '../services/ocr-usage.service';

/**
 * Service-layer tests for the AI OCR usage tracker (NEPO-27, daily grain
 * NEPO-28). Follows the `ocr-persist.test.ts` idiom: node:test + the real
 * (test) DB, namespaced cleanup, no HTTP harness.
 *
 * Pinned behaviour:
 *   - every recorded request increments the CURRENT DAY's row by 1;
 *   - the month's total is the SUM of its daily rows, and other days never
 *     leak into it (the monthly reset is the period filter, not a cron job);
 *   - the daily series is zero-filled for every elapsed day of the month and
 *     stops at today — a day without scans is a measured zero, not a gap;
 *   - the run-rate figures (daily average, projected month-end total) follow
 *     from the elapsed days;
 *   - the allowance / overage price are live settings with the owner's example
 *     figures as DEFAULTS — saved values (including non-example ones) win;
 *   - status math (remaining / overage count / overage cost) matches the
 *     shared calculation.
 */
const PERIOD = ocrUsagePeriodKey();
const TODAY = ocrUsageDateKey();
const SETTINGS_KEYS = ['ocr_usage.monthly_allowance', 'ocr_usage.overage_price_per_call'];
/** A day in a different month — must never leak into the current month. */
const OTHER_DAY = '2000-01-31';

/**
 * Restore the DB to its pre-test state: counter rows + settings rows.
 *
 * The whole CURRENT MONTH is wiped, not just today's row: the service always
 * reports the real calendar month, so a test that asserts on the month's
 * total has to own the month. Any local demo series
 * (scripts/seed-ocr-demo.ts) is therefore removed by a test run — re-run that
 * script afterwards if you want the dashboard chart populated.
 */
async function cleanup(): Promise<void> {
  await db.delete(s.ocrUsageCounters).where(eq(s.ocrUsageCounters.usageDate, OTHER_DAY));
  await db.delete(s.ocrUsageCounters).where(
    like(s.ocrUsageCounters.usageDate, `${PERIOD}-%`),
  );
  await db.delete(s.appSettings).where(inArray(s.appSettings.key, SETTINGS_KEYS));
  invalidateOcrUsageSettings();
}

before(async () => {
  await cleanup();
});

after(async () => {
  await cleanup();
  await client.end();
});

test('recordOcrRequest increments today\'s row by 1 per call', async () => {
  await recordOcrRequest();
  await recordOcrRequest();
  await recordOcrRequest();

  const [row] = await db
    .select()
    .from(s.ocrUsageCounters)
    .where(eq(s.ocrUsageCounters.usageDate, TODAY));
  assert.ok(row, 'today\'s counter row must exist after recording');
  assert.strictEqual(row.requestCount, 3);
});

test('getOcrUsageStatus reports the current month with default settings', async () => {
  const status: OcrUsageStatus = await getOcrUsageStatus();
  assert.strictEqual(status.period, PERIOD);
  assert.strictEqual(status.used, 3);
  assert.strictEqual(status.monthlyAllowance, OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE);
  assert.strictEqual(status.overagePricePerCall, OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL);
  assert.strictEqual(status.remaining, OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE - 3);
  assert.strictEqual(status.overageCount, 0);
  assert.strictEqual(status.overageCost, 0);
});

test('other days never leak into the current month (implicit reset)', async () => {
  // A day in another month that blew far past any allowance must not affect
  // the current month's figures.
  await db.insert(s.ocrUsageCounters)
    .values({ usageDate: OTHER_DAY, requestCount: 999_999 })
    .onConflictDoUpdate({
      target: s.ocrUsageCounters.usageDate,
      set: { requestCount: 999_999 },
    });

  const status = await getOcrUsageStatus();
  assert.strictEqual(status.period, PERIOD);
  assert.strictEqual(status.used, 3);
  assert.strictEqual(status.overageCount, 0);
});

test('the daily series covers every elapsed day, zero-filled, and stops at today', async () => {
  const status = await getOcrUsageStatus();
  const daysInMonth = ocrUsageDaysInMonth(PERIOD);
  const todayDay = Number(TODAY.slice(-2));

  assert.strictEqual(status.daysInMonth, daysInMonth);
  assert.strictEqual(status.elapsedDays, todayDay);
  assert.strictEqual(status.daily.length, todayDay, 'the series must cover exactly the elapsed days');

  // Every elapsed day is present — a day without scans is a measured zero.
  for (let day = 1; day <= todayDay; day++) {
    const date = `${PERIOD}-${String(day).padStart(2, '0')}`;
    assert.ok(
      status.daily.some((point) => point.date === date),
      `day ${date} must be present in the series`,
    );
  }

  // The only day with scans is today.
  const counts = status.daily.map((point) => point.count);
  assert.strictEqual(counts.reduce((sum, n) => sum + n, 0), 3);
  assert.strictEqual(counts.filter((n) => n === 0).length, todayDay - 1);
});

test('the run-rate figures follow from the elapsed days', async () => {
  const status = await getOcrUsageStatus();
  const todayDay = status.elapsedDays;

  // 3 requests spread over the elapsed days.
  assert.strictEqual(status.dailyAverage, Math.round(3 / todayDay));
  assert.strictEqual(
    status.projectedTotal,
    Math.round((3 / todayDay) * status.daysInMonth),
  );
});

test('settings are configurable — saved values (not examples) drive billing', async () => {
  await saveOcrUsageSettings({ monthlyAllowance: 5, overagePricePerCall: 12000 });

  // The service must re-read after a save (cache invalidated), and the status
  // must cost the overage at the SAVED per-call price.
  const status = await getOcrUsageStatus();
  assert.strictEqual(status.monthlyAllowance, 5);
  assert.strictEqual(status.overagePricePerCall, 12000);
  assert.strictEqual(status.overageCount, 0); // 3 used < 5 allowance
  assert.strictEqual(status.overageCost, 0);

  await recordOcrRequest();
  await recordOcrRequest();
  await recordOcrRequest(); // 6 used → 1 over
  const over = await getOcrUsageStatus();
  assert.strictEqual(over.used, 6);
  assert.strictEqual(over.remaining, 0);
  assert.strictEqual(over.overageCount, 1);
  assert.strictEqual(over.overageCost, 12000);
});

test('saved settings persist across a cache invalidation (fresh read path)', async () => {
  invalidateOcrUsageSettings();
  const settings = await getOcrUsageSettings();
  assert.strictEqual(settings.monthlyAllowance, 5);
  assert.strictEqual(settings.overagePricePerCall, 12000);

  const rows = await db
    .select()
    .from(s.appSettings)
    .where(inArray(s.appSettings.key, SETTINGS_KEYS));
  assert.strictEqual(rows.length, 2, 'both settings rows must be persisted');
});
