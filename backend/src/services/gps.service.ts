import { eq, and, isNull, inArray, or, sql } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db';
import * as schema from '../db/schema';
import { cacheGet } from '../lib/redis';
import { TripStatus } from '@tingting/shared';
import type { LiveFleetLeg, LiveFleetResponse, LiveFleetVehicle } from '@tingting/shared';
import { getGpsProvider } from './gps/providers';
import type { NormalizedGpsVehicle } from './gps/providers/types';
import { normalizePlate, isStale, deriveStatus, reviveDate } from './gps/parse';
import { resolveRoute } from './gps/route-capture';
import { fetchRouteMap } from './gps/route-lookup';

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
 * Fetch the planned legs (with GPS-captured route polylines) for the given trips,
 * so the dispatch map can draw the remaining route to each truck's destination.
 * Mirrors the polyline attachment in trip-queries.service.ts (route_polylines).
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

  // Routes (bidirectional: A→B also covers B→A reversed) for each leg.
  const byPair = await fetchRouteMap(legs);

  for (const l of legs) {
    const route = resolveRoute(byPair, l.origin, l.destination);
    const arr = byTrip.get(l.tripId) ?? [];
    arr.push({
      sequence: l.sequence,
      origin: l.origin,
      destination: l.destination,
      loadingType: l.loadingType as LiveFleetLeg['loadingType'],
      polylinePath: route?.polyline ?? null,
    });
    byTrip.set(l.tripId, arr);
  }
  return byTrip;
}

const GPS_CACHE_KEY = 'gps:live';
const GPS_CACHE_TTL_SECONDS = 25;

// ─── Last-known position persistence + offline fallback ──────────────────────

/** One active IN_TRANSIT trip joined to its truck/driver/customer/route. */
export interface ActiveTripRow {
  tripId: number;
  tripCode: string | null;
  truckId: number;
  licensePlate: string;
  driverName: string | null;
  customerName: string | null;
  routeName: string | null;
}

/** A persisted last-known fix for a truck (from vehicle_last_positions). */
export interface LastKnownPosition {
  truckId: number;
  deviceId: string | null;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  angle: number | null;
  address: string | null;
  ignitionOn: boolean;
  fuel: number | null;
  gpsDriverName: string | null;
  lastSeenAt: Date | null;
}

/** A live fix to upsert into vehicle_last_positions. */
interface PositionRow {
  truckId: number;
  deviceId: string | null;
  lat: number;
  lng: number;
  speed: number;
  angle: number;
  address: string | null;
  ignitionOn: boolean;
  fuel: number | null;
  gpsDriverName: string | null;
  lastSeenAt: Date | null;
}

/** Compose-fleet result. `persist` holds the fresh live fixes to upsert. */
interface ComposeResult {
  vehicles: LiveFleetVehicle[];
  stale: boolean;
  error?: string;
  persist: PositionRow[];
}

/** Map a built live vehicle to its vehicle_last_positions upsert row. */
function toPositionRow(v: LiveFleetVehicle): PositionRow {
  return {
    truckId: v.truckId,
    deviceId: v.deviceId,
    lat: v.lat,
    lng: v.lng,
    speed: v.speed,
    angle: v.angle,
    address: v.address,
    ignitionOn: v.ignitionOn,
    fuel: v.fuel,
    gpsDriverName: v.gpsDriverName,
    lastSeenAt: v.lastSeenAt ? new Date(v.lastSeenAt) : null,
  };
}

/** Active IN_TRANSIT trips with their truck/driver/customer/route context. */
async function loadActiveTrips(): Promise<ActiveTripRow[]> {
  return db
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
}

/** Last-known position per truckId (the offline-fallback source). */
async function loadLastKnownPositions(truckIds: number[]): Promise<Map<number, LastKnownPosition>> {
  const map = new Map<number, LastKnownPosition>();
  if (truckIds.length === 0) return map;
  const rows = await db
    .select()
    .from(schema.vehicleLastPositions)
    .where(inArray(schema.vehicleLastPositions.truckId, truckIds));
  for (const r of rows) {
    map.set(r.truckId, {
      truckId: r.truckId,
      deviceId: r.deviceId,
      lat: r.lat,
      lng: r.lng,
      speed: r.speed,
      angle: r.angle,
      address: r.address,
      ignitionOn: r.ignitionOn,
      fuel: r.fuel,
      gpsDriverName: r.gpsDriverName,
      lastSeenAt: r.lastSeenAt,
    });
  }
  return map;
}

