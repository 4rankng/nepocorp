import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Download, Truck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { DashboardDecisionItem, Role, TripDetail } from '@tingting/shared';
import { isFinancialRole, ROLE_LABELS } from '@tingting/shared';
import { SkeletonLine, SkeletonKPIs } from '../components/shared/Skeleton';
import { Banner } from '../components/shared/Banner';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { styles, fmtMoM } from '../features/dashboard/utils';
import { useMonth } from '../hooks/useMonth';
import { AuditLogWidget } from '../features/dashboard/components/AuditLogWidget';
import { ApprovalQueueCard } from '../features/dashboard/components/ApprovalQueueCard';
import { useApprovalQueue, canSeeApprovalQueue } from '../features/dashboard/hooks/useApprovalQueue';
import { useDashboardAnimations } from '../features/dashboard/hooks/useDashboardAnimations';
import './DashboardPage.css';
import { greeting, runningSum, type CostBreakdownItem } from '../features/dashboard/components/dashboard-presenters';
import { DashboardKpiRow } from '../features/dashboard/components/DashboardKpiRow';
import { AttentionBoard } from '../features/dashboard/components/AttentionBoard';
import {
  CostCompositionCard,
  FleetStatusCard,
  ProfitByTruckCard,
  RevenueChartCard,
  TopRoutesCard,
} from '../features/dashboard/components/DashboardPanels';
import { VehicleScheduleBanner } from '../features/fleet/schedules/VehicleScheduleBanner';
import { useActiveVehicleSchedules } from '../hooks/useVehicleSchedules';

/**
 * Dashboard — wireframe redesign per /wireframe/nepo-dashboard.html.
 *
 * Layout (1.62fr / 1fr split on ≥1180px, single column below):
 *   • Page head (greeting + summary + 2 actions)
 *   • 4 KPI cards (revenue / total cost / gross / net) with mom delta pills
 *   • Main grid:
 *       left  → Doanh thu & Lợi nhuận gộp chart (12 months) + sub2 (top trucks + top routes)
 *       right → Tình trạng đội xe + Cơ cấu chi phí donut + Cần chú ý list
 *
 * Styles live in DashboardPage.css under .dash-wf scope to avoid clashing
 * with the legacy widgets.
 */


