import { useEffect, useRef } from 'react';

export interface PageAccumulator<T> {
  /** Filter/search signature the accumulated pages belong to. */
  key: string;
  /** Highest page folded in. */
  page: number;
  items: T[];
}

/**
 * Fold one fetched page into the accumulated list.
 *
 * Pure so it is safe to call during render (StrictMode double-invokes it, and
 * the result is idempotent for identical arguments).
 *
 * Re-fetching a page you already hold — a background refetch, a mutation
 * invalidation, a remount — must REPLACE that page's slice, not restart the
 * list, otherwise scrolling a long list loses everything above the current
 * page. Jumping backwards discards everything after the requested page.
 */
export function accumulatePage<T>(
  acc: PageAccumulator<T>,
  key: string,
  page: number,
  pageSize: number,
  fetched: T[],
): PageAccumulator<T> {
  if (acc.key !== key) return { key, page, items: fetched };
  if (page === acc.page) {
    // Replace everything from this page's offset onward. `keepPreviousData`
    // serves the previous page while this one loads, and that placeholder can
    // be a different length than the real page (a 25-row page 2 standing in for
    // a 2-row page 3), so a fixed-length splice would leave the surplus behind.
    return { key, page, items: [...acc.items.slice(0, (page - 1) * pageSize), ...fetched] };
  }
  if (page > acc.page) return { key, page, items: [...acc.items, ...fetched] };
  return { key, page, items: fetched };
}

export interface UseInfiniteScrollOpts {
  /** Load the next batch only while there is one. */
  enabled: boolean;
  onLoadMore: () => void;
  /**
   * Trigger distance in px ahead of the sentinel. Large enough that the next
   * batch is usually in flight before the user reaches the bottom.
   */
  rootMarginPx?: number;
}

/**
 * Attach the returned ref to a sentinel element rendered after the last row.
 * When the sentinel scrolls into view the next page is requested.
 *
 * Two details matter here:
 *  - `IntersectionObserver` fires on *changes*, so after a batch finishes the
 *    sentinel may still be on screen and never fire again. The effect therefore
 *    also does an immediate geometry check and re-runs whenever `enabled`
 *    flips, which walks the list down until the sentinel leaves the viewport.
 *  - The app scrolls inside `.app-body`, not the window. A `root: null`
 *    observer still works: the intersection rect is clipped by intermediate
 *    scroll containers.
 */
export function useInfiniteScroll({
  enabled,
  onLoadMore,
  rootMarginPx = 400,
}: UseInfiniteScrollOpts) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;

    const fire = () => callbackRef.current();
    const inRange = () => {
      const rect = node.getBoundingClientRect();
      // A sentinel that has not been laid out (jsdom, display:none, or before
      // first paint) has no box and must not trigger a load.
      if (rect.width === 0 && rect.height === 0) return false;
      return rect.top <= window.innerHeight + rootMarginPx && rect.bottom >= -rootMarginPx;
    };

    // jsdom (and very old browsers) have no IntersectionObserver. The geometry
    // check below still drives the list, so the hook degrades instead of
    // throwing.
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) fire();
        },
        { rootMargin: `${rootMarginPx}px 0px` },
      )
      : null;
    observer?.observe(node);
    if (inRange()) fire();

    return () => observer?.disconnect();
  }, [enabled, rootMarginPx]);

  return sentinelRef;
}
