import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, FileSpreadsheet, Pencil, Save, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../lib/format';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@tingting/shared';
import { api } from '../lib/api';
import { useForwarderSettlementDetail, useAdminSettlementDetail, useUpdateAdvanceSettlement, useUpdateSettlementExpense, useApproveSettlement } from '../hooks/useForwarderQueries';
import { useAuth } from '../hooks/useAuth';
import { PageHeader, StatusPill } from '../components/UI';
import { usePageAnimations } from '../hooks/animations';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { groupSettlementExpensesByTrip } from './admin-advance-settlement-summary';
import { settlementExportEndpoint } from './settlement-export-endpoint';
import { PrintPreviewDialog } from '../components/shared/PrintPreviewDialog';
import './SettlementPrintPage.css';

// ─── Expense type Vietnamese labels ───
const EXPENSE_TYPE_LABELS: Record<string, string> = {
  LIFTING: 'Nâng hạ',
  LOWERING: 'Nâng hạ',
  INFRASTRUCTURE: 'Hạ tầng',
  CUSTOMS: 'Thủ tục HQ',
  WEIGHING: 'Cân hàng',
  INSPECTION: 'Kiểm tra',
  OTHER: 'Khác',
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });
}

interface LinkedExpense {
  id: number;
  tripId: number;
  expenseType: string;
  buyAmount: string;
  sellAmount?: string;
  submittedBuyAmount?: string | null;
  adjustmentReason?: string | null;
  adjustedAt?: string | null;
  completionStatus?: string | null;
  containerNumber: string | null;
  invoiceNumber: string | null;
  note: string | null;
  tripCode: string | null;
  departureDate: string | null;
  customerName: string | null;
  routeName?: string | null;
  tripContainerCount?: number | null;
  expenseTypeName?: string | null;
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
  reimbursementAmount: string;
  status: AdvanceSettlementStatus;
  note: string | null;
  createdAt: string;
  linkedRequests?: LinkedRequest[];
  linkedExpenses?: LinkedExpense[];
  eligibleAdvanceRequests?: LinkedRequest[];
  eligibleExpenses?: LinkedExpense[];
}

