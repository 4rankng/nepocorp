import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getInitials, avatarColorById } from '../lib/avatar';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import type { Driver, PenaltyReason, Truck } from '@nepocorp/shared';
import type { CreatePenaltyRequest } from '@nepocorp/shared';
import { TruckStatus, DriverStatus, PenaltyStatus, PENALTY_STATUS_LABELS } from '@nepocorp/shared';
import { FINANCIAL } from '@nepocorp/shared';
import {
  Shield, ShieldCheck, Download, Plus, Eye, FileText,
  Zap, Trophy, Clock, Save, Loader2, X, Users, AlertTriangle,
  DollarSign, XCircle,
} from 'lucide-react';
import {
  Panel, Btn, Drawer, FormGroup, KPI,
} from '../components/UI';
import { usePenalties, usePenaltyCatalogs, type PenaltyRow } from '../hooks/usePenalties';
import { useSalaryPeriod } from '../hooks/useQueries';
import { useAuth } from '../hooks/useAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Severity = 'light' | 'med' | 'heavy' | 'critical';

function getSeverity(amount: number): Severity {
  if (amount < 300000) return 'light';
  if (amount < 800000) return 'med';
  if (amount < 1500000) return 'heavy';
  return 'critical';
}

function getSeverityLabel(s: Severity): string {
  return { light: 'Nhẹ', med: 'Trung bình', heavy: 'Nặng', critical: 'Đặc biệt' }[s];
}

function getGrade(streakDays: number, violations90d: number): string {
  if (violations90d === 0 && streakDays >= 90) return 'A+';
  if (violations90d <= 1 && streakDays >= 60) return 'A';
  if (violations90d <= 3) return 'B';
  return 'C';
}

function getGradeClass(grade: string): string {
  if (grade === 'A+') return 'a-plus';
  if (grade === 'A') return 'a';
  if (grade === 'B') return 'b';
  return 'c';
}

function formatTenure(createdAt: string): string {
  const start = new Date(createdAt);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  months = months % 12;
  if (years > 0 && months > 0) return `${years} năm ${months} tháng`;
  if (years > 0) return `${years} năm`;
  return `${months} tháng`;
}

function computeStreak(driverId: number, penalties: PenaltyRow[], createdAt: string): number {
  const driverPenalties = penalties
    .filter(p => p.driverId === driverId && p.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (driverPenalties.length === 0) {
    const hire = new Date(createdAt);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - hire.getTime()) / 86400000));
  }
  const lastViolation = new Date(driverPenalties[0].date);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - lastViolation.getTime()) / 86400000));
}

// ─── PenaltyFormDrawer ────────────────────────────────────────────────────────

