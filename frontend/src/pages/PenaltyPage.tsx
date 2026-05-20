import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { Driver, PenaltyReason } from '@nepocorp/shared';
import type { CreatePenaltyRequest } from '@nepocorp/shared';
import { AlertOctagon, Plus, FileWarning, RefreshCw, User, ClipboardList, ShieldAlert, Award } from 'lucide-react';
import { PageHeader, Card, FormGroup, KPI } from '../components/UI';

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

export default function PenaltyPage() {
  // List state
  const [penalties, setPenalties] = useState<PenaltyRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Dropdown data
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reasons, setReasons] = useState<PenaltyReason[]>([]);

  // Form state
  const [formDriverId, setFormDriverId] = useState('');
  const [formTripId, setFormTripId] = useState('');
  const [formReasonId, setFormReasonId] = useState('');
  const [formCustomReason, setFormCustomReason] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────

  const fetchPenalties = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await api.get<PenaltyRow[]>('/penalties');
      setPenalties(data);
    } catch (e: any) {
      setListError(e.message || 'Không thể tải danh sách phạt');
    } finally {
      setListLoading(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const data = await api.get<Driver[]>('/drivers');
      setDrivers(data.filter(d => d.status === 'ACTIVE'));
    } catch { /* silent */ }
  }, []);

  const fetchReasons = useCallback(async () => {
    try {
      const data = await api.get<PenaltyReason[]>('/penalty-reasons');
      setReasons(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPenalties();
    fetchDrivers();
    fetchReasons();
  }, [fetchPenalties, fetchDrivers, fetchReasons]);

  // ── Form submit ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formDriverId || !formAmount || !formDate) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const body: CreatePenaltyRequest = {
      driver_id: Number(formDriverId),
      amount: parseFloat(formAmount),
      date: formDate,
    };
    if (formTripId) body.trip_id = Number(formTripId);
    if (formReasonId) body.reason_id = Number(formReasonId);
    if (formCustomReason) body.custom_reason = formCustomReason;

    try {
      await api.post('/penalties', body);
      setSubmitSuccess(true);
      // Reset form
      setFormDriverId('');
      setFormTripId('');
      setFormReasonId('');
      setFormCustomReason('');
      setFormAmount('');
      setFormDate(new Date().toISOString().slice(0, 10));
      fetchPenalties();
    } catch (e: any) {
      setSubmitError(e.message || 'Lỗi khi tạo phạt');
    } finally {
      setSubmitting(false);
    }
  };

  // When reason changes, prefill amount from default
  const handleReasonChange = (reasonId: string) => {
    setFormReasonId(reasonId);
    if (reasonId) {
      const reason = reasons.find(r => r.id === Number(reasonId));
      if (reason?.default_amount) {
        setFormAmount(reason.default_amount);
      }
    }
  };

  // ── Stats Calculations ───────────────────────────────────────────────────

  const totalPenaltyAmount = penalties.reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalIncidents = penalties.length;
  
  // Find highest penalized driver
  const driverPenaltyTotals: Record<string, number> = {};
  penalties.forEach(p => {
    const name = p.driverName || `Tài xế #${p.driver_id}`;
    driverPenaltyTotals[name] = (driverPenaltyTotals[name] || 0) + parseFloat(p.amount);
  });
  
  let maxPenalizedDriver = '—';
  let maxAmount = 0;
  Object.entries(driverPenaltyTotals).forEach(([name, amt]) => {
    if (amt > maxAmount) {
      maxAmount = amt;
      maxPenalizedDriver = name;
    }
  });

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* Page Header */}
      <PageHeader 
        title="Kỷ luật & GPS" 
        description="Quản lý lỗi nghiệp vụ, biên bản xử phạt và khấu trừ trực tiếp vào bảng lương tài xế."
        action={
          <button className="btn btn-secondary btn-sm" onClick={fetchPenalties} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36 }}>
            <RefreshCw size={14} /> Tải lại
          </button>
        }
      />

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KPI 
          label="Tổng tiền khấu trừ" 
          value={formatCurrency(totalPenaltyAmount)} 
          icon={ClipboardList}
          variant="danger"
          meta="Ghi nhận vào Thu nhập khác"
        />
        <KPI 
          label="Số vụ vi phạm" 
          value={totalIncidents} 
          unit="vụ"
          icon={ShieldAlert}
          variant="warn"
          meta="Lỗi vi phạm kỷ luật tháng"
        />
        <KPI 
          label="Bị phạt nhiều nhất" 
          value={maxPenalizedDriver} 
          icon={User}
          variant="default"
          meta={maxAmount > 0 ? `Tổng phạt: ${formatCurrency(maxAmount)}` : 'Chưa có vi phạm'}
        />
        <KPI 
          label="Đối tượng khấu trừ" 
          value="100%" 
          unit="Tài xế"
          icon={Award}
          variant="success"
          meta="Trừ trực tiếp lương cứng"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'start' }}>
        {/* ── Left: Penalty list ──────────────────────────────────────────── */}
        <div>
          <Card 
            title="Sổ biên bản vi phạm" 
            subtitle="Danh sách chi tiết các sự cố nghiệp vụ phát sinh"
            noPadding
          >
            {listError && (
              <div style={{ padding: '16px 20px', color: 'var(--danger)', fontSize: 13, borderBottom: '1px solid var(--border-2)', background: 'var(--danger-soft)' }}>
                {listError}
              </div>
            )}

            {listLoading ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
                <div className="spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }}></div>
                <div style={{ marginTop: 8, fontSize: 12 }}>Đang tải danh sách...</div>
              </div>
            ) : penalties.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--fg-3)' }}>
                <FileWarning size={36} style={{ color: 'var(--fg-3)', marginBottom: 12, margin: '0 auto' }} />
                <h4 style={{ color: 'var(--fg-1)', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Chưa có khoản phạt nào</h4>
                <p style={{ fontSize: 12, margin: 0 }}>Không tìm thấy biên bản xử phạt trong cơ sở dữ liệu.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tt-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Tài xế</th>
                      <th>Mã lệnh</th>
                      <th>Lý do vi phạm</th>
                      <th style={{ textAlign: 'right' }}>Số tiền phạt</th>
                      <th style={{ paddingRight: 20 }}>Ngày ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penalties.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--fg-1)', paddingLeft: 20 }}>
                          {p.driverName || `#${p.driver_id}`}
                        </td>
                        <td style={{ color: 'var(--fg-3)' }}>
                          {p.trip_id ? (
                            <a href={`/trips/${p.trip_id}`} style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
                              #{p.trip_id}
                            </a>
                          ) : '—'}
                        </td>
                        <td>
                          <span style={{ color: 'var(--fg-2)' }}>
                            {p.reasonText || p.custom_reason || '—'}
                          </span>
                        </td>
                        <td className="num" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          -{formatCurrency(Number(p.amount))}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', paddingRight: 20, color: 'var(--fg-3)' }}>{formatDate(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Create penalty form ──────────────────────────────────── */}
        <div>
          <Card 
            title="Lập biên bản kỷ luật" 
            subtitle="Nhập thông tin lỗi vi phạm nghiệp vụ để khấu trừ trực tiếp"
          >
            {submitError && (
              <div style={{
                padding: '10px 14px', marginBottom: 16,
                background: 'var(--danger-soft)', color: 'var(--danger)',
                borderRadius: 'var(--radius-md)', fontSize: 12.5,
              }}>
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div style={{
                padding: '10px 14px', marginBottom: 16,
                background: 'var(--success-soft)', color: 'var(--success)',
                borderRadius: 'var(--radius-md)', fontSize: 12.5,
              }}>
                Đã ghi nhận biên bản xử phạt tài xế thành công!
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Driver */}
              <FormGroup label="Tài xế vi phạm *">
                <select
                  className="input"
                  value={formDriverId}
                  onChange={e => setFormDriverId(e.target.value)}
                >
                  <option value="">-- Chọn tài xế --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </FormGroup>

              {/* Trip ID */}
              <FormGroup label="Liên kết chuyến đi (Mã lệnh - tùy chọn)">
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 1045"
                  value={formTripId}
                  onChange={e => setFormTripId(e.target.value)}
                />
              </FormGroup>

              {/* Reason */}
              <FormGroup label="Lỗi nghiệp vụ (Danh mục)">
                <select
                  className="input"
                  value={formReasonId}
                  onChange={e => handleReasonChange(e.target.value)}
                >
                  <option value="">-- Chọn lý do định mức --</option>
                  {reasons.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.reason_text} ({formatCurrency(Number(r.default_amount))})
                    </option>
                  ))}
                </select>
              </FormGroup>

              {/* Custom reason */}
              <FormGroup label="Lý do chi tiết khác">
                <input
                  className="input"
                  placeholder="Ghi cụ thể lỗi vi phạm phát sinh"
                  value={formCustomReason}
                  onChange={e => setFormCustomReason(e.target.value)}
                />
              </FormGroup>

              {/* Amount */}
              <FormGroup label="Số tiền khấu trừ (VND) *">
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                />
              </FormGroup>

              {/* Date */}
              <FormGroup label="Ngày vi phạm *">
                <input
                  className="input"
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                />
              </FormGroup>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40 }}
                disabled={submitting || !formDriverId || !formAmount || !formDate}
                onClick={handleSubmit}
              >
                <AlertOctagon size={15} />
                {submitting ? 'Đang xử lý...' : 'Xác nhận xử phạt'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
