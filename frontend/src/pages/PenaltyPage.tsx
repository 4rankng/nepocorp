import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { Driver, PenaltyReason } from '@nepocorp/shared';
import type { CreatePenaltyRequest } from '@nepocorp/shared';
import { AlertOctagon, ShieldCheck, AlertTriangle, User, Save, Loader2, X } from 'lucide-react';
import { Card, FormGroup } from '../components/UI';

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
  const [penalties, setPenalties] = useState<PenaltyRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reasons, setReasons] = useState<PenaltyReason[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formDriverId, setFormDriverId] = useState('');
  const [listMonthFilter, setListMonthFilter] = useState('');
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
    try {
      const data = await api.get<PenaltyRow[] | { items: PenaltyRow[] }>('/penalties');
      setPenalties(Array.isArray(data) ? data : (data as any).items ?? []);
    } catch { /* silent */ } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPenalties();
    api.get<any>('/drivers').then(d => {
      const arr: Driver[] = Array.isArray(d) ? d : (d.items ?? []);
      setDrivers(arr.filter(x => x.status === 'ACTIVE'));
    }).catch(() => {});
    api.get<any>('/penalty-reasons').then(d => {
      setReasons(Array.isArray(d) ? d : (d.items ?? []));
    }).catch(() => {});
  }, [fetchPenalties]);

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
      setFormDriverId(''); setFormTripId(''); setFormReasonId('');
      setFormCustomReason(''); setFormAmount('');
      setFormDate(new Date().toISOString().slice(0, 10));
      setShowForm(false);
      fetchPenalties();
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

  // ── Derived stats ────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = `T${now.getMonth() + 1}`;

  const monthPenalties = penalties.filter(p => (p.date || '').startsWith(thisMonth));
  const totalMonthAmount = monthPenalties.reduce((s, p) => s + parseFloat(p.amount), 0);
  const incidentCount = monthPenalties.length;

  // Drivers with NO penalty this month
  const penalizedDriverIds = new Set(monthPenalties.map(p => p.driver_id));
  const safeDrivers = drivers.filter(d => !penalizedDriverIds.has(d.id));
  const safeCount = safeDrivers.length;

  // Per-driver stats for scorecards
  const driverStatsMap = new Map<number, { name: string; count: number; total: number }>();
  drivers.forEach(d => driverStatsMap.set(d.id, { name: d.name, count: 0, total: 0 }));
  monthPenalties.forEach(p => {
    const s = driverStatsMap.get(p.driver_id) || { name: '—', count: 0, total: 0 };
    s.count++;
    s.total += parseFloat(p.amount);
    driverStatsMap.set(p.driver_id, s);
  });

  // Sort drivers: most penalized first
  const driverScoreCards = Array.from(driverStatsMap.values()).sort((a, b) => b.total - a.total);

  // Filtered penalties for the list
  const filteredPenalties = listMonthFilter
    ? penalties.filter(p => (p.date || '').startsWith(listMonthFilter))
    : penalties;

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kỷ luật</h1>
          <p className="page-subtitle">
            Quản lý vi phạm nghiệp vụ và khấu trừ trực tiếp vào bảng lương tài xế
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--primary" onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOctagon size={14} />
            Lập biên bản
          </button>
        </div>
      </div>

      {/* ── KPI grid (3 cards, no GPS) ────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi kpi--danger">
          <div className="kpi__top">
            <span className="kpi__label">Vi phạm {monthLabel}</span>
            <div className="kpi__icon"><AlertTriangle size={18} /></div>
          </div>
          <div className="kpi__value">{incidentCount}<span className="kpi__value-unit"> vụ</span></div>
          <div className="kpi__meta">Kỷ luật trong tháng</div>
        </div>
        <div className="kpi kpi--warn">
          <div className="kpi__top">
            <span className="kpi__label">Tổng phạt {monthLabel}</span>
            <div className="kpi__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="kpi__value" style={{ fontSize: totalMonthAmount > 9999999 ? 20 : 28 }}>{formatCurrency(totalMonthAmount)}</div>
          <div className="kpi__meta">Khấu trừ vào bảng lương</div>
        </div>
        <div className="kpi kpi--success">
          <div className="kpi__top">
            <span className="kpi__label">Lái xe an toàn</span>
            <div className="kpi__icon"><ShieldCheck size={18} /></div>
          </div>
          <div className="kpi__value">{safeCount}<span className="kpi__value-unit">/{drivers.length}</span></div>
          <div className="kpi__meta kpi__meta--up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Không vi phạm {monthLabel}
          </div>
        </div>
      </div>

      {/* ── Inline form (slide-in) ────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-line, var(--line-2))', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Lập biên bản kỷ luật</h3>
            <button className="btn btn--ghost btn--sm btn--icon" onClick={() => setShowForm(false)}><X size={14} /></button>
          </div>

          {submitError && (
            <div style={{ padding: '10px 14px', marginBottom: 16, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 12.5 }}>
              {submitError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 1 }}>
              <button
                className="btn btn--primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={submitting || !formDriverId || !formAmount || !formDate}
                onClick={handleSubmit}
              >
                {submitting ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                Xác nhận
              </button>
              <button className="btn btn--ghost" onClick={() => setShowForm(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div style={{ padding: '12px 16px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
          ✓ Đã ghi nhận biên bản xử phạt thành công.
        </div>
      )}

      {/* ── Driver scorecards (compact list) ─────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 12, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line-2)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600 }}>
            Bảng điểm tài xế — {monthLabel}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{driverScoreCards.length} tài xế</span>
        </div>
        {driverScoreCards.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Chưa có dữ liệu tài xế
          </div>
        ) : (
          driverScoreCards.map((ds, idx) => {
            const isSafe = ds.count === 0;
            const initial = ds.name.split(' ').pop()?.[0]?.toUpperCase() || '?';
            return (
              <div key={ds.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                borderBottom: idx < driverScoreCards.length - 1 ? '1px solid var(--line-3)' : 'none',
                background: !isSafe ? 'var(--danger-soft, #fff5f5)' : 'transparent',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: isSafe ? 'var(--success-soft)' : 'var(--danger-soft)',
                  color: isSafe ? 'var(--success)' : 'var(--danger)',
                  border: `1.5px solid ${isSafe ? 'var(--success)' : 'var(--danger)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                }}>
                  {initial}
                </div>

                {/* Name */}
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ds.name}
                  {ds.count > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--danger)' }}>
                      {ds.count} vi phạm
                    </span>
                  )}
                </div>

                {/* Status pill */}
                {isSafe ? (
                  <span className="pill pill--success" style={{ flexShrink: 0, fontSize: 11 }}>
                    <ShieldCheck size={10} style={{ marginRight: 3 }} />An toàn
                  </span>
                ) : (
                  <span className="pill pill--danger" style={{ flexShrink: 0, fontSize: 11 }}>
                    <AlertTriangle size={10} style={{ marginRight: 3 }} />Vi phạm
                  </span>
                )}

                {/* Deduction amount */}
                <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ds.total > 0 ? 'var(--danger)' : 'var(--ink-3)', minWidth: 60, textAlign: 'right' }}>
                  {ds.total > 0 ? `-${formatCurrency(ds.total)}` : '—'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Violations feed ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: 0 }}>
          Sổ biên bản vi phạm · {filteredPenalties.length}
        </h3>
        <select
          className="input"
          style={{ width: 150, height: 28, fontSize: 12 }}
          value={listMonthFilter}
          onChange={e => setListMonthFilter(e.target.value)}
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

      {listLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div className="spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--line-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
        </div>
      ) : filteredPenalties.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' }}>
          <ShieldCheck size={32} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink-2)' }}>Chưa có biên bản vi phạm nào</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>Tất cả tài xế đang chấp hành tốt nội quy.</p>
        </Card>
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
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexShrink: 0 }}>
                          <User size={13} />
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
          <div className="table-foot">
            <span>Đang hiển thị <strong style={{ fontFamily: 'var(--font-mono)' }}>{penalties.length}</strong> biên bản</span>
          </div>
        </div>
      )}
    </div>
  );
}
