import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../../lib/format';
import { EmptyState as DsEmptyState } from '../../../design-system/EmptyState';
import { RevenueTrendChart } from '../../../components/charts/RevenueTrendChart';
import { DailyBarsChart } from '../../../components/charts/DailyBarsChart';
import { fmtMillionsTr } from './dashboardFormatters';
import { CostBreakdown, type CostBreakdownItem } from './dashboard-presenters';

export interface FleetStats {
  ready: number;
  inTransit: number;
  internalInTransit: number;
  externalInTransit: number;
  maintenance: number;
  idle: number;
  total: number;
  drivers: number;
  utilizable: number;
  utilization: number | null;
  utilTone: 'ok' | 'high' | 'over';
}

export interface TruckMarginRow {
  plate: string;
  pct: number;
  widthPct: number;
}

export interface RouteProfitRow {
  name: string;
  profit: number;
}

/** Hero chart modes (NEPO-15): daily bars read the still-open month
 * honestly; the cumulative running-sum stays as the "Cộng dồn" view. */
export type ChartView = 'day' | 'cumulative' | 'month';

interface RevenueChartCardProps {
  /** Day labels for the daily-bars view */
  dailyLabels: string[];
  dailyRevenue: number[];
  dailyGross: number[];
  /** Cumulative (day) or trailing-12-month (month) series for the line view */
  chartMonths: string[];
  chartRevenue: number[];
  chartGross: number[];
  chartView: ChartView;
  onChartViewChange: (view: ChartView) => void;
  currentMonth: number;
  currentYear: number;
  /** Month totals from the plotted daily series, in millions — the KPI
   *  cluster inline in the card header (NEPO-25 verdict §b:
   *  Tổng tháng · TB/ngày · Đỉnh). */
  monthTotalM: number;
  dayAvgM: number;
  dayPeakM: number;
  onNavigate: (path: string) => void;
}

const CHART_VIEWS: Array<{ key: ChartView; label: string }> = [
  { key: 'day', label: 'Ngày' },
  { key: 'cumulative', label: 'Cộng dồn' },
  { key: 'month', label: 'Tháng' },
];

