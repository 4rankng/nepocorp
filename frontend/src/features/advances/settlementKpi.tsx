import type { KeyboardEvent } from 'react';
import { AssetIcon, type AssetIconName } from '../../components/AssetIcon';

/* ── Compact KPI card — mirrors AdminAdvancesPage .adv-kpi proportions ── */

interface AsKPIProps {
  label: string;
  value: number;
  meta: string;
  variant: 'warn' | 'info' | 'success' | 'danger';
  iconName: AssetIconName;
  active?: boolean;
  hasItems?: boolean;
  // Omit onClick for a summary-only stat (no filter to toggle). Renders as a
  // non-interactive element instead of a dead role="button" in the tab order.
  onClick?: () => void;
}

export function AsKPI({ label, value, meta, variant, iconName, active = false, hasItems = false, onClick }: AsKPIProps) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      className={`as-kpi as-kpi--${variant}${active ? ' is-active' : ''}${hasItems ? ' has-items' : ''}${interactive ? '' : ' as-kpi--static'}`}
      {...(interactive
        ? { onClick, role: 'button', tabIndex: 0, onKeyDown: (e: KeyboardEvent) => e.key === 'Enter' && onClick() }
        : {})}
    >
      <div className="as-kpi__label">{label}</div>
      <div className="as-kpi__value">{value}</div>
      <div className="as-kpi__meta">{meta}</div>
      <AssetIcon name={iconName} size={58} className="as-kpi__asset" />
    </div>
  );
}
