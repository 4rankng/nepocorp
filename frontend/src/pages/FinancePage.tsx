import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getActiveCapTable } from '../lib/cap-table';
import { formatNumber } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { CalendarDays } from 'lucide-react';
import { PageHeader, Panel } from '../components/UI';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { CapTableHistory, PaginatedResponse } from '@nepocorp/shared';

// Manual ResizeObserver-based width measurement. Used as a workaround for
// recharts ResponsiveContainer mis-measuring (rendering 14×14 SVGs) when its
// parent is a flex/grid item — the auto-measure runs before the layout pass
// so it reads zero width, then never re-measures.
function useObservedWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Initial synchronous measurement — ResizeObserver doesn't always fire
    // its first callback before paint, leaving the chart unmounted on
    // initial render. Measure once now so charts appear immediately.
    const initial = Math.round(el.getBoundingClientRect().width);
    if (initial > 0) setWidth(initial);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
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

interface TripCosts {
  total_fuel_cost: string | null;
  total_road_allowance: string | null;
  driver_salary: string | null;
}

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const YEARS = [2024, 2025, 2026, 2027];

function now() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function formatRawNumber(num: number): string {
  return Math.round(num).toLocaleString('vi-VN');
}

function yoyPct(current: number, previous: number): string {
  if (!previous) return current > 0 ? '+∞' : '—';
  const pct = ((current - previous) / previous * 100).toFixed(1);
  return `${Number(pct) >= 0 ? '+' : ''}${pct}%`;
}

function yoyClass(current: number, previous: number): string {
  if (!previous) return '';
  return current >= previous ? 'pnl-row__pct--up' : 'pnl-row__pct--down';
}

