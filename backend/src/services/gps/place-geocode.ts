/**
 * Place geocoding (Google Geocoding API) with an in-memory cache. Resolves a
 * place-name string to [lat,lng] ground-truth coords, used to slice a GPS trail
 * into legs at the correct endpoints (origin/destination). Module cache survives
 * across requests in a running server; Google is only hit once per unique place.
 */
import { config } from '../../config';

const cache = new Map<string, [number, number] | null>();

export async function geocodePlace(place: string): Promise<[number, number] | null> {
  const key = (place ?? '').trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  if (!config.googleMapsApiKey) { cache.set(key, null); return null; }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&components=country:vn&language=vi&key=${config.googleMapsApiKey}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as { results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }> };
    const loc = data.results?.[0]?.geometry?.location;
    const coords: [number, number] | null = loc ? [loc.lat, loc.lng] : null;
    cache.set(key, coords);
    return coords;
  } catch {
    cache.set(key, null);
    return null;
  }
}
