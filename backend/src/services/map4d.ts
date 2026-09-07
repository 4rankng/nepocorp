/**
 * Place search for trip-creation autocomplete and leg place-name→coordinate
 * resolution. Google Places Autocomplete (New) is the primary source — unlike
 * Geocoding it matches partial input and business names ("SINOVNL", "Trà Xanh
 * Ngọc") — with a Google Maps Geocoding fallback for pasted full addresses.
 * (Historically Map4D — api.map4d.vn, keyed to the dvbk.vn referrer — then
 * bare Geocoding; both are bypassed in the resolve paths today.)
 *
 * ── Google key ─────────────────────────────────────────────────────────────
 * config.googleMapsApiKey powers both Places and Geocoding calls.
 *
 * ── Caching ────────────────────────────────────────────────────────────────
 * Every lookup is fronted by the shared Redis `cacheGet` — ~3-month TTL for
 * good results, 5 minutes for empty results and for Places-outage fallbacks
 * (a degraded answer must not stick for months). The in-flight dedup itself
 * is provided by lib/redis (covered by its own tests).
 *
 * ── Reliability ────────────────────────────────────────────────────────────
 * Any failure (missing key, non-2xx, network) degrades to []/null — never
 * throws. Places request failures are logged so outages are diagnosable, and
 * only shorten the fallback's cache TTL instead of poisoning it.
 *
 * Pure helpers (mapToSuggestions, geocodeFromLookup, googleResultToPlace,
 * placePredictionsToSuggestions) are exported so the mapping + fallback logic
 * is unit-testable without network.
 */
import { config } from '../config';
import { cacheGet } from '../lib/redis';

/** ~3 months (90 days) in seconds. Place data is effectively static. */
const THREE_MONTHS_TTL_SECONDS = 60 * 60 * 24 * 90;

/** 5 minutes in seconds for empty/null results so we don't cache configuration/network failures long-term. */
const EMPTY_CACHE_TTL_SECONDS = 300;

/** Headers that present our Map4D call as coming from the Bách Khoa portal. */
const BACHKHOA_BROWSER_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  Referer: 'https://dvbk.vn/',
  Origin: 'https://dvbk.vn',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

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
  /**
   * Coordinates, present only on Geocoding-fallback rows. Places Autocomplete
   * (New) predictions carry no coordinates — and no consumer needs them here
   * (map markers resolve server-side by place name via resolveLegCoords).
   */
  lat?: number;
  lng?: number;
}

/** A single Google Maps Geocoding result (only the fields we use). */
export interface GoogleGeocodeResult {
  place_id: string;
  formatted_address: string;
  geometry: { location: Map4dLocation };
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

/** A single Google Places Autocomplete (New) suggestion (only the fields we use). */
export interface PlacesAutocompletePrediction {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
  };
}

/**
 * Map raw Places Autocomplete (New) suggestions → our suggestion shape:
 * drop malformed entries (no placeId / no text), cap to `limit`. Predictions
 * carry no coordinates, so the mapped rows have none. Pure — no network, no
 * cache. Exposed for unit testing.
 */
export function placePredictionsToSuggestions(
  suggestions: PlacesAutocompletePrediction[],
  limit: number,
): Map4dSuggestion[] {
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text: { text: string } } => !!p?.placeId && !!p.text?.text)
    .slice(0, limit)
    .map((p) => ({ placeId: p.placeId, description: p.text.text }));
}

/**
 * Normalize a Google Maps Geocoding result into our Map4dPlace shape so the
 * Map4D and Google result sets flow through one mapping path. Pure — exposed
 * for unit testing.
 */
export function googleResultToPlace(g: GoogleGeocodeResult): Map4dPlace {
  return {
    id: `g:${g.place_id}`,
    name: g.formatted_address,
    address: g.formatted_address,
    location: { lat: g.geometry.location.lat, lng: g.geometry.location.lng },
  };
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
 * One uncached Google Maps Geocoding call (the fallback). Returns results
 * (empty on any failure / when the key is unset). Scoped to Vietnam.
 */
async function googleGeocodeOnce(text: string): Promise<GoogleGeocodeResult[]> {
  if (!config.googleMapsApiKey) return [];
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(text)}` +
    `&components=country:vn&language=vi` +
    `&key=${encodeURIComponent(config.googleMapsApiKey)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: GoogleGeocodeResult[] };
    return Array.isArray(body?.results) ? body.results : [];
  } catch {
    return [];
  }
}

