import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as mapsService from '../services/maps.service';

const router = Router();

// ── Place autocomplete (Google Places (New), Geocoding fallback) ──────────

router.get('/autocomplete', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  // TEMPORARY diagnostic: ?debug=1 reports each source's raw http status + body
  // so we can see why a query comes back empty. Remove once search is confirmed.
  if (req.query.debug === '1') {
    const diag = await mapsService.debugResolve(q);
    res.json({ suggestions: [], _diag: diag });
    return;
  }
  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  // Session token (frontend param: `sessiontoken`) groups one autocomplete
  // editing session for Google Places billing. Capped — forwarded into the
  // Google request body.
  const rawToken = req.query.sessiontoken;
  const sessionToken = typeof rawToken === 'string' ? rawToken.slice(0, 64) : undefined;
  const suggestions = await mapsService.getPlaceAutocomplete(q, sessionToken);
  res.json({ suggestions });
}));

// ── Route + Distance (real GPS-captured polylines) ─────────────────────────

router.get('/distance', asyncHandler(async (req: Request, res: Response) => {
  const origin = (req.query.origin as string || '').trim();
  const destination = (req.query.destination as string || '').trim();

  if (!origin || !destination) {
    res.json({ routes: [], selected: null });
    return;
  }

  const distResponse = await mapsService.getDistance(origin, destination);
  res.json(distResponse);
}));

export default router;
