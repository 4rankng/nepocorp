import { EmptyIllustration } from '../../components/shared';
import { RevenueTrendChart } from '../../components/charts/RevenueTrendChart';
import { TopTruckProfitChart } from '../../components/charts/TopTruckProfitChart';
import { formatNumber } from '../../lib/format';

export interface FinanceCostSlice {
  name: string;
  value: number;
  fill: string;
}

export interface FinanceTopTruck {
  name: string;
  'LN gộp': number;
}

interface FinanceChartsRowProps {
  chartView: 'day' | 'month';
  onChartViewChange: (view: 'day' | 'month') => void;
  month: number;
  year: number;
  yearlyLoading: boolean;
  hasChartData: boolean;
  activeChartData: { months: string[]; revenue: number[]; gross: number[]; currentIdx?: number };
  loading: boolean;
  costPieData: FinanceCostSlice[];
  topTrucks: FinanceTopTruck[];
  /** Compact-currency formatter (page-owned helper, injected to keep the one-way page → feature dependency). */
  formatCompact: (value: number) => string;
}

export function FinanceChartsRow({
  chartView,
  onChartViewChange,
  month,
  year,
  yearlyLoading,
  hasChartData,
  activeChartData,
  loading,
  costPieData,
  topTrucks,
  formatCompact,
}: FinanceChartsRowProps) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }} className="fade-up-3 finance-charts-row">
      {/* Revenue trend */}
      <div className="dash-wf" style={{ flex: '2 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="wf-card wf-chart" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="wf-card-h">
            <div>
              <div className="ttl">Doanh thu {chartView === 'day' ? `Tháng ${month}/${year}` : year}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="wf-chart-toggle">
                <button className={`wf-chart-toggle__btn${chartView === 'day' ? ' is-active' : ''}`} onClick={() => onChartViewChange('day')}>Ngày</button>
                <button className={`wf-chart-toggle__btn${chartView === 'month' ? ' is-active' : ''}`} onClick={() => onChartViewChange('month')}>Tháng</button>
              </div>
            </div>
          </div>
          <div className="wf-legend">
            <span className="li"><span className="sw" style={{ background: 'var(--wf-green)' }} />Doanh thu</span>
            <span className="li"><span className="sw" style={{ background: 'var(--wf-blue)' }} />Lợi nhuận gộp</span>
          </div>
          <div className="body">
            {yearlyLoading ? (
              <div style={{ padding: '40px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--wf-ink-3)', fontSize: 'var(--fs-body)', flex: 1 }}>
                Đang tải dữ liệu...
              </div>
            ) : !hasChartData ? (
              <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--wf-ink-3)', fontSize: 'var(--fs-body)', gap: 8, flex: 1 }}>
                <EmptyIllustration name="empty-pricing" width={150} height={124} />
                <div>
                  {chartView === 'day'
                    ? `Chưa có chuyến nào được khóa trong tháng ${month}/${year}`
                    : `Chưa có chuyến nào được khóa trong năm ${year}`}
                </div>
                <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--wf-ink-3)' }}>Khoá lệnh để xem xu hướng doanh thu</div>
              </div>
            ) : (
              <RevenueTrendChart
                title={`Xu hướng doanh thu và lợi nhuận gộp ${chartView === 'day' ? `tháng ${month}/${year}` : `năm ${year}`}`}
                months={activeChartData.months}
                revenue={activeChartData.revenue}
                gross={activeChartData.gross}
                currentIdx={activeChartData.currentIdx}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right column: cost pie + top trucks stacked */}
      <div className="panel" style={{ padding: '16px 20px', flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Cost pie */}
        <div>
          <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
            Cơ cấu chi phí {String(month).padStart(2, '0')}/{String(year).slice(-2)}
          </div>
          {loading ? (
            <div style={{ height: 160, background: 'var(--bg-2)', borderRadius: 6 }} />
          ) : costPieData.length > 0 ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {(() => {
                const total = costPieData.reduce((s, d) => s + d.value, 0) || 1;
                const cx = 100, cy = 100, rOuter = 80, rInner = 50;
                let start = -Math.PI / 2;
                const arcs = costPieData.map((d) => {
                  const angle = (d.value / total) * Math.PI * 2;
                  const end = start + angle;
                  const x1 = cx + rOuter * Math.cos(start), y1 = cy + rOuter * Math.sin(start);
                  const x2 = cx + rOuter * Math.cos(end), y2 = cy + rOuter * Math.sin(end);
                  const x3 = cx + rInner * Math.cos(end), y3 = cy + rInner * Math.sin(end);
                  const x4 = cx + rInner * Math.cos(start), y4 = cy + rInner * Math.sin(start);
                  const large = angle > Math.PI ? 1 : 0;
                  const path = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
                  start = end;
                  return { path, fill: d.fill, name: d.name, value: d.value, pct: (d.value / total) * 100 };
                });
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <svg viewBox="0 0 200 200" width={140} height={140} style={{ flexShrink: 0 }} role="img" aria-label={`Cơ cấu chi phí tháng ${month}/${year}`}>
                        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.fill} stroke="#FFFFFF" strokeWidth={2.5} />)}
                        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="12" fill="var(--ink-2)" fontFamily="var(--font-sans)">Tổng chi phí</text>
                        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="14" fontWeight={700} fill="var(--ink)" fontFamily="var(--font-mono)">{formatCompact(total)}</text>
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--fs-body)', width: '100%' }}>
                      {arcs.map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                          <span style={{ width: 10, height: 10, background: a.fill, borderRadius: 2, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--ink)', marginRight: 4 }}>{formatNumber(a.value)}₫</span>
                          <span style={{ color: 'var(--ink-3)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{a.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 'var(--fs-body)', gap: 8 }}>
              <EmptyIllustration name="empty-pie" width={126} height={104} />
              <div>Chưa có dữ liệu chi phí</div>
              <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)' }}>Khoá lệnh có chi tiết nhiên liệu/đường để xem cơ cấu</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ margin: '16px 0', borderTop: '1px solid var(--line)' }} />

        {/* Top trucks */}
        <div>
          <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}>
            Top xe theo lợi nhuận – {String(month).padStart(2, '0')}/{String(year).slice(-2)}
          </div>
          {loading ? (
            <div style={{ height: 80, background: 'var(--bg-2)', borderRadius: 6 }} />
          ) : topTrucks.length === 0 ? (
            <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 'var(--fs-body)' }}>
              Chưa có xe nào có chuyến đã khóa trong tháng này
            </div>
          ) : (
            <TopTruckProfitChart
              items={topTrucks.map(truck => ({
                name: truck.name,
                profit: truck['LN gộp'],
              }))}
              ariaLabel={`Top xe theo lợi nhuận tháng ${month}/${year}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
