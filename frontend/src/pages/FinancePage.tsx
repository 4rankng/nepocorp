import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatNumber } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { CalendarDays } from 'lucide-react';
import { PageHeader, Panel } from '../components/UI';
import type { CapTableHistory, PaginatedResponse } from '@nepocorp/shared';

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

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  // Cap table partner split for footnote
  const activeCapTable = capTable.length > 0
    ? capTable.map(c => ({ name: c.partner_name, pct: parseFloat(c.percentage) }))
    : [];

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, rowGap: 8, marginBottom: 20 }}>
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

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tổng hợp báo cáo tài chính chặng...
        </div>
      ) : (
        <>
          {/* P&L Table with real data */}
          <div className="pnl-table" style={{ marginBottom: 24 }}>
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