// ─── Page component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSeeVehicleSchedules = isFinancialRole(user?.role);
  const {
    data: activeVehicleSchedules = [],
    isError: vehicleSchedulesFailed,
    refetch: retryVehicleSchedules,
  } = useActiveVehicleSchedules(canSeeVehicleSchedules);
  const { month: currentMonth, year: currentYear } = useMonth();
  const [chartView, setChartView] = useState<'day' | 'month'>('day');
  const [showAllAttention, setShowAllAttention] = useState(false);
  const countersAnimated = useRef(false);

  // KPI refs for counter animation — point to <span> wrapping just the number
  const kpiRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const {
    stats, loading, prevPnlReport,
    createdTripsCount,
    receivablesSummary,
    yearlySeries,
    recentAudit,
    derived, formattedNet,
    allTrips,
  } = useDashboardData(currentMonth, currentYear);

  // Animation hook — must be after loading is defined
  const { rootRef, animateCounters } = useDashboardAnimations(!loading);

  const showApprovalQueue = canSeeApprovalQueue(user?.role);
  const { data: approvalQueue, isLoading: approvalQueueLoading } = useApprovalQueue(user?.role, user?.userId);

  // ── Derived values (non-hook computations) ──────────────────────────────
  const d = derived ?? null;
  const revenue = d?.revenue ?? 0;
  const costs = d?.costs ?? 0;
  const grossProfit = d?.grossProfit ?? 0;
  const netProfit = d?.netProfit ?? 0;
  const prevRevenue = d?.prevRevenue ?? 0;
  const prevCosts = d?.prevCosts ?? 0;
  const prevGross = d?.prevGross ?? 0;
  const prevNet = d?.prevNet ?? 0;

  const revenueMoM = fmtMoM(revenue, prevRevenue);
  const costsMoM = fmtMoM(costs, prevCosts);
  const grossMoM = fmtMoM(grossProfit, prevGross);
  const netMoM = fmtMoM(netProfit, prevNet);

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const costRatio = revenue > 0 ? (costs / revenue) * 100 : 0;

  // ── Chart series (daily + monthly) ────────────────────────────────────────
  // Daily view groups trips by departureDate; monthly view uses yearly P&L.
  // Both convert to Tr (millions). Only data points with actual data are shown.

  const dailyChartData = useMemo(() => {
    if (!allTrips || allTrips.length === 0) return { labels: [] as string[], revenue: [] as number[], gross: [] as number[] };
    const activeTrips = allTrips.filter((t: TripDetail) => t.status !== 'CANCELED');
    const dayMap = new Map<string, { revenue: number; gross: number }>();
    for (const t of activeTrips) {
      const dateKey = t.departureDate?.slice(0, 10);
      if (!dateKey) continue;
      const rev = Number(t.revenue) || 0;
      const gp = Number(t.grossProfit) || 0;
      const existing = dayMap.get(dateKey) ?? { revenue: 0, gross: 0 };
      existing.revenue += rev;
      existing.gross += gp;
      dayMap.set(dateKey, existing);
    }
    const sorted = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([, v]) => v.revenue > 0 || v.gross > 0);
    return {
      labels: sorted.map(([d]) => String(parseInt(d.slice(8, 10), 10))),
      revenue: sorted.map(([, v]) => v.revenue / 1_000_000),
      gross: sorted.map(([, v]) => v.gross / 1_000_000),
    };
  }, [allTrips]);

  const { chartMonths, chartRevenue, chartGross } = useMemo(() => {
    if (chartView === 'day') {
      return {
        chartMonths: dailyChartData.labels,
        chartRevenue: runningSum(dailyChartData.revenue),
        chartGross: runningSum(dailyChartData.gross),
      };
    }
    // Monthly view — trim leading months with no data
    if (!yearlySeries || yearlySeries.length === 0) return { chartMonths: [], chartRevenue: [], chartGross: [] };
    const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    const baseIdx = currentMonth - 1;
    const allMonths = yearlySeries.map((_, i) => months[(baseIdx - yearlySeries.length + 1 + i + 12) % 12]);
    const allRev = yearlySeries.map((p) => Number(p.revenue ?? 0) / 1_000_000);
    const allGross = yearlySeries.map((p) => Number(p.grossProfit ?? 0) / 1_000_000);
    const firstDataIdx = allRev.findIndex((r, i) => r > 0 || allGross[i] > 0);
    if (firstDataIdx < 0) return { chartMonths: [], chartRevenue: [], chartGross: [] };
    return {
      chartMonths: allMonths.slice(firstDataIdx),
      chartRevenue: runningSum(allRev.slice(firstDataIdx)),
      chartGross: runningSum(allGross.slice(firstDataIdx)),
    };
  }, [chartView, dailyChartData, yearlySeries, currentMonth]);

  // ── Top trucks (by margin) ──────────────────────────────────────────────
  const topTrucks = useMemo(() => {
    const trucks = (d?.displayTrucks ?? []) as Array<{ plate?: string; licensePlate?: string; profit?: number; revenue?: number; marginPct?: number }>;
    const maxPct = Math.max(1, ...trucks.map(t => t.marginPct ?? (t.revenue ? ((t.profit ?? 0) / t.revenue) * 100 : 0)));
    return trucks.slice(0, 5).map(t => {
      const pct = t.marginPct ?? (t.revenue ? ((t.profit ?? 0) / t.revenue) * 100 : 0);
      return {
        plate: t.plate ?? t.licensePlate ?? '—',
        pct: Math.round(pct),
        widthPct: Math.max(4, Math.round((pct / maxPct) * 100)),
      };
    });
  }, [d]);

  // ── Top routes ──────────────────────────────────────────────────────────
  const topRoutes = useMemo(() => {
    const routes = (d?.displayRoutes ?? []) as Array<{ name?: string; routeName?: string; profit?: number; grossProfit?: number }>;
    return routes.slice(0, 4).map(r => ({
      name: r.name ?? r.routeName ?? '—',
      profit: r.profit ?? r.grossProfit ?? 0,
    }));
  }, [d]);

  // Keep the full P&L breakdown so the presented categories reconcile to the
  // card total. Sorting by value makes comparisons immediate without requiring
  // users to estimate angles or match a detached legend to a chart.
  const costBreakdown = useMemo<CostBreakdownItem[]>(() => {
    if (!d) return [];
    return d.slicesWithPct
      .map(slice => ({
        name: slice.label,
        value: slice.value,
        pct: slice.pct,
        color: slice.color,
      }))
      .filter(item => item.value > 0 && item.pct > 0)
      .sort((a, b) => b.value - a.value);
  }, [d]);

  // ── Fleet stats ─────────────────────────────────────────────────────────
  const fleet = useMemo(() => {
    const fs = stats?.fleetStatus ?? {};
    const totalActive = fs.ACTIVE ?? 0;
    const maintenance = fs.MAINTENANCE ?? 0;
    const idle = fs.INACTIVE ?? 0;
    const inTransit = stats?.inTransitTrips ?? 0;
    const total = stats?.totalTrucks ?? 0;
    const drivers = stats?.totalDrivers ?? 0;
    
    // ACTIVE status includes trucks currently in transit.
    // Subtract inTransit to get the mutually exclusive count of trucks that are ready/idle.
    const ready = Math.max(0, totalActive - inTransit);
    
    // Utilization compares OUR running trips against OUR usable trucks. Counting
    // subcontracted trips here made the ratio exceed 100% whenever a partner truck
    // was hauling, so the bar (clamped at 100) disagreed with the printed number
    // (kanban 20260922_32). Partner trips are reported separately instead.
    const internalInTransit = stats?.inTransitInternalTrips ?? inTransit;
    const externalInTransit = stats?.inTransitExternalTrips ?? Math.max(0, inTransit - internalInTransit);
    const utilizable = total - maintenance;
    const utilization = utilizable > 0 ? (internalInTransit / utilizable) * 100 : null;
    const utilTone: 'ok' | 'high' | 'over' = utilization == null
      ? 'ok'
      : utilization > 100 ? 'over' : utilization > 85 ? 'high' : 'ok';
    
    return { ready, inTransit, internalInTransit, externalInTransit, maintenance, idle, total, drivers, utilizable, utilization, utilTone };
  }, [stats]);

  // ── Attention items (compose from real data) ────────────────────────────
  const attention = useMemo<DashboardDecisionItem[]>(() => {
    if (stats?.decisionItems?.length) return stats.decisionItems;

    const fallback: DashboardDecisionItem[] = [];
    if (createdTripsCount > 0) {
      fallback.push({
        id: 'dispatch-created-trips-fallback',
        kind: 'dispatch',
        severity: 'warning',
        title: `${createdTripsCount} đơn hàng chờ phân xe`,
        subtitle: 'Phân xe để không trễ giờ xuất phát',
        actionLabel: 'Phân xe',
        route: '/dispatch',
        priority: 90,
      });
    }
    if (revenue > 0) {
      fallback.push({
        id: 'profit-close-ready-fallback',
        kind: 'profit-close',
        severity: 'info',
        title: `Báo cáo lợi nhuận ${currentMonth}/${currentYear} sẵn sàng`,
        subtitle: 'Xem lại số liệu trước khi phân bổ lợi nhuận',
        actionLabel: 'Xem',
        route: '/profit',
        priority: 20,
      });
    }
    return fallback.length > 0
      ? fallback
      : [{
          id: 'all-clear-fallback',
          kind: 'all-clear',
          severity: 'success',
          title: 'Không có quyết định đang chờ',
          subtitle: 'Công nợ, phân xe, gia hạn và số liệu đều ổn',
          priority: 0,
        }];
  }, [stats?.decisionItems, createdTripsCount, revenue, currentMonth, currentYear]);
  const orderedAttention = useMemo(
    () => [...attention].sort((a, b) => b.priority - a.priority),
    [attention],
  );
  const visibleAttention = showAllAttention ? orderedAttention : orderedAttention.slice(0, 4);

  // ── Trigger KPI counter animations once data loads ──
  useEffect(() => {
    if (loading || countersAnimated.current) return;
    countersAnimated.current = true;

    // Small delay to let entrance animations start first
    const timer = setTimeout(() => {
      const refs = kpiRefs.current;
      animateCounters([
        { el: refs.revenue!, value: revenue },
        { el: refs.costs!, value: costs },
        { el: refs.gross!, value: grossProfit },
        { el: refs.net!, value: netProfit },
      ].filter(t => t.el !== null));
    }, 300);

    return () => clearTimeout(timer);
  }, [loading, revenue, costs, grossProfit, netProfit, animateCounters]);

  // ── Loading state (must be AFTER all hooks) ────────────────────────────
  if (loading) {
    return (
      <div className="dash-wf fade-up">
        <div className="wf-head"><div><SkeletonLine width="240px" /><div style={styles.thinBar} /><SkeletonLine width="320px" /></div></div>
        <SkeletonKPIs count={4} />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  // Critical-receivables banner — surfaces ONLY customers in the worst aging
  // bucket (>90 days overdue). Lesser overdue tiers (31–60, 61–90) are
  // routine and don't warrant a page-top banner. dismissKey ties dismissal to
  // the active period so a new month re-surfaces the banner.
  // Backend bucket ranges: '0-30' | '31-60' | '61-90' | '90+' (see
  // backend/src/services/aging.service.ts).
  const over90Bucket = receivablesSummary?.buckets?.find(b => b.range === '90+');
  const over90Count = over90Bucket?.count ?? 0;
  const criticalBannerKey = `over90-${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  return (
    <div className="dash-wf" ref={rootRef}>
      {over90Count > 0 && (
        <Banner
          variant="danger"
          icon={AlertTriangle}
          dismissKey={criticalBannerKey}
          action={
            <button
              type="button"
              onClick={() => navigate('/debt?filter=over90')}
              style={{
                background: 'transparent',
                border: '1px solid currentColor',
                color: 'inherit',
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                fontSize: 'var(--fs-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Xem công nợ
            </button>
          }
        >
          <strong>{over90Count}</strong> khách hàng đang quá hạn trên 90 ngày. Cần xử lý sớm để giảm rủi ro nợ xấu.
        </Banner>
      )}
      {/* ── page head ── */}
      <header className="wf-head">
        <div className="wf-head__copy">
          <div className="wf-eyebrow">
            <span className="d-badge d-badge-success d-badge-soft d-badge-sm">
              <Activity size={12} aria-hidden="true" /> Đang hoạt động
            </span>
            <span>Trung tâm điều hành · {String(currentMonth).padStart(2, '0')}/{currentYear}</span>
          </div>
          <h1>
            {greeting()},{' '}
            <span style={{ fontWeight: 800 }}>
              {user?.fullName || (user?.role && ROLE_LABELS[user.role as Role]) || user?.username || 'bạn'}
            </span>
          </h1>
          <div className="wf-sum">
            Tháng {currentMonth}/{currentYear} đang hoạt động — doanh thu{' '}
            {prevPnlReport ? (
              revenue >= prevRevenue
                ? <span className="pos">{revenueMoM} so với tháng trước</span>
                : <span className="neg">{revenueMoM} so với tháng trước</span>
            ) : <b>chưa đủ dữ liệu so sánh</b>}
            . Lợi nhuận ròng dự kiến <b>{formattedNet} ₫</b> sau phí quản lý.
          </div>
        </div>
        <div className="wf-acts">
          <button className="d-btn d-btn-sm wf-btn" onClick={() => navigate('/finance')}>
            <Download size={16} aria-hidden="true" />
            Báo cáo lãi lỗ
          </button>
          <button className="d-btn d-btn-primary d-btn-sm wf-btn wf-btn--primary" onClick={() => navigate('/dispatch')}>
            <Truck size={16} aria-hidden="true" />
            Phân xe{createdTripsCount > 0 ? ` · ${createdTripsCount} chờ` : ''}
          </button>
        </div>
      </header>

      {/* ── KPI row ── */}
      <DashboardKpiRow
        currentMonth={currentMonth}
        currentYear={currentYear}
        revenue={revenue}
        prevRevenue={prevRevenue}
        revenueMoM={revenueMoM}
        costs={costs}
        costsMoM={costsMoM}
        costRatio={costRatio}
        grossProfit={grossProfit}
        grossMoM={grossMoM}
        grossMargin={grossMargin}
        netProfit={netProfit}
        netMoM={netMoM}
        totalOutstanding={receivablesSummary?.totalOutstanding ?? 0}
        overdueCustomers={receivablesSummary?.overdueCustomers ?? 0}
        kpiRefs={kpiRefs}
        onNavigate={navigate}
      />

      {/* ── Operations grid ──
           Tiles auto-flow into rows based on their grid-column/row spans.
           The decision board is deliberately first so the user's next work is
           visible before historical analysis. On mobile every tile drops to
           full width via the .wf-bento override in DashboardPage.css. */}
      <div className="wf-bento">

        {canSeeVehicleSchedules && (
          vehicleSchedulesFailed ? (
            <div className="wf-bento-full dashboard-schedule-load-error" role="status">
              <span>Không tải được lịch phương tiện.</span>
              <button type="button" className="d-btn d-btn-sm" onClick={() => void retryVehicleSchedules()}>
                Thử lại
              </button>
            </div>
          ) : (
            <div className="wf-bento-full">
              <VehicleScheduleBanner
                items={activeVehicleSchedules}
                onOpenFleet={() => navigate('/fleet')}
                testId="vehicle-schedule-banner-dashboard"
              />
            </div>
          )
        )}

        {/* Action-first priority board — the most important operational
            decisions stay in the first scan path on every breakpoint. */}
        <AttentionBoard
          orderedAttention={orderedAttention}
          visibleAttention={visibleAttention}
          showAllAttention={showAllAttention}
          onToggleShowAll={() => setShowAllAttention(value => !value)}
          onNavigate={navigate}
        />

        {/* Hero 1 — Chart (8 cols × 2 rows) */}
        <RevenueChartCard
          chartMonths={chartMonths}
          chartRevenue={chartRevenue}
          chartGross={chartGross}
          chartView={chartView}
          onChartViewChange={setChartView}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onNavigate={navigate}
        />

        {/* Fleet (4 cols × 1 row) — right of chart, row 1 */}
        <FleetStatusCard fleet={fleet} onNavigate={navigate} />

        {/* Cost composition (4 cols × 1 row) — right of chart, row 2 */}
        <CostCompositionCard
          items={costBreakdown}
          total={d?.totalPie ?? costs}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />

        {/* Lợi nhuận theo xe (6 cols × 1 row) — below chart */}
        <ProfitByTruckCard trucks={topTrucks} currentMonth={currentMonth} currentYear={currentYear} />

        {/* Top tuyến sinh lời (6 cols × 1 row) — below chart, right half */}
        <TopRoutesCard routes={topRoutes} currentMonth={currentMonth} currentYear={currentYear} onNavigate={navigate} />

        {/* Cần duyệt — full-width so its height does not inherit the much
            taller decision list beside it. */}
        {showApprovalQueue && (
          <div className="wf-bento-full">
            <ApprovalQueueCard
              data={approvalQueue}
              loading={approvalQueueLoading}
              navigate={navigate}
            />
          </div>
        )}

        {/* Hoạt động gần đây (12 cols × 1 row) — full-width band, only for
            roles allowed by casbin. recentAudit is empty for DRIVER so this
            is skipped. */}
        {recentAudit.length > 0 && (
          <div className="wf-bento-full">
            <AuditLogWidget entries={recentAudit} navigate={navigate} />
          </div>
        )}
      </div>
    </div>
  );
}
