import type { FleetFilter } from '../utils';

interface FleetCounts {
  all: number;
  running: number;
  ready: number;
  noassign: number;
  maint: number;
}

interface DispatchFiltersProps {
  fleetFilter: FleetFilter;
  fleetCounts: FleetCounts;
  onFilterChange: (filter: FleetFilter) => void;
}

const FILTER_TABS: { key: FleetFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'running', label: 'Đang chạy' },
  { key: 'ready', label: 'Sẵn sàng' },
  { key: 'noassign', label: 'Chưa giao tài xế' },
  { key: 'maint', label: 'Bảo dưỡng' },
];

export function DispatchFilters({ fleetFilter, fleetCounts, onFilterChange }: DispatchFiltersProps) {
  return (
    <div className="filter-tabs">
      {FILTER_TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`tab${fleetFilter === key ? ' active' : ''}`}
          onClick={() => onFilterChange(key)}
        >
          {label} <span className="tc">{fleetCounts[key]}</span>
        </button>
      ))}
    </div>
  );
}
