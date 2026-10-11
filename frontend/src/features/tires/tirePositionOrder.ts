// Tire-position ordering helper. Split out of `tire-controls.tsx` so that
// module exports only components (React Fast Refresh).

import type { TirePosition } from '@tingting/shared';

/** Next sort_order value: 10 past the current max (or 10 for the first row). */
export function computeNextSortOrder(positions: TirePosition[]): number {
  return positions.length ? Math.max(...positions.map((p) => p.sortOrder)) + 10 : 10;
}
