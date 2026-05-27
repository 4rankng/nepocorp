import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { Driver, PenaltyReason, Truck } from '@nepocorp/shared';
import type { CreatePenaltyRequest } from '@nepocorp/shared';
import { TruckStatus, DriverStatus } from '@nepocorp/shared';
import {
  Shield, ShieldCheck, Download, Plus, Eye, FileText,
  Zap, Trophy, Clock, Save, Loader2, X, Users, AlertTriangle,
} from 'lucide-react';
import {
  Panel, Btn, Drawer, FormGroup,
} from '../components/UI';

// ─── Mock data for design review ──────────────────────────────────────────────

const USE_MOCK = true;

const MOCK_TRUCKS: Truck[] = [
  { id: 1, license_plate: '29C-345.67', status: TruckStatus.ACTIVE, created_at: '2022-03-10', updated_at: '2026-01-15', deleted_at: null },
  { id: 2, license_plate: '29C-123.45', status: TruckStatus.ACTIVE, created_at: '2022-06-20', updated_at: '2026-02-01', deleted_at: null },
  { id: 3, license_plate: '29C-456.78', status: TruckStatus.ACTIVE, created_at: '2023-05-15', updated_at: '2026-03-10', deleted_at: null },
  { id: 4, license_plate: '29C-234.56', status: TruckStatus.ACTIVE, created_at: '2024-01-08', updated_at: '2026-04-02', deleted_at: null },
];

const MOCK_DRIVERS: Driver[] = [
  { id: 1, user_id: 101, name: 'Trần Thị Thương', phone: '0901234567', assigned_truck_id: 1, base_salary: '12000000', status: DriverStatus.ACTIVE, created_at: '2022-02-15', updated_at: '2026-05-01', deleted_at: null },
  { id: 2, user_id: 102, name: 'Phạm Đức Minh', phone: '0902345678', assigned_truck_id: 2, base_salary: '11000000', status: DriverStatus.ACTIVE, created_at: '2022-08-10', updated_at: '2026-05-01', deleted_at: null },
  { id: 3, user_id: 103, name: 'Vũ Minh Đức', phone: '0903456789', assigned_truck_id: 3, base_salary: '10500000', status: DriverStatus.ACTIVE, created_at: '2023-06-20', updated_at: '2026-05-01', deleted_at: null },
  { id: 4, user_id: 104, name: 'Hoàng Nam', phone: '0904567890', assigned_truck_id: 4, base_salary: '10000000', status: DriverStatus.ACTIVE, created_at: '2024-01-15', updated_at: '2026-05-01', deleted_at: null },
  { id: 5, user_id: 105, name: 'Nguyễn Văn Hùng', phone: '0905678901', assigned_truck_id: null, base_salary: '9500000', status: DriverStatus.ACTIVE, created_at: '2024-08-22', updated_at: '2026-05-01', deleted_at: null },
  { id: 6, user_id: 106, name: 'Lê Văn Tài', phone: '0906789012', assigned_truck_id: null, base_salary: '9000000', status: DriverStatus.ACTIVE, created_at: '2025-03-10', updated_at: '2026-05-01', deleted_at: null },
  { id: 7, user_id: 107, name: 'Lê Anh Bình', phone: '0907890123', assigned_truck_id: null, base_salary: '8500000', status: DriverStatus.ACTIVE, created_at: '2026-01-20', updated_at: '2026-05-01', deleted_at: null },
];

