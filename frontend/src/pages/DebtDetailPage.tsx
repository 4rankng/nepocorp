import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType } from '@tingting/shared';
import type { LedgerEntry, AgingBucket } from '@tingting/shared';
import { AlertTriangle, Download, Phone, Building2, ArrowLeft, Plus, X, Loader2, Save, Truck } from 'lucide-react';
import { useCustomerStatement, useSupplierStatement } from '../hooks/useQueries';
import { getInitials } from '../lib/avatar';
import { api } from '../lib/api';
import { Modal } from '../components/UI';
import BillingDocumentsPanel from '../components/billing/BillingDocumentsPanel';
import { useToast } from '../components/shared/Toast';
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

  // Payment modal state — was missing entirely (BUG: no way to record
  // a payment from the debt detail page even though /api/payments/receive
  // exists on the backend).
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payReceipt, setPayReceipt] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const queryClient = useQueryClient();
  const { toast: showToast } = useToast();

  const downloadExport = async (format: string) => {
    try {
      const blob = await api.getBlob(`/ledger/customers/${id}/statement/export?format=${format}`);
      const url = URL.createObjectURL(blob);
      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `sao-ke-${statement?.customer.name}-${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/\//g, '-')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất sao kê' });
    }
  };

  // Debit-note export now lives in <BillingDocumentsPanel> below (saved-snapshot
  // Giấy báo nợ). The old stateless /finance/debit-note/export button was removed
  // when the export menu here was collapsed to a single statement-xlsx button.

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
          <div className="dd-name-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1>{customer.name}</h1>
            {customer.isCarrier && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Truck size={12} aria-hidden="true" /> Xe ngoài
              </span>
            )}
          </div>
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
          <button
            className="btn btn--secondary"
            onClick={() => downloadExport('xlsx')}
          >
            <Download size={14} />
            Xuất sao kê
          </button>
        </div>
      </div>

      {/* ── Debit-note builder (AR snapshot documents) ───────────────────── */}
      {id && (
        <BillingDocumentsPanel
          type="DEBIT_NOTE"
          entityType="CUSTOMER"
          entityId={Number(id)}
          entityName={statement?.customer.name ?? ''}
          buttonLabel="Tạo giấy báo nợ"
        />
      )}

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
            <b>{new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</b>
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

          </div>
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
                <th>TUYẾN</th>
                <th>SỐ CONTAINER</th>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
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
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LedgerRow({ row }: { row: LedgerEntry }) {
  const debit = parseFloat(row.debit) || 0;
  const credit = parseFloat(row.credit) || 0;
  const balance = parseFloat(row.balance) || 0;
  const meta = TXN_META[row.txnType] ?? DEFAULT_META;

  return (
    <tr>
      <td className="dd-td-date">{formatDate(row.timestamp)}</td>
      <td>{row.routeName || '—'}</td>
      <td>
        {row.containerNumbers && row.containerNumbers.length > 0
          ? row.containerNumbers.join(', ')
          : '—'}
      </td>
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