export function RevenueChartCard({
  dailyLabels, dailyRevenue, dailyGross,
  chartMonths, chartRevenue, chartGross,
  chartView, onChartViewChange, currentMonth, currentYear,
  monthTotalM, dayAvgM, dayPeakM, onNavigate,
}: RevenueChartCardProps) {
  const isDaily = chartView === 'day';
  const barsEmpty = dailyRevenue.every(v => v === 0) && dailyGross.every(v => v === 0);
  const lineEmpty = chartRevenue.every(v => v === 0) && chartGross.every(v => v === 0);
  return (
    <section className="d-card d-card-border bg-base-100 wf-card wf-chart wf-bento-hero" aria-labelledby="dashboard-revenue-title">
        <div className="wf-card-h">
          <div className="wf-chart-title">
            <h2 className="ttl" id="dashboard-revenue-title">Doanh thu &amp; Lợi nhuận gộp</h2>
            <div className="sub">
              {isDaily
                ? dailyLabels.length > 0
                  ? `${dailyLabels.length} ngày · Tháng ${currentMonth}/${currentYear}`
                  : 'Chưa có dữ liệu'
                : chartView === 'cumulative'
                  ? chartMonths.length > 0
                    ? `Cộng dồn ${chartMonths.length} ngày · Tháng ${currentMonth}/${currentYear}`
                    : 'Chưa có dữ liệu'
                  : chartMonths.length > 0
                    ? `${chartMonths.length} tháng gần nhất`
                    : 'Chưa có dữ liệu'}
            </div>
          </div>
          {/* KPI cluster inline beside the chart title (NEPO-25 §b) — the
              month the chart plots, summarised where the eye already is. */}
          <div className="wf-metrics" role="group" aria-label="Chỉ số doanh thu tháng">
            <div className="wf-metric">
              <span className="k">Tổng tháng</span>
              <span className="v">{fmtMillionsTr(monthTotalM)}</span>
            </div>
            <span className="wf-metrics__div" aria-hidden="true" />
            <div className="wf-metric">
              <span className="k">TB/ngày</span>
              <span className="v">{fmtMillionsTr(dayAvgM)}</span>
            </div>
            <span className="wf-metrics__div" aria-hidden="true" />
            <div className="wf-metric">
              <span className="k">Đỉnh</span>
              <span className="v">{fmtMillionsTr(dayPeakM)}</span>
            </div>
          </div>
          <div className="wf-chart-actions">
            <div className="wf-chart-toggle" role="group" aria-label="Kiểu hiển thị biểu đồ">
              {CHART_VIEWS.map(v => (
                <button
                  key={v.key}
                  type="button"
                  className={`wf-chart-toggle__btn${chartView === v.key ? ' is-active' : ''}`}
                  onClick={() => onChartViewChange(v.key)}
                  aria-pressed={chartView === v.key}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <button className="d-btn d-btn-link d-btn-sm wf-link" onClick={() => onNavigate('/finance')}>Xem báo cáo
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        <div className="wf-legend">
          <span className="li"><span className="sw" style={{ background: 'var(--wf-green)' }} />Doanh thu (chưa VAT)</span>
          <span className="li"><span className="sw" style={{ background: 'var(--wf-blue)' }} />Lợi nhuận gộp</span>
        </div>
        <div className="body">
          {(() => {
            const empty = isDaily ? barsEmpty : lineEmpty;
            const rawEmpty = isDaily ? dailyRevenue.length === 0 : chartRevenue.length === 0;
            if (rawEmpty || empty) {
              return (
                <div style={{ padding: '24px 16px', flex: 1 }}>
                  <DsEmptyState
                    title={rawEmpty ? 'Đang tải dữ liệu' : 'Chưa đủ dữ liệu lịch sử'}
                    description={rawEmpty
                      ? 'Đang thu thập số liệu doanh thu và lợi nhuận…'
                      : 'Biểu đồ doanh thu & lợi nhuận gộp sẽ xuất hiện tại đây sau khi có chuyến đầu tiên trong kỳ.'}
                    preview="rows"
                    previewCount={rawEmpty ? 3 : 4}
                  />
                </div>
              );
            }
            return isDaily
              ? <DailyBarsChart labels={dailyLabels} revenue={dailyRevenue} gross={dailyGross} maxTicks={3} formatY={fmtMillionsTr} />
              : <RevenueTrendChart months={chartMonths} revenue={chartRevenue} gross={chartGross} maxTicks={3} formatY={fmtMillionsTr} />;
          })()}
        </div>
      </section>
  );
}

interface FleetStatusCardProps {
  fleet: FleetStats;
  onNavigate: (path: string) => void;
}

export function FleetStatusCard({ fleet, onNavigate }: FleetStatusCardProps) {
  return (
    <div className="d-card d-card-border bg-base-100 wf-card wf-fleet wf-bento-third">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl">Tình trạng đội xe</h2>
            <div className="sub">{fleet.total} đầu kéo · {fleet.drivers} lái xe</div>
          </div>
          <button className="d-btn d-btn-link d-btn-sm wf-link" onClick={() => onNavigate('/fleet')}>Quản lý</button>
        </div>
        <div className="body">
          <div className="wf-fstats">
            <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-green-500)' }} />{fleet.ready}</div><div className="k">Sẵn sàng</div></div>
            <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-green)' }} />{fleet.inTransit}</div><div className="k">Đang chạy</div></div>
            <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-amber)' }} />{fleet.maintenance}</div><div className="k">Bảo dưỡng</div></div>
            <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-ink-3)' }} />{fleet.idle}</div><div className="k">Ngừng</div></div>
          </div>
          {fleet.utilization != null && (
            <div
              className="wf-util"
              title={`Đội xe nội bộ: ${fleet.internalInTransit}/${fleet.utilizable} (${Math.round(fleet.utilization)}%) · Thuê xe ngoài: ${fleet.externalInTransit} chuyến`}
            >
              <span className="cap">Tỷ lệ sử dụng</span>
              <progress
                className={`d-progress track ${fleet.utilTone === 'over' ? 'd-progress-warning' : fleet.utilTone === 'high' ? 'd-progress-info' : 'd-progress-success'}`}
                value={Math.min(100, fleet.utilization)}
                max="100"
                aria-label="Tỷ lệ sử dụng đội xe"
              />
              <span className={`pct pct--${fleet.utilTone}`}>{Math.round(fleet.utilization)}%</span>
              {fleet.utilTone === 'over' && (
                <span className="wf-util__flag wf-util__flag--over">
                  <AlertTriangle size={12} aria-hidden="true" /> Vượt công suất
                </span>
              )}
              {fleet.externalInTransit > 0 && (
                <span className="wf-util__flag wf-util__flag--external">Thuê ngoài: {fleet.externalInTransit} chuyến</span>
              )}
            </div>
          )}
        </div>
      </div>
  );
}

