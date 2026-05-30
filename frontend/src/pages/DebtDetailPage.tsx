import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType } from '@nepocorp/shared';
import type { CustomerStatement, LedgerEntry, UnpaidTrip } from '@nepocorp/shared';
import { AlertTriangle, Wallet, X, Download, ListOrdered } from 'lucide-react';
import { PageHeader, Panel, KPI } from '../components/UI';

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
  const [selectedTripIds, setSelectedTripIds] = useState<Set<number>>(new Set());
  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, string>>({});
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
    const payments = Array.from(selectedTripIds)
      .map(tripId => ({
        trip_id: tripId,
        amount: parseFloat(paymentAmounts[tripId] || '0'),
      }))
      .filter(p => p.amount > 0);
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
      setSelectedTripIds(new Set());
      setPaymentAmounts({});
      fetchStatement();
    } catch (e: any) {
      setSubmitError(e.message || 'Lỗi khi ghi nhận thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  const closePaymentModal = () => {
    setShowPayment(false);
    setSelectedTripIds(new Set());
    setPaymentAmounts({});
  };

  // ── Render ───────────────────────────────────────────────────────────────

  // Unpaid trips from backend (FIFO-sorted, credits already applied)
  const unpaidTrips = useMemo(() => statement?.unpaidTrips ?? [], [statement]);

  // Running total for payment modal
  const allocatedTotal = useMemo(() => {
    return Array.from(selectedTripIds)
      .reduce((sum, tripId) => sum + parseFloat(paymentAmounts[tripId] || '0'), 0);
  }, [selectedTripIds, paymentAmounts]);

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
        <PageHeader title="Sổ kế toán" onBack={() => navigate('/debt')} />
        <Panel>
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </Panel>
      </div>
    );
  }

  const { customer, ledgerRows, agingBuckets, totalOutstanding } = statement;

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.contact_info || 'Không có thông tin liên hệ'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn--secondary"
              onClick={() => window.open(`/api/ledger/customers/${id}/statement/export`, '_blank')}
            >
              <Download size={14} />
              Xuất sao kê
            </button>
            <button className="btn btn--primary" onClick={() => setShowPayment(true)}>
              <Wallet size={15} />
              Ghi nhận thanh toán
            </button>
          </div>
        }
        onBack={() => navigate('/debt')}
      />

      {/* Total outstanding */}
      <div
        className="panel fade-up"
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
        {agingBuckets.length > 0
          ? agingBuckets.map((bucket, i) => (
              <KPI
                key={i}
                label={bucket.range}
                value={formatCurrency(bucket.amount)}
                variant={bucket.amount > 0 ? 'danger' : 'default'}
              />
            ))
          : (
            <>
              <AgingPlaceholder range="0-30 ngày" />
              <AgingPlaceholder range="31-60 ngày" />
              <AgingPlaceholder range="61-90 ngày" />
              <AgingPlaceholder range="90+ ngày" />
            </>
          )
        }
      </div>

      {/* Ledger table */}
      <Panel
        title="Sổ kế toán"
        subtitle={`${ledgerRows.length} giao dịch`}
        style={{ marginTop: 20 }}
        flush
      >
        <div className="table-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại giao dịch</th>
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
                    Không có giao dịch
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

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
          onClick={closePaymentModal}
        >
          <div style={{ width: '100%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
          <Panel
            title="Ghi nhận thanh toán"
            action={
              <button className="btn btn--ghost btn--icon btn--sm" onClick={closePaymentModal}>
                <X size={16} />
              </button>
            }
            style={{ maxHeight: '90vh', overflow: 'auto' }}
          >
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)' }}>
                  Thanh toán theo lệnh
                  <span style={{ fontWeight: 400, color: 'var(--fg-3)', marginLeft: 6, fontSize: 11 }}>sắp xếp cũ nhất trước (FIFO)</span>
                </label>
                {unpaidTrips.length > 0 && (
                  <button
                    className="btn btn--secondary btn--sm"
                    style={{ fontSize: 11, padding: '3px 10px', gap: 4 }}
                    onClick={() => {
                      const newSelected = new Set(unpaidTrips.map(t => t.tripId));
                      setSelectedTripIds(newSelected);
                      const amounts: Record<number, string> = {};
                      unpaidTrips.forEach(t => { amounts[t.tripId] = String(t.outstanding); });
                      setPaymentAmounts(amounts);
                    }}
                  >
                    <ListOrdered size={12} />
                    Chọn tất cả (FIFO)
                  </button>
                )}
              </div>
              {unpaidTrips.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'center', padding: 12 }}>
                  Không tìm thấy chuyến chưa thanh toán.
                </p>
              ) : (
                unpaidTrips.map((trip, idx) => {
                  const isSelected = selectedTripIds.has(trip.tripId);
                  return (
                    <div key={trip.tripId} style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                      padding: '6px 8px',
                      background: isSelected ? 'var(--brand-soft)' : 'var(--bg-2)',
                      borderRadius: 6,
                    }}>
                      <span style={{
                        flexShrink: 0, fontSize: 10, fontWeight: 700,
                        color: 'var(--brand)', background: 'var(--brand-soft)',
                        border: '1px solid var(--brand)',
                        borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap',
                      }}>
                        {idx === 0 ? '#1 cũ nhất' : `#${idx + 1}`}
                      </span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedTripIds(prev => {
                            const next = new Set(prev);
                            if (next.has(trip.tripId)) next.delete(trip.tripId);
                            else next.add(trip.tripId);
                            return next;
                          });
                          if (!isSelected) {
                            setPaymentAmounts(prev => ({ ...prev, [trip.tripId]: String(trip.outstanding) }));
                          } else {
                            setPaymentAmounts(prev => {
                              const next = { ...prev };
                              delete next[trip.tripId];
                              return next;
                            });
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{trip.note || `Chuyến #${trip.tripId}`}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{new Date(trip.date).toLocaleDateString('vi-VN')}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatCurrency(trip.outstanding)}
                      </div>
                      {isSelected && (
                        <input
                          className="input"
                          type="number"
                          placeholder="Số tiền"
                          value={paymentAmounts[trip.tripId] || ''}
                          onChange={e => setPaymentAmounts(prev => ({ ...prev, [trip.tripId]: e.target.value }))}
                          style={{ width: 120, fontSize: 12 }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Running total */}
            {selectedTripIds.size > 0 && (
              <div style={{
                padding: '10px 14px', marginTop: 8,
                background: allocatedTotal > totalOutstanding ? 'var(--danger-soft)' : 'var(--brand-soft)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 13, fontWeight: 600,
              }}>
                <span style={{ color: 'var(--fg-2)' }}>
                  Đã phân bổ: <span className="typo-mono">{formatCurrency(allocatedTotal)}</span>
                  <span style={{ fontWeight: 400, color: 'var(--fg-3)' }}> / {formatCurrency(totalOutstanding)}</span>
                </span>
                {allocatedTotal > totalOutstanding && (
                  <span style={{ color: 'var(--danger)', fontSize: 11 }}>Vượt quá công nợ</span>
                )}
              </div>
            )}

            <button
              className="btn btn--primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={submitting || !receiptId.trim()}
              onClick={handleSubmitPayment}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </Panel>
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
  return <KPI label={range} value="—" />;
}
