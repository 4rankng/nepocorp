import { useEffect, type RefObject } from 'react';

/**
 * Attach click-outside + optional Escape-key dismissal to a container ref.
 * The listener is only active while `enabled` is true (default: true).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  options?: { escapeKey?: boolean; enabled?: boolean },
) {
  const { escapeKey = false, enabled = true } = options ?? {};

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (escapeKey && e.key === 'Escape') onDismiss();
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handler);
    if (escapeKey) document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      if (escapeKey) document.removeEventListener('keydown', handler);
    };
  }, [ref, onDismiss, enabled, escapeKey]);
}