/** Bulk-upsert fresh live fixes (1:1 per truck on the truck_id primary key). */
async function persistLastPositions(rows: PositionRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db
    .insert(schema.vehicleLastPositions)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.vehicleLastPositions.truckId,
      set: {
        deviceId: sql`excluded.device_id`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        speed: sql`excluded.speed`,
        angle: sql`excluded.angle`,
        address: sql`excluded.address`,
        ignitionOn: sql`excluded.ignition_on`,
        fuel: sql`excluded.fuel`,
        gpsDriverName: sql`excluded.gps_driver_name`,
        lastSeenAt: sql`excluded.last_seen_at`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Pure composition: merge live provider fixes with last-known fallback into the
 * fleet payload. No I/O — exported so it can be unit-tested with plain objects.
 *
 * Live fixes matched to an active trip keep their derived status; active trips
 * the provider did NOT cover are filled from last-known positions as
 * status:'offline', stale:true (an honest "last seen" instead of vanishing).
 *
 * Error semantics drive the frontend amber banner (checked before vehicles): no
 * error whenever vehicles exist; error only when there are active trips, the
 * provider is unavailable, AND we have no last-known position for any of them.
 */
export function composeFleet(args: {
  activeTrips: ActiveTripRow[];
  /** Provider fixes; `null` means the provider call failed (down/misconfigured). */
  providerVehicles: NormalizedGpsVehicle[] | null;
  providerError?: string | null;
  lastKnown: Map<number, LastKnownPosition>;
  legsByTrip: Map<number, LiveFleetLeg[]>;
  now: Date;
}): ComposeResult {
  const { activeTrips, providerVehicles, providerError, lastKnown, legsByTrip, now } = args;

  const byPlate = new Map<string, ActiveTripRow>();
  for (const t of activeTrips) byPlate.set(normalizePlate(t.licensePlate), t);

  const vehicles: LiveFleetVehicle[] = [];
  const persist: PositionRow[] = [];
  const covered = new Set<number>();

  // Live: match provider fixes to active trips.
  if (providerVehicles) {
    for (const g of providerVehicles) {
      const trip = byPlate.get(normalizePlate(g.numberPlate));
      if (!trip) continue;
      covered.add(trip.truckId);
      const stale = isStale(g.lastSeenAt, now);
      const v: LiveFleetVehicle = {
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
      vehicles.push(v);
      persist.push(toPositionRow(v));
    }
  }

  // Fallback: active trips the provider didn't cover → last-known, shown offline.
  for (const trip of activeTrips) {
    if (covered.has(trip.truckId)) continue;
    const pos = lastKnown.get(trip.truckId);
    if (!pos || pos.lat == null || pos.lng == null) continue;
    vehicles.push({
      truckId: trip.truckId,
      licensePlate: trip.licensePlate,
      deviceId: pos.deviceId,
      lat: pos.lat,
      lng: pos.lng,
      speed: pos.speed ?? 0,
      angle: pos.angle ?? 0,
      address: pos.address,
      status: 'offline',
      ignitionOn: pos.ignitionOn,
      fuel: pos.fuel,
      gpsDriverName: pos.gpsDriverName,
      lastSeenAt: pos.lastSeenAt ? pos.lastSeenAt.toISOString() : '',
      stale: true,
      tripId: trip.tripId,
      tripCode: trip.tripCode,
      driverName: trip.driverName,
      customerName: trip.customerName,
      routeName: trip.routeName,
      legs: legsByTrip.get(trip.tripId) ?? [],
      details: null,
    });
  }

  // Error only on genuine emptiness: active trips exist but the provider is
  // unavailable and we have nothing to show for any of them.
  let error: string | undefined;
  if (vehicles.length === 0 && activeTrips.length > 0) {
    if (providerVehicles === null) error = providerError || 'GPS provider unavailable';
    else if (providerVehicles.length === 0) error = 'GPS provider returned no vehicles';
  }

  return {
    vehicles,
    stale: vehicles.length > 0 && vehicles.every((v) => v.stale),
    error,
    persist,
  };
}

/**
 * Build the live-fleet payload: cached GPS positions joined to each truck's
 * single active IN_TRANSIT trip, falling back to each truck's last-known
 * position (shown offline) when the Bách Khoa provider is down or omits a truck.
 * Always returns a well-formed response — never throws.
 */
export async function getLiveFleet(): Promise<LiveFleetResponse> {
  const fetchedAt = new Date().toISOString();
  const now = new Date();

  // Active trips first — needed for both the live join and the fallback, so the
  // original provider-down short-circuits no longer blank the map.
  const activeTrips = await loadActiveTrips();

  // Upstream provider call (cached). `null` = provider failed; `[]` = provider
  // up but returned nothing. Either way the fallback can still populate the map.
  let providerVehicles: NormalizedGpsVehicle[] | null = null;
  let providerError: string | null = null;
  const provider = getGpsProvider();
  if (!provider.isConfigured()) {
    providerError = 'GPS provider not configured';
  } else {
    try {
      providerVehicles = await cacheGet<NormalizedGpsVehicle[]>(
        GPS_CACHE_KEY,
        GPS_CACHE_TTL_SECONDS,
        () => provider.fetchVehicles(),
      );
      // The pull-through cache round-trips through Redis JSON, flattening
      // `lastSeenAt: Date` to an ISO string on a cache hit. Revive it back to a
      // Date (idempotent for a real Date from the live fetch).
      for (const v of providerVehicles) v.lastSeenAt = reviveDate(v.lastSeenAt);
    } catch (e) {
      providerError = e instanceof Error ? e.message : 'GPS provider error';
      providerVehicles = null;
    }
  }

  // Last-known positions for every active truck (fallback source).
  const lastKnown = await loadLastKnownPositions(activeTrips.map((t) => t.truckId));

  // Planned route legs for every active trip (used by both live and fallback).
  const legsByTrip = await fetchLegsWithRoutes(activeTrips.map((t) => t.tripId));

  const { vehicles, stale, error, persist } = composeFleet({
    activeTrips,
    providerVehicles,
    providerError,
    lastKnown,
    legsByTrip,
    now,
  });

  // Persist fresh live fixes so the next provider outage can fall back to them.
  // Non-fatal: a DB hiccup must never break the live response.
  if (persist.length > 0) {
    await persistLastPositions(persist).catch((e) =>
      console.warn('vehicle_last_positions persist failed', e),
    );
  }

  return error ? { vehicles, stale: true, fetchedAt, error } : { vehicles, stale, fetchedAt };
}
