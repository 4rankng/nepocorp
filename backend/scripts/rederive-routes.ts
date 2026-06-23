/**
 * Re-derive per-leg routes from STORED GPS trails using OSM (Nominatim)
 * geocoding — without re-hitting Bách Khoa. Run after changing the matcher
 * (e.g. stop-coords → Nominatim) to refresh route_polylines + backfill
 * trip_legs.km for every captured trip. Nominatim is throttled to 1 req/s, so
 * this takes a few minutes (cached per unique place name).
 *
 * Run: cd backend && npx tsx scripts/rederive-routes.ts
 */
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { decodePolyline, type LngLat } from '../src/services/gps/route-capture';
import { deriveRoutesForTrip } from '../src/services/gps/capture.service';

async function main() {
  const tracks = await db.select({
    tripId: schema.tripGpsTracks.tripId,
    routeId: schema.tripGpsTracks.routeId,
    poly: schema.tripGpsTracks.encodedPolyline,
  }).from(schema.tripGpsTracks).orderBy(schema.tripGpsTracks.tripId);

  console.log(`[rederive] ${tracks.length} stored trails`);
  let legsDerivedTotal = 0, legsTotalSum = 0, improved = 0, skipped = 0;
  for (const t of tracks) {
    const pts = decodePolyline(t.poly) as LngLat[];
    const legs = await db.select({ id: schema.tripLegs.id, origin: schema.tripLegs.origin, destination: schema.tripLegs.destination, km: schema.tripLegs.km })
      .from(schema.tripLegs).where(eq(schema.tripLegs.tripId, t.tripId)).orderBy(schema.tripLegs.sequence);
    if (pts.length < 2 || !legs.length) { skipped++; continue; }
    const { legsDerived, legsTotal } = await deriveRoutesForTrip(t.tripId, t.routeId ?? null, pts, legs);
    legsDerivedTotal += legsDerived; legsTotalSum += legsTotal;
    if (legsDerived > 0) improved++;
    console.log(`[rederive] trip ${t.tripId}: ${legsDerived}/${legsTotal} legs`);
  }
  console.log(`[rederive] DONE ${legsDerivedTotal}/${legsTotalSum} legs across ${tracks.length} trips (${improved} with ≥1 route, ${skipped} skipped)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error('[rederive] fatal', e); process.exit(1); });
