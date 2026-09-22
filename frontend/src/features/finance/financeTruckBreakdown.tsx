import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink } from 'lucide-react';
import { Panel } from '../../components/UI';
import { formatNumber } from '../../lib/format';
import type { PnlMaintenanceItem, PnlReport } from '@tingting/shared';

export interface TruckBreakdownRow {
  id: number;
  plate: string;
  trips: number;
  revenue: number;
  costs: number;
  profit: number;
}

/**
 * Structural mirror of the trip rows produced by the page's
 * `groupFinanceTripDetails()`; feature modules must not import from `src/pages/`.
 */
interface FinanceTripDetail {
  id: number;
  tripCode: string;
  departureDate: string;
  routeName: string;
  revenue: number;
  customerCommission: number;
  fuelOrHireCost: number;
  roadAllowance: number;
  tollAndCompanyTickets: number;
  driverAndAllowances: number;
  totalCost: number;
  profit: number;
  costDifference: number;
  costMatches: boolean;
  isExternal: boolean;
}

interface TruckBreakdownPanelProps {
  truckBreakdown: TruckBreakdownRow[];
  maintenanceCost: number;
  report?: PnlReport;
  expandedTruckIds: Set<number>;
  onToggleTruck: (truckId: number) => void;
  tripDetailsByTruck: ReadonlyMap<number, FinanceTripDetail[]>;
}

