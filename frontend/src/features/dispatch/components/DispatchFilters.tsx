import { ListFilterBar } from '../../../components/shared/ListFilterBar';
import type { FleetFilter } from '../utils';

interface FleetCounts {
  all: number;
  running: number;
  ready: number;
  waiting: number;
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
  { key: 'waiting', label: 'Chờ tài xế' },
  { key: 'noassign', label: 'Chưa giao lái xe' },
  { key: 'maint', label: 'Bảo dưỡng' },
];

export function DispatchFilters({ fleetFilter, fleetCounts, onFilterChange }: DispatchFiltersProps) {
  return (
    <ListFilterBar
      label="Lọc trạng thái đội xe"
      options={FILTER_TABS.map(({ key, label }) => ({ value: key, label, count: fleetCounts[key] }))}
      value={fleetFilter}
      onChange={onFilterChange}
    />
  );
}
