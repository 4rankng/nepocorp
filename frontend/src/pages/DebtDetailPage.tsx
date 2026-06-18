import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType } from '@tingting/shared';
import type { LedgerEntry, AgingBucket, DebtOffset } from '@tingting/shared';
import { AlertTriangle, Download, FileSpreadsheet, FileText, Receipt, Phone, Building2, ArrowLeft, Plus, X, Loader2, Save, ChevronDown, ChevronUp, ArrowLeftRight } from 'lucide-react';
import { useCustomerStatement, useSupplierStatement } from '../hooks/useQueries';
import { getInitials } from '../lib/avatar';
import { api } from '../lib/api';
import { Modal } from '../components/UI';
import { DebtOffsetModal } from '../components/DebtOffsetModal';
import { useAuth } from '../hooks/useAuth';
import { usePageAnimations } from '../hooks/animations';
import { qk } from '../api/keys';
import './DebtDetailPage.css';

// ── Txn type label + pill variant ──────────────────────────────────────────

const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.TRIP_REVENUE]:      { label: 'DOANH THU CHUYẾN', pill: 'dd-txn-pill dd-txn-pill--rev' },
  [TxnType.PAYMENT_RECEIVED]:  { label: 'THU TIỀN',         pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.PENALTY]:           { label: 'PHẠT',             pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.MANAGEMENT_FEE]:    { label: 'PHÍ QUẢN LÝ',     pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.ADJUSTMENT]:        { label: 'ĐIỀU CHỈNH',      pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.DRIVER_SALARY]:     { label: 'LƯƠNG LÁI XE',    pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.UNLOCK_REVERSAL]:   { label: 'HOÀN TÁC',         pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.EXTERNAL_CARRIER_COST]: { label: 'CƯỚC THUÊ NGOÀI', pill: 'dd-txn-pill dd-txn-pill--other' },
};
const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

// ── Aging constants ────────────────────────────────────────────────────────

const AGING_RANGES = [
  { label: '0–30 NGÀY',  dotColor: 'var(--accent)',  index: 0 },
  { label: '31–60 NGÀY', dotColor: 'var(--warning)', index: 1 },
  { label: '61–90 NGÀY', dotColor: '#D97706',        index: 2 },
  { label: 'TRÊN 90 NGÀY', dotColor: 'var(--danger)', index: 3 },
] as const;

// ── Ledger filter type ─────────────────────────────────────────────────────

type LedgerFilter = 'all' | typeof TxnType.PAYMENT_RECEIVED | typeof TxnType.ADJUSTMENT | typeof TxnType.TRIP_REVENUE;

