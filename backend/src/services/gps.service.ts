import { eq, and, isNull, inArray, or } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db';
import * as schema from '../db/schema';
import { cacheGet } from '../lib/redis';
import { TripStatus } from '@tingting/shared';
import type { LiveFleetLeg, LiveFleetResponse, LiveFleetVehicle } from '@tingting/shared';
import { getGpsProvider } from './gps/providers';
import type { NormalizedGpsVehicle } from './gps/providers/types';
import { normalizePlate, isStale, deriveStatus, reviveDate } from './gps/parse';

// Re-export the pure helpers (consumed by unit tests and the providers).
export { normalizePlate, parseBachKhoaDate, parseAspDate, isStale, deriveStatus, reviveDate } from './gps/parse';

/**
 * Live vehicle tracking via the Bách Khoa GPS provider (dvbk.vn).
 *
 * Two interchangeable sources sit behind `getGpsProvider()` (see ./gps/providers):
 * the documented public API and the web-portal endpoint. "Real-time" is poll
 * cadence — a pull-through Redis cache (`cacheGet`) fronts the active provider so
 * N concurrent viewers collapse to ≤1 upstream call per TTL window. Credentials
 * are server-side only and never reach the client.
 */

/**
 * Fetch the planned legs (with cached Google polylines) for the given trips, so
 * the dispatch map can draw the remaining route to each truck's destination.
 * Mirrors the polyline attachment in trip-queries.service.ts (routeDistanceCache).
 */
async function fetchLegsWithRoutes(tripIds: number[]): Promise<Map<number, LiveFleetLeg[]>> {
  const byTrip = new Map<number, LiveFleetLeg[]>();
  if (tripIds.length === 0) return byTrip;

  const legs = await db
    .select({
      tripId: schema.tripLegs.tripId,
      sequence: schema.tripLegs.sequence,
      origin: schema.tripLegs.origin,
      destination: schema.tripLegs.destination,
      loadingType: schema.tripLegs.loadingType,
    })
    .from(schema.tripLegs)
    .where(inArray(schema.tripLegs.tripId, tripIds))
    .orderBy(schema.tripLegs.tripId, schema.tripLegs.sequence);

  const pairs = [...new Set(
    legs.map((l) => `${l.origin.trim().toLowerCase()}|${l.destination.trim().toLowerCase()}`),
  )];
  const cacheEntries = pairs.length > 0
    ? await db
        .select({
          originCleaned: schema.routeDistanceCache.originCleaned,
          destinationCleaned: schema.routeDistanceCache.destinationCleaned,
          polylinePath: schema.routeDistanceCache.polylinePath,
        })
        .from(schema.routeDistanceCache)
        .where(or(...pairs.map((p) => {
          const [o, d] = p.split('|');
          return and(
            eq(schema.routeDistanceCache.originCleaned, o),
            eq(schema.routeDistanceCache.destinationCleaned, d),
          );
        })))
    : [];
  const polyByPair = new Map(
    cacheEntries.map((e) => [`${e.originCleaned}|${e.destinationCleaned}`, e.polylinePath]),
  );

  for (const l of legs) {
    const key = `${l.origin.trim().toLowerCase()}|${l.destination.trim().toLowerCase()}`;
    const arr = byTrip.get(l.tripId) ?? [];
    arr.push({
      sequence: l.sequence,
      origin: l.origin,
      destination: l.destination,
      loadingType: l.loadingType as LiveFleetLeg['loadingType'],
      polylinePath: polyByPair.get(key) ?? null,
    });
    byTrip.set(l.tripId, arr);
  }
  return byTrip;
}

const GPS_CACHE_KEY = 'gps:live';
const GPS_CACHE_TTL_SECONDS = 25;

/**
 * Build the live-fleet payload: cached GPS positions joined to each truck's
 * single active IN_TRANSIT trip. Trucks not currently in transit (or not in our
 * fleet) are filtered out. Always returns a well-formed response — never throws.
 */
