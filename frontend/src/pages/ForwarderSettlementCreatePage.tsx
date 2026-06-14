import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, ArrowLeft, Info, Search, Wallet, Receipt, FileText, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { Money } from '../components/shared/Money';
import { usePageAnimations } from '../hooks/animations';
import { groupExpensesByType } from '../lib/expense-breakdown';
import { PageHeader } from '../components/UI';
import { useForwarderAdvanceRequests, useCreateAdvanceSettlement, useUnlinkedExpenses } from '../hooks/useForwarderQueries';
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

interface AdvanceRequest {
  id: number;
  requesterId: number;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface CreatedSettlement {
  id: number;
  code: string;
}

/* ─── Step header component ──────────────────────────────────────────────── */
function StepHeader({ step, title, icon: Icon }: { step: number; title: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="fset-step-header">
      <div className="fset-step-header__left">
        <div className="fset-step-header__badge">
          <Icon size={14} />
        </div>
        <div>
          <span className="fset-step-header__step">Bước {step}</span>
          <h3 className="fset-step-header__title">{title}</h3>
        </div>
      </div>
    </div>
  );
}

export default function ForwarderSettlementCreatePage() {
  const navigate = useNavigate();
  const { rootRef } = usePageAnimations({ ready: true });
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [refundAmount, setRefundAmount] = useState('0');
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<CreatedSettlement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: requestsData } = useForwarderAdvanceRequests();
  const { data: unlinkedData } = useUnlinkedExpenses();
  const { data: catalogs } = useCatalogs();
  const createSettlement = useCreateAdvanceSettlement();

  const allRequests = ((requestsData?.items ?? requestsData ?? []) as AdvanceRequest[]);
  const approvedRequests = allRequests.filter(r => r.status === 'APPROVED');
  const unlinkedExpenses = useMemo(() => (unlinkedData?.items ?? []) as Array<{
    id: number; tripId: number; expenseType: string; buyAmount: string; approvalStatus?: string; note: string | null; createdAt: string; tripCode: string | null; departureDate: string | null; truckPlate: string | null; containerNumbers: string | null;
  }>, [unlinkedData]);
  const expenseTypeOptions = useMemo(
    () => catalogs?.forwarderExpenseTypes ?? [],
    [catalogs],
  );

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

