import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Loader2, AlertTriangle, Users,
  Truck, Coffee, XCircle, MoonStar, Calendar, CheckCircle, DollarSign, Search,
} from 'lucide-react';
import { formatCurrency } from '../lib/format';
import { PageHeader, Panel, KPI } from '../components/UI';
import { useSalaryList, useDriverSalary, useDriverWorkDays, useUpdateWorkDays } from '../hooks/useSalaryQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { getInitials, avatarColorById } from '../lib/avatar';
import type { WorkDayRecord, AttendanceSalary } from '../api/salaryClient';
import { useMonth } from '../hooks/useMonth';

const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type CalEditStatus = 'STANDBY' | 'PERSONAL_LEAVE' | null;

const STATUS_CONFIG = {
  TRIP_DAY:      { label: 'Đi chuyến',    bg: 'var(--accent-soft)', color: 'var(--accent)', icon: Truck, emoji: '🚛' },
  STANDBY:       { label: 'Chờ việc',     bg: 'var(--warning-soft)', color: 'var(--warning-text)', icon: Coffee, emoji: '⏳' },
  PERSONAL_LEAVE:{ label: 'Nghỉ riêng',   bg: 'var(--danger-soft)',  color: 'var(--danger)',  icon: XCircle, emoji: '🏖' },
  WEEKLY_OFF:    { label: 'Nghỉ tuần',    bg: 'var(--bg-3)',         color: 'var(--fg-3)',    icon: MoonStar, emoji: '💤' },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}
