import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Plus, X, Check, ArrowRight, Info } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { groupExpensesByType } from '../lib/expense-breakdown';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@tingting/shared';
import { PageHeader, FormGroup, KPI } from '../components/UI';
import { useForwarderSettlements, useForwarderAdvanceRequests, useCreateAdvanceSettlement, useUnlinkedExpenses } from '../hooks/useForwarderQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import './ForwarderSettlementsPage.css';

/** Vietnamese fallback labels for expense type codes */
const EXPENSE_TYPE_VI: Record<string, string> = {
  LIFTING: 'Nâng container',
  LOWERING: 'Hạ container',
  CUSTOMS: 'Hải quan',
  WEIGHING: 'Cân hàng',
  INFRASTRUCTURE: 'Hạ tầng',
  INSPECTION: 'Kiểm tra',
  INSPECTION_SVC: 'Dịch vụ kiểm tra',
  PORT_STORAGE: 'Lưu bãi',
  CLEANING: 'Vệ sinh container',
  OTHER: 'Khác',
};

function expenseLabel(code: string, options: Array<{ code: string; name: string }>): string {
  return options.find(t => t.code === code)?.name || EXPENSE_TYPE_VI[code] || code;
}

/** Generate business codes — NEVER show raw IDs */
function advanceRequestCode(id: number): string {
  return `TU-${String(id).padStart(4, '0')}`;
}

/** Status strip colors matching ForwarderTripsPage pattern */
const STATUS_STRIP: Record<AdvanceSettlementStatus, string> = {
  PENDING: '#D97706',
  CHECKED_BY_ACCOUNTANT: '#2563EB',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
};

interface LinkedRequest {
  id: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface LinkedExpense {
  id: number;
  tripId: number;
  expenseType: string;
  buyAmount: string;
  note: string | null;
  createdAt: string;
  tripCode: string | null;
}

interface Settlement {
  id: number;
  code: string;
  forwarderId: number;
  totalExpenseAmount: string;
  refundAmount: string;
  status: AdvanceSettlementStatus;
  checkedBy: number | null;
  checkedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  note: string | null;
  createdAt: string;
  forwarderName?: string;
  checkerName?: string;
  approverName?: string;
  linkedRequests?: LinkedRequest[];
  linkedExpenses?: LinkedExpense[];
}

interface AdvanceRequest {
  id: number;
  requesterId: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function ForwarderSettlementsPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [refundAmount, setRefundAmount] = useState('0');
  const [note, setNote] = useState('');
  const [activeFilter, setActiveFilter] = useState<AdvanceSettlementStatus | ''>('');

  const { data: settlementsData, isLoading: loadingSettlements, error: settlementsError } = useForwarderSettlements();
  const { data: requestsData } = useForwarderAdvanceRequests();
  const { data: unlinkedData } = useUnlinkedExpenses();
  const { data: catalogs } = useCatalogs();
  const createSettlement = useCreateAdvanceSettlement();

  const settlements = (settlementsData?.items ?? settlementsData ?? []) as Settlement[];
  const allRequests = ((requestsData?.items ?? requestsData ?? []) as AdvanceRequest[]);
  const approvedRequests = allRequests.filter(r => r.status === 'APPROVED');
  const unlinkedExpenses = (unlinkedData?.items ?? []) as Array<{
    id: number; tripId: number; expenseType: string; buyAmount: string; approvalStatus?: string; note: string | null; createdAt: string; tripCode: string | null; departureDate: string | null; truckPlate: string | null;
  }>;
  const expenseTypeOptions = catalogs?.forwarderExpenseTypes ?? [];

  const totalAdvance = useMemo(() => {
    return approvedRequests
      .filter(r => selectedRequestIds.has(r.id))
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }, [approvedRequests, selectedRequestIds]);

  const totalExpense = useMemo(() => {
    return unlinkedExpenses
      .filter(e => selectedExpenseIds.has(e.id))
      .reduce((sum, e) => sum + Number(e.buyAmount), 0);
  }, [unlinkedExpenses, selectedExpenseIds]);

