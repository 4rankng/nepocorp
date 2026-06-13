import { useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getActiveCapTable } from '../lib/cap-table';
import { formatNumber } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { CalendarDays } from 'lucide-react';
import { PageHeader, Panel } from '../components/UI';
import { usePnlReport, useYearlyPnl, useMonthlyTrips, useCapTable, type PnlReport } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';
import { usePageAnimations, useCounterAnimation } from '../hooks/animations';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { TripDetail, CapTableHistory } from '@tingting/shared';
import './FinancePage.css';

/** Margin percentage — computed once, used in KPI strip, counter animation, and P&L table. */
function marginPct(grossProfit: number, totalRevenue: number): string {
  return totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
}

function yoyPct(current: number, previous: number): string {
  if (previous == null || previous === 0) return current > 0 ? 'Mới' : '—';
  const pct = ((current - previous) / previous * 100).toFixed(1);
  return `${Number(pct) >= 0 ? '+' : ''}${pct}%`;
}

function yoyClass(current: number, previous: number): string {
  if (previous == null) return '';
  return current >= previous ? 'pnl-row__pct--up' : 'pnl-row__pct--down';
}

const EMPTY_TRIPS: TripDetail[] = [];
const EMPTY_CAP: CapTableHistory[] = [];
const EMPTY_YEARLY: (PnlReport | null)[] = [];

