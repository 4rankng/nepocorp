import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Copy, TriangleAlert, X as XIcon } from 'lucide-react';
import {
  TripStatus, TRIP_STATUS_LABELS, DATA_COMPLETENESS_COLORS, TRIP_STATUS_COLORS,
  TRIP_MISSING_FIELD_ROW_COLORS,
  type TripDetail,
} from '@tingting/shared';
import { splitRoute } from '../../lib/route';
import { formatDayMonth } from '../../lib/date';
import {
  buildTripCode, calcConsumption, formatMoney, getMissingIndicators, getDataCompleteness, getMissingPlanFields,
  STATUS_PILL_CLASS, type TripListContainer, type TripListRow,
  getAncillaryTripCostBreakdown, getTripDistance, getTripDisplayGrossProfit,
  getTripDisplayMarginPct, getTripDisplayRevenue, getTripDisplayTotalCost, getTripRevenueBasis,
} from './tripHelpers';
import { XeNgoaiBadge } from './XeNgoaiBadge';
import { QuickMoneyInput } from './tripQuickEditCells';

export interface TripQuickEditDraft {
  fuelLiters: string;
  roadAllowance: string;
  driverSalary: string;
  revenue: string;
}

export interface TripQuickEditState {
  /** ids of the rows ticked for saving */
  selectedIds: Set<number>;
  /** one draft per row being edited, keyed by trip id */
  drafts: Record<number, TripQuickEditDraft>;
  /** per-row validation message, keyed by trip id */
  errors: Record<number, string>;
}

export interface TripQuickEditOptions {
  enabled: boolean;
  /**
   * Live quick-edit state. The page refreshes this object in place on every
   * render instead of handing the cells a new one: flexRender renders a column's
   * `cell` as a React component, so a rebuilt column array remounts every cell
   * and a focused <input> would lose focus after the first keystroke
   * (kanban 20260922_31).
   */
  state: TripQuickEditState;
  onToggleSelect: (tripId: number) => void;
  onDraftChange: (tripId: number, field: keyof TripQuickEditDraft, value: string) => void;
}

export interface TripRowActions {
  copyingPlanId?: number | null;
  onCopyPlan?: (tripId: number) => void;
  detailState?: unknown;
}

function isQuickEditable(trip: TripDetail): boolean {
  return trip.status !== TripStatus.LOCKED && trip.status !== TripStatus.CANCELED;
}

function moneyCell(value: number, extraClass = '') {
  return (
    <div className={`${value > 0 ? 'money' : 'money-empty'}${extraClass ? ` ${extraClass}` : ''}`}>
      {value > 0 ? (
        <>
          {formatMoney(value)}
          <span className="money-unit"> ₫</span>
        </>
      ) : '—'}
    </div>
  );
}

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
/**
 * One-line route label ("Nam Đình Vũ → Cẩm Khê, Phú Thọ · 240km") used by the
 * compact quick-edit identity cell, where the standalone Tuyến track is dropped.
 */
function compactRouteLabel(trip: TripDetail): string {
  const route = splitRoute(trip.route?.name);
  const km = getTripDistance(trip);
  if (!route) return trip.route?.name ?? '';
  return `${route.from} → ${route.to}${km > 0 ? ` · ${km.toLocaleString('vi-VN')}km` : ''}`;
}

/**
 * One-line container label ("20DC · MSKU9876543") for the same compact cell.
 */
function compactContainerLabel(trip: TripDetail): string {
  const containers: TripListContainer[] = (trip as TripListRow).containers ?? [];
  const codes = Array.from(new Set(
    containers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean),
  ));
  const numbers = containers.map((c) => c.containerNumber).filter(Boolean);
  return [codes.join(' '), numbers.join(', ')].filter(Boolean).join(' · ');
}

