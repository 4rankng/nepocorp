import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Download, Truck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { DashboardDecisionItem } from '@tingting/shared';
import { isFinancialRole, ROLE_LABELS, Role } from '@tingting/shared';import { SkeletonLine, SkeletonKPIs } from '../components/shared/Skeleton';
import { Banner } from '../components/shared/Banner';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { styles, fmtMoM, buildDailySeries } from '../features/dashboard/utils';
import { useMonth } from '../hooks/useMonth';
import { AuditLogWidget } from '../features/dashboard/components/AuditLogWidget';
import { OcrUsageCard } from '../features/dashboard/components/OcrUsageCard';
import { useApprovalQueue } from '../features/dashboard/hooks/useApprovalQueue';
import { useOcrUsageStatus } from '../hooks/useOcrUsage';
import { useDashboardAnimations } from '../features/dashboard/hooks/useDashboardAnimations';
import './DashboardPage.css';
import { type CostBreakdownItem } from '../features/dashboard/components/dashboard-presenters';
import { greeting, runningSum } from '../features/dashboard/components/dashboardFormatters';
import { DashboardKpiRow } from '../features/dashboard/components/DashboardKpiRow';
import { AttentionBoard } from '../features/dashboard/components/AttentionBoard';
import { mergeAttentionRows } from '../features/dashboard/components/attentionRows';
import {
  CostCompositionCard,
  FleetStatusCard,
  ProfitByTruckCard,
  RevenueChartCard,
  TopRoutesCard,
  type ChartView,
} from '../features/dashboard/components/DashboardPanels';
import { VehicleScheduleBanner } from '../features/fleet/schedules/VehicleScheduleBanner';
import { useActiveVehicleSchedules } from '../hooks/useVehicleSchedules';

