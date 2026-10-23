/**
 * Central source of truth for empty-state illustrations.
 *
 * The app ships four flat-vector SVG illustrations (palette mirrors the
 * --illus-* tokens in styles/tokens.css):
 *   - container-truck.webp    semi truck hauling a container  -> "trips"
 *   - empty-flat-fleet.svg   truck hauling a container      -> "fleet"
 *   - empty-flat-ops.svg     dispatch map + route + pin     -> "ops"
 *   - empty-flat-finance.svg invoice + coin                 -> "finance"
 *
 * Every former empty-*.svg / empty-*.png slot maps to one of these four so the
 * whole app shares a consistent, illustrated empty-state language. Callers may
 * pass either a legacy bare name ("empty-trips"), a legacy path
 * ("/assets/illustrations/empty-trips.svg"), or a category key
 * ("trips" | "fleet" | "ops" | "finance"). Unknown inputs are returned
 * unchanged so any non-empty illustration path keeps working untouched.
 */

const BASE = '/assets/illustrations';

export type EmptyCategory = 'trips' | 'fleet' | 'ops' | 'finance';

export const EMPTY_ILLUSTRATIONS: Record<EmptyCategory, string> = {
  // Generated container-truck art (Nano Banana/MiniMax, keyed webp) — user
  // request 24/10: thay xe nhỏ bằng xe đầu kéo container.
  trips: `${BASE}/container-truck.webp`,
  fleet: `${BASE}/empty-flat-fleet.svg`,
  ops: `${BASE}/empty-flat-ops.svg`,
  finance: `${BASE}/empty-flat-finance.svg`,
};

/** Legacy empty-*.svg basenames (no path, no extension) -> category. */
const CATEGORY_BY_NAME: Record<string, EmptyCategory> = {
  // field delivery / trips
  'empty-trips': 'trips',
  'empty-forwarder': 'trips',
  'empty-routes': 'trips',
  'empty-matching': 'trips',
  // warehouse / fleet / physical goods
  'empty-fleet': 'fleet',
  'empty-trucks': 'fleet',
  'empty-clients': 'fleet',
  // planner / office / general operations
  'empty-dispatch': 'ops',
  'empty-search': 'ops',
  'empty-users': 'ops',
  'empty-config': 'ops',
  'empty-notifications': 'ops',
  'empty-welcome': 'ops',
  'empty-error': 'ops',
  // finance / documents / compliance
  'empty-advances': 'finance',
  'empty-audit': 'finance',
  'empty-debts': 'finance',
  'empty-earnings': 'finance',
  'empty-expenses': 'finance',
  'empty-payables': 'finance',
  'empty-penalties': 'finance',
  'empty-penalty-reasons': 'finance',
  'empty-salary': 'finance',
  'empty-pie': 'finance',
  'empty-pricing': 'finance',
};

function toBareName(input: string): string {
  return input
    .replace(/^\//, '')
    .replace(/^assets\/illustrations\//, '')
    .replace(/\.(svg|png)$/i, '')
    .trim();
}

/**
 * Resolve any empty-state illustration input to a flat-SVG asset path.
 * Returns the general ("ops") illustration when no input is given, and
 * passes unknown inputs through unchanged (defensive for non-empty art).
 */
export function resolveEmptyIllustration(input?: string): string {
  if (!input) return EMPTY_ILLUSTRATIONS.ops;
  const bare = toBareName(input);
  const category = CATEGORY_BY_NAME[bare];
  if (category) return EMPTY_ILLUSTRATIONS[category];
  if ((Object.keys(EMPTY_ILLUSTRATIONS) as EmptyCategory[]).includes(bare as EmptyCategory)) {
    return EMPTY_ILLUSTRATIONS[bare as EmptyCategory];
  }
  return input;
}
