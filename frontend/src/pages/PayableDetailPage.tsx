import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType, FINANCIAL } from '@nepocorp/shared';
import type { SupplierStatement as SupplierStatementType, LedgerEntry, AgingBucket, VendorPaymentRequest } from '@nepocorp/shared';
import { AlertTriangle, Phone, Building2, ArrowLeft, X, CreditCard, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useSupplierStatement } from '../hooks/useQueries';
import { api } from '../lib/api';
import { useToast } from '../components/shared/Toast';

const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.VENDOR_EXPENSE]:  { label: 'Phiếu chi phí',   pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.VENDOR_PAYMENT]:  { label: 'Thanh toán NCC',  pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.ADJUSTMENT]:      { label: 'Điều chỉnh',      pill: 'dd-txn-pill dd-txn-pill--adj' },
};
const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

const AGING_RANGES = [
  { label: '0–30 NGÀY',    dotColor: 'var(--accent)',  index: 0 },
  { label: '31–60 NGÀY',   dotColor: 'var(--warning)', index: 1 },
  { label: '61–90 NGÀY',   dotColor: '#D97706',        index: 2 },
  { label: 'TRÊN 90 NGÀY', dotColor: 'var(--danger)',  index: 3 },
] as const;

type LedgerFilter = 'all' | typeof TxnType.VENDOR_EXPENSE | typeof TxnType.VENDOR_PAYMENT | typeof TxnType.ADJUSTMENT;

const FILTER_OPTIONS: { key: LedgerFilter; label: string }[] = [
  { key: 'all',                     label: 'Tất cả' },
  { key: TxnType.VENDOR_EXPENSE,    label: 'Phiếu chi phí' },
  { key: TxnType.VENDOR_PAYMENT,    label: 'Thanh toán NCC' },
  { key: TxnType.ADJUSTMENT,        label: 'Điều chỉnh' },
];

function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  buckets.forEach((b, i) => {
    if (i < 4) amounts[i] = b.amount;
  });
  return amounts;
}

