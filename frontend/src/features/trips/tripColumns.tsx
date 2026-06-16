import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, X as XIcon } from 'lucide-react';
import {
  TripStatus, TRIP_STATUS_LABELS, DATA_COMPLETENESS_COLORS, TRIP_STATUS_COLORS,
  type TripDetail,
} from '@tingting/shared';
import { splitRoute } from '../../lib/route';
import { formatDayMonth } from '../../lib/date';
import { formatCurrency } from '../../lib/format';
import {
  buildTripCode, calcConsumption, getMissingIndicators, getDataCompleteness,
  STATUS_PILL_CLASS, type TripListContainer, type TripListRow,
  getTripDistance,
} from './tripHelpers';

const formatMoney = (n: number): string =>
  formatCurrency(n).replace(' ₫', '').replace('₫', '').trim();

/**
 * Trip-list column definitions for TanStack React Table.
 *
 * These are extracted from the previous monolithic TripListPage so the
 * table column layout can be:
 *  - Reused by the export pipeline and any future admin views.
 *  - Unit-tested in isolation.
 *  - Trivially overridden per-deployment.
 *
 * Cell renderers use the existing page CSS classes (.trip-col, .plate,
 * .route-cell-flex, etc.) defined in TripListPage.css. The page wires
 * up the `<table>` via `useReactTable({ data, columns })`.
 */
