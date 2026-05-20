import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType } from '@nepocorp/shared';
import type { CustomerStatement, LedgerEntry } from '@nepocorp/shared';
import {
  ArrowLeft, AlertTriangle, Wallet, X, Plus, FileText,
} from 'lucide-react';

// ── Txn type labels ─────────────────────────────────────────────────────────

const TXN_LABELS: Record<string, string> = {
  [TxnType.TRIP_REVENUE]: 'Doanh thu chuyến',
  [TxnType.PAYMENT_RECEIVED]: 'Thu tiền',
  [TxnType.PENALTY]: 'Phạt',
  [TxnType.MANAGEMENT_FEE]: 'Phí quản lý',
  [TxnType.ADJUSTMENT]: 'Điều chỉnh',
  [TxnType.DRIVER_SALARY]: 'Lương tài xế',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [receiptId, setReceiptId] = useState('');
  const [paymentTrips, setPaymentTrips] = useState<{ trip_id: number; amount: string }[]>([
    { trip_id: 0, amount: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchStatement = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CustomerStatement>(`/ledger/customers/${id}/statement`);
      setStatement(data);
    } catch (e: any) {
      setError(e.message || 'Không thể tải sổ kế toán');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStatement(); }, [fetchStatement]);

  // ── Payment submit ───────────────────────────────────────────────────────

  const handleSubmitPayment = async () => {
    if (!id || !receiptId.trim()) return;
    const payments = paymentTrips
      .filter(p => p.trip_id > 0 && p.amount && parseFloat(p.amount) > 0)
      .map(p => ({ trip_id: p.trip_id, amount: parseFloat(p.amount) }));
    if (payments.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post('/payments/receive', {
        customer_id: Number(id),
        receipt_id: receiptId,
        payments,
      });
      setShowPayment(false);
      setReceiptId('');
      setPaymentTrips([{ trip_id: 0, amount: '' }]);
      fetchStatement();
    } catch (e: any) {
      setSubmitError(e.message || 'Lỗi khi ghi nhận thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  const addPaymentRow = () => {
    setPaymentTrips(prev => [...prev, { trip_id: 0, amount: '' }]);
  };

  const updatePaymentRow = (idx: number, field: 'trip_id' | 'amount', val: string) => {
    setPaymentTrips(prev => prev.map((p, i) =>
      i === idx ? { ...p, [field]: field === 'trip_id' ? Number(val) : val } : p
    ));
  };

  const removePaymentRow = (idx: number) => {
    setPaymentTrips(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/debt')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Quay lại
        </button>
        <div className="card-shell" style={{ padding: 24, color: 'var(--danger)' }}>
          {error || 'Không tìm thấy dữ liệu'}
        </div>
      </div>
    );
  }

  const { customer, ledgerRows, agingBuckets, totalOutstanding } = statement;

  return (
    <div>
      {/* Back button */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/debt')} style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Quay lại
      </button>

      <div className="page-header">
        <div>
          <h1>{customer.name}</h1>
          <p>{customer.contact_info || 'Không có thông tin liên hệ'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPayment(true)}>
          <Wallet size={15} />
          Ghi nhận thanh toán
        </button>
      </div>

      {/* Total outstanding */}
      <div
        className="card-shell fade-up"
        style={{
          padding: '20px 24px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: `4px solid ${totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'}`,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 4, letterSpacing: 0.05 }}>
            TỔNG CỘNG NỢ
          </div>
          <div
            className="typo-mono"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)',
            }}
          >
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-lg)',
          background: totalOutstanding > 0 ? 'var(--danger-soft)' : 'var(--success-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle
            size={24}
            style={{ color: totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)' }}
          />
        </div>
      </div>

      {/* Aging buckets */}
      <div className="kpi-grid fade-up" style={{ marginBottom: 20 }}>
        {agingBuckets.map((bucket, i) => (
          <div key={i} className="stat-card" style={{ padding: '14px 16px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 6 }}>
              {bucket.range}
            </div>
            <div
              className="typo-mono"
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: bucket.amount > 0 ? 'var(--danger)' : 'var(--fg-1)',
              }}
            >
              {formatCurrency(bucket.amount)}
            </div>
          </div>
        ))}
        {agingBuckets.length === 0 && (
          <>
            <AgingPlaceholder range="0-30 ngày" />
            <AgingPlaceholder range="31-60 ngày" />
            <AgingPlaceholder range="61-90 ngày" />
            <AgingPlaceholder range="90+ ngày" />
          </>
        )}
      </div>

      {/* Ledger table */}
      <div className="card-shell fade-up-2">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} style={{ color: 'var(--fg-3)' }} />
            Sổ kế toán
          </h3>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
            {ledgerRows.length} giao dịch
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tt-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loai giao dịch</th>
                <th style={{ textAlign: 'right' }}>Nợ</th>
                <th style={{ textAlign: 'right' }}>Có</th>
                <th style={{ textAlign: 'right' }}>Số dư</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map(row => (
                <LedgerRow key={row.id} row={row} />
              ))}
              {ledgerRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>
                    Khong co giao dịch
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment Modal ──────────────────────────────────────────────────── */}
      {showPayment && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(9,9,11,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 'var(--z-modal)' as any,
            padding: 24,
          }}
          onClick={() => setShowPayment(false)}
        >
          <div
            className="card-shell"
            style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-header">
              <h3>Ghi nhận thanh toán</h3>
              <button className="icon-btn" onClick={() => setShowPayment(false)}>
                <X size={16} />
              </button>
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

              {/* Receipt ID */}
              <div className="field">
                <label>Mã phiếu thu</label>
                <input
                  className="input"
                  placeholder="VD: PT-001"
                  value={receiptId}
                  onChange={e => setReceiptId(e.target.value)}
                />
              </div>

              {/* Trip payments */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 8 }}>
                  Thanh toán theo lệnh
                </label>
                {paymentTrips.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="input"
                      type="number"
                      placeholder="ID lệnh"
                      value={p.trip_id || ''}
                      onChange={e => updatePaymentRow(i, 'trip_id', e.target.value)}
                      style={{ width: 120 }}
                    />
                    <input
                      className="input"
                      type="number"
                      placeholder="Số tiền"
                      value={p.amount}
                      onChange={e => updatePaymentRow(i, 'amount', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {paymentTrips.length > 1 && (
                      <button className="icon-btn" onClick={() => removePaymentRow(i)}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addPaymentRow} style={{ marginTop: 4 }}>
                  <Plus size={14} /> Thêm lệnh
                </button>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={submitting || !receiptId.trim()}
                onClick={handleSubmitPayment}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LedgerRow({ row }: { row: LedgerEntry }) {
  const debit = parseFloat(row.debit) || 0;
  const credit = parseFloat(row.credit) || 0;
  const balance = parseFloat(row.balance) || 0;

  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.timestamp)}</td>
      <td>
        <span className="badge badge-outline" style={{ fontSize: 11 }}>
          {TXN_LABELS[row.txn_type] || row.txn_type}
        </span>
      </td>
      <td className="num">{debit > 0 ? formatCurrency(debit) : '—'}</td>
      <td className="num">{credit > 0 ? formatCurrency(credit) : '—'}</td>
      <td className="num" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--fg-1)' }}>
        {formatCurrency(balance)}
      </td>
      <td style={{ color: 'var(--fg-3)', fontSize: 12 }}>{row.note || ''}</td>
    </tr>
  );
}

function AgingPlaceholder({ range }: { range: string }) {
  return (
    <div className="stat-card" style={{ padding: '14px 16px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 6 }}>
        {range}
      </div>
      <div className="typo-mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)' }}>
        —
      </div>
    </div>
  );
}
