import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../../lib/format';
import { EmptyState as DsEmptyState } from '../../../design-system/EmptyState';
import { RevenueTrendChart } from '../../../components/charts/RevenueTrendChart';
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

interface RevenueChartCardProps {
  chartMonths: string[];
  chartRevenue: number[];
  chartGross: number[];
  chartView: 'day' | 'month';
  onChartViewChange: (view: 'day' | 'month') => void;
  currentMonth: number;
  currentYear: number;
  onNavigate: (path: string) => void;
}

export function RevenueChartCard({
  chartMonths, chartRevenue, chartGross, chartView, onChartViewChange, currentMonth, currentYear, onNavigate,
}: RevenueChartCardProps) {
  return (
    <section className="d-card d-card-border bg-base-100 wf-card wf-chart wf-bento-hero" aria-labelledby="dashboard-revenue-title">
        <div className="wf-card-h">
          <div>
            <h2 className="ttl" id="dashboard-revenue-title">Doanh thu & Lợi nhuận gộp</h2>
            <div className="sub">
              {chartMonths.length > 0
                ? chartView === 'day'
                  ? `${chartMonths.length} ngày · Tháng ${currentMonth}/${currentYear}`
                  : `${chartMonths.length} tháng gần nhất`
                : 'Chưa có dữ liệu'}
            </div>
          </div>
          <div className="wf-chart-actions">
            <div className="wf-chart-toggle">
              <button className={`d-btn d-btn-sm wf-chart-toggle__btn${chartView === 'day' ? ' is-active' : ''}`} onClick={() => onChartViewChange('day')} aria-pressed={chartView === 'day'}>Ngày</button>
              <button className={`d-btn d-btn-sm wf-chart-toggle__btn${chartView === 'month' ? ' is-active' : ''}`} onClick={() => onChartViewChange('month')} aria-pressed={chartView === 'month'}>Tháng</button>
            </div>
            <button className="d-btn d-btn-link d-btn-sm wf-link" onClick={() => onNavigate('/finance')}>Xem báo cáo
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        <div className="wf-legend">
          <span className="li"><span className="sw" style={{ background: 'var(--wf-green)' }} />Doanh thu</span>
          <span className="li"><span className="sw" style={{ background: 'var(--wf-blue)' }} />Lợi nhuận gộp</span>
        </div>
        <div className="body">
          {(() => {
            if (chartRevenue.length === 0) {
              return (
                <div style={{ padding: '24px 16px', flex: 1 }}>
                  <DsEmptyState
                    title="Đang tải dữ liệu"
                    description="Đang thu thập số liệu doanh thu và lợi nhuận…"
                    preview="rows"
                    previewCount={3}
                  />
                </div>
              );
            }
            const totalRev = chartRevenue.reduce((a, b) => a + b, 0);
            const totalGp = chartGross.reduce((a, b) => a + b, 0);
            if (totalRev === 0 && totalGp === 0) {
              return (
                <div style={{ padding: '24px 16px', flex: 1 }}>
                  <DsEmptyState
                    title="Chưa đủ dữ liệu lịch sử"
                    description="Biểu đồ doanh thu & lợi nhuận gộp sẽ xuất hiện tại đây sau khi có chuyến đầu tiên trong kỳ."
                    preview="rows"
                    previewCount={4}
                  />
                </div>
              );
            }
            return <RevenueTrendChart months={chartMonths} revenue={chartRevenue} gross={chartGross} />;
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
    <div className="d-card d-card-border bg-base-100 wf-card wf-bento-half">
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
