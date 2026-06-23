/**
 * Maps service — route/distance lookup (from our GPS-captured route_polylines)
 * + Google Places autocomplete. Extracted from routes/maps.ts.
 * Google Directions was retired — routes now come from real Bách Khoa GPS tracks.
 */
import { config } from '../config';
import { ApiError } from '../errors';
import { resolveRoute } from './gps/route-capture';
import { fetchRouteMap } from './gps/route-lookup';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlaceSuggestion {
  placeId: string;
  description: string;
}

interface GooglePlacePrediction {
  place_id: string;
  description: string;
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

// (Google Directions integration retired — route + distance now come from
//  route_polylines, captured from Bách Khoa GPS tracks. Google Places
//  autocomplete below is retained.)

// ── Places Autocomplete ────────────────────────────────────────────────────

export async function getPlaceAutocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  if (!config.googleMapsApiKey) {
    throw new ApiError(503, 'Google Maps API key not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('key', config.googleMapsApiKey);
  url.searchParams.set('components', 'country:vn');
  url.searchParams.set('language', 'vi');

  if (sessionToken) {
    url.searchParams.set('sessiontoken', sessionToken);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`[maps] Places API returned ${response.status}`);
    return [];
  }

  const data = await response.json() as { status: string; predictions?: GooglePlacePrediction[] };
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`[maps] Places API status: ${data.status}`);
    return [];
  }

  return (data.predictions || []).map(p => ({
    placeId: p.place_id,
    description: p.description,
  }));
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
