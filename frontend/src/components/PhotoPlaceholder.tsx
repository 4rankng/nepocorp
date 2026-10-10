import React from 'react';
import { ImageOff } from 'lucide-react';
import './PhotoPlaceholder.css';

interface PhotoPlaceholderProps {
  /** Short caption for the tile, e.g. `Ảnh 1`. Omitted for compact thumbnails. */
  label?: string;
  /**
   * Compact mode for the small container/seal thumbnails (82×58): icon plus a
   * short notice; the full explanation lives in the `title`/`aria-label`.
   */
  compact?: boolean;
}

/** Explanation shown (or, in compact mode, tooltipped) under the notice. */
const HINT_DETAIL = 'Ảnh có thể đã bị xoá hoặc không còn trên máy chủ';
/** Full notice for the grid tile. */
const HINT = 'Không tải được ảnh';
/** Shorter notice for the 82×58 container/seal thumb. */
const HINT_COMPACT = 'Không tải được';

/**
 * Fallback rendered in place of a photo whose bytes can no longer be served —
 * `GET /api/photos/…` answers 404 when the stored file is gone. It replaces the
 * browser's default broken-image glyph (a tiny "?" that reads as a rendering
 * bug) with an explicit, styled notice, and names the likely cause so office
 * staff can tell "the evidence is missing" apart from "the page is slow".
 *
 * Renders inside the existing tile/thumbnail button, so it fills its parent.
 */
export function PhotoPlaceholder({ label, compact = false }: PhotoPlaceholderProps) {
  const aria = `${label ?? 'Ảnh'} — ${HINT}`;
  return (
    <span
      className={compact ? 'photo-ph photo-ph--compact' : 'photo-ph'}
      role="img"
      aria-label={aria}
      title={HINT_DETAIL}
    >
      <ImageOff size={compact ? 16 : 20} aria-hidden="true" />
      {label && <span className="photo-ph__label">{label}</span>}
      <span className="photo-ph__hint">{compact ? HINT_COMPACT : HINT}</span>
      {!compact && <span className="photo-ph__sub">{HINT_DETAIL}</span>}
    </span>
  );
}