function isSunday(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay() === 0;
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Calendar Cell ─────────────────────────────────────────────────────────────
interface CalCellProps {
  day: number;
  year: number;
  month: number;
  workDay: WorkDayRecord | undefined;
  isUpdating: boolean;
  onCycle: (date: string, current: WorkDayRecord | undefined) => void;
}

function CalCell({ day, year, month, workDay, isUpdating, onCycle }: CalCellProps) {
  const dateStr = toDateStr(year, month, day);
  const status = workDay?.status ?? (isSunday(year, month, day) ? 'WEEKLY_OFF' : null);
  const cfg = status ? STATUS_CONFIG[status] : null;
  const isClickable = !isUpdating;

  return (
    <div
      title={workDay?.trip ? `${workDay.trip.tripCode || ''} – ${workDay.trip.routeName || ''}` : cfg?.label || ''}
      onClick={() => isClickable && onCycle(dateStr, workDay)}
      className={`cal-cell ${isClickable ? 'is-clickable' : ''} ${status ? `status-${status.toLowerCase()}` : ''}`}
    >
      <span className="cal-cell-day-num">
        {day}
      </span>
      {cfg && cfg.icon && (
        <div className="cal-cell-status-container">
          <span className="cal-cell-icon-wrap">
            <cfg.icon size={13} strokeWidth={2.5} />
          </span>
        </div>
      )}
      {workDay?.note && (
        <div className="cal-cell-note-dot" />
      )}
    </div>
  );
}

// ── Salary Summary Card ───────────────────────────────────────────────────────
function SalarySummaryCard({ salary }: { salary: AttendanceSalary }) {
  return (
    <div className="payslip-container">
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 8 }}>
        <KPI label="Đi chuyến" value={salary.tripDays} variant="success" icon={Truck} compact />
        <KPI label="Chờ việc" value={salary.standbyDays} variant="warn" icon={Coffee} compact />
        <KPI label="Nghỉ riêng" value={salary.personalLeaveDays} variant="danger" icon={XCircle} compact />
        <KPI label="Công chuẩn" value={salary.standardWorkDays} variant="info" icon={Calendar} compact />
      </div>

      {/* Financial breakdown */}
      <div className="payslip-header">Chi tiết tính lương</div>
      <div className="payslip-card">
        {[
          { label: 'Lương cứng', value: salary.baseSalary, sign: '', isNegative: false },
          { label: `Lương chuyến (${salary.tripDays} ngày)`, value: salary.totalTripSalary, sign: '+', isNegative: false },
          { label: `Điều chỉnh công ${salary.adjustment >= 0 ? 'thừa' : 'thiếu'}`, value: salary.adjustment, sign: salary.adjustment >= 0 ? '+' : '', isNegative: salary.adjustment < 0 },
          { label: 'Phạt kỷ luật', value: -salary.totalPenalties, sign: salary.totalPenalties > 0 ? '-' : '', isNegative: salary.totalPenalties > 0 },
        ].map((row, i) => (
          <div key={i} className="payslip-row">
            <span className="payslip-label">{row.label}</span>
            <span className={`payslip-value ${row.isNegative ? 'is-negative' : row.value > 0 ? 'is-positive' : ''}`}>
              {row.sign}{formatCurrency(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>

      <div className="payslip-total-box">
        <span className="payslip-total-label">Lương thực nhận</span>
        <span className="payslip-total-val">{formatCurrency(salary.netSalary)}</span>
      </div>

      {salary.standbyCost > 0 && (
        <div className="payslip-callout">
          <AlertTriangle size={16} className="payslip-callout-icon" />
          <span className="payslip-callout-text">
            <strong>Chi phí chờ việc:</strong> {formatCurrency(salary.standbyCost)} — hạch toán vào chi phí chung (không tính vào chuyến)
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
  const salaryPeriod = workDayData?.period;

  // Search filter
  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim()) return drivers;
    const term = searchTerm.trim().toLowerCase();
    return drivers.filter(d => d.name.toLowerCase().includes(term));
  }, [drivers, searchTerm]);

  // Build work day map from API data + pending local changes
  const workDayMap = useMemo(() => {
    const map = new Map<string, WorkDayRecord>();
    (workDayData?.workDays ?? []).forEach(w => map.set(w.date, w));
    return map;
  }, [workDayData?.workDays]);

  // Cycle status: null → TRIP_DAY → STANDBY → PERSONAL_LEAVE → null
  const cycleStatus = (current: WorkDayRecord | undefined): 'TRIP_DAY' | 'STANDBY' | 'PERSONAL_LEAVE' | null => {
    if (!current || current.status === 'WEEKLY_OFF') return 'TRIP_DAY';
    if (current.status === 'TRIP_DAY') return 'STANDBY';
    if (current.status === 'STANDBY') return 'PERSONAL_LEAVE';
    return null; // clear
  };

  const handleCellClick = useCallback(async (dateStr: string, current: WorkDayRecord | undefined) => {
    if (!selectedDriverId) return;
    const newStatus = cycleStatus(current);

    // Optimistically update local map by saving immediately
    const items = [{ date: dateStr, status: newStatus, note: null }];
    await updateMutation.mutateAsync(items);
  }, [selectedDriverId, updateMutation]);

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfMonth(year, month); // 0=Sun

  const calCells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calCells.push(null); // leading blanks
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  // Pad to complete last row
  while (calCells.length % 7 !== 0) calCells.push(null);

  const isUpdating = updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Lương & Chấm công"
        description="Quản lý ngày công và tính lương tài xế theo tháng"
      />

      <div className={`salary-page-layout ${selectedDriverId ? 'has-selected' : ''}`}>
        {/* ── Left panel: driver list ── */}
        <Panel flush className="driver-sidebar">

          {/* Search bar */}
          <div className="driver-search-container">
            <div className="input-icon">
              <Search size={14} />
              <input
                type="text"
                className="input"
                style={{ height: 34, fontSize: 13 }}
                placeholder="Tìm tài xế..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Driver list */}
          {listLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
              <Loader2 size={18} className="spin" />
            </div>
          ) : (
            <div className="driver-list-scroll">
              {filteredDrivers.map((d) => {
                const isSelected = d.id === selectedDriverId;
                const net = d.salary?.netSalary ?? 0;
                const initials = getInitials(d.name);
                const avatarColor = avatarColorById(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDriverId(d.id)}
                    className={`driver-item-card ${isSelected ? 'is-active' : ''}`}
                  >
                    <div className="driver-avatar-circle" style={{ background: avatarColor.bg, color: avatarColor.fg }}>
                      {initials}
                    </div>
                    <div className="driver-info-main">
                      <div className="driver-info-header">
                        <span className="driver-card-name">{d.name}</span>
                        {d.salary && (
                          <span className="driver-card-salary" style={{ color: net >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                            {formatCurrency(net)}
                          </span>
                        )}
                      </div>
                      {d.salary && (
                        <div className="driver-card-stats">
                          <span className="driver-stat-pill driver-stat-pill--trip" title="Ngày đi chuyến">
                            <Truck size={10} /> {d.salary.tripDays}
                          </span>
                          <span className="driver-stat-pill driver-stat-pill--standby" title="Chờ việc">
                            <Coffee size={10} /> {d.salary.standbyDays}
                          </span>
                          {d.salary.personalLeaveDays > 0 && (
                            <span className="driver-stat-pill driver-stat-pill--leave" title="Nghỉ riêng">
                              <XCircle size={10} /> {d.salary.personalLeaveDays}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredDrivers.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                  Không tìm thấy tài xế nào
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* ── Right panel: calendar + summary ── */}
        {!selectedDriverId ? (
          <Panel>
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Users size={40} style={{ opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Chọn tài xế bên trái để xem lịch chấm công</p>
            </div>
          </Panel>
        ) : (
          <div className="salary-page-layout__detail" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Calendar card */}
            <Panel>
              <div className="calendar-card-header">
                <div style={{ width: '100%' }}>
                  <button
                    className="btn btn--secondary btn--sm mobile-back-btn"
                    onClick={() => setSelectedDriverId(null)}
                    style={{ marginBottom: 12, display: 'none', alignItems: 'center', gap: 6, width: 'fit-content' }}
                  >
                    <ChevronLeft size={16} /> Quay lại danh sách
                  </button>
                  <h3 className="calendar-header-title">
                    {selectedDriver?.name}
                  </h3>
                  <p className="calendar-header-subtitle">
                    {salaryPeriod ? `Kỳ lương: ${salaryPeriod.start} → ${salaryPeriod.end}` : `${MONTHS_VI[month - 1]}/${year}`} — Bấm vào ngày để đánh dấu trạng thái
                  </p>
                </div>
                {isUpdating && <Loader2 size={16} className="spin" style={{ color: 'var(--accent)', marginLeft: 8 }} />}
              </div>

              <div className="calendar-container">
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
                    {calCells.map((day, idx) => (
                      day === null ? (
                        <div key={`blank-${idx}`} />
                      ) : (
                        <CalCell
                          key={day}
                          day={day}
                          year={year}
                          month={month}
                          workDay={workDayMap.get(toDateStr(year, month, day))}
                          isUpdating={isUpdating}
                          onCycle={handleCellClick}
                        />
                      )
                    ))}
                  </div>
                )}

                {/* Legend */}
                <div className="calendar-legend-bar">
                  <div className="calendar-legend-items">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <div key={key} className="calendar-legend-item">
                        <span style={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>
                          <cfg.icon size={13} strokeWidth={2.5} />
                        </span>
                        <span>{cfg.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="calendar-legend-instruction">
                    Bấm ngày để chuyển: Đi chuyến → Chờ việc → Nghỉ riêng → Xóa
                  </div>
                </div>
              </div>
            </Panel>

            {/* Salary summary card */}
            <Panel title="Tổng kết lương tháng" subtitle={salary ? `${MONTHS_VI[month - 1]}/${year}` : undefined}>
              {salaryLoading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
                  <Loader2 size={18} className="spin" />
                </div>
              ) : salary ? (
                <div style={{ padding: '14px 16px' }}>
                  <SalarySummaryCard salary={salary} />
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                  Không thể tải dữ liệu lương
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
