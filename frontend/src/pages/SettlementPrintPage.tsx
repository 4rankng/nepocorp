import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/format';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@tingting/shared';
import { useForwarderSettlementDetail } from '../hooks/useForwarderQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { PageHeader, StatusPill } from '../components/UI';
import './SettlementPrintPage.css';

// ─── Expense type Vietnamese labels (matches Excel form) ───
const EXPENSE_TYPE_LABELS: Record<string, string> = {
  LIFTING: 'NẶNG-HA',
  LOWERING: 'NẶNG-HA',
  INFRASTRUCTURE: 'HÀ TẶNG',
  CUSTOMS: 'TKHQ',
  WEIGHING: 'CÂN HÀNG',
  INSPECTION: 'KIỂM TRA',
  OTHER: 'KHÁC',
};

function settlementStatusVariant(status: AdvanceSettlementStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'PENDING': return 'warn';
    case 'CHECKED_BY_ACCOUNTANT': return 'info';
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'danger';
    default: return 'neutral';
  }
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}`;
}

interface LinkedExpense {
  id: number;
  tripId: number;
  expenseType: string;
  amount: string;
  containerNumber: string | null;
  invoiceNumber: string | null;
  note: string | null;
  tripCode: string | null;
  departureDate: string | null;
  customerName: string | null;
}

interface LinkedRequest {
  id: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface SettlementData {
  id: number;
  code: string;
  forwarderId: number;
  forwarderName?: string;
  totalExpenseAmount: string;
  refundAmount: string;
  status: AdvanceSettlementStatus;
  note: string | null;
  createdAt: string;
  linkedRequests?: LinkedRequest[];
  linkedExpenses?: LinkedExpense[];
}

// ─── Print Table Row (grouped by date → container → expense type) ───
function buildPrintRows(expenses: LinkedExpense[]) {
  // Group by departureDate, then containerNumber
  const grouped = new Map<string, Map<string, LinkedExpense[]>>();

  for (const exp of expenses) {
    const dateKey = exp.departureDate || 'unknown';
    const containerKey = exp.containerNumber || '-';
    if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
    const containerMap = grouped.get(dateKey)!;
    if (!containerMap.has(containerKey)) containerMap.set(containerKey, []);
    containerMap.get(containerKey)!.push(exp);
  }

  const rows: Array<{
    date: string;
    container: string;
    customer: string;
    expenseType: string;
    amount: string;
    invoice: string;
    tripCode: string;
  }> = [];

  for (const [dateKey, containerMap] of grouped) {
    for (const [containerKey, exps] of containerMap) {
      // Sort expenses by type for consistent ordering
      const sorted = [...exps].sort((a, b) => a.expenseType.localeCompare(b.expenseType));
      for (const exp of sorted) {
        rows.push({
          date: dateKey !== 'unknown' ? formatMonth(dateKey) : '—',
          container: containerKey !== '-' ? containerKey : '—',
          customer: exp.customerName || '—',
          expenseType: EXPENSE_TYPE_LABELS[exp.expenseType] || exp.expenseType,
          amount: exp.amount,
          invoice: exp.invoiceNumber || '',
          tripCode: exp.tripCode || '',
        });
      }
    }
  }

  return rows;
}

// ─── Component ───
export default function SettlementPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: settlement, isLoading, error } = useForwarderSettlementDetail(Number(id));
  const { data: catalogs } = useCatalogs();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--ink-3)' }}>
        <Loader2 size={20} className="spin" />
        <span style={{ fontSize: 14 }}>Đang tải phiếu thanh toán…</span>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="fade-up">
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error ? String(error) : 'Không tìm thấy phiếu thanh toán'}</p>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={() => navigate('/my-settlements')}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const s = settlement as SettlementData;
  const expenses = s.linkedExpenses || [];
  const requests = s.linkedRequests || [];
  const totalAdvance = requests.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const refund = Number(s.refundAmount || 0);
  const balance = totalAdvance - totalExpense - refund;

  const rows = buildPrintRows(expenses);
  const totalFromRows = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="fade-up">
      <div className="no-print">
        <PageHeader
          title={`Phiếu thanh toán ${s.code}`}
          description={s.forwarderName || ''}
          action={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusPill variant={settlementStatusVariant(s.status)}>
                {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status] || s.status}
              </StatusPill>
              <button className="btn btn--secondary btn--sm" onClick={() => navigate('/my-settlements')}>
                <ArrowLeft size={14} /> Quay lại
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
                <Printer size={14} /> In
              </button>
            </div>
          }
        />
      </div>

      {/* ── Print Form ── */}
      <div className="print-form">
        <div className="print-form__header">
          <h1 className="print-form__title">PHIẾU THANH TOÁN</h1>
          <div className="print-form__meta">
            <span>Số: <strong>{s.code}</strong></span>
            <span>Ngày: <strong>{new Date(s.createdAt).toLocaleDateString('vi-VN')}</strong></span>
            <span>Nhân viên: <strong>{s.forwarderName || ''}</strong></span>
          </div>
        </div>

        {/* ── Advance Summary ── */}
        {requests.length > 0 && (
          <div className="print-form__section">
            <h2 className="print-form__section-title">Tạm ứng đã nhận</h2>
            <div className="print-form__advance-list">
              {requests.map(r => (
                <div key={r.id} className="print-form__advance-item">
                  <span>{formatCurrency(Number(r.amount))}</span>
                  <span className="print-form__advance-reason">— {r.reason}</span>
                  <span className="print-form__advance-date">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
              <div className="print-form__advance-total">
                <span>Tổng tạm ứng:</span>
                <strong>{formatCurrency(totalAdvance)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── Expense Table ── */}
        <div className="print-form__section">
          <h2 className="print-form__section-title">Chi tiết chi phí</h2>
          <table className="print-form__table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Ngày</th>
                <th style={{ width: 100 }}>Nội dung</th>
                <th>Khách hàng</th>
                <th style={{ width: 140 }}>Số cont</th>
                <th style={{ width: 120, textAlign: 'right' }}>Tiền tệ</th>
                <th style={{ width: 120 }}>Hóa đơn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.date}</td>
                  <td>{row.expenseType}</td>
                  <td>{row.customer}</td>
                  <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{row.container}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(row.amount))}</td>
                  <td>{row.invoice}</td>
                </tr>
              ))}
              <tr className="print-form__table-total">
                <td colSpan={4}><strong>TỔNG CỘNG</strong></td>
                <td style={{ textAlign: 'right' }}><strong>{formatCurrency(totalFromRows)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Summary Box ── */}
        <div className="print-form__summary">
          <div className="print-form__summary-row">
            <span>Tổng tạm ứng:</span>
            <strong>{formatCurrency(totalAdvance)}</strong>
          </div>
          <div className="print-form__summary-row">
            <span>Tổng chi phí:</span>
            <strong>{formatCurrency(totalExpense)}</strong>
          </div>
          {refund > 0 && (
            <div className="print-form__summary-row">
              <span>Tiền hoàn lại:</span>
              <strong>{formatCurrency(refund)}</strong>
            </div>
          )}
          <div className="print-form__summary-row print-form__summary-row--balance">
            <span>{balance >= 0 ? 'Còn dư (phải hoàn):' : 'Thiếu (phải bổ sung):'}</span>
            <strong style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(Math.abs(balance))}
            </strong>
          </div>
        </div>

        {/* ── Note ── */}
        {s.note && (
          <div className="print-form__note">
            <strong>Ghi chú:</strong> {s.note}
          </div>
        )}

        {/* ── Signature Section ── */}
        <div className="print-form__signatures">
          <div className="print-form__sig-block">
            <div className="print-form__sig-label">Người lập</div>
            <div className="print-form__sig-line">(Ký, họ tên)</div>
          </div>
          <div className="print-form__sig-block">
            <div className="print-form__sig-label">Kế toán</div>
            <div className="print-form__sig-line">(Ký, họ tên)</div>
          </div>
          <div className="print-form__sig-block">
            <div className="print-form__sig-label">Quản lý</div>
            <div className="print-form__sig-line">(Ký, họ tên)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
