/**
 * Route capture — on trip completion, derive real per-(origin,destination)
 * routes from the truck's Bách Khoa GPS trail and upsert into route_polylines.
 *
 * Slicing matches each leg to the truck's REAL stop coordinates (Bách Khoa
 * DetailStop report), so endpoints are driven ground-truth and can't be
 * direction-confused. Same pipeline the backfill uses
 * (getJourneyRange → sliceLegByPlaces → dedup → encode).
 *
 * Never throws — called fire-and-forget from POST /:id/complete.
 */
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { resolveCarId, getJourneyRange, getStopDetail } from './reports';
import { cleanPlaceName, sliceLegByPlaces, dedupPoints, encodePolyline, trailDistanceKm, haversineKm, type LngLat } from './route-capture';
import { geocodePlace } from '../osm';

const MATCH_TOL_KM = 5;
const DETOUR_MAX = 2.2;

function isoDay(d: unknown): string {
  const s = d instanceof Date ? d.toISOString() : String(d ?? '');
  return s.slice(0, 10);
}
function addDay(day: string, delta: number): string {
  return new Date(new Date(day + 'T00:00:00Z').getTime() + delta * 86400000).toISOString().slice(0, 10);
}

/** A resolved significant stop — a real GPS waypoint from Bách Khoa. */
export interface GpsStopRecord {
  lat: number;
  lng: number;
  address: string | null;
  startTime: string | null;
  durationSec: number | null;
}

/**
 * The truck's ordered significant stops (Bách Khoa DetailStop report, ≥3min
 * each) — real GPS waypoints along the trip. By position stop[i] ≈ leg[i].origin
 * and stop[i+1] ≈ leg[i].destination, so sliceLegByPlaces cuts each leg at REAL
 * driven coordinates (works for short/obscure places a geocoder would miss).
 * Also persisted to trip_gps_tracks.stops so the map can render numbered
 * markers at every real stop 1..N. Returns [] on any provider error.
 */
async function fetchSignificantStops(
  carId: number,
  dateFrom: string,
  dateTo: string,
): Promise<GpsStopRecord[]> {
  try {
    const { stops } = await getStopDetail(carId, { dateFrom, dateTo });
    return stops
      .filter(s => s.lat != null && s.lng != null && (s.durationSec ?? 0) >= 180)
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
      .map(s => ({ lat: s.lat!, lng: s.lng!, address: s.address, startTime: s.startTime, durationSec: s.durationSec }));
  } catch {
    return [];
  }
}

/**
 * Slice a trail into per-leg routes and upsert them into route_polylines. Each
 * leg's origin/destination is resolved to real coordinates via OSM (Nominatim,
 * Vietnam-scoped, cached), then matched to the trail's first forward pass within
 * MATCH_TOL_KM. Also backfills each matched leg's driven `km` (fixes legs saved
 * with km=0). Shared by capture (fresh trail) and the re-derive script (stored
 * trail) so the matching logic lives in one place.
 */
export async function deriveRoutesForTrip(
  tripId: number,
  routeId: number | null,
  pts: LngLat[],
  legs: Array<{ id: number; origin: string; destination: string; km: number | null }>,
): Promise<{ legsDerived: number; legsTotal: number }> {
  let fromIdx = 0;
  let legsDerived = 0;
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const o = cleanPlaceName(leg.origin), d = cleanPlaceName(leg.destination);
    if (!o || !d) continue;
    const [oCoord, dCoord] = await Promise.all([geocodePlace(leg.origin), geocodePlace(leg.destination)]);
    const slice = sliceLegByPlaces(pts, fromIdx, oCoord, dCoord, MATCH_TOL_KM);
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
      distanceKm: candKm.toFixed(2), sourceTripId: tripId, routeId,
    }).onConflictDoUpdate({
      target: [schema.routePolylines.originCleaned, schema.routePolylines.destinationCleaned],
      set: { encodedPolyline: poly, pointCount: dp.length, distanceKm: candKm.toFixed(2), sourceTripId: tripId, routeId, derivedAt: new Date() },
    });
    // Backfill driven distance ONLY for legs missing it (km=0/null). Never
    // overwrite an existing km — that could shift completed-trip fuel/cost math.
    if (!leg.km) {
      await db.update(schema.tripLegs).set({ km: Math.round(candKm) }).where(eq(schema.tripLegs.id, leg.id));
    }
    legsDerived++;
  }
  return { legsDerived, legsTotal: legs.length };
}

export type CaptureStatus = 'ok' | 'partial' | 'empty' | 'failed';

export interface CaptureResult {
  tripId: number;
  status: CaptureStatus;
  pointCount: number;
  legsDerived: number;
  legsTotal: number;
  errorKind?: string;
}

/**
 * Derive + persist the real GPS trail/routes for one trip. Never throws — the
 * completion hook calls it fire-and-forget; backfill aggregates the returned
 * status. status: 'ok' (≥1 route derived), 'partial' (trail stored, no leg
 * matched), 'empty' (no trail/legs), 'failed' (error).
 */