const MOCK_REASONS: PenaltyReason[] = [
  { id: 1, reason_text: 'Chậm giờ giao hàng', default_amount: '200000', created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
  { id: 2, reason_text: 'Sai khai báo nhiên liệu', default_amount: '500000', created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
  { id: 3, reason_text: 'Đi sai tuyến điều phối', default_amount: '500000', created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
  { id: 4, reason_text: 'Hư hỏng xe do bất cẩn', default_amount: '1000000', created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
  { id: 5, reason_text: 'Vi phạm an toàn lao động', default_amount: '1500000', created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
  { id: 6, reason_text: 'Bỏ chuyến không lý do', default_amount: '2000000', created_at: '2026-01-01', updated_at: '2026-01-01', deleted_at: null },
];

// Penalties from previous months so the scoreboard has variety but current month is clean
const MOCK_PENALTIES: PenaltyRow[] = [
  { id: 1, driver_id: 5, trip_id: 201, reason_id: 1, custom_reason: null, amount: '200000', date: '2026-04-18', created_at: '2026-04-18', updated_at: '2026-04-18', deleted_at: null, driverName: 'Nguyễn Văn Hùng', reasonText: 'Chậm giờ giao hàng' },
  { id: 2, driver_id: 5, trip_id: 215, reason_id: 3, custom_reason: null, amount: '500000', date: '2026-03-22', created_at: '2026-03-22', updated_at: '2026-03-22', deleted_at: null, driverName: 'Nguyễn Văn Hùng', reasonText: 'Đi sai tuyến điều phối' },
  { id: 3, driver_id: 6, trip_id: 198, reason_id: 2, custom_reason: null, amount: '500000', date: '2026-04-05', created_at: '2026-04-05', updated_at: '2026-04-05', deleted_at: null, driverName: 'Lê Văn Tài', reasonText: 'Sai khai báo nhiên liệu' },
  { id: 4, driver_id: 7, trip_id: null, reason_id: 5, custom_reason: null, amount: '1500000', date: '2026-04-28', created_at: '2026-04-28', updated_at: '2026-04-28', deleted_at: null, driverName: 'Lê Anh Bình', reasonText: 'Vi phạm an toàn lao động' },
  { id: 5, driver_id: 4, trip_id: 180, reason_id: 1, custom_reason: null, amount: '200000', date: '2026-02-14', created_at: '2026-02-14', updated_at: '2026-02-14', deleted_at: null, driverName: 'Hoàng Nam', reasonText: 'Chậm giờ giao hàng' },
  { id: 6, driver_id: 3, trip_id: 165, reason_id: 4, custom_reason: 'Lốp nổ do không kiểm tra', amount: '1000000', date: '2026-01-20', created_at: '2026-01-20', updated_at: '2026-01-20', deleted_at: null, driverName: 'Vũ Minh Đức', reasonText: 'Hư hỏng xe do bất cẩn' },
];

// ─── API normalisers (backend returns camelCase from Drizzle) ─────────────────

function normalizeDriver(d: any): Driver {
  return {
    id: d.id,
    user_id: d.userId ?? d.user_id,
    name: d.name,
    phone: d.phone ?? null,
    assigned_truck_id: d.assignedTruckId ?? d.assigned_truck_id ?? null,
    base_salary: d.baseSalary ?? d.base_salary ?? null,
    status: d.status,
    created_at: d.createdAt ?? d.created_at ?? '',
    updated_at: d.updatedAt ?? d.updated_at ?? '',
    deleted_at: d.deletedAt ?? d.deleted_at ?? null,
  };
}

function normalizePenalty(p: any): PenaltyRow {
  return {
    id: p.id,
    driver_id: p.driverId ?? p.driver_id,
    trip_id: p.tripId ?? p.trip_id ?? null,
    reason_id: p.reasonId ?? p.reason_id ?? null,
    custom_reason: p.customReason ?? p.custom_reason ?? null,
    amount: p.amount,
    date: p.date ?? '',
    created_at: p.createdAt ?? p.created_at ?? '',
    updated_at: p.updatedAt ?? p.updated_at ?? '',
    deleted_at: p.deletedAt ?? p.deleted_at ?? null,
    driverName: p.driverName,
    reasonText: p.reasonText,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'var(--accent-soft)', color: 'var(--accent-2)' },
  { bg: '#E0F2FE', color: '#0369A1' },
  { bg: '#FCE7F3', color: '#BE185D' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#EDE9FE', color: '#6D28D9' },
  { bg: '#FEE2E2', color: '#DC2626' },
  { bg: '#CCFBF1', color: '#0F766E' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 2][0] + parts[parts.length - 1][0];
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

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
    .filter(p => p.driver_id === driverId && p.date)
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PenaltyRow {
  id: number;
  driver_id: number;
  trip_id: number | null;
  reason_id: number | null;
  custom_reason: string | null;
  amount: string;
  date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  driverName?: string;
  reasonText?: string;
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
      driver_id: Number(formDriverId),
      amount: parseFloat(formAmount),
      date: formDate,
    };
    if (formTripId) body.trip_id = Number(formTripId);
    if (formReasonId) body.reason_id = Number(formReasonId);
    if (formCustomReason) body.custom_reason = formCustomReason;
    try {
      if (USE_MOCK) {
        // Simulate API delay
        await new Promise(r => setTimeout(r, 500));
        onCreated();
        onClose();
        return;
      }
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
      if (reason?.default_amount) setFormAmount(reason.default_amount);
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
            {reasons.map(r => <option key={r.id} value={r.id}>{r.reason_text} ({formatCurrency(Number(r.default_amount))})</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Lý do chi tiết khác">
          <input className="input" placeholder="Mô tả lỗi phát sinh..." value={formCustomReason} onChange={e => setFormCustomReason(e.target.value)} />
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PenaltyPage() {
  const [penalties, setPenalties] = useState<PenaltyRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reasons, setReasons] = useState<PenaltyReason[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preselectedDriver, setPreselectedDriver] = useState<number | undefined>();
  const [scoreFilter, setScoreFilter] = useState<'7d' | '30d' | '90d' | 'ytd'>('90d');
  const [logFilter, setLogFilter] = useState<'all' | 'pending' | 'deducted'>('all');

  // ── Data loading ─────────────────────────────────────────────────────────────

  const fetchPenalties = useCallback(async () => {
    setListLoading(true);
    try {
      if (USE_MOCK) { setPenalties(MOCK_PENALTIES); return; }
      const data = await api.get<any>('/penalties');
      const raw: any[] = Array.isArray(data) ? data : (data as any).items ?? [];
      setPenalties(raw.map(normalizePenalty));
    } catch { /* silent */ } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPenalties();
    if (USE_MOCK) {
      setDrivers(MOCK_DRIVERS);
      setReasons(MOCK_REASONS);
      setTrucks(MOCK_TRUCKS);
      return;
    }
    Promise.all([
      api.get<any>('/drivers'),
      api.get<any>('/penalty-reasons'),
      api.get<any>('/trucks'),
    ]).then(([d, r, t]) => {
      const rawDrivers: any[] = Array.isArray(d) ? d : d.items ?? [];
      setDrivers(rawDrivers.map(normalizeDriver).filter((x: Driver) => x.status === 'ACTIVE'));
      setReasons(Array.isArray(r) ? r : r.items ?? []);
      setTrucks(Array.isArray(t) ? t : t.items ?? []);
    }).catch(() => {});
  }, [fetchPenalties]);

  // ── Cross-reference maps ─────────────────────────────────────────────────────

  const truckMap = new Map<number, Truck>();
  trucks.forEach(t => truckMap.set(t.id, t));

  // ── Derived stats ────────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = `T${now.getMonth() + 1}`;

  const monthPenalties = penalties.filter(p => (p.date || '').startsWith(thisMonth));
  const totalMonthAmount = monthPenalties.reduce((s, p) => s + parseFloat(p.amount), 0);
  const incidentCount = monthPenalties.length;

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthCount = penalties.filter(p => (p.date || '').startsWith(prevMonthKey)).length;
  const monthComparison = prevMonthCount > 0
    ? `Giảm ${Math.round((1 - incidentCount / prevMonthCount) * 100)}% so với T${prevMonth.getMonth() + 1}`
    : incidentCount === 0 ? 'Tháng sạch' : '';

  const penalizedDriverIds = new Set(monthPenalties.map(p => p.driver_id));
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
    const streakDays = computeStreak(d.id, penalties, d.created_at);
    const driverPenalties = penalties.filter(p => p.driver_id === d.id && p.date >= cutoffStr);
    const violationsInPeriod = driverPenalties.length;
    const driverYTD = ytdPenalties.filter(p => p.driver_id === d.id);
    const fineYTD = driverYTD.reduce((s, p) => s + parseFloat(p.amount), 0);
    const grade = getGrade(streakDays, violationsInPeriod);
    const truckPlate = d.assigned_truck_id && truckMap.has(d.assigned_truck_id)
      ? truckMap.get(d.assigned_truck_id)!.license_plate
      : null;
    return { ...d, streakDays, violationsInPeriod, fineYTD, grade, truckPlate };
  }).sort((a, b) => b.streakDays - a.streakDays);

  const longestStreak = driverDetails.reduce((max, d) => Math.max(max, d.streakDays), 0);
  const streakLeader = driverDetails.find(d => d.streakDays === longestStreak)?.name || '—';
  const avgStreak = driverDetails.length > 0
    ? Math.round(driverDetails.reduce((s, d) => s + d.streakDays, 0) / driverDetails.length)
    : 0;
  const driversOver90 = driverDetails.filter(d => d.streakDays >= 90).length;
  const driversOver6m = driverDetails.filter(d => d.streakDays >= 180).length;

  // ── Violation log filtering ──────────────────────────────────────────────────

  const filteredPenalties = penalties; // status filter is future work; show all for now

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
                {monthLabel} · {incidentCount === 0 ? 'Sạch' : `${incidentCount} vụ`}
              </span>
            </div>
            <p className="page-subtitle">
              Theo dõi vi phạm nghiệp vụ, mức phạt khấu trừ trực tiếp vào bảng lương tài xế
            </p>
          </div>
        </div>
        <div className="page-actions">
          <Btn variant="secondary" icon={<Download size={14} />}>
            Xuất báo cáo
          </Btn>
          <Btn variant="primary" icon={<Plus size={14} />} onClick={() => openDrawer()}>
            Lập biên bản
          </Btn>
        </div>
      </div>

      {/* ── KPI strip (4 cards) ──────────────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi kpi--success">
          <div className="kpi__top">
            <span className="kpi__label">Vi phạm {monthLabel}</span>
            <div className="kpi__icon"><Shield size={18} /></div>
          </div>
          <div className="kpi__value">{incidentCount}<span className="kpi__value-unit"> vụ</span></div>
          <div className="penalty-kpi-meta">
            <span className="dot" />
            <span className="pos">{monthComparison || 'Không có so sánh'}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__label">Tổng phạt {monthLabel}</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="kpi__value" style={{ fontSize: totalMonthAmount > 9999999 ? 20 : 28 }}>{formatCurrency(totalMonthAmount)}</div>
          <div className="penalty-kpi-meta">
            <span>Khấu trừ vào bảng lương</span>
            <span className="sep">·</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>YTD {formatCurrency(ytdTotal)}</span>
          </div>
        </div>
        <div className="kpi kpi--info">
          <div className="kpi__top">
            <span className="kpi__label">Lái xe đạt chuẩn</span>
            <div className="kpi__icon"><Users size={18} /></div>
          </div>
          <div className="kpi__value">{safeCount}<span className="kpi__value-unit">/{drivers.length} tài xế</span></div>
          <div className="penalty-kpi-meta">
            <span className="dot" />
            <span className="pos">{drivers.length > 0 ? Math.round(safeCount / drivers.length * 100) : 0}% toàn đội</span>
            <span className="sep">·</span>
            <span>{drivers.length - safeCount} cần nhắc nhở</span>
          </div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top">
            <span className="kpi__label">Chuỗi an toàn</span>
            <div className="kpi__icon"><Zap size={18} /></div>
          </div>
          <div className="kpi__value">{longestStreak}<span className="kpi__value-unit"> ngày</span></div>
          <div className="penalty-kpi-meta">
            <span>{streakLeader} dẫn đầu</span>
          </div>
        </div>
      </div>

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
              <div className="penalty-card-sub">Sắp xếp theo chuỗi ngày sạch và mức an toàn nghiệp vụ</div>
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
                  const ac = getAvatarColor(d.id);
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
                          <span className="penalty-driver-mini" style={{ background: ac.bg, color: ac.color }}>
                            {getInitials(d.name)}
                          </span>
                          <span className="penalty-driver-info">
                            <div className="name">{d.name}</div>
                            <div className="role">
                              {d.truckPlate || 'Chưa phân xe'} · {formatTenure(d.created_at)}
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
                        <button className="penalty-row-act" aria-label="Xem chi tiết">
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
            <span>TB chuỗi sạch: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{avgStreak} ngày</strong></span>
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
                  <div className="lbl">Chuỗi sạch</div>
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
                <Btn variant="secondary" icon={<ShieldCheck size={13} />}>Xem nội quy</Btn>
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPenalties.map(p => (
                      <tr key={p.id}>
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
                          {p.trip_id
                            ? <a href={`/trips/${p.trip_id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>#{p.trip_id}</a>
                            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--ink-2)', maxWidth: 240 }}>
                          {p.reasonText || p.custom_reason || '—'}
                        </td>
                        <td className="num">
                          <strong style={{ color: 'var(--danger)' }}>-{formatCurrency(Number(p.amount))}</strong>
                        </td>
                        <td style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
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
              const amount = Number(r.default_amount);
              const sev = getSeverity(amount);
              const code = `KL-${String(idx + 1).padStart(2, '0')}`;
              return (
                <div className="penalty-vio-type-row" key={r.id}>
                  <div className={`penalty-vio-type-icon ${sev}`}>
                    <SeverityIcon severity={sev} />
                  </div>
                  <div className="penalty-vio-type-info">
                    <div className="penalty-vio-type-name">{r.reason_text}</div>
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
            <a href="/config/penalty-reasons" style={{ color: 'var(--accent-2)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Sửa bảng phạt →</a>
          </div>
        </Panel>
      </div>

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <PenaltyFormDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setPreselectedDriver(undefined); }}
        drivers={drivers}
        reasons={reasons}
        onCreated={fetchPenalties}
        preselectedDriverId={preselectedDriver}
      />
    </div>
  );
}
