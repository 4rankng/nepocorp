import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';
import * as mapsService from '../services/maps.service';

const router = Router();

if (!config.googleMapsApiKey) {
  console.warn('[maps] GOOGLE_MAPS_API_KEY not set — /api/maps endpoints will return 503');
}

/** Handle maps service errors — 503 for missing API key, rethrow everything else. */
function handleMapsError(err: unknown, res: Response): boolean {
  if (err && typeof err === 'object' && 'status' in err && (err as any).status === 503) {
    res.status(503).json({ error: (err as any).message ?? 'Google Maps API key not configured' });
    return true;
  }
  return false;
}

// ── Google Places Autocomplete ────────────────────────────────────────────

router.get('/autocomplete', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  const sessionToken = (req.query.sessiontoken as string || '').trim();

  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    const suggestions = await mapsService.getPlaceAutocomplete(q, sessionToken || undefined);
    res.json({ suggestions });
  } catch (err) {
    if (!handleMapsError(err, res)) throw err;
  }
}));

// ── Google Directions with Local Cache ─────────────────────────────────────

router.get('/distance', asyncHandler(async (req: Request, res: Response) => {
  const origin = (req.query.origin as string || '').trim();
  const destination = (req.query.destination as string || '').trim();

  if (!origin || !destination) {
    res.json({ routes: [], selected: null });
    return;
  }

  try {
    const distResponse = await mapsService.getDistance(origin, destination);
    res.json(distResponse);
  } catch (err) {
    if (!handleMapsError(err, res)) throw err;
  }
}));

export default router;
