import { Money } from '../../../components/shared/Money';

// greeting / fmtVN / runningSum / decisionIcon / severityLabel live in
// ./dashboardFormatters so this module exports only components (React Fast Refresh).

export function DeltaPill({ mom, suffix = '', flatLabel = '0%' }: { mom: string | null; suffix?: string; flatLabel?: string }) {
  if (!mom) return <span className="d-badge d-badge-ghost d-badge-sm delta flat">{flatLabel}</span>;
  const isUp = mom.startsWith('+');
  const isDown = mom.startsWith('-');
  const className = isUp ? 'delta up' : isDown ? 'delta down' : 'delta flat';
  const badgeClass = isUp ? 'd-badge-success' : isDown ? 'd-badge-error' : 'd-badge-ghost';
  const symbol = isUp ? '▲' : isDown ? '▼' : '·';
  return <span className={`d-badge d-badge-soft d-badge-sm ${badgeClass} ${className}`}>{symbol} {mom.replace(/^[+-]/, '')}{suffix}</span>;
}

export interface CostBreakdownItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export function CostBreakdown({ items, total }: { items: CostBreakdownItem[]; total: number }) {
  const summary = items
    .map(item => `${item.name} ${item.pct}%`)
    .join(', ');

  return (
    <div className="wf-cost-breakdown">
      <div className="wf-cost-summary">
        <span className="wf-cost-summary__label">Tổng chi phí đã ghi nhận</span>
        <strong className="wf-cost-summary__value"><Money value={total} /></strong>
        <span className="wf-cost-summary__meta">{items.length} nhóm chi phí · 100%</span>
      </div>

      <div
        className="wf-cost-stack"
        role="img"
        aria-label={`Cơ cấu chi phí: ${summary}`}
      >
        {items.map(item => (
          <span
            key={item.name}
            className="wf-cost-stack__segment"
            style={{ background: item.color, flexGrow: item.pct }}
          />
        ))}
      </div>

      <div className="wf-cost-list" role="list">
        {items.map(item => (
          <div
            key={item.name}
            className="wf-cost-row"
            role="listitem"
            aria-label={`${item.name}: ${item.value.toLocaleString('vi-VN')} đồng, ${item.pct}%`}
          >
            <div className="wf-cost-row__heading">
              <span className="wf-cost-row__name">
                <span className="wf-cost-row__swatch" style={{ background: item.color }} />
                {item.name}
              </span>
              <span className="wf-cost-row__amount"><Money value={item.value} /></span>
              <span className="wf-cost-row__pct">{item.pct}%</span>
            </div>
            <div className="wf-cost-row__track" aria-hidden="true">
              <span style={{ background: item.color, width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
