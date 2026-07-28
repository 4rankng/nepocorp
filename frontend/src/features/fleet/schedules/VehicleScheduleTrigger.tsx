import { AlertTriangle, CalendarPlus, Clock3 } from 'lucide-react';
import type { VehicleScheduleBannerItem } from './VehicleScheduleBanner';

interface VehicleScheduleTriggerProps {
  vehicleComponent: 'TRUCK' | 'TRAILER';
  vehicleId: number;
  items: VehicleScheduleBannerItem[];
  onOpen: () => void;
}

export function VehicleScheduleTrigger({
  vehicleComponent,
  vehicleId,
  items,
  onOpen,
}: VehicleScheduleTriggerProps) {
  const overdue = items.some(item => item.isOverdue);
  const vehicleLabel = vehicleComponent === 'TRUCK' ? 'xe đầu kéo' : 'rơ-moóc';
  const ariaLabel = items.length === 0
    ? `Thêm lịch cho ${vehicleLabel}`
    : `Mở ${items.length} lịch của ${vehicleLabel}${overdue ? ', có lịch quá hạn' : ''}`;

  return (
    <button
      type="button"
      className={`vehicle-schedule-trigger${overdue ? ' vehicle-schedule-trigger--overdue' : ''}`}
      data-testid={`vehicle-schedule-trigger-${vehicleComponent}-${vehicleId}`}
      aria-label={ariaLabel}
      onClick={event => {
        event.stopPropagation();
        onOpen();
      }}
    >
      {items.length === 0
        ? <CalendarPlus size={16} aria-hidden="true" />
        : overdue
          ? <AlertTriangle size={16} aria-hidden="true" />
          : <Clock3 size={16} aria-hidden="true" />}
      <span>{items.length === 0 ? 'Thêm lịch' : `${items.length} lịch`}</span>
      {overdue && <strong>Quá hạn</strong>}
    </button>
  );
}
