import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Loader2, AlertTriangle, Users,
  Truck, Coffee, XCircle, MoonStar, Calendar, CheckCircle, DollarSign,
} from 'lucide-react';
import { formatCurrency } from '../lib/format';
import { PageHeader, Panel } from '../components/UI';
import { useSalaryList, useDriverSalary, useDriverWorkDays, useUpdateWorkDays } from '../hooks/useSalaryQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import type { WorkDayRecord, AttendanceSalary } from '../api/salaryClient';

const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type CalEditStatus = 'STANDBY' | 'PERSONAL_LEAVE' | null;

const STATUS_CONFIG = {
  TRIP_DAY:      { label: 'Đi chuyến',    bg: 'var(--primary-soft)', color: 'var(--primary)', icon: Truck, emoji: '🚛' },
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
  const isTripDay = status === 'TRIP_DAY';
  const isClickable = !isTripDay && !isUpdating;

  return (
    <div
      title={workDay?.trip ? `${workDay.trip.tripCode || ''} – ${workDay.trip.routeName || ''}` : cfg?.label || ''}
      onClick={() => isClickable && onCycle(dateStr, workDay)}
      style={{
        position: 'relative',
        aspectRatio: '1',
        minHeight: 52,
        borderRadius: 'var(--radius)',
        border: `1.5px solid ${cfg ? cfg.color + '55' : 'var(--border-1)'}`,
        background: cfg?.bg || 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        cursor: isClickable ? 'pointer' : isTripDay ? 'default' : 'default',
        transition: 'box-shadow 0.15s, transform 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--primary)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: cfg?.color || 'var(--fg-2)', lineHeight: 1 }}>
        {day}
      </span>
      {cfg && (
        <span style={{ fontSize: 14, lineHeight: 1 }}>{STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].emoji}</span>
      )}
      {workDay?.note && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--primary)',
        }} />
      )}
    </div>
  );
}