  const filteredUnlinkedExpenses = useMemo(() => {
    if (!searchQuery.trim()) return unlinkedExpenses;
    const lowerQ = searchQuery.toLowerCase();
    return unlinkedExpenses.filter(e => {
      const matchTrip = e.tripCode?.toLowerCase().includes(lowerQ);
      const matchTruck = e.truckPlate?.toLowerCase().includes(lowerQ);
      const matchContainer = e.containerNumbers?.toLowerCase().includes(lowerQ);
      return matchTrip || matchTruck || matchContainer;
    });
  }, [unlinkedExpenses, searchQuery]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRequestIds.size === 0) return;
    const result = await createSettlement.mutateAsync({
      totalExpenseAmount: totalExpense,
      refundAmount: totalRefund,
      note: note || undefined,
      advanceRequestIds: Array.from(selectedRequestIds),
      tripExpenseIds: selectedExpenseIds.size > 0 ? Array.from(selectedExpenseIds) : undefined,
    });
    setCreated(result as CreatedSettlement);
  }

  const isFormReady = selectedRequestIds.size > 0;

  // ── Success state ──
  if (created) {
    return (
      <div className="fset-page">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/my-settlements')} style={{ marginBottom: 4 }}>
          <ArrowLeft size={14} /> Danh sách phiếu thanh toán
        </button>
        <PageHeader
          title="Tạo phiếu thanh toán"
          description="Thanh toán tạm ứng"
          onBack={() => navigate('/my-settlements')}
        />

        <div className="fset-create-success fade-up">
          <div className="fset-create-success__icon">
            <Check size={32} />
          </div>
          <h2 className="fset-create-success__title">Phiếu đã tạo thành công!</h2>
          <p className="fset-create-success__code">{created.code}</p>

          <div className="fset-create-success__actions">
            <button className="btn btn--primary" onClick={() => navigate(`/my-settlements/${created.id}`)}>
              <ChevronRight size={14} /> Xem chi tiết
            </button>
            <button className="btn btn--ghost" onClick={() => navigate('/my-settlements')}>
              <ArrowLeft size={14} /> Quay lại danh sách
            </button>
          </div>
        </div>

      </div>
    );
  }

  // ── Form state ──
  return (
    <div ref={rootRef} className="fset-page">
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/my-settlements')} style={{ marginBottom: 4 }}>
        <ArrowLeft size={14} /> Danh sách phiếu thanh toán
      </button>
      <PageHeader
        title="Tạo phiếu thanh toán"
        description="Chọn tạm ứng đã duyệt và chi phí phát sinh để tạo phiếu quyết toán"
      />

      <form onSubmit={handleSubmit} className="fset-create-form fade-up">
        {/* ── Step 1: Select advance requests ── */}
        <div className="fset-step-panel">
          <StepHeader step={1} title="Chọn tạm ứng đã duyệt" icon={Wallet} />
          <div className="fset-step-body">
            {approvedRequests.length === 0 ? (
              <div className="fset-empty-inline">
                <div className="fset-empty-inline__icon">
                  <Wallet size={18} />
                </div>
                <span>Không có tạm ứng nào đã duyệt</span>
              </div>
            ) : (
              <div className="fset-check-list">
                <label className="fset-check-all">
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
                  <span>Chọn tất cả</span>
                  <span className="fset-check-all__count">{approvedRequests.length}</span>
                </label>
                {approvedRequests.map(r => (
                  <label key={r.id} className={`fset-check-item ${selectedRequestIds.has(r.id) ? 'fset-check-item--selected' : ''}`}>
                    <input type="checkbox" checked={selectedRequestIds.has(r.id)} onChange={() => toggleRequest(r.id)} />
                    <div className="fset-check-item__body">
                      <div className="fset-check-item__row">
                        <span className="fset-check-item__amount">{formatCurrency(Number(r.amount))}</span>
                        <span className="fset-check-item__reason">{r.reason}</span>
                      </div>
                      <span className="fset-check-item__date">{formatDate(r.createdAt)}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Step 2: Select trip expenses ── */}
        <div className="fset-step-panel">
          <StepHeader step={2} title="Chọn chi phí phát sinh" icon={Receipt} />
          <div className="fset-step-body">
            {unlinkedExpenses.length === 0 ? (
              <div className="fset-empty-inline">
                <div className="fset-empty-inline__icon">
                  <Info size={18} />
                </div>
                <span>Không có chi phí nào chưa thanh toán. Các chi phí đã nằm trong phiếu khác sẽ không hiện ở đây.</span>
              </div>
            ) : (
              <>
                <div className="fset-expense-toolbar">
                  <label className="fset-check-all">
                    <input
                      type="checkbox"
                      checked={filteredUnlinkedExpenses.length > 0 && filteredUnlinkedExpenses.every(e => selectedExpenseIds.has(e.id))}
                      onChange={() => {
                        if (filteredUnlinkedExpenses.every(e => selectedExpenseIds.has(e.id))) {
                          setSelectedExpenseIds(prev => {
                            const next = new Set(prev);
                            filteredUnlinkedExpenses.forEach(e => next.delete(e.id));
                            return next;
                          });
                        } else {
                          setSelectedExpenseIds(prev => {
                            const next = new Set(prev);
                            filteredUnlinkedExpenses.forEach(e => next.add(e.id));
                            return next;
                          });
                        }
                      }}
                    />
                    <span>Chọn tất cả</span>
                    <span className="fset-check-all__count">{filteredUnlinkedExpenses.length}</span>
                  </label>
                  <div className="fset-search-bar">
                    <Search size={14} className="fset-search-bar__icon" />
                    <input
                      type="text"
                      className="fset-search-bar__input"
                      placeholder="Tìm mã chuyến, số xe, số cont..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="fset-check-list">
                  {filteredUnlinkedExpenses.map(exp => (
                    <label key={exp.id} className={`fset-check-item fset-check-item--expense ${selectedExpenseIds.has(exp.id) ? 'fset-check-item--selected' : ''}`}>
                      <input type="checkbox" checked={selectedExpenseIds.has(exp.id)} onChange={() => toggleExpense(exp.id)} />
                      <div className="fset-check-item__body">
                        <div className="fset-check-item__row">
                          <span className="fset-check-item__label">
                            {expenseLabel(exp.expenseType, expenseTypeOptions)}
                          </span>
                          {exp.tripCode && (
                            <span className="fset-check-item__meta">({exp.tripCode})</span>
                          )}
                          <span className="fset-check-item__price">
                            {formatCurrency(Number(exp.buyAmount))}
                          </span>
                        </div>
                        <span className="fset-check-item__sub">
                          {exp.departureDate ? formatDate(exp.departureDate) : formatDate(exp.createdAt)}
                          {exp.truckPlate ? ` · ${exp.truckPlate}` : ''}
                          {exp.containerNumbers && (
                            <span className="fset-cont-badge">{exp.containerNumbers}</span>
                          )}
                          {exp.note && ` · ${exp.note}`}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Summary receipt ── */}
        <div className="fset-summary">
          <div className="fset-summary__header">
            <FileText size={15} />
            <span>Tổng kết</span>
          </div>
          <div className="fset-summary__grid">
            <div className="fset-summary__row">
              <span className="fset-summary__label">Tổng tạm ứng</span>
              <span className="fset-summary__value"><Money value={totalAdvance} /></span>
            </div>
            <div className="fset-summary__row">
              <span className="fset-summary__label">Tổng chi phí</span>
              <span className="fset-summary__value fset-summary__value--expense"><Money value={totalExpense} sign="−" /></span>
            </div>
            <div className="fset-summary__row">
              <span className="fset-summary__label">Tiền hoàn lại</span>
              <span className="fset-summary__value fset-summary__value--refund"><Money value={totalRefund} sign="−" /></span>
            </div>
            <div className="fset-summary__divider" />
            <div className="fset-summary__row fset-summary__row--total">
              <span>Chênh lệch</span>
              <span className={`fset-summary__total ${balance > 0 ? 'fset-summary__total--positive' : balance < 0 ? 'fset-summary__total--negative' : ''}`}>
                <Money value={Math.abs(balance)} />
              </span>
            </div>
          </div>
          {expenseBreakdown.size > 0 && (
            <div className="fset-summary__breakdown">
              <span className="fset-summary__breakdown-label">Chi tiết theo hạng mục</span>
              <div className="fset-summary__breakdown-chips">
                {[...expenseBreakdown.entries()].map(([label, amount]) => (
                  <span key={label} className="fset-chip">{label}: {formatCurrency(amount)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="fset-details-card">
          <div className="fset-input-group">
            <label className="fset-input-label">Tiền hoàn lại</label>
            <input
              type="number"
              className="fset-input"
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value)}
              placeholder="0"
              min={0}
            />
          </div>

          {totalAdvance > 0 && balance !== 0 && (
            <div className="fset-warn-banner">
              <div className="fset-warn-banner__icon">
                <Info size={15} />
              </div>
              <span>Chênh lệch: {formatCurrency(balance)} (tạm ứng − chi phí − hoàn lại)</span>
            </div>
          )}

          <div className="fset-input-group">
            <label className="fset-input-label">Ghi chú</label>
            <textarea
              className="fset-textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú (không bắt buộc)"
              rows={3}
            />
          </div>
        </div>

        {/* ── Error ── */}
        {createSettlement.error && (
          <div className="fset-error-banner">
            {(createSettlement.error as Error)?.message || 'Có lỗi xảy ra'}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="fset-form-actions">
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/my-settlements')}>
            <ArrowLeft size={14} /> Hủy bỏ
          </button>
          <button
            type="submit"
            className={`btn btn--primary ${!isFormReady || createSettlement.isPending ? 'btn--disabled' : ''}`}
            disabled={!isFormReady || createSettlement.isPending}
          >
            {createSettlement.isPending ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
            Gửi phiếu thanh toán
          </button>
        </div>
      </form>
    </div>
  );
}
