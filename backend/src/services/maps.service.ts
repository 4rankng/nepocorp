/**
 * Maps service — route/distance lookup (from our GPS-captured route_polylines)
 * + place autocomplete via Map4D (the provider the Bách Khoa portal embeds).
 * Extracted from routes/maps.ts. Google Directions was retired — routes now
 * come from real Bách Khoa GPS tracks; place autocomplete comes from Google
 * Places Autocomplete (New) with a Geocoding fallback, and geocoding from
 * Google Maps Geocoding.
 */
import { resolveRoute, decodePolyline } from './gps/route-capture';
import { fetchRouteMap } from './gps/route-lookup';
import { searchPlaces, geocodePlace } from './map4d';
// TEMPORARY: expose the location-search diagnostic for the autocomplete ?debug=1 probe.
export { debugResolve } from './map4d';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  /**
   * Only on Geocoding-fallback rows — Places (New) predictions carry no
   * coordinates, and no consumer needs them (markers resolve server-side).
   */
  lat?: number;
  lng?: number;
}

export interface RouteSuggestion {
  km: number;
  durationSeconds: number | null;
  polylinePath: string | null;
  summary: string;
}

export interface DistanceResponse {
  routes: RouteSuggestion[];
  selected: RouteSuggestion | null;
}

// (Route + distance come from Bách Khoa GPS tracks; place autocomplete from
//  Google Places (New); geocoding from Google Maps Geocoding.)

// ── Places Autocomplete (Google Places (New), Geocoding fallback) ─────────

/**
 * Place autocomplete for the /maps/autocomplete route. `sessionToken` (the
 * frontend's per-composition random string) groups one autocomplete editing
 * session for Google Places billing; without a closing Place Details call the
 * session simply bills per request — the token is still what Google's session
 * guidance expects.
 */
export async function getPlaceAutocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  return searchPlaces(query, 8, sessionToken);
}

// ── Distance with cache ────────────────────────────────────────────────────

export async function getDistance(origin: string, destination: string): Promise<DistanceResponse> {
  const empty: DistanceResponse = { routes: [], selected: null };
  if (!origin || !destination) return empty;

  // Route + distance from our GPS-captured route_polylines, bidirectionally
  // (A→B also covers B→A reversed). Empty when neither direction is captured.
  const byPair = await fetchRouteMap([{ origin, destination }]);
  const route = resolveRoute(byPair, origin, destination);
  if (!route) return empty;

  const suggestion: RouteSuggestion = {
    km: route.km,
    durationSeconds: null,
    polylinePath: route.polyline,
    summary: '',
  };
  return { routes: [suggestion], selected: suggestion };
}

// ── Leg stop coordinates (for numbered map markers) ─────────────────────────

export interface LegCoord {
  originCoord: { lat: number; lng: number } | null;
  destinationCoord: { lat: number; lng: number } | null;
}

/**
 * Resolve origin/destination coordinates for each leg so the map can place a
 * numbered marker at EVERY stop — even legs that have no captured route polyline
 * (e.g. trip 76 legs 2-3). Free data first, geocode last:
 *   1. Legs WITH a route_polyline: decode it (already oriented origin→destination
 *      by resolveRoute) → origin = first point, destination = last point.
 *   2. Remaining unique place-names: geocode via map4d.geocodePlace
 *      (cached ~3 months in Redis; Google Geocoding + comma-tail fallback), so even several
 *      novel places resolve without hammering any one provider.
 * Returns one {originCoord, destinationCoord} per input leg; null when a place
 * genuinely can't be resolved (the frontend then just omits that marker).
 */
export async function resolveLegCoords(
  legs: Array<{ origin: string; destination: string; polylinePath: string | null }>,
): Promise<LegCoord[]> {
  const norm = (s: string) => s.trim().toLowerCase();
  const placeCoords = new Map<string, { lat: number; lng: number }>();

  // 1. Free coordinates from matched route polylines.
  for (const leg of legs) {
    if (!leg.polylinePath) continue;
    const pts = decodePolyline(leg.polylinePath);
    if (pts.length === 0) continue;
    const first = pts[0];
    const last = pts[pts.length - 1];
    placeCoords.set(norm(leg.origin), { lat: first[0], lng: first[1] });
    placeCoords.set(norm(leg.destination), { lat: last[0], lng: last[1] });
  }

  // 2. Geocode the remaining unique place-names (origins + destinations).
  const unresolved: string[] = [];
  const seen = new Set<string>();
  for (const leg of legs) {
    for (const place of [leg.origin, leg.destination]) {
      const n = norm(place);
      if (placeCoords.has(n) || seen.has(n)) continue;
      seen.add(n);
      unresolved.push(place);
    }
  }
  for (const place of unresolved) {
    const c = await geocodePlace(place); // [lat, lng] | null
    if (c) placeCoords.set(norm(place), { lat: c[0], lng: c[1] });
  }

  // 3. Map back to per-leg coordinates.
  return legs.map((leg) => ({
    originCoord: placeCoords.get(norm(leg.origin)) ?? null,
    destinationCoord: placeCoords.get(norm(leg.destination)) ?? null,
  }));
}
