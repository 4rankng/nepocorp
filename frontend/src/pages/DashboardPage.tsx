import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCompact } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '@nepocorp/shared';
import { ROLE_LABELS } from '@nepocorp/shared';
import { SkeletonLine, SkeletonKPIs } from '../components/shared/Skeleton';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { styles, fmtMoM } from '../features/dashboard/utils';
import { useMonth } from '../hooks/useMonth';

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

interface DeltaProps { mom: string | null; suffix?: string; flatLabel?: string; }
const DeltaPill: React.FC<DeltaProps> = ({ mom, suffix = '', flatLabel = '0%' }) => {
  if (!mom) return <span className="delta flat">{flatLabel}</span>;
  const isUp = mom.startsWith('+');
  const isDown = mom.startsWith('-');
  const cls = isUp ? 'delta up' : isDown ? 'delta down' : 'delta flat';
  const sym = isUp ? '▲' : isDown ? '▼' : '·';
  return <span className={cls}>{sym} {mom.replace(/^[+\-]/, '')}{suffix}</span>;
};

// ─── 12-month revenue + gross-profit chart (inline SVG) ─────────────────────

interface ChartProps { months: string[]; revenue: number[]; gross: number[]; }
function RevenueChart({ months, revenue, gross }: ChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const activeIdx = hoverIdx ?? (revenue.length - 1);

  const W = 760, H = 280;
  const mL = 46, mR = 18, mT = 14, mB = 30;
  const pW = W - mL - mR, pH = H - mT - mB;
  // Round yMax up to nearest 250M
  const peak = Math.max(...revenue, ...gross, 1);
  const yMax = Math.max(250, Math.ceil(peak / 250) * 250);
  const X = (i: number) => mL + pW * (i / Math.max(1, revenue.length - 1));
  const Y = (v: number) => mT + pH * (1 - v / yMax);

  const path = (arr: number[]) =>
    arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');

  const areaPath = (arr: number[]) =>
    path(arr) + ` L ${X(arr.length - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`;

  const gridValues = [0, yMax / 4, yMax / 2, (3 * yMax) / 4, yMax];

  const ax = X(activeIdx);
  const ay = Y(revenue[activeIdx] || 0);
  const ayGp = Y(gross[activeIdx] || 0);

  // Tooltip dimensions — shows month + both series values
  const tw = 168, th = 72;
  const tx = Math.min(W - mR - tw, Math.max(mL, ax - tw / 2));
  const ty = Math.max(mT, Math.min(ay, ayGp) - th - 12);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      onMouseLeave={() => setHoverIdx(null)}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#005A2D" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#005A2D" stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridValues.map((v, i) => (
        <g key={i}>
          <line x1={mL} y1={Y(v)} x2={W - mR} y2={Y(v)} stroke="#EEF1EF" strokeWidth="1" />
          <text x={mL - 10} y={Y(v) + 3.5} textAnchor="end" fontFamily="JetBrains Mono, monospace" fill="#A4B1A9">
            {v === 0
              ? <tspan fontSize="10">0</tspan>
              : <><tspan fontSize="10">{Math.round(v)}</tspan><tspan fontSize="8">tr₫</tspan></>
            }
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={i} x={X(i)} y={H - 10} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10"
              fill={i === activeIdx ? '#005A2D' : '#8A988F'} fontWeight={i === activeIdx ? '700' : '400'}>
          {m}
        </text>
      ))}
      <path d={areaPath(revenue)} fill="url(#gRev)" />
      <path d={path(gross)} fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(revenue)} fill="none" stroke="#005A2D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* active point crosshair */}
      <line x1={ax} y1={mT} x2={ax} y2={mT + pH} stroke="#005A2D" strokeWidth="1" strokeDasharray="3 4" opacity={0.45} />
      <circle cx={ax} cy={ayGp} r="3.5" fill="#fff" stroke="#2563EB" strokeWidth="2" />
      <circle cx={ax} cy={ay} r="4" fill="#fff" stroke="#005A2D" strokeWidth="2.6" />
      {/* Tooltip card */}
      <rect x={tx} y={ty} width={tw} height={th} rx="8" fill="#fff"
            stroke="#E2E8E5" strokeWidth="1"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />
      {/* Month header */}
      <text x={tx + tw / 2} y={ty + 15} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="600" fill="#6B7B73">
        {months[activeIdx]}
      </text>
      {/* Divider */}
      <line x1={tx + 10} y1={ty + 20} x2={tx + tw - 10} y2={ty + 20} stroke="#EEF1EF" strokeWidth="1" />
      {/* Revenue row */}
      <circle cx={tx + 16} cy={ty + 35} r="4" fill="#005A2D" />
      <text x={tx + 26} y={ty + 38.5} fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#6B7B73">
        Doanh thu
      </text>
      <text x={tx + tw - 10} y={ty + 38.5} textAnchor="end"
            fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#005A2D">
        {(revenue[activeIdx] || 0).toFixed(1).replace('.', ',')} Tr
      </text>
      {/* Gross profit row */}
      <circle cx={tx + 16} cy={ty + 56} r="4" fill="#2563EB" />
      <text x={tx + 26} y={ty + 59.5} fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#6B7B73">
        LN gộp
      </text>
      <text x={tx + tw - 10} y={ty + 59.5} textAnchor="end"
            fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#2563EB">
        {(gross[activeIdx] || 0).toFixed(1).replace('.', ',')} Tr
      </text>
      {/* Invisible hit areas — one per month column, rendered last so they sit on top */}
      {months.map((_, i) => {
        const cx = X(i);
        const left  = i === 0 ? mL : (X(i - 1) + cx) / 2;
        const right = i === months.length - 1 ? W - mR : (cx + X(i + 1)) / 2;
        return (
          <rect
            key={i}
            x={left}
            y={mT}
            width={right - left}
            height={pH}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHoverIdx(i)}
          />
        );
      })}
    </svg>
  );
}

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

  const {
    stats, loading, prevPnlReport,
    createdTrips, createdTripsCount,
    renewalReminders, receivablesSummary,
    yearlySeries, fuelWarnings,
    derived, formattedNet,
  } = useDashboardData(currentMonth, currentYear);

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

  // ── Chart series (12 months) ────────────────────────────────────────────
  // useDashboardData.yearlySeries is the historical line. Map to Tr (millions)
  // so the axis scales nicely.
  const chartMonths = useMemo(() => yearlySeries?.map((p: any) => p.label || p.month || '') ?? [], [yearlySeries]);
  const chartRevenue = useMemo(() => yearlySeries?.map((p: any) => Number(p.revenue ?? 0) / 1_000_000) ?? [], [yearlySeries]);
  const chartGross = useMemo(() => yearlySeries?.map((p: any) => Number(p.grossProfit ?? p.gross ?? 0) / 1_000_000) ?? [], [yearlySeries]);

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
      { name: 'Lương tài xế', pct: Math.round(((d.driverCost || 0) / realTotal) * 100), color: '#16A34A' },
      { name: 'Phí cầu đường', pct: Math.round(((d.roadCost || 0) / realTotal) * 100), color: '#2563EB' },
      { name: 'Phí quản lý', pct: Math.round(((d.mgmtCost || 0) / realTotal) * 100), color: '#C2780B' },
    ].filter(s => s.pct > 0);
    return slices;
  }, [d]);

  // ── Fleet stats ─────────────────────────────────────────────────────────
  const fleet = useMemo(() => {
    const s = stats as any;
    const fs = s?.fleetStatus ?? {};
    const totalActive = fs.ACTIVE ?? 0;
    const maintenance = fs.MAINTENANCE ?? 0;
    const idle = fs.INACTIVE ?? 0;
    const inTransit = s?.inTransitTrips ?? 0;
    const total = s?.totalTrucks ?? 0;
    const drivers = s?.totalDrivers ?? 0;
    
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
        action: { label: 'Xem & xác nhận', onClick: () => navigate('/profit'), green: true },
      });
    }
    return items.slice(0, 5);
  }, [receivablesSummary, createdTripsCount, renewalReminders, fuelWarnings, revenue, currentMonth, currentYear, navigate]);

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
    <div className="dash-wf fade-up">
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
          <div className="val">{fmtVN(revenue)} <i>đ</i></div>
          <div className="foot">Tháng trước · {formatCompact(prevRevenue)} đ</div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Tổng chi phí</span>
            <DeltaPill mom={costsMoM} />
          </div>
          <div className="val">{fmtVN(costs)} <i>đ</i></div>
          <div className="foot">{costRatio.toFixed(1)}% doanh thu</div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Lợi nhuận gộp</span>
            <DeltaPill mom={grossMoM} />
          </div>
          <div className="val">{fmtVN(grossProfit)} <i>đ</i></div>
          <div className="foot">Biên gộp · {grossMargin.toFixed(1)}%</div>
        </div>
        <div className="wf-kpi">
          <div className="row1">
            <span className="lbl">Lợi nhuận ròng</span>
            <DeltaPill mom={netMoM} />
          </div>
          <div className="val">{fmtVN(netProfit)} <i>đ</i></div>
          <div className="foot">
            Sau phí quản lý · <button className="wf-link" onClick={() => navigate('/profit')}>Phân chia →</button>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="wf-grid">

        {/* LEFT */}
        <div className="wf-col">
          {/* chart */}
          <div className="wf-card wf-chart">
            <div className="wf-card-h">
              <div>
                <div className="ttl">Doanh thu & Lợi nhuận gộp</div>
                <div className="sub">12 tháng gần nhất</div>
              </div>
              <button className="wf-link" onClick={() => navigate('/finance')}>Xem báo cáo
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <div className="wf-legend">
              <span className="li"><span className="sw" style={{ background: 'var(--wf-green)' }} />Doanh thu</span>
              <span className="li"><span className="sw" style={{ background: 'var(--wf-blue)' }} />Lợi nhuận gộp</span>
            </div>
            <div className="body">
              {(() => {
                const totalRev = chartRevenue.reduce((a, b) => a + b, 0);
                const totalGp = chartGross.reduce((a, b) => a + b, 0);
                if (chartRevenue.length === 0 || (totalRev === 0 && totalGp === 0)) {
                  return (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--wf-ink-3)', fontSize: 13 }}>
                      Chưa đủ dữ liệu lịch sử để vẽ biểu đồ.
                    </div>
                  );
                }
                return <RevenueChart months={chartMonths} revenue={chartRevenue} gross={chartGross} />;
              })()}
            </div>
          </div>

          {/* sub2: top trucks + top routes */}
          <div className="wf-sub2">
            <div className="wf-card">
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

            <div className="wf-card">
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
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="wf-col">
          {/* fleet */}
          <div className="wf-card wf-fleet">
            <div className="wf-card-h">
              <div>
                <div className="ttl">Tình trạng đội xe</div>
                <div className="sub">{fleet.total} đầu kéo · {fleet.drivers} tài xế</div>
              </div>
              <button className="wf-link" onClick={() => navigate('/fleet')}>Quản lý</button>
            </div>
            <div className="body">
              <div className="wf-seg">
                {fleet.ready > 0 && <i style={{ background: 'var(--wf-green-500)', flex: fleet.ready }} />}
                {fleet.inTransit > 0 && <i style={{ background: 'var(--wf-green)', flex: fleet.inTransit }} />}
                {fleet.maintenance > 0 && <i style={{ background: 'var(--wf-amber)', flex: fleet.maintenance }} />}
                {fleet.idle > 0 && <i style={{ background: 'var(--wf-ink-3)', flex: fleet.idle }} />}
                {fleet.ready + fleet.inTransit + fleet.maintenance + fleet.idle === 0 && <i style={{ background: 'var(--wf-border)', flex: 1 }} />}
              </div>
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

          {/* cost donut */}
          <div className="wf-card wf-cost">
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

          {/* attention */}
          <div className="wf-card wf-att">
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
        </div>
      </div>
    </div>
  );
}
