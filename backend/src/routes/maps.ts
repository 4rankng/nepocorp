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
  url.searchParams.set('types', 'geocode');

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

// ── Google Directions with Local Cache ─────────────────────────────────────

router.get('/distance', asyncHandler(async (req: Request, res: Response) => {
  const origin = (req.query.origin as string || '').trim();
  const destination = (req.query.destination as string || '').trim();

  if (!origin || !destination) {
    res.json({ km: null, polylinePath: null });
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

  if (cached) {
    res.json({ 
      km: Number(cached.distanceKm), 
      polylinePath: cached.polylinePath 
    });
    return;
  }

  if (!config.googleMapsApiKey) {
    res.status(503).json({ error: 'Google Maps API key not configured' });
    return;
  }

  // 2. Fallback to Google Directions API
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('key', config.googleMapsApiKey);
  url.searchParams.set('mode', 'driving');

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`[maps] Directions API returned ${response.status}`);
    res.json({ km: null, polylinePath: null });
    return;
  }

  const data = await response.json() as {
    status: string;
    routes?: Array<{
      legs?: Array<{
        distance?: { value: number }; // meters
        duration?: { value: number }; // seconds
      }>;
      overview_polyline?: {
        points: string;
      };
    }>;
  };

  if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
    console.error(`[maps] Directions status: ${data.status}`);
    res.json({ km: null, polylinePath: null });
    return;
  }

  const route = data.routes[0];
  const leg = route.legs?.[0];
  if (!leg || !leg.distance) {
    res.json({ km: null, polylinePath: null });
    return;
  }

  const km = Math.round(leg.distance.value / 100) / 10; // meters → km, 1 decimal
  const durationSeconds = leg.duration?.value || null;
  const polylinePath = route.overview_polyline?.points || null;

  // 3. Save into cache table
  await db.insert(s.routeDistanceCache).values({
    originCleaned,
    destinationCleaned: destCleaned,
    distanceKm: String(km),
    durationSeconds,
    polylinePath,
  }).onConflictDoNothing();

  res.json({ km, polylinePath });
}));

export default router;