  const totalRefund = Number(refundAmount) || 0;
  const balance = totalAdvance - totalExpense - totalRefund;

  const expenseBreakdown = useMemo(() => {
    const selected = unlinkedExpenses.filter(e => selectedExpenseIds.has(e.id));
    return groupExpensesByType(selected, expenseTypeOptions);
  }, [unlinkedExpenses, selectedExpenseIds, expenseTypeOptions]);

  function toggleRequest(id: number) {
    setSelectedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpense(id: number) {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setShowForm(false);
    setSelectedRequestIds(new Set());
    setSelectedExpenseIds(new Set());
    setRefundAmount('0');
    setNote('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRequestIds.size === 0) return;
    await createSettlement.mutateAsync({
      totalExpenseAmount: totalExpense,
      refundAmount: totalRefund,
      note: note || undefined,
      advanceRequestIds: Array.from(selectedRequestIds),
      tripExpenseIds: selectedExpenseIds.size > 0 ? Array.from(selectedExpenseIds) : undefined,
    });
    resetForm();
  }

  const error = settlementsError ? 'Không thể tải danh sách phiếu thanh toán' : null;

  // Derived stats
  const pending = settlements.filter(s => s.status === 'PENDING').length;
  const totalExpenseAll = settlements.reduce((sum, s) => sum + Number(s.totalExpenseAmount), 0);

  // Status counts & filtered list
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AdvanceSettlementStatus, number>> = {};
    for (const s of settlements) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }, [settlements]);
  const filteredSettlements = activeFilter
    ? settlements.filter(s => s.status === activeFilter)
    : settlements;

