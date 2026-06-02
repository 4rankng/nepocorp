import React from 'react';
import { Link } from 'react-router-dom';
import { formatCompact } from '../../../lib/format';
import { Panel, KPI } from '../../../components/UI';
import { styles } from '../utils';
import type { DerivedData } from '../hooks/useDashboardData';

export const MonthlyChart = React.memo(function MonthlyChart({
  yearlySeries,
  currentMonth,
  currentYear,
}: {
  yearlySeries: Array<{ revenue: number; grossProfit: number }>;
  currentMonth: number;
  currentYear: number;
}) {
  const series = yearlySeries.length === 12
    ? yearlySeries
    : Array.from({ length: 12 }, () => ({ revenue: 0, grossProfit: 0 }));
  const maxVal = Math.max(
    1,
    ...series.map((s) => Math.max(s.revenue, s.grossProfit)),
  );
  const niceMax = Math.ceil(maxVal / 100_000_000) * 100_000_000;
  const x0 = 40, x1 = 680, y0 = 20, y1 = 190;
  const xFor = (i: number) => x0 + (i * (x1 - x0)) / 11;
  const yFor = (v: number) => y1 - (v / niceMax) * (y1 - y0);
  const monthLabels: string[] = [];
  for (let i = 0; i < 12; i++) {
    let m = currentMonth - 11 + i;
    while (m <= 0) m += 12;
    monthLabels.push(`T${m}`);
  }
  const revPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(s.revenue)}`).join(' ');
  const profitPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(s.grossProfit)}`).join(' ');
  const areaPath = `${revPath} L ${xFor(11)},${y1} L ${xFor(0)},${y1} Z`;
  const lastIdx = 11;
  const lastX = xFor(lastIdx);
  const lastY = yFor(series[lastIdx].revenue);
  const lastProfitY = yFor(series[lastIdx].grossProfit);
  const fmt = (v: number) =>
    v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(2)} tỷ ₫` : `${Math.round(v / 1_000_000)}M ₫`;
  const ticks = [4, 3, 2, 1, 0].map((i) => (niceMax * i) / 4);
  const tickYs = [y0, y0 + (y1 - y0) * 0.25, y0 + (y1 - y0) * 0.5, y0 + (y1 - y0) * 0.75, y1];
  return (
    <svg className="linechart" viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu và lợi nhuận 12 tháng" style={styles.chartOverflow}>
      {tickYs.map((y, idx) => (
        <line key={idx} className="linechart__grid" x1={x0} y1={y} x2={x1} y2={y} strokeDasharray={idx === tickYs.length - 1 ? undefined : '2 4'} />
      ))}
      {ticks.map((v, idx) => (
        <text key={idx} className="linechart__axis-label" x={x0 - 6} y={tickYs[idx] + 4} textAnchor="end">{fmt(v).replace(' ₫', '')}</text>
      ))}
      {monthLabels.map((label, i) => (
        <text key={i} className="linechart__axis-label" x={xFor(i)} y={y1 + 20} textAnchor="middle">{label}</text>
      ))}
      <path className="linechart__area" d={areaPath} />
      <path className="linechart__line linechart__line--revenue" d={revPath} />
      <path className="linechart__line linechart__line--profit" d={profitPath} />
      <circle className="linechart__dot" cx={lastX} cy={lastY} r="5" />
      <circle className="linechart__dot linechart__dot--profit" cx={lastX} cy={lastProfitY} r="5" />
      <g transform={`translate(${lastX}, ${lastY})`}>
        <rect x="-90" y="-38" width="86" height="28" rx="6" fill="var(--ink)" />
        <text x="-47" y="-26" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="rgba(255,255,255,0.65)" fontWeight="500">{String(currentMonth).padStart(2, '0')}/{currentYear}</text>
        <text x="-47" y="-14" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill="#fff" fontWeight="700">
          {fmt(series[lastIdx].revenue)}
        </text>
      </g>
    </svg>
  );
});

export const FleetStatusCards = React.memo(function FleetStatusCards({
  fleetStatus,
  inTransitTrips,
}: {
  fleetStatus: Record<string, number> | undefined;
  inTransitTrips: number | undefined;
}) {
  const fleet = fleetStatus ?? {};
  const active = fleet['ACTIVE'] ?? 0;
  const maintenance = fleet['MAINTENANCE'] ?? 0;
  const inactive = fleet['INACTIVE'] ?? 0;
  const inTransit = inTransitTrips ?? 0;
  const total = active + maintenance + inactive || 1;
  const fleetCards: Array<{ label: string; value: number; variant: 'success' | 'warn' | 'default' | 'accent' }> = [
    { label: 'Hoạt động', value: active, variant: 'success' },
    { label: 'Bảo dưỡng', value: maintenance, variant: 'warn' },
    { label: 'Ngừng', value: inactive, variant: 'default' },
    { label: 'Đang chạy', value: inTransit, variant: 'accent' },
  ];
  return (
    <>
      <div className="kpi-grid" style={styles.fleetGrid}>
        {fleetCards.map(c => (
          <KPI key={c.label} label={c.label} value={c.value} variant={c.variant} />
        ))}
      </div>
      <div style={styles.utilBar}>
        <div style={styles.utilTrack}>
          <div style={{ width: `${(active / total) * 100}%`, ...styles.utilFill }} />
        </div>
        <span style={styles.utilLabel}>{Math.round((active / total) * 100)}% sử dụng</span>
      </div>
    </>
  );
});

interface PieChartSectionProps {
  derived: DerivedData;
  yearlySeries: Array<{ revenue: number; grossProfit: number }>;
  currentMonth: number;
  currentYear: number;
  formattedTotalPie: string;
}

export function PieChartSection({ derived, yearlySeries, currentMonth, currentYear, formattedTotalPie }: PieChartSectionProps) {
  const {
    slicesWithPct = [],
    conicGradient = 'conic-gradient(var(--fg-3) 0% 100%)',
  } = derived;

  return (
    <div className="dash-grid fade-up-2">
      <Panel
        title="Doanh thu & Lợi nhuận gộp · 12 tháng"
        subtitle={`Tăng trưởng đều — đỉnh tại ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
        action={<Link to='/finance' style={styles.linkAction}>Xem báo cáo →</Link>}
      >
        <div className="chart-legend">
          <div className="chart-legend__item">
            <span className="chart-legend__swatch" style={styles.brandSwatch}></span>
            Doanh thu
          </div>
          <div className="chart-legend__item">
            <span className="chart-legend__swatch" style={styles.infoSwatch}></span>
            Lợi nhuận gộp
          </div>
        </div>
        <MonthlyChart yearlySeries={yearlySeries} currentMonth={currentMonth} currentYear={currentYear} />
      </Panel>

      <Panel
        title={`Cơ cấu chi phí ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
        subtitle={`Tổng ${formattedTotalPie} ₫`}
      >
        {slicesWithPct.every(sl => sl.value === 0) ? (
          <div className="aging" style={styles.gap18}>
            <div
              className="aging__donut"
              style={{
                background: 'conic-gradient(var(--surface-3) 0% 100%)',
                ['--bg-2' as any]: '#ffffff'
              }}
            >
              <div className="aging__donut-label">
                <div>
                  <div className="aging__total">—</div>
                  <div className="aging__total-label">Chi phí {String(currentMonth).padStart(2, '0')}/{currentYear}</div>
                </div>
              </div>
            </div>
            <div className="aging__list">
              <div style={{ ...styles.noDataMsg, flexDirection: 'column', gap: 6 }}>
                <img src="/assets/illustrations/empty-pie.svg" alt="" aria-hidden="true" style={{ width: 120, height: 100, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                Chưa có dữ liệu chi phí
              </div>
            </div>
          </div>
        ) : (
        <div className="aging" style={styles.gap18}>
          <div
            className="aging__donut"
            style={{
              background: conicGradient,
              ['--bg-2' as any]: '#ffffff'
            }}
          >
            <div className="aging__donut-label">
              <div>
                <div className="aging__total">{formattedTotalPie}</div>
                <div className="aging__total-label">Chi phí {String(currentMonth).padStart(2, '0')}/{currentYear}</div>
              </div>
            </div>
          </div>
          <div className="aging__list">
            {slicesWithPct.map((sl) => (
              <div className="aging__row" key={sl.label}>
                <span className="aging__dot" style={{ background: sl.color }}></span>
                <span className="aging__row-label">{sl.label}</span>
                <span className="aging__row-value">{formatCompact(sl.value)}</span>
                <span className="aging__row-pct">{sl.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        )}
      </Panel>
    </div>
  );
}
