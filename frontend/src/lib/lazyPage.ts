// Route-level code splitting with self-healing.
//
// React caches a rejected `lazy()` payload for the lifetime of the module
// instance. Once a page chunk fails to load — a stale build after a deploy, a
// dev server restarting under an open tab, a dropped request — every later
// render of that route re-throws the cached rejection. Re-clicking the sidebar
// item and the ErrorBoundary's "Thử lại" both stay dead, so the only way out is
// a full browser reload (kanban 101026145010: "sidebar navigation intermittently
// stops responding … restart browser to recover").
//
// This wrapper catches the failure where it happens: the first chunk failure in
// a session runs the shared recovery (purge caches + reload once, see
// `chunk-error.ts`) and holds Suspense on its fallback while the document
// reloads. Past the once-per-session cap it rethrows, so the boundary shows a
// terminal message instead of looping.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkFailureMessage, recoverFromChunkFailure } from './chunk-error';

/** Never settles — keeps Suspense on its fallback while the pending reload lands. */
export const PENDING_RELOAD: Promise<never> = new Promise<never>(() => {});

/**
 * Failure policy for a page chunk load. Returns `PENDING_RELOAD` when the shared
 * recovery took over (the tab is about to reload); otherwise rethrows so the
 * route's ErrorBoundary renders.
 */
export function handleLazyFailure(error: unknown): Promise<never> {
  const message = error instanceof Error ? error.message : String(error);
  if (isChunkFailureMessage(message) && recoverFromChunkFailure()) {
    return PENDING_RELOAD;
  }
  throw error;
}

/**
 * `React.lazy` for a route module, with stale-chunk recovery.
 *
 * Generic over the page's props (`/fleet/trailers/:id/tires` passes `vehicle`);
 * pages that take none simply infer `P = unknown`, which accepts `<Page />`.
 */
export function lazyPage(
  loader: () => Promise<never>,
): LazyExoticComponent<ComponentType>;
export function lazyPage<P>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): LazyExoticComponent<ComponentType<P>>;
export function lazyPage<P>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() => loader().catch(handleLazyFailure));
}
