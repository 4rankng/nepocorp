import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { ShieldCheck, AlertTriangle, AlertOctagon, Loader2 } from 'lucide-react';
import { Card } from '../components/UI';
import { useSalaryPeriod } from '../hooks/useQueries';

interface DriverPenaltyRow {
  id: number;
  driver_id: number;
  trip_id: number | null;
  reason_id: number | null;
  custom_reason: string | null;
  amount: string;
  date: string;
  reasonText?: string;
}

export default function DriverPenaltyPage() {
  const [allPenalties, setAllPenalties] = useState<DriverPenaltyRow[]>([]);
  const [filteredPenalties, setFilteredPenalties] = useState<DriverPenaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');

  // Fetch all penalties once (needed for total count)
  const fetchAllPenalties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<DriverPenaltyRow[] | { items: DriverPenaltyRow[] }>('/driver/me/penalties');
      const items = Array.isArray(data) ? data : (data as any).items ?? [];
      setAllPenalties(items);
      setFilteredPenalties(items);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllPenalties(); }, [fetchAllPenalties]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthLabel = `T${currentMonth}`;

  // Resolve salary period for current month
  const { data: currentPeriod, isLoading: periodLoading } = useSalaryPeriod(currentMonth, currentYear);

  // Resolve salary period for the selected filter month
  const filterMonthNum = monthFilter ? parseInt(monthFilter.split('-')[1]) : 0;
  const filterYearNum = monthFilter ? parseInt(monthFilter.split('-')[0]) : 0;
  const { data: filterPeriod } = useSalaryPeriod(filterMonthNum, filterYearNum);

  // Current month stats — filter from allPenalties using resolved salary period
  const monthPenalties = useMemo(() => {
    if (!currentPeriod) return [] as DriverPenaltyRow[];
    return allPenalties.filter(p => {
      const d = p.date || '';
      return d >= currentPeriod.start && d <= currentPeriod.end;
    });
  }, [allPenalties, currentPeriod]);
  const totalMonthAmount = monthPenalties.reduce((s, p) => s + parseFloat(p.amount), 0);
  const incidentCount = monthPenalties.length;
  const isSafeThisMonth = incidentCount === 0;

  // When month filter is selected and period resolved, re-fetch from server with date params
  useEffect(() => {
    if (!monthFilter) {
      setFilteredPenalties(allPenalties);
      return;
    }
    if (!filterPeriod) return;
    api.get<DriverPenaltyRow[] | { items: DriverPenaltyRow[] }>(
      `/driver/me/penalties?date_from=${filterPeriod.start}&date_to=${filterPeriod.end}`,
    ).then(data => {
      setFilteredPenalties(Array.isArray(data) ? data : (data as any).items ?? []);
    }).catch(() => {
      setFilteredPenalties(allPenalties);
    });
  }, [monthFilter, filterPeriod, allPenalties]);

  const isLoadingPeriod = periodLoading || (!currentPeriod && !loading);

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kỷ luật của tôi</h1>
          <p className="page-subtitle">Lịch sử vi phạm và khấu trừ lương của bạn</p>
        </div>
      </div>

      {/* ── Status banner ───────────────────────────────────────────────────── */}
      {isLoadingPeriod ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '16px 20px', borderRadius: 12, marginBottom: 20,
          background: 'var(--bg-2)', border: '1px solid var(--border-2)',
          color: 'var(--fg-3)', fontSize: 13,
        }}>
          <Loader2 size={16} className="spin" />
          Đang tải dữ liệu kỳ lương...
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '16px 20px',
          borderRadius: 12,
          marginBottom: 20,
          background: isSafeThisMonth ? 'var(--success-soft)' : 'var(--danger-soft)',
          border: `1px solid ${isSafeThisMonth ? 'var(--success)' : 'var(--danger)'}`,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: isSafeThisMonth ? 'var(--success)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            {isSafeThisMonth ? <ShieldCheck size={22} /> : <AlertOctagon size={22} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: isSafeThisMonth ? 'var(--success)' : 'var(--danger)' }}>
              {isSafeThisMonth ? `Không vi phạm ${monthLabel}` : `${incidentCount} vi phạm ${monthLabel}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>
              {isSafeThisMonth
                ? 'Bạn đang chấp hành tốt nội quy công ty. Tiếp tục phát huy!'
                : `Tổng khấu trừ lương: ${formatCurrency(totalMonthAmount)}`
              }
            </div>
          </div>
        </div>
      )}

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className={`kpi ${incidentCount > 0 ? 'kpi--danger' : 'kpi--success'}`}>
          <div className="kpi__top">
            <span className="kpi__label">Vi phạm {monthLabel}</span>
            <div className="kpi__icon">
              {incidentCount > 0 ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
            </div>
          </div>
          <div className="kpi__value">
            {incidentCount}<span className="kpi__value-unit"> vụ</span>
          </div>
          <div className="kpi__meta">Trong tháng này</div>
        </div>

        <div className={`kpi ${totalMonthAmount > 0 ? 'kpi--warn' : 'kpi--success'}`}>
          <div className="kpi__top">
            <span className="kpi__label">Khấu trừ {monthLabel}</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="kpi__value" style={{ fontSize: totalMonthAmount > 9999999 ? 20 : 28 }}>
            {totalMonthAmount > 0 ? formatCurrency(totalMonthAmount) : '—'}
          </div>
          <div className="kpi__meta">Trừ vào lương tháng</div>
        </div>

        <div className="kpi kpi--neutral">
          <div className="kpi__top">
            <span className="kpi__label">Tổng biên bản</span>
            <div className="kpi__icon"><AlertOctagon size={18} /></div>
          </div>
          <div className="kpi__value">
            {allPenalties.length}<span className="kpi__value-unit"> vụ</span>
          </div>
          <div className="kpi__meta">Toàn lịch sử</div>
        </div>
      </div>

      {/* ── Violations list ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 13, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--fg-3)', fontWeight: 600, margin: 0,
        }}>
          Sổ vi phạm · {filteredPenalties.length}
        </h3>
        <select
          className="input"
          style={{ width: 150, height: 28, fontSize: 12 }}
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
        >
          <option value="">Tất cả thời gian</option>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return <option key={value} value={value}>Tháng {d.getMonth() + 1}/{d.getFullYear()}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
          <Loader2 size={24} className="spin" style={{ display: 'inline-block' }} />
          <p style={{ marginTop: 12 }}>Đang tải...</p>
        </div>
      ) : filteredPenalties.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fg-3)' }}>
          <ShieldCheck size={32} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg-1)' }}>Không có biên bản vi phạm</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>
            {monthFilter ? 'Không có vi phạm trong khoảng thời gian này.' : 'Bạn chưa có biên bản vi phạm nào.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredPenalties.map(p => (
            <div
              key={p.id}
              className="panel"
              style={{ padding: '14px 18px', border: '1px solid var(--border-1)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: 'var(--danger-soft)', color: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={16} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>
                      {p.reasonText || p.custom_reason || 'Vi phạm nội quy'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                      -{formatCurrency(Number(p.amount))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                      📅 {formatDate(p.date)}
                    </span>
                    {p.trip_id && (
                      <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                        🚛 Lệnh #{p.trip_id}
                      </span>
                    )}
                  </div>
                  {p.custom_reason && p.reasonText && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic' }}>
                      {p.custom_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      {allPenalties.length > 0 && (
        <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 8, fontSize: 12, color: 'var(--fg-3)', textAlign: 'center' }}>
          Các khoản phạt được khấu trừ trực tiếp vào lương sản lượng hàng tháng.
          Liên hệ quản lý nếu có thắc mắc.
        </div>
      )}
    </div>
  );
}
