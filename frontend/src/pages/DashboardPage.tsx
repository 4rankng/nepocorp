import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCompact } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import type { Role, TripDetail } from '@tingting/shared';
import { ROLE_LABELS } from '@tingting/shared';
import { SkeletonLine, SkeletonKPIs } from '../components/shared/Skeleton';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { styles, fmtMoM } from '../features/dashboard/utils';
import { useMonth } from '../hooks/useMonth';
import { RevenueTrendChart } from '../components/charts/RevenueTrendChart';
import { AuditLogWidget } from '../features/dashboard/components/AuditLogWidget';
import { ApprovalQueueCard } from '../features/dashboard/components/ApprovalQueueCard';
import { useApprovalQueue, canSeeApprovalQueue } from '../features/dashboard/hooks/useApprovalQueue';
import { useDashboardAnimations } from '../features/dashboard/hooks/useDashboardAnimations';
import './DashboardPage.css';

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

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const fmtVN = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** Convert a per-period series into cumulative running totals (lũy kế). */
const runningSum = (arr: number[]): number[] => {
  let acc = 0;
  return arr.map((v) => (acc += v));
};

interface DeltaProps { mom: string | null; suffix?: string; flatLabel?: string; }
const DeltaPill: React.FC<DeltaProps> = ({ mom, suffix = '', flatLabel = '0%' }) => {
  if (!mom) return <span className="delta flat">{flatLabel}</span>;
  const isUp = mom.startsWith('+');
  const isDown = mom.startsWith('-');
  const cls = isUp ? 'delta up' : isDown ? 'delta down' : 'delta flat';
  const sym = isUp ? '▲' : isDown ? '▼' : '·';
  return <span className={cls}>{sym} {mom.replace(/^[+-]/, '')}{suffix}</span>;
};

// ─── Cost donut (5 slices, computed from cost breakdown) ────────────────────

