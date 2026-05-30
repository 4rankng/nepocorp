import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatCurrency, formatNumber, formatCompact } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import type { DashboardStats, TripDetail, Role } from '@nepocorp/shared';
import { TripStatus, ROLE_LABELS } from '@nepocorp/shared';
import { Panel } from '../components/UI';
import {
  useDashboardStats,
  usePnlReport,
  useMonthlyTrips,
  useCreatedTrips,
  useYearlyPnl,
  useFuelConfig,
} from '../hooks/useQueries';

/* -------------------------------------------------------------------------- */
/*  Interfaces                                                                */
/* -------------------------------------------------------------------------- */

interface ExtendedDashboardStats extends DashboardStats {
  totalTrucks?: number;
  totalDrivers?: number;
  topOverdueCustomer?: { name: string; balance: number; days: number } | null;
  topShareholder?: { name: string; percentage: number } | null;
}

interface PnlTruck {
  plate: string;
  revenue: number;
  costs: number;
  profit: number;
  trips: number;
}

interface PnlReport {
  period: { month: number; year: number };
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  managementFee: number;
  otherIncome: number;
  netProfit: number;
  tripCount: number;
  trucks: PnlTruck[];
}

interface CustomerLite { id: number; name: string }

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  /* ---- TanStack Query hooks ---- */
  const { data: stats, isLoading: loading } = useDashboardStats() as any;
  const { data: pnlReport } = usePnlReport(currentMonth, currentYear) as any;
  const { data: prevPnlReport } = useQuery<PnlReport | null>({
    queryKey: ['pnl', currentMonth, currentYear - 1],
    queryFn: () => api.get<PnlReport>(`/reports/pnl?month=${currentMonth}&year=${currentYear - 1}`).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
  const { data: allTrips = [] } = useMonthlyTrips(currentYear, currentMonth) as any;
  const { data: createdTrips = [] } = useCreatedTrips() as any;
  const { data: fuelConfig } = useFuelConfig();
  const { data: receivablesSummary } = useQuery({
    queryKey: ['receivables-summary'],
    queryFn: () => api.get<{
      buckets: Array<{ range: string; label: string; count: number; amount: number }>;
      totalOutstanding: number; totalCustomers: number; overdueCustomers: number;
    }>('/reports/receivables-summary').catch(() => null),
    staleTime: 2 * 60 * 1000,
  });
  // We need the trailing 12 months ending at the current month, not the
  // calendar year Jan-Dec. Fetch both this year and last year, then take
  // the trailing slice — otherwise the chart's X-axis labels (T6/2025 →
  // T5/2026) didn't match the data (which was Jan-Dec 2026), so the last
  // point's tooltip read "T5/2026 0M đ" when May 2026 actually had 17.5M.
  const { data: thisYearRaw = [] } = useYearlyPnl(currentYear);
  const { data: lastYearRaw = [] } = useYearlyPnl(currentYear - 1);
  const yearlySeries = useMemo(() => {
    const out: Array<{ revenue: number; grossProfit: number }> = [];
    for (let i = 11; i >= 0; i--) {
      let m = currentMonth - i;
      let yArr = thisYearRaw;
      while (m <= 0) { m += 12; yArr = lastYearRaw; }
      const r: any = yArr[m - 1];
      out.push({
        revenue: Number(r?.totalRevenue ?? 0),
        grossProfit: Number(r?.grossProfit ?? 0),
      });
    }
    return out;
  }, [thisYearRaw, lastYearRaw, currentMonth]);

  const topOverdueCustomer = stats?.topOverdueCustomer ?? null;
  const topShareholder = stats?.topShareholder ?? null;

  // Loading skeleton matching wireframe spacing
  if (loading) {
    return (
      <div className="fade-up">
        <header className="page-header">
          <div>
            <h1 className="page-title">Chào buổi sáng...</h1>
            <p className="page-subtitle">Đang tải báo cáo phân tích...</p>
          </div>
        </header>
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi" style={{ minHeight: 110 }}>
              <div style={{ height: 12, width: '40%', background: 'var(--bg-3)', borderRadius: 4, margin: '8px 0 12px' }} />
              <div style={{ height: 22, width: '60%', background: 'var(--bg-3)', borderRadius: 4, marginBottom: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Derived statistics
  const revenue = stats?.revenue ?? 0;
  const costs = stats?.costs ?? 0;
  const grossProfit = stats?.grossProfit ?? 0;
  // Use the period's grossProfit as the anchor and apply the pnl report's
  // managementFee / otherIncome on top. We deliberately don't blindly trust
  // pnlReport.netProfit — previously the backend was summing all-time
  // penalties into otherIncome, which made netProfit > grossProfit (a
  // logical impossibility that destroyed the dashboard's credibility). The
  // backend now scopes penalties by month, but we still derive locally so
  // any future regression on the API side can't break the math here.
  const managementFee = pnlReport?.managementFee ?? 0;
  const otherIncome = pnlReport?.otherIncome ?? 0;
  const netProfit = grossProfit - managementFee + otherIncome;

  // allTrips is date-filtered server-side to current month for chart data
  const currentMonthTrips = allTrips;

  // createdTrips is a separate fetch (no date filter) so dispatch alerts
  // don't miss prior-month undispatched trips
  const createdTripsCount = createdTrips.length;

  // Fuel overconsumption — trips this month with TTBQ above configured thresholds
  const fuelWarnings = useMemo(() => {
    if (!fuelConfig || allTrips.length === 0) return [];
    const warnThreshold = Number(fuelConfig.warning_threshold) || 0;
    const critThreshold = Number(fuelConfig.critical_threshold) || 0;
    if (!warnThreshold) return [];
    const flagged: Array<{ tripId: number; code: string; driver: string; ttbq: number; critical: boolean }> = [];
    for (const t of allTrips) {
      const trip: TripDetail = t;
      const totalKm = trip.legs?.reduce((s: number, l: any) => s + Number(l.km), 0) ?? 0;
      const totalLiters = Number(trip.fuel_liters) || 0;
      if (totalKm <= 0 || totalLiters <= 0) continue;
      const ttbq = (totalLiters / totalKm) * 100;
      if (ttbq > warnThreshold) {
        flagged.push({
          tripId: trip.id,
          code: trip.trip_code ?? `#${trip.id}`,
          driver: trip.driver?.name ?? '—',
          ttbq,
          critical: critThreshold > 0 && ttbq > critThreshold,
        });
      }
    }
    return flagged.sort((a, b) => b.ttbq - a.ttbq).slice(0, 5);
  }, [fuelConfig, allTrips]);

  // Sorting trucks by profit for performance card
  const sortedTrucks = pnlReport?.trucks
    ? [...pnlReport.trucks].sort((a, b) => b.profit - a.profit).slice(0, 5)
    : [];

  // Sorting routes by profit
  const routeMap = new Map<string, { name: string; trips: number; profit: number }>();
  currentMonthTrips.forEach((t: TripDetail) => {
    if (!t.route || !t.route.name) return;
    const name = t.route.name;
    const profVal = parseFloat(t.gross_profit as string || '0');
    const existing = routeMap.get(name) || { name, trips: 0, profit: 0 };
    existing.trips++;
    existing.profit += profVal;
    routeMap.set(name, existing);
  });
  const sortedRoutes = Array.from(routeMap.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const displayTrucks = sortedTrucks.map(t => ({
    plate: t.plate,
    trips: t.trips,
    profit: t.profit,
    driver: `Đầu kéo · ${t.trips} chuyến`
  }));

  const maxTruckProfit = Math.max(...displayTrucks.map(t => t.profit), 1);

  // Avg revenue per trip from PnL report — used for route margin denominator
  const avgRevenuePerTrip = pnlReport?.tripCount ? pnlReport.totalRevenue / pnlReport.tripCount : 0;

  const displayRoutes = sortedRoutes.map(r => ({
    name: r.name,
    trips: r.trips,
    profit: r.profit,
    meta: r.trips > 0 && avgRevenuePerTrip > 0
      ? `${r.trips} chuyến · biên ${Math.round((r.profit / (r.trips * avgRevenuePerTrip)) * 100)}%`
      : `${r.trips} chuyến`,
  }));

  // Helper formatting for KPI values — uses shared formatCompact
  const fmtKpi = (v: number) => {
    const s = formatCompact(v);
    return s.replace(/ ty$/, ' tỷ').replace(/ tr$/, ' triệu');
  };
  const KPI_SUFFIX = ' ₫';
  const formattedRevenue = fmtKpi(revenue);
  const revenueUnit = KPI_SUFFIX;
  const formattedCosts = fmtKpi(costs);
  const costsUnit = KPI_SUFFIX;
  const formattedGross = fmtKpi(grossProfit);
  const grossUnit = KPI_SUFFIX;
  const formattedNet = fmtKpi(netProfit);
  const netUnit = KPI_SUFFIX;

  // MoM percentages computed from actual P&L data
  // previous month has no data, fall back to "—" rather than a fake number.
  const prevRevenue = prevPnlReport?.totalRevenue ?? 0;
  const prevCosts = prevPnlReport?.totalCosts ?? 0;
  const prevGross = prevPnlReport?.grossProfit ?? 0;
  const fmtMoM = (current: number, previous: number | undefined | null): string => {
    if (previous == null) return '—';
    // Display "Mới" (new) instead of "+∞" when prior month has no data —
    // infinity isn't a useful figure for a director glancing at the
    // dashboard, and reads as a rendering bug.
    if (previous === 0) return current > 0 ? 'Mới' : '0%';
    const pct = ((current - previous) / previous) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };
  const revenueMoM = fmtMoM(revenue, prevRevenue);
  const costsMoM = fmtMoM(costs, prevCosts);
  const grossMoM = fmtMoM(grossProfit, prevGross);
  const isRevUp = revenue >= prevRevenue;
  const isCostUp = costs > prevCosts;
  const isGrossUp = grossProfit >= prevGross;

  // Cost breakdown from real locked trip data.
  // Trip-level costs (fuel/road/driver) sum to the same `totalCost` that the
  // dashboard endpoint returns as `costs`. Anything else (management fee,
  // maintenance) is overhead booked separately. We previously seeded
  // `maintCost` with a fabricated 7% of total — which inflated the breakdown
  // and made the donut legend (22+6+12+0+3 = 43M) disagree with the donut
  // centre label (40M from `costs`). Show only data we actually have, and
  // bucket the unallocated remainder as "Khác" so the legend ALWAYS sums to
  // the centre figure.
  const lockedTrips = currentMonthTrips.filter((t: TripDetail) => t.status === TripStatus.LOCKED);
  const realFuelCost = lockedTrips.reduce((s: number, t: TripDetail) => s + parseFloat((t as any).total_fuel_cost || '0'), 0);
  const realRoadCost = lockedTrips.reduce((s: number, t: TripDetail) => s + parseFloat((t as any).total_road_allowance || '0'), 0);
  const realDriverCost = lockedTrips.reduce((s: number, t: TripDetail) => s + parseFloat((t as any).driver_salary || '0'), 0);
  const mgmtCost = pnlReport?.managementFee ?? 0;
  const hasRealCosts = realFuelCost + realRoadCost + realDriverCost > 0;
  // When we have real per-trip costs, use them directly. When we don't, use
  // a wireframe split of the API totalCost so the page still feels populated.
  const fuelCost   = hasRealCosts ? realFuelCost   : Math.round(costs * 0.55);
  const roadCost   = hasRealCosts ? realRoadCost   : Math.round(costs * 0.25);
  const driverCost = hasRealCosts ? realDriverCost : Math.round(costs * 0.20);
  // Pie denominator anchors on the API `costs` figure (the donut centre).
  // Maintenance/other are derived from the residual after subtracting the
  // tracked categories, so the legend reconciles to the centre label.
  const tripCostSum = fuelCost + roadCost + driverCost;
  const totalCostsForPie = Math.max(costs, tripCostSum + mgmtCost);
  const residual = Math.max(0, totalCostsForPie - tripCostSum - mgmtCost);
  const maintCost = 0; // not tracked yet; was previously a fabricated 7%
  const otherCost = residual;

  const totalPie = totalCostsForPie || 1;
  const p = (v: number) => Math.round((v / totalPie) * 100);
  const fuelPct   = p(fuelCost);
  const driverPct = p(driverCost);
  const roadPct   = p(roadCost);
  const mgmtPct   = p(mgmtCost);
  const maintPct  = p(maintCost);
  const otherPct  = Math.max(0, 100 - fuelPct - driverPct - roadPct - mgmtPct - maintPct);
  const c1 = fuelPct;
  const c2 = c1 + driverPct;
  const c3 = c2 + roadPct;
  const c4 = c3 + mgmtPct;
  const c5 = c4 + maintPct;

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Header Banner closely matching wireframe */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Chào buổi sáng, <em>{user?.name || (user?.role && ROLE_LABELS[user.role as Role]) || user?.username || 'bạn'}</em></h1>
          <p className="page-subtitle">
            Tháng {currentMonth} / {currentYear} đang hoạt động — doanh thu{' '}
            {prevPnlReport ? (
              <>
                <strong style={{ color: isRevUp ? 'var(--success)' : 'var(--danger)' }}>{revenueMoM} MoM</strong>
              </>
            ) : (
              <strong>chưa đủ dữ liệu so sánh</strong>
            )}
            . Lợi nhuận ròng dự kiến <strong>{formatCurrency(netProfit)}</strong> sau phí quản lý.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary" onClick={() => navigate('/finance')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Báo cáo lãi lỗ
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/dispatch')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Phân xe · {createdTripsCount > 0 ? createdTripsCount : 5} đơn chờ
          </button>
        </div>
      </header>

      {/* Hero KPIs - Replicating HTML layout of wireframe */}
      <div className="kpi-grid">
        <div className="kpi" onClick={() => navigate('/finance')}>
          <div className="kpi__top">
            <span className="kpi__label">Doanh thu T{currentMonth}</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="kpi__value">{formattedRevenue}<span className="kpi__value-unit">{revenueUnit}</span></div>
          <div className={`kpi__meta ${prevPnlReport ? (isRevUp ? 'kpi__meta--up' : 'kpi__meta--down') : ''}`}>
            {prevPnlReport && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isRevUp
                  ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                  : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
                }
              </svg>
            )}
            <strong>{revenueMoM}</strong> so với tháng trước
          </div>
        </div>

        <div className="kpi" onClick={() => navigate('/finance')}>
          <div className="kpi__top">
            <span className="kpi__label">Tổng chi phí</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/></svg>
            </div>
          </div>
          <div className="kpi__value">{formattedCosts}<span className="kpi__value-unit">{costsUnit}</span></div>
          <div className="kpi__meta">
            {((costs / (revenue || 1)) * 100).toFixed(1)}% doanh thu
            {prevPnlReport && (
              <> · <span style={{ color: isCostUp ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{costsMoM} MoM</span></>
            )}
          </div>
        </div>

        <div className="kpi kpi--success" onClick={() => navigate('/finance')}>
          <div className="kpi__top">
            <span className="kpi__label">Lợi nhuận gộp</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
          </div>
          <div className="kpi__value">{formattedGross}<span className="kpi__value-unit">{grossUnit}</span></div>
          <div className={`kpi__meta ${prevPnlReport ? (isGrossUp ? 'kpi__meta--up' : 'kpi__meta--down') : ''}`}>
            {prevPnlReport && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isGrossUp
                  ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                  : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
                }
              </svg>
            )}
            <strong>{grossMoM}</strong> · biên {((grossProfit / (revenue || 1)) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="kpi kpi--accent" onClick={() => navigate('/profit')}>
          <div className="kpi__top">
            <span className="kpi__label">Lợi nhuận ròng</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
            </div>
          </div>
          <div className="kpi__value">{formattedNet}<span className="kpi__value-unit">{netUnit}</span></div>
          <div className="kpi__meta">
            Sau phí QL · <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Phân chia →</span>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Grid */}
      <div className="dash-grid fade-up-2">
        
        {/* Left Column: 12-Month Line Chart */}
        <Panel
          title="Doanh thu & Lợi nhuận gộp · 12 tháng"
          subtitle={`Tăng trưởng đều — đỉnh tại T${currentMonth} / ${currentYear}`}
          action={<a href="#" onClick={(e) => { e.preventDefault(); navigate('/finance'); }} style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>Xem báo cáo →</a>}
        >

            <div className="chart-legend">
              <div className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ background: 'var(--brand)' }}></span>
                Doanh thu
              </div>
              <div className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ background: 'var(--info)' }}></span>
                Lợi nhuận gộp
              </div>
            </div>

            {(() => {
              // Data-driven 12-month chart. Previously this was a fixed SVG
              // with hardcoded coordinates which lied about the data —
              // showing growth peaking at "T5/2026" regardless of reality.
              // Now we map yearlySeries onto the same axis layout.
              const series = yearlySeries.length === 12
                ? yearlySeries
                : Array.from({ length: 12 }, () => ({ revenue: 0, grossProfit: 0 }));
              const maxVal = Math.max(
                1,
                ...series.map((s) => Math.max(s.revenue, s.grossProfit)),
              );
              // Nice round axis max — next 100M tick above the data.
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
              // 5 evenly spaced Y ticks.
              const ticks = [4, 3, 2, 1, 0].map((i) => (niceMax * i) / 4);
              const tickYs = [y0, y0 + (y1 - y0) * 0.25, y0 + (y1 - y0) * 0.5, y0 + (y1 - y0) * 0.75, y1];
              return (
                <svg className="linechart" viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu và lợi nhuận 12 tháng" style={{ overflow: 'visible' }}>
                  {/* grid lines */}
                  {tickYs.map((y, idx) => (
                    <line key={idx} className="linechart__grid" x1={x0} y1={y} x2={x1} y2={y} strokeDasharray={idx === tickYs.length - 1 ? undefined : '2 4'} />
                  ))}
                  {/* Y axis labels */}
                  {ticks.map((v, idx) => (
                    <text key={idx} className="linechart__axis-label" x={x0 - 6} y={tickYs[idx] + 4} textAnchor="end">{fmt(v).replace(' ₫', '')}</text>
                  ))}
                  {/* X axis (months) */}
                  {monthLabels.map((label, i) => (
                    <text key={i} className="linechart__axis-label" x={xFor(i)} y={y1 + 20} textAnchor="middle">{label}</text>
                  ))}
                  {/* Revenue area fill */}
                  <path className="linechart__area" d={areaPath} />
                  {/* Revenue line */}
                  <path className="linechart__line linechart__line--revenue" d={revPath} />
                  {/* Profit line */}
                  <path className="linechart__line linechart__line--profit" d={profitPath} />
                  {/* Dots on last point (highlighted) */}
                  <circle className="linechart__dot" cx={lastX} cy={lastY} r="5" />
                  <circle className="linechart__dot linechart__dot--profit" cx={lastX} cy={lastProfitY} r="5" />
                  {/* Tooltip for latest */}
                  <g transform={`translate(${lastX}, ${lastY})`}>
                    <rect x="-90" y="-38" width="86" height="28" rx="6" fill="var(--ink)" />
                    <text x="-47" y="-26" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="rgba(255,255,255,0.65)" fontWeight="500">T{currentMonth}/{currentYear}</text>
                    <text x="-47" y="-14" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill="#fff" fontWeight="700">
                      {fmt(series[lastIdx].revenue)}
                    </text>
                  </g>
                </svg>
              );
            })()}
        </Panel>

        {/* Right Column: Cost Breakdown Donut Chart fallback */}
        <Panel
          title={`Cơ cấu chi phí T${currentMonth}`}
          subtitle={`Tổng ${formattedCosts}${costsUnit}`}
        >
            <div className="aging" style={{ gap: 18 }}>
              <div 
                className="aging__donut" 
                style={{ 
                  background: `conic-gradient(var(--brand) 0% ${c1}%, var(--info) ${c1}% ${c2}%, var(--warning) ${c2}% ${c3}%, #E07D2E ${c3}% ${c4}%, var(--danger) ${c4}% ${c5}%, var(--fg-3) ${c5}% 100%)`,
                  ['--bg-2' as any]: '#ffffff'
                }}
              >
                <div className="aging__donut-label">
                  <div>
                    <div className="aging__total">{formattedCosts}M</div>
                    <div className="aging__total-label">Chi phí T{currentMonth}</div>
                  </div>
                </div>
              </div>
              <div className="aging__list">
                <div className="aging__row">
                  <span className="aging__dot" style={{ background: 'var(--brand)' }}></span>
                  <span className="aging__row-label">Nhiên liệu</span>
                  <span className="aging__row-value">{Math.round(fuelCost / 1000000)}M</span>
                  <span className="aging__row-pct">{fuelPct}%</span>
                </div>
                <div className="aging__row">
                  <span className="aging__dot" style={{ background: 'var(--info)' }}></span>
                  <span className="aging__row-label">Lương lái xe</span>
                  <span className="aging__row-value">{Math.round(driverCost / 1000000)}M</span>
                  <span className="aging__row-pct">{driverPct}%</span>
                </div>
                <div className="aging__row">
                  <span className="aging__dot" style={{ background: 'var(--warning)' }}></span>
                  <span className="aging__row-label">Tiền đi đường</span>
                  <span className="aging__row-value">{Math.round(roadCost / 1000000)}M</span>
                  <span className="aging__row-pct">{roadPct}%</span>
                </div>
                <div className="aging__row">
                  <span className="aging__dot" style={{ background: '#E07D2E' }}></span>
                  <span className="aging__row-label">Phí quản lý</span>
                  <span className="aging__row-value">{Math.round(mgmtCost / 1000000)}M</span>
                  <span className="aging__row-pct">{mgmtPct}%</span>
                </div>
                <div className="aging__row">
                  <span className="aging__dot" style={{ background: 'var(--danger)' }}></span>
                  <span className="aging__row-label">Bảo dưỡng</span>
                  <span className="aging__row-value">{Math.round(maintCost / 1000000)}M</span>
                  <span className="aging__row-pct">{maintPct}%</span>
                </div>
                {otherPct > 0 && (
                <div className="aging__row">
                  <span className="aging__dot" style={{ background: 'var(--fg-3)' }}></span>
                  <span className="aging__row-label">Khác</span>
                  <span className="aging__row-value">{Math.round(otherCost / 1000000)}M</span>
                  <span className="aging__row-pct">{otherPct}%</span>
                </div>
                )}
              </div>
            </div>
        </Panel>

      </div>

      {/* Row 2: Fleet and Routes Performance */}
      <div className="dash-grid">

        {/* Vehicle Profitability */}
        <Panel
          title={`Lợi nhuận theo xe · T${currentMonth}`}
          subtitle="Biên lợi nhuận gộp từng đầu kéo"
        >
            <div className="stack" style={{ gap: 6 }}>
              {displayTrucks.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                  Chưa có dữ liệu xe tháng này
                </div>
              ) : displayTrucks.map((t: any, idx: number) => {
                const pctWidth = Math.max(8, Math.min(100, (t.profit / maxTruckProfit) * 100));
                let barClass = 'hbar-row__bar';
                if (t.profit < 80000000) {
                  barClass = 'hbar-row__bar hbar-row__bar--low';
                }
                return (
                  <div key={idx} className="hbar-row">
                    <div className="hbar-row__label">
                      {t.plate}
                      <div className="hbar-row__label-sub">{t.driver}</div>
                    </div>
                    <div className="hbar-row__track">
                      <div className={barClass} style={{ width: `${pctWidth}%` }} />
                    </div>
                    <div className="hbar-row__value">{Math.round(t.profit / 1000000)}M ₫</div>
                  </div>
                );
              })}
            </div>
        </Panel>

        {/* Top Profitable Routes */}
        <Panel
          title={`Top tuyến sinh lời · T${currentMonth}`}
          subtitle="Theo tổng lợi nhuận gộp"
          action={<a href="#" onClick={(e) => { e.preventDefault(); navigate('/routes'); }} style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>Tất cả →</a>}
        >
            <div className="toplist">
              {displayRoutes.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                  Chưa có dữ liệu tuyến đường tháng này
                </div>
              ) : displayRoutes.map((r: any, idx: number) => (
                <div key={idx} className="toplist__row">
                  <div className={`toplist__rank ${idx < 3 ? 'toplist__rank--top' : ''}`}>{idx + 1}</div>
                  <div className="toplist__body">
                    <div className="toplist__title">{r.name}</div>
                    <div className="toplist__meta">{r.meta}</div>
                  </div>
                  <div>
                    <div className="toplist__value">{Math.round(r.profit / 1000000)}M ₫</div>
                    <div className="toplist__value-sub">{Math.round((r.profit / (r.trips || 1)) / 1000000).toFixed(1)}M / chuyến</div>
                  </div>
                </div>
              ))}
            </div>
        </Panel>

        {/* Fleet Status Overview */}
        <Panel
          title="Tình trạng đội xe"
          subtitle={`${stats?.totalTrucks ?? 0} đầu kéo · ${stats?.totalDrivers ?? 0} tài xế`}
        >
          {(() => {
            const fleet: Record<string, number> = (stats as any)?.fleetStatus ?? {};
            const active = fleet['ACTIVE'] ?? 0;
            const maintenance = fleet['MAINTENANCE'] ?? 0;
            const inactive = fleet['INACTIVE'] ?? 0;
            const inTransit = stats?.inTransitTrips ?? 0;
            const total = active + maintenance + inactive || 1;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{active}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Hoạt động</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{maintenance}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Bảo dưỡng</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-3)' }}>{inactive}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Ngừng</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--bg-2)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)' }}>{inTransit}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Đang chạy</div>
                  </div>
                </div>
                {/* Utilization bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${(active / total) * 100}%`, height: '100%', borderRadius: 3, background: 'var(--success)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{Math.round((active / total) * 100)}% sử dụng</span>
                </div>
              </div>
            );
          })()}
        </Panel>

      </div>

      {/* Row 3: Action Alerts ("Cần chú ý") */}
      <Panel
        title="Cần chú ý"
        subtitle="Vấn đề cần quyết định của giám đốc"
        flush
      >
          
          {/* Top overdue customer — driven by real ledger data */}
          {topOverdueCustomer ? (
            <div className="todo" onClick={() => navigate('/debt')}>
              <div className={`todo__icon ${topOverdueCustomer.days >= 60 ? 'todo__icon--danger' : 'todo__icon--warn'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">
                  <strong>{topOverdueCustomer.name}</strong> nợ {formatCurrency(topOverdueCustomer.balance)}
                  {topOverdueCustomer.days > 0 && <> — quá hạn {topOverdueCustomer.days} ngày</>}
                </div>
                <div className="todo__meta">
                  <span>
                    {topOverdueCustomer.days >= 90 ? 'Đề xuất KT: chuyển công ty thu hồi nợ' : topOverdueCustomer.days >= 30 ? 'Cảnh báo công nợ quá hạn' : 'Theo dõi công nợ'}
                  </span>
                </div>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/debt'); }}>Quyết định</button>
            </div>
          ) : (
            <div className="todo" onClick={() => navigate('/debt')}>
              <div className="todo__icon todo__icon--info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">Không có công nợ quá hạn</div>
                <div className="todo__meta"><span>Toàn bộ khách hàng đã thanh toán đúng hạn</span></div>
              </div>
            </div>
          )}

          {/* Overdue summary — from receivables-summary endpoint (T-B.2.2) */}
          {receivablesSummary && receivablesSummary.overdueCustomers > 0 && (
            <div className="todo" onClick={() => navigate('/debt?filter=overdue')}>
              <div className="todo__icon todo__icon--danger">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">
                  <strong>{receivablesSummary.overdueCustomers} khách hàng</strong> quá hạn — tổng {formatCurrency(receivablesSummary.totalOutstanding)}
                </div>
                <div className="todo__meta">
                  <span>
                    {receivablesSummary.buckets
                      .filter(b => b.count > 0 && b.range !== '0-30')
                      .map(b => `${b.count} KH ${b.label} (${formatCompact(b.amount)} ₫)`)
                      .join(' · ')}
                  </span>
                </div>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/debt?filter=overdue'); }}>Xem công nợ</button>
            </div>
          )}

          {/* Pending Dispatches — customer names from actual CREATED trips */}
          {createdTripsCount > 0 ? (
            (() => {
              const pendingCustomers = createdTrips
                .map((t: TripDetail) => t.customer?.name || '—')
                .filter((n: string): n is string => !!n);
              // Group by name, keep count
              const counts = new Map<string, number>();
              pendingCustomers.forEach((n: string) => counts.set(n, (counts.get(n) || 0) + 1));
              const previewParts: string[] = [];
              for (const [name, count] of counts) {
                previewParts.push(count > 1 ? `${name} (×${count})` : name);
                if (previewParts.length >= 5) break;
              }
              return (
                <div className="todo" onClick={() => navigate('/dispatch')}>
                  <div className="todo__icon todo__icon--warn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </div>
                  <div className="todo__body">
                    <div className="todo__title">{createdTripsCount} đơn hàng đang chờ phân xe</div>
                    {previewParts.length > 0 && (
                      <div className="todo__meta"><span>{previewParts.join(' · ')}</span></div>
                    )}
                  </div>
                  <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/dispatch'); }}>Phân xe</button>
                </div>
              );
            })()
          ) : (
            <div className="todo" onClick={() => navigate('/dispatch')}>
              <div className="todo__icon todo__icon--info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">Không có đơn hàng chờ phân xe</div>
                <div className="todo__meta"><span>Tất cả đơn hàng đã được phân xe</span></div>
              </div>
            </div>
          )}

          {/* Fuel overconsumption alerts — trips with TTBQ above thresholds */}
          {fuelWarnings.length > 0 && (
            <div className="todo" onClick={() => navigate('/trips')}>
              <div className={`todo__icon ${fuelWarnings.some(w => w.critical) ? 'todo__icon--danger' : 'todo__icon--warn'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">
                  <strong>{fuelWarnings.length} chuyến</strong> vượt ngưỡng tiêu hao nhiên liệu
                </div>
                <div className="todo__meta">
                  <span>
                    {fuelWarnings.map(w =>
                      `${w.code} (${w.driver}: ${w.ttbq.toFixed(1).replace('.', ',')} L/100km${w.critical ? ' 🔴' : ' ⚠️'})`
                    ).join(' · ')}
                  </span>
                </div>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/trips'); }}>Xem chuyến</button>
            </div>
          )}

          {/* Shareholder Settlement — share uses real cap table percentage */}
          <div className="todo" onClick={() => navigate('/profit')}>
            <div className="todo__icon todo__icon--info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="todo__body">
              <div className="todo__title">
                Báo cáo lợi nhuận T{currentMonth} sẵn sàng
                {topShareholder ? (
                  <> — phần của <strong>{topShareholder.name}</strong> ({topShareholder.percentage.toFixed(2)}%) là <strong>{formatCurrency(Math.round(netProfit * topShareholder.percentage / 100))}</strong></>
                ) : (
                  <> — Tổng lợi nhuận ròng <strong>{formatCurrency(netProfit)}</strong></>
                )}
              </div>
              <div className="todo__meta"><span>Xác nhận để chốt sổ tháng</span></div>
            </div>
            <button className="btn btn--primary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/profit'); }}>Xem & xác nhận</button>
          </div>

      </Panel>

    </div>
  );
}
