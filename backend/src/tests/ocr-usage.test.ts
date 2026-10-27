import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  OCR_USAGE_DEFAULT_MONTHLY_ALLOWANCE,
  OCR_USAGE_DEFAULT_OVERAGE_PRICE_PER_CALL,
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
 * Service-layer tests for the AI OCR usage tracker (NEPO-27). Follows the
 * `ocr-persist.test.ts` idiom: node:test + the real (test) DB, namespaced
 * cleanup, no HTTP harness.
 *
 * Pinned behaviour:
 *   - every recorded request increments the CURRENT month's row by 1;
 *   - other months' rows never leak into the current month's status (the
 *     monthly reset is the period key, not a cron job);
 *   - the allowance / overage price are live settings with the owner's example
 *     figures as DEFAULTS — saved values (including non-example ones) win;
 *   - status math (remaining / overage count / overage cost) matches the
 *     shared calculation.
 */
const PERIOD = ocrUsagePeriodKey();
const SETTINGS_KEYS = ['ocr_usage.monthly_allowance', 'ocr_usage.overage_price_per_call'];

/** Restore the DB to its pre-test state: counter row + settings rows. */
async function cleanup(): Promise<void> {
  await db.delete(s.ocrUsageCounters).where(eq(s.ocrUsageCounters.yearMonth, PERIOD));
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

test('recordOcrRequest increments the current month by 1 per call', async () => {
  await recordOcrRequest();
  await recordOcrRequest();
  await recordOcrRequest();

  const [row] = await db
    .select()
    .from(s.ocrUsageCounters)
    .where(eq(s.ocrUsageCounters.yearMonth, PERIOD));
  assert.ok(row, 'current-month counter row must exist after recording');
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

test('other months never leak into the current month (implicit reset)', async () => {
  // A previous month that blew far past any allowance must not affect now.
  await db.insert(s.ocrUsageCounters)
    .values({ yearMonth: '2000-01', requestCount: 999_999 })
    .onConflictDoUpdate({
      target: s.ocrUsageCounters.yearMonth,
      set: { requestCount: 999_999 },
    });

  const status = await getOcrUsageStatus();
  assert.strictEqual(status.period, PERIOD);
  assert.strictEqual(status.used, 3);
  assert.strictEqual(status.overageCount, 0);
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
