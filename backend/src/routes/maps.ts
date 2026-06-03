import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { config } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

if (!config.googleMapsApiKey) {
  console.warn('[maps] GOOGLE_MAPS_API_KEY not set — /api/maps endpoints will return 503');
}

// ── Google Places Autocomplete ────────────────────────────────────────────

interface PlacePrediction {
  place_id: string;
  description: string;
}

router.get('/autocomplete', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  const sessionToken = (req.query.sessiontoken as string || '').trim();

  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }

  if (!config.googleMapsApiKey) {
    res.status(503).json({ error: 'Google Maps API key not configured' });
    return;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', q);
  url.searchParams.set('key', config.googleMapsApiKey);
  url.searchParams.set('components', 'country:vn');
  url.searchParams.set('language', 'vi');
  // No 'types' filter — we need both geocode results (cities, addresses) and
  // establishment results (industrial parks like KCN Quang Minh, ports, depots).

  if (sessionToken) {
    url.searchParams.set('sessiontoken', sessionToken);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`[maps] Places API returned ${response.status}`);
    res.json({ suggestions: [] });
    return;
  }

  const data = await response.json() as { status: string; predictions?: PlacePrediction[] };
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`[maps] Places API status: ${data.status}`);
    res.json({ suggestions: [] });
    return;
  }

  const suggestions = (data.predictions || []).map(p => ({
    placeId: p.place_id,
    description: p.description,
  }));

  res.json({ suggestions });
}));

// ── Types for route alternatives ──────────────────────────────────────────

interface RouteSuggestion {
  km: number;
  durationSeconds: number | null;
  polylinePath: string | null;
  summary: string;
}

interface DistanceResponse {
  routes: RouteSuggestion[];
  selected: RouteSuggestion | null;
}

interface GoogleDirectionsRoute {
  summary?: string;
  legs?: Array<{
    distance?: { value: number }; // meters
    duration?: { value: number }; // seconds
  }>;
  overview_polyline?: { points: string };
}

interface GoogleDirectionsResponse {
  status: string;
  routes?: GoogleDirectionsRoute[];
}

function routeToSuggestion(route: GoogleDirectionsRoute): RouteSuggestion | null {
  const leg = route.legs?.[0];
  if (!leg || !leg.distance) return null;
  return {
    km: Math.round(leg.distance.value / 100) / 10, // meters → km, 1 decimal
    durationSeconds: leg.duration?.value ?? null,
    polylinePath: route.overview_polyline?.points ?? null,
    summary: route.summary ?? '',
  };
}

// ── Google Directions with Local Cache ─────────────────────────────────────

router.get('/distance', asyncHandler(async (req: Request, res: Response) => {
  const origin = (req.query.origin as string || '').trim();
  const destination = (req.query.destination as string || '').trim();

  if (!origin || !destination) {
    res.json({ routes: [], selected: null } satisfies DistanceResponse);
    return;
  }

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

  // Only use cache when it has the full alternatives list. Legacy entries
  // (allRoutesJson = null) fall through to Google Maps so they get refreshed.
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
        res.json({ routes, selected } satisfies DistanceResponse);
        return;
      }
    } catch {
      // Corrupt JSON — fall through and refresh from Google Maps
    }
  }

  if (!config.googleMapsApiKey) {
    res.status(503).json({ error: 'Google Maps API key not configured' });
    return;
  }

  // 2. Fallback to Google Directions API — request alternatives so users
  //    can pick e.g. QL5 vs. Hà Nội–Hải Phòng expressway for the same pair.
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('key', config.googleMapsApiKey);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('alternatives', 'true');

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`[maps] Directions API returned ${response.status}`);
    res.json({ routes: [], selected: null } satisfies DistanceResponse);
    return;
  }

  const data = await response.json() as GoogleDirectionsResponse;

  if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
    console.error(`[maps] Directions status: ${data.status}`);
    res.json({ routes: [], selected: null } satisfies DistanceResponse);
    return;
  }

  const suggestions = data.routes
    .map(routeToSuggestion)
    .filter((r): r is RouteSuggestion => r !== null);

  if (suggestions.length === 0) {
    res.json({ routes: [], selected: null } satisfies DistanceResponse);
    return;
  }

  const selected = suggestions[0];

  // 3. Save into cache table. We always persist the full list so the
  //    picker can show every alternative on the next request for this pair.
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

  const distResponse: DistanceResponse = { routes: suggestions, selected };
  res.json(distResponse);
}));

export default router;
