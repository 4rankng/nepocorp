// Route-key → SPA path resolution for the bot's navigate directives. Split out
// of `AgentDirectiveProvider.tsx` so that module exports only the component
// (React Fast Refresh); the provider and its test import resolvePath from here.

import { PAGE_CATALOG, type AgentRouteKey } from '@tingting/shared';

/** Resolve a routeKey + optional params to an SPA path via the page catalog.
 *  Typed (no more `as Record<string, unknown>` cast): the catalog knows which
 *  entries are parametric. Detail/edit routes take a single id; accept any of
 *  the common param keys the LLM may emit (id, tripId, payableId, debtId,
 *  expenseId, …) and fall back to the first numeric value present — otherwise
 *  the builder gets 0 and the user lands on an empty /path/0 page. */
export function resolvePath(routeKey: AgentRouteKey, params?: Record<string, string | number>): string {
  const entry = PAGE_CATALOG[routeKey];
  if (typeof entry.path === 'function') {
    const id =
      params?.id ??
      params?.tripId ??
      params?.payableId ??
      params?.debtId ??
      params?.expenseId ??
      (params ? Object.values(params).find((v) => typeof v === 'number' || /^\d+$/.test(String(v))) : undefined) ??
      0;
    // Pass the resolved id under the builder's declared key. Most routes read
    // `p.id`, but tire pages read `p.truckId` / `p.trailerId` — hardcoding
    // `{ id }` would land on /fleet/undefined/tires. requiresParams is declared
    // per parametric catalog entry and is the authoritative key name.
    const key = entry.requiresParams[0] ?? 'id';
    return entry.path({ [key]: id });
  }
  return entry.path;
}
