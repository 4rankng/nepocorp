import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as mapsService from '../services/maps.service';

const router = Router();

// ── Place autocomplete (OpenStreetMap / Nominatim) ─────────────────────────

router.get('/autocomplete', asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  const suggestions = await mapsService.getPlaceAutocomplete(q);
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