// ─── Component ───
export default function SettlementPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPortal = user?.role === 'FORWARDER' || user?.role === 'DRIVER';
  
  const fwdQuery = useForwarderSettlementDetail(isPortal ? Number(id) : 0);
  const admQuery = useAdminSettlementDetail(!isPortal ? Number(id) : 0);
  
  const settlement = isPortal ? fwdQuery.data : admQuery.data;
  const isLoading = isPortal ? fwdQuery.isLoading : admQuery.isLoading;
  const error = isPortal ? fwdQuery.error : admQuery.error;
  const { rootRef } = usePageAnimations({ ready: !isLoading });
  const [showPreview, setShowPreview] = useState(false);
  const [editingExpense, setEditingExpense] = useState<LinkedExpense | null>(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [settlementNote, setSettlementNote] = useState('');
  const [selectionReady, setSelectionReady] = useState(false);
  const updateExpense = useUpdateSettlementExpense();
  const updateSettlement = useUpdateAdvanceSettlement();
  const approveSettlement = useApproveSettlement();

  const handleBack = () => navigate(-1);
  useBackShortcut(handleBack);

  const loadPrintHtml = useCallback(() => api.getForText(settlementExportEndpoint(isPortal, Number(id), 'html')), [isPortal, id]);

  const loadedSettlement = settlement as SettlementData | undefined;
  useEffect(() => {
    if (!loadedSettlement || selectionReady) return;
    setSelectedRequestIds(new Set((loadedSettlement.linkedRequests ?? []).map(request => request.id)));
    setSelectedExpenseIds(new Set((loadedSettlement.linkedExpenses ?? []).map(expense => expense.id)));
    setSettlementNote(loadedSettlement.note ?? '');
    setSelectionReady(true);
  }, [loadedSettlement, selectionReady]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--ink-3)' }}>
        <Loader2 size={20} className="spin" />
        <span style={{ fontSize: 'var(--fs-body)' }}>Đang tải phiếu thanh toán…</span>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="fade-up">
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-body)' }}>{error ? String(error) : 'Không tìm thấy phiếu thanh toán'}</p>
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
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.buyAmount), 0);
  const refund = Number(s.refundAmount || 0);
  const reimbursement = Number(s.reimbursementAmount || 0);
  const balance = totalAdvance + reimbursement - totalExpense - refund;
  const directionLabel = balance !== 0
    ? balance > 0 ? 'Ops tạm ứng chuyển kỳ sau' : 'Thiếu (phải bổ sung)'
    : reimbursement > 0 ? 'Công ty hoàn thêm'
      : refund > 0 ? 'Ops tạm ứng chuyển kỳ sau'
        : 'Đã cân đối';
  const directionAmount = balance !== 0
    ? Math.abs(balance)
    : reimbursement || refund;

  const plans = groupSettlementExpensesByTrip(expenses);
  const totalFromPlans = plans.reduce((sum, plan) => sum + plan.totalExpense, 0);
  const canEditExpenses = !isPortal && (user?.role === 'ACCOUNTANT' || user?.role === 'ADMIN') && (s.status === 'PENDING' || s.status === 'CHECKED_BY_ACCOUNTANT');

  const requestCandidates = [...requests, ...(s.eligibleAdvanceRequests ?? [])]
    .filter((request, index, items) => items.findIndex(item => item.id === request.id) === index);
  const expenseCandidates = [...expenses, ...(s.eligibleExpenses ?? [])]
    .filter((expense, index, items) => items.findIndex(item => item.id === expense.id) === index);
  const expenseCandidatePlans = groupSettlementExpensesByTrip(expenseCandidates);
  const selectedAdvanceTotal = requestCandidates
    .filter(request => selectedRequestIds.has(request.id))
    .reduce((sum, request) => sum + Number(request.amount), 0);
  const selectedExpenseTotal = expenseCandidates
    .filter(expense => selectedExpenseIds.has(expense.id))
    .reduce((sum, expense) => sum + Number(expense.buyAmount), 0);
  const selectedDifference = selectedAdvanceTotal - selectedExpenseTotal;
  const selectedRefundAmount = Math.max(selectedDifference, 0);
  const selectedReimbursementAmount = Math.max(-selectedDifference, 0);

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinalize = async () => {
    if (selectedRequestIds.size === 0) return;
    await updateSettlement.mutateAsync({
      settlementId: s.id,
      advanceRequestIds: [...selectedRequestIds],
      tripExpenseIds: [...selectedExpenseIds],
      refundAmount: selectedRefundAmount,
      reimbursementAmount: selectedReimbursementAmount,
      note: settlementNote.trim() || null,
    });
    await approveSettlement.mutateAsync(s.id);
  };

  const startEditingExpense = (expense: LinkedExpense) => {
    setEditingExpense(expense);
    setEditedAmount(expense.buyAmount);
    setAdjustmentReason(expense.adjustmentReason ?? '');
  };

  const saveExpenseAdjustment = async () => {
    if (!editingExpense || !adjustmentReason.trim() || Number(editedAmount) <= 0) return;
    await updateExpense.mutateAsync({
      settlementId: s.id,
      expenseId: editingExpense.id,
      buyAmount: Number(editedAmount),
      invoiceNumber: editingExpense.invoiceNumber,
      note: editingExpense.note,
      adjustmentReason: adjustmentReason.trim(),
    });
    setEditingExpense(null);
  };

  return (
    <div ref={rootRef}>
      {/* ── Page Header (hidden in print) ── */}
      <div className="no-print">
        <PageHeader
          title={`Phiếu thanh toán ${s.code}`}
          iconName="settlement"
          description={s.forwarderName || ''}
          action={
            <div className="settlement-detail__header-actions">
              <StatusPill variant={settlementStatusVariant(s.status)}>
                {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status] || s.status}
              </StatusPill>
              <button className="btn btn--secondary btn--sm" onClick={handleBack}>
                <ArrowLeft size={14} /> Trở về
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => setShowPreview(true)}>
                <Printer size={14} /> In
              </button>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  api.getBlob(settlementExportEndpoint(isPortal, s.id, 'xlsx'))
                    .then(blob => {
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `phieu-thanh-toan-${s.code}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    });
                }}
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          }
        />
      </div>

      <div className="settlement-detail">
        {/* ── Info Grid ── */}
        <div className="settlement-detail__section">
          <div className="settlement-detail__info">
            <div className="settlement-detail__info-item">
              <span className="settlement-detail__info-label">Số phiếu</span>
              <span className="settlement-detail__info-value">{s.code}</span>
            </div>
            <div className="settlement-detail__info-item">
              <span className="settlement-detail__info-label">Ngày lập</span>
              <span className="settlement-detail__info-value">{new Date(s.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
            </div>
            <div className="settlement-detail__info-item">
              <span className="settlement-detail__info-label">Nhân viên</span>
              <span className="settlement-detail__info-value">{s.forwarderName || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Advances ── */}
        {requests.length > 0 && (
          <div className="settlement-detail__section">
            <h2 className="settlement-detail__section-title">Tạm ứng đã nhận</h2>
            <div className="settlement-detail__advances">
              {requests.map(r => (
                <div key={r.id} className="settlement-detail__advance-row">
                  <span className="settlement-detail__advance-amount">{formatCurrency(Number(r.amount))}</span>
                  <span className="settlement-detail__advance-reason">{r.reason}</span>
                  <span className="settlement-detail__advance-date">{new Date(r.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                </div>
              ))}
              <div className="settlement-detail__advance-total">
                <span>Tổng tạm ứng:</span>
                <strong>{formatCurrency(totalAdvance)}</strong>
              </div>
            </div>
          </div>
        )}

        {canEditExpenses && (
          <div className="settlement-detail__section no-print">
            <h2 className="settlement-detail__section-title">Tạm ứng đưa vào phiếu</h2>
            <p className="settlement-editor-hint">Chỉ các tạm ứng đã duyệt và còn đủ điều kiện mới có thể thêm vào phiếu.</p>
            <div className="settlement-link-list">
              {requestCandidates.map(request => (
                <label key={request.id} className="settlement-link-option">
                  <input type="checkbox" checked={selectedRequestIds.has(request.id)} onChange={() => toggleSelection(setSelectedRequestIds, request.id)} />
                  <span>{request.reason}</span>
                  <strong>{formatCurrency(Number(request.amount))}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Expense Table ── */}
        <div className="settlement-detail__section">
          <h2 className="settlement-detail__section-title">Chi tiết chi phí</h2>
          {editingExpense && (
            <div className="settlement-expense-editor no-print">
              <div>
                <strong>{EXPENSE_TYPE_LABELS[editingExpense.expenseType] || editingExpense.expenseType}</strong>
                <span>Số Ops kê: {formatCurrency(Number(editingExpense.submittedBuyAmount ?? editingExpense.buyAmount))}</span>
              </div>
              <label>
                Số tiền kế toán chốt
                <input className="input" type="number" min="1" value={editedAmount} onChange={event => setEditedAmount(event.target.value)} />
              </label>
              <label>
                Lý do điều chỉnh *
                <input className="input" value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)} placeholder="Ví dụ: Điều chỉnh theo hóa đơn thực tế" />
              </label>
              <div className="settlement-expense-editor__actions">
                <button className="btn btn--ghost" onClick={() => setEditingExpense(null)}>Hủy</button>
                <button className="btn btn--primary" disabled={!adjustmentReason.trim() || Number(editedAmount) <= 0 || updateExpense.isPending} onClick={saveExpenseAdjustment}>
                  {updateExpense.isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Lưu điều chỉnh
                </button>
              </div>
            </div>
          )}
          <div className="settlement-plan-table">
            <div className="settlement-plan-table__header" aria-hidden="true">
              <span>Ngày / Khách hàng</span>
              <span>Chuyến / Container</span>
              <span>Hạng mục chi phí</span>
              <span>Tổng cộng</span>
            </div>
            {plans.length === 0 ? (
              <div className="settlement-plan-table__empty">Chưa có chi phí liên kết.</div>
            ) : plans.map(plan => (
              <div key={plan.tripId} className="settlement-plan-table__row">
                <div className="settlement-plan-table__party">
                  <span>{plan.departureDate ? formatDate(plan.departureDate) : 'Chưa có ngày'}</span>
                  <strong>{plan.customerName || 'Chưa có khách hàng'}</strong>
                </div>
                <div className="settlement-plan-table__trip">
                  <strong>{plan.tripCode || `Chuyến #${plan.tripId}`}</strong>
                  <span className="settlement-plan-table__containers">
                    {plan.containerNumbers.length > 0
                      ? plan.containerNumbers.join(' · ')
                      : plan.containerCount > 0
                        ? `${plan.containerCount} container`
                        : 'Chi phí chung'}
                  </span>
                </div>
                <div className="settlement-plan-table__costs">
                  {plan.expenseBreakdown.map(item => (
                    <span className="settlement-plan-cost" key={item.code}>
                      <span>{item.label}</span>
                      <strong>{formatCurrency(item.amount)}</strong>
                      {item.invoiceNumbers.length > 0 && (
                        <small>HĐ {item.invoiceNumbers.join(', ')}</small>
                      )}
                    </span>
                  ))}
                </div>
                <strong className="settlement-plan-table__amount">
                  {formatCurrency(plan.totalExpense)}
                </strong>
              </div>
            ))}
            <div className="settlement-plan-table__total">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(totalFromPlans)}</strong>
            </div>
          </div>
          {canEditExpenses && (
            <div className="settlement-expense-actions no-print">
              {expenseCandidatePlans.map(plan => (
                <div className="settlement-expense-plan" key={plan.tripId}>
                  <div className="settlement-expense-plan__header">
                    <strong>{plan.tripCode || `Chuyến #${plan.tripId}`}</strong>
                    <span>{plan.containerCount} container · {formatCurrency(plan.totalExpense)}</span>
                  </div>
                  <div className="settlement-expense-plan__items">
                    {expenseCandidates
                      .filter(expense => expense.tripId === plan.tripId)
                      .map(expense => (
                        <div key={expense.id} className="settlement-expense-option">
                          <label>
                            <input type="checkbox" checked={selectedExpenseIds.has(expense.id)} onChange={() => toggleSelection(setSelectedExpenseIds, expense.id)} />
                            <span>
                              <strong>{EXPENSE_TYPE_LABELS[expense.expenseType] || expense.expenseType}</strong>
                              <small>{expense.containerNumber || 'Chi phí chung'} · {formatCurrency(Number(expense.buyAmount))}</small>
                            </span>
                          </label>
                          {expenses.some(item => item.id === expense.id) && (
                            <button className="btn btn--secondary btn--sm" onClick={() => startEditingExpense(expense)}>
                              <Pencil size={14} /> Sửa
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Summary ── */}
        <div className="settlement-detail__summary">
          <div className="settlement-detail__summary-card">
            <div className="settlement-detail__summary-label">Tổng tạm ứng</div>
            <div className="settlement-detail__summary-value">{formatCurrency(totalAdvance)}</div>
          </div>
          <div className="settlement-detail__summary-card">
            <div className="settlement-detail__summary-label">Tổng chi phí</div>
            <div className="settlement-detail__summary-value">{formatCurrency(totalExpense)}</div>
          </div>
          <div className="settlement-detail__summary-card settlement-detail__summary-card--balance">
            <div className="settlement-detail__summary-label">{directionLabel}</div>
            <div className={`settlement-detail__summary-value ${balance >= 0 && reimbursement === 0 ? 'settlement-detail__summary-value--positive' : 'settlement-detail__summary-value--negative'}`}>
              {formatCurrency(directionAmount)}
            </div>
          </div>
        </div>

        {/* ── Note ── */}
        {s.note && (
          <div className="settlement-detail__note">
            <strong>Ghi chú:</strong> {s.note}
          </div>
        )}

        {canEditExpenses && (
          <div className="settlement-finalize no-print">
            <div className="settlement-finalize__fields">
              <label>
                {selectedDifference > 0
                  ? 'Ops tạm ứng chuyển kỳ sau'
                  : selectedDifference < 0
                    ? 'Công ty hoàn thêm'
                    : 'Đã cân đối'}
                <input
                  className="input"
                  type="text"
                  readOnly
                  value={formatCurrency(Math.abs(selectedDifference))}
                />
              </label>
              <label>Ghi chú
                <textarea className="input" rows={2} value={settlementNote} onChange={event => setSettlementNote(event.target.value)} />
              </label>
            </div>
            {(updateSettlement.error || approveSettlement.error) && (
              <p className="settlement-finalize__error">{String(updateSettlement.error || approveSettlement.error)}</p>
            )}
            <button className="btn btn--primary" disabled={selectedRequestIds.size === 0 || updateSettlement.isPending || approveSettlement.isPending} onClick={handleFinalize}>
              {updateSettlement.isPending || approveSettlement.isPending ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              Sửa và hoàn tất
            </button>
          </div>
        )}

        {/* ── Signatures (print only) ── */}
        <div className="settlement-detail__signatures">
          <div className="settlement-detail__sig-block">
            <div className="settlement-detail__sig-label">Người lập</div>
            <div className="settlement-detail__sig-line">(Ký, họ tên)</div>
          </div>
          <div className="settlement-detail__sig-block">
            <div className="settlement-detail__sig-label">Kế toán</div>
            <div className="settlement-detail__sig-line">(Ký, họ tên)</div>
          </div>
          <div className="settlement-detail__sig-block">
            <div className="settlement-detail__sig-label">Quản lý</div>
            <div className="settlement-detail__sig-line">(Ký, họ tên)</div>
          </div>
        </div>
      </div>

      {showPreview && (
        <PrintPreviewDialog
          title={`Phiếu thanh toán ${s.code}`}
          loadHtml={loadPrintHtml}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
