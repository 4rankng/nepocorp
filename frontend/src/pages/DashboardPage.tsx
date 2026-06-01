import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatCurrency, formatNumber, formatCompact } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import type { DashboardStats, TripDetail, CapTableHistory, Role } from '@nepocorp/shared';
import { TripStatus, ROLE_LABELS, parseThreshold } from '@nepocorp/shared';
import { Panel, KPI } from '../components/UI';
import { SkeletonLine, SkeletonKPIs } from '../components/shared/Skeleton';
import {
  useDashboardStats,
  usePnlReport,
  useMonthlyTrips,
  useCreatedTrips,
  useYearlyPnl,
  useFuelConfig,
  useRenewalReminders,
  type PnlReport,
  type ExtendedDashboardStats,
} from '../hooks/useQueries';

/* -------------------------------------------------------------------------- */
/*  Interfaces                                                                */
/* -------------------------------------------------------------------------- */

interface CustomerLite { id: number; name: string }

const EMPTY_TRIPS: TripDetail[] = [];
const EMPTY_CREATED: TripDetail[] = [];
const EMPTY_YEARLY: (PnlReport | null)[] = [];

const CATEGORY_COLORS: Record<string, string> = {
  'Sửa chữa': '#8B5CF6',
  'Phụ tùng': '#F59E0B',
  'Vật tư': '#6366F1',
  'Bảo hiểm': '#06B6D4',
  'Đăng kiểm': '#10B981',
  'Phí đường bộ': '#EC4899',
};
const FALLBACK_COLORS = ['#8B5CF6', '#F59E0B', '#06B6D4', '#10B981', '#EC4899', '#6366F1'];

/* -------------------------------------------------------------------------- */
/*  Extracted static styles                                                   */
/* -------------------------------------------------------------------------- */

