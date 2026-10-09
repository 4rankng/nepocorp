import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../../hooks/useClickOutside';

/**
 * An anchored dropdown rendered through a portal on `document.body`.
 *
 * The page content lives inside `.app-body`, a scroll container with
 * `overflow-y: auto; overflow-x: hidden`. A dropdown positioned as a plain
 * absolute child of that container is clipped when the anchor sits near the
 * bottom of the scrollport — the menu renders off-screen and the click looks
 * like it did nothing at all, with no toast and no menu (kanban 091026213520).
 *
 * Portalling to `document.body` takes the menu out of the scroll container, and
 * measuring the anchor lets us flip it above the button when there is not enough
 * room below, and clamp it to the viewport horizontally.
 */
export function AnchoredDropdown({
  open,
  anchorRef,
  onDismiss,
  children,
  minWidth,
  className,
}: {
  open: boolean;
  /** The positioned wrapper around the trigger button. */
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: ReactNode;
  minWidth?: number;
  className?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const a = anchor.getBoundingClientRect();
    const menu = menuRef.current;
    const menuH = menu?.offsetHeight ?? 0;
    const menuW = menu?.offsetWidth ?? 0;
    const margin = 4;
    const gutter = 8;

    // Flip above the trigger when the menu would overflow the viewport bottom.
    const fitsBelow = a.bottom + margin + menuH <= window.innerHeight - gutter;
    const top = fitsBelow ? a.bottom + margin : Math.max(gutter, a.top - margin - menuH);

    // Align to the trigger's right edge, then clamp inside the viewport.
    let left = a.right - menuW;
    if (left + menuW > window.innerWidth - gutter) left = window.innerWidth - gutter - menuW;
    if (left < gutter) left = gutter;

    setPos({ top, left });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => reposition();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, reposition]);

  // Dismiss on outside click / Escape. Both refs are checked because the menu is
  // portalled out of the anchor's DOM subtree.
  const dismissRef = useRef<HTMLDivElement>(null);
  useClickOutside(
    dismissRef,
    onDismiss,
    {
      escapeKey: true,
      enabled: open,
    },
  );

  if (!open) return null;

  return createPortal(
    <div
      ref={dismissRef}
      role="menu"
      className={className}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        minWidth,
        visibility: pos ? 'visible' : 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        boxShadow: 'var(--sh-lg)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}