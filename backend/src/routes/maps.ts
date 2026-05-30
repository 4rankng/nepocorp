import { Router, type Request, type Response } from 'express';
import { config } from '../config';

const router = Router();

if (!config.googleMapsApiKey) {
  console.warn('[maps] GOOGLE_MAPS_API_KEY not set — /api/maps endpoints will return 503');
}

// ── Google Places Autocomplete ────────────────────────────────────────────

interface PlacePrediction {
  place_id: string;
  description: string;
}

router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
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
  } catch (err) {
    console.error('[maps] Autocomplete error:', err);
    res.json({ suggestions: [] });
  }
});

// ── Google Distance Matrix ────────────────────────────────────────────────

router.get('/distance', async (req: Request, res: Response) => {
  try {
    const origin = (req.query.origin as string || '').trim();
    const destination = (req.query.destination as string || '').trim();

    if (!origin || !destination) {
      res.json({ km: null });
      return;
    }

    if (!config.googleMapsApiKey) {
      res.status(503).json({ error: 'Google Maps API key not configured' });
      return;
    }

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origin);
    url.searchParams.set('destinations', destination);
    url.searchParams.set('key', config.googleMapsApiKey);
    url.searchParams.set('units', 'metric');

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[maps] Distance Matrix API returned ${response.status}`);
      res.json({ km: null });
      return;
    }

    const data = await response.json() as {
      status: string;
      rows?: Array<{
        elements?: Array<{
          status: string;
          distance?: { value: number }; // meters
        }>;
      }>;
    };

    if (data.status !== 'OK') {
      console.error(`[maps] Distance Matrix status: ${data.status}`);
      res.json({ km: null });
      return;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK' || !element.distance) {
      res.json({ km: null });
      return;
    }

    const km = Math.round(element.distance.value / 100) / 10; // meters → km, 1 decimal
    res.json({ km });
  } catch (err) {
    console.error('[maps] Distance error:', err);
    res.json({ km: null });
  }
});

export default router;
