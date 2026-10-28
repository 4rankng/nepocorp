/**
 * Seed a realistic daily AI OCR series for the CURRENT month — local demo
 * data for the dashboard tile "OCR — Chụp ảnh cont/seal" (NEPO-28).
 *
 * The tile plots the daily request counts, so an empty month renders an empty
 * chart and the tile cannot be reviewed. This script fills the month with a
 * plausible pattern: weekday-heavy, a few zero days (no shifts scanned), and a
 * port-bottleneck spike.
 *
 * Usage:
 *   cd backend && npx tsx scripts/seed-ocr-demo.ts
 *
 * NOTE: the backend test suite owns the current month's counter rows and wipes
 * them on every run — re-run this script afterwards to repopulate the chart.
 */
import { like } from 'drizzle-orm';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';
import { ocrUsageDateKey, ocrUsageDaysInMonth, ocrUsagePeriodKey } from '@tingting/shared';

/** Requests per day, from the 1st of the month. `null` = no data for that day. */
const PATTERN: readonly (number | null)[] = [
  142, null, 168, 175, null, 131, 196, 203, 188, null,
  210, 165, 224, 231, null, 198, 242, 187, 205, 220,
  null, 213, 196, 178, 232, 241, 189, 64,
];

const main = async () => {
  const period = ocrUsagePeriodKey();
  const daysInMonth = ocrUsageDaysInMonth(period);

  await db.delete(s.ocrUsageCounters).where(like(s.ocrUsageCounters.usageDate, `${period}-%`));

  let total = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const count = PATTERN[day - 1];
    if (count === null || count === undefined) continue;
    const usageDate = `${period}-${String(day).padStart(2, '0')}`;
    await db
      .insert(s.ocrUsageCounters)
      .values({ usageDate, requestCount: count })
      .onConflictDoUpdate({
        target: s.ocrUsageCounters.usageDate,
        set: { requestCount: count, updatedAt: new Date() },
      });
    total += count;
  }

  const today = ocrUsageDateKey();
  console.log(`OCR demo series seeded for ${period}: ${PATTERN.filter((c) => c != null).length} days, ${total} requests.`);
  console.log(`Today (${today}) counts as a partial day.`);

  await client.end();
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
