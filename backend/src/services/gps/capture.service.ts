/**
 * Route capture — on trip completion, derive real per-(origin,destination)
 * routes from the truck's Bách Khoa GPS trail and upsert into route_polylines.
 *
 * Geocode-based slicing matches each leg to its origin/destination coordinates
 * (Google ground truth), so endpoints can't be direction-confused. Same pipeline
 * the backfill uses (getJourneyRange → sliceLegByPlaces → dedup → encode).
 *
 * Never throws — called fire-and-forget from POST /:id/complete.
 */
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { resolveCarId, getJourneyRange } from './reports';
import { geocodePlace } from './place-geocode';
import { cleanPlaceName, sliceLegByPlaces, dedupPoints, encodePolyline, trailDistanceKm, haversineKm, type LngLat } from './route-capture';

const MATCH_TOL_KM = 5;
const DETOUR_MAX = 2.2;

function isoDay(d: unknown): string {
  const s = d instanceof Date ? d.toISOString() : String(d ?? '');
  return s.slice(0, 10);
}
function addDay(day: string, delta: number): string {
  return new Date(new Date(day + 'T00:00:00Z').getTime() + delta * 86400000).toISOString().slice(0, 10);
}

export async function captureTripGpsTrack(tripId: number): Promise<void> {
  try {
    const [trip] = await db.select({
      routeId: schema.trips.routeId, status: schema.trips.status,
      departureDate: schema.trips.departureDate, completedAt: schema.trips.completedAt,
      plate: schema.trucks.licensePlate,
    }).from(schema.trips)
      .innerJoin(schema.trucks, eq(schema.trips.truckId, schema.trucks.id))
      .where(eq(schema.trips.id, tripId)).limit(1);
    if (!trip || trip.status === 'CANCELED') return;

    const carId = await resolveCarId(trip.plate);
    if (!carId) { console.warn('[gps] capture: no carId for trip', tripId); return; }

    const legs = await db.select({
      origin: schema.tripLegs.origin, destination: schema.tripLegs.destination,
    }).from(schema.tripLegs).where(eq(schema.tripLegs.tripId, tripId)).orderBy(schema.tripLegs.sequence);
    if (legs.length === 0) return;

    const dep = isoDay(trip.departureDate);
    const compDay = trip.completedAt ? isoDay(trip.completedAt) : dep;
    const journey = await getJourneyRange(carId, addDay(dep, -1), compDay);
    const pts: LngLat[] = [];
    for (const p of journey) if (p.lat != null && p.lng != null) pts.push([p.lat, p.lng]);
    if (pts.length < 2) return;

    let fromIdx = 0;
    for (const leg of legs) {
      const o = cleanPlaceName(leg.origin), d = cleanPlaceName(leg.destination);
      if (!o || !d) continue;
      const slice = sliceLegByPlaces(pts, fromIdx, await geocodePlace(leg.origin), await geocodePlace(leg.destination), MATCH_TOL_KM);
      if (!slice) continue; // truck never passed near an endpoint → skip this leg
      fromIdx = slice.endIdx;
      const dp = dedupPoints(slice.points, 15);
      if (dp.length < 2) continue;
      const candKm = Math.round(trailDistanceKm(dp) * 100) / 100;
      const straightKm = haversineKm(dp[0], dp[dp.length - 1]);
      if (straightKm < 0.5 || candKm / straightKm > DETOUR_MAX) continue;
      const poly = encodePolyline(dp);
      await db.insert(schema.routePolylines).values({
        originCleaned: o, destinationCleaned: d, encodedPolyline: poly, pointCount: dp.length,
        distanceKm: candKm.toFixed(2), sourceTripId: tripId, routeId: trip.routeId,
      }).onConflictDoUpdate({
        target: [schema.routePolylines.originCleaned, schema.routePolylines.destinationCleaned],
        set: { encodedPolyline: poly, pointCount: dp.length, distanceKm: candKm.toFixed(2), sourceTripId: tripId, routeId: trip.routeId, derivedAt: new Date() },
      });
    }
    console.log('[gps] captured routes for trip', tripId);
  } catch (e: unknown) {
    console.warn('[gps] captureTripGpsTrack failed', { tripId, err: (e as Error)?.message ?? e });
  }
}
