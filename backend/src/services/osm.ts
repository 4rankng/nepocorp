/**
 * OpenStreetMap geocoding via Nominatim — the free, keyless replacement for
 * Google Geocoding + Places Autocomplete. Powers (a) trip-creation location
 * search and (b) resolving leg place-names to coordinates for GPS-trail slicing.
 *
 * Nominatim usage policy: ≤1 request/second + a valid identifying User-Agent.
 * We enforce a ≥1.1s gap between calls (shared queue) and cache every result,
 * so even the backfill (~150 unique place lookups) stays well within policy.
 *
 * `countrycodes=vn` scopes every query to Vietnam — Photon lacks this and
 * returns wrong-country matches, which is why we use Nominatim for both paths.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'TingTing-Fleet/1.0 (fleet logistics; ops contact in repo)';
const MIN_GAP_MS = 1100; // >1s, with margin

let lastCallAt = 0;
const cache = new Map<string, unknown>();

/**
 * Serialize Nominatim calls with ≥MIN_GAP_MS between them — even under
 * concurrency (autocomplete + capture running together). Each call chains after
 * the previous, so two simultaneous search() calls can't both fire inside one
 * gap window and breach the 1 req/s policy.
 */
let chain: Promise<void> = Promise.resolve();
function throttle(): Promise<void> {
  const run = chain.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
  });
  chain = run;
  return run;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

/** Cached, throttled Nominatim /search scoped to Vietnam. */
async function search(query: string, limit: number): Promise<NominatimResult[]> {
  const key = `s:${query.trim().toLowerCase()}:${limit}`;
  const hit = cache.get(key);
  if (hit) return hit as NominatimResult[];
  await throttle();
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&countrycodes=vn&limit=${limit}&addressdetails=0`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return [];
    const rows = (await res.json()) as NominatimResult[];
    cache.set(key, rows);
    return rows;
  } catch {
    return [];
  }
}

export interface OsmPlace {
  placeId: string;
  description: string;
  lat: number;
  lng: number;
}

/** Autocomplete suggestions for the location search dropdown. */
export async function searchPlaces(query: string, limit = 8): Promise<OsmPlace[]> {
  if (!query.trim()) return [];
  return (await search(query, limit)).map((r) => ({
    placeId: String(r.place_id),
    description: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

/**
 * Resolve a place-name to [lat, lng]. Tries the full name, then progressively
 * shorter trailing substrings — handles verbose entries like "Công Ty TNHH Giấy
 * Việt Trì, Sông Thao, Thanh Miếu, Phú Thọ" that Nominatim won't match verbatim
 * by falling back to the province/city tail. Cached (incl. null results).
 */
export async function geocodePlace(place: string): Promise<[number, number] | null> {
  const key = `g:${place.trim().toLowerCase()}`;
  if (cache.has(key)) return cache.get(key) as [number, number] | null;

  const from = (r: NominatimResult | undefined): [number, number] | null =>
    r ? [Number(r.lat), Number(r.lon)] : null;

  let coords = from((await search(place, 1))[0]);

  // Fallback: drop leading comma-parts (company prefixes) until something hits.
  if (!coords) {
    const parts = place.split(',').map((p) => p.trim()).filter(Boolean);
    for (let i = 1; i < parts.length && !coords; i++) {
      coords = from((await search(parts.slice(i).join(', '), 1))[0]);
    }
  }

  cache.set(key, coords);
  return coords;
}