/** locationBias circle: softly ranks Hải Phòng-area yards first (bias, not restriction). */
const LOCATION_BIAS = {
  circle: {
    center: { latitude: 20.86, longitude: 106.68 },
    radius: 50_000, // API max — anything larger is rejected as INVALID_ARGUMENT
  },
};

/**
 * One uncached Google Places Autocomplete (New) call. Unlike Geocoding, it
 * matches partial input and business names ("SINOVNL", "Trà Xanh Ngọc") and
 * returns up to 5 candidate suggestions. Predictions carry no coordinates.
 *
 * Returns null when the REQUEST fails (missing key, non-2xx, network) —
 * distinct from [] (genuine no-match) so callers don't cache the degraded
 * fallback for months. Failures are logged: silent provider outages in this
 * module were painful to diagnose before.
 */
async function googlePlacesAutocompleteOnce(
  input: string,
  sessionToken?: string,
): Promise<PlacesAutocompletePrediction[] | null> {
  if (!config.googleMapsApiKey) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googleMapsApiKey,
      },
      body: JSON.stringify({
        input,
        // Omitted when absent — older clients don't send a token.
        ...(sessionToken ? { sessionToken } : {}),
        includedRegionCodes: ['vn'],
        // Vietnamese output — omitted languageCode defaults to en on a
        // server-side call (no Accept-Language header).
        languageCode: 'vi',
        // Soft bias (not a restriction): local yards rank first, the rest of
        // Vietnam still ranks normally.
        locationBias: LOCATION_BIAS,
      }),
    });
    if (!res.ok) {
      console.warn(`[map4d] Places autocomplete non-ok: ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { suggestions?: PlacesAutocompletePrediction[] };
    return Array.isArray(body?.suggestions) ? body.suggestions : [];
  } catch (e) {
    console.warn(`[map4d] Places autocomplete failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Resolved suggestion set plus whether it came from the outage fallback. */
interface ResolvedSuggestions {
  suggestions: Map4dSuggestion[];
  /** Places FAILED (not a genuine no-match) — cache briefly, not for months. */
  degraded: boolean;
}

/**
 * Uncached autocomplete resolution: Google Places Autocomplete (New) first —
 * unlike Geocoding it matches partial input and business names. Falls back to
 * Geocoding when autocomplete yields nothing, which keeps pasted full
 * addresses resolving (Geocoding's strength). When Places itself FAILED
 * (vs a genuine no-match) the fallback is marked degraded so the cache only
 * holds it for minutes. Uncached — the Redis layer is the only cache.
 */
async function resolveSuggestionsOnce(
  q: string,
  limit: number,
  sessionToken?: string,
): Promise<ResolvedSuggestions> {
  const predictions = await googlePlacesAutocompleteOnce(q, sessionToken);
  const viaAutocomplete =
    predictions === null ? [] : placePredictionsToSuggestions(predictions, limit);
  if (viaAutocomplete.length > 0) {
    return { suggestions: viaAutocomplete, degraded: false };
  }
  return {
    suggestions: mapToSuggestions((await googleGeocodeOnce(q)).map(googleResultToPlace), limit),
    degraded: predictions === null,
  };
}

/** Cached place autocomplete. Places (New) first, Geocoding fallback. */
export async function searchPlaces(query: string, limit = 8, sessionToken?: string): Promise<Map4dSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  // v3 key: cached value became a {suggestions, degraded} wrapper (v2 held
  // raw Map4dSuggestion[], v1 Map4dPlace rows). Old entries expire untouched.
  const key = `map4d:place:search:v3:${q.toLowerCase()}`;
  // Suggestions cached per query (sliced at resolve time); every caller uses
  // the default limit of 8, so first-writer-wins on the slice is moot.
  const resolved = await cacheGet<ResolvedSuggestions>(
    key,
    (res) => {
      if (res.degraded) return EMPTY_CACHE_TTL_SECONDS;
      return res.suggestions.length > 0 ? THREE_MONTHS_TTL_SECONDS : EMPTY_CACHE_TTL_SECONDS;
    },
    () => resolveSuggestionsOnce(q, limit, sessionToken)
  );
  // Defensive: a malformed cached payload must not crash the route.
  return (Array.isArray(resolved?.suggestions) ? resolved.suggestions : []).slice(0, limit);
}

/**
 * Resolve a place-name to [lat, lng] (cached, incl. null results). Google Maps Geocoding.
 * Mirrors the contract of the old osm.geocodePlace; powers GPS leg-coordinate resolution.
 */
export async function geocodePlace(place: string): Promise<[number, number] | null> {
  const p = place.trim();
  if (!p) return null;
  const key = `map4d:place:geocode:${p.toLowerCase()}`;
  return cacheGet<[number, number] | null>(
    key,
    (res) => (res !== null ? THREE_MONTHS_TTL_SECONDS : EMPTY_CACHE_TTL_SECONDS),
    async () =>
      // Comma-tail fallback (via geocodeFromLookup): suggestions picked from
      // Places are business-name-prefixed strings that whole-string Geocoding
      // often misses — retry over trailing comma-substrings before giving up
      // (first hit costs exactly one lookup, same as before).
      geocodeFromLookup(p, (text) =>
        googleGeocodeOnce(text).then((rows) => rows.map(googleResultToPlace))
      )
  );
}

// ── TEMPORARY DIAGNOSTIC ───────────────────────────────────────────────────
// Surfaces each source's RAW http status + body head so we can see WHY a query
// comes back empty (referrer block, dead key, network, wrong shape). Exposed
// via the autocomplete route's ?debug=1. DELETE once location search is live.
interface SourceDiag {
  httpStatus: number | null;
  bodyHead: string;
  count: number;
  error: string;
}
export interface PlaceSearchDiag {
  query: string;
  keys: { map4d: boolean; google: boolean };
  map4dUrl: string;
  map4d: SourceDiag;
  google: SourceDiag;
}

function errStr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function debugResolve(query: string): Promise<PlaceSearchDiag> {
  const q = query.trim();
  const diag: PlaceSearchDiag = {
    query: q,
    keys: { map4d: !!config.map4dApiKey, google: !!config.googleMapsApiKey },
    map4dUrl: '',
    map4d: { httpStatus: null, bodyHead: '', count: 0, error: '' },
    google: { httpStatus: null, bodyHead: '', count: 0, error: '' },
  };

  if (config.map4dApiKey) {
    const url =
      `${config.map4dApiUrl}/sdk/place/text-search` +
      `?key=${encodeURIComponent(config.map4dApiKey)}` +
      `&text=${encodeURIComponent(q)}&accuracy=0`;
    diag.map4dUrl = url.replace(config.map4dApiKey, '***');
    try {
      const res = await fetch(url, { headers: BACHKHOA_BROWSER_HEADERS });
      diag.map4d.httpStatus = res.status;
      const text = await res.text();
      diag.map4d.bodyHead = text.slice(0, 400);
      const parsed = JSON.parse(text) as Map4dResponse;
      diag.map4d.count = Array.isArray(parsed?.result) ? parsed.result.length : 0;
    } catch (e) {
      diag.map4d.error = errStr(e);
    }
  } else {
    diag.map4d.error = 'MAP4D_API_KEY not set';
  }

  if (config.googleMapsApiKey) {
    // Probe the same Places Autocomplete (New) call searchPlaces makes.
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
        },
        body: JSON.stringify({ input: q, includedRegionCodes: ['vn'], languageCode: 'vi', locationBias: LOCATION_BIAS }),
      });
      diag.google.httpStatus = res.status;
      const text = await res.text();
      diag.google.bodyHead = text.slice(0, 400);
      const parsed = JSON.parse(text) as { suggestions?: unknown[] };
      diag.google.count = Array.isArray(parsed?.suggestions) ? parsed.suggestions.length : 0;
    } catch (e) {
      diag.google.error = errStr(e);
    }
  } else {
    diag.google.error = 'GOOGLE_MAPS_API_KEY not set';
  }

  return diag;
}
