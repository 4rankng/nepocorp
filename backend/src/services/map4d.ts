/**
 * Map4D place search (api.map4d.vn) — the map/search provider the Bách Khoa
 * (dvbk.vn) portal embeds. This is our ONLY location-search source: it powers
 * (a) trip-creation place autocomplete and (b) resolving leg place-names to
 * coordinates for GPS-trail slicing. It replaced OpenStreetMap/Nominatim.
 *
 * Auth model: a single static key passed as `?key=`. The captured portal
 * request carries no cookies/headers — the key alone authenticates, so no
 * Bách Khoa portal login is needed for search. (Portal login stays scoped to
 * the GPS vehicle API.) The key lives in config (MAP4D_API_KEY).
 *
 * Caching: every lookup is fronted by the shared Redis `cacheGet` with a
 * ~3-month TTL — place geography barely changes, so this keeps repeat
 * autocomplete/geocode off the network entirely. The dedup/in-flight collapse
 * is provided by lib/redis (its own tests cover that); here we only route
 * through it.
 *
 * Reliability: unlike Nominatim there is no 1 req/s usage policy to honor
 * (this is a keyed commercial endpoint), so calls are concurrent and
 * unthrottled. Missing key, non-2xx, or network failure degrade to []
 * (search) / null (geocode) — never throw, and no secondary provider.
 *
 * The pure helpers (mapToSuggestions, geocodeFromLookup) are exported so the
 * mapping + fallback logic is unit-testable without network or Redis.
 */
import { config } from '../config';
import { cacheGet } from '../lib/redis';

/** ~3 months (90 days) in seconds. Place data is effectively static. */
const THREE_MONTHS_TTL_SECONDS = 60 * 60 * 24 * 90;

export interface Map4dLocation {
  lat: number;
  lng: number;
}

export interface Map4dPlace {
  id: string;
  name: string;
  address?: string;
  location?: Map4dLocation;
  types?: string[];
}

interface Map4dResponse {
  code: string;
  result?: Map4dPlace[];
}

export interface Map4dSuggestion {
  placeId: string;
  description: string;
  lat: number;
  lng: number;
}

/** Pull the coordinate off a result row, validating both fields are finite. */
function coordOf(r: Map4dPlace | undefined): [number, number] | null {
  const loc = r?.location;
  if (!loc) return null;
  const { lat, lng } = loc;
  // Number.isFinite rejects NaN / Infinity (typeof NaN === 'number' would slip past).
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

/**
 * Map raw Map4D rows → autocomplete suggestions: drop rows without a usable
 * coordinate, prefer `address` over `name` for the description, cap to `limit`.
 * Pure — no network, no cache. Exposed for unit testing.
 */
export function mapToSuggestions(rows: Map4dPlace[], limit: number): Map4dSuggestion[] {
  return rows
    .filter((r) => coordOf(r) !== null)
    .slice(0, limit)
    .map((r) => ({
      placeId: r.id,
      description: r.address || r.name,
      lat: r.location!.lat,
      lng: r.location!.lng,
    }));
}

/**
 * Resolve a place-name to [lat, lng] via an injected lookup. Tries the full
 * name first, then progressively shorter trailing comma-substrings — handles
 * verbose entries like "Công Ty TNHH Giấy Việt Trì, Sông Thao, Phú Thọ" by
 * falling back to the province/city tail when the full string won't match.
 * Stops at the first hit, so a matching full name costs exactly one lookup.
 * Pure given `lookup` — exposed for unit testing.
 */
export function geocodeFromLookup(
  place: string,
  lookup: (text: string) => Promise<Map4dPlace[]>,
): Promise<[number, number] | null> {
  return (async () => {
    const top = (await lookup(place))[0];
    const c = coordOf(top);
    if (c) return c;
    const parts = place.split(',').map((s) => s.trim()).filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const hit = (await lookup(parts.slice(i).join(', ')))[0];
      const cc = coordOf(hit);
      if (cc) return cc;
    }
    return null;
  })();
}

/**
 * One uncached Map4D text-search call. Returns the raw result rows (empty on
 * any failure). Both searchPlaces and geocodePlace route through here so the
 * Redis layer is the only cache.
 */
async function textSearchOnce(text: string): Promise<Map4dPlace[]> {
  if (!config.map4dApiKey) return [];
  const url =
    `${config.map4dApiUrl}/sdk/place/text-search` +
    `?key=${encodeURIComponent(config.map4dApiKey)}` +
    `&text=${encodeURIComponent(text)}` +
    `&accuracy=0`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const body = (await res.json()) as Map4dResponse;
    return body?.code === 'ok' && Array.isArray(body.result) ? body.result : [];
  } catch {
    return [];
  }
}

/** Cached place autocomplete. Rows without a coordinate are dropped. */
export async function searchPlaces(query: string, limit = 8): Promise<Map4dSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const key = `map4d:place:search:${q.toLowerCase()}`;
  // Cache the full row set per query (limit applied after), so different limit
  // values share one entry.
  const rows = await cacheGet<Map4dPlace[]>(key, THREE_MONTHS_TTL_SECONDS, () => textSearchOnce(q));
  return mapToSuggestions(rows, limit);
}

/**
 * Resolve a place-name to [lat, lng] (cached, incl. null results). Mirrors the
 * contract of the old osm.geocodePlace. Routes the fallback through cacheGet so
 * a resolved place (or a confirmed-unresolvable one) is never re-queried.
 */
export async function geocodePlace(place: string): Promise<[number, number] | null> {
  const p = place.trim();
  if (!p) return null;
  const key = `map4d:place:geocode:${p.toLowerCase()}`;
  return cacheGet<[number, number] | null>(key, THREE_MONTHS_TTL_SECONDS, () =>
    geocodeFromLookup(p, textSearchOnce),
  );
}