// ── Salary Summary Card ───────────────────────────────────────────────────────
function SalarySummaryCard({ salary }: { salary: AttendanceSalary }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: 'Đi chuyến', value: salary.tripDays, color: 'var(--primary)', bg: 'var(--primary-soft)' },
          { label: 'Chờ việc', value: salary.standbyDays, color: 'var(--warning-text)', bg: 'var(--warning-soft)' },
          { label: 'Nghỉ riêng', value: salary.personalLeaveDays, color: 'var(--danger)', bg: 'var(--danger-soft)' },
          { label: 'Công chuẩn', value: salary.standardWorkDays, color: 'var(--fg-2)', bg: 'var(--bg-3)' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '10px 12px', borderRadius: 'var(--radius)',
            background: kpi.bg, textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Financial breakdown */}
      <div style={{
        background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '14px 16px',
        border: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[
          { label: 'Lương cứng', value: salary.baseSalary, sign: '' },
          { label: `Lương chuyến (${salary.tripDays} ngày)`, value: salary.totalTripSalary, sign: '+' },
          { label: `Điều chỉnh công ${salary.adjustment >= 0 ? 'thừa' : 'thiếu'}`, value: salary.adjustment, sign: salary.adjustment >= 0 ? '+' : '' },
          { label: 'Phạt kỷ luật', value: -salary.totalPenalties, sign: salary.totalPenalties > 0 ? '-' : '' },
        ].map((row, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 13,
            borderBottom: i < 3 ? '1px solid var(--border-1)' : 'none',
            paddingBottom: i < 3 ? 6 : 0,
          }}>
            <span style={{ color: 'var(--fg-2)' }}>{row.label}</span>
            <span style={{
              fontWeight: 600, fontFamily: 'var(--font-mono)',
              color: row.value < 0 ? 'var(--danger)' : row.value > 0 ? 'var(--success-text)' : 'var(--fg-2)',
            }}>
              {row.sign}{formatCurrency(Math.abs(row.value))}
            </span>
          </div>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 8, marginTop: 4, borderTop: '2px solid var(--border-1)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>Lương thực nhận</span>
          <span style={{
            fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)',
            color: salary.netSalary >= 0 ? 'var(--success-text)' : 'var(--danger)',
          }}>
            {formatCurrency(salary.netSalary)}
          </span>
        </div>
        {salary.standbyCost > 0 && (
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius)',
            background: 'var(--warning-soft)', border: '1px solid var(--warning-soft)',
            fontSize: 12, color: 'var(--warning-text)',
          }}>
            <strong>Chi phí chờ việc:</strong> {formatCurrency(salary.standbyCost)} — hạch toán vào chi phí chung (không tính vào chuyến)
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalaryAttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  const { data: salaryList, isLoading: listLoading } = useSalaryList(year, month);
  const { data: workDayData, isLoading: wdLoading } = useDriverWorkDays(selectedDriverId, year, month);
  const { data: salary, isLoading: salaryLoading } = useDriverSalary(selectedDriverId, year, month);
  const updateMutation = useUpdateWorkDays(selectedDriverId ?? 0, year, month);

  const drivers = salaryList?.items ?? [];
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const salaryPeriod = workDayData?.period;

  // Build work day map from API data + pending local changes
  const workDayMap = useMemo(() => {
    const map = new Map<string, WorkDayRecord>();
    (workDayData?.workDays ?? []).forEach(w => map.set(w.date, w));
    return map;
  }, [workDayData?.workDays]);

  // Cycle status: null → STANDBY → PERSONAL_LEAVE → null
  const cycleStatus = (current: WorkDayRecord | undefined): 'STANDBY' | 'PERSONAL_LEAVE' | null => {
    if (!current || current.status === 'WEEKLY_OFF') return 'STANDBY';
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

  const navigateMonth = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

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

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        {/* ── Left panel: driver list ── */}
        <Panel flush style={{ position: 'sticky', top: 16 }}>
          {/* Month navigator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '1px solid var(--border-1)',
          }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', padding: 4, borderRadius: 6 }}
              title="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-1)' }}>
              {MONTHS_VI[month - 1]}/{year}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-2)', padding: 4, borderRadius: 6 }}
              title="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Driver list */}
          {listLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
              <Loader2 size={18} className="spin" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {drivers.map((d, i) => {
                const isSelected = d.id === selectedDriverId;
                const net = d.salary?.netSalary ?? 0;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDriverId(d.id)}
                    style={{
                      padding: '11px 14px',
                      borderBottom: i < drivers.length - 1 ? '1px solid var(--border-1)' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-soft)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: isSelected ? 'var(--primary)' : 'var(--fg-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>{d.name}</span>
                      {d.salary && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: net >= 0 ? 'var(--success-text)' : 'var(--danger)', flexShrink: 0 }}>
                          {formatCurrency(net)}
                        </span>
                      )}
                    </div>
                    {d.salary && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <span title="Ngày đi chuyến" style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>
                          🚛 {d.salary.tripDays}
                        </span>
                        <span title="Chờ việc" style={{ fontSize: 11, color: 'var(--warning-text)', fontWeight: 500 }}>
                          ⏳ {d.salary.standbyDays}
                        </span>
                        {d.salary.personalLeaveDays > 0 && (
                          <span title="Nghỉ riêng" style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 500 }}>
                            🏖 {d.salary.personalLeaveDays}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {drivers.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
                  Không có tài xế nào
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Calendar card */}
            <Panel>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>
                    {selectedDriver?.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                    {salaryPeriod ? `Kỳ lương: ${salaryPeriod.start} → ${salaryPeriod.end}` : `${MONTHS_VI[month - 1]}/${year}`} — Bấm vào ngày để đánh dấu trạng thái
                  </p>
                </div>
                {isUpdating && <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />}
              </div>

              <div style={{ padding: 14 }}>
                {/* Day-of-week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                  {DOW_LABELS.map(dow => (
                    <div key={dow} style={{
                      textAlign: 'center', fontSize: 11, fontWeight: 700,
                      color: dow === 'CN' ? 'var(--danger)' : 'var(--fg-3)',
                      padding: '4px 0',
                    }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
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
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-3)' }}>
                      <span>{cfg.emoji}</span>
                      <span style={{ fontWeight: 500 }}>{cfg.label}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 'auto', fontStyle: 'italic' }}>
                    Bấm ngày để chuyển: Chờ việc → Nghỉ riêng → Xóa
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
