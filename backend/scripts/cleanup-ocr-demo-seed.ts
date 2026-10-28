/**
 * Remove the demo daily series that seed-ocr-demo.ts leaves in
 * ocr_usage_counters (NEPO-35).
 *
 * seed-ocr-demo.ts fills the CURRENT month with a fake pattern so the
 * dashboard tile "OCR — Chụp ảnh cont/seal" has something to draw (NEPO-28).
 * Once that review is over the fake requests must go: the tile counts them
 * against the monthly allowance, so a past-month view shows wrong usage and
 * overage figures.
 *
 * ocr_usage_counters has no seed flag (usage_date, request_count, updated_at),
 * so the cleanup is a plain delete guarded by a full-table restore point:
 *
 *   1. count the target month's rows + requests,
 *   2. CREATE TABLE ocr_usage_counters_backup_<YYYYMMDD_HHMMSS> AS SELECT *
 *      FROM ocr_usage_counters  (only when there is something to delete),
 *   3. DELETE the month's rows,
 *   4. print before/after counts.
 *
 * Usage:
 *   cd backend && npx tsx scripts/cleanup-ocr-demo-seed.ts [YYYY-MM]
 *
 * Defaults to 2026-09 — the demo month from NEPO-35. DATABASE_URL selects the
 * database to clean. Idempotent: a month with no rows is a no-op and creates
 * no backup table.
 */
import { like, sql } from 'drizzle-orm';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';

const DEFAULT_PERIOD = '2026-09';

interface MonthCounts {
  days: number;
  requests: number;
}

const monthCounts = async (period: string): Promise<MonthCounts> => {
  const result = await db.execute(sql`
    SELECT count(*)::int AS days, coalesce(sum(request_count), 0)::int AS requests
    FROM ocr_usage_counters
    WHERE usage_date LIKE ${`${period}-%`}
  `);
  const rows = result as unknown as MonthCounts[];
  return rows[0] ?? { days: 0, requests: 0 };
};

const main = async () => {
  const period = process.argv[2] ?? DEFAULT_PERIOD;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error(`invalid period "${period}" — expected YYYY-MM`);
  }

  const before = await monthCounts(period);
  console.log(`ocr_usage_counters ${period}: before = ${before.days} rows, ${before.requests} requests`);
  if (before.days === 0) {
    console.log('Nothing to delete — month is already clean.');
    await client.end();
    return;
  }

  // '2026-10-28T14:23:45.678Z' → '20261028_142345'
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const backupTable = `ocr_usage_counters_backup_${stamp}`;

  // Restore point before the delete (NEPO-35): the whole table, so a wrong
  // period argument can be undone as well.
  await db.execute(sql.raw(`CREATE TABLE ${backupTable} AS SELECT * FROM ocr_usage_counters`));
  const backup = await db.execute(sql.raw(`SELECT count(*)::int AS days FROM ${backupTable}`));
  console.log(`Backup created: ${backupTable} (${(backup as unknown as Array<{ days: number }>)[0].days} rows)`);

  await db.delete(s.ocrUsageCounters).where(like(s.ocrUsageCounters.usageDate, `${period}-%`));

  const after = await monthCounts(period);
  const total = await monthCounts('');
  console.log(`ocr_usage_counters ${period}: after  = ${after.days} rows, ${after.requests} requests`);
  console.log(`ocr_usage_counters total: ${total.days} rows, ${total.requests} requests`);

  await client.end();
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
