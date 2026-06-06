import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Loader2, AlertTriangle, Users,
  Truck, Coffee, XCircle, Moon, DollarSign, Search, Info, Edit,
} from 'lucide-react';
import { formatCurrency, removeDiacritics } from '../lib/format';
import { PageHeader, Panel, KPI } from '../components/UI';
import {
  useSalaryList, useDriverSalary, useDriverWorkDays, useUpdateWorkDays,
} from '../hooks/useSalaryQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { getInitials, avatarColorById } from '../lib/avatar';
import type { WorkDayRecord, AttendanceSalary } from '../api/salaryClient';
import { useMonth } from '../hooks/useMonth';
import { useSalaryPeriod } from '../hooks/useCatalogQueries';

const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];


const STATUS_CONFIG = {
  TRIP_DAY:      { label: 'Đi chuyến',    bg: 'var(--accent-soft)', color: 'var(--accent)', icon: Truck, emoji: '🚛' },
  STANDBY:       { label: 'Chờ việc',     bg: 'var(--warning-soft)', color: 'var(--warning-text)', icon: Coffee, emoji: '⏳' },
  PERSONAL_LEAVE:{ label: 'Nghỉ riêng',   bg: 'var(--danger-soft)',  color: 'var(--danger)',  icon: XCircle, emoji: '🏖' },
  WEEKLY_OFF:    { label: 'Nghỉ tuần',    bg: 'var(--bg-3)',         color: 'var(--fg-3)',    icon: Moon,    emoji: '💤' },
};


// ── Calendar Cell ─────────────────────────────────────────────────────────────
interface CalCellProps {
  dateStr: string;
  day: number;
  isSunday: boolean;
  dayLabel: string;
  workDay: WorkDayRecord | undefined;
  isUpdating: boolean;
  onCycle: (date: string, current: WorkDayRecord | undefined) => void;
}

function CalCell({ dateStr, day, isSunday, dayLabel, workDay, isUpdating, onCycle }: CalCellProps) {
  const status = workDay?.status ?? (isSunday ? 'WEEKLY_OFF' : 'STANDBY');
  const cfg = status ? STATUS_CONFIG[status] : null;
  const isClickable = !isUpdating && status !== 'TRIP_DAY';

  return (
    <div
      title={workDay?.trip ? `${workDay.trip.tripCode || ''} – ${workDay.trip.routeName || ''}` : cfg?.label || ''}
      onClick={() => isClickable && onCycle(dateStr, workDay)}
      className={`cal-cell ${isClickable ? 'is-clickable' : ''} ${status ? `status-${status.toLowerCase()}` : ''}`}
    >
      <span className="cal-cell-day-num">
        {dayLabel}
      </span>
      {cfg && cfg.icon && (
        <div className="cal-cell-status-container">
          <span className="cal-cell-icon-wrap">
            <cfg.icon size={16} strokeWidth={2} />
          </span>
          {status === 'TRIP_DAY' && workDay?.trip?.tripCode && (
            <span className="cal-cell-trip-code" title={workDay.trip.routeName || undefined}>
              {workDay.trip.tripCode}
            </span>
          )}
        </div>
      )}
      {workDay?.note && (
        <div className="cal-cell-note-dot" />
      )}
    </div>
  );
}

