import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/format';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Truck, CalendarDays } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

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

const YEARS = [2024, 2025, 2026];

function now() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { month: cm, year: cy } = now();
  const [month, setMonth] = useState(cm);
  const [year, setYear] = useState(cy);
  const [report, setReport] = useState<PnlReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PnlReport>(`/reports/pnl?month=${month}&year=${year}`);
      setReport(data);
    } catch (e: any) {
      setError(e.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tài chính</h1>
          <p>Báo cáo doanh thu, chi phí, lợi nhuận</p>
        </div>
      </div>

      {/* Period picker */}
      <div className="section-gap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CalendarDays size={16} style={{ color: 'var(--fg-3)' }} />
        <select
          className="input"
          style={{ width: 140, height: 36 }}
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
        >
          {MONTHS.map((label, i) => (
            <option key={i} value={i + 1}>{label}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: 110, height: 36 }}
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--fg-3)', marginLeft: 8 }}>
          {report ? `${formatNumber(report.tripCount)} lệnh` : ''}
        </span>
      </div>

      {error && (
        <div className="card-shell" style={{ padding: 16, color: 'var(--danger)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
          Đang tải dữ liệu...
        </div>
      )}

      {!loading && report && (
        <>
          {/* Summary KPI cards */}
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <StatCard
              label="Doanh thu"
              value={report.totalRevenue}
              icon={<DollarSign size={16} />}
              color="var(--brand)"
            />
            <StatCard
              label="Chi phi"
              value={report.totalCosts}
              icon={<TrendingDown size={16} />}
              color="var(--danger)"
            />
            <StatCard
              label="Lợi nhuận gộp"
              value={report.grossProfit}
              icon={<TrendingUp size={16} />}
              color={report.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'}
            />
            <StatCard
              label="Lợi nhuận ròng"
              value={report.netProfit}
              icon={<BarChart3 size={16} />}
              color={report.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}
              bold
            />
          </div>

          {/* Secondary row: management fee + other income */}
          <div className="row-2" style={{ marginBottom: 20 }}>
            <div className="card-shell" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 6 }}>
                Phí quản lý
              </div>
              <div className="typo-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                {formatCurrency(report.managementFee)}
              </div>
            </div>
            <div className="card-shell" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 6 }}>
                Thu khác
              </div>
              <div className="typo-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                {formatCurrency(report.otherIncome)}
              </div>
            </div>
          </div>

          {/* Net profit highlight */}
          <div
            className="card-shell fade-up"
            style={{
              padding: '20px 24px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderLeft: `4px solid ${report.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}`,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 4 }}>
                LỢI NHUẬN RÒNG THÁNG {month}/{year}
              </div>
              <div
                className="typo-mono"
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: report.netProfit >= 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {formatCurrency(report.netProfit)}
              </div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-lg)',
              background: report.netProfit >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {report.netProfit >= 0
                ? <TrendingUp size={24} style={{ color: 'var(--success)' }} />
                : <TrendingDown size={24} style={{ color: 'var(--danger)' }} />
              }
            </div>
          </div>

          {/* Per-truck breakdown table */}
          <div className="card-shell fade-up-2">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={15} style={{ color: 'var(--fg-3)' }} />
                Chi tiết theo xe
              </h3>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {report.trucks.length} xe
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tt-table">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Biển số</th>
                    <th style={{ textAlign: 'right' }}>Lệnh</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu</th>
                    <th style={{ textAlign: 'right' }}>Chi phí</th>
                    <th style={{ textAlign: 'right' }}>Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {report.trucks.map(t => (
                    <tr key={t.plate}>
                      <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{t.plate}</td>
                      <td className="num">{t.trips}</td>
                      <td className="num">{formatCurrency(t.revenue)}</td>
                      <td className="num">{formatCurrency(t.costs)}</td>
                      <td className="num" style={{ color: t.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatCurrency(t.profit)}
                      </td>
                    </tr>
                  ))}
                  {report.trucks.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>
                        Không có dữ liệu xe
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Stat card sub-component ──────────────────────────────────────────────────

function StatCard({ label, value, icon, color, bold }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="stat-card" style={{ padding: '14px 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: '-0.01em' }}>
          {label}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius-md)',
          background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>
      <div
        className="typo-mono"
        style={{
          fontSize: bold ? 20 : 17,
          fontWeight: bold ? 800 : 700,
          color: bold ? color : 'var(--fg-1)',
        }}
      >
        {formatCurrency(value)}
      </div>
    </div>
  );
}