/**
 * Dashboard — NEPO-25 overhaul (25/10 consult verdict: deepseek px spec +
 * Untitled UI data-dense conventions; supersedes the NEPO-15 bento).
 *
 * Layout:
 *   • Page head (greeting + summary + 2 actions)
 *   • KPI strip full-width on top (revenue / cost / gross / net / debt)
 *   • Hero row (12-col, ≥1280):
 *       hero  → Doanh thu & LN gộp, span 8 — FIXED 280px chart body
 *               (240px below 1280), inline header KPIs (Tổng tháng ·
 *               TB/ngày · Đỉnh), segmented view tabs 32px
 *       rail  → "Việc cần xử lý" span 4 — ONE merged list (decision board
 *               + approval queue), rows 44–48, sorted severity → time
 *       @1024–1279 both stack full-width; the list goes 2-col >5 items
 *   • Row of thirds: Fleet + Cơ cấu chi phí + Lợi nhuận theo xe
 *   • Bottom row: Top tuyến (6) + Hoạt động gần đây (6, single column)
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
  const [chartView, setChartView] = useState<ChartView>('day');
  const [showAllAttention, setShowAllAttention] = useState(false);

  // KPI figures are rendered straight from the data. They used to be filled in
  // by an anime.js counter that wrote textContent out-of-band of React over
  // ~1.2s (kanban 101026003200): every reload caught the row mid-count, so the
  // same figures read differently from one look to the next with no user action.
  // Same class as the aging card on /debt (091026211500) — same remedy.
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
  const { rootRef } = useDashboardAnimations(!loading);

  const { data: approvalQueue, isLoading: approvalQueueLoading } = useApprovalQueue(user?.role, user?.userId);

  // NEPO-27: AI OCR usage for the browsed calendar month. Financial-read
  // only (matches the /reports/ocr-usage gate) — DRIVER must not even fire
  // the request. The month follows the dashboard's month picker, so the tile
  // can show a past month instead of always the current one.
  const canSeeOcrUsage = isFinancialRole(user?.role);
  const canManageOcrUsage = user?.role === Role.ADMIN;
  const ocrUsage = useOcrUsageStatus({
    enabled: canSeeOcrUsage,
    month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
  });

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

  // NEPO-13: a zero baseline is NOT a comparison — 'Mới' pills on all four
  // cards read as data noise. No pill until the previous month has figures.
  const revenueMoM = prevRevenue > 0 ? fmtMoM(revenue, prevRevenue) : null;
  const costsMoM = prevCosts > 0 ? fmtMoM(costs, prevCosts) : null;
  const grossMoM = prevGross > 0 ? fmtMoM(grossProfit, prevGross) : null;
  const netMoM = prevNet > 0 ? fmtMoM(netProfit, prevNet) : null;
  const netEqualsGross = d?.netEqualsGross ?? false;

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const costRatio = revenue > 0 ? (costs / revenue) * 100 : 0;

  // ── Chart series (daily + monthly) ────────────────────────────────────────
  // Daily view groups trips by departureDate; monthly view uses yearly P&L.
  // Both convert to Tr (millions).
  //
  // Every day of the daily window is a category, including the days with no
  // trip: building the series from the trips that exist left holes in the
  // x-axis (1…9, 11 — day 10 missing, kanban 101026101500). The monthly view
  // still trims the leading months with no data.
  const dailyChartData = useMemo(() => {
    const series = buildDailySeries(allTrips);
    return {
      labels: series.map((point) => String(point.day)),
      revenue: series.map((point) => point.revenue / 1_000_000),
      gross: series.map((point) => point.gross / 1_000_000),
      hasData: series.map((point) => point.hasData),
    };
  }, [allTrips]);

  // "Hôm nay" marker only when today is inside the plotted window (today
  // usually sits past the last day that has trips, where a marker would
  // dangle over an empty slot).
  const todayIdx = useMemo(() => {
    const today = new Date().getDate();
    const idx = dailyChartData.labels.findIndex((label) => Number(label) === today);
    return idx >= 0 ? idx : undefined;
  }, [dailyChartData]);

  // Inline header KPIs for the hero chart (NEPO-25 verdict §b): the month
  // the chart plots, summarised as Tổng tháng · TB/ngày · Đỉnh. Computed
  // from the same plotted series so header and bars can never disagree.
  const chartStats = useMemo(() => {
    const rev = dailyChartData.revenue;
    const total = rev.reduce((sum, v) => sum + v, 0);
    return {
      totalM: total,
      avgM: rev.length > 0 ? total / rev.length : 0,
      peakM: rev.length > 0 ? Math.max(...rev) : 0,
    };
  }, [dailyChartData]);

  const { chartMonths, chartRevenue, chartGross } = useMemo(() => {
    if (chartView === 'month') {
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
    }
    // Line views plot the cumulative running sum; the raw daily series (used
    // by the default 'Ngày' bars view) stays in dailyChartData. NEPO-15: the
    // running sum demoted from default — on a still-open month it always
    // reads "steadily climbing" and hides the daily rhythm.
    return {
      chartMonths: dailyChartData.labels,
      chartRevenue: runningSum(dailyChartData.revenue),
      chartGross: runningSum(dailyChartData.gross),
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

  // NEPO-25: the approval queue merges into the same "Việc cần xử lý" rail —
  // two action surfaces for pending work read as duplication (verdict §d).
  const approvalRows = useMemo(
    () => (approvalQueue?.items ?? []).filter(item => item.type !== 'debtOffsets'),
    [approvalQueue],
  );
  const mergedAttention = useMemo(
    () => mergeAttentionRows(orderedAttention, approvalRows),
    [orderedAttention, approvalRows],
  );

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
                padding: '0 10px',
                minHeight: 'var(--control-h)',
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
            {prevPnlReport && prevRevenue > 0 ? (
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
        netEqualsGross={netEqualsGross}
        totalOutstanding={receivablesSummary?.totalOutstanding ?? 0}
        overdueCustomers={receivablesSummary?.overdueCustomers ?? 0}
        over90Count={over90Count}
        onNavigate={navigate}
      />

      {/* ── Operations grid ──
           NEPO-15 layout (consult verdict 24/10, Untitled UI dashboard
           conventions): hero chart left, ACTION rail right — the approval
           queue and the decision board sit above the fold instead of being
           buried in full-width bands at the bottom. Row of thirds: fleet,
           cost composition (promoted from ~2 viewports down), truck margins.
           Bottom row: top routes + OCR usage tile (NEPO-27, 6+6), then a
           single-column audit feed.
           On mobile every tile drops to full width via the .wf-bento
           overrides in DashboardPage.css. */}
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

        {/* Hero 1 — Chart (8 cols @≥1280; fixed-height body per NEPO-25 §a) */}
        <RevenueChartCard
          dailyLabels={dailyChartData.labels}
          dailyRevenue={dailyChartData.revenue}
          dailyGross={dailyChartData.gross}
          dailyHasData={dailyChartData.hasData}
          todayIdx={todayIdx}
          chartMonths={chartMonths}
          chartRevenue={chartRevenue}
          chartGross={chartGross}
          chartView={chartView}
          onChartViewChange={setChartView}
          currentMonth={currentMonth}
          currentYear={currentYear}
          monthTotalM={chartStats.totalM}
          dayAvgM={chartStats.avgM}
          dayPeakM={chartStats.peakM}
          onNavigate={navigate}
        />

        {/* Action rail (NEPO-25 §c/§d): ONE "Việc cần xử lý" list — decision
            board + approval queue merged, sorted severity → time, rows
            44–48px. 4 cols beside the hero @≥1280; full-width below the
            chart @1024–1279 (2-column list when >5 items). */}
        <AttentionBoard
          rows={mergedAttention}
          approvalCount={approvalRows.length}
          loadingApprovals={approvalQueueLoading}
          showAll={showAllAttention}
          onToggleShowAll={() => setShowAllAttention(value => !value)}
          onNavigate={navigate}
        />

        {/* Fleet (4 cols) — row of thirds under the hero */}
        <FleetStatusCard fleet={fleet} onNavigate={navigate} />

        {/* Cost composition (4 cols) — promoted into the first scroll
            viewport; it used to sit ~2 viewports down (NEPO-15). */}
        <CostCompositionCard
          items={costBreakdown}
          total={d?.totalPie ?? costs}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />

        {/* Lợi nhuận theo xe (4 cols) */}
        <ProfitByTruckCard trucks={topTrucks} currentMonth={currentMonth} currentYear={currentYear} />

        {/* Top tuyến sinh lời (6 cols) — beside the OCR usage tile */}
        <TopRoutesCard routes={topRoutes} currentMonth={currentMonth} currentYear={currentYear} onNavigate={navigate} />

        {/* OCR usage (6 cols) — NEPO-27: this month's AI OCR requests vs the
            configurable allowance, overage count + cost once exceeded.
            NEPO-28: the tile labels itself with the period the DATA covers
            (status.period), not the dashboard's browsable month context —
            the counter always reports the real calendar month. */}
        {canSeeOcrUsage && (
          <OcrUsageCard
            status={ocrUsage.data ?? null}
            loading={ocrUsage.isLoading}
            isError={ocrUsage.isError}
            onRetry={() => void ocrUsage.refetch()}
            canManage={canManageOcrUsage}
            onNavigate={navigate}
          />
        )}

        {/* Hoạt động gần đây (6 cols, single column list) — only for roles
            allowed by casbin. recentAudit is empty for DRIVER so this is
            skipped. */}
        {recentAudit.length > 0 && (
          <div className="wf-bento-half">
            <AuditLogWidget entries={recentAudit} navigate={navigate} />
          </div>
        )}
      </div>
    </div>
  );
}
