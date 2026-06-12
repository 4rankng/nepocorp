import React from 'react';

/** Semantic status colors used across entity lists (users, suppliers, customers). */
export const STATUS_COLORS = {
  active: '#059669',
  inactive: '#DC2626',
} as const;

/** Resolve status string to color. ACTIVE → emerald, anything else → red. */
export function getStatusColor(status: string): string {
  return status === 'ACTIVE' ? STATUS_COLORS.active : STATUS_COLORS.inactive;
}

/**
 * Absolute-positioned color bar for the left edge of a table cell.
 * Parent `<td>` must have `position: 'relative'`.
 */
export function StatusStrip({ status }: { status: string }) {
  return (
    <span style={{
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 4,
      height: 32,
      borderRadius: '0 4px 4px 0',
      background: getStatusColor(status),
      pointerEvents: 'none',
    }} />
  );
}

/**
 * Small colored dot for filter tabs and legends.
 * `size` defaults to 7 (filter tabs) — use 4 for legend swatches.
 */
export function StatusDot({ status, size = 7, style }: { status: string; size?: number; style?: React.CSSProperties }) {
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: getStatusColor(status),
      display: 'inline-block',
      ...style,
    }} />
  );
}

/**
 * Small vertical strip swatch for inline legends.
 * Thinner/shorter than StatusStrip — designed for flex rows, not table cells.
 */
export function StatusSwatch({ status }: { status: string }) {
  return (
    <span style={{
      width: 4,
      height: 20,
      borderRadius: '0 4px 4px 0',
      background: getStatusColor(status),
      display: 'inline-block',
    }} />
  );
}
