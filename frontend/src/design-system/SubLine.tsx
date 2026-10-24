import type { ReactNode } from 'react';
import './SubLine.css';

/**
 * SubLine — data-dense law 27/9 (NEPO-16).
 *
 * The muted second line under a primary cell value (phone under the supplier
 * name, alias, contact info) must not render at all when its datum is empty.
 * The payables list used to fall back to '—' under 4 of 5 supplier names,
 * which read as stray underscores; the wrapper itself was the defect.
 *
 * Render nothing when there is nothing to say — never a placeholder line:
 *
 *   <td>
 *     <div className="…">{d.supplier.name}</div>
 *     <SubLine value={d.supplier.phone} />
 *   </td>
 *
 * `children` wins over `value` when both are given; give children only when
 * they are known non-empty (the component cannot see inside them), e.g.
 * `<SubLine><Phone size={12} /> {phone}</SubLine>` guarded by the phone check.
 */
export interface SubLineProps {
  /** The sub-line datum. null/undefined/''/'—' (trimmed) renders nothing. */
  value?: string | number | null;
  /** Custom content — wins over `value`. Only render when it is real content. */
  children?: ReactNode;
  className?: string;
  /** Hover/tooltip text for truncated lines. */
  title?: string;
}

const EMPTY_VALUES = new Set<string | number | null | undefined>([null, undefined, '', '—']);

export function SubLine({ value, children, className, title }: SubLineProps) {
  const text = typeof value === 'string' ? value.trim() : value;
  if (EMPTY_VALUES.has(text)) return null;
  if (children === undefined && text === undefined) return null;
  return (
    <div className={`ds-sub-line${className ? ` ${className}` : ''}`} title={title}>
      {children ?? text}
    </div>
  );
}