interface DonutSlice { name: string; pct: number; color: string; }
function CostDonut({ slices, totalCompact }: { slices: DonutSlice[]; totalCompact: string }) {
  // Each slice contributes (pct, offset) on a 100-unit circumference
  let offset = 0;
  const segs = slices.map(s => {
    const dash = `${s.pct} ${100 - s.pct}`;
    const seg = { color: s.color, dasharray: dash, offset: -offset };
    offset += s.pct;
    return seg;
  });
  return (
    <div className="wf-donut">
      <svg viewBox="0 0 42 42" style={{ width: 118, height: 118, transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef1ef" strokeWidth="7" />
        {segs.map((s, i) => (
          <circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={s.color}
                  strokeWidth="7" strokeDasharray={s.dasharray} strokeDashoffset={s.offset} />
        ))}
      </svg>
      <div className="ctr">
        {(() => {
          const spaceIdx = totalCompact.indexOf(' ');
          const num  = spaceIdx > -1 ? totalCompact.slice(0, spaceIdx) : totalCompact;
          const unit = spaceIdx > -1 ? totalCompact.slice(spaceIdx + 1) : '';
          return (
            <>
              <span className="big">{num}</span>
              <span className="sm">{unit ? `${unit} ₫` : '₫'}</span>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Page component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { month: currentMonth, year: currentYear } = useMonth();
  const [chartView, setChartView] = useState<'day' | 'month'>('day');
  const countersAnimated = useRef(false);

  // KPI refs for counter animation — point to <span> wrapping just the number
  const kpiRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const {
    stats, loading, prevPnlReport,
    createdTripsCount,
    renewalReminders, receivablesSummary,
    yearlySeries, fuelWarnings,
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

  const revenueMoM = fmtMoM(revenue, prevRevenue);
  const costsMoM = fmtMoM(costs, prevCosts);
  const grossMoM = fmtMoM(grossProfit, prevGross);
  const netMoM = fmtMoM(netProfit, prevGross); // approx vs prev gross when prevPnl unavailable

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

  // ── Cost breakdown for donut ────────────────────────────────────────────
  // Only build slices from cost lines that are actually non-zero. Without this
  // guard, a totalPie>0 with all sub-line=0 (rounding) produced a fake
  // "Chi phí khác 100%" gray donut.
  const costSlices = useMemo<DonutSlice[]>(() => {
    if (!d) return [];
    const realTotal = (d.fuelCost || 0) + (d.driverCost || 0) + (d.roadCost || 0) + (d.mgmtCost || 0);
    if (realTotal <= 0) return [];
    const slices: DonutSlice[] = [
      { name: 'Nhiên liệu', pct: Math.round(((d.fuelCost || 0) / realTotal) * 100), color: '#005A2D' },
      { name: 'Lương lái xe', pct: Math.round(((d.driverCost || 0) / realTotal) * 100), color: '#16A34A' },
      { name: 'Phí cầu đường', pct: Math.round(((d.roadCost || 0) / realTotal) * 100), color: '#2563EB' },
      { name: 'Phí quản lý', pct: Math.round(((d.mgmtCost || 0) / realTotal) * 100), color: '#C2780B' },
    ].filter(s => s.pct > 0);
    return slices;
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
    
    // Utilization: percentage of the available fleet (total - maintenance) that is currently running (inTransit)
    // This matches the logic in DispatchPage.tsx
    const utilizable = total - maintenance;
    const utilization = utilizable > 0 ? (inTransit / utilizable) * 100 : null;
    
    return { ready, inTransit, maintenance, idle, total, drivers, utilization };
  }, [stats]);

  // ── Attention items (compose from real data) ────────────────────────────
  const attention = useMemo(() => {
    const items: Array<{ icon: 'ok' | 'cal' | 'info' | 'warn'; title: string; sub: string; action?: { label: string; onClick: () => void; green?: boolean } }> = [];

    const overdue = (receivablesSummary?.buckets ?? [])
      .filter(b => b.range !== '0-30')
      .reduce((sum, b) => sum + (b.amount ?? 0), 0);
    if (overdue > 0) {
      items.push({
        icon: 'warn',
        title: `Có ${formatCompact(overdue)} ₫ công nợ quá hạn`,
        sub: 'Vui lòng xem & nhắc khách hàng',
        action: { label: 'Xem công nợ', onClick: () => navigate('/debt') },
      });
    } else {
      items.push({ icon: 'ok', title: 'Không có công nợ quá hạn', sub: 'Toàn bộ khách hàng đã thanh toán đúng hạn' });
    }

    if (createdTripsCount > 0) {
      items.push({
        icon: 'info',
        title: `${createdTripsCount} đơn hàng chờ phân xe`,
        sub: 'Phân xe ngay để xuất phát đúng hẹn',
        action: { label: 'Phân xe', onClick: () => navigate('/dispatch') },
      });
    } else {
      items.push({ icon: 'ok', title: 'Không có đơn hàng chờ phân xe', sub: 'Tất cả đơn hàng đã được phân xe' });
    }

    if ((renewalReminders?.length ?? 0) > 0) {
      items.push({
        icon: 'cal',
        title: `${renewalReminders.length} hạng mục cần gia hạn`,
        sub: 'Bảo hiểm · đăng kiểm · phí đường bộ',
        action: { label: 'Xem chi phí', onClick: () => navigate('/expenses') },
      });
    } else {
      items.push({ icon: 'cal', title: 'Không có hạng mục cần gia hạn', sub: 'Bảo hiểm · đăng kiểm · phí đường bộ' });
    }

    if ((fuelWarnings?.length ?? 0) > 0) {
      items.push({
        icon: 'warn',
        title: `${fuelWarnings.length} chuyến vượt định mức dầu`,
        sub: 'Cần xem lại số liệu khai báo',
        action: { label: 'Xem chuyến', onClick: () => navigate('/trips?fuelWarn=1') },
      });
    }

    if (revenue > 0) {
      items.push({
        icon: 'info',
        title: `Báo cáo lợi nhuận ${currentMonth}/${currentYear} sẵn sàng`,
        sub: 'Xác nhận để chốt sổ tháng',
        action: { label: 'Xem', onClick: () => navigate('/profit'), green: true },
      });
    }
    return items.slice(0, 5);
  }, [receivablesSummary, createdTripsCount, renewalReminders, fuelWarnings, revenue, currentMonth, currentYear, navigate]);

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
  return (
    <div className="dash-wf" ref={rootRef}>
      {/* ── page head ── */}
      <header className="wf-head">
        <div>
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
          <button className="wf-btn" onClick={() => navigate('/finance')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Báo cáo lãi lỗ
          </button>
          <button className="wf-btn wf-btn--primary" onClick={() => navigate('/dispatch')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
            Phân xe{createdTripsCount > 0 ? ` · ${createdTripsCount} chờ` : ''}
          </button>
        </div>
      </header>

      {/* ── KPI row ── */}
      <div className="wf-kpis">
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Doanh thu · {String(currentMonth).padStart(2, '0')}/{currentYear}</span>
            <DeltaPill mom={revenueMoM} />
          </div>
          <div className="val"><span ref={el => { kpiRefs.current.revenue = el; }}>{fmtVN(revenue)}</span> <i>đ</i></div>
          <div className="foot">Tháng trước · {formatCompact(prevRevenue)} đ</div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Tổng chi phí</span>
            <DeltaPill mom={costsMoM} />
          </div>
          <div className="val"><span ref={el => { kpiRefs.current.costs = el; }}>{fmtVN(costs)}</span> <i>đ</i></div>
          <div className="foot">{costRatio.toFixed(1)}% doanh thu</div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Lợi nhuận gộp</span>
            <DeltaPill mom={grossMoM} />
          </div>
          <div className="val"><span ref={el => { kpiRefs.current.gross = el; }}>{fmtVN(grossProfit)}</span> <i>đ</i></div>
          <div className="foot">Biên gộp · {grossMargin.toFixed(1)}%</div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Lợi nhuận ròng</span>
            <DeltaPill mom={netMoM} />
          </div>
          <div className="val"><span ref={el => { kpiRefs.current.net = el; }}>{fmtVN(netProfit)}</span> <i>đ</i></div>
          <div className="foot">
            Sau phí quản lý · <button className="wf-link" onClick={() => navigate('/profit')}>Phân chia →</button>
          </div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Công nợ phải thu</span>
          </div>
          <div className="val"><span>{fmtVN(receivablesSummary?.totalOutstanding ?? 0)}</span> <i>đ</i></div>
          <div className="foot">{receivablesSummary?.overdueCustomers ?? 0} khách quá hạn</div>
        </div>
      </div>

      {/* ── Bento grid (12-col, 2 hero tiles) ──
           Tiles auto-flow into rows based on their grid-column/row spans.
           Source order matters — heroes first, then secondary tiles cluster
           around them. On mobile (≤1180px) every tile drops to full width
           via the .wf-bento override in DashboardPage.css. */}
      <div className="wf-bento">

        {/* Hero 1 — Chart (8 cols × 2 rows) */}
        <div className="wf-card wf-chart wf-bento-hero">
            <div className="wf-card-h">
              <div>
                <div className="ttl">Doanh thu & Lợi nhuận gộp</div>
                <div className="sub">
                  {chartMonths.length > 0
                    ? chartView === 'day'
                      ? `${chartMonths.length} ngày · Tháng ${currentMonth}/${currentYear}`
                      : `${chartMonths.length} tháng gần nhất`
                    : 'Chưa có dữ liệu'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="wf-chart-toggle">
                  <button className={`wf-chart-toggle__btn${chartView === 'day' ? ' is-active' : ''}`} onClick={() => setChartView('day')}>Ngày</button>
                  <button className={`wf-chart-toggle__btn${chartView === 'month' ? ' is-active' : ''}`} onClick={() => setChartView('month')}>Tháng</button>
                </div>
                <button className="wf-link" onClick={() => navigate('/finance')}>Xem báo cáo
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
                    <div style={{ padding: '40px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--wf-ink-3)', fontSize: 13, flex: 1 }}>
                      Đang tải dữ liệu...
                    </div>
                  );
                }
                const totalRev = chartRevenue.reduce((a, b) => a + b, 0);
                const totalGp = chartGross.reduce((a, b) => a + b, 0);
                if (totalRev === 0 && totalGp === 0) {
                  return (
                    <div style={{ padding: '40px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--wf-ink-3)', fontSize: 13, flex: 1 }}>
                      Chưa đủ dữ liệu lịch sử để vẽ biểu đồ.
                    </div>
                  );
                }
                return <RevenueTrendChart months={chartMonths} revenue={chartRevenue} gross={chartGross} />;
              })()}
            </div>
          </div>

        {/* Fleet (4 cols × 1 row) — right of chart, row 1 */}
        <div className="wf-card wf-fleet wf-bento-third">
            <div className="wf-card-h">
              <div>
                <div className="ttl">Tình trạng đội xe</div>
                <div className="sub">{fleet.total} đầu kéo · {fleet.drivers} lái xe</div>
              </div>
              <button className="wf-link" onClick={() => navigate('/fleet')}>Quản lý</button>
            </div>
            <div className="body">
              <div className="wf-fstats">
                <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-green-500)' }} />{fleet.ready}</div><div className="k">Sẵn sàng</div></div>
                <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-green)' }} />{fleet.inTransit}</div><div className="k">Đang chạy</div></div>
                <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-amber)' }} />{fleet.maintenance}</div><div className="k">Bảo dưỡng</div></div>
                <div className="wf-fstat"><div className="v"><span className="pip" style={{ background: 'var(--wf-ink-3)' }} />{fleet.idle}</div><div className="k">Ngừng</div></div>
              </div>
              {fleet.utilization != null && (
                <div className="wf-util">
                  <span className="cap">Tỷ lệ sử dụng</span>
                  <span className="track"><i style={{ width: `${Math.min(100, fleet.utilization)}%` }} /></span>
                  <span className="pct">{Math.round(fleet.utilization)}%</span>
                </div>
              )}
            </div>
          </div>

        {/* Cost donut (4 cols × 1 row) — right of chart, row 2 */}
        <div className="wf-card wf-cost wf-bento-third">
            <div className="wf-card-h">
              <div>
                <div className="ttl">Cơ cấu chi phí</div>
                <div className="sub">{String(currentMonth).padStart(2, '0')}/{currentYear} · tổng {formatCompact(costs)} đ</div>
              </div>
            </div>
            <div className="body">
              {costSlices.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: 'var(--wf-ink-3)' }}>Chưa có chi phí ghi nhận trong tháng.</div>
              ) : (
                <>
                  <CostDonut slices={costSlices} totalCompact={formatCompact(costs)} />
                  <div className="wf-clegend">
                    {costSlices.map((s, i) => (
                      <div key={i} className="wf-crow">
                        <span className="sw" style={{ background: s.color }} />
                        <span className="nm">{s.name}</span>
                        <span className="pc">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        {/* Lợi nhuận theo xe (6 cols × 1 row) — below chart */}
        <div className="wf-card wf-bento-half">
              <div className="wf-card-h">
                <div>
                  <div className="ttl">Lợi nhuận theo xe</div>
                  <div className="sub">Biên gộp từng đầu kéo · {String(currentMonth).padStart(2, '0')}/{currentYear}</div>
                </div>
              </div>
              <div className="wf-vlist">
                {topTrucks.length === 0 ? (
                  <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--wf-ink-3)' }}>Chưa có dữ liệu xe trong tháng.</div>
                ) : topTrucks.map((t, i) => (
                  <div key={i} className="wf-vrow">
                    <span className="plate" title={t.plate}>{t.plate}</span>
                    <span className="bar"><i style={{ width: `${t.widthPct}%` }} /></span>
                    <span className="pct">{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

        {/* Top tuyến sinh lời (6 cols × 1 row) — below chart, right half */}
        <div className="wf-card wf-bento-half">
              <div className="wf-card-h">
                <div>
                  <div className="ttl">Top tuyến sinh lời</div>
                  <div className="sub">Theo lợi nhuận gộp · {String(currentMonth).padStart(2, '0')}/{currentYear}</div>
                </div>
                <button className="wf-link" onClick={() => navigate('/finance')}>Tất cả</button>
              </div>
              <div className="wf-rlist">
                {topRoutes.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, color: 'var(--wf-ink-3)' }}>Chưa có dữ liệu tuyến.</div>
                ) : topRoutes.map((r, i) => (
                  <div key={i} className="wf-rrow">
                    <span className="rk">{i + 1}</span>
                    <span className="rt" title={r.name}>{r.name}</span>
                    <span className="rv">{formatCompact(r.profit)}</span>
                  </div>
                ))}
              </div>
            </div>

        {/* Hero 2 — Cần duyệt (8 cols × 2 rows) — only for roles allowed by
            casbin. The wrapper div carries the bento span; the card itself
            stays untouched inside. */}
        {showApprovalQueue && (
          <div className="wf-bento-hero">
            <ApprovalQueueCard
              data={approvalQueue}
              loading={approvalQueueLoading}
              navigate={navigate}
            />
          </div>
        )}

        {/* Cần chú ý (4 cols × 2 rows) — right of approval queue */}
        <div className="wf-card wf-att wf-bento-side">
            <div className="wf-card-h">
              <div>
                <div className="ttl">Cần chú ý</div>
                <div className="sub">Vấn đề cần quyết định</div>
              </div>
            </div>
            <div className="body">
              {attention.map((item, i) => (
                <React.Fragment key={i}>
                  {i === attention.length - 1 && attention.length > 1 && <div className="wf-divider" />}
                  <div className="wf-arow">
                    <div className={`ic wf-ic-${item.icon}`}>
                      {item.icon === 'ok' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      {item.icon === 'cal' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                      {item.icon === 'info' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>}
                      {item.icon === 'warn' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>}
                    </div>
                    <div className="tx">
                      <div className="t">{item.title}</div>
                      <div className="s">{item.sub}</div>
                    </div>
                    {item.action && (
                      <div className="go">
                        <button className={`wf-minibtn${item.action.green ? ' green' : ''}`} onClick={item.action.onClick}>{item.action.label}</button>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

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
