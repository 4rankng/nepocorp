/**
 * Backfill GPS trails + stops for every COMPLETED/LOCKED trip that has no
 * trip_gps_tracks row yet. Hits Bách Khoa per trip (getJourneyRange +
 * getStopDetail), so it's sequential + slow; run in the background.
 *
 * Run: cd backend && npx tsx scripts/backfill-gps-trails.ts
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { captureTripGpsTrack } from '../src/services/gps/capture.service';

async function main() {
  const rows = await db.select({ id: schema.trips.id }).from(schema.trips)
    .leftJoin(schema.tripGpsTracks, eq(schema.tripGpsTracks.tripId, schema.trips.id))
    .where(and(
      isNull(schema.trips.deletedAt),
      inArray(schema.trips.status, ['COMPLETED', 'LOCKED']),
      isNull(schema.tripGpsTracks.tripId),
    ))
    .orderBy(schema.trips.id);

  console.log(`[backfill] ${rows.length} trailless trips to capture`);
  let ok = 0, partial = 0, empty = 0, failed = 0;
  const failures: Array<{ id: number; kind?: string }> = [];
  for (const t of rows) {
    const r = await captureTripGpsTrack(t.id);
    const tag = r.errorKind ? `, ${r.errorKind}` : '';
    console.log(`[backfill] trip ${t.id}: ${r.status} (pts=${r.pointCount}, legs=${r.legsDerived}/${r.legsTotal}${tag})`);
    if (r.status === 'ok') ok++;
    else if (r.status === 'partial') partial++;
    else if (r.status === 'empty') empty++;
    else { failed++; failures.push({ id: t.id, kind: r.errorKind }); }
  }
  console.log(`[backfill] DONE ok=${ok} partial=${partial} empty=${empty} failed=${failed} / ${rows.length}`);
  if (failures.length) console.log('[backfill] failures:', JSON.stringify(failures));
}

main().then(() => process.exit(0)).catch((e) => { console.error('[backfill] fatal', e); process.exit(1); });
