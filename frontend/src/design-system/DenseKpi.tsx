import type { ReactNode } from 'react';
import './Density.css';

/**
 * DenseKpi — the codified FinancePage KPI density (NEPO-16, ADR 0045).
 *
 * Token-driven card: padding var(--kpi-pad-y/x) = 14/16px, value at
 * var(--fs-2xl) on one line, muted meta line. Pages adopt the density without
 * copying the FinancePage layout — grids, rails and watermarks stay per page.
 */
export interface DenseKpiProps {
  label: ReactNode;
  /** The headline figure, already formatted. A complete amount never wraps. */
  value: ReactNode;
  /** Currency/count unit rendered beside the value ('₫', 'phiếu', …). */
  unit?: ReactNode;
  /** Muted secondary line (counts, sub-amounts). */
  meta?: ReactNode;
  /** Optional color accent for the value (e.g. 'var(--danger)'). */
  valueClassName?: string;
  className?: string;
}

export function DenseKpi({ label, value, unit, meta, valueClassName, className }: DenseKpiProps) {
  return (
    <div className={`ds-kpi${className ? ` ${className}` : ''}`}>
      <div className="ds-kpi__label">{label}</div>
      <div className={`ds-kpi__value${valueClassName ? ` ${valueClassName}` : ''}`}>
        {value}
        {unit !== undefined && unit !== null && <span className="ds-kpi__unit">{unit}</span>}
      </div>
      {meta !== undefined && meta !== null && <div className="ds-kpi__meta">{meta}</div>}
    </div>
  );
}
