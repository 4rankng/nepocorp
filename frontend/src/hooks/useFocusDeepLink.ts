import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Scroll-to-and-highlight an element when the URL has `?focus=<id>`.
 * After the animation completes the `focus` param is removed from the URL.
 *
 * @param prefix — the id prefix, e.g. `"adv"` → looks for `#adv-<focusId>`
 */
export function useFocusDeepLink(prefix: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('focus');

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`${prefix}-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.animate?.([
      { boxShadow: 'inset 0 0 0 2px var(--accent), 0 0 0 2px rgba(59,130,246,0.25)' },
      { boxShadow: 'none' },
    ], { duration: 2000, easing: 'ease-out' });
    setSearchParams({}, { replace: true });
  }, [focusId, prefix, setSearchParams]);

  return focusId;
}