export function buildTripColumns(
  warnThreshold: number,
  quickEdit?: TripQuickEditOptions,
  actions?: TripRowActions,
): ColumnDef<TripDetail>[] {
  const quickColumns: ColumnDef<TripDetail>[] = quickEdit?.enabled ? [
    {
      id: 'select',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const trip = row.original;
        const editable = isQuickEditable(trip);
        return (
          <input
            type="checkbox"
            className="quick-row-check"
            checked={quickEdit.state.selectedIds.has(trip.id)}
            disabled={!editable}
            onClick={(e) => e.stopPropagation()}
            onChange={() => quickEdit.onToggleSelect(trip.id)}
            aria-label={`Chọn chuyến ${buildTripCode(trip)}`}
          />
        );
      },
    },
  ] : [];

  const columns: ColumnDef<TripDetail>[] = [
    {
      id: 'trip',
      header: 'Chuyến · Mã',
      accessorFn: (row) => row.customer?.name ?? '',
      cell: ({ row }) => {
        const trip = row.original;
        const customerName = trip.customer?.name ?? '—';
        const tripCode = buildTripCode(trip);
        const missingIndicators = getMissingIndicators(trip);
        const missingFields = getMissingPlanFields(trip);
        const copyingThisPlan = actions?.copyingPlanId === trip.id;
        return (
          <div className="trip-col">
            <Link
              to={`/trips/${trip.id}`}
              state={actions?.detailState}
              className="trip-col__link"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* View mode: ngày xuống dòng riêng dưới mã (feedback owner
                  24/10 — cùng dòng thì "23/10" bị cắt còn "23/1" khi cột hết
                  chỗ). Quick-edit giữ inline vì grid figures đã chịu chỉnh độ
                  cao hàng (kanban 20260922_28). */}
              <div className="trip-name">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{tripCode}</span>
                {quickEdit?.enabled && (
                  <>
                    <span className="trip-meta-sep">·</span>
                    <span className="trip-date">{formatDayMonth(trip.departureDate)}</span>
                  </>
                )}
              </div>
              {!quickEdit?.enabled && (
                <div className="trip-date">{formatDayMonth(trip.departureDate)}</div>
              )}
              {quickEdit?.enabled && (
                <div className="trip-customer" title={customerName} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                  <span>{customerName}</span>
                  {trip.carrierType === 'EXTERNAL' && <XeNgoaiBadge />}
                </div>
              )}
              {/* Quick-edit drops the standalone Tuyến / Container tracks so the
                  figures grid fits a 1440 laptop; the same data rides here as one
                  compact line (kanban 20260922_28). */}
              {quickEdit?.enabled && (
                <div
                  className="trip-quick-meta"
                  title={[compactRouteLabel(trip), compactContainerLabel(trip)].filter(Boolean).join(' · ')}
                >
                  {compactRouteLabel(trip) && (
                    <span className="trip-quick-meta__route">{compactRouteLabel(trip)}</span>
                  )}
                  {compactContainerLabel(trip) && (
                    <span className="container-tag trip-quick-meta__container">{compactContainerLabel(trip)}</span>
                  )}
                </div>
              )}
              {/* View mode: cảnh báo gom 1 dòng — chip "Thiếu N" + icon nhỏ
                  (audit 23/10), giữ row height thấp. Quick-edit giữ nguyên
                  dạng cũ vì đã có hàng meta riêng. */}
              {(missingFields.length > 0 || missingIndicators.length > 0) && !quickEdit?.enabled && (
                <div className="trip-missing-line">
                  {missingFields.length > 0 && (
                    <span className="trip-missing-flag" title={`Còn thiếu: ${missingFields.join(', ')}`}>
                      <TriangleAlert size={11} aria-hidden="true" />
                      <span>Thiếu {missingFields.length}</span>
                    </span>
                  )}
                  {missingIndicators.map((m, i) => (
                    <span key={i} className="missing-tag" title={m.label} aria-label={m.label}>
                      <m.icon size={10} />
                    </span>
                  ))}
                </div>
              )}
              {quickEdit?.enabled && missingFields.length > 0 && (
                <div className="trip-missing-flag" title={`Còn thiếu: ${missingFields.join(', ')}`}>
                  <TriangleAlert size={11} aria-hidden="true" />
                  <span>Thiếu {missingFields.length}</span>
                </div>
              )}
              {quickEdit?.enabled && missingIndicators.length > 0 && (
                <div className="trip-missing-row">
                  {missingIndicators.map((m, i) => (
                    <span key={i} className="missing-tag" title={m.label} aria-label={m.label}>
                      <m.icon size={10} />
                    </span>
                  ))}
                </div>
              )}
            </Link>
            {actions?.onCopyPlan && !quickEdit?.enabled && (
              <button
                type="button"
                className={`trip-copy-btn${copyingThisPlan ? ' is-copying' : ''}`}
                disabled={copyingThisPlan}
                title="Copy kế hoạch vận chuyển thành chuyến mới"
                aria-label={`Copy kế hoạch vận chuyển từ chuyến ${tripCode}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  actions.onCopyPlan?.(trip.id);
                }}
              >
                <Copy size={13} />
                <span>{copyingThisPlan ? 'Đang copy' : 'Copy'}</span>
              </button>
            )}
          </div>
        );
      },
    },
    // View mode: Khách hàng là cột riêng (audit 23/10) — quick-edit không có
    // (tên khách vẫn nằm trong ô Chuyến · Mã của lưới figures).
    ...(!quickEdit?.enabled ? [{
      id: 'customer',
      header: 'Khách hàng',
      accessorFn: (row) => row.customer?.shortName || row.customer?.name || '',
      cell: ({ row }) => {
        const trip = row.original;
        // Tên rút gọn cho bảng dày đặc (QA 23/10); tooltip giữ tên đầy đủ.
        const displayName = trip.customer?.shortName || trip.customer?.name || '—';
        const customerName = trip.customer?.name ?? '—';
        return (
          <div className="trip-col trip-col--customer">
            <span className="trip-customer-name" title={customerName}>{displayName}</span>
            {trip.carrierType === 'EXTERNAL' && <XeNgoaiBadge />}
          </div>
        );
      },
    } satisfies ColumnDef<TripDetail>] : []),
    {
      id: 'truck',
      header: 'Xe',
      accessorFn: (row) => row.carrierType === 'EXTERNAL' ? (row.externalPlateNumber ?? '') : (row.truck?.licensePlate ?? ''),
      cell: ({ row }) => {
        const trip = row.original;
        const isCreated = trip.status === TripStatus.CREATED;
        const isCanceled = trip.status === TripStatus.CANCELED;
        const isExternal = trip.carrierType === 'EXTERNAL';
        // External trips are flagged by the "Xe ngoài" badge beside the customer
        // name. Chưa gán xe thì hiển thị gạch mờ, KHÔNG bọc vào pill đen
        // (pill rỗng đọc như một nút bấm - feedback QA 23/10).
        const plate = isExternal ? (trip.externalPlateNumber || null) : (trip.truck?.licensePlate ?? null);
        if (!plate) {
          return <span className="plate plate--empty">—</span>;
        }
        return (
          <span className={`plate${isCreated || isCanceled ? ' idle' : ''}${isExternal ? ' external' : ''}`}>
            {plate}
          </span>
        );
      },
    },
    // Quick-edit renders Tuyến + Container inside the identity cell (see
    // .trip-quick-meta) and drops their tracks, so the figures grid fits the
    // table area of a 1440 laptop with no horizontal scroll and no column
    // hidden under the pinned Trạng thái column (kanban 20260922_28).
    ...(quickEdit?.enabled ? [] : [{
      id: 'route',
      header: 'Tuyến',
      accessorFn: (row: TripDetail) => row.route?.name ?? '',
      cell: ({ row }: { row: { original: TripDetail } }) => {
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
    } satisfies ColumnDef<TripDetail>, {
      id: 'container',
      header: 'Container',
      enableSorting: false,
      cell: ({ row }: { row: { original: TripDetail } }) => {
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
    } satisfies ColumnDef<TripDetail>]),
    {
      id: 'consumption',
      header: 'Tiêu hao',
      enableSorting: false,
      cell: ({ row }) => {
        const trip = row.original;
        const cons = calcConsumption(trip);
        const isCanceled = trip.status === TripStatus.CANCELED;
        if (quickEdit?.enabled) {
          const editable = isQuickEditable(trip);
          const draft = quickEdit.state.drafts[trip.id];
          return (
            <div className="quick-edit-cell">
              <QuickMoneyInput
                value={draft?.fuelLiters ?? ''}
                disabled={!editable}
                onChange={(value) => quickEdit.onDraftChange(trip.id, 'fuelLiters', value)}
              />
              <span className="quick-unit">L</span>
            </div>
          );
        }
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
        const over = cons.per100 > warnThreshold;
        // 1 cụm gọn vừa track ~102px (QA 23/10): "147 L / 34,8" — tooltip giải
        // nghĩa định mức đầy đủ.
        return (
          <div className="cons-cell cons-cell--compact" title={`Tiêu hao ${cons.liters.toFixed(0)} L · định mức ${cons.per100.toFixed(1).replace('.', ',')} L/100km`}>
            <span className="cons-dot" data-over={over} />
            <span className="cons-main">{cons.liters.toFixed(0)} L / {cons.per100.toFixed(1).replace('.', ',')}</span>
          </div>
        );
      },
    },
    // road + totalCost bị ẨN ở view grid qua columnVisibility (9 track vừa khít
    // 1130px, audit 23/10); defs giữ nguyên để lưới quick-edit (figures) dùng.
    {
      id: 'road',
      header: 'Tổng tiền đi đường lái xe nhận',
      accessorFn: (row) => Number(row.totalRoadAllowance ?? 0),
      cell: ({ row }) => {
        const trip = row.original;
        const road = Number(trip.totalRoadAllowance ?? 0);
        if (quickEdit?.enabled) {
          const editable = isQuickEditable(trip);
          const draft = quickEdit.state.drafts[trip.id];
          return (
            <div className="quick-edit-cell">
              <QuickMoneyInput
                value={draft?.roadAllowance ?? ''}
                disabled={!editable}
                onChange={(value) => quickEdit.onDraftChange(trip.id, 'roadAllowance', value)}
              />
            </div>
          );
        }
        return moneyCell(road);
      },
    },
    {
      id: 'revenue',
      // Reader sees the ex-VAT revenue the "LN gộp" column is computed on,
      // with the VAT-inclusive contract value as a labeled memo; the quick
      // editor types that contract value (the same figure the trip form
      // stores), so the header names the basis per mode (kanban 101026203100).
      header: quickEdit?.enabled ? 'Doanh thu (gồm VAT)' : 'Doanh thu (chưa VAT)',
      accessorFn: (row) => getTripDisplayRevenue(row),
      cell: ({ row }) => {
        const trip = row.original;
        const basis = getTripRevenueBasis(trip);
        const revenue = getTripDisplayRevenue(trip);
        if (quickEdit?.enabled) {
          const editable = isQuickEditable(trip);
          const draft = quickEdit.state.drafts[trip.id];
          return (
            <div className="quick-edit-cell">
              <QuickMoneyInput
                value={draft?.revenue ?? ''}
                disabled={!editable}
                onChange={(value) => quickEdit.onDraftChange(trip.id, 'revenue', value)}
              />
              {basis.vatAmount > 0 && (
                <div className="trip-cost-cell__ancillary">chưa VAT: {formatMoney(basis.freightExVat)} ₫</div>
              )}
            </div>
          );
        }
        return (
          <div className="trip-cost-cell">
            {moneyCell(revenue)}
            {basis.vatAmount > 0 && (
              <div className="trip-cost-cell__ancillary" aria-label="Doanh thu gồm VAT">
                gồm VAT: {formatMoney(basis.contract)} ₫
              </div>
            )}
          </div>
        );
      },
    },
    ...(quickEdit?.enabled ? [{
      id: 'driverSalary',
      header: 'Lương chuyến',
      accessorFn: (row: TripDetail) => Number(row.driverSalary ?? 0),
      cell: ({ row }) => {
        const trip = row.original;
        const editable = isQuickEditable(trip);
        const draft = quickEdit.state.drafts[trip.id];
        return (
          <div className="quick-edit-cell">
            <QuickMoneyInput
              value={draft?.driverSalary ?? ''}
              disabled={!editable}
              onChange={(value) => quickEdit.onDraftChange(trip.id, 'driverSalary', value)}
            />
          </div>
        );
      },
    } satisfies ColumnDef<TripDetail>] : []),
    {
      id: 'totalCost',
      header: 'Tổng chi phí',
      accessorFn: (row) => getTripDisplayTotalCost(row),
      cell: ({ row }) => {
        const trip = row.original;
        const ancillaryCosts = getAncillaryTripCostBreakdown(trip);
        // Hired-carrier freight shows ex-VAT — the cost the "LN gộp" column is
        // measured against; the as-paid (gồm VAT) AP figure stays as a memo
        // (kanban 101026203100).
        const displayCost = getTripDisplayTotalCost(trip);
        const bookedCost = Number(trip.totalCost ?? 0);
        return (
          <div className="trip-cost-cell">
            {moneyCell(displayCost)}
            {bookedCost > 0 && bookedCost !== displayCost && (
              <div className="trip-cost-cell__ancillary" aria-label="Chi phí gồm VAT">
                gồm VAT: {formatMoney(bookedCost)} ₫
              </div>
            )}
            {ancillaryCosts.length > 0 && (
              <div className="trip-cost-cell__ancillary" aria-label="Chi phí lưu ca và trả hàng 2 điểm">
                {ancillaryCosts.map((cost) => (
                  <span key={cost.label}>{cost.label}: {formatMoney(cost.amount)} ₫</span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'grossProfit',
      header: 'LN gộp',
      accessorFn: (row) => getTripDisplayGrossProfit(row),
      cell: ({ row }) => {
        const trip = row.original;
        const grossProfit = getTripDisplayGrossProfit(trip);
        const marginPct = getTripDisplayMarginPct(trip);
        return (
          <div className="trip-cost-cell">
            {moneyCell(grossProfit, grossProfit < 0 ? 'money-loss' : '')}
            {grossProfit > 0 && marginPct !== null && (
              <div className="trip-cost-cell__ancillary" title="Trên doanh thu chưa VAT">
                Biên LN {marginPct.toFixed(1).replace('.', ',')}%
              </div>
            )}
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
            {quickEdit?.enabled && quickEdit.state.errors[trip.id] && (
              <span className="quick-row-error" title={quickEdit.state.errors[trip.id]}>Lỗi</span>
            )}
          </div>
        );
      },
    },
  ];
  return [...quickColumns, ...columns];
}

/** Computes the per-row CSS variable bag used by the page for stripe colors. */
export function tripRowStyle(trip: TripDetail): Record<string, string> {
  const completeness = getDataCompleteness(trip);
  const missingFields = getMissingPlanFields(trip);
  return {
    '--strip-top': TRIP_STATUS_COLORS[trip.status],
    // A row that still needs information gets the red strip half — the app
    // signals row state through the statusStrip, never a row background
    // (docs/design-guidelines.md), and the "Thiếu: …" label names the fields.
    '--strip-bottom': missingFields.length > 0
      ? TRIP_MISSING_FIELD_ROW_COLORS.accent
      : completeness === 'na'
        ? TRIP_STATUS_COLORS[trip.status]
        : DATA_COMPLETENESS_COLORS[completeness],
  };
}