export function buildTripColumns(warnThreshold: number): ColumnDef<TripDetail>[] {
  return [
    {
      id: 'trip',
      header: 'Chuyến · Mã',
      accessorFn: (row) => row.customer?.name ?? '',
      cell: ({ row }) => {
        const trip = row.original;
        const customerName = trip.customer?.name ?? '—';
        const tripCode = buildTripCode(trip);
        const missingIndicators = getMissingIndicators(trip);
        return (
          <Link
            to={`/trips/${trip.id}`}
            className="trip-col"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="trip-name">
              <span style={{ fontFamily: 'var(--font-mono)' }}>{tripCode}</span>
              <span className="trip-meta-sep">·</span>
              <span className="trip-date">{formatDayMonth(trip.departureDate)}</span>
            </div>
            <div className="trip-customer" title={customerName}>{customerName}</div>
            {missingIndicators.length > 0 && (
              <div className="trip-missing-row">
                {missingIndicators.map((m, i) => (
                  <span key={i} className="missing-tag" title={m.label} aria-label={m.label}>
                    <m.icon size={10} />
                  </span>
                ))}
              </div>
            )}
          </Link>
        );
      },
    },
    {
      id: 'truck',
      header: 'Xe',
      accessorFn: (row) => row.truck?.licensePlate ?? '',
      cell: ({ row }) => {
        const trip = row.original;
        const isCreated = trip.status === TripStatus.CREATED;
        const isCanceled = trip.status === TripStatus.CANCELED;
        return (
          <span className={`plate${isCreated || isCanceled ? ' idle' : ''}`}>
            {trip.truck?.licensePlate ?? '—'}
          </span>
        );
      },
    },
    {
      id: 'route',
      header: 'Tuyến',
      accessorFn: (row) => row.route?.name ?? '',
      cell: ({ row }) => {
        const trip = row.original;
        const route = splitRoute(trip.route?.name);
        const fullRoute = trip.route?.name ?? '';
        const km = getTripDistance(trip);
        return (
          <div className="route-cell-flex" title={fullRoute}>
            {route ? (
              <>
                <div className="route-origin-row">
                  <span className="route-origin">{route.from}</span>
                  <span className="route-arrow-right"><ArrowRight size={11} /></span>
                </div>
                <div className="route-destination">
                  {route.to}
                  {km > 0 && <span className="route-km-inline"> · {km.toLocaleString('vi-VN')}km</span>}
                </div>
              </>
            ) : (
              <div className="route-destination">{fullRoute || '—'}</div>
            )}
            {(trip.containerCount ?? 1) > 1 && (
              <div className="route-tags-row">
                <span className="container-tag multiplier">×{trip.containerCount ?? 1} cont</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'container',
      header: 'Container',
      enableSorting: false,
      cell: ({ row }) => {
        const trip = row.original;
        const containers: TripListContainer[] = (trip as TripListRow).containers ?? [];
        const codes = Array.from(new Set(containers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean)));
        const allNumbers = containers.map((c) => c.containerNumber).join(', ');
        if (codes.length === 0 && !trip.trailerType) {
          return <div className="km-empty">—</div>;
        }
        return (
          <div className="container-merged-cell" title={allNumbers || undefined}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {codes.map((code, i) => (
                <span key={i} className="container-tag">{code}</span>
              ))}
              {codes.length === 0 && trip.trailerType && (
                <span className="container-tag">{trip.trailerType}</span>
              )}
            </div>
            {containers.length > 0 && (
              <div className="container-numbers-list">
                {containers.slice(0, 2).map((c, i) => (
                  <span key={i}>{c.containerNumber}</span>
                ))}
                {containers.length > 2 && (
                  <span className="container-numbers-more">+{containers.length - 2}</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'consumption',
      header: 'Tiêu hao',
      enableSorting: false,
      cell: ({ row }) => {
        const trip = row.original;
        const cons = calcConsumption(trip);
        const isCanceled = trip.status === TripStatus.CANCELED;
        if (isCanceled) {
          return (
            <div className="cons-cell">
              <div className="cons-empty">
                <span className="empty-icon">
                  <XIcon size={12} />
                  Hủy trước khởi hành
                </span>
              </div>
            </div>
          );
        }
        if (!cons) {
          return (
            <div className="cons-cell">
              <div className="cons-empty">
                <span className="empty-icon">
                  <AlertCircle size={12} />
                  Chờ khai báo
                </span>
              </div>
            </div>
          );
        }
        return (
          <div className="cons-cell" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div className="cons-main">{cons.liters.toFixed(0)} L</div>
            <div className="cons-rate-val">
              {cons.per100.toFixed(1).replace('.', ',')} L/100km
            </div>
            {cons.per100 > warnThreshold ? (
              <div style={{ display: 'flex' }}>
                <span className="cons-rate warn" style={{ marginTop: 0 }}>
                  vượt {Math.round(((cons.per100 - warnThreshold) / warnThreshold) * 100)}%
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex' }}>
                <span className="cons-rate ok" style={{ marginTop: 0 }}>
                  đạt chuẩn
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'road',
      header: 'Tổng đi đường',
      accessorFn: (row) => Number(row.totalRoadAllowance ?? 0) + Number(row.tollCost ?? 0),
      cell: ({ row }) => {
        const trip = row.original;
        const road = Number(trip.totalRoadAllowance ?? 0) + Number(trip.tollCost ?? 0);
        return (
          <div className={road > 0 ? 'money' : 'money-empty'}>
            {road > 0 ? (
              <>
                {formatMoney(road)}
                <span className="money-unit"> ₫</span>
              </>
            ) : '—'}
          </div>
        );
      },
    },
    {
      id: 'revenue',
      header: 'Doanh thu',
      accessorFn: (row) => Number(row.revenue ?? 0),
      cell: ({ row }) => {
        const trip = row.original;
        const revenue = Number(trip.revenue ?? 0);
        return (
          <div className={revenue > 0 ? 'money' : 'money-empty'}>
            {revenue > 0 ? (
              <>
                {formatMoney(revenue)}
                <span className="money-unit"> ₫</span>
              </>
            ) : '—'}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Trạng thái',
      accessorFn: (row) => row.status,
      cell: ({ row }) => {
        const trip = row.original;
        const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';
        return (
          <div className="status-cell">
            <span className={`status-pill ${pillClass}`}>
              {TRIP_STATUS_LABELS[trip.status]}
            </span>
          </div>
        );
      },
    },
  ];
}

/** Computes the per-row CSS variable bag used by the page for stripe colors. */
export function tripRowStyle(trip: TripDetail): Record<string, string> {
  const completeness = getDataCompleteness(trip);
  return {
    '--strip-top': TRIP_STATUS_COLORS[trip.status],
    '--strip-bottom': completeness === 'na'
      ? TRIP_STATUS_COLORS[trip.status]
      : DATA_COMPLETENESS_COLORS[completeness],
  };
}
