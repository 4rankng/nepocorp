import { Link } from 'react-router-dom';
import { ArrowRight, Copy, TriangleAlert } from 'lucide-react';
import {
  TripStatus, TRIP_STATUS_LABELS,
  type TripDetail,
} from '@tingting/shared';
import { splitRoute } from '../../lib/route';
import { formatDayMonth } from '../../lib/date';
import { formatCurrency } from '../../lib/format';
import {
  buildTripCode, calcConsumption, getMissingIndicators, getMissingPlanFields, isTripToday,
  STATUS_PILL_CLASS, type TripListContainer, type TripListRow,
  getAncillaryTripCostBreakdown, getTripDistance, getTripDisplayGrossProfit,
} from './tripHelpers';
import { XeNgoaiBadge } from './XeNgoaiBadge';

const formatMoney = (n: number): string =>
  formatCurrency(n).replace(' ₫', '').replace('₫', '').trim();

export interface TripMobileCardProps {
  trip: TripDetail;
  warnThreshold: number;
  style?: React.CSSProperties;
  copyingPlan?: boolean;
  onCopyPlan?: (tripId: number) => void;
  detailState?: unknown;
}

export function TripMobileCard({ trip, warnThreshold, style, copyingPlan, onCopyPlan, detailState }: TripMobileCardProps) {
  const cons = calcConsumption(trip);
  const route = splitRoute(trip.route?.name);
  const isCanceled = trip.status === TripStatus.CANCELED;
  const isCreated = trip.status === TripStatus.CREATED;
  const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';
  const km = getTripDistance(trip);
  const road = Number(trip.totalRoadAllowance ?? 0);
  const revenue = Number(trip.revenue ?? 0);
  const totalCost = Number(trip.totalCost ?? 0);
  const grossProfit = getTripDisplayGrossProfit(trip);
  const ancillaryCosts = getAncillaryTripCostBreakdown(trip);
  const missingIndicators = getMissingIndicators(trip);
  const missingPlanFields = getMissingPlanFields(trip);
  const tripIsToday = isTripToday(trip.departureDate);
  const tripContainers: TripListContainer[] = (trip as TripListRow).containers ?? [];
  const typeCodes = Array.from(new Set(tripContainers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean)));

  const content = (
    <>
      <div className="trip-mcard__top">
        <div className="left">
          <div className="trip-mcard__name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>{trip.customer?.name ?? '—'}</span>
            {trip.carrierType === 'EXTERNAL' && <XeNgoaiBadge />}
          </div>
          <div className="trip-mcard__id">
            <span className="trip-mcard__id-group">
              {buildTripCode(trip)}
              <span className="trip-meta-sep">·</span>
              <span>{formatDayMonth(trip.departureDate)}</span>
              {isTripToday(trip.departureDate) && (
                <span className="trip-today-chip" title="Kế hoạch của ngày hôm nay">Hôm nay</span>
              )}
            </span>
            {/* Separator travels with the plate: on its own it was left dangling
                at the end of the line when the plate wrapped (kanban 20260921_8). */}
            <span className="trip-mcard__id-group">
              <span className="trip-meta-sep">·</span>
              <span className={`plate${isCreated || isCanceled ? ' idle' : ''}${trip.carrierType === 'EXTERNAL' ? ' external' : ''}`}>
                {trip.carrierType === 'EXTERNAL' ? (trip.externalPlateNumber || '—') : (trip.truck?.licensePlate ?? '—')}
              </span>
            </span>
          </div>
        </div>
        <span className={`status-pill ${pillClass}`}>
          {TRIP_STATUS_LABELS[trip.status]}
        </span>
      </div>

      <div className="trip-mcard__route">
        {route ? (
          <>
            {route.from}
            <span className="arr"><ArrowRight size={12} /></span>
            {route.to}
          </>
        ) : (
          trip.route?.name ?? '—'
        )}
      </div>

      {tripContainers.length > 0 && (
        <div className="trip-mcard__containers" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {typeCodes.map((code, i) => (
              <span key={i} className="container-tag">{code}</span>
            ))}
          </div>
          <div className="trip-mcard__container-numbers">
            {tripContainers.slice(0, 4).map((c, i) => (
              <span key={i}>{c.containerNumber}</span>
            ))}
            {tripContainers.length > 4 && (
              <span style={{ color: 'var(--ink-3)' }}>+{tripContainers.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {missingPlanFields.length > 0 && (
        <div className="trip-missing-flag" title={`Còn thiếu: ${missingPlanFields.join(', ')}`}>
          <TriangleAlert size={11} aria-hidden="true" />
          <span>Thiếu: {missingPlanFields.join(', ')}</span>
        </div>
      )}

      {missingIndicators.length > 0 && (
        <div className="trip-mcard__missing">
          {missingIndicators.map((m, i) => (
            <span key={i} className="missing-tag" title={m.label}>
              <m.icon size={10} />
            </span>
          ))}
        </div>
      )}

      <div className="trip-mcard__meta">
        <div className="mm">
          <span className="lab">KM</span>
          <span className={km > 0 ? 'val' : 'val empty'}>
            {km > 0 ? `${km.toLocaleString('vi-VN')} km` : '—'}
          </span>
        </div>
        <div className="mm">
          <span className="lab">Tiêu hao</span>
          {isCanceled ? (
            <span className="val empty">—</span>
          ) : cons ? (
            <span className={`val${cons.per100 > warnThreshold ? ' warn' : ''}`}>
              {cons.per100.toFixed(1).replace('.', ',')} L/100km
            </span>
          ) : (
            <span className="val empty">Chờ khai báo</span>
          )}
        </div>
        <div className="mm">
          <span className="lab">Tổng tiền đi đường lái xe nhận</span>
          <span className={road > 0 ? 'val' : 'val empty'}>
            {road > 0 ? `${formatMoney(road)} ₫` : '—'}
          </span>
        </div>
        <div className="mm">
          <span className="lab">Doanh thu</span>
          <span className={revenue > 0 ? 'val' : 'val empty'}>
            {revenue > 0 ? `${formatMoney(revenue)} ₫` : '—'}
          </span>
        </div>
        <div className="mm">
          <span className="lab">Tổng chi phí</span>
          <span className={totalCost > 0 ? 'val' : 'val empty'}>
            {totalCost > 0 ? `${formatMoney(totalCost)} ₫` : '—'}
          </span>
          {ancillaryCosts.length > 0 && (
            <span className="trip-mcard__cost-details">
              {ancillaryCosts.map((cost) => (
                <span key={cost.label}>{cost.label}: {formatMoney(cost.amount)} ₫</span>
              ))}
            </span>
          )}
        </div>
        <div className="mm">
          <span className="lab">LN gộp</span>
          <span className={grossProfit !== 0 ? `val${grossProfit < 0 ? ' warn' : ''}` : 'val empty'}>
            {grossProfit !== 0 ? `${formatMoney(grossProfit)} ₫` : '—'}
          </span>
        </div>
        <div className="mm">
          <span className="lab">Dầu</span>
          <span className={cons ? 'val' : 'val empty'}>
            {cons ? `${cons.liters.toFixed(0)} L` : 'Chờ khai báo'}
          </span>
        </div>
      </div>
    </>
  );

  const rootClass = `trip-mcard${tripIsToday ? ' trip-mcard--today' : ''}${missingPlanFields.length > 0 ? ' trip-mcard--missing' : ''}`;

  if (!onCopyPlan) {
    return (
      <Link
        to={`/trips/${trip.id}`}
        state={detailState}
        className={rootClass}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          ...style,
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={rootClass} style={style}>
      <Link
        to={`/trips/${trip.id}`}
        state={detailState}
        className="trip-mcard__main-link"
      >
        {content}
      </Link>
      <button
        type="button"
        className={`trip-copy-btn trip-copy-btn--mobile${copyingPlan ? ' is-copying' : ''}`}
        disabled={copyingPlan}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCopyPlan(trip.id);
        }}
      >
        <Copy size={13} />
        <span>{copyingPlan ? 'Đang copy' : 'Copy'}</span>
      </button>
    </div>
  );
}
