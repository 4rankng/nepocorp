import type { CSSProperties } from 'react';
import { TRIP_STATUS_LABELS, type TripDetail } from '@tingting/shared';
import type { TripQuickEditDraft } from './tripColumns';
import {
  buildTripCode,
  formatMoney,
  getAncillaryTripCostBreakdown,
  getTripDisplayGrossProfit,
  STATUS_PILL_CLASS,
} from './tripHelpers';

export function QuickEditTripSummary({ trip }: { trip: TripDetail }) {
  const totalCost = Number(trip.totalCost ?? 0);
  const grossProfit = getTripDisplayGrossProfit(trip);
  const ancillaryCosts = getAncillaryTripCostBreakdown(trip);

  return (
    <div className="quick-card-summary">
      <div>
        <span>Tổng chi phí</span>
        <b>{totalCost > 0 ? `${formatMoney(totalCost)} ₫` : '—'}</b>
        {ancillaryCosts.length > 0 && (
          <div className="quick-card-cost-details">
            {ancillaryCosts.map((cost) => (
              <span key={cost.label}>{cost.label}: {formatMoney(cost.amount)} ₫</span>
            ))}
          </div>
        )}
      </div>
      <div>
        <span>LN gộp</span>
        <b className={grossProfit < 0 ? 'money-loss' : ''}>{grossProfit !== 0 ? `${formatMoney(grossProfit)} ₫` : '—'}</b>
      </div>
    </div>
  );
}

const QUICK_EDIT_FIELDS: Array<{ key: keyof TripQuickEditDraft; label: string; unit?: string }> = [
  { key: 'fuelLiters', label: 'Dầu', unit: 'L' },
  { key: 'roadAllowance', label: 'Đi đường', unit: '₫' },
  { key: 'revenue', label: 'Doanh thu', unit: '₫' },
  { key: 'driverSalary', label: 'Lương chuyến', unit: '₫' },
];

export function TripQuickEditMobileCard({
  trip,
  draft,
  selected,
  editable,
  error,
  style,
  onToggleSelect,
  onDraftChange,
}: {
  trip: TripDetail;
  draft: TripQuickEditDraft;
  selected: boolean;
  editable: boolean;
  error?: string;
  style: CSSProperties;
  onToggleSelect: (tripId: number) => void;
  onDraftChange: (tripId: number, field: keyof TripQuickEditDraft, value: string) => void;
}) {
  const routeLabel = trip.route?.name ?? '—';
  const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';

  return (
    <div
      className={`trip-mcard trip-mcard--quick${selected ? ' selected' : ''}${!editable ? ' locked' : ''}`}
      style={style}
    >
      <div className="trip-mcard__top">
        <label className="trip-mcard__check">
          <input
            type="checkbox"
            checked={selected}
            disabled={!editable}
            onChange={() => onToggleSelect(trip.id)}
          />
          <span>{editable ? 'Chọn' : 'Khóa'}</span>
        </label>
        <span className={`status-pill ${pillClass}`}>{TRIP_STATUS_LABELS[trip.status]}</span>
      </div>
      <div className="trip-mcard__name">{trip.customer?.name ?? '—'}</div>
      <div className="trip-mcard__id">
        {buildTripCode(trip)}
        <span className="trip-meta-sep">·</span>
        <span>{trip.departureDate ?? '—'}</span>
      </div>
      <div className="trip-mcard__route">{routeLabel}</div>

      <div className="quick-card-grid">
        {QUICK_EDIT_FIELDS.map((field) => (
          <label key={field.key} className="quick-card-field">
            <span>{field.label}</span>
            <div className="quick-edit-cell">
              <input
                className="quick-money-input"
                inputMode="decimal"
                value={draft[field.key]}
                disabled={!editable}
                onChange={(event) => onDraftChange(trip.id, field.key, event.target.value)}
              />
              {field.unit && <span className="quick-unit">{field.unit}</span>}
            </div>
          </label>
        ))}
      </div>

      <QuickEditTripSummary trip={trip} />
      {error && <div className="quick-card-error">{error}</div>}
    </div>
  );
}
