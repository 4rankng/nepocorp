import type { VehicleSchedule } from '@tingting/shared';
import { AlertTriangle, CalendarClock, ChevronRight, Clock3 } from 'lucide-react';
import './vehicle-schedules.css';

export type VehicleScheduleBannerItem = Pick<
  VehicleSchedule,
  | 'id'
  | 'vehicleComponent'
  | 'vehicleId'
  | 'vehiclePlate'
  | 'kind'
  | 'status'
  | 'title'
  | 'documentNumber'
  | 'notes'
  | 'remindAt'
  | 'dueAt'
  | 'isOverdue'
  | 'completedAt'
  | 'cancelledAt'
  | 'createdAt'
  | 'updatedAt'
>;

interface VehicleScheduleBannerProps {
  items: VehicleScheduleBannerItem[];
  onOpenFleet?: () => void;
  testId?: string;
}

const dueFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function VehicleScheduleBanner({ items, onOpenFleet, testId }: VehicleScheduleBannerProps) {
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, 3);
  const remaining = items.length - visibleItems.length;

  return (
    <section
      className="vehicle-schedule-banner"
      aria-labelledby="vehicle-schedule-banner-title"
      data-testid={testId}
    >
      <div className="vehicle-schedule-banner__head">
        <div className="vehicle-schedule-banner__heading">
          <CalendarClock size={18} aria-hidden="true" />
          <h2 id="vehicle-schedule-banner-title">Lịch phương tiện cần xử lý</h2>
          <span className="vehicle-schedule-banner__count">{items.length}</span>
        </div>
        {onOpenFleet && (
          <button
            type="button"
            className="vehicle-schedule-banner__action"
            onClick={onOpenFleet}
            aria-label="Xem lịch đội xe"
          >
            Xem tại Đội xe <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="vehicle-schedule-banner__list">
        {visibleItems.map((item) => (
          <article
            className={`vehicle-schedule-alert${item.isOverdue ? ' vehicle-schedule-alert--overdue' : ''}`}
            key={`${item.vehicleComponent}-${item.vehicleId}-${item.id}`}
            data-testid={`vehicle-schedule-alert-${item.id}`}
          >
            <span className="vehicle-schedule-alert__strip" aria-hidden="true" />
            <div className="vehicle-schedule-alert__state">
              {item.isOverdue
                ? <AlertTriangle size={16} aria-hidden="true" />
                : <Clock3 size={16} aria-hidden="true" />}
              <strong>{item.isOverdue ? 'Quá hạn' : 'Đến hạn nhắc'}</strong>
            </div>
            <div className="vehicle-schedule-alert__identity">
              <span>{item.vehicleComponent === 'TRUCK' ? 'Xe đầu kéo' : 'Rơ-moóc'}</span>
              <b>{item.vehiclePlate}</b>
            </div>
            <div className="vehicle-schedule-alert__meta">
              <strong>{item.title}</strong>
              <span>Hạn {dueFormatter.format(new Date(item.dueAt))}</span>
            </div>
          </article>
        ))}
      </div>
      {remaining > 0 && (
        <div className="vehicle-schedule-banner__remaining">
          Còn {remaining} lịch khác cần xử lý
        </div>
      )}
    </section>
  );
}
