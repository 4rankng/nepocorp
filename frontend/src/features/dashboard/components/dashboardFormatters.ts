// Pure formatters + label/icon lookups for the dashboard. Split out of
// `dashboard-presenters.tsx` so that module exports only components (React Fast
// Refresh).

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