function PenaltyFormDrawer({
  isOpen,
  onClose,
  drivers,
  reasons,
  onCreated,
  preselectedDriverId,
}: {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  reasons: PenaltyReason[];
  onCreated: () => void;
  preselectedDriverId?: number;
}) {
  const [formDriverId, setFormDriverId] = useState('');
  const [formTripId, setFormTripId] = useState('');
  const [formReasonId, setFormReasonId] = useState('');
  const [formCustomReason, setFormCustomReason] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedDriverId) setFormDriverId(String(preselectedDriverId));
      setFormTripId('');
      setFormReasonId('');
      setFormCustomReason('');
      setFormAmount('');
      setFormDate(new Date().toISOString().slice(0, 10));
      setSubmitError(null);
    }
  }, [isOpen, preselectedDriverId]);

  const handleSubmit = async () => {
    if (!formDriverId || !formAmount || !formDate) return;
    setSubmitting(true);
    setSubmitError(null);
    const body: CreatePenaltyRequest = {
      driverId: Number(formDriverId),
      amount: parseFloat(formAmount),
      date: formDate,
    };
    if (formTripId) body.tripId = Number(formTripId);
    if (formReasonId) body.reasonId = Number(formReasonId);
    if (formCustomReason) body.customReason = formCustomReason;
    try {
      await api.post('/penalties', body);
      onCreated();
      onClose();
    } catch (e: any) {
      setSubmitError(e.message || 'Lỗi khi tạo phạt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReasonChange = (reasonId: string) => {
    setFormReasonId(reasonId);
    if (reasonId) {
      const reason = reasons.find(r => r.id === Number(reasonId));
      if (reason?.defaultAmount) setFormAmount(reason.defaultAmount);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Lập biên bản kỷ luật"
      subtitle="Tạo mới biên bản vi phạm nghiệp vụ"
      onConfirm={handleSubmit}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn
            variant="primary"
            icon={submitting ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
            disabled={submitting || !formDriverId || !formAmount || !formDate}
            onClick={handleSubmit}
          >
            Xác nhận
          </Btn>
        </>
      }
    >
      {submitError && (
        <div style={{ padding: '10px 14px', marginBottom: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 12.5 }}>
          {submitError}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormGroup label="Tài xế vi phạm *">
          <select className="input" value={formDriverId} onChange={e => setFormDriverId(e.target.value)}>
            <option value="">-- Chọn tài xế --</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Mã lệnh (tùy chọn)">
          <input className="input" type="number" placeholder="VD: 1045" value={formTripId} onChange={e => setFormTripId(e.target.value)} />
        </FormGroup>
        <FormGroup label="Lý do danh mục">
          <select className="input" value={formReasonId} onChange={e => handleReasonChange(e.target.value)}>
            <option value="">-- Chọn danh mục --</option>
            {reasons.map(r => <option key={r.id} value={r.id}>{r.reasonText} ({formatCurrency(Number(r.defaultAmount))})</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Lý do chi tiết khác">
          <input className="input" placeholder="Mô tả lỗi phát sinh..." value={formCustomReason} onChange={e => setFormCustomReason(e.target.value)} />
          {formCustomReason.length > 5 && (() => {
            const q = formCustomReason.toLowerCase();
            const match = reasons.find(r =>
              r.reasonText.toLowerCase().includes(q) || q.includes(r.reasonText.toLowerCase())
            );
            if (!match) return null;
            return (
              <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 4 }}>
                Đã có lý do tương tự:{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, padding: 0, fontSize: 11, textDecoration: 'underline' }}
                  onClick={() => { setFormCustomReason(match.reasonText); if (match.defaultAmount) setFormAmount(match.defaultAmount); }}
                >
                  "{match.reasonText}"
                </button>
                {' '}— dùng lý do này?
              </div>
            );
          })()}
        </FormGroup>
        <FormGroup label="Số tiền khấu trừ (VND) *">
          <input className="input" type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
        </FormGroup>
        <FormGroup label="Ngày vi phạm *">
          <input className="input" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
        </FormGroup>
      </div>
    </Drawer>
  );
}

// ─── Severity Icons ───────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: Severity }) {
  switch (severity) {
    case 'light':
      return <Clock size={18} />;
    case 'med':
      return <AlertTriangle size={18} />;
    case 'heavy':
      return <Zap size={18} />;
    case 'critical':
      return <Shield size={18} />;
  }
}

// ─── CancelConfirmDialog ─────────────────────────────────────────────────────

function CancelConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  penalty,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  penalty: PenaltyRow | null;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  if (!isOpen || !penalty) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-1)', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <XCircle size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Xác nhận hủy kỷ luật?</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Hành động này sẽ hoàn tiền vào tài khoản tài xế</div>
          </div>
        </div>
        <div style={{ fontSize: 13, marginBottom: 12, padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
          <div><strong>Tài xế:</strong> {penalty.driverName || 'Tài xế'}</div>
          <div><strong>Số tiền:</strong> <span style={{ color: 'var(--danger)' }}>{formatCurrency(Number(penalty.amount))}đ</span></div>
          <div><strong>Lý do:</strong> {penalty.reasonText || penalty.customReason || '—'}</div>
        </div>
        <FormGroup label="Lý do hủy (tùy chọn)">
          <input className="input" placeholder="VD: Hủy do sai sót..." value={reason} onChange={e => setReason(e.target.value)} />
        </FormGroup>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="danger" icon={loading ? <Loader2 size={13} className="spin" /> : <XCircle size={13} />} disabled={loading} onClick={() => onConfirm(reason || undefined)}>
            Xác nhận hủy
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PenaltyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: penaltiesData, isLoading: listLoading } = usePenalties();
  const { data: catalogsData } = usePenaltyCatalogs();
  const penalties: PenaltyRow[] = penaltiesData ?? [];
  const drivers = catalogsData?.drivers ?? [];
  const reasons = catalogsData?.reasons ?? [];
  const trucks = catalogsData?.trucks ?? [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preselectedDriver, setPreselectedDriver] = useState<number | undefined>();
  const [scoreFilter, setScoreFilter] = useState<'7d' | '30d' | '90d' | 'ytd'>('90d');
  const [logFilter, setLogFilter] = useState<'all' | 'pending' | 'deducted'>('all');
  const [logDriverFilter, setLogDriverFilter] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PenaltyRow | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { user } = useAuth();
  const canCancel = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const nowDate = new Date();
  const [selMonth, setSelMonth] = useState(nowDate.getMonth() + 1);
  const [selYear, setSelYear] = useState(nowDate.getFullYear());
  const goMonth = (delta: number) => {
    let m = selMonth + delta;
    let y = selYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    if (y > nowDate.getFullYear() || (y === nowDate.getFullYear() && m > nowDate.getMonth() + 1)) return;
    setSelMonth(m); setSelYear(y);
  };

  const handlePenaltyCreated = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['penalties'] });
  }, [queryClient]);

  const handleCancelPenalty = useCallback(async (reason?: string) => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.post(FINANCIAL.PENALTY_CANCEL(cancelTarget.id), { reason });
      await queryClient.invalidateQueries({ queryKey: ['penalties'] });
      setCancelTarget(null);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi hủy kỷ luật');
    } finally {
      setCancelLoading(false);
    }
  }, [cancelTarget, queryClient]);

  // Resolve salary period for the selected month
  const { data: salaryPeriod, isLoading: periodLoading } = useSalaryPeriod(selMonth, selYear);

  // Resolve previous month's salary period for comparison
  const prevMonthNum = selMonth === 1 ? 12 : selMonth - 1;
  const prevYearNum = selMonth === 1 ? selYear - 1 : selYear;
  const { data: prevSalaryPeriod } = useSalaryPeriod(prevMonthNum, prevYearNum);

  // ── Cross-reference maps ─────────────────────────────────────────────────────

  const truckMap = new Map<number, Truck>();
  trucks.forEach(t => truckMap.set(t.id, t));

  // ── Derived stats ────────────────────────────────────────────────────────────

  const now = new Date();
  const monthLabel = `${String(selMonth).padStart(2, '0')}/${String(selYear).slice(-2)}`;

  // Filter penalties by salary period date range
  const monthPenalties = penalties.filter(p => {
    if (!salaryPeriod) return false;
    const d = p.date || '';
    return d >= salaryPeriod.start && d <= salaryPeriod.end;
  });
  const totalMonthAmount = monthPenalties.reduce((s, p) => s + parseFloat(p.amount), 0);
  const incidentCount = monthPenalties.length;

  const prevMonthCount = prevSalaryPeriod
    ? penalties.filter(p => {
        const d = p.date || '';
        return d >= prevSalaryPeriod.start && d <= prevSalaryPeriod.end;
      }).length
    : 0;
  const monthComparison = prevMonthCount > 0
    ? `Giảm ${Math.round((1 - incidentCount / prevMonthCount) * 100)}% so với ${String(prevMonthNum).padStart(2, '0')}/${String(prevYearNum).slice(-2)}`
    : incidentCount === 0 ? 'Tháng an toàn' : '';

  const penalizedDriverIds = new Set(monthPenalties.map(p => p.driverId));
  const safeCount = drivers.filter(d => !penalizedDriverIds.has(d.id)).length;

  const yearStart = `${now.getFullYear()}-01-01`;
  const ytdPenalties = penalties.filter(p => p.date >= yearStart);
  const ytdTotal = ytdPenalties.reduce((s, p) => s + parseFloat(p.amount), 0);

  // ── Per-driver detail ────────────────────────────────────────────────────────

  const cutoffDate = new Date();
  if (scoreFilter === '7d') cutoffDate.setDate(cutoffDate.getDate() - 7);
  else if (scoreFilter === '30d') cutoffDate.setDate(cutoffDate.getDate() - 30);
  else if (scoreFilter === '90d') cutoffDate.setDate(cutoffDate.getDate() - 90);
  else cutoffDate.setMonth(0, 1); // YTD
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const driverDetails = drivers.map(d => {
    const streakDays = computeStreak(d.id, penalties, d.createdAt);
    const driverPenalties = penalties.filter(p => p.driverId === d.id && p.date >= cutoffStr);
    const violationsInPeriod = driverPenalties.length;
    const driverYTD = ytdPenalties.filter(p => p.driverId === d.id);
    const fineYTD = driverYTD.reduce((s, p) => s + parseFloat(p.amount), 0);
    const grade = getGrade(streakDays, violationsInPeriod);
    const truckPlate = d.assignedTruckId && truckMap.has(d.assignedTruckId)
      ? truckMap.get(d.assignedTruckId)!.licensePlate: null;
    return { ...d, streakDays, violationsInPeriod, fineYTD, grade, truckPlate };
  }).sort((a, b) => b.streakDays - a.streakDays || a.violationsInPeriod - b.violationsInPeriod);

  const longestStreak = driverDetails.reduce((max, d) => Math.max(max, d.streakDays), 0);
  // When streaks are tied (e.g. all drivers freshly hired = 0 days), break the
  // tie by fewest 90-day violations so a driver who *has* a recent violation
  // isn't crowned safety leader.
  const streakLeader = driverDetails.length > 0
    ? [...driverDetails]
        .sort((a, b) => b.streakDays - a.streakDays || a.violationsInPeriod - b.violationsInPeriod)[0]?.name || '—'
    : '—';
  const avgStreak = driverDetails.length > 0
    ? Math.round(driverDetails.reduce((s, d) => s + d.streakDays, 0) / driverDetails.length)
    : 0;
  const driversOver90 = driverDetails.filter(d => d.streakDays >= 90).length;
  const driversOver6m = driverDetails.filter(d => d.streakDays >= 180).length;

  // ── Violation log filtering ──────────────────────────────────────────────────

  const filteredPenalties = logDriverFilter
    ? penalties.filter(p => p.driverId === logDriverFilter)
    : penalties; // status filter is future work; show all for now

  // ── Open drawer helpers ──────────────────────────────────────────────────────

  const openDrawer = (driverId?: number) => {
    setPreselectedDriver(driverId);
    setDrawerOpen(true);
  };

  return (
    <div className="penalty-page fade-up">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="page-title">Kỷ luật</h1>
              <span className="penalty-month-pill">
                <span className="dot" />
                {monthLabel} · {incidentCount === 0 ? 'An toàn' : `${incidentCount} vụ`}
              </span>
            </div>
            <p className="page-subtitle">
              Theo dõi vi phạm nghiệp vụ, mức phạt khấu trừ trực tiếp vào bảng lương tài xế
            </p>
          </div>
        </div>
        <div className="page-actions">
          <Btn variant="secondary" icon={<Download size={14} />} onClick={() => {
            const headers = ['Tài xế', 'Mã lệnh', 'Lý do', 'Số tiền', 'Ngày'];
            const rows = filteredPenalties.map(p => [
              p.driverName || '—',
              p.tripId ? `#${p.tripId}` : '—',
              p.reasonText || p.customReason || '—',
              p.amount,
              p.date,
            ]);
            downloadCSV(`ky-luat-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
          }}>
            Xuất báo cáo
          </Btn>
          <Btn variant="primary" icon={<Plus size={14} />} onClick={() => openDrawer()}>
            Lập biên bản
          </Btn>
        </div>
      </div>

      {/* ── Month selector ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)' }}>Kỳ thống kê:</span>
        <button className="btn btn--ghost btn--icon btn--sm" onClick={() => goMonth(-1)} aria-label="Tháng trước">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', minWidth: 90, textAlign: 'center' }}>
          Tháng {selMonth} / {selYear}
        </span>
        <button
          className="btn btn--ghost btn--icon btn--sm"
          onClick={() => goMonth(1)}
          disabled={selYear === nowDate.getFullYear() && selMonth >= nowDate.getMonth() + 1}
          aria-label="Tháng sau"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* ── KPI strip (4 cards) ──────────────────────────────────────────── */}
      {periodLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 0', color: 'var(--fg-3)', fontSize: 13 }}>
          <Loader2 size={16} className="spin" />
          Đang tải dữ liệu kỳ lương...
        </div>
      ) : (
      <div className="kpi-grid">
        <KPI
          label={`Vi phạm ${monthLabel}`}
          value={incidentCount}
          unit="vụ"
          icon={Shield}
          variant="success"
          meta={
            <span className="penalty-kpi-meta">
              <span className="dot" />
              <span className="pos">{monthComparison || 'Không có so sánh'}</span>
            </span>
          }
        />
        <KPI
          label={`Tổng phạt ${monthLabel}`}
          value={formatCurrency(totalMonthAmount)}
          icon={DollarSign}
          meta={
            <span className="penalty-kpi-meta">
              <span>Khấu trừ vào bảng lương</span>
              <span className="sep">·</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>YTD {formatCurrency(ytdTotal)}</span>
            </span>
          }
        />
        <KPI
          label="Lái xe đạt chuẩn"
          value={safeCount}
          unit={`/${drivers.length} tài xế`}
          icon={Users}
          variant="info"
          meta={
            <span className="penalty-kpi-meta">
              <span className="dot" />
              <span className="pos">{drivers.length > 0 ? Math.round(safeCount / drivers.length * 100) : 0}% toàn đội</span>
              <span className="sep">·</span>
              <span>{drivers.length - safeCount} cần nhắc nhở</span>
            </span>
          }
        />
        <KPI
          label="Chuỗi an toàn"
          value={longestStreak}
          unit="ngày"
          icon={Zap}
          variant="warn"
          meta={
            <span className="penalty-kpi-meta">
              <span>{streakLeader} dẫn đầu</span>
            </span>
          }
        />
      </div>
      )}

      {/* ── Driver scoreboard ────────────────────────────────────────────── */}
      <Panel flush>
        <div className="penalty-card-head">
          <div className="penalty-card-lead">
            <div className="penalty-card-icon">
              <Trophy size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="penalty-card-title">
                Bảng xếp hạng tài xế
                <span className="count-pill">{drivers.length}</span>
              </div>
              <div className="penalty-card-sub">Sắp xếp theo chuỗi ngày an toàn và mức vi phạm nghiệp vụ</div>
            </div>
          </div>
          <div className="penalty-head-tools">
            <div className="penalty-seg">
              {(['7d', '30d', '90d', 'ytd'] as const).map(f => (
                <button
                  key={f}
                  className={scoreFilter === f ? 'active' : ''}
                  onClick={() => setScoreFilter(f)}
                >
                  {f === '7d' ? '7 ngày' : f === '30d' ? '30 ngày' : f === '90d' ? '90 ngày' : 'YTD'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: 'center' }}>#</th>
                  <th>Tài xế</th>
                  <th>Chuỗi an toàn</th>
                  <th>Vi phạm {scoreFilter === '90d' ? '90N' : scoreFilter.toUpperCase()}</th>
                  <th>Phạt YTD</th>
                  <th style={{ textAlign: 'center' }}>Mức</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {driverDetails.map((d, idx) => {
                  const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
                  const ac = avatarColorById(d.id);
                  const streakPct = Math.min(100, (d.streakDays / 180) * 100);
                  const vClass = d.violationsInPeriod === 0 ? 'zero' : d.violationsInPeriod <= 2 ? 'warn' : 'bad';
                  const moneyClass = d.fineYTD === 0 ? 'zero' : '';
                  const gradeClass = getGradeClass(d.grade);
                  return (
                    <tr key={d.id}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`penalty-rank ${rankClass}`}>{idx + 1}</span>
                      </td>
                      <td>
                        <span className="penalty-driver-cell">
                          <span className="penalty-driver-mini" style={{ background: ac.bg, color: ac.fg }}>
                            {getInitials(d.name)}
                          </span>
                          <span className="penalty-driver-info">
                            <div className="name">{d.name}</div>
                            <div className="role">
                              {d.truckPlate || 'Chưa phân xe'} · {formatTenure(d.createdAt)}
                            </div>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="penalty-streak">
                          <span className="penalty-streak-num">
                            {d.streakDays}<span className="unit">ngày</span>
                          </span>
                          <span className="penalty-streak-bar">
                            <span
                              className={`fill ${idx === 0 ? 'gold' : ''}`}
                              style={{ width: `${streakPct}%` }}
                            />
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`penalty-violation-count ${vClass}`}>
                          <span className="dot" />
                          {d.violationsInPeriod} vụ
                        </span>
                      </td>
                      <td>
                        <span className={`penalty-money ${moneyClass}`}>
                          {d.fineYTD > 0 ? formatCurrency(d.fineYTD) : `0`}<span className="unit">đ</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`penalty-grade ${gradeClass}`}>{d.grade}</span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="penalty-row-act" aria-label="Xem chi tiết" onClick={() => setLogDriverFilter(d.id)}>
                          <Eye size={14} />
                        </button>
                        <button className="penalty-row-act primary" aria-label="Lập biên bản" onClick={() => openDrawer(d.id)}>
                          <FileText size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="penalty-table-foot">
          <div className="legend">
            <span>TB chuỗi an toàn: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{avgStreak} ngày</strong></span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{driversOver90} tài xế đạt mốc 90 ngày</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{driversOver6m} tài xế vượt 6 tháng</span>
          </div>
          <span>Hiển thị {drivers.length}/{drivers.length}</span>
        </div>
      </Panel>

      {/* ── Two-column: Violation log + Violation type reference ─────────── */}
      <div className="penalty-two-col">

        {/* Left: Violation log */}
        <Panel flush>
          <div className="penalty-card-head">
            <div className="penalty-card-lead">
              <div className="penalty-card-icon alt">
                <FileText size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="penalty-card-title">
                  Sổ biên bản vi phạm
                  <span className="count-pill">{filteredPenalties.length}</span>
                </div>
                <div className="penalty-card-sub">Lịch sử biên bản đã lập và khấu trừ lương</div>
                {logDriverFilter && (() => {
                  const drv = drivers.find(dr => dr.id === logDriverFilter);
                  return drv ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>
                        Lọc theo: {drv.name}
                      </span>
                      <button
                        style={{ fontSize: 10, color: 'var(--fg-3)', background: 'var(--bg-2)', border: 'none', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}
                        onClick={() => setLogDriverFilter(null)}
                      >
                        ✕ Xóa lọc
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="penalty-head-tools">
              {(['all', 'pending', 'deducted'] as const).map(f => (
                <button
                  key={f}
                  className={`penalty-chip${logFilter === f ? ' active' : ''}`}
                  onClick={() => setLogFilter(f)}
                >
                  {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : 'Đã khấu trừ'}
                  <span className="count">
                    {f === 'all' ? filteredPenalties.length : 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {listLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
            </div>
          ) : filteredPenalties.length === 0 ? (
            <div className="penalty-empty-log">
              <div className="penalty-empty-shield">
                <ShieldCheck size={30} />
              </div>
              <div className="penalty-empty-title">Toàn đội đang giữ chuẩn nghiệp vụ</div>
              <div className="penalty-empty-desc">
                Chưa có biên bản vi phạm nào trong tháng này. Hệ thống sẽ tự động khấu trừ vào bảng lương khi biên bản được duyệt.
              </div>
              <div className="penalty-empty-stats">
                <div className="penalty-empty-stat">
                  <div className="lbl">Chuỗi an toàn</div>
                  <div className="val pos">{longestStreak}<span className="u">ngày</span></div>
                </div>
                <div className="penalty-empty-divider" />
                <div className="penalty-empty-stat">
                  <div className="lbl">Vi phạm YTD</div>
                  <div className="val">{ytdPenalties.length}<span className="u">vụ</span></div>
                </div>
                <div className="penalty-empty-divider" />
                <div className="penalty-empty-stat">
                  <div className="lbl">Tiết kiệm phạt</div>
                  <div className="val pos">~{formatCurrency(ytdTotal)}<span className="u">đ</span></div>
                </div>
              </div>
              <div className="penalty-empty-actions">
                <Btn variant="secondary" icon={<ShieldCheck size={13} />} onClick={() => navigate('/config/penalty-reasons')}>Xem nội quy</Btn>
                <Btn variant="primary" icon={<Plus size={13} />} onClick={() => openDrawer()}>Lập biên bản</Btn>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tài xế</th>
                      <th>Mã lệnh</th>
                      <th>Lý do vi phạm</th>
                      <th className="num">Số tiền phạt</th>
                      <th>Ngày ghi nhận</th>
                      <th>Trạng thái</th>
                      {canCancel && <th style={{ width: 44 }} />}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPenalties.map(p => (
                      <tr key={p.id} style={p.status === 'CANCELED' ? { opacity: 0.5 } : undefined}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: 'var(--danger-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexShrink: 0,
                            }}>
                              {getInitials(p.driverName || 'T')}
                            </div>
                            <div className="row-strong">{p.driverName || 'Tài xế'}</div>
                          </div>
                        </td>
                        <td>
                          {p.tripId && p.tripCode
                             ? <a href={`/trips/${p.tripId}`} onClick={(e) => { e.preventDefault(); navigate(`/trips/${p.tripId}`); }} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.tripCode}</a>
                            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--ink-2)', maxWidth: 240 }}>
                          {p.reasonText || p.customReason || '—'}
                        </td>
                        <td className="num">
                          <strong style={{ color: 'var(--danger)' }}>-{formatCurrency(Number(p.amount))}</strong>
                        </td>
                        <td style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                            background: p.status === 'ACTIVE' ? 'var(--success-soft)' : 'var(--bg-3)',
                            color: p.status === 'ACTIVE' ? 'var(--success)' : 'var(--fg-3)',
                          }}>
                            {p.status === 'ACTIVE' ? '●' : '○'} {PENALTY_STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        {canCancel && (
                          <td>
                            {p.status !== 'CANCELED' && (
                              <button
                                className="penalty-row-act"
                                style={{ color: 'var(--danger)' }}
                                aria-label="Hủy kỷ luật"
                                onClick={() => setCancelTarget(p)}
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="penalty-table-foot">
                <span>Đang hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{filteredPenalties.length}</strong> biên bản</span>
              </div>
            </div>
          )}
        </Panel>

        {/* Right: Violation type reference */}
        <Panel flush>
          <div className="penalty-card-head">
            <div className="penalty-card-lead">
              <div className="penalty-card-icon">
                <FileText size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="penalty-card-title">
                  Phân loại vi phạm
                  <span className="count-pill">{reasons.length}</span>
                </div>
                <div className="penalty-card-sub">Bảng mức phạt nội quy 2026</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {reasons.map((r, idx) => {
              const amount = Number(r.defaultAmount);
              const sev = getSeverity(amount);
              const code = `KL-${String(idx + 1).padStart(2, '0')}`;
              return (
                <div className="penalty-vio-type-row" key={r.id}>
                  <div className={`penalty-vio-type-icon ${sev}`}>
                    <SeverityIcon severity={sev} />
                  </div>
                  <div className="penalty-vio-type-info">
                    <div className="penalty-vio-type-name">{r.reasonText}</div>
                    <div className="penalty-vio-type-meta">
                      <span className={`penalty-sev-pill ${sev}`}>{getSeverityLabel(sev)}</span>
                      <span className="code">{code}</span>
                    </div>
                  </div>
                  <div className="penalty-vio-type-fine">
                    <div className="amt">{formatCurrency(amount)}</div>
                    <div className="lbl">/ lần</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="penalty-table-foot">
            <div className="legend">
              <span>Cập nhật lần cuối: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{formatDate(new Date().toISOString().slice(0, 10))}</strong></span>
            </div>
            <a href="/config/penalty-reasons" onClick={(e) => { e.preventDefault(); navigate('/config/penalty-reasons'); }} style={{ color: 'var(--accent-2)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Sửa bảng phạt →</a>
          </div>
        </Panel>
      </div>

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <PenaltyFormDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setPreselectedDriver(undefined); }}
        drivers={drivers}
        reasons={reasons}
        onCreated={handlePenaltyCreated}
        preselectedDriverId={preselectedDriver}
      />

      {/* ── Cancel confirmation dialog ──────────────────────────────────── */}
      <CancelConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelPenalty}
        penalty={cancelTarget}
        loading={cancelLoading}
      />
    </div>
  );
}