// ── Salary Summary Card (Dark Theme) ──────────────────────────────────────────
function SalarySummaryCard({ salary }: { salary: AttendanceSalary }) {
  return (
    <div className="salary-summary-dark">
      <h3 className="salary-summary-dark__label">Tổng kết lương tháng</h3>
      <div className="salary-summary-dark__big mono">
        {formatCurrency(salary.netSalary)}
      </div>
      <div className="salary-summary-dark__mini">Lương thực nhận sau các khoản điều chỉnh</div>

      <div className="salary-summary-dark__rows">
        <div className="salary-summary-dark__row">
          <span className="salary-summary-dark__row-lbl">
            <DollarSign size={12} /> Lương cứng
          </span>
          <span className="salary-summary-dark__row-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {formatCurrency(salary.baseSalary)}
            <Link to="/config/drivers" className="salary-edit-link" title="Sửa lương cứng">
              <Edit size={10} />
            </Link>
          </span>
        </div>
        
        <div className="salary-summary-dark__row">
          <span className="salary-summary-dark__row-lbl">
            <Truck size={12} /> Lương chuyến ({salary.tripDays} ngày)
          </span>
          <span className={`salary-summary-dark__row-val ${salary.totalTripSalary > 0 ? 'salary-summary-dark__row-val--pos' : ''}`}>
            {salary.totalTripSalary > 0 ? '+' : ''}{formatCurrency(salary.totalTripSalary)}
          </span>
        </div>

        <div className="salary-summary-dark__row">
          <span className="salary-summary-dark__row-lbl">
            <Info size={12} /> Điều chỉnh công ({salary.adjustment >= 0 ? 'thừa' : 'thiếu'})
          </span>
          <span className={`salary-summary-dark__row-val ${salary.adjustment > 0 ? 'salary-summary-dark__row-val--pos' : salary.adjustment < 0 ? 'salary-summary-dark__row-val--neg' : ''}`}>
            {salary.adjustment > 0 ? '+' : salary.adjustment < 0 ? '-' : ''}{formatCurrency(Math.abs(salary.adjustment))}
          </span>
        </div>

        <div className="salary-summary-dark__row">
          <span className="salary-summary-dark__row-lbl">
            <XCircle size={12} /> Phạt kỷ luật
          </span>
          <span className={`salary-summary-dark__row-val ${salary.totalPenalties > 0 ? 'salary-summary-dark__row-val--neg' : ''}`}>
            {salary.totalPenalties > 0 ? '-' : ''}{formatCurrency(salary.totalPenalties)}
          </span>
        </div>

        <div className="salary-summary-dark__row salary-summary-dark__row--total">
          <span className="salary-summary-dark__row-lbl" style={{ color: 'rgba(255,255,255,0.85)' }}>Lương thực nhận</span>
          <span className="salary-summary-dark__row-val">{formatCurrency(salary.netSalary)}</span>
        </div>
      </div>

      {salary.standbyCost > 0 && (
        <div className="payslip-callout" style={{ marginTop: 12, background: 'rgba(245, 166, 35, 0.1)', borderColor: 'rgba(245, 166, 35, 0.2)' }}>
          <AlertTriangle size={14} className="payslip-callout-icon" />
          <span className="payslip-callout-text" style={{ color: '#FCD34D' }}>
            <strong>Chờ việc:</strong> {formatCurrency(salary.standbyCost)} (hạch toán chi phí chung)
          </span>
        </div>
      )}
    </div>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalaryAttendancePage() {
  const { month, year } = useMonth();
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: salaryList, isLoading: listLoading } = useSalaryList(year, month);
  const { data: workDayData, isLoading: wdLoading } = useDriverWorkDays(selectedDriverId, year, month);
  const { data: salary, isLoading: salaryLoading } = useDriverSalary(selectedDriverId, year, month);
  const updateMutation = useUpdateWorkDays(selectedDriverId ?? 0, year, month);

  const drivers = salaryList?.items ?? [];
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const { data: salaryPeriod } = useSalaryPeriod(month, year);

  // Auto-select the first driver once the list loads
  useEffect(() => {
    if (!listLoading && drivers.length > 0 && selectedDriverId === null) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [listLoading, drivers, selectedDriverId]);

  // Search filter
  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim()) return drivers;
    const term = removeDiacritics(searchTerm.trim()).toLowerCase();
    return drivers.filter(d => removeDiacritics(d.name).toLowerCase().includes(term));
  }, [drivers, searchTerm]);

  // Build work day map from API data + pending local changes
  const workDayMap = useMemo(() => {
    const map = new Map<string, WorkDayRecord>();
    (workDayData?.workDays ?? []).forEach(w => map.set(w.date, w));
    return map;
  }, [workDayData?.workDays]);

  // Cycle status: STANDBY -> PERSONAL_LEAVE -> WEEKLY_OFF -> STANDBY
  const cycleStatus = (dateStr: string, current: WorkDayRecord | undefined): 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | 'WEEKLY_OFF' | null => {
    const [cy, cm, cd] = dateStr.split('-').map(Number);
    const isSunday = new Date(cy, cm - 1, cd).getDay() === 0;
    const currentStatus = current?.status ?? (isSunday ? 'WEEKLY_OFF' : 'STANDBY');

    if (currentStatus === 'TRIP_DAY') {
      return 'TRIP_DAY';
    }

    if (isSunday) {
      // Sunday: WEEKLY_OFF (default) -> STANDBY -> PERSONAL_LEAVE -> WEEKLY_OFF (default)
      if (currentStatus === 'WEEKLY_OFF') return 'STANDBY';
      if (currentStatus === 'STANDBY') return 'PERSONAL_LEAVE';
      return null; // Revert to Sunday default (WEEKLY_OFF)
    } else {
      // Weekday: STANDBY (default) -> PERSONAL_LEAVE -> WEEKLY_OFF -> STANDBY (default)
      if (currentStatus === 'STANDBY') return 'PERSONAL_LEAVE';
      if (currentStatus === 'PERSONAL_LEAVE') return 'WEEKLY_OFF';
      return null; // Revert to weekday default (STANDBY)
    }
  };

  const handleCellClick = useCallback(async (dateStr: string, current: WorkDayRecord | undefined) => {
    if (!selectedDriverId) return;
    const newStatus = cycleStatus(dateStr, current);
    if (newStatus === 'TRIP_DAY') return;

    const items = [{ date: dateStr, status: newStatus, note: null }];
    try {
      await updateMutation.mutateAsync(items);
    } catch {
      // Error is surfaced via mutation.error state; suppress unhandled rejection
    }
  }, [selectedDriverId, updateMutation]);

  // Parse a YYYY-MM-DD string using local timezone (avoids UTC midnight parsing issue)
  const parseLocalDate = useCallback((s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, []);

  // Helper to get all dates between start and end date strings inclusive
  const getDatesInRange = useCallback((startStr: string, endStr: string): string[] => {
    const datesArr: string[] = [];
    const curr = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      datesArr.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }
    return datesArr;
  }, [parseLocalDate]);

  const dates = useMemo(() => {
    const startStr = salaryPeriod?.start || `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = salaryPeriod?.end || `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return getDatesInRange(startStr, endStr);
  }, [salaryPeriod, year, month, getDatesInRange]);

  const firstDow = useMemo(() => {
    if (dates.length === 0) return 0;
    return parseLocalDate(dates[0]).getDay(); // 0 = Sunday
  }, [dates, parseLocalDate]);

  const calCells: (string | null)[] = useMemo(() => {
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null); // leading blanks
    for (const dStr of dates) cells.push(dStr);
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [dates, firstDow]);

  const isUpdating = updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Lương & Chấm công"
        description="Quản lý ngày công và tính lương tài xế theo tháng"
        action={
          <div className="input-icon" style={{ width: 260 }}>
            <Search size={14} />
            <input
              type="text"
              className="input"
              placeholder="Tìm tài xế..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      {/* Driver selector strip */}
      <div className="driver-select-row">
        {listLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px' }}>
            <Loader2 size={20} className="spin" style={{ color: 'var(--fg-3)', marginRight: 8 }} />
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Đang tải danh sách tài xế…</span>
          </div>
        ) : (
          <div className="driver-select-row__list">
            {filteredDrivers.map((d) => {
              const isSelected = d.id === selectedDriverId;
              const net = d.salary?.netSalary ?? 0;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDriverId(d.id)}
                  className={`driver-select-card ${isSelected ? 'is-active' : ''}`}
                >
                  {isSelected && <span className="driver-select-card__dot" />}
                  <div className="driver-select-card__name">{d.name}</div>
                  {d.salary && (
                    <div
                      className="driver-select-card__salary"
                      style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {net >= 0 ? '' : '-'}{formatCurrency(Math.abs(net))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredDrivers.length === 0 && (
              <div style={{ padding: 24, color: 'var(--fg-3)', fontSize: 13 }}>
                Không tìm thấy tài xế
              </div>
            )}
          </div>
        )}
      </div>


      <div className={`salary-page-layout ${selectedDriverId ? 'has-selected' : ''}`}>
        {/* ── Left Column: Calendar ── */}
        <div className="salary-page-layout__main">
          {/* Calendar Card (middle/bottom) */}
          {!selectedDriverId ? (
            <Panel>
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <Users size={40} style={{ opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Chọn tài xế ở trên để xem lịch chấm công</p>
              </div>
            </Panel>
          ) : (
            <div className="salary-calendar-area">
              <Panel flush>
                <div className="calendar-container" style={{ position: 'relative' }}>
                  {isUpdating && (
                    <Loader2 size={14} className="spin" style={{ position: 'absolute', top: 14, right: 14, color: 'var(--accent)', zIndex: 1 }} />
                  )}
                  {/* Day-of-week headers */}
                  <div className="calendar-dow-header">
                    {DOW_LABELS.map(dow => (
                      <div key={dow} className={`calendar-dow-cell ${dow === 'CN' ? 'is-sunday' : ''}`}>
                        {dow}
                      </div>
                    ))}
                  </div>

                  {/* Calendar cells */}
                  {wdLoading ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>
                      <Loader2 size={20} className="spin" />
                    </div>
                  ) : (
                    <div className="calendar-grid">
                      {calCells.map((dateStr, idx) => {
                        if (dateStr === null) {
                          return <div key={`blank-${idx}`} className="cal-cell is-empty" />;
                        }
                        const [cy, cm, cd] = dateStr.split('-').map(Number);
                        const dateObj = new Date(cy, cm - 1, cd);
                        const day = dateObj.getDate();
                        const cellMonth = dateObj.getMonth() + 1;
                        const isSun = dateObj.getDay() === 0;

                        const showMonthLabel = day === 1 || dateStr === dates[0];
                        const dayLabel = showMonthLabel ? `${day}/${cellMonth}` : `${day}`;

                        return (
                          <CalCell
                            key={dateStr}
                            dateStr={dateStr}
                            day={day}
                            isSunday={isSun}
                            dayLabel={dayLabel}
                            workDay={workDayMap.get(dateStr)}
                            isUpdating={isUpdating}
                            onCycle={handleCellClick}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Legend */}
                  <div className="calendar-legend-bar">
                    <div className="calendar-legend-items">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <div key={key} className="calendar-legend-item">
                          <cfg.icon size={12} strokeWidth={2} />
                          <span>{cfg.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="calendar-legend-instruction">
                      <Info size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
                      <span>Bấm vào ngày để chuyển trạng thái: Chờ việc ⇄ Nghỉ riêng ⇄ Nghỉ tuần</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>

        {/* ── Right Column: Sidebar (Driver info + Summary Card) ── */}
        {selectedDriverId && (
          <aside className="salary-page-layout__sidebar">
            <button
              className="btn btn--secondary btn--sm mobile-back-btn"
              onClick={() => setSelectedDriverId(null)}
              style={{ display: 'none', alignItems: 'center', gap: 6, width: 'fit-content', marginBottom: 12 }}
            >
              <ChevronLeft size={16} /> Quay lại danh sách
            </button>

            {/* 3. Salary Summary Card (on the Right) */}
            <div className="salary-summary-area">
              {salaryLoading ? (
                <div className="salary-summary-dark" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
                  <Loader2 size={24} className="spin" style={{ color: '#fff' }} />
                </div>
              ) : salary ? (
                <SalarySummaryCard salary={salary} />
              ) : (
                <div className="salary-summary-dark" style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Không thể tải dữ liệu lương
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