export async function getLiveFleet(): Promise<LiveFleetResponse> {
  const fetchedAt = new Date().toISOString();
  const now = new Date();

  const provider = getGpsProvider();
  if (!provider.isConfigured()) {
    return { vehicles: [], stale: true, fetchedAt, error: 'GPS provider not configured' };
  }

  // The ONLY upstream-touching call. cacheGet dedupes concurrent requests.
  const gpsVehicles = await cacheGet<NormalizedGpsVehicle[]>(
    GPS_CACHE_KEY,
    GPS_CACHE_TTL_SECONDS,
    () => provider.fetchVehicles(),
  );

  // The pull-through cache round-trips through Redis JSON, which flattens the
  // `lastSeenAt: Date` to an ISO string on a cache hit. Revive it back to a Date
  // so the typed model holds for isStale()/toISOString() below (idempotent for a
  // real Date from the live fetch).
  for (const v of gpsVehicles) {
    v.lastSeenAt = reviveDate(v.lastSeenAt);
  }

  if (gpsVehicles.length === 0) {
    // Access not granted, provider downtime, or no vehicles. Soft error so the
    // UI shows the amber notice rather than an empty map silently.
    return { vehicles: [], stale: true, fetchedAt, error: 'GPS provider returned no vehicles' };
  }

  // Active trips only. The trip-status-machine advisory lock guarantees at most
  // one IN_TRANSIT trip per truck, so the plate → trip map is unambiguous.
  const activeTrips = await db
    .select({
      tripId: schema.trips.id,
      tripCode: schema.trips.tripCode,
      truckId: schema.trucks.id,
      licensePlate: schema.trucks.licensePlate,
      driverName: schema.drivers.name,
      customerName: schema.customers.name,
      routeName: schema.routes.name,
    })
    .from(schema.trips)
    .innerJoin(schema.trucks, eq(schema.trips.truckId, schema.trucks.id))
    .leftJoin(schema.drivers, eq(schema.trips.driverId, schema.drivers.id))
    .leftJoin(schema.customers, eq(schema.trips.customerId, schema.customers.id))
    .leftJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
    .where(and(eq(schema.trips.status, TripStatus.IN_TRANSIT), isNull(schema.trips.deletedAt)));

  type ActiveTrip = (typeof activeTrips)[number];
  const byPlate = new Map<string, ActiveTrip>();
  for (const t of activeTrips) {
    byPlate.set(normalizePlate(t.licensePlate), t);
  }

  const matched = gpsVehicles
    .map((g) => ({ g, trip: byPlate.get(normalizePlate(g.numberPlate)) }))
    .filter((m): m is { g: NormalizedGpsVehicle; trip: ActiveTrip } => !!m.trip);

  // Planned route legs (with cached polylines) for each matched trip, so the
  // dispatch map can draw the remaining path to the current leg's destination.
  const legsByTrip = await fetchLegsWithRoutes(matched.map((m) => m.trip.tripId));

  const vehicles: LiveFleetVehicle[] = matched.map(({ g, trip }) => {
    const stale = isStale(g.lastSeenAt, now);
    return {
      truckId: trip.truckId,
      licensePlate: trip.licensePlate,
      deviceId: g.deviceId,
      lat: g.lat,
      lng: g.lng,
      speed: g.speed,
      angle: g.angle,
      address: g.address,
      status: deriveStatus(stale, g.lostSignal, g.speed),
      ignitionOn: g.ignitionOn,
      fuel: g.fuel,
      gpsDriverName: g.driverName,
      lastSeenAt: g.lastSeenAt ? g.lastSeenAt.toISOString() : '',
      stale,
      tripId: trip.tripId,
      tripCode: trip.tripCode,
      driverName: trip.driverName,
      customerName: trip.customerName,
      routeName: trip.routeName,
      legs: legsByTrip.get(trip.tripId) ?? [],
      details: g.details ?? null,
    };
  });

  return {
    vehicles,
    stale: vehicles.length > 0 && vehicles.every((v) => v.stale),
    fetchedAt,
  };
}