interface CostCompositionCardProps {
  items: CostBreakdownItem[];
  total: number;
  currentMonth: number;
  currentYear: number;
}

export function CostCompositionCard({ items, total, currentMonth, currentYear }: CostCompositionCardProps) {
  return (
    <div className="d-card d-card-border bg-base-100 wf-card wf-cost wf-bento-third">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl">Cơ cấu chi phí</h2>
            <div className="sub">Tháng {String(currentMonth).padStart(2, '0')}/{currentYear} · xếp theo giá trị</div>
          </div>
        </div>
        <div className="body">
          {items.length === 0 ? (
            <div style={{ padding: 16, fontSize: 'var(--fs-body)', color: 'var(--wf-ink-3)' }}>Chưa có chi phí ghi nhận trong tháng.</div>
          ) : (
            <CostBreakdown items={items} total={total} />
          )}
        </div>
      </div>
  );
}

interface ProfitByTruckCardProps {
  trucks: TruckMarginRow[];
  currentMonth: number;
  currentYear: number;
}

export function ProfitByTruckCard({ trucks, currentMonth, currentYear }: ProfitByTruckCardProps) {
  return (
    <div className="d-card d-card-border bg-base-100 wf-card wf-bento-third">
          <div className="wf-card-h">
            <div>
              <h2 className="ttl">Lợi nhuận theo xe</h2>
              <div className="sub">Biên gộp từng đầu kéo · {String(currentMonth).padStart(2, '0')}/{currentYear}</div>
            </div>
          </div>
          <div className="wf-vlist">
            {trucks.length === 0 ? (
              <div style={{ padding: '8px 0', fontSize: 'var(--fs-body)', color: 'var(--wf-ink-3)' }}>Chưa có dữ liệu xe trong tháng.</div>
            ) : trucks.map((t, i) => (
              <div key={i} className="wf-vrow">
                <span className="plate" title={t.plate}>{t.plate}</span>
                <progress className="d-progress d-progress-success bar" value={t.widthPct} max="100" aria-label={`Biên lợi nhuận xe ${t.plate}`} />
                <span className="pct">{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
  );
}

interface TopRoutesCardProps {
  routes: RouteProfitRow[];
  currentMonth: number;
  currentYear: number;
  onNavigate: (path: string) => void;
}

export function TopRoutesCard({ routes, currentMonth, currentYear, onNavigate }: TopRoutesCardProps) {
  return (
    <div className="d-card d-card-border bg-base-100 wf-card wf-bento-half">
          <div className="wf-card-h">
            <div>
              <h2 className="ttl">Top tuyến sinh lời</h2>
              <div className="sub">Theo lợi nhuận gộp · {String(currentMonth).padStart(2, '0')}/{currentYear}</div>
            </div>
            <button className="d-btn d-btn-link d-btn-sm wf-link" onClick={() => onNavigate('/finance')}>Tất cả</button>
          </div>
          <div className="wf-rlist">
            {routes.length === 0 ? (
              <div style={{ padding: 10, fontSize: 'var(--fs-body)', color: 'var(--wf-ink-3)' }}>Chưa có dữ liệu tuyến.</div>
            ) : routes.map((r, i) => (
              <div key={i} className="wf-rrow">
                <span className="rk">{i + 1}</span>
                <span className="rt" title={r.name}>{r.name}</span>
                <span className="rv">{formatNumber(r.profit)}</span>
              </div>
            ))}
          </div>
        </div>
  );
}