export default function PayableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: statement, isLoading: loading, error: queryError } = useSupplierStatement(id ? Number(id) : undefined);
  const typedStatement = statement as SupplierStatementType | undefined;
  const error = queryError ? (queryError as Error).message : null;
  const { toast: showToast } = useToast();

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReceiptId, setPaymentReceiptId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const downloadExport = async (format: string) => {
    setShowExportMenu(false);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api${FINANCIAL.SUPPLIER_STATEMENT_EXPORT(Number(id))}?format=${format}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Tải thất bại');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `sao-ke-ncc-${id}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      showToast?.((err as Error).message || 'Lỗi xuất sao kê');
    }
  };

  const agingAmounts = useMemo(() =>
    normalizeAging(typedStatement?.agingBuckets ?? []),
    [typedStatement?.agingBuckets]
  );

  const filteredRows = useMemo(() => {
    if (!typedStatement) return [];
    if (ledgerFilter === 'all') return typedStatement.ledgerRows;
    return typedStatement.ledgerRows.filter((r: LedgerEntry) => r.txnType === ledgerFilter);
  }, [typedStatement, ledgerFilter]);

  const activeAgingIdx = useMemo(() => {
    let max = -1, idx = 0;
    agingAmounts.forEach((a, i) => { if (a > max) { max = a; idx = i; } });
    return max > 0 ? idx : -1;
  }, [agingAmounts]);

  const totalOutstanding = typedStatement?.totalOutstanding ?? 0;

  async function handlePaymentSubmit() {
    if (!id || !paymentAmount) return;
    setSubmitting(true);
    try {
      const body: VendorPaymentRequest = {
        supplierId: Number(id),
        amount: Number(paymentAmount),
        date: paymentDate,
        receiptId: paymentReceiptId,
      };
      await api.post(FINANCIAL.PAYMENTS_VENDOR, body);
      showToast({ kind: 'success', message: `Đã ghi thanh toán ${formatCurrency(body.amount)}` });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReceiptId('');
      queryClient.invalidateQueries({ queryKey: ['supplier-statement', id] });
      queryClient.invalidateQueries({ queryKey: ['payables-summary'] });
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi ghi thanh toán' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (error || !typedStatement) {
    return (
      <div>
        <div className="dd-header">
          <button className="dd-back" onClick={() => navigate('/payables')}>
            <ArrowLeft size={20} />
          </button>
          <div className="dd-meta">
            <h1>Công nợ phải trả</h1>
          </div>
        </div>
        <div className="dd-summary">
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </div>
      </div>
    );
  }

  const { supplier, ledgerRows } = typedStatement;
  const hasDebt = totalOutstanding > 0;
  const lastLedgerRow = ledgerRows[ledgerRows.length - 1];
  const actualBalance = lastLedgerRow ? parseFloat(lastLedgerRow.balance) : 0;
  const hasCredit = actualBalance < 0;
  const overpaymentAmount = hasCredit ? Math.abs(actualBalance) : 0;
  const agingTotal = agingAmounts.reduce((s, a) => s + a, 0) || 1;

  return (
    <div>
      {/* Supplier Header */}
      <div className="dd-header">
        <button className="dd-back" onClick={() => navigate('/payables')}>
          <ArrowLeft size={20} />
        </button>
        <div className="dd-avatar" style={{ background: 'var(--warning)', color: '#fff' }}>
          {supplier.name.charAt(0)}
        </div>
        <div className="dd-meta">
          <h1>Công nợ phải trả — {supplier.name}</h1>
          <div className="dd-sub">
            {supplier.phone && (
              <span>
                <Phone size={15} />
                <span className="dd-mono">{supplier.phone}</span>
              </span>
            )}
            {supplier.contactPerson && (
              <span>
                <Building2 size={15} />
                {supplier.contactPerson}
              </span>
            )}
            {hasDebt ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Còn nợ</span>
            ) : hasCredit ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Đã trả thừa {formatCurrency(overpaymentAmount).replace(' ₫', '')}đ</span>
            ) : (
              <span className="dd-tag dd-tag--ok dd-tag--dot">Đã thanh toán đủ</span>
            )}
          </div>
        </div>
        <div className="dd-actions">
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
                <button className="dd-export-btn" onClick={() => downloadExport('xlsx')}>
                  <FileSpreadsheet size={14} style={{ color: '#16a34a' }} />
                  Excel (.xlsx)
                </button>
                <button className="dd-export-btn" onClick={() => downloadExport('pdf')}>
                  <FileText size={14} style={{ color: '#dc2626' }} />
                  PDF (In)
                </button>
              </div>
            )}
          </div>
          <button
            className="btn btn--primary"
            onClick={() => setShowPaymentModal(true)}
          >
            <CreditCard size={14} />
            Ghi thanh toán
          </button>
        </div>
      </div>

      {/* Summary Card */}
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
                  ? 'Toàn bộ công nợ đang trong hạn 30 ngày.'
                  : `Có công nợ quá hạn ${AGING_RANGES[activeAgingIdx].label.toLowerCase()} — cần ưu tiên thanh toán.`
                }
              </div>
            )}
            {hasCredit && (
              <div className="dd-sum-note" style={{ marginTop: 4 }}>
                <AlertTriangle size={17} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                Đã trả thừa {formatCurrency(overpaymentAmount).replace(' ₫', '')}đ — nhà cung cấp đang nợ lại công ty
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

      {/* Ledger Card */}
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
              {filteredRows.map((row: LedgerEntry) => (
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 440, boxShadow: 'var(--sh-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Ghi thanh toán</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-3)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--fg-2)' }}>
                Số tiền (VNĐ) *
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="Nhập số tiền"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--line)', fontSize: 14,
                  background: 'var(--bg-1)', color: 'var(--fg-1)',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--fg-2)' }}>
                Ngày *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--line)', fontSize: 14,
                  background: 'var(--bg-1)', color: 'var(--fg-1)',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--fg-2)' }}>
                Mã biên lai
              </label>
              <input
                type="text"
                value={paymentReceiptId}
                onChange={e => setPaymentReceiptId(e.target.value)}
                placeholder="Tùy chọn"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--line)', fontSize: 14,
                  background: 'var(--bg-1)', color: 'var(--fg-1)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn--secondary"
                onClick={() => setShowPaymentModal(false)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="btn btn--primary"
                onClick={handlePaymentSubmit}
                disabled={submitting || !paymentAmount || !paymentDate}
              >
                {submitting ? 'Đang ghi...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <td className={`dd-num ${balance > 0 ? 'dd-num--bal' : balance < 0 ? 'dd-num--credit' : ''}`}>
        {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance)).replace(' ₫', '')}đ
      </td>
      <td className="dd-td-note">{row.note || ''}</td>
    </tr>
  );
}
