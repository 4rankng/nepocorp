/**
 * Maps service — distance cache and Google Maps API integration.
 * Extracted from routes/maps.ts to separate business logic from HTTP handling.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { config } from '../config';
import { ApiError } from '../errors';

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

interface GoogleDirectionsRoute {
  summary?: string;
  legs?: Array<{
    distance?: { value: number };
    duration?: { value: number };
  }>;
  overview_polyline?: { points: string };
}

interface GoogleDirectionsResponse {
  status: string;
  routes?: GoogleDirectionsRoute[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function routeToSuggestion(route: GoogleDirectionsRoute): RouteSuggestion | null {
  const leg = route.legs?.[0];
  if (!leg || !leg.distance) return null;
  return {
    km: Math.round(leg.distance.value / 100) / 10,
    durationSeconds: leg.duration?.value ?? null,
    polylinePath: route.overview_polyline?.points ?? null,
    summary: route.summary ?? '',
  };
}

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

  const originCleaned = origin.trim().toLowerCase();
  const destCleaned = destination.trim().toLowerCase();

  // 1. Check local DB cache first
  const [cached] = await db
    .select()
    .from(s.routeDistanceCache)
    .where(
      and(
        eq(s.routeDistanceCache.originCleaned, originCleaned),
        eq(s.routeDistanceCache.destinationCleaned, destCleaned)
      )
    )
    .limit(1);

  // Only use cache when it has the full alternatives list.
  if (cached && cached.allRoutesJson) {
    try {
      const routes = JSON.parse(cached.allRoutesJson) as RouteSuggestion[];
      if (Array.isArray(routes) && routes.length > 0) {
        const selected: RouteSuggestion = {
          km: Number(cached.distanceKm),
          durationSeconds: cached.durationSeconds ?? null,
          polylinePath: cached.polylinePath ?? null,
          summary: cached.routeSummary ?? '',
        };
        return { routes, selected };
      }
    } catch {
      // Corrupt JSON — fall through and refresh from Google Maps
    }
  }

  if (!config.googleMapsApiKey) {
    throw new ApiError(503, 'Google Maps API key not configured');
  }

  // 2. Fallback to Google Directions API — request alternatives
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('key', config.googleMapsApiKey);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('alternatives', 'true');

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`[maps] Directions API returned ${response.status}`);
    return empty;
  }

  const data = await response.json() as GoogleDirectionsResponse;

  if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
    console.error(`[maps] Directions status: ${data.status}`);
    return empty;
  }

  const suggestions = data.routes
    .map(routeToSuggestion)
    .filter((r): r is RouteSuggestion => r !== null);

  if (suggestions.length === 0) return empty;

  const selected = suggestions[0];

  // 3. Save into cache table
  await db.insert(s.routeDistanceCache).values({
    originCleaned,
    destinationCleaned: destCleaned,
    distanceKm: String(selected.km),
    durationSeconds: selected.durationSeconds,
    polylinePath: selected.polylinePath,
    allRoutesJson: JSON.stringify(suggestions),
    routeSummary: selected.summary || null,
  }).onConflictDoUpdate({
    target: [s.routeDistanceCache.originCleaned, s.routeDistanceCache.destinationCleaned],
    set: {
      distanceKm: String(selected.km),
      durationSeconds: selected.durationSeconds,
      polylinePath: selected.polylinePath,
      allRoutesJson: JSON.stringify(suggestions),
      routeSummary: selected.summary || null,
    },
  });

  return { routes: suggestions, selected };
}
