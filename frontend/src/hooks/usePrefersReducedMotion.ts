import { useState, useEffect } from 'react';

/**
 * Reactive hook for `prefers-reduced-motion` media query.
 * Returns `true` when the user has requested reduced motion.
 * Listens for runtime preference changes (e.g., toggling in DevTools).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}