const styles = {
  thinBar: { height: 4 },
  sectionPadding: { paddingBottom: 40 },
  brandSwatch: { background: 'var(--brand)' },
  infoSwatch: { background: 'var(--info)' },
  chartOverflow: { overflow: 'visible' },
  gap18: { gap: 18 },
  gap6: { gap: 6 },
  noDataMsg: { padding: '24px 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 },
  smallUnit: { fontSize: '0.75em', opacity: 0.7 },
  smallUnitLg: { fontSize: '0.8em', opacity: 0.7 },
  linkAction: { fontSize: 12, color: 'var(--brand)', fontWeight: 600 },
  brandBold: { color: 'var(--brand)', fontWeight: 600 },
  bold: { fontWeight: 600 },
  fullWidth: { gridColumn: '1 / -1' },
  mb16: { marginBottom: 16 },
  fleetGrid: { gridTemplateColumns: 'repeat(2, 1fr)' },
  utilBar: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 },
  utilTrack: { flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' },
  utilFill: { height: '100%', borderRadius: 3, background: 'var(--success)' },
  utilLabel: { fontSize: 11, color: 'var(--fg-3)' },
} as const;

/* -------------------------------------------------------------------------- */
/*  Extracted memoized components                                             */
/* -------------------------------------------------------------------------- */

const MonthlyChart = React.memo(function MonthlyChart({
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

const FleetStatusCards = React.memo(function FleetStatusCards({
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

const PendingDispatchAlert = React.memo(function PendingDispatchAlert({
  createdTrips,
  createdTripsCount,
  navigate,
}: {
  createdTrips: TripDetail[];
  createdTripsCount: number;
  navigate: (path: string) => void;
}) {
  const pendingCustomers = createdTrips
    .map((t: TripDetail) => t.customer?.name || '—')
    .filter((n: string): n is string => !!n);
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
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
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
});

/* -------------------------------------------------------------------------- */
/*  Main Dashboard Page                                                       */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  /* ---- TanStack Query hooks ---- */
  const { data: stats, isLoading: loading } = useDashboardStats();
  const { data: pnlReport } = usePnlReport(currentMonth, currentYear);
  const { data: prevPnlReport } = usePnlReport(currentMonth, currentYear - 1);
  const { data: allTrips = EMPTY_TRIPS } = useMonthlyTrips(currentYear, currentMonth);
  const { data: createdTrips = EMPTY_CREATED } = useCreatedTrips();
  const { data: fuelConfig } = useFuelConfig();
  const { data: renewalReminders = [] } = useRenewalReminders();
  const { data: receivablesSummary } = useQuery({
    queryKey: ['receivables-summary'],
    queryFn: () => api.get<{
      buckets: Array<{ range: string; label: string; count: number; amount: number }>;
      totalOutstanding: number; totalCustomers: number; overdueCustomers: number;
    }>('/reports/receivables-summary').catch(() => null),
    staleTime: 2 * 60 * 1000,
  });
  const { data: thisYearRaw = EMPTY_YEARLY } = useYearlyPnl(currentYear);
  const { data: lastYearRaw = EMPTY_YEARLY } = useYearlyPnl(currentYear - 1);
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

  const fuelWarnings = useMemo(() => {
    if (!fuelConfig || allTrips.length === 0) return [];
    const warnThreshold = parseThreshold(fuelConfig.warningThreshold, 0);
    const critThreshold = parseThreshold(fuelConfig.criticalThreshold, 0);
    if (!warnThreshold) return [];
    const flagged: Array<{ tripId: number; code: string; driver: string; ttbq: number; critical: boolean }> = [];
    for (const t of allTrips) {
      const trip: TripDetail = t;
      const totalKm = trip.legs?.reduce((s: number, l: any) => s + Number(l.km), 0) ?? 0;
      const totalLiters = Number(trip.fuelLiters) || 0;
      if (totalKm <= 0 || totalLiters <= 0) continue;
      const ttbq = (totalLiters / totalKm) * 100;
      if (ttbq > warnThreshold) {
        flagged.push({
          tripId: trip.id,
          code: trip.tripCode ?? `#${trip.id}`,
          driver: trip.driver?.name ?? '—',
          ttbq,
          critical: critThreshold > 0 && ttbq > critThreshold,
        });
      }
    }
    return flagged.sort((a, b) => b.ttbq - a.ttbq).slice(0, 5);
  }, [fuelConfig, allTrips]);

  const derived = useMemo(() => {
    if (!stats) return null;

    const revenue = stats.revenue ?? 0;
    const costs = stats.costs ?? 0;
    const grossProfit = stats.grossProfit ?? 0;
    const managementFee = pnlReport?.managementFee ?? 0;
    const otherIncome = pnlReport?.otherIncome ?? 0;
    // Prefer the fully-computed netProfit from the PnL report (accounts for maintenance
    // and company-level expenses). Fall back to the simpler estimate when the PnL report
    // hasn't loaded yet.
    const netProfit = pnlReport?.netProfit ?? (grossProfit - managementFee + otherIncome);

    const sortedTrucks = pnlReport?.trucks
      ? [...pnlReport.trucks].sort((a, b) => b.profit - a.profit).slice(0, 5)
      : [];

    const routeMap = new Map<string, { name: string; trips: number; profit: number }>();
    allTrips.forEach((t: TripDetail) => {
      if (!t.route || !t.route.name) return;
      if (t.status !== 'LOCKED') return;
      const name = t.route.name;
      const profVal = parseFloat(t.grossProfit as string || '0');
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

    const avgRevenuePerTrip = pnlReport?.tripCount ? pnlReport.totalRevenue / pnlReport.tripCount : 0;

    const displayRoutes = sortedRoutes.map(r => ({
      name: r.name,
      trips: r.trips,
      profit: r.profit,
      meta: r.trips > 0 && avgRevenuePerTrip > 0
        ? `${r.trips} chuyến · biên ${Math.round((r.profit / (r.trips * avgRevenuePerTrip)) * 100)}%`
        : `${r.trips} chuyến`,
    }));

    const lockedTrips = allTrips.filter((t: TripDetail) => t.status === TripStatus.LOCKED);
    const realFuelCost = lockedTrips.reduce((s: number, t: TripDetail) => s + parseFloat((t as any).totalFuelCost || '0'), 0);
    const realRoadCost = lockedTrips.reduce((s: number, t: TripDetail) => s + parseFloat((t as any).totalRoadAllowance || '0'), 0);
    const realDriverCost = lockedTrips.reduce((s: number, t: TripDetail) => s + parseFloat((t as any).driverSalary || '0'), 0);
    const mgmtCost = pnlReport?.managementFee ?? 0;
    const hasRealCosts = realFuelCost + realRoadCost + realDriverCost > 0;
    const fuelCost   = hasRealCosts ? realFuelCost   : Math.round(costs * 0.55);
    const roadCost   = hasRealCosts ? realRoadCost   : Math.round(costs * 0.25);
    const driverCost = hasRealCosts ? realDriverCost  : Math.round(costs * 0.20);

    let fallbackIdx = 0;

    const pieSlices: Array<{ label: string; value: number; color: string }> = [
      { label: 'Nhiên liệu', value: fuelCost, color: 'var(--brand)' },
      { label: 'Lương lái xe', value: driverCost, color: 'var(--info)' },
      { label: 'Tiền đi đường', value: roadCost, color: 'var(--warning)' },
      { label: 'Phí quản lý', value: mgmtCost, color: '#E07D2E' },
    ];

    const categoryBreakdown = pnlReport?.categoryBreakdown ?? [];
    for (const cat of categoryBreakdown) {
      const amount = parseFloat(cat.total) || 0;
      if (amount > 0.5) {
        const color = CATEGORY_COLORS[cat.categoryName] ?? FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length];
        pieSlices.push({ label: cat.categoryName, value: amount, color });
      }
    }

    const visibleSlices = pieSlices.filter(sl => sl.value > 0.5);

    const totalPie = visibleSlices.reduce((s, sl) => s + sl.value, 0) || 1;
    const p = (v: number) => Math.round((v / totalPie) * 100);
    let usedPct = 0;
    const slicesWithPct = visibleSlices.map((sl, i) => {
      const pct = i === visibleSlices.length - 1 ? Math.max(0, 100 - usedPct) : p(sl.value);
      usedPct += pct;
      return { ...sl, pct };
    });

    let cumPct = 0;
    const gradientStops = slicesWithPct.map(sl => {
      const start = cumPct;
      cumPct += sl.pct;
      return `${sl.color} ${start}% ${cumPct}%`;
    });
    const conicGradient = `conic-gradient(${gradientStops.join(', ')})`;

    const prevRevenue = prevPnlReport?.totalRevenue ?? 0;
    const prevCosts = prevPnlReport?.totalCosts ?? 0;
    const prevGross = prevPnlReport?.grossProfit ?? 0;

    return {
      revenue, costs, grossProfit, netProfit,
      displayTrucks, maxTruckProfit, displayRoutes,
      fuelCost, roadCost, driverCost, mgmtCost,
      slicesWithPct, conicGradient, totalPie,
      prevRevenue, prevCosts, prevGross,
    };
  }, [stats, pnlReport, prevPnlReport, allTrips]);

  if (loading) {
    return (
      <div className="fade-up">
        <header className="page-header">
          <div>
            <SkeletonLine width="180px" />
            <div style={styles.thinBar} />
            <SkeletonLine width="260px" />
          </div>
        </header>
        <SkeletonKPIs count={4} />
      </div>
    );
  }

  const {
    revenue = 0, costs = 0, grossProfit = 0, netProfit = 0,
    displayTrucks = [], maxTruckProfit = 1, displayRoutes = [],
    fuelCost = 0, roadCost = 0, driverCost = 0, mgmtCost = 0,
    slicesWithPct = [], conicGradient = 'conic-gradient(var(--fg-3) 0% 100%)', totalPie = 1,
    prevRevenue = 0, prevCosts = 0, prevGross = 0,
  } = derived ?? {};

  const createdTripsCount = createdTrips.length;

  const fmtKpi = (v: number) => formatCompact(v);
  const splitKpi = (v: number): { num: string; suffix: string } => {
    const s = fmtKpi(v);
    if (s.endsWith('k')) return { num: s.slice(0, -1), suffix: 'k' };
    const i = s.lastIndexOf(' ');
    if (i === -1) return { num: s, suffix: '' };
    return { num: s.slice(0, i), suffix: s.slice(i + 1) };
  };
  const formattedRevenue = fmtKpi(revenue);
  const formattedCosts = fmtKpi(costs);
  const formattedTotalPie = fmtKpi(totalPie);
  const formattedGross = fmtKpi(grossProfit);
  const formattedNet = fmtKpi(netProfit);
  const kpiRevenue = splitKpi(revenue);
  const kpiCosts = splitKpi(costs);
  const kpiGross = splitKpi(grossProfit);
  const kpiNet = splitKpi(netProfit);

  const fmtMoM = (current: number, previous: number | undefined | null): string => {
    if (previous == null) return '—';
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

  return (
    <div className="fade-up" style={styles.sectionPadding}>
      {/* Header Banner closely matching wireframe */}
      <header className="page-header">
        <div>
          <h1 className="page-title">{(() => { const h = new Date().getHours(); return h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; })()}, <em>{user?.fullName || (user?.role && ROLE_LABELS[user.role as Role]) || user?.username || 'bạn'}</em></h1>
          <p className="page-subtitle">
            Tháng {currentMonth} / {currentYear} đang hoạt động — doanh thu{' '}
            {prevPnlReport ? (
              <>
                <strong style={{ color: isRevUp ? 'var(--success)' : 'var(--danger)' }}>{revenueMoM} so với tháng trước</strong>
              </>
            ) : (
              <strong>chưa đủ dữ liệu so sánh</strong>
            )}
            . Lợi nhuận ròng dự kiến <strong>{fmtKpi(netProfit)} ₫</strong> sau phí quản lý.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary" onClick={() => navigate('/finance')}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Báo cáo lãi lỗ
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/dispatch')}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Phân xe{createdTripsCount > 0 ? ` · ${createdTripsCount} đơn chờ` : ''}
          </button>
        </div>
      </header>

      {/* Hero KPIs - Replicating HTML layout of wireframe */}
      <div className="kpi-grid">
        <div className="kpi" onClick={() => navigate('/finance')}>
          <div className="kpi__top">
            <span className="kpi__label">Doanh thu {String(currentMonth).padStart(2, '0')}/{currentYear}</span>
          </div>
          <div className="kpi__value">{kpiRevenue.num}<span className="kpi__value-unit">{kpiRevenue.suffix && ` ${kpiRevenue.suffix}`} ₫</span></div>
          <div className={`kpi__meta ${prevPnlReport ? (isRevUp ? 'kpi__meta--up' : 'kpi__meta--down') : ''}`}>
            {(stats?.lockedTrips ?? 0) > 0 && <><strong>{stats?.lockedTrips}</strong> chuyến ĐÃ CHỐT · </>}
            {prevPnlReport && (
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isRevUp
                  ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                  : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
                }
              </svg>
            )}
            <strong>{revenueMoM}</strong> so với tháng trước
          </div>
          <div className="kpi__watermark" aria-hidden="true">
            <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>

        <div className="kpi" onClick={() => navigate('/finance')}>
          <div className="kpi__top">
            <span className="kpi__label">Tổng chi phí</span>
          </div>
          <div className="kpi__value">{kpiCosts.num}<span className="kpi__value-unit">{kpiCosts.suffix && ` ${kpiCosts.suffix}`} ₫</span></div>
          <div className="kpi__meta">
            {((costs / (revenue || 1)) * 100).toFixed(1)}% doanh thu
            {prevPnlReport && (
              <> · <span style={{ color: isCostUp ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{costsMoM} so với tháng trước</span></>
            )}
          </div>
          <div className="kpi__watermark" aria-hidden="true">
            <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/></svg>
          </div>
        </div>

        <div className="kpi kpi--success" onClick={() => navigate('/finance')}>
          <div className="kpi__top">
            <span className="kpi__label">Lợi nhuận gộp</span>
          </div>
          <div className="kpi__value">{kpiGross.num}<span className="kpi__value-unit">{kpiGross.suffix && ` ${kpiGross.suffix}`} ₫</span></div>
          <div className={`kpi__meta ${prevPnlReport ? (isGrossUp ? 'kpi__meta--up' : 'kpi__meta--down') : ''}`}>
            {prevPnlReport && (
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isGrossUp
                  ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                  : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
                }
              </svg>
            )}
            <strong>{grossMoM}</strong> · biên {((grossProfit / (revenue || 1)) * 100).toFixed(1)}%
          </div>
          <div className="kpi__watermark" aria-hidden="true">
            <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>

        <div className="kpi kpi--accent" onClick={() => navigate('/profit')}>
          <div className="kpi__top">
            <span className="kpi__label">Lợi nhuận ròng</span>
          </div>
          <div className="kpi__value">{kpiNet.num}<span className="kpi__value-unit">{kpiNet.suffix && ` ${kpiNet.suffix}`} ₫</span></div>
          <div className="kpi__meta">
            Sau phí QL · <span style={styles.brandBold}>Phân chia →</span>
          </div>
          <div className="kpi__watermark" aria-hidden="true">
            <svg aria-hidden="true" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Grid */}
      <div className="dash-grid fade-up-2">
        
        {/* Left Column: 12-Month Line Chart */}
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

        {/* Right Column: Cost Breakdown Donut Chart fallback */}
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
                    <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                      <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                    </svg>
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
                    {/* Use formatCompact so 500k renders as "500k" not rounded
                        up to "1 tr" — Math.round(0.5) was producing "1tr" for
                        any value < 1M, which contradicted the chart total. */}
                    <span className="aging__row-value">{formatCompact(sl.value)}</span>
                    <span className="aging__row-pct">{sl.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            )}
        </Panel>

      </div>

      {/* Row 2: Fleet and Routes Performance */}
      <div className="dash-grid">

        {/* Vehicle Profitability */}
        <Panel
          title={`Lợi nhuận theo xe · ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
          subtitle="Biên lợi nhuận gộp từng đầu kéo"
        >
            <div className="stack" style={styles.gap6}>
              {displayTrucks.length === 0 ? (
                <div style={{ ...styles.noDataMsg, flexDirection: 'column', gap: 6 }}>
                  <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                    <rect x="1" y="3" width="15" height="13" rx="2"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
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
                    <div className="hbar-row__value">{Math.round(t.profit / 1000000)}<small style={styles.smallUnit}>tr ₫</small></div>
                  </div>
                );
              })}
            </div>
        </Panel>

        {/* Top Profitable Routes */}
        <Panel
          title={`Top tuyến sinh lời · ${String(currentMonth).padStart(2, '0')}/${currentYear}`}
          subtitle="Theo tổng lợi nhuận gộp"
          action={<Link to='/routes' style={styles.linkAction}>Tất cả →</Link>}
        >
            <div className="toplist">
              {displayRoutes.length === 0 ? (
                <div style={{ ...styles.noDataMsg, flexDirection: 'column', gap: 6 }}>
                  <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
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
                    <div className="toplist__value">{Math.round(r.profit / 1000000)}<small style={styles.smallUnit}>tr ₫</small></div>
                    <div className="toplist__value-sub">{Math.round((r.profit / (r.trips || 1)) / 1000000).toFixed(1)}<small style={styles.smallUnitLg}>tr</small> / chuyến</div>
                  </div>
                </div>
              ))}
            </div>
        </Panel>

        {/* Fleet Status Overview */}
        <Panel
          title="Tình trạng đội xe"
          subtitle={stats?.totalDrivers
            ? `${stats?.totalTrucks ?? 0} đầu kéo · ${stats.totalDrivers} tài xế`
            : `${stats?.totalTrucks ?? 0} đầu kéo · chưa đăng ký tài xế`}
          style={styles.fullWidth}
        >
          <FleetStatusCards fleetStatus={stats?.fleetStatus} inTransitTrips={stats?.inTransitTrips} />
        </Panel>

      </div>

      {/* Renewal Reminders Panel */}
      {renewalReminders.length > 0 && (
        <Panel
          title="Nhắc gia hạn"
          subtitle={`${renewalReminders.length} hạng mục sắp hoặc đã quá hạn`}
          style={styles.mb16}
          flush
        >
          {/* Fixed table layout with explicit column widths so the "Còn lại"
              status column doesn't get clipped to "Còn" + "15 ngà".
              Global `table { min-width: 900px }` was forcing the table wider
              than this panel, so we override with minWidth: 0. */}
          <table style={{ width: '100%', minWidth: 0, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
              <thead>
                <tr>
                  <th>Phương tiện</th>
                  <th>Hạng mục</th>
                  <th className="num">Hạn hiệu lực</th>
                  <th className="num">Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {renewalReminders.map((r) => {
                  const isOverdue = r.daysRemaining < 0;
                  const isWarning = !isOverdue && r.daysRemaining <= (r.reminderLeadDays || 30);
                  return (
                    <tr key={r.id}>
                      <td style={styles.bold}>{r.truckPlate || '—'}</td>
                      <td>{r.categoryName}</td>
                      <td className="num">{new Date(r.validTo).toLocaleDateString('vi-VN')}</td>
                      <td className="num">
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 600,
                          background: isOverdue ? 'var(--danger-soft, #fef2f2)' : isWarning ? '#fef9c3' : 'transparent',
                          color: isOverdue ? 'var(--danger)' : isWarning ? '#a16207' : 'var(--fg-2)',
                        }}>
                          {isOverdue ? `Quá hạn ${Math.abs(r.daysRemaining)} ngày` : `${r.daysRemaining} ngày`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </Panel>
      )}

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
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
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
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
            <PendingDispatchAlert createdTrips={createdTrips} createdTripsCount={createdTripsCount} navigate={navigate} />
          ) : (
            <div className="todo" onClick={() => navigate('/dispatch')}>
              <div className="todo__icon todo__icon--info">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>
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
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
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

          {/* Renewal reminders — expenses approaching or past validTo date */}
          {renewalReminders.length > 0 ? (
            <div className="todo" onClick={() => navigate('/expenses')}>
              <div className={`todo__icon ${renewalReminders.some(r => r.daysRemaining < 0) ? 'todo__icon--danger' : 'todo__icon--warn'}`}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">
                  <strong>{renewalReminders.length} hạng mục</strong> sắp hoặc đã quá hạn gia hạn
                </div>
                <div className="todo__meta">
                  <span>
                    {renewalReminders.slice(0, 3).map(r =>
                      `${r.truckPlate || 'Công ty'} · ${r.categoryName}: ${r.daysRemaining < 0 ? `Quá hạn ${Math.abs(r.daysRemaining)} ngày` : `Còn ${r.daysRemaining} ngày`}`
                    ).join(' · ')}
                    {renewalReminders.length > 3 && ` · +${renewalReminders.length - 3} khác`}
                  </span>
                </div>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/expenses'); }}>Xem chi phí</button>
            </div>
          ) : (
            <div className="todo" onClick={() => navigate('/expenses')}>
              <div className="todo__icon todo__icon--info">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="todo__body">
                <div className="todo__title">Không có hạng mục cần gia hạn</div>
                <div className="todo__meta"><span>Bảo hiểm, đăng kiểm, phí đường bộ</span></div>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); navigate('/expenses'); }}>Xem chi phí</button>
            </div>
          )}

          {/* Shareholder Settlement — share uses real cap table percentage */}
          <div className="todo" onClick={() => navigate('/profit')}>
            <div className="todo__icon todo__icon--info">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="todo__body">
              <div className="todo__title">
                Báo cáo lợi nhuận {String(currentMonth).padStart(2, '0')}/{currentYear} sẵn sàng
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
