export interface PlaceSuggestion {
  placeId: string;
  description: string;
}

// ── In-memory cache for autocomplete (50 entries, 5-min TTL) ─────────────

const suggestionCache = new Map<string, { data: PlaceSuggestion[]; ts: number }>();
const CACHE_MAX = 50;
const CACHE_TTL = 5 * 60 * 1000;

// ── Public API ────────────────────────────────────────────────────────────

export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  if (!input.trim() || input.trim().length < 2) return [];

  const key = input.trim().toLowerCase();

  // Check cache
  const cached = suggestionCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const res = await fetch(`/api/maps/autocomplete?q=${encodeURIComponent(input)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const suggestions: PlaceSuggestion[] = data.suggestions ?? [];

    // Evict oldest if at capacity
    if (suggestionCache.size >= CACHE_MAX) {
      const oldest = suggestionCache.keys().next().value;
      if (oldest) suggestionCache.delete(oldest);
    }
    suggestionCache.set(key, { data: suggestions, ts: Date.now() });

    return suggestions;
  } catch {
    return [];
  }
}

export async function calculateDistanceKm(origin: string, destination: string): Promise<number | null> {
  if (!origin || !destination || origin === destination) return null;

  try {
    const res = await fetch(
      `/api/maps/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.km ?? null;
  } catch {
    return null;
  }
}
