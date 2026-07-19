import type { DashboardDecisionKind, DashboardDecisionSeverity } from '@tingting/shared';
import type { AssetIconName } from '../../../components/AssetIcon';

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export const fmtVN = (value: number) => Math.round(value).toLocaleString('vi-VN');

export const runningSum = (values: number[]): number[] => {
  let total = 0;
  return values.map((value) => (total += value));
};

export function DeltaPill({ mom, suffix = '', flatLabel = '0%' }: { mom: string | null; suffix?: string; flatLabel?: string }) {
  if (!mom) return <span className="d-badge d-badge-ghost d-badge-sm delta flat">{flatLabel}</span>;
  const isUp = mom.startsWith('+');
  const isDown = mom.startsWith('-');
  const className = isUp ? 'delta up' : isDown ? 'delta down' : 'delta flat';
  const badgeClass = isUp ? 'd-badge-success' : isDown ? 'd-badge-error' : 'd-badge-ghost';
  const symbol = isUp ? '▲' : isDown ? '▼' : '·';
  return <span className={`d-badge d-badge-soft d-badge-sm ${badgeClass} ${className}`}>{symbol} {mom.replace(/^[+-]/, '')}{suffix}</span>;
}

const DECISION_ICONS: Record<DashboardDecisionKind, AssetIconName> = {
  receivables: 'receivables', dispatch: 'dispatch', renewal: 'schedule', fuel: 'fuel',
  'trip-lock': 'checklist', 'trip-data': 'document', 'profit-close': 'profit', 'all-clear': 'paid',
};

export function decisionIcon(kind: DashboardDecisionKind): AssetIconName {
  return DECISION_ICONS[kind] ?? 'alert';
}

export function severityLabel(severity: DashboardDecisionSeverity): string {
  if (severity === 'critical') return 'Gấp';
  if (severity === 'warning') return 'Cần xử lý';
  if (severity === 'success') return 'Ổn';
  return 'Theo dõi';
}

export interface DonutSlice { name: string; pct: number; color: string }

export function CostDonut({ slices, totalCompact }: { slices: DonutSlice[]; totalCompact: string }) {
  let offset = 0;
  const segments = slices.map((slice) => {
    const segment = { color: slice.color, dasharray: `${slice.pct} ${100 - slice.pct}`, offset: -offset };
    offset += slice.pct;
    return segment;
  });
  const spaceIndex = totalCompact.indexOf(' ');
  const number = spaceIndex > -1 ? totalCompact.slice(0, spaceIndex) : totalCompact;
  const unit = spaceIndex > -1 ? totalCompact.slice(spaceIndex + 1) : '';
  return (
    <div className="wf-donut">
      <svg viewBox="0 0 42 42" style={{ width: 118, height: 118, transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef1ef" strokeWidth="7" />
        {segments.map((segment, index) => <circle key={index} cx="21" cy="21" r="15.9" fill="none" stroke={segment.color} strokeWidth="7" strokeDasharray={segment.dasharray} strokeDashoffset={segment.offset} />)}
      </svg>
      <div className="ctr"><span className="big">{number}</span><span className="sm">{unit ? `${unit} ₫` : '₫'}</span></div>
    </div>
  );
}
