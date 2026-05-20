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

      {/* ── Driver scorecards ─────────────────────────────────────────────── */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: '0 0 12px' }}>
        Bảng điểm tài xế — {monthLabel}
      </h3>
      <div className="fleet-board" style={{ marginBottom: 32 }}>
        {driverScoreCards.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '32px 24px', textAlign: 'center', color: 'var(--ink-3)' }}>
            Chưa có dữ liệu tài xế
          </div>
        )}
        {driverScoreCards.map(ds => {
          const isSafe = ds.count === 0;
          return (
            <div key={ds.name} className="vstatus">
              <div className="vstatus__head">
                <div>
                  <span className="vstatus__plate" style={isSafe
                    ? { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }
                    : { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }
                  }>{ds.name.split(' ').pop()}</span>
                  <div className="vstatus__driver" style={{ marginTop: 8 }}>{ds.name}</div>
                  <div className="vstatus__meta">{isSafe ? 'Không vi phạm' : `${ds.count} vi phạm tháng này`}</div>
                </div>
                <div className="vstatus__route-icon" style={isSafe
                  ? { background: 'var(--success-soft)', color: 'var(--success)' }
                  : { background: 'var(--danger-soft)', color: 'var(--danger)' }
                }>
                  {isSafe ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                </div>
              </div>
              <div className="vstatus__body">
                {isSafe
                  ? <span className="pill pill--success" style={{ marginBottom: 8, display: 'inline-flex' }}><span className="dot" />An toàn</span>
                  : <span className="pill pill--danger" style={{ marginBottom: 8, display: 'inline-flex' }}><span className="dot" />Vi phạm</span>
                }
                <div>Khấu trừ: <strong style={{ color: ds.total > 0 ? 'var(--danger)' : 'inherit' }}>{ds.total > 0 ? `-${formatCurrency(ds.total)}` : '—'}</strong></div>
                <div style={{ marginTop: 4, color: 'var(--ink-3)' }}>{isSafe ? 'Giữ nguyên lương' : 'Trừ trực tiếp lương'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Violations feed ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', fontWeight: 600, margin: 0 }}>
          Sổ biên bản vi phạm · {penalties.length}
        </h3>
      </div>

      {listLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div className="spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--line-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
        </div>
      ) : penalties.length === 0 ? (
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
                {penalties.map(p => (
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
