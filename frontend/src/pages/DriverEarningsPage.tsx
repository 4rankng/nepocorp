import { useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../lib/format';
import { PageHeader } from '../components/UI';
import { useSalaryPeriod, useDriverEarnings, useDriverPenalties, useDriverVehicleAlerts } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';
import { usePageAnimations, useCounterAnimation } from '../hooks/animations';
import type { CounterTarget } from '../hooks/animations';
import './DriverEarningsPage.css';

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
  // N5 / B4: truck compliance/service reminders (overdue/due). Fetched
  // unconditionally; the section is only rendered when there's at least one
  // non-'ok' alert, so drivers with everything in order see nothing.
  const { data: vehicleAlertsData } = useDriverVehicleAlerts();
  const vehicleAlerts = vehicleAlertsData?.items ?? [];
  const rawPenalties = Array.isArray(penaltiesData)
    ? penaltiesData
    : (penaltiesData && !Array.isArray(penaltiesData) && 'items' in penaltiesData ? penaltiesData.items : []);
  const penalties: PenaltyEntry[] = rawPenalties.map((p) => ({
    id: p.id,
    amount: p.amount,
    date: p.date,
    customReason: p.customReason ?? null,
    reasonText: p.reasonText ?? null,
  }));
  const loading = earningsLoading || penaltiesLoading;
  const error = earningsError ? 'Không thể tải dữ liệu thu nhập' : null;
  const { rootRef } = usePageAnimations({ ready: !loading });
  const heroValueRef = useRef<HTMLSpanElement>(null);
  const kpiRefs = useRef<{
    baseSalary: HTMLSpanElement | null;
    adjustment: HTMLSpanElement | null;
    penalties: HTMLSpanElement | null;
    productionSalary: HTMLSpanElement | null;
    roadAllowance: HTMLSpanElement | null;
    payableBalance: HTMLSpanElement | null;
  }>({ baseSalary: null, adjustment: null, penalties: null, productionSalary: null, roadAllowance: null, payableBalance: null });
  const { animateCounters } = useCounterAnimation({ delay: 100 });

  useEffect(() => {
    if (!earnings) return;
    const targets: CounterTarget[] = [];
    const salaryNum = parseFloat(earnings.baseSalary);
    const penaltyNum = parseFloat(earnings.penalties);

    if (heroValueRef.current) {
      const net = parseFloat(earnings.netIncome);
      targets.push({ el: heroValueRef.current, value: Math.abs(net), prefix: net < 0 ? '-' : '' });
    }
    if (kpiRefs.current.baseSalary) targets.push({ el: kpiRefs.current.baseSalary, value: salaryNum });
    // F2 / B2 — trip-income cards always animate (headline breakdown).
    const productionNum = parseFloat(earnings.productionSalary);
    const roadNum = parseFloat(earnings.roadAllowance);
    const payableNum = parseFloat(earnings.payableBalance);
    if (kpiRefs.current.productionSalary) targets.push({ el: kpiRefs.current.productionSalary, value: productionNum });
    if (kpiRefs.current.roadAllowance) targets.push({ el: kpiRefs.current.roadAllowance, value: roadNum });
    if (kpiRefs.current.payableBalance) targets.push({ el: kpiRefs.current.payableBalance, value: Math.abs(payableNum), prefix: payableNum < 0 ? '-' : '' });
    if (penaltyNum > 0 && kpiRefs.current.penalties) targets.push({ el: kpiRefs.current.penalties, value: penaltyNum });
    if (earnings.adjustment !== undefined && earnings.adjustment !== 0 && kpiRefs.current.adjustment) {
      targets.push({ el: kpiRefs.current.adjustment, value: Math.abs(earnings.adjustment), prefix: earnings.adjustment > 0 ? '+' : '-' });
    }
    if (targets.length > 0) animateCounters(targets);
  }, [earnings, animateCounters]);

  if (loading) return (
    <div className="driver-earnings-page">
      <PageHeader title="Thu nhập" description="Tổng hợp thu nhập và khấu trừ" />
      <div className="earnings-loading">
        <Loader2 size={20} className="spin" />
        <p>Đang tải dữ liệu thu nhập…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="driver-earnings-page">
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
  const penaltyNum = parseFloat(earnings.penalties);

  return (
    <div ref={rootRef} className="driver-earnings-page">
      <PageHeader
        title="Thu nhập"
        description="Tổng hợp thu nhập và khấu trừ"
      />

      {/* ═══ N5 / B4 — Vehicle reminders (only when overdue/due) ═══ */}
      {vehicleAlerts.length > 0 && (
        <div className="vehicle-alerts-strip fade-up" role="status" aria-live="polite">
          <div className="vehicle-alerts-strip__head">
            <AlertTriangle size={16} />
            <span className="vehicle-alerts-strip__title">Nhắc nhở xe</span>
          </div>
          <ul className="vehicle-alerts-strip__list">
            {vehicleAlerts.map(a => (
              <li
                key={a.field}
                className={`vehicle-alerts-strip__item vehicle-alerts-strip__item--${a.status}`}
              >
                <span className="vehicle-alerts-strip__label">{a.label}</span>
                <span className="vehicle-alerts-strip__date">{formatDate(a.date)}</span>
                <span className="vehicle-alerts-strip__days">
                  {a.daysUntil < 0
                    ? `Quá hạn ${Math.abs(a.daysUntil)} ngày`
                    : `Còn ${a.daysUntil} ngày`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ Zone 1 — Gradient Hero Card ═══ */}
      <div className={`earnings-hero-bento fade-up ${isPositive ? 'earnings-hero-bento--positive' : 'earnings-hero-bento--negative'}`}>
        <div className="earnings-hero-bento__content">
          <p className="earnings-hero-bento__eyebrow">Thu nhập thực tế</p>
          <div className="earnings-hero-bento__amount">
            <span ref={heroValueRef}>{formatNumber(earnings.netIncome)}</span>
            <span className="earnings-hero-bento__currency">đ</span>
          </div>
        </div>
        <div className="earnings-hero-bento__icon">
          {isPositive
            ? <TrendingUp size={24} color="#fff" />
            : <TrendingDown size={24} color="#fff" />
          }
        </div>
        <div className="earnings-hero-bento__watermark">
          <DollarSign size={120} />
        </div>
      </div>

      {/* ═══ F2 / B2 — Trip income: production pay · road allowance · payable ═══ */}
      <div className="earnings-kpi-grid fade-up-2">
        <div className="earnings-kpi-card">
          <span className="earnings-kpi-card__label">Lương sản xuất</span>
          <span className="earnings-kpi-card__value">
            <span ref={(el) => { kpiRefs.current.productionSalary = el; }}>{formatNumber(earnings.productionSalary)}</span>
            <span className="earnings-kpi-card__unit">đ</span>
          </span>
        </div>
        <div className="earnings-kpi-card">
          <span className="earnings-kpi-card__label">Tiền đi đường</span>
          <span className="earnings-kpi-card__value">
            <span ref={(el) => { kpiRefs.current.roadAllowance = el; }}>{formatNumber(earnings.roadAllowance)}</span>
            <span className="earnings-kpi-card__unit">đ</span>
          </span>
        </div>
        <div className={`earnings-kpi-card ${parseFloat(earnings.payableBalance) > 0 ? 'earnings-kpi-card--success' : ''}`}>
          <span className="earnings-kpi-card__label">Còn được nhận</span>
          <span className="earnings-kpi-card__value">
            <span ref={(el) => { kpiRefs.current.payableBalance = el; }}>{formatNumber(earnings.payableBalance)}</span>
            <span className="earnings-kpi-card__unit">đ</span>
          </span>
        </div>
      </div>

      {/* ═══ Zone 2 — KPI Grid ═══ */}
      <div className="earnings-kpi-grid fade-up-2">
        <div className="earnings-kpi-card">
          <span className="earnings-kpi-card__label">Lương cơ bản</span>
          <span className="earnings-kpi-card__value">
            <span ref={(el) => { kpiRefs.current.baseSalary = el; }}>{formatNumber(earnings.baseSalary)}</span>
            <span className="earnings-kpi-card__unit">đ</span>
          </span>
        </div>
        {earnings.adjustment !== undefined && earnings.adjustment !== 0 && (
          <div className={`earnings-kpi-card ${earnings.adjustment > 0 ? 'earnings-kpi-card--success' : 'earnings-kpi-card--danger'}`}>
            <span className="earnings-kpi-card__label">
              {earnings.adjustment > 0 ? 'Thưởng công thêm' : 'Trừ công thiếu'}
            </span>
            <span className="earnings-kpi-card__value">
              <span ref={(el) => { kpiRefs.current.adjustment = el; }}>
                {earnings.adjustment > 0 ? '+' : '-'}{formatNumber(Math.abs(earnings.adjustment))}
              </span>
              <span className="earnings-kpi-card__unit">đ</span>
            </span>
          </div>
        )}
        <div className={`earnings-kpi-card ${penaltyNum > 0 ? 'earnings-kpi-card--danger' : ''}`}>
          <span className="earnings-kpi-card__label">Khấu trừ kỷ luật</span>
          <span className="earnings-kpi-card__value">
            <span ref={(el) => { kpiRefs.current.penalties = el; }}>
              {penaltyNum > 0 ? `-${formatNumber(earnings.penalties)}` : '0'}
            </span>
            <span className="earnings-kpi-card__unit">đ</span>
          </span>
        </div>
      </div>

      {/* ═══ Zone 3 — Work-day Strip ═══ */}
      {earnings.standardWorkDays !== undefined && (
        <div className="earnings-workday-strip fade-up-3">
          <span>Công chuẩn: <strong>{earnings.standardWorkDays} ngày</strong></span>
          {earnings.paidDays !== undefined && (
            <span>Công hưởng lương: <strong>{earnings.paidDays} ngày</strong></span>
          )}
          {earnings.dailyRate !== undefined && earnings.dailyRate > 0 && (
            <span>Đơn giá ngày: <strong>{formatNumber(earnings.dailyRate)} đ</strong></span>
          )}
        </div>
      )}

      {/* ═══ Zone 4 — Penalties Panel ═══ */}
      <div className="earnings-penalties-panel fade-up-3">
        <div className="earnings-penalties-panel__header">
          <span className="earnings-penalties-panel__title">Lịch sử khấu trừ</span>
          <span className="earnings-penalties-panel__count">{penalties.length} khoản khấu trừ</span>
        </div>
        {penalties.length === 0 ? (
          <div className="earnings-penalties-empty">
            <img
              src="/assets/illustrations/empty-earnings.svg"
              alt=""
              aria-hidden="true"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p>Chưa có khoản khấu trừ nào</p>
          </div>
        ) : (
          penalties.map((p) => (
            <div key={p.id} className="earnings-penalty-row">
              <div className="earnings-penalty-row__icon">
                <AlertTriangle size={14} />
              </div>
              <div className="earnings-penalty-row__content">
                <div className="earnings-penalty-row__reason">
                  {p.reasonText || p.customReason || 'Vi phạm nội quy'}
                </div>
                <div className="earnings-penalty-row__date">
                  <Calendar size={11} />
                  {formatDate(p.date)}
                </div>
              </div>
              <div className="earnings-penalty-row__amount">
                -{formatCurrency(p.amount)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
