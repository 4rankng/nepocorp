import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { Driver, PenaltyReason } from '@nepocorp/shared';
import type { CreatePenaltyRequest } from '@nepocorp/shared';
import { AlertOctagon, Plus, User, FileWarning, RefreshCw } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Phạt</h1>
          <p>Quản lý các khoản phạt và khấu trừ</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchPenalties}>
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      <div className="row-3">
        {/* ── Left: Penalty list ──────────────────────────────────────────── */}
        <div>
          <div className="card-shell">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileWarning size={15} style={{ color: 'var(--fg-3)' }} />
                Danh sách phạt
              </h3>
              <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {penalties.length} muc
              </span>
            </div>

            {listError && (
              <div style={{ padding: '12px 20px', color: 'var(--danger)', fontSize: 13, borderBottom: '1px solid var(--border-2)' }}>
                {listError}
              </div>
            )}

            {listLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
                Đang tải...
              </div>
            ) : penalties.length === 0 ? (
              <div className="empty-state" style={{ border: 'none', margin: 0, padding: '48px 24px' }}>
                <img src="/assets/illustrations/empty-pricing.svg" alt="No penalties" style={{ width: 110, marginBottom: 12 }} />
                <h3 className="empty-state-title">Chưa có khoản phạt nào</h3>
                <p className="empty-state-desc" style={{ fontSize: 12, marginBottom: 0 }}>
                  Không tìm thấy dữ liệu phạt. Sử dụng biểu mẫu bên phải để tạo khoản phạt mới cho tài xế.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tt-table">
                  <thead>
                    <tr>
                      <th>Tài xế</th>
                      <th>Lệnh</th>
                      <th>Lý do</th>
                      <th style={{ textAlign: 'right' }}>Số tiền</th>
                      <th>Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penalties.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>
                          {p.driverName || `#${p.driver_id}`}
                        </td>
                        <td style={{ color: 'var(--fg-3)' }}>
                          {p.trip_id ? `#${p.trip_id}` : '—'}
                        </td>
                        <td>
                          <span style={{ color: 'var(--fg-2)' }}>
                            {p.reasonText || p.custom_reason || '—'}
                          </span>
                        </td>
                        <td className="num" style={{ color: 'var(--danger)' }}>
                          {formatCurrency(p.amount)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Create penalty form ──────────────────────────────────── */}
        <div>
          <div className="card-shell" style={{ position: 'sticky', top: 72 }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={15} style={{ color: 'var(--fg-3)' }} />
                Tạo phạt mới
              </h3>
            </div>
            <div style={{ padding: 20 }}>
              {submitError && (
                <div style={{
                  padding: '10px 14px', marginBottom: 14,
                  background: 'var(--danger-soft)', color: 'var(--danger-text)',
                  borderRadius: 'var(--radius-md)', fontSize: 13,
                }}>
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div style={{
                  padding: '10px 14px', marginBottom: 14,
                  background: 'var(--success-soft)', color: 'var(--success-text)',
                  borderRadius: 'var(--radius-md)', fontSize: 13,
                }}>
                  Đã tạo khoản phạt thành công
                </div>
              )}

              {/* Driver */}
              <div className="field">
                <label>Tài xế *</label>
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
              </div>

              {/* Trip ID */}
              <div className="field">
                <label>Mã lệnh (tự chọn)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Để trống nếu không liên quan lệnh"
                  value={formTripId}
                  onChange={e => setFormTripId(e.target.value)}
                />
              </div>

              {/* Reason */}
              <div className="field">
                <label>Lý do</label>
                <select
                  className="input"
                  value={formReasonId}
                  onChange={e => handleReasonChange(e.target.value)}
                >
                  <option value="">-- Chọn lý do --</option>
                  {reasons.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.reason_text} ({formatCurrency(r.default_amount)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom reason */}
              <div className="field">
                <label>Lý do khác</label>
                <input
                  className="input"
                  placeholder="Nếu không chọn lý do ở trên"
                  value={formCustomReason}
                  onChange={e => setFormCustomReason(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div className="field">
                <label>Số tiền (VND) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="field">
                <label>Ngày *</label>
                <input
                  className="input"
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 4 }}
                disabled={submitting || !formDriverId || !formAmount || !formDate}
                onClick={handleSubmit}
              >
                <AlertOctagon size={15} />
                {submitting ? 'Đang xử lý...' : 'Tạo khoản phạt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
