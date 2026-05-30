import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getActiveCapTable } from '../lib/cap-table';
import { formatNumber } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { CalendarDays } from 'lucide-react';
import { PageHeader, Panel } from '../components/UI';
import { usePnlReport, useYearlyPnl, useTripCosts, useCapTable } from '../hooks/useQueries';

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

function formatRawNumber(num: number | string | null): string {
  return formatNumber(num);
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

  const { data: reportRaw, isLoading: loading, error: queryError } = usePnlReport(month, year);
  const report = reportRaw as unknown as PnlReport | undefined;

  const { data: prevYearReportRaw } = useQuery<PnlReport | null>({
    queryKey: ['pnl', month, year - 1],
    queryFn: () => api.get<PnlReport>(`/reports/pnl?month=${month}&year=${year - 1}`).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
  const prevReport = prevYearReportRaw as unknown as PnlReport | null | undefined;

  const { data: tripCostsRaw = [] } = useTripCosts(month, year);
  const { data: capTableRaw = [] } = useCapTable();
  const { data: yearlyData = [], isLoading: yearlyLoading } = useYearlyPnl(year);

  const error = queryError ? (queryError as any).message || 'Không thể tải báo cáo' : null;

  const fuelCost = tripCostsRaw.reduce((s, t) => s + parseFloat((t as any).total_fuel_cost || '0'), 0);
  const roadCost = tripCostsRaw.reduce((s, t) => s + parseFloat((t as any).total_road_allowance || '0'), 0);
  const driverCost = tripCostsRaw.reduce((s, t) => s + parseFloat((t as any).driver_salary || '0'), 0);

  const totalRevenue = report?.totalRevenue ?? 0;
  const otherRevenue = report?.otherIncome ?? 0;
  const transRevenue = Math.max(0, totalRevenue - otherRevenue);
  const totalCosts = report?.totalCosts ?? 0;
  const grossProfit = report?.grossProfit ?? (totalRevenue - totalCosts);
  const mgmtFee = report?.managementFee ?? 0;
  const netProfit = report?.netProfit ?? (grossProfit - mgmtFee + otherRevenue);

  const totalRevenueLY = prevReport?.totalRevenue ?? 0;
  const otherRevenueLY = prevReport?.otherIncome ?? 0;
  const transRevenueLY = Math.max(0, totalRevenueLY - otherRevenueLY);
  const totalCostsLY = prevReport?.totalCosts ?? 0;
  const grossProfitLY = prevReport?.grossProfit ?? (totalRevenueLY - totalCostsLY);
  const mgmtFeeLY = prevReport?.managementFee ?? 0;
  const netProfitLY = prevReport?.netProfit ?? (grossProfitLY - mgmtFeeLY + otherRevenueLY);

  const activeCapTable = getActiveCapTable(capTableRaw, [])
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
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }} className="fade-up-3">
        {/* Revenue trend */}
        <div className="panel" style={{ padding: '16px 20px', flex: '2 1 400px', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 12 }}>
            Xu hướng doanh thu {year}
          </div>
          {yearlyLoading ? (
            <div style={{ height: 200, background: 'var(--bg-2)', borderRadius: 6 }} />
          ) : revenueChartData.every(d => d['Doanh thu'] === 0 && d['LN gộp'] === 0) ? (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', fontSize: 13, gap: 4 }}>
              <div style={{ fontSize: 24, opacity: 0.4 }}>📊</div>
              <div>Chưa có lệnh chốt sổ trong năm {year}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Khoá lệnh để xem xu hướng doanh thu hàng tháng</div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              {(() => {
                const w = 600;
                const h = 220;
                const padL = 44, padR = 8, padT = 8, padB = 36;
                const plotW = w - padL - padR, plotH = h - padT - padB;
                const max = Math.max(
                  1,
                  ...revenueChartData.flatMap((d) => [d['Doanh thu'] as number, d['LN gộp'] as number]),
                );
                const niceMax = Math.ceil(max / 10_000_000) * 10_000_000;
                const xStep = plotW / revenueChartData.length;
                const barW = Math.min(16, (xStep - 6) / 2);
                const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => niceMax * t);
                return (
                  <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Xu hướng doanh thu">
                    {ticks.map((tv, i) => {
                      const y = padT + plotH - (tv / niceMax) * plotH;
                      return (
                        <g key={i}>
                          <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--line)" strokeDasharray={i === 0 ? undefined : '2 4'} />
                          <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="var(--fg-3)">{compactNum(tv)}</text>
                        </g>
                      );
                    })}
                    {revenueChartData.map((d, i) => {
                      const cx = padL + i * xStep + xStep / 2;
                      const rev = d['Doanh thu'] as number;
                      const gp = d['LN gộp'] as number;
                      const revH = (rev / niceMax) * plotH;
                      const gpH = (gp / niceMax) * plotH;
                      return (
                        <g key={i}>
                          <rect x={cx - barW - 1} y={padT + plotH - revH} width={barW} height={revH} fill="#3b82f6" rx={2} />
                          <rect x={cx + 1} y={padT + plotH - gpH} width={barW} height={gpH} fill="#10b981" rx={2} />
                          <text x={cx} y={h - padB + 16} textAnchor="middle" fontSize="11" fill="var(--fg-3)">{d.name as string}</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
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
            <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', gap: 16 }}>
              {(() => {
                const total = costPieData.reduce((s, d) => s + d.value, 0) || 1;
                const cx = 90, cy = 90, rOuter = 70, rInner = 42;
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
                    <svg width={180} height={180} role="img" aria-label="Cơ cấu chi phí">
                      {arcs.map((a, i) => <path key={i} d={a.path} fill={a.fill} />)}
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      {arcs.map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, background: a.fill, borderRadius: 2, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{a.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatRawNumber(a.value)} ₫</span>
                          <span style={{ color: 'var(--fg-3)' }}>{a.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
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
          {(() => {
            const maxProfit = Math.max(...topTrucks.map(t => t['LN gộp']), 1);
            const svgH = Math.max(120, topTrucks.length * 36);
            return (
              <svg width="100%" height={svgH} viewBox={`0 0 400 ${svgH}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Top xe theo lợi nhuận">
                {topTrucks.map((t, i) => {
                  const w = (t['LN gộp'] / maxProfit) * 250;
                  return (
                    <g key={i} transform={`translate(0, ${i * 36})`}>
                      <text x={0} y={16} fontSize={12} fill="var(--fg-2)">{t.name}</text>
                      <rect x={90} y={4} width={w} height={20} fill="#6366f1" rx={3} />
                      <text x={90 + w + 8} y={19} fontSize={11} fill="var(--fg-2)">{formatRawNumber(t['LN gộp'])} ₫</text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
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