export default function FinancePage() {
  const navigate = useNavigate();
  const { month: cm, year: cy } = now();
  const [month, setMonth] = useState(cm);
  const [year, setYear] = useState(cy);
  const [report, setReport] = useState<PnlReport | null>(null);
  const [prevReport, setPrevReport] = useState<PnlReport | null>(null);
  const [tripCosts, setTripCosts] = useState<TripCosts[]>([]);
  const [capTable, setCapTable] = useState<CapTableHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearlyData, setYearlyData] = useState<(PnlReport | null)[]>([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, prev, tripsRes, capRes] = await Promise.all([
        api.get<PnlReport>(`/reports/pnl?month=${month}&year=${year}`),
        api.get<PnlReport>(`/reports/pnl?month=${month}&year=${year - 1}`).catch(() => null as PnlReport | null),
        api.get<PaginatedResponse<TripCosts>>('/trips?status=LOCKED&limit=500').catch(() => ({ items: [], total: 0, page: 1, pageSize: 0 })),
        api.get<PaginatedResponse<CapTableHistory>>('/cap-table').catch(() => ({ items: [], total: 0, page: 1, pageSize: 0 })),
      ]);
      setReport(data);
      setPrevReport(prev);
      setTripCosts(tripsRes.items || []);
      setCapTable(capRes.items || []);
    } catch (e: any) {
      setError(e.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  useEffect(() => {
    setYearlyLoading(true);
    Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        api.get<PnlReport>(`/reports/pnl?month=${i + 1}&year=${year}`).catch(() => null)
      )
    ).then(setYearlyData).finally(() => setYearlyLoading(false));
  }, [year]);

  // Real cost breakdown from locked trips
  const fuelCost = tripCosts.reduce((s, t) => s + parseFloat(t.total_fuel_cost || '0'), 0);
  const roadCost = tripCosts.reduce((s, t) => s + parseFloat(t.total_road_allowance || '0'), 0);
  const driverCost = tripCosts.reduce((s, t) => s + parseFloat(t.driver_salary || '0'), 0);

  const totalRevenue = report?.totalRevenue ?? 0;
  const otherRevenue = report?.otherIncome ?? 0;
  const transRevenue = Math.max(0, totalRevenue - otherRevenue);
  const totalCosts = report?.totalCosts ?? 0;
  const grossProfit = report?.grossProfit ?? (totalRevenue - totalCosts);
  const mgmtFee = report?.managementFee ?? 0;
  const netProfit = report?.netProfit ?? (grossProfit - mgmtFee + otherRevenue);

  // Prior period for YoY
  const totalRevenueLY = prevReport?.totalRevenue ?? 0;
  const otherRevenueLY = prevReport?.otherIncome ?? 0;
  const transRevenueLY = Math.max(0, totalRevenueLY - otherRevenueLY);
  const totalCostsLY = prevReport?.totalCosts ?? 0;
  const grossProfitLY = prevReport?.grossProfit ?? (totalRevenueLY - totalCostsLY);
  const mgmtFeeLY = prevReport?.managementFee ?? 0;
  const netProfitLY = prevReport?.netProfit ?? (grossProfitLY - mgmtFeeLY + otherRevenueLY);

  // Cap table partner split for footnote.
  const activeCapTable = getActiveCapTable(capTable, [])
    .map(c => ({ name: c.partnerName, pct: c.percentage }));

  const compactNum = (v: number) => {
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}tỷ`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}tr`;
    return `${(v / 1e3).toFixed(0)}k`;
  };

  const revenueChartData = yearlyData.map((r, i) => ({
    name: `T${i + 1}`,
    'Doanh thu': r?.totalRevenue ?? 0,
    'LN gộp': r?.grossProfit ?? 0,
  }));

  const costPieData = [
    { name: 'Nhiên liệu', value: fuelCost, fill: '#3b82f6' },
    { name: 'Tiền đường', value: roadCost, fill: '#f59e0b' },
    { name: 'Lương lái xe', value: driverCost, fill: '#10b981' },
  ].filter(d => d.value > 0);

  const topTrucks = [...(report?.trucks ?? [])]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)
    .map(t => ({ name: t.plate, 'LN gộp': t.profit }));

  // Chart container refs — workaround for recharts ResponsiveContainer
  // mis-measuring inside flex/grid (rendered 14×14 SVGs leaving panels blank).
  const [revenueChartRef, revenueChartWidth] = useObservedWidth();
  const [pieChartRef, pieChartWidth] = useObservedWidth();

  return (
    <div className="fade-up-1" style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Báo cáo lãi lỗ"
        description={`Báo cáo kết quả kinh doanh Tháng ${month} / ${year} · so sánh với Tháng ${month} / ${year - 1}`}
        action={
          <div className="page-actions">
            <div className="date-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              <CalendarDays size={14} style={{ color: 'var(--brand)' }} />
              <span>Tháng {month} · <strong>{year}</strong></span>
            </div>
            <button className="btn btn--secondary" onClick={() => window.print()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Xuất PDF
            </button>
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
              downloadCSV(`bao-cao-lai-lo-T${month}-${year}.csv`, headers, rows);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất Excel
            </button>
          </div>
        }
      />

      {/* Period Selection Bar */}
      <div className="fade-up-2" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, rowGap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>Chọn kỳ báo cáo:</span>
        <select
          className="input"
          style={{ width: 140, height: 34, fontSize: 13 }}
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {MONTHS.map((label, i) => (
            <option key={i} value={i + 1}>{label}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: 110, height: 34, fontSize: 13 }}
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {report && (
          <span style={{ fontSize: 13, color: 'var(--fg-3)', marginLeft: 8 }}>
            Ghi nhận <strong>{report.tripCount}</strong> lệnh chốt sổ
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 20px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* ── Charts ──────────────────────────────────────────────────── */}
      {/* Switched from `display: grid` with `minmax(0,2fr) minmax(0,1fr)` to
          flex — recharts ResponsiveContainer was failing to measure the cell
          width (rendering SVGs at 14×14 instead of the full available width)
          when inside the grid track. Flex children with explicit `flex: 2`
          and `flex: 1` give recharts a stable parent box to measure against. */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }} className="fade-up-3">
        {/* Revenue trend */}
        <div className="panel" style={{ padding: '16px 20px', flex: '2 1 400px', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
            Xu hướng doanh thu {year}
          </div>
          {yearlyLoading ? (
            <div style={{ height: 200, background: 'var(--bg-2)', borderRadius: 6 }} />
          ) : revenueChartData.every(d => d['Doanh thu'] === 0 && d['LN gộp'] === 0) ? (
            // Empty-state — was showing an empty axis with no bars at all,
            // which read as a broken chart. Now we render a clear placeholder
            // so the director knows it's "no data yet" not "chart is broken".
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 13, gap: 4 }}>
              <div style={{ fontSize: 24, opacity: 0.4 }}>📊</div>
              <div>Chưa có lệnh chốt sổ trong năm {year}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Khoá lệnh để xem xu hướng doanh thu hàng tháng</div>
            </div>
          ) : (
            // Manual width via ResizeObserver — recharts ResponsiveContainer
            // mis-measures inside flex/grid (renders 14×14). Initial state of
            // 600 ensures the chart paints something on first render before
            // the observer fires; the observer then refines.
            <div ref={revenueChartRef} style={{ width: '100%', height: 200 }}>
              <BarChart width={revenueChartWidth || 600} height={200} data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={compactNum} tick={{ fontSize: 11 }} width={44} />
                <Tooltip formatter={(v: any) => `${formatRawNumber(Number(v))} ₫`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Doanh thu" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="LN gộp" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </div>
          )}
        </div>

        {/* Cost pie */}
        <div className="panel" style={{ padding: '16px 20px', flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
            Cơ cấu chi phí T{month}/{year}
          </div>
          {loading ? (
            <div style={{ height: 200, background: 'var(--bg-2)', borderRadius: 6 }} />
          ) : costPieData.length > 0 ? (
            <div ref={pieChartRef} style={{ width: '100%', height: 200 }}>
              <PieChart width={pieChartWidth || 280} height={200}>
                <Pie data={costPieData} dataKey="value" cx="50%" cy="45%" outerRadius={68} label={false}>
                  {costPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${formatRawNumber(Number(v))} ₫`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 13, gap: 4 }}>
              <div style={{ fontSize: 24, opacity: 0.4 }}>🥧</div>
              <div>Chưa có dữ liệu chi phí</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Khoá lệnh có chi tiết nhiên liệu/đường để xem cơ cấu</div>
            </div>
          )}
        </div>
      </div>

      {/* Top trucks */}
      {!loading && topTrucks.length === 0 && (
        <div className="panel fade-up-3" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
            Top xe theo lợi nhuận – T{month}/{year}
          </div>
          <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 13, gap: 4 }}>
            <div style={{ fontSize: 24, opacity: 0.4 }}>🚚</div>
            <div>Chưa có xe nào có lệnh chốt sổ trong tháng này</div>
          </div>
        </div>
      )}
      {!loading && topTrucks.length > 0 && (
        <div className="panel fade-up-3" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
            Top xe theo lợi nhuận – T{month}/{year}
          </div>
          <ResponsiveContainer width="100%" height={Math.max(160, topTrucks.length * 44)}>
            <BarChart layout="vertical" data={topTrucks} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" tickFormatter={compactNum} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `${formatRawNumber(Number(v))} ₫`} />
              <Bar dataKey="LN gộp" fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
              <div className="pnl-row__amount">{formatRawNumber(transRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(transRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(transRevenue, transRevenueLY) : ''}`}>{prevReport ? yoyPct(transRevenue, transRevenueLY) : '—'}</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Thu nhập phạt vi phạm
                <div className="pnl-row__label-sub">Phạt vi phạm, điều chỉnh khác</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(otherRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(otherRevenueLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(otherRevenue, otherRevenueLY) : ''}`}>{prevReport ? yoyPct(otherRevenue, otherRevenueLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng doanh thu</div>
              <div className="pnl-row__amount">{formatRawNumber(totalRevenue)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(totalRevenueLY) : '—'}</div>
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
              <div className="pnl-row__amount">{formatRawNumber(fuelCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Tiền đi đường
                <div className="pnl-row__label-sub">Vé BOT cầu đường &amp; luật đường</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(roadCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row">
              <div className="pnl-row__label">
                Lương lái xe
                <div className="pnl-row__label-sub">Lương cơ bản + khoán chuyến + phụ cấp</div>
              </div>
              <div className="pnl-row__amount">{formatRawNumber(driverCost)}</div>
              <div className="pnl-row__yoy">—</div><div className="pnl-row__pct">—</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí vận hành</div>
              <div className="pnl-row__amount">{formatRawNumber(totalCosts)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(totalCostsLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(totalCosts, totalCostsLY) : ''}`}>{prevReport ? yoyPct(totalCosts, totalCostsLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.06), var(--surface))' }}>
              <div className="pnl-row__label" style={{ color: 'var(--success)', fontWeight: 700 }}>
                Lợi nhuận gộp · Biên {((grossProfit / (totalRevenue || 1)) * 100).toFixed(1)}%
              </div>
              <div className="pnl-row__amount" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatRawNumber(grossProfit)}</div>
              <div className="pnl-row__yoy" style={{ color: 'var(--success)' }}>{prevReport ? formatRawNumber(grossProfitLY) : '—'}</div>
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
              <div className="pnl-row__amount">{formatRawNumber(mgmtFee)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(mgmtFeeLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(mgmtFee, mgmtFeeLY) : ''}`}>{prevReport ? yoyPct(mgmtFee, mgmtFeeLY) : '—'}</div>
            </div>

            <div className="pnl-row pnl-row--subtotal">
              <div className="pnl-row__label">Tổng chi phí hoạt động</div>
              <div className="pnl-row__amount">{formatRawNumber(mgmtFee)}</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(mgmtFeeLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(mgmtFee, mgmtFeeLY) : ''}`}>{prevReport ? yoyPct(mgmtFee, mgmtFeeLY) : '—'}</div>
            </div>

            {/* FINAL NET PROFIT */}
            <div className="pnl-row pnl-row--final">
              <div className="pnl-row__label" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: 12 }}>
                Lợi nhuận ròng
              </div>
              <div className="pnl-row__amount">{formatRawNumber(netProfit)} ₫</div>
              <div className="pnl-row__yoy">{prevReport ? formatRawNumber(netProfitLY) : '—'}</div>
              <div className={`pnl-row__pct ${prevReport ? yoyClass(netProfit, netProfitLY) : ''}`}>{prevReport ? yoyPct(netProfit, netProfitLY) : '—'}</div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '14px 0 24px', lineHeight: 1.5 }}>
            * Lợi nhuận ròng kế toán: <strong>{formatRawNumber(netProfit)} ₫</strong>.
            {activeCapTable.length > 0
              ? <> Sau khi kết chuyển chia cổ đông: {activeCapTable.map((p, i) => <span key={i}>{i > 0 ? ' và ' : ''}<strong>{formatRawNumber(netProfit * p.pct / 100)} ₫</strong> cho {p.name} ({p.pct}%)</span>)}.</>
              : ' Chưa cấu hình bảng cổ phần.'
            }{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate('/profit'); }}
              style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}
            >
              Xem chi tiết cổ phần →
            </a>
          </p>

          {/* Per-truck breakdown table */}
          {report?.trucks && report.trucks.length > 0 && (
            <Panel
              title="Phân tích lãi gộp theo phương tiện"
              subtitle={`Hiệu suất vận tải chi tiết của ${report.trucks.length} đầu xe`}
              style={{ marginTop: 20 }}
              flush
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Biển số xe</th>
                      <th className="num">Lệnh</th>
                      <th className="num">Doanh thu chặng</th>
                      <th className="num">Tổng chi phí</th>
                      <th className="num">Lợi nhuận gộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.trucks.map(t => (
                      <tr key={t.plate}>
                        <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{t.plate}</td>
                        <td className="num">{t.trips}</td>
                        <td className="num">{formatRawNumber(t.revenue)}</td>
                        <td className="num">{formatRawNumber(t.costs)}</td>
                        <td className="num" style={{ color: t.profit >= 0 ? 'var(--brand)' : 'var(--danger)', fontWeight: 700 }}>
                          {formatRawNumber(t.profit)}
                        </td>
                      </tr>
                    ))}
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
