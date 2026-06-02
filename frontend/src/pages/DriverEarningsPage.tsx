import { Wallet, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { PageHeader, Panel, KPI } from '../components/UI';
import { useSalaryPeriod, useDriverEarnings, useDriverPenalties } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';

interface EarningsSummary {
  baseSalary: string;
  tripIncome: string;
  penalties: string;
  netIncome: string;
  periodStart?: string;
  periodEnd?: string;
}

interface PenaltyEntry {
  id: number;
  amount: string;
  date: string;
  customReason: string | null;
  reasonText: string | null;
}

export default function DriverEarningsPage() {
  const { month, year } = useMonth();

  const { data: period } = useSalaryPeriod(month, year);
  const { data: earnings, isLoading: earningsLoading, error: earningsError } = useDriverEarnings(month, year);
  const penaltyParams = period ? { dateFrom: period.start, dateTo: period.end } : undefined;
  const { data: penaltiesData, isLoading: penaltiesLoading } = useDriverPenalties(penaltyParams);
  const penalties: PenaltyEntry[] = Array.isArray(penaltiesData) ? penaltiesData : (penaltiesData as any)?.items ?? [];
  const loading = earningsLoading || penaltiesLoading;
  const error = earningsError ? 'Không thể tải dữ liệu thu nhập' : null;

  if (loading) return (
    <Panel>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải dữ liệu thu nhập…</p>
      </div>
    </Panel>
  );

  if (error) return (
    <div>
      <PageHeader title="Thu nhập" description="Tổng hợp thu nhập và khấu trừ" />
      <div className="empty-state">
        <AlertTriangle size={36} style={{ color: 'var(--danger)', opacity: 0.7 }} />
        <h3 className="empty-state-title">{error}</h3>
        <p className="empty-state-desc">
          Hệ thống tạm thời không phản hồi. Vui lòng kéo xuống để làm mới, hoặc thử lại sau ít phút.
        </p>
      </div>
    </div>
  );

  if (!earnings) return null;

  const netNum = parseFloat(earnings.netIncome);
  const isPositive = netNum >= 0;
  const salaryNum = parseFloat(earnings.baseSalary);
  const tripIncomeNum = parseFloat(earnings.tripIncome);
  const penaltyNum = parseFloat(earnings.penalties);

  return (
    <div>
      <PageHeader
        title="Thu nhập"
        description="Tổng hợp thu nhập và khấu trừ"
      />

      {/* Net income hero card */}
      <div className="panel fade-up earnings-hero" style={{
        marginBottom: 12,
        overflow: 'hidden',
        border: isPositive ? '1px solid var(--success)' : '1px solid var(--danger)',
      }}>
        <div className="earnings-hero__inner" style={{
          padding: '24px 24px 20px',
          background: isPositive
            ? 'linear-gradient(135deg, var(--success-soft) 0%, var(--bg-2) 100%)'
            : 'linear-gradient(135deg, var(--danger-soft) 0%, var(--bg-2) 100%)',
        }}>
          <div className="earnings-hero__row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="earnings-hero__label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Thu nhập thực tế
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span className="earnings-hero__value" style={{
                  fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
                  fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                  color: isPositive ? 'var(--success-text)' : 'var(--danger-text)',
                }}>
                  {formatCurrency(earnings.netIncome)}
                </span>
              </div>
              <p className="earnings-hero__sub" style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                = Lương cơ bản + Thu nhập sản lượng - Khấu trừ
              </p>
            </div>
            <div className="earnings-hero__icon" style={{
              width: 52, height: 52, borderRadius: 'var(--radius-lg)',
              background: isPositive ? 'var(--success-soft)' : 'var(--danger-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
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
        <KPI label="Lương cơ bản" value={formatCurrency(earnings.baseSalary)} icon={Wallet} />
        <KPI label="Thu nhập sản lượng" value={formatCurrency(earnings.tripIncome)} icon={DollarSign} variant="success" />
        <KPI
          label="Khấu trừ"
          value={penaltyNum > 0 ? `-${formatCurrency(earnings.penalties)}` : '0 ₫'}
          icon={TrendingDown}
          variant={penaltyNum > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Penalties list */}
      <Panel
        title="Lịch sử khấu trừ"
        subtitle={`${penalties.length} khoản khấu trừ`}
        style={{ marginTop: 16 }}
        flush
      >
        {penalties.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <img src="/assets/illustrations/empty-earnings.svg" alt="" aria-hidden="true" style={{ width: 140, height: 116, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <p style={{ margin: 0 }}>Chưa có khoản khấu trừ nào</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {penalties.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 20px',
                  borderBottom: i < penalties.length - 1 ? '1px solid var(--border-1)' : 'none',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--danger-soft)', color: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>
                    {p.reasonText || p.customReason || 'Vi phạm nội quy'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} />
                    {formatDate(p.date)}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  -{formatCurrency(p.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
