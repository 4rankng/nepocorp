import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ClickableCardProps {
  /** Route to navigate to on click / Enter / Space. Optional — omit when
   *  the card only triggers in-page state changes (e.g. opening an edit
   *  modal). */
  to?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Click handler — runs before navigation. If `to` is omitted, the
   *  handler is the only side effect. */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Stop click propagation (e.g. when nested in another clickable parent). */
  stopPropagation?: boolean;
  /** Accessible label for screen readers when children contain no text. */
  ariaLabel?: string;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Clickable card with full keyboard accessibility. Replaces the 18-file
 * pattern of:
 *
 *   <div onClick={() => navigate('/...')} role="button" tabIndex={0}
 *        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate('/...'); } }}>
 *
 * - Click and Enter / Space navigate to `to` (if provided).
 * - Renders an `aria-label` when the visible children have no accessible name.
 * - `stopPropagation` is provided for the rare case where the card is nested
 *   inside another clickable parent (TripListPage, TripDetailPage).
 * - When `to` is omitted, only the `onClick` handler fires — useful for
 *   rows that open a modal but don't navigate.
 */
export function ClickableCard({
  to,
  children,
  className,
  style,
  onClick,
  stopPropagation = false,
  ariaLabel,
  onMouseEnter,
  onMouseLeave,
}: ClickableCardProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (stopPropagation) e.stopPropagation();
      onClick?.(e);
      if (to) navigate(to);
    },
    [navigate, to, onClick, stopPropagation],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (stopPropagation) e.stopPropagation();
        if (to) navigate(to);
      }
    },
    [navigate, to, stopPropagation],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