export function TruckBreakdownPanel({
  truckBreakdown,
  maintenanceCost,
  report,
  expandedTruckIds,
  onToggleTruck,
  tripDetailsByTruck,
}: TruckBreakdownPanelProps) {
  if (truckBreakdown.length === 0) return null;

  return (
    <Panel
      title="Phân tích lãi gộp theo phương tiện"
      subtitle={`Hiệu suất vận tải chi tiết của ${truckBreakdown.length} đầu xe`}
      style={{ marginTop: 20 }}
      flush
    >
      {/* ── Mobile card list (≤640px) ──────────────────────────────── */}
      <div className="mobile-only">
        <div className="truck-card-list">
          {truckBreakdown.map(t => {
            const margin = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0.0';
            const barPct = t.revenue > 0 ? Math.min(100, Math.max(0, (t.profit / t.revenue) * 100)) : 0;
            const maintComp = report?.maintenanceByComponent?.[t.id] ?? { truck: 0, trailer: 0 };
            const isExpanded = expandedTruckIds.has(t.id);
            const tripDetails = tripDetailsByTruck.get(t.id) ?? [];
            return (
              <div key={t.id} className={`truck-card${isExpanded ? ' truck-card--expanded' : ''}`}>
                <button
                  type="button"
                  className="truck-card__toggle"
                  onClick={() => onToggleTruck(t.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`truck-mobile-details-${t.id}`}
                >
                <div className="truck-card__header">
                  <span className="truck-card__plate">
                    <ChevronDown className="truck-expand-icon" size={16} aria-hidden="true" />
                    {t.plate}
                  </span>
                  <span className={`truck-card__profit ${t.profit >= 0 ? 'truck-card__profit--up' : 'truck-card__profit--down'}`}>
                    {formatNumber(t.profit)}₫
                  </span>
                </div>
                <div className="truck-card__stats">
                  <div className="truck-card__stat">
                    <span className="truck-card__stat-label">Lệnh</span>
                    <span className="truck-card__stat-value">{t.trips}</span>
                  </div>
                  <div className="truck-card__stat">
                    <span className="truck-card__stat-label">Doanh thu</span>
                    <span className="truck-card__stat-value">{formatNumber(t.revenue)}</span>
                  </div>
                  <div className="truck-card__stat">
                    <span className="truck-card__stat-label">Chi phí</span>
                    <span className="truck-card__stat-value">{formatNumber(t.costs)}</span>
                  </div>
                  {(maintComp.truck > 0 || maintComp.trailer > 0) && (
                    <div className="truck-card__stat">
                      <span className="truck-card__stat-label">Bảo dưỡng</span>
                      <span className="truck-card__stat-value">
                        {maintComp.truck > 0 ? `${formatNumber(maintComp.truck)} ĐK` : ''}
                        {maintComp.truck > 0 && maintComp.trailer > 0 ? ' · ' : ''}
                        {maintComp.trailer > 0 ? `${formatNumber(maintComp.trailer)} RM` : ''}
                      </span>
                    </div>
                  )}
                </div>
                <div className="truck-card__bar-track">
                  <div
                    className={`truck-card__bar-fill ${t.profit >= 0 ? 'truck-card__bar-fill--up' : 'truck-card__bar-fill--down'}`}
                    style={{ width: `${Math.min(100, Math.abs(barPct))}%` }}
                  />
                </div>
                <div className="truck-card__margin">
                  Biên LN {margin}% · Bấm để {isExpanded ? 'thu gọn' : 'xem từng lệnh'}
                </div>
                </button>
                {isExpanded && (
                  <div id={`truck-mobile-details-${t.id}`} className="truck-mobile-details">
                    {tripDetails.map(detail => (
                      <div className="truck-trip-card" key={detail.id}>
                        <div className="truck-trip-card__head">
                          <div>
                            <Link to={`/trips/${detail.id}`} className="truck-trip-link">
                              {detail.tripCode}<ExternalLink size={12} aria-hidden="true" />
                            </Link>
                            <div>{detail.routeName} · {new Date(detail.departureDate).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <CostCheck matches={detail.costMatches} difference={detail.costDifference} />
                        </div>
                        <div className="truck-trip-card__grid">
                          <TripAmount label="Doanh thu ghi nhận" value={detail.revenue} />
                          <TripAmount label="Hoa hồng KH" value={detail.customerCommission} />
                          <TripAmount label={detail.isExternal ? 'Thuê xe' : 'Nhiên liệu'} value={detail.fuelOrHireCost} />
                          <TripAmount label="Đi đường" value={detail.roadAllowance} />
                          <TripAmount label="Phí trạm/vé CT" value={detail.tollAndCompanyTickets} />
                          <TripAmount label="Lương & phụ cấp" value={detail.driverAndAllowances} />
                          <TripAmount label="Tổng chi phí" value={detail.totalCost} />
                          <TripAmount label="Lợi nhuận" value={detail.profit} emphasized />
                        </div>
                      </div>
                    ))}
                    <MaintenanceDetails
                      truck={maintComp.truck}
                      trailer={maintComp.trailer}
                      items={report?.maintenanceItemsByTruck?.[t.id] ?? []}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desktop table (>640px) ─────────────────────────────────── */}
      <div className="desktop-only">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Biển số xe</th>
                <th className="num">Lệnh</th>
                <th className="num">Doanh thu chặng</th>
                <th className="num">Tổng chi phí</th>
                {maintenanceCost > 0 && (
                  <>
                    <th className="num">BD đầu kéo</th>
                    <th className="num">BD rơ-mooc</th>
                  </>
                )}
                <th className="num">Lợi nhuận gộp</th>
              </tr>
            </thead>
            <tbody>
              {truckBreakdown.map(t => {
                const maintComp = report?.maintenanceByComponent?.[t.id] ?? { truck: 0, trailer: 0 };
                const isExpanded = expandedTruckIds.has(t.id);
                const tripDetails = tripDetailsByTruck.get(t.id) ?? [];
                return (
                  <Fragment key={t.id}>
                    <tr className={`truck-summary-row${isExpanded ? ' is-expanded' : ''}`}>
                      <td style={{ fontWeight: 600, color: t.id === 0 ? 'var(--fg-3)' : 'var(--fg-1)', fontStyle: t.id === 0 ? 'italic' : 'normal' }}>
                        <button
                          type="button"
                          className="truck-row-toggle"
                          onClick={() => onToggleTruck(t.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`truck-details-${t.id}`}
                        >
                          <ChevronDown className="truck-expand-icon" size={16} aria-hidden="true" />
                          <span>{t.plate}</span>
                          <span className="truck-row-toggle__hint">{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
                        </button>
                      </td>
                      <td className="num">{t.trips}</td>
                      <td className="num">{formatNumber(t.revenue)}</td>
                      <td className="num">{formatNumber(t.costs)}</td>
                      {maintenanceCost > 0 && (
                        <>
                          <td className="num">{maintComp.truck > 0 ? formatNumber(maintComp.truck) : '—'}</td>
                          <td className="num">{maintComp.trailer > 0 ? formatNumber(maintComp.trailer) : '—'}</td>
                        </>
                      )}
                      <td className="num" style={{ color: t.profit >= 0 ? 'var(--brand)' : 'var(--danger)', fontWeight: 700 }}>
                        {formatNumber(t.profit)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr id={`truck-details-${t.id}`} className="truck-details-row">
                        <td colSpan={maintenanceCost > 0 ? 7 : 5}>
                          <div className="truck-details-panel">
                            <div className="truck-details-panel__intro">
                              <span><strong>{tripDetails.length}/{t.trips}</strong> lệnh trong kỳ</span>
                              <span>“Khớp” chỉ xác nhận phép cộng các khoản bằng tổng chi phí đã lưu.</span>
                            </div>
                            <div className="truck-trip-table-wrap">
                              <table className="truck-trip-table">
                                <thead>
                                  <tr>
                                    <th>Lệnh / tuyến</th>
                                    <th className="num">Doanh thu ghi nhận</th>
                                    <th className="num">Hoa hồng KH</th>
                                    <th className="num">Nhiên liệu / thuê xe</th>
                                    <th className="num">Đi đường</th>
                                    <th className="num">Phí trạm / vé CT</th>
                                    <th className="num">Lương & phụ cấp</th>
                                    <th className="num">Tổng chi phí</th>
                                    <th className="num">Lợi nhuận</th>
                                    <th>Đối chiếu</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tripDetails.map(detail => (
                                    <tr key={detail.id}>
                                      <td>
                                        <Link to={`/trips/${detail.id}`} className="truck-trip-link">
                                          {detail.tripCode}<ExternalLink size={12} aria-hidden="true" />
                                        </Link>
                                        <div className="truck-trip-route">{detail.routeName} · {new Date(detail.departureDate).toLocaleDateString('vi-VN')}</div>
                                      </td>
                                      <td className="num">{formatNumber(detail.revenue)}</td>
                                      <td className="num">{detail.customerCommission ? formatNumber(detail.customerCommission) : '—'}</td>
                                      <td className="num">{formatNumber(detail.fuelOrHireCost)}</td>
                                      <td className="num">{detail.roadAllowance ? formatNumber(detail.roadAllowance) : '—'}</td>
                                      <td className="num">{detail.tollAndCompanyTickets ? formatNumber(detail.tollAndCompanyTickets) : '—'}</td>
                                      <td className="num">{detail.driverAndAllowances ? formatNumber(detail.driverAndAllowances) : '—'}</td>
                                      <td className="num"><strong>{formatNumber(detail.totalCost)}</strong></td>
                                      <td className="num" style={{ color: detail.profit >= 0 ? 'var(--brand)' : 'var(--danger)', fontWeight: 700 }}>{formatNumber(detail.profit)}</td>
                                      <td><CostCheck matches={detail.costMatches} difference={detail.costDifference} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <MaintenanceDetails
                              truck={maintComp.truck}
                              trailer={maintComp.trailer}
                              items={report?.maintenanceItemsByTruck?.[t.id] ?? []}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function CostCheck({ matches, difference }: { matches: boolean; difference: number }) {
  return matches ? (
    <span className="cost-check cost-check--ok" title="Các khoản chi phí cộng lại khớp với tổng chi phí đã lưu">
      <CheckCircle2 size={14} aria-hidden="true" /> Khớp
    </span>
  ) : (
    <span className="cost-check cost-check--warning" title={`Chênh ${formatNumber(Math.abs(difference))} ₫ so với tổng chi phí đã lưu`}>
      <AlertTriangle size={14} aria-hidden="true" /> Cần kiểm tra {formatNumber(Math.abs(difference))}₫
    </span>
  );
}

function TripAmount({ label, value, emphasized = false }: { label: string; value: number; emphasized?: boolean }) {
  return (
    <div className={emphasized ? 'truck-trip-amount truck-trip-amount--emphasized' : 'truck-trip-amount'}>
      <span>{label}</span>
      <strong>{formatNumber(value)}₫</strong>
    </div>
  );
}

function MaintenanceDetails({ truck, trailer, items }: { truck: number; trailer: number; items: PnlMaintenanceItem[] }) {
  if (truck <= 0 && trailer <= 0) return null;
  return (
    <div className="truck-maintenance-details">
      <div className="truck-maintenance-note">
        Chi phí phát sinh ngoài từng lệnh trong kỳ:
        {truck > 0 ? <> đầu kéo <strong>{formatNumber(truck)}₫</strong></> : null}
        {truck > 0 && trailer > 0 ? ' · ' : null}
        {trailer > 0 ? <> rơ-moóc <strong>{formatNumber(trailer)}₫</strong></> : null}.
      </div>
      {items.length > 0 && (
        <div className="truck-maintenance-list">
          {items.map(item => (
            <Link key={item.id} to={`/expenses/${item.id}/edit`} className="truck-maintenance-item">
              <span className="truck-maintenance-item__main">
                <strong>{item.categoryName}</strong>
                <small>
                  {item.vehicleComponent === 'TRAILER' ? 'Rơ-moóc' : 'Đầu kéo'} · {item.supplierName} · {new Date(item.expenseDate).toLocaleDateString('vi-VN')}
                  {item.note ? ` · ${item.note}` : ''}
                </small>
              </span>
              <span className="truck-maintenance-item__amount">{formatNumber(item.amount)}₫ <ExternalLink size={12} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
