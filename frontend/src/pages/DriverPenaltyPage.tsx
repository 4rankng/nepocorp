import { useState, useMemo } from 'react';
import { PenaltyStatus } from '@tingting/shared';
import { formatCurrency, formatDate } from '../lib/format';
import { ShieldCheck, AlertTriangle, AlertOctagon, Loader2, Calendar, Truck } from 'lucide-react';
import { PageHeader } from '../components/UI';
import { useSalaryPeriod, useDriverPenalties } from '../hooks/useQueries';
import { usePageAnimations, useListAnimations } from '../hooks/animations';
import './DriverPenaltyPage.css';

interface DriverPenaltyRow {
  id: number;
  driverId: number;
  tripId: number | null;
  tripCode?: string | null;
  reasonId: number | null;
  customReason: string | null;
  amount: string;
  date: string;
  status?: PenaltyStatus;
  reasonText?: string;
}

export default function DriverPenaltyPage() {
  const [monthFilter, setMonthFilter] = useState('');

  const { data: allPenaltiesData, isLoading: loading, error: penaltiesError, refetch: refetchPenalties } = useDriverPenalties();
  const allPenalties = useMemo((): DriverPenaltyRow[] => {
    if (Array.isArray(allPenaltiesData)) return allPenaltiesData;
    if (allPenaltiesData && 'items' in allPenaltiesData) return allPenaltiesData.items;
    return [];
  }, [allPenaltiesData]);
  const { rootRef } = usePageAnimations({ ready: !loading });

  const filterMonthNum = monthFilter ? parseInt(monthFilter.split('-')[1]) : 0;
  const filterYearNum = monthFilter ? parseInt(monthFilter.split('-')[0]) : 0;
  const { data: filterPeriod, isLoading: filterPeriodLoading, error: filterPeriodError, refetch: refetchFilterPeriod } = useSalaryPeriod(filterMonthNum, filterYearNum);

  const filteredPenalties = useMemo((): DriverPenaltyRow[] => {
    if (!monthFilter) return allPenalties;
    if (!filterPeriod) return [];
    return allPenalties.filter(p => p.date >= filterPeriod.start && p.date <= filterPeriod.end);
  }, [monthFilter, filterPeriod, allPenalties]);
  const { rootRef: listRef } = useListAnimations({ itemSelector: '.penalty-violation-row', mode: 'rows', deps: [filteredPenalties] });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthLabel = `T${currentMonth}/${currentYear}`;

  const { data: currentPeriod, isLoading: periodLoading, error: currentPeriodError, refetch: refetchCurrentPeriod } = useSalaryPeriod(currentMonth, currentYear);

  const monthPenalties = useMemo(() => {
    if (!currentPeriod) return [] as DriverPenaltyRow[];
    return allPenalties.filter(p => {
      const d = p.date || '';
      return p.status !== PenaltyStatus.CANCELED && d >= currentPeriod.start && d <= currentPeriod.end;
    });
  }, [allPenalties, currentPeriod]);
  const totalMonthAmount = monthPenalties.reduce((s, p) => s + parseFloat(p.amount), 0);
  const incidentCount = monthPenalties.length;
  const isSafeThisMonth = incidentCount === 0;

  const isLoadingPeriod = loading || periodLoading;
  const summaryError = penaltiesError || currentPeriodError;
  const listLoading = loading || Boolean(monthFilter && filterPeriodLoading);
  const listError = penaltiesError || (monthFilter && filterPeriodError);

  return (
    <div ref={rootRef} className="driver-penalty-page">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <PageHeader title="Kỷ luật của tôi" description="Lịch sử vi phạm và khấu trừ lương của bạn" iconName="alert" />

      {/* ── Summary row (NEPO-23 — former status banner + 3 KPI cards folded
             into one ≤80px strip; the two figures that matter — this month's
             violations and the salary deduction — live here, and the static
             all-time count only exists as the ledger card title below) ──── */}
      {summaryError ? (
        <div className="penalty-loading-banner" role="alert">
          <AlertTriangle size={16} />
          <span>Không thể tải dữ liệu kỷ luật.</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => { void refetchPenalties(); void refetchCurrentPeriod(); }}>Thử lại</button>
        </div>
      ) : isLoadingPeriod ? (
        <div className="penalty-loading-banner">
          <Loader2 size={16} className="spin" />
          Đang tải dữ liệu kỳ lương...
        </div>
      ) : (
        <div className={`penalty-status-banner ${isSafeThisMonth ? 'penalty-status-banner--safe' : 'penalty-status-banner--violation'}`}>
          <div className="penalty-status-banner__icon">
            {isSafeThisMonth ? <ShieldCheck size={20} /> : <AlertOctagon size={20} />}
          </div>
          <div className="penalty-status-banner__text">
            <div className="penalty-status-banner__title">
              {isSafeThisMonth ? `Không vi phạm ${monthLabel}` : `${incidentCount} vi phạm ${monthLabel}`}
            </div>
            <div className="penalty-status-banner__subtitle">
              {isSafeThisMonth
                ? 'Bạn đang chấp hành tốt nội quy công ty. Tiếp tục phát huy!'
                : 'Khấu trừ trực tiếp vào lương tháng này'
              }
            </div>
          </div>
          <div className="penalty-status-banner__figures">
            <span className="fig">
              <strong>{incidentCount}</strong> vụ vi phạm
            </span>
            <span className="fig-sep">·</span>
            <span className="fig">
              <strong>{totalMonthAmount > 0 ? formatCurrency(totalMonthAmount) : '0 ₫'}</strong> khấu trừ
            </span>
          </div>
        </div>
      )}

      {/* ── Zone 3: Violations data card ───────────────────────────────────── */}
      <div className="penalty-data-card">
        <div className="penalty-data-card__header">
          <span className="penalty-data-card__title">
            Sổ vi phạm{!listLoading && !listError && ` · ${filteredPenalties.length}`}
          </span>
          <select
            className="input penalty-month-select"
            aria-label="Lọc kỷ luật theo tháng"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
          >
            <option value="">Tất cả thời gian</option>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setDate(1);
              d.setMonth(d.getMonth() - i);
              const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              return <option key={value} value={value}>Tháng {d.getMonth() + 1}/{d.getFullYear()}</option>;
            })}
          </select>
        </div>

        {listError ? (
          <div className="penalty-empty-state" role="alert">
            <p className="penalty-empty-state__title">Không thể tải sổ vi phạm</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => { void refetchPenalties(); if (monthFilter) void refetchFilterPeriod(); }}>Tải lại sổ vi phạm</button>
          </div>
        ) : listLoading ? (
          <div className="penalty-empty-state">
            <Loader2 size={24} className="spin" />
            <p className="penalty-empty-state__loading-text">Đang tải…</p>
          </div>
        ) : filteredPenalties.length === 0 ? (
          <div className="penalty-empty-state">
            <div className="penalty-empty-state__icon">
              <ShieldCheck size={32} />
            </div>
            <p className="penalty-empty-state__title">Không có biên bản vi phạm</p>
            <p className="penalty-empty-state__desc">
              {monthFilter ? 'Không có vi phạm trong khoảng thời gian này.' : 'Bạn chưa có biên bản vi phạm nào.'}
            </p>
          </div>
        ) : (
          <div ref={listRef} className="penalty-violation-list">
            {filteredPenalties.map(p => (
              <div key={p.id} className="penalty-violation-row">
                <div className="penalty-violation-row__icon">
                  <AlertTriangle size={16} />
                </div>
                <div className="penalty-violation-row__content">
                  <div className="penalty-violation-row__top">
                    <div className="penalty-violation-row__reason">
                      {p.reasonText || p.customReason || 'Vi phạm nội quy'}
                    </div>
                    <div className="penalty-violation-row__amount">
                      {p.status === PenaltyStatus.CANCELED
                        ? <s>{formatCurrency(Number(p.amount))}</s>
                        : <>-{formatCurrency(Number(p.amount))}</>}
                    </div>
                  </div>
                  <div className="penalty-violation-row__meta">
                    {p.status === PenaltyStatus.CANCELED && <span>Đã hủy · Không khấu trừ</span>}
                    <span><Calendar size={12} /> {formatDate(p.date)}</span>
                    {p.tripId && p.tripCode && <span><Truck size={12} /> {p.tripCode}</span>}
                  </div>
                  {p.customReason && p.reasonText && (
                    <div className="penalty-violation-row__note">
                      {p.customReason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Zone 4: Footer note ─────────────────────────────────────────────── */}
      {allPenalties.length > 0 && (
        <div className="penalty-footer-note">
          Các khoản phạt được khấu trừ trực tiếp vào lương sản lượng hàng tháng.
          Liên hệ quản lý nếu có thắc mắc.
        </div>
      )}
    </div>
  );
}
