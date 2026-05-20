import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';

interface EarningsSummary {
  baseSalary: string;
  tripIncome: string;
  penalties: string;
  netIncome: string;
}

interface PenaltyEntry {
  id: number;
  amount: string;
  date: string;
  customReason: string | null;
  reasonText: string | null;
}

export default function DriverEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [penalties, setPenalties] = useState<PenaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<EarningsSummary>('/driver/me/earnings'),
      api.get<{ items: PenaltyEntry[] }>('/driver/me/penalties'),
    ])
      .then(([e, p]) => { setEarnings(e); setPenalties(p.items); })
      .catch(() => setError('Không thể tải dữ liệu thu nhập'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="card-shell" style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
      <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
      <p style={{ marginTop: 8 }}>Đang tải dữ liệu thu nhập...</p>
    </div>
  );

  if (error) return (
    <div className="card-shell" style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
  );

  if (!earnings) return null;

  const netNum = parseFloat(earnings.netIncome);
  const isPositive = netNum >= 0;
  const salaryNum = parseFloat(earnings.baseSalary);
  const tripIncomeNum = parseFloat(earnings.tripIncome);
  const penaltyNum = parseFloat(earnings.penalties);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Thu nhập</h1>
          <p>Tổng hợp thu nhập và khấu trừ</p>
        </div>
      </div>

      {/* Net income hero card */}
      <div className="card-shell fade-up" style={{
        marginBottom: 12,
        overflow: 'hidden',
        border: isPositive ? '1px solid var(--success)' : '1px solid var(--danger)',
      }}>
        <div style={{
          padding: '24px 24px 20px',
          background: isPositive
            ? 'linear-gradient(135deg, var(--success-soft) 0%, var(--bg-2) 100%)'
            : 'linear-gradient(135deg, var(--danger-soft) 0%, var(--bg-2) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Thu nhập thực tế
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
                  fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                  color: isPositive ? 'var(--success-text)' : 'var(--danger-text)',
                }}>
                  {formatCurrency(earnings.netIncome)}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                = Lương cơ bản + Thu nhập sản lượng - Khấu trừ
              </p>
            </div>
            <div style={{
              width: 52, height: 52, borderRadius: 'var(--radius-lg)',
              background: isPositive ? 'var(--success-soft)' : 'var(--danger-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPositive
                ? <TrendingUp size={24} style={{ color: 'var(--success)' }} />
                : <TrendingDown size={24} style={{ color: 'var(--danger)' }} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="kpi-grid fade-up-2">
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={14} style={{ color: 'var(--info)' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lương cơ bản</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: 'auto', paddingBottom: 12 }}>
            {formatCurrency(earnings.baseSalary)}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} style={{ color: 'var(--brand)' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Thu nhập sản lượng</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', marginTop: 'auto', paddingBottom: 12 }}>
            {formatCurrency(earnings.tripIncome)}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Khấu trừ</span>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700,
            color: penaltyNum > 0 ? 'var(--danger-text)' : 'var(--fg-1)',
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            marginTop: 'auto', paddingBottom: 12,
          }}>
            {penaltyNum > 0 ? '-' : ''}{formatCurrency(earnings.penalties)}
          </div>
        </div>
      </div>

      {/* Penalties list */}
      <div className="card-shell fade-up-2" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <h3>Lịch sử khấu trừ</h3>
            <p>{penalties.length} khoản khấu trừ</p>
          </div>
        </div>
        {penalties.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p>Chua co khoản khấu trừ nao</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tt-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Ngày</th>
                  <th>Lý do</th>
                  <th style={{ textAlign: 'right' }}>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((p, i) => (
                  <tr key={p.id}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} style={{ color: 'var(--fg-3)' }} />
                        {formatDate(p.date)}
                      </span>
                    </td>
                    <td>{p.reasonText || p.customReason || '—'}</td>
                    <td className="num" style={{ color: 'var(--danger-text)', fontWeight: 600 }}>
                      -{formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