const FILTER_OPTIONS: { key: LedgerFilter; label: string }[] = [
  { key: 'all',              label: 'Tất cả' },
  { key: TxnType.PAYMENT_RECEIVED, label: 'Thu tiền' },
  { key: TxnType.ADJUSTMENT,       label: 'Điều chỉnh' },
  { key: TxnType.TRIP_REVENUE,     label: 'Doanh thu' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

// Map backend agingBuckets (ordered 0→90+) to fixed 4-slot array
function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  buckets.forEach((b, i) => {
    if (i < 4) amounts[i] = b.amount;
  });
  return amounts;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.pathname.startsWith('/customers/') ? '/customers' : '/debt';
  const { data: statement, isLoading: loading, error: queryError, refetch } = useCustomerStatement(id);
  const error = queryError ? (queryError as Error).message : null;
  const { rootRef } = usePageAnimations({ ready: !loading && !!statement });

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [showOffsetHistory, setShowOffsetHistory] = useState(false);

  // Payment modal state — was missing entirely (BUG: no way to record
  // a payment from the debt detail page even though /api/payments/receive
  // exists on the backend).
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payReceipt, setPayReceipt] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const handleApproveOffset = async (oid: number) => {
    try {
      await api.post(`/finance/debt-offsets/${oid}/approve`, {});
      queryClient.invalidateQueries({ queryKey: qk.financial.debtOffsets(customerId!) });
      queryClient.invalidateQueries({ queryKey: qk.financial.customerStatement(customerId) });
      queryClient.invalidateQueries({ queryKey: qk.financial.customerAgingAll });
      // V1: a debt-offset also changes AR, so refresh the Dashboard overdue KPI.
      queryClient.invalidateQueries({ queryKey: qk.dashboard.receivablesSummary });
      refetch();
    } catch (err: unknown) {
      alert((err as Error).message || 'Lỗi khi duyệt đối trừ.');
    }
  };

  // ── Linked supplier data (dual-entity customers) ─────────────────────────
  // The customer statement doesn't expose linkedSupplierId directly, so we
  // carry it via the /finance/dual-entities call. However, to keep this
  // page self-contained we instead read it from the customer-aging cache,
  // or fall back to fetching the supplier statement once we know the id.
  // We derive linkedSupplierId from a lightweight dual-entity check.
  const customerId = id ? Number(id) : undefined;
  const { data: dualEntities } = useQuery<Array<{
    customerId: number; supplierId: number; arBalance: number; apBalance: number;
  }>>({
    queryKey: qk.tripForm.dualEntities,
    queryFn: () => api.get('/finance/dual-entities'),
    staleTime: 2 * 60 * 1000,
  });
  const dualEntity = dualEntities?.find(e => e.customerId === customerId);
  const linkedSupplierId = dualEntity?.supplierId ?? null;

  // Fetch supplier statement only when this customer has a linked supplier
  const { data: supplierStatement } = useSupplierStatement(linkedSupplierId ?? undefined);
  const apBalance = supplierStatement?.totalOutstanding ?? dualEntity?.apBalance ?? 0;
  const arBalance = statement?.totalOutstanding ?? 0;

  // Offset history
  const { data: offsetHistory = [] } = useQuery<DebtOffset[]>({
    queryKey: qk.financial.debtOffsets(customerId!),
    queryFn: () => api.get(`/finance/debt-offsets?customerId=${customerId}`),
    enabled: !!customerId && !!linkedSupplierId,
    staleTime: 60 * 1000,
  });

  // ── Derived data ────────────────────────────────────────────────────────

  const agingAmounts = useMemo(() =>
    normalizeAging(statement?.agingBuckets ?? []),
    [statement?.agingBuckets]
  );

  const filteredRows = useMemo(() => {
    if (!statement) return [];
    if (ledgerFilter === 'all') return statement.ledgerRows;
    return statement.ledgerRows.filter(r => r.txnType === ledgerFilter);
  }, [statement, ledgerFilter]);

  const activeAgingIdx = useMemo(() => {
    let max = -1, idx = 0;
    agingAmounts.forEach((a, i) => { if (a > max) { max = a; idx = i; } });
    return max > 0 ? idx : -1;
  }, [agingAmounts]);

  const totalOutstanding = statement?.totalOutstanding ?? 0;

  // ── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="debt-detail-page">
        <div className="dd-header">
          <button className="dd-back" onClick={() => navigate(backPath)}>
            <ArrowLeft size={20} />
          </button>
          <div className="dd-meta">
            <h1>Sổ kế toán</h1>
          </div>
        </div>
        <div className="dd-summary">
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </div>
      </div>
    );
  }

  const { customer, ledgerRows } = statement;
  const initials = getInitials(customer.name);
  const hasDebt = totalOutstanding > 0;
  const agingTotal = agingAmounts.reduce((s, a) => s + a, 0) || 1; // avoid /0
  const unpaidTrips = statement.unpaidTrips ?? [];

  // FIFO-distribute the entered amount across the oldest unpaid trips,
  // then POST. The backend also re-applies FIFO inside the transaction
  // for safety; this just gives the user a clear preview of how their
  // payment will land.
  const openPaymentModal = () => {
    setPayAmount('');
    setPayReceipt('');
    setPayError('');
    setShowPay(true);
  };

  const submitPayment = async () => {
    setPayError('');
    const amount = parseFloat(payAmount.replace(/[.,\s]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError('Số tiền không hợp lệ.');
      return;
    }
    if (!payReceipt.trim()) {
      setPayError('Mã biên lai là bắt buộc.');
      return;
    }
    if (unpaidTrips.length === 0) {
      setPayError('Khách hàng không có công nợ để thanh toán.');
      return;
    }
    // Cap at total outstanding so we don't overpay.
    const capped = Math.min(amount, totalOutstanding);
    let remaining = capped;
    const payments: Array<{ tripId: number; amount: number }> = [];
    for (const t of unpaidTrips) {
      if (remaining <= 0) break;
      const apply = Math.min(t.outstanding, remaining);
      payments.push({ tripId: t.tripId, amount: apply });
      remaining -= apply;
    }
    setPaySubmitting(true);
    try {
      await api.post('/payments/receive', {
        customerId: Number(id),
        receiptId: payReceipt.trim(),
        payments,
      });
      await queryClient.invalidateQueries({ queryKey: qk.financial.customerStatement(undefined) });
      await queryClient.invalidateQueries({ queryKey: qk.financial.debt });
      // V1: a payment also changes AR aging + the Dashboard overdue KPI, which
      // live under separate query keys — without these the DebtListPage hero
      // cards and the Dashboard attention chip go stale until staleTime (2m).
      await queryClient.invalidateQueries({ queryKey: qk.financial.customerAgingAll });
      await queryClient.invalidateQueries({ queryKey: qk.dashboard.receivablesSummary });
      await refetch();
      setShowPay(false);
    } catch (e: unknown) {
      setPayError((e as Error)?.message || 'Lỗi khi ghi nhận thanh toán.');
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="debt-detail-page">
      {/* ── Customer Header ─────────────────────────────────────────────── */}
      <div className="dd-header">
        <button className="dd-back" onClick={() => navigate(backPath)}>
          <ArrowLeft size={20} />
        </button>
        <div className="dd-avatar">{initials}</div>
        <div className="dd-meta">
          <h1>{customer.name}</h1>
          <div className="dd-sub">
            {customer.contactInfo && (
              <span>
                <Phone size={15} />
                <span className="dd-mono">{customer.contactInfo}</span>
              </span>
            )}
            <span>
              <Building2 size={15} />
              Khách hàng doanh nghiệp
            </span>
            {hasDebt ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Còn nợ trong hạn</span>
            ) : (
              <span className="dd-tag dd-tag--ok dd-tag--dot">Đã thanh toán đủ</span>
            )}
          </div>
        </div>
        <div className="dd-actions">
          {hasDebt && (
            <button
              className="btn btn--primary"
              onClick={openPaymentModal}
            >
              <Plus size={14} />
              Ghi nhận thanh toán
            </button>
          )}
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn--secondary"
              onClick={() => setShowExportMenu(v => !v)}
            >
              <Download size={14} />
              Xuất sao kê
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 8, boxShadow: 'var(--sh-lg)',
                zIndex: 50, minWidth: 180, overflow: 'hidden',
              }}>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)' }}
                  onClick={() => { setShowExportMenu(false); window.open(`/api/ledger/customers/${id}/statement/export?format=xlsx`, '_blank'); }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileSpreadsheet size={14} style={{ color: '#16a34a' }} />
                  Excel (.xlsx)
                </button>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)' }}
                  onClick={() => { setShowExportMenu(false); window.open(`/api/ledger/customers/${id}/statement/export?format=pdf`, '_blank'); }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText size={14} style={{ color: '#dc2626' }} />
                  PDF (In)
                </button>
                <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)' }}
                  onClick={() => {
                    setShowExportMenu(false);
                    const mode = customer.debitNoteMode === 'PER_BATCH' ? 'PER_BATCH' : 'MONTHLY';
                    const now = new Date();
                    const params = new URLSearchParams({
                      mode,
                      month: String(now.getMonth() + 1),
                      year: String(now.getFullYear()),
                    });
                    window.open(`/api/finance/debit-note/${id}/export?${params}`, '_blank');
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Receipt size={14} style={{ color: '#7c3aed' }} />
                  Giấy báo nợ (.xlsx)
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', marginLeft: 'auto' }}>
                    {customer.debitNoteMode === 'PER_BATCH' ? 'Theo lô' : 'Theo tháng'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Card ────────────────────────────────────────────────── */}
      <section className="dd-summary">
        <div className="dd-sum-top">
          <div>
            <div className="dd-sum-label">TỔNG CỘNG NỢ</div>
            <div className={`dd-sum-total ${hasDebt ? '' : ' dd-sum-total--clear'}`}>
              {hasDebt
                ? <>{formatCurrency(totalOutstanding).replace(' ₫', '')}<span className="dd-cur">đ</span></>
                : <>0<span className="dd-cur">đ</span></>
              }
            </div>
            {hasDebt && (
              <div className="dd-sum-note">
                <AlertTriangle size={17} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                {activeAgingIdx <= 0
                  ? 'Toàn bộ công nợ đang trong hạn 30 ngày — cần theo dõi thu hồi.'
                  : `Có công nợ quá hạn ${AGING_RANGES[activeAgingIdx].label.toLowerCase()} — cần ưu tiên thu hồi.`
                }
              </div>
            )}
          </div>
          <div className="dd-sum-update">
            Cập nhật lần cuối
            <b>{new Date().toLocaleDateString('vi-VN')}</b>
            {ledgerRows.length} giao dịch trong kỳ
          </div>
        </div>

        {/* Aging bar */}
        <div className="dd-aging-bar">
          {agingAmounts.map((amt, i) => {
            const pct = agingTotal > 0 ? (amt / agingTotal) * 100 : 0;
            return pct > 0
              ? <i key={i} className={`dd-seg-${i}`} style={{ width: `${pct}%` }} />
              : null;
          })}
        </div>

        {/* Aging grid */}
        <div className="dd-aging-grid">
          {AGING_RANGES.map((range, i) => {
            const amt = agingAmounts[i];
            const isActive = i === activeAgingIdx;
            const pct = agingTotal > 0 ? Math.round((amt / agingTotal) * 100) : 0;
            return (
              <div key={i} className={`dd-aging-cell${isActive ? ' dd-aging-cell--active' : ''}`}>
                <div className="dd-ac-head">
                  <span className="dd-ac-dot" style={{ background: range.dotColor }} />
                  {range.label}
                </div>
                <div className={`dd-ac-val${amt === 0 ? ' dd-ac-val--zero' : ''}`}>
                  {formatCurrency(amt).replace(' ₫', '')}đ
                </div>
                <div className="dd-ac-share">
                  {amt > 0 ? `${pct}% tổng công nợ` : 'Không phát sinh'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AP Card (dual-entity customers) ────────────────────────────── */}
      {linkedSupplierId != null && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* AP balance card */}
            <div style={{ flex: '1 1 220px', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 16px', background: '#fff7ed' }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#9a3412', marginBottom: 4 }}>
                Công nợ phải trả (NCC liên kết)
              </h3>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#c2410c', margin: 0 }}>
                {formatCurrency(apBalance)}
              </p>
              <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Số ròng: {formatCurrency(arBalance - apBalance)}
              </p>
            </div>

            {/* Offset button */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                className="btn btn--secondary"
                style={{ borderColor: '#f97316', color: '#ea580c', gap: 6 }}
                onClick={() => setShowOffsetModal(true)}
              >
                <ArrowLeftRight size={14} />
                Đối trừ công nợ
              </button>
            </div>
          </div>

          {/* Offset history */}
          {offsetHistory.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 14px', background: 'var(--bg-2)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}
                onClick={() => setShowOffsetHistory(v => !v)}
              >
                {showOffsetHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Lịch sử đối trừ ({offsetHistory.length})
              </button>
              {showOffsetHistory && (
                <div className="table-scroll">
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-2)' }}>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-3)' }}>Ngày</th>
                        <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--fg-3)' }}>Số tiền</th>
                        <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--fg-3)' }}>Trạng thái</th>
                        <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-3)' }}>Ghi chú</th>
                        <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--fg-3)' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offsetHistory.map(o => (
                        <tr key={o.id} style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={{ padding: '7px 12px' }}>{formatDate(o.offsetDate)}</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {formatCurrency(Number(o.amount))}
                          </td>
                          <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                            <OffsetStatusBadge status={o.approvalStatus} />
                          </td>
                          <td style={{ padding: '7px 12px', color: 'var(--fg-3)' }}>{o.note || '—'}</td>
                          <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                            {isManagerOrAdmin && o.approvalStatus === 'PENDING' && (
                              <button
                                className="btn btn--sm btn--primary"
                                style={{
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  background: '#16a34a',
                                  borderColor: '#16a34a',
                                  color: '#fff',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleApproveOffset(o.id)}
                              >
                                Duyệt
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Ledger Card ─────────────────────────────────────────────────── */}
      <section className="dd-ledger">
        <div className="dd-ledger-head">
          <h2>Sổ kế toán</h2>
          <span className="dd-cnt">{filteredRows.length} giao dịch</span>
          <div className="dd-filters">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                className={`dd-filter-chip${ledgerFilter === f.key ? ' dd-filter-chip--on' : ''}`}
                onClick={() => setLedgerFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="dd-table">
            <thead>
              <tr>
                <th>NGÀY</th>
                <th>LOẠI GIAO DỊCH</th>
                <th className="dd-r">NỢ</th>
                <th className="dd-r">CÓ</th>
                <th className="dd-r">SỐ DƯ</th>
                <th>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <LedgerRow key={row.id} row={row} />
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    Không có giao dịch
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment modal — FIFO across unpaid trips */}
      <Modal
        isOpen={showPay}
        title={`Ghi nhận thanh toán — ${customer.name}`}
        onClose={() => setShowPay(false)}
        onConfirm={submitPayment}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowPay(false)}>
              <X size={14} /> Hủy
            </button>
            <button
              className="btn btn--primary btn--sm"
              disabled={paySubmitting || !payAmount.trim() || !payReceipt.trim()}
              onClick={submitPayment}
            >
              {paySubmitting ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              Ghi nhận
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {payError && (
            <div style={{ padding: '10px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>
              {payError}
            </div>
          )}
          <div style={{
            padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8,
            fontSize: 13, color: 'var(--fg-2)',
          }}>
            Còn nợ: <strong style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(totalOutstanding)}
            </strong> ({unpaidTrips.length} chuyến chưa thu)
          </div>
          <div className="field">
            <label htmlFor="pay-amount" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Số tiền nhận (đ) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="pay-amount"
              className="input"
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="VD: 5000000"
              autoFocus
            />
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
              Sẽ phân bổ FIFO vào {unpaidTrips.length} chuyến chưa thu, bắt đầu từ chuyến cũ nhất.
            </p>
          </div>
          <div className="field">
            <label htmlFor="pay-receipt" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Mã biên lai / phiếu thu <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="pay-receipt"
              className="input"
              value={payReceipt}
              onChange={e => setPayReceipt(e.target.value)}
              placeholder="VD: PT-20260601-01"
            />
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
              Bắt buộc để đối chiếu với sao kê ngân hàng / sổ quỹ.
            </p>
          </div>
        </div>
      </Modal>

      {/* Debt offset modal */}
      {linkedSupplierId != null && (
        <DebtOffsetModal
          isOpen={showOffsetModal}
          customerId={customerId!}
          supplierId={linkedSupplierId}
          arBalance={arBalance}
          apBalance={apBalance}
          onClose={() => setShowOffsetModal(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function OffsetStatusBadge({ status }: { status: DebtOffset['approvalStatus'] }) {
  const styles: Record<DebtOffset['approvalStatus'], { label: string; color: string; bg: string; border: string }> = {
    PENDING:  { label: 'Chờ duyệt', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
    APPROVED: { label: 'Đã duyệt',  color: '#14532d', bg: '#f0fdf4', border: '#bbf7d0' },
    REJECTED: { label: 'Từ chối',   color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca' },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 4, padding: '2px 6px' }}>
      {s.label}
    </span>
  );
}

function LedgerRow({ row }: { row: LedgerEntry }) {
  const debit = parseFloat(row.debit) || 0;
  const credit = parseFloat(row.credit) || 0;
  const balance = parseFloat(row.balance) || 0;
  const meta = TXN_META[row.txnType] ?? DEFAULT_META;

  return (
    <tr>
      <td className="dd-td-date">{formatDate(row.timestamp)}</td>
      <td><span className={meta.pill}>{meta.label}</span></td>
      <td className={`dd-num ${debit > 0 ? 'dd-num--debit' : 'dd-num--dash'}`}>
        {debit > 0 ? formatCurrency(debit).replace(' ₫', '') + 'đ' : '–'}
      </td>
      <td className={`dd-num ${credit > 0 ? 'dd-num--credit' : 'dd-num--dash'}`}>
        {credit > 0 ? formatCurrency(credit).replace(' ₫', '') + 'đ' : '–'}
      </td>
      <td className={`dd-num ${balance > 0 ? 'dd-num--bal' : ''}`}>
        {formatCurrency(balance).replace(' ₫', '')}đ
      </td>
      <td className="dd-td-note">{row.note || ''}</td>
    </tr>
  );
}