export default function FinancePage() {
  const navigate = useNavigate();
  const { month, year } = useMonth();
  const { data: report, isLoading: loading, error: queryError } = usePnlReport(month, year);
  const { rootRef } = usePageAnimations({ ready: !loading });

  const kpiRefs = useRef<{ revenue: HTMLSpanElement | null; gross: HTMLSpanElement | null; net: HTMLSpanElement | null; margin: HTMLSpanElement | null }>({
    revenue: null, gross: null, net: null, margin: null,
  });
  const prefersReduced = usePrefersReducedMotion();

  const { data: prevReport } = usePnlReport(month, year - 1);

  const { data: allTrips = EMPTY_TRIPS } = useMonthlyTrips(year, month);
  const { data: capTableRaw = EMPTY_CAP } = useCapTable();
  const { data: yearlyData = EMPTY_YEARLY, isLoading: yearlyLoading } = useYearlyPnl(year);

  const error = queryError ? queryError.message || 'Không thể tải báo cáo' : null;

  const compactNum = (v: number) => {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}tỷ`.replace('.0', '');
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}tr`.replace('.0', '');
    return `${(v / 1e3).toFixed(0)}k`;
  };

  const {
    fuelCost, roadCost, driverCost, maintenanceCost, companyExpenses,
    totalRevenue, otherRevenue, transRevenue, totalCosts, grossProfit, mgmtFee, netProfit,
    totalRevenueLY, otherRevenueLY, transRevenueLY, totalCostsLY, grossProfitLY, mgmtFeeLY, companyExpensesLY, netProfitLY,
    activeCapTable, revenueChartData, costPieData, topTrucks, categoryBreakdown, truckBreakdown,
  } = useMemo(() => {
    const activeTrips = allTrips.filter((t: TripDetail) => t.status !== 'CANCELED');
    const realFuelCost = activeTrips.reduce((s, t) => s + parseFloat((t as any).totalFuelCost || '0'), 0);
    const realRoadCost = activeTrips.reduce((s, t) => s + parseFloat((t as any).totalRoadAllowance || '0'), 0);
    const realDriverCost = activeTrips.reduce((s, t) => s + parseFloat((t as any).driverSalary || '0'), 0);
    const totalCosts = report?.totalCosts ?? 0;
    
    const hasRealCosts = realFuelCost + realRoadCost + realDriverCost > 0;
    const fuelCost   = hasRealCosts ? realFuelCost   : Math.round(totalCosts * 0.55);
    const roadCost   = hasRealCosts ? realRoadCost   : Math.round(totalCosts * 0.25);
    const driverCost = hasRealCosts ? realDriverCost : Math.round(totalCosts * 0.20);
    const maintenanceCost = report?.maintenanceExpensesTotal ?? 0;
    const companyExpenses = report?.companyExpenses ?? 0;

    const totalRevenue = report?.totalRevenue ?? 0;
    const otherRevenue = report?.otherIncome ?? 0;
    const transRevenue = Math.max(0, totalRevenue - otherRevenue);
    // totalCosts is already defined above
    const grossProfit = report?.grossProfit ?? (totalRevenue - totalCosts);
    const mgmtFee = report?.managementFee ?? 0;
    const netProfit = report?.netProfit ?? (grossProfit - mgmtFee + otherRevenue);

    const totalRevenueLY = prevReport?.totalRevenue ?? 0;
    const otherRevenueLY = prevReport?.otherIncome ?? 0;
    const transRevenueLY = Math.max(0, totalRevenueLY - otherRevenueLY);
    const totalCostsLY = prevReport?.totalCosts ?? 0;
    const grossProfitLY = prevReport?.grossProfit ?? (totalRevenueLY - totalCostsLY);
    const mgmtFeeLY = prevReport?.managementFee ?? 0;
    const companyExpensesLY = prevReport?.companyExpenses ?? 0;
    const netProfitLY = prevReport?.netProfit ?? (grossProfitLY - mgmtFeeLY + otherRevenueLY);

    const activeCapTable = getActiveCapTable(capTableRaw)
      .map(c => ({ name: c.partnerName, pct: c.percentage }));

    const revenueChartData = yearlyData.map((r, i) => ({
      name: `T${i + 1}`,
      'Doanh thu': r?.totalRevenue ?? 0,
      'LN gộp': r?.grossProfit ?? 0,
    }));

    const costPieData = [
      { name: 'Nhiên liệu', value: fuelCost, fill: '#059669' },
      { name: 'Tiền đi đường', value: roadCost, fill: '#D97706' },
      { name: 'Lương lái xe', value: driverCost, fill: '#2563EB' },
      { name: 'Bảo dưỡng', value: maintenanceCost, fill: '#DC2626' },
      { name: 'Phí quản lý', value: mgmtFee, fill: '#EA580C' },
    ].filter(d => d.value > 0.5);

    const categoryBreakdown: Array<{ categoryName: string; total: number }> =
      (report?.categoryBreakdown ?? []).map(c => ({
        categoryName: c.categoryName,
        total: parseFloat(c.total),
      }));

    const topTrucks = [...(report?.trucks ?? [])]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map(t => ({
        name: t.plate,
        'LN gộp': t.profit,
        maintenance: t.maintenanceExpenses ?? 0,
      }));

    // Per-truck breakdown from all active trips (not gated on locked status)
    const truckMap = new Map<number, { id: number; plate: string; trips: number; revenue: number; costs: number; profit: number }>();
    for (const t of activeTrips) {
      const isExternal = t.carrierType === 'EXTERNAL';
      const key = isExternal ? 0 : t.truckId;
      const plate = isExternal ? 'Xe ngoài' : (t.truck?.licensePlate ?? `Truck #${t.truckId}`);
      const rev = parseFloat(t.revenue ?? '0') + parseFloat(t.revenueEmptyReturn ?? '0');
      const cost = parseFloat(t.totalCost ?? '0');
      const gp = parseFloat(t.grossProfit ?? '0');
      const existing = truckMap.get(key);
      if (existing) {
        existing.trips++;
        existing.revenue += rev;
        existing.costs += cost;
        existing.profit += gp;
      } else {
        truckMap.set(key, { id: key, plate, trips: 1, revenue: rev, costs: cost, profit: gp });
      }
    }
    const truckBreakdown = [...truckMap.values()].sort((a, b) => b.profit - a.profit);

    return {
      fuelCost, roadCost, driverCost, maintenanceCost, companyExpenses,
      totalRevenue, otherRevenue, transRevenue, totalCosts, grossProfit, mgmtFee, netProfit,
      totalRevenueLY, otherRevenueLY, transRevenueLY, totalCostsLY, grossProfitLY, mgmtFeeLY, companyExpensesLY, netProfitLY,
      activeCapTable, revenueChartData, costPieData, topTrucks, categoryBreakdown, truckBreakdown,
    };
  }, [allTrips, report, prevReport, capTableRaw, yearlyData]);

  // ── KPI counter animation ──
  const { animateCounters } = useCounterAnimation({ duration: 1200, delay: 300, stagger: 100 });

  useEffect(() => {
    if (loading || !report || prefersReduced) return;

    const targets: { el: HTMLElement; value: number; format?: (val: number) => string }[] = [
      { el: kpiRefs.current.revenue, value: totalRevenue },
      { el: kpiRefs.current.gross, value: grossProfit },
      { el: kpiRefs.current.net, value: netProfit },
    ].filter((c): c is { el: HTMLSpanElement; value: number } => c.el !== null);

    // Margin % counter with decimal formatting
    const marginEl = kpiRefs.current.margin;
    if (marginEl) {
      targets.push({ el: marginEl, value: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0, format: (val) => val.toFixed(1) });
    }

    animateCounters(targets);
  }, [report, loading, totalRevenue, grossProfit, netProfit, prefersReduced, animateCounters]);

  return (
    <div ref={rootRef} style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Báo cáo lãi lỗ"
        description={`Báo cáo kết quả kinh doanh Tháng ${month} / ${year} · so sánh với Tháng ${month} / ${year - 1}`}
        action={
          <div className="page-actions">
            <div className="date-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              <CalendarDays size={14} style={{ color: 'var(--brand)' }} />
              <span>Tháng {month} · <strong>{year}</strong></span>
            </div>
            <button className="btn btn--primary" onClick={() => {
              if (!report) return;
              const headers = ['Khoản mục', `Tháng ${month}/${year}`, `Tháng ${month}/${year - 1}`];
              const rows = [
                ['Doanh thu vận tải', transRevenue, transRevenueLY],
                ['Thu nhập khác', otherRevenue, otherRevenueLY],
                ['Tổng doanh thu', totalRevenue, totalRevenueLY],
                ['Nhiên liệu', fuelCost, ''],
                ['Tiền đi đường', roadCost, ''],
                ['Lương lái xe', driverCost, ''],
                ['Tổng chi phí vận hành', totalCosts, totalCostsLY],
                ['Lợi nhuận gộp', grossProfit, grossProfitLY],
                ['Phí quản lý', mgmtFee, mgmtFeeLY],
                ['Lợi nhuận ròng', netProfit, netProfitLY],
              ];
              downloadCSV(`bao-cao-lai-lo-${String(month).padStart(2, '0')}-${String(year).slice(-2)}.csv`, headers, rows);
            }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>
          </div>
        }
      />

      {/* ── KPI Hero Strip ──────────────────────────────────── */}
      <div className="pnl-kpi-strip fade-up-2">
        <div className="pnl-kpi">
          <div className="pnl-kpi__label">Tổng doanh thu</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.revenue = el; }}>{formatNumber(totalRevenue)}</span><span className="pnl-kpi__unit">₫</span></div>
          {prevReport
            ? <div className={`pnl-kpi__delta ${totalRevenue >= totalRevenueLY ? 'pnl-kpi__delta--up' : 'pnl-kpi__delta--down'}`}>{yoyPct(totalRevenue, totalRevenueLY)} so cùng kỳ</div>
            : <div className="pnl-kpi__delta pnl-kpi__delta--neutral">—</div>
          }
        </div>
        <div className="pnl-kpi pnl-kpi--profit">
          <div className="pnl-kpi__label">Lợi nhuận gộp</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.gross = el; }}>{formatNumber(grossProfit)}</span><span className="pnl-kpi__unit">₫</span></div>
          {prevReport
            ? <div className={`pnl-kpi__delta ${grossProfit >= grossProfitLY ? 'pnl-kpi__delta--up' : 'pnl-kpi__delta--down'}`}>{yoyPct(grossProfit, grossProfitLY)} so cùng kỳ</div>
            : <div className="pnl-kpi__delta pnl-kpi__delta--neutral">—</div>
          }
        </div>
        <div className="pnl-kpi">
          <div className="pnl-kpi__label">Biên lợi nhuận gộp</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.margin = el; }}>{marginPct(grossProfit, totalRevenue)}</span><span className="pnl-kpi__unit">%</span></div>
          <div className="pnl-kpi__delta pnl-kpi__delta--neutral"
            title="Chốt sổ: chuyến đã chuyển trạng thái 'Đã khóa' trong kỳ — doanh thu và chi phí được ghi nhận vào sổ kế toán"
          >
            {report?.tripCount ?? '—'} chuyến đã khóa
          </div>
        </div>
        <div className="pnl-kpi pnl-kpi--net">
          <div className="pnl-kpi__label">Lợi nhuận ròng</div>
          <div className="pnl-kpi__value"><span ref={(el) => { kpiRefs.current.net = el; }}>{formatNumber(netProfit)}</span><span className="pnl-kpi__unit">₫</span></div>
          {prevReport
            ? <div className={`pnl-kpi__delta ${netProfit >= netProfitLY ? 'pnl-kpi__delta--up' : 'pnl-kpi__delta--down'}`}>{yoyPct(netProfit, netProfitLY)} so cùng kỳ</div>
            : <div className="pnl-kpi__delta pnl-kpi__delta--neutral">—</div>
          }
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 20px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }} className="fade-up-3 finance-charts-row">
        {/* Revenue trend */}
        <div className="panel" style={{ padding: '16px 20px', flex: '2 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              Xu hướng doanh thu {year}
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--ink-2)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#059669" strokeWidth="2.5" /></svg> Doanh thu
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#34D399" strokeWidth="2" strokeDasharray="4 3" /></svg> LN gộp
              </span>
            </div>
          </div>
          {yearlyLoading ? (
            <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 6 }} />
          ) : revenueChartData.every(d => d['Doanh thu'] === 0 && d['LN gộp'] === 0) ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13, gap: 8 }}>
              <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                <line x1="3" y1="20" x2="21" y2="20"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="10" y1="20" x2="10" y2="8"/>
                <line x1="14" y1="20" x2="14" y2="11"/><line x1="18" y1="20" x2="18" y2="4"/>
              </svg>
              <div>Chưa có chuyến nào được khóa trong năm {year}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Khoá lệnh để xem xu hướng doanh thu hàng tháng</div>
            </div>
          ) : (
            <div className="finance-revenue-chart" style={{ flex: 1, minHeight: 0, width: '100%' }}>
              {(() => {
                const w = 600, h = 300;
                const padL = 50, padR = 20, padT = 10, padB = 28;
                const plotW = w - padL - padR, plotH = h - padT - padB;
                const baseline = padT + plotH;
                const max = Math.max(1, ...revenueChartData.flatMap(d => [d['Doanh thu'] as number, d['LN gộp'] as number]));
                const niceMax = Math.ceil(max / 10_000_000) * 10_000_000;
                const xStep = plotW / 12; // Full year — 12 months
                const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => niceMax * t);
                // Data points for active months only
                const activeData = revenueChartData.filter((_, i) => i + 1 <= month);
                const revPts: [number, number][] = [];
                const gpPts: [number, number][] = [];
                activeData.forEach((d, idx) => {
                  const cx = padL + idx * xStep + xStep / 2;
                  revPts.push([cx, baseline - ((d['Doanh thu'] as number) / niceMax) * plotH]);
                  gpPts.push([cx, baseline - ((d['LN gộp'] as number) / niceMax) * plotH]);
                });
                // Straight-line path helpers
                const toLine = (pts: [number, number][]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x},${y}`).join(' ');
                const toArea = (pts: [number, number][]) => {
                  if (pts.length === 0) return '';
                  return `${toLine(pts)} L ${pts[pts.length - 1][0]},${baseline} L ${pts[0][0]},${baseline} Z`;
                };
                return (
                  <svg className="finance-revenue-svg" width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Xu hướng doanh thu">
                    <defs>
                      <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="gpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    {/* Grid */}
                    {ticks.map((tv, i) => {
                      const y = baseline - (tv / niceMax) * plotH;
                      return (
                        <g key={i}>
                          <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--line)" strokeWidth={0.5} strokeDasharray={i === 0 ? undefined : '3 5'} />
                          <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--ink-3)" fontFamily="var(--font-mono)">{compactNum(tv)}</text>
                        </g>
                      );
                    })}
                    {/* Revenue area + solid line */}
                    {revPts.length >= 2 && (
                      <>
                        <path d={toArea(revPts)} fill="url(#revAreaGrad)" />
                        <path d={toLine(revPts)} fill="none" stroke="#059669" strokeWidth={2.5} strokeLinejoin="round" />
                      </>
                    )}
                    {/* Profit area + dashed line */}
                    {gpPts.length >= 2 && (
                      <>
                        <path d={toArea(gpPts)} fill="url(#gpAreaGrad)" />
                        <path d={toLine(gpPts)} fill="none" stroke="#34D399" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
                      </>
                    )}
                    {/* Revenue data dots */}
                    {revPts.map(([x, y], i) => (
                      <circle key={`r${i}`} cx={x} cy={y} r={i === revPts.length - 1 ? 4.5 : 3} fill="#059669" stroke="white" strokeWidth={2} />
                    ))}
                    {/* Profit data dots */}
                    {gpPts.map(([x, y], i) => (
                      <circle key={`g${i}`} cx={x} cy={y} r={i === gpPts.length - 1 ? 4 : 2.5} fill="#34D399" stroke="white" strokeWidth={2} />
                    ))}
                    {/* Current month highlight line */}
                    {revPts.length > 0 && (() => {
                      const lastX = revPts[revPts.length - 1][0];
                      return <line x1={lastX} y1={padT} x2={lastX} y2={baseline} stroke="#059669" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="4 3" />;
                    })()}
                    {/* X-axis — all 12 months */}
                    {revenueChartData.map((d, i) => {
                      const cx = padL + i * xStep + xStep / 2;
                      const isFuture = i + 1 > month;
                      const isCurrent = i + 1 === month;
                      return (
                        <text key={i} className="finance-chart-xlabel" x={cx} y={h - padB + 16} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fontWeight={isCurrent ? 700 : 400} fill={isFuture ? 'var(--line)' : isCurrent ? 'var(--ink)' : 'var(--ink-3)'}>{d.name as string}</text>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right column: cost pie + top trucks stacked */}
        <div className="panel" style={{ padding: '16px 20px', flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Cost pie */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
              Cơ cấu chi phí {String(month).padStart(2, '0')}/{String(year).slice(-2)}
            </div>
            {loading ? (
              <div style={{ height: 160, background: 'var(--bg-2)', borderRadius: 6 }} />
            ) : costPieData.length > 0 ? (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 20 }}>
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
                      <svg aria-hidden="true" viewBox="0 0 200 200" width={150} height={150} style={{ flexShrink: 0 }} role="img" aria-label="Cơ cấu chi phí">
                        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.fill} stroke="#FFFFFF" strokeWidth={2.5} />)}
                        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-sans)">Tổng chi phí</text>
                        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="14" fontWeight={700} fill="var(--ink)" fontFamily="var(--font-mono)">{compactNum(total)}</text>
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, flex: '1 1 0', minWidth: 0 }}>
                        {arcs.map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, background: a.fill, borderRadius: 2, flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0, color: 'var(--ink-2)' }}>{a.name}</span>
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--ink)' }}>{formatNumber(a.value)}₫</span>
                            <span style={{ color: 'var(--ink-3)', flexShrink: 0, marginLeft: 4 }}>{a.pct.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 13, gap: 8 }}>
                <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                </svg>
                <div>Chưa có dữ liệu chi phí</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Khoá lệnh có chi tiết nhiên liệu/đường để xem cơ cấu</div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ margin: '16px 0', borderTop: '1px solid var(--line)' }} />

          {/* Top trucks */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}>
              Top xe theo lợi nhuận – {String(month).padStart(2, '0')}/{String(year).slice(-2)}
            </div>
            {loading ? (
              <div style={{ height: 80, background: 'var(--bg-2)', borderRadius: 6 }} />
            ) : topTrucks.length === 0 ? (
              <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
                Chưa có xe nào có chuyến đã khóa trong tháng này
              </div>
            ) : (
              (() => {
                const maxProfit = Math.max(...topTrucks.map(t => t['LN gộp']), 1);
                const minProfit = Math.min(...topTrucks.map(t => t['LN gộp']), 0);
                const totalRange = maxProfit - minProfit;
                const svgH = topTrucks.length * 32;
                const plateW = 76;
                const barTrackW = 280 - plateW;
                const zeroX = minProfit < 0 ? plateW + (Math.abs(minProfit) / totalRange) * barTrackW : plateW;
                return (
                  <svg aria-hidden="true" width="100%" height={svgH} viewBox={`0 0 280 ${svgH}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Top xe theo lợi nhuận">
                    {topTrucks.map((t, i) => {
                      const val = t['LN gộp'];
                      const isNegative = val < 0;
                      const w = Math.max(2, (Math.abs(val) / totalRange) * barTrackW);
                      const barX = isNegative ? zeroX - w : zeroX;
                      const fill = isNegative ? 'var(--danger)' : '#059669';
                      return (
                        <g key={i} transform={`translate(0, ${i * 32})`}>
                          <text x={0} y={15} fontSize="10" fontFamily="var(--font-mono)" fontWeight={600} fill="var(--ink-2)">{t.name}</text>
                          <rect x={barX} y={4} width={w} height={14} fill={fill} rx={3} opacity={0.85} />
                          {minProfit < 0 && (
                            <line x1={zeroX} y1={0} x2={zeroX} y2={24} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="2,2" />
                          )}
                          <text x={barX + w + 5} y={15} fontSize="9.5" fill={isNegative ? 'var(--danger)' : 'var(--ink-2)'} fontWeight={isNegative ? 600 : 500}>{formatNumber(val)}₫</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tổng hợp báo cáo tài chính chặng...
        </div>
      ) : (
        <>
          {/* P&L Table with real data */}
          <div className="pnl-table fade-up-3" style={{ marginBottom: 24 }}>
            <div className="pnl-head">
              <div>Khoản mục</div>
              <div className="pnl-head__amount">Tháng {month} / {year}</div>
              <div className="pnl-head__yoy">Tháng {month} / {year - 1}</div>
              <div className="pnl-head__pct">YoY</div>
            </div>

            {/* REVENUE */}
            <div className="pnl-row pnl-row--section">
              <div>Doanh thu</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Doanh thu vận tải
                <div className="pnl-row__label-sub">{report?.tripCount ?? 0} chuyến × giá cước chặng</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(transRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(transRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(transRevenue, transRevenueLY) : ''}`}>{prevReport ? yoyPct(transRevenue, transRevenueLY) : '—'}</div>
            </div>

            {(report?.externalMarginTotal ?? 0) > 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Doanh thu điều xe ngoài
                <div className="pnl-row__label-sub">Lãi quản lý từ {report?.externalTripsCount ?? 0} chuyến ngoài</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(report?.externalMarginTotal ?? 0)}</div>
              <div className="pnl-row__yoy">—</div>
              <div className="pnl-row__pct">—</div>
            </div>
            )}

            {(report?.serviceMarginTotal ?? 0) !== 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Lãi dịch vụ đi kèm
                <div className="pnl-row__label-sub">Lãi từ dịch vụ phụ trợ</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(report?.serviceMarginTotal ?? 0)}</div>
              <div className="pnl-row__yoy">—</div>
              <div className="pnl-row__pct">—</div>
            </div>
            )}

            <div className="pnl-row">
              <div className="pnl-row__label">
                Thu nhập phạt vi phạm
                <div className="pnl-row__label-sub">Phạt vi phạm, điều chỉnh khác</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(otherRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(otherRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(otherRevenue, otherRevenueLY) : ''}`}>{prevReport ? yoyPct(otherRevenue, otherRevenueLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng doanh thu</div>
              <div className="pnl-row__amount">{formatNumber(totalRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(totalRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(totalRevenue, totalRevenueLY) : ''}`}>{prevReport ? yoyPct(totalRevenue, totalRevenueLY) : '—'}</div>
            </div>

            {/* DIRECT COSTS */}
            <div className="pnl-row pnl-row--section">
              <div>Chi phí trực tiếp</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Nhiên liệu
                <div className="pnl-row__label-sub">Dầu DO xe đầu kéo chạy chặng</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(fuelCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Tiền đi đường
                <div className="pnl-row__label-sub">Vé BOT cầu đường &amp; luật đường</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(roadCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Lương lái xe
                <div className="pnl-row__label-sub">Lương cơ bản + khoán chuyến + phụ cấp</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(driverCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            {maintenanceCost > 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Bảo dưỡng &amp; sửa chữa
                <div className="pnl-row__label-sub">Chi phí bảo dưỡng xe đầu kéo</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(maintenanceCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>
            )}

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí vận hành</div>
              <div className="pnl-row__amount">{formatNumber(totalCosts)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(totalCostsLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(totalCosts, totalCostsLY) : ''}`}>{prevReport ? yoyPct(totalCosts, totalCostsLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.06), var(--surface))' }}>
              <div className="pnl-row__label" style={{ color: 'var(--success)', fontWeight: 700 }}>
                Lợi nhuận gộp · Biên {marginPct(grossProfit, totalRevenue)}%
              </div>
              <div className="pnl-row__amount" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatNumber(grossProfit)}</div>
              <div className="pnl-row__yoy" style={{ color: 'var(--success)' }}>{prevReport ? formatNumber(grossProfitLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(grossProfit, grossProfitLY) : ''}`}>{prevReport ? yoyPct(grossProfit, grossProfitLY) : '—'}</div>
            </div>

            {/* OPERATING COSTS */}
            <div className="pnl-row pnl-row--section">
              <div>Chi phí hoạt động</div>
              <div></div><div></div><div></div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Phí quản lý
                <div className="pnl-row__label-sub">Cố định điều hành nội bộ</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(mgmtFee)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(mgmtFeeLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(mgmtFee, mgmtFeeLY) : ''}`}>{prevReport ? yoyPct(mgmtFee, mgmtFeeLY) : '—'}</div>
            </div>

            {companyExpenses > 0 && (
            <div className="pnl-row">
              <div className="pnl-row__label">
                Chi phí công ty
                <div className="pnl-row__label-sub">Bảo hiểm, đăng kiểm, phí cố định khác</div>
              </div>
              <div className="pnl-row__amount">{formatNumber(companyExpenses)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(companyExpensesLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(companyExpenses, companyExpensesLY) : ''}`}>{prevReport ? yoyPct(companyExpenses, companyExpensesLY) : '—'}</div>
            </div>
            )}

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí hoạt động</div>
              <div className="pnl-row__amount">{formatNumber(mgmtFee + companyExpenses)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(mgmtFeeLY + companyExpensesLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(mgmtFee + companyExpenses, mgmtFeeLY + companyExpensesLY) : ''}`}>{prevReport ? yoyPct(mgmtFee + companyExpenses, mgmtFeeLY + companyExpensesLY) : '—'}</div>
            </div>

            {/* FINAL NET PROFIT */}
            <div className="pnl-row pnl-row--final">
              <div className="pnl-row__label" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: 12 }}>
                Lợi nhuận ròng
              </div>
              <div className="pnl-row__amount">{formatNumber(netProfit)} ₫</div>
              <div className="pnl-row__yoy">{prevReport ? formatNumber(netProfitLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(netProfit, netProfitLY) : ''}`}>{prevReport ? yoyPct(netProfit, netProfitLY) : '—'}</div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '14px 0 24px', lineHeight: 1.5 }}>
            * Lợi nhuận ròng kế toán: <strong>{formatNumber(netProfit)} ₫</strong>.
            {activeCapTable.length > 0
              ? <> Sau khi kết chuyển chia cổ đông: {activeCapTable.map((p, i) => <span key={i}>{i > 0 ? ' và ' : ''}<strong>{formatNumber(netProfit * p.pct / 100)} ₫</strong> cho {p.name} ({p.pct}%)</span>)}.</>
              : ' Chưa cấu hình bảng cổ phần.'
            }{' '}
            <Link to='/profit'
              style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}
            >
              Xem chi tiết cổ phần →
            </Link>
          </p>

          {/* Per-truck breakdown — from all active trips */}
          {truckBreakdown.length > 0 && (
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
                    return (
                      <div key={t.id} className="truck-card">
                        <div className="truck-card__header">
                          <span className="truck-card__plate">
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
                          Biên LN {margin}%
                        </div>
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
                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, color: t.id === 0 ? 'var(--fg-3)' : 'var(--fg-1)', fontStyle: t.id === 0 ? 'italic' : 'normal' }}>
                              {t.plate}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Panel>
          )}

          {/* Expense category breakdown */}
          {categoryBreakdown.length > 0 && (
            <Panel
              title="Cơ cấu chi phí theo hạng mục"
              subtitle={`Tổng hợp chi phí ${String(month).padStart(2, '0')}/${String(year).slice(-2)} phân theo loại`}
              style={{ marginTop: 20 }}
              flush
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Hạng mục</th>
                      <th className="num" style={{ width: 200 }}>Tổng chi phí</th>
                      <th style={{ width: 200 }}>Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const grandTotal = categoryBreakdown.reduce((s, c) => s + c.total, 0) || 1;
                      return categoryBreakdown.map((cat, i) => {
                        const pct = (cat.total / grandTotal) * 100;
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{cat.categoryName}</td>
                            <td className="num">{formatNumber(cat.total)} ₫</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'var(--brand)' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', minWidth: 40, textAlign: 'right' }}>
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
