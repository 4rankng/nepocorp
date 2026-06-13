import { useRef, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../lib/format';
import { PageHeader, Panel, KPI } from '../components/UI';
import { useSalaryPeriod, useDriverEarnings, useDriverPenalties } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';
import { usePageAnimations, useCounterAnimation } from '../hooks/animations';
import type { CounterTarget } from '../hooks/animations';

interface EarningsSummary {
  baseSalary: string;
  tripIncome: string;
  penalties: string;
  netIncome: string;
  // Optional fields from attendance system (when available)
  adjustment?: number;
  supplementPay?: number;
  leaveDeduction?: number;
  standardWorkDays?: number;
  paidDays?: number;
  dailyRate?: number;
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
  const { rootRef } = usePageAnimations({ ready: !loading });
  const heroValueRef = useRef<HTMLSpanElement>(null);
  const { animateCounters } = useCounterAnimation({ delay: 100 });

  useEffect(() => {
    if (!earnings || !heroValueRef.current) return;
    const net = parseFloat(earnings.netIncome);
    animateCounters([
      { el: heroValueRef.current, value: Math.abs(net), prefix: net < 0 ? '-' : '' },
    ]);
  }, [earnings, animateCounters]);

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
    <div ref={rootRef}>
      <PageHeader
        title="Thu nhập"
        description="Tổng hợp thu nhập và khấu trừ"
      />

      {/* Net income hero card */}
      <div className={`panel fade-up earnings-hero ${isPositive ? 'earnings-hero--positive' : 'earnings-hero--negative'}`}>
        <div className="earnings-hero__inner">
          <div className="earnings-hero__row">
            <div className="earnings-hero__content">
              <p className="earnings-hero__label">
                Thu nhập thực tế
              </p>
              <div className="earnings-hero__value-container">
                <span className="earnings-hero__value">
                  <span ref={heroValueRef}>{formatNumber(earnings.netIncome)}</span>{' '}
                  <span className="earnings-hero__unit">₫</span>
                </span>
              </div>
            </div>
            <div className="earnings-hero__icon">
              {isPositive
                ? <TrendingUp size={24} style={{ color: '#fff' }} />
                : <TrendingDown size={24} style={{ color: '#fff' }} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown cards */}
      <div className="kpi-grid fade-up-2">
        <KPI label="Lương cơ bản" value={formatNumber(earnings.baseSalary)} unit="₫" icon={Wallet} compact />
        {earnings.adjustment !== undefined && earnings.adjustment !== 0 && (
          <KPI
            label={earnings.adjustment > 0 ? 'Thưởng công thêm' : 'Trừ công thiếu'}
            value={(earnings.adjustment > 0 ? '+' : '') + formatNumber(Math.abs(earnings.adjustment))}
            unit="₫"
            icon={earnings.adjustment > 0 ? TrendingUp : TrendingDown}
            variant={earnings.adjustment > 0 ? 'success' : 'danger'}
            compact
          />
        )}
        <KPI
          label="Khấu trừ kỷ luật"
          value={penaltyNum > 0 ? `-${formatNumber(earnings.penalties)}` : '0'}
          unit="₫"
          icon={TrendingDown}
          variant={penaltyNum > 0 ? 'danger' : 'default'}
          compact
        />
      </div>
      {/* Work day info when available */}
      {earnings.standardWorkDays !== undefined && (
        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-2)', border: '1px solid var(--border-1)', fontSize: 12, color: 'var(--fg-3)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Công chuẩn: <strong style={{ color: 'var(--fg-2)' }}>{earnings.standardWorkDays} ngày</strong></span>
          {earnings.paidDays !== undefined && <span>Công hưởng lương: <strong style={{ color: 'var(--fg-2)' }}>{earnings.paidDays} ngày</strong></span>}
          {earnings.dailyRate !== undefined && earnings.dailyRate > 0 && <span>Đơn giá ngày: <strong style={{ color: 'var(--fg-2)' }}>{formatNumber(earnings.dailyRate)} ₫</strong></span>}
        </div>
      )}

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
