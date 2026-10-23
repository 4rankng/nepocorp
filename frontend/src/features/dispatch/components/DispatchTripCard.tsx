import { Play, RefreshCw, Building2, ArrowRight } from 'lucide-react';
import { formatDayMonth } from '../../../lib/date';
import { splitRoute } from '../../../lib/route';
import { isToday, isUrgent, overdueDays } from '../utils';
import { ReassignDialog } from './ReassignDialog';
import { StatusStrip } from '../../../components/shared/StatusStrip';
import { TRIP_STATUS_COLORS, type TripStatus } from '@tingting/shared';
import type { NormalizedTrip } from '../../../hooks/useTripQueries';
import type { ReassignState, Truck, Driver } from '../utils';

interface DispatchTripCardProps {
  trip: NormalizedTrip;
  /** Bulk 'Khởi hành' (vòng 7): checkbox chọn nhiều đơn. */
  selected?: boolean;
  onToggleSelect?: () => void;
  isEditing: boolean;
  reassignState: ReassignState;
  setReassignState: React.Dispatch<React.SetStateAction<ReassignState>>;
  trucks: Truck[];
  drivers: Driver[];
  carrierCustomers: { id: number; label: string }[];
  onDispatch: () => void;
  onOpenReassign: () => void;
  onCloseReassign: () => void;
  onReassign: () => void;
  dispatching: boolean;
  actionLoadingId: number | null;
}

export function DispatchTripCard({
  trip,
  selected,
  onToggleSelect,
  isEditing,
  reassignState,
  setReassignState,
  trucks,
  drivers,
  carrierCustomers,
  onDispatch,
  onOpenReassign,
  onCloseReassign,
  onReassign,
  dispatching,
  actionLoadingId,
}: DispatchTripCardProps) {
  const route = splitRoute(trip.routeName);
  const today = isToday(trip.departureDate);
  const urgent = !today && isUrgent(trip.departureDate);
  // Lệnh chờ mà ngày khởi hành đã qua = quá hạn — cảnh báo đỏ + số ngày
  // (audit DeepSeek vòng 5: điều phối phải thấy đơn sắp/trễ ngay).
  const over = overdueDays(trip.departureDate);

  return (
    <div
      className={`order-row${today ? ' is-today' : ''}`}
      data-tour-id="dispatch-ready-list"
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          className="order-select"
          checked={!!selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Chọn ${trip.tripCode ?? `#${trip.id}`}`}
        />
      )}
      <StatusStrip color={TRIP_STATUS_COLORS[trip.status as TripStatus]} />
      <div className={`o-date${over > 0 ? ' overdue' : today ? ' today' : urgent ? ' urgent' : ''}`}>
        {over > 0 && <span className="today-badge today-badge--overdue">Quá hạn {Math.abs(over)}N</span>}
        {today && <span className="today-badge">Hôm nay</span>}
        <span className="day">{formatDayMonth(trip.departureDate)}</span>
      </div>

      <div className="o-route">
        {route ? (
          <>
            <span className="from">{route.from}</span>
            <span className="arr">
              <ArrowRight size={14} />
            </span>
            <span className="to">{route.to}</span>
          </>
        ) : (
          <span className="single">{trip.routeName}</span>
        )}
      </div>

      <div className="o-customer">
        <div className="cust-icon">
          <Building2 size={15} />
        </div>
        <div className="info">
          <div className="name">{trip.customerName}</div>
          {trip.customerReference && (
            <div className="meta">Mã KH: {trip.customerReference}</div>
          )}
        </div>
      </div>

      <div className="o-assign">
        {isEditing ? (
          <ReassignDialog
            reassignState={reassignState}
            setReassignState={setReassignState}
            trucks={trucks}
            drivers={drivers}
            carrierCustomers={carrierCustomers}
            onSave={onReassign}
            onCancel={onCloseReassign}
          />
        ) : (
          <div className="assign-card">
            <span className="ap">
              {trip.truckPlate || '—'}
            </span>
            <div className="ai">
              <div className="dn">
                {trip.driverName || <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>Chưa phân xe</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="o-actions">
        <button
          type="button"
          className="dispatch-btn"
          data-tour-id="dispatch-primary-action"
          onClick={onDispatch}
          disabled={dispatching || actionLoadingId === trip.id || isEditing}
        >
          {actionLoadingId === trip.id ? (
            <div
              className="spin"
              style={{
                width: 10,
                height: 10,
                border: '2px solid #fff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
              }}
            />
          ) : (
            <Play size={11} fill="currentColor" />
          )}
          Khởi hành
        </button>
        {!isEditing && (
          <button
            type="button"
            className="swap-btn"
            title="Đổi xe / lái xe"
            aria-label="Đổi xe / lái xe"
            onClick={onOpenReassign}
            disabled={dispatching || actionLoadingId === trip.id}
          >
            <RefreshCw size={11} />
            Đổi xe
          </button>
        )}
      </div>
    </div>
  );
}