export async function captureTripGpsTrack(tripId: number): Promise<CaptureResult> {
  const fail = (errorKind: string, legsTotal = 0): CaptureResult => ({ tripId, status: 'failed', pointCount: 0, legsDerived: 0, legsTotal, errorKind });
  try {
    const [trip] = await db.select({
      routeId: schema.trips.routeId, status: schema.trips.status, truckId: schema.trips.truckId,
      departureDate: schema.trips.departureDate, completedAt: schema.trips.completedAt,
      plate: schema.trucks.licensePlate,
    }).from(schema.trips)
      .innerJoin(schema.trucks, eq(schema.trips.truckId, schema.trucks.id))
      .where(eq(schema.trips.id, tripId)).limit(1);
    if (!trip) return fail('not_found');
    if (trip.status === 'CANCELED') return { tripId, status: 'empty', pointCount: 0, legsDerived: 0, legsTotal: 0, errorKind: 'canceled' };

    const carId = await resolveCarId(trip.plate);
    if (!carId) { console.warn('[gps] capture: no carId for trip', tripId); return fail('no_car_id'); }

    const legs = await db.select({
      id: schema.tripLegs.id, origin: schema.tripLegs.origin, destination: schema.tripLegs.destination, km: schema.tripLegs.km,
    }).from(schema.tripLegs).where(eq(schema.tripLegs.tripId, tripId)).orderBy(schema.tripLegs.sequence);
    if (legs.length === 0) return { tripId, status: 'empty', pointCount: 0, legsDerived: 0, legsTotal: 0, errorKind: 'no_legs' };

    const dep = isoDay(trip.departureDate);
    const compDay = trip.completedAt ? isoDay(trip.completedAt) : dep;
    const journey = await getJourneyRange(carId, addDay(dep, -1), compDay);
    const pts: LngLat[] = [];
    for (const p of journey) if (p.lat != null && p.lng != null) pts.push([p.lat, p.lng]);
    if (pts.length < 2) return { tripId, status: 'empty', pointCount: pts.length, legsDerived: 0, legsTotal: legs.length, errorKind: 'no_points' };

    // Store the FULL lossless trail (GPS-route-DB decision #2: "store all") — the
    // raw ground truth, before per-leg slicing. Upsert on trip_id (idempotent;
    // recapture overwrites). Kept so routes can be re-derived without re-hitting
    // the provider (e.g. a future consensus-path derivation).
    const fullPoly = encodePolyline(pts);
    const fullKm = Math.round(trailDistanceKm(pts) * 100) / 100;
    const firstPt = journey[0];
    const lastPt = journey[journey.length - 1];
    const startedAt = firstPt?.time ? new Date(firstPt.time) : null;
    const endedAt = lastPt?.time ? new Date(lastPt.time) : null;

    // Real GPS waypoints from the truck's actual stops (Bách Khoa), persisted
    // as the trip's waypoint data (the map draws numbered markers from the
    // per-leg routes below, not from these stops).
    const sigStops = await fetchSignificantStops(carId, addDay(dep, -1), compDay);
    const { legsDerived } = await deriveRoutesForTrip(tripId, trip.routeId, pts, legs);

    // Persist the trip's full trail + per-leg derivation outcome. status: 'ok' =
    // at least one route derived; 'partial' = trail stored but no leg matched.
    await db.insert(schema.tripGpsTracks).values({
      tripId,
      routeId: trip.routeId,
      truckId: trip.truckId,
      carId,
      licensePlate: trip.plate,
      encodedPolyline: fullPoly,
      pointCount: pts.length,
      distanceKm: fullKm.toFixed(2),
      stops: sigStops.length ? sigStops : null,
      startedAt,
      endedAt,
      status: legsDerived > 0 ? 'ok' : 'partial',
      segmentMatched: legs.length > 0 && legsDerived === legs.length,
    }).onConflictDoUpdate({
      target: schema.tripGpsTracks.tripId,
      set: {
        routeId: trip.routeId,
        truckId: trip.truckId,
        carId,
        licensePlate: trip.plate,
        encodedPolyline: fullPoly,
        pointCount: pts.length,
        distanceKm: fullKm.toFixed(2),
        startedAt,
        endedAt,
        status: legsDerived > 0 ? 'ok' : 'partial',
        segmentMatched: legs.length > 0 && legsDerived === legs.length,
        capturedAt: new Date(),
      },
    });
    console.log('[gps] captured routes for trip', tripId, `(trail ${pts.length} pts, ${legsDerived}/${legs.length} legs)`);
    return { tripId, status: legsDerived > 0 ? 'ok' : 'partial', pointCount: pts.length, legsDerived, legsTotal: legs.length };
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    console.warn('[gps] captureTripGpsTrack failed', { tripId, err: msg });
    return fail(msg.slice(0, 30) || 'unknown');
  }
}