  if (loadingSettlements) return (
    <div className="fset-page">
      <PageHeader title="Phiếu thanh toán" description="Thanh toán tạm ứng" />
      <div className="fset-loading">
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách phiếu thanh toán…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fset-page">
      <PageHeader title="Phiếu thanh toán" description="Thanh toán tạm ứng" />
      <div className="empty-state">
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="fset-page">
      <PageHeader
        title="Phiếu thanh toán"
        description="Thanh toán tạm ứng"
        action={
          !showForm ? (
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Thêm phiếu
            </button>
          ) : undefined
        }
      />

      {/* Create form */}
      {showForm && (
        <div className="fset-form-panel fade-up">
          <div className="fset-form-panel__head">
            <span className="fset-form-panel__title">Tạo phiếu thanh toán</span>
            <button className="btn btn--ghost btn--sm" onClick={resetForm}><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Select advance requests */}
            <FormGroup label="Bước 1 · Chọn tạm ứng đã duyệt">
              {approvedRequests.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Không có tạm ứng nào đã duyệt</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="fset-form-panel__select-all">
                    <input
                      type="checkbox"
                      checked={approvedRequests.length > 0 && selectedRequestIds.size === approvedRequests.length}
                      onChange={() => {
                        if (selectedRequestIds.size === approvedRequests.length) {
                          setSelectedRequestIds(new Set());
                        } else {
                          setSelectedRequestIds(new Set(approvedRequests.map(r => r.id)));
                        }
                      }}
                    />
                    Chọn tất cả ({approvedRequests.length})
                  </label>
                  {approvedRequests.map(r => (
                    <label key={r.id} className="fset-form-panel__item">
                      <input type="checkbox" checked={selectedRequestIds.has(r.id)} onChange={() => toggleRequest(r.id)} />
                      <div className="fset-form-panel__item-text">
                        <span className="fset-form-panel__item-amount">{formatCurrency(Number(r.amount))}</span>
                        <span className="fset-form-panel__item-meta">— {r.reason}</span>
                      </div>
                      <span className="fset-form-panel__item-date">{formatDate(r.createdAt)}</span>
                    </label>
                  ))}
                </div>
              )}
            </FormGroup>

            {/* Step 2: Select trip expenses */}
            <FormGroup label="Bước 2 · Chọn chi phí phát sinh">
              {unlinkedExpenses.length === 0 ? (
                <div className="fset-form-panel__empty-hint">
                  <Info size={14} />
                  <span>Không có chi phí nào chưa thanh toán. Các chi phí đã nằm trong phiếu khác sẽ không hiện ở đây.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="fset-form-panel__select-all">
                    <input
                      type="checkbox"
                      checked={unlinkedExpenses.length > 0 && selectedExpenseIds.size === unlinkedExpenses.length}
                      onChange={() => {
                        if (selectedExpenseIds.size === unlinkedExpenses.length) {
                          setSelectedExpenseIds(new Set());
                        } else {
                          setSelectedExpenseIds(new Set(unlinkedExpenses.map(e => e.id)));
                        }
                      }}
                    />
                    Chọn tất cả ({unlinkedExpenses.length})
                  </label>
                  {unlinkedExpenses.map(exp => (
                    <label key={exp.id} className="fset-form-panel__item">
                      <input type="checkbox" checked={selectedExpenseIds.has(exp.id)} onChange={() => toggleExpense(exp.id)} />
                      <div className="fset-form-panel__item-text">
                        <span className="fset-form-panel__item-amount">
                          {expenseLabel(exp.expenseType, expenseTypeOptions)}
                        </span>
                        {exp.tripCode && (
                          <span className="fset-form-panel__item-meta">({exp.tripCode})</span>
                        )}
                        <span className="fset-form-panel__item-meta">
                          · {exp.departureDate ? formatDate(exp.departureDate) : '—'}
                          {exp.truckPlate ? ` · ${exp.truckPlate}` : ''}
                        </span>
                        {exp.note && (
                          <span className="fset-form-panel__item-meta">· {exp.note}</span>
                        )}
                      </div>
                      <span className="fset-form-panel__item-price">
                        {formatCurrency(Number(exp.buyAmount))}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </FormGroup>

            {/* Summary */}
            <div className="fset-form-panel__summary">
              <div className="fset-form-panel__summary-grid">
                <div><span className="fset-form-panel__summary-label">Tổng tạm ứng:</span> <span className="fset-form-panel__summary-value">{formatCurrency(totalAdvance)}</span></div>
                <div><span className="fset-form-panel__summary-label">Tổng chi phí:</span> <span className="fset-form-panel__summary-value">{formatCurrency(totalExpense)}</span></div>
              </div>
              {expenseBreakdown.size > 0 && (
                <div className="fset-form-panel__breakdown">
                  <span className="fset-form-panel__breakdown-label">Chi tiết theo hạng mục:</span>
                  <div className="fset-form-panel__breakdown-chips">
                    {[...expenseBreakdown.entries()].map(([label, amount]) => (
                      <span key={label} className="fset-chip">{label}: {formatCurrency(amount)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <FormGroup label="Tiền hoàn lại">
              <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0" min={0} />
            </FormGroup>

            {totalAdvance > 0 && balance !== 0 && (
              <div className="fset-form-panel__warn">
                Chênh lệch: {formatCurrency(balance)} (tạm ứng − chi phí − hoàn lại)
              </div>
            )}

            <FormGroup label="Ghi chú">
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" style={{ minHeight: 64, resize: 'vertical' }} />
            </FormGroup>

            {createSettlement.error && (
              <div className="fset-form-panel__error">
                {(createSettlement.error as Error)?.message || 'Có lỗi xảy ra'}
              </div>
            )}

            <div className="fset-form-panel__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetForm}>Hủy</button>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={selectedRequestIds.size === 0 || createSettlement.isPending}
              >
                {createSettlement.isPending ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                Gửi phiếu thanh toán
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI row */}
      {settlements.length > 0 && (
        <div className="fset-kpi-row">
          <KPI label="Tổng phiếu" value={settlements.length} icon={FileText} />
          <KPI label="Chờ xử lý" value={pending} variant={pending > 0 ? 'warn' : 'default'} />
          <KPI label="Tổng chi phí" value={formatCurrency(totalExpenseAll)} variant={totalExpenseAll > 0 ? 'success' : 'default'} />
        </div>
      )}

      {/* Status filter pills — matching ForwarderTripsPage design */}
      {settlements.length > 0 && (
        <div className="fwd-filter-pills">
          <button
            className={`fwd-filter-pill ${activeFilter === '' ? 'fwd-filter-pill--active' : ''}`}
            onClick={() => setActiveFilter('')}
          >
            Tất cả
            <span className="fwd-filter-pill__count">{settlements.length}</span>
          </button>
          {(Object.entries(ADVANCE_SETTLEMENT_STATUS_LABELS) as [AdvanceSettlementStatus, string][]).map(([status, label]) => {
            const count = statusCounts[status] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={status}
                className={`fwd-filter-pill ${activeFilter === status ? 'fwd-filter-pill--active' : ''}`}
                data-status={status}
                onClick={() => setActiveFilter(prev => prev === status ? '' : status)}
              >
                <span className="fwd-filter-pill__dot" style={{ background: STATUS_STRIP[status] }} />
                {label}
                <span className="fwd-filter-pill__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {settlements.length === 0 && !showForm ? (
        <div className="fset-empty fade-up">
          <div className="fset-empty__icon"><FileText size={48} /></div>
          <h3 className="fset-empty__title">Chưa có phiếu thanh toán</h3>
          <p className="fset-empty__desc">Nhấn "Thêm phiếu" để lập phiếu mới.</p>
        </div>
      ) : (
        <div className="fset-list">
          {filteredSettlements.map((s, idx) => {
            const hasBreakdown = s.linkedExpenses && s.linkedExpenses.length > 0;
            const groups = hasBreakdown ? groupExpensesByType(s.linkedExpenses!, expenseTypeOptions) : null;

            return (
              <div
                key={s.id}
                className="fset-card fade-up"
                style={{
                  animationDelay: `${idx * 40}ms`,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => navigate(`/my-settlements/${s.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/my-settlements/${s.id}`); } }}
              >
                {/* Status strip — color tells status, no text needed */}
                <span className="fset-card__strip" style={{ background: STATUS_STRIP[s.status] }} />

                <div className="fset-card__body">
                  {/* Icon tile */}
                  <div className="fset-card__icon">
                    <FileText size={16} />
                  </div>

                  {/* Main content */}
                  <div className="fset-card__main">
                    <div className="fset-card__head">
                      <span className="fset-card__code-text">{s.code}</span>
                    </div>

                    <div className="fset-card__meta">
                      <span className="fset-card__meta-item">{formatDate(s.createdAt)}</span>
                      <span className="fset-card__meta-item">
                        Chi phí: <strong>{formatCurrency(Number(s.totalExpenseAmount))}</strong>
                      </span>
                      {Number(s.refundAmount) > 0 && (
                        <span className="fset-card__meta-item">
                          Hoàn lại: <strong>{formatCurrency(Number(s.refundAmount))}</strong>
                        </span>
                      )}
                    </div>

                    {/* Breakdown chips — compact inline */}
                    {groups && groups.size > 0 && (
                      <div className="fset-card__chips">
                        {[...groups.entries()].map(([label, amount]) => (
                          <span key={label} className="fset-chip">{label}: {formatCurrency(amount)}</span>
                        ))}
                      </div>
                    )}

                    {/* Linked advances */}
                    {s.linkedRequests && s.linkedRequests.length > 0 && (
                      <div className="fset-card__chips">
                        {s.linkedRequests.map(r => (
                          <span key={r.id} className="fset-chip fset-chip--linked">
                            {advanceRequestCode(r.id)} — {formatCurrency(Number(r.amount))}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {s.note && (
                      <div className="fset-card__note">{s.note}</div>
                    )}

                    {/* Checker/approver */}
                    {(s.checkerName || s.approverName) && (
                      <div className="fset-card__footer">
                        {s.checkerName && <span>Kiểm tra: {s.checkerName}</span>}
                        {s.approverName && <span>Duyệt: {s.approverName}</span>}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowRight size={16} className="fset-card__arrow" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
