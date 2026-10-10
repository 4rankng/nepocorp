import { ListFilterBar } from '../components/shared/ListFilterBar';
import { useState, useRef, useEffect } from 'react';
import { Wallet, Loader2, Plus, X, User, AlertCircle, Clock, FileText, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { ADVANCE_REQUEST_STATUS_LABELS, AdvanceSettlementStatus, type AdvanceRequestStatus } from '@tingting/shared';
import type { AdvanceRequestWithRefs, AdvanceSettlementWithRefs } from '@tingting/shared';
import { PageHeader, FormGroup, useConfirm } from '../components/UI';
import { useToast } from '../components/shared/Toast';
import {
  useForwarderAdvanceRequests,
  useCreateAdvanceRequest,
  useUpdateAdvanceRequest,
  useDeleteAdvanceRequest,
  useForwarderAdvanceBalance,
  useForwarderSettlements,
} from '../hooks/useQueries';
import { usePageAnimations, useListAnimations, useCounterAnimation } from '../hooks/animations';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useMonth } from '../hooks/useMonth';
import { getCalendarMonthRange } from '../lib/calendar-month';
import './ForwarderAdvancesPage.css';
import '../components/shared/HeroKpiRow.css';

// "N chờ duyệt" is one string with exactly one space before the words. The
// counter suffix and the pre-animation JSX share this single definition so the
// rendered text is identical before and after the animation (kanban 20260922_30).
const PENDING_VALUE_SUFFIX = ' chờ duyệt';

type StatusFilter = '' | AdvanceRequestStatus;

/**
 * An approved request has already been credited to the ledger at its original
 * amount, so the service refuses both amend and delete on it. Mirror that here
 * so the buttons never appear on a row they would fail on.
 */
function canModify(status: string): boolean {
  return status !== 'APPROVED';
}

export default function ForwarderAdvancesPage() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('');
  const { month, year } = useMonth();
  const monthRange = getCalendarMonthRange(year, month);
  const periodFilters = { dateFrom: monthRange.start, dateTo: monthRange.end };
  const { data, isLoading: loading, error: queryError, refetch } = useForwarderAdvanceRequests({
    ...periodFilters,
    status: activeFilter || undefined,
  });
  const { data: balanceData } = useForwarderAdvanceBalance();
  // C2b/C2c — settlement (hoàn ứng) figures shown alongside advances. Buckets
  // are disjoint: "Chờ duyệt hoàn ứng" = requested but not yet approved/rejected;
  // "Đã thanh toán" = approved. Rejected settlements count in neither.
  const { data: settlementsData } = useForwarderSettlements(periodFilters);
  const settlements = (settlementsData?.items ?? []) as AdvanceSettlementWithRefs[];
  const pendingSettlements = settlements.filter(
    s => s.status === AdvanceSettlementStatus.PENDING || s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT,
  );
  const approvedSettlements = settlements.filter(s => s.status === AdvanceSettlementStatus.APPROVED);
  const requestedReimbursement = pendingSettlements.reduce((sum, s) => sum + Number(s.totalExpenseAmount), 0);
  const settledPaid = approvedSettlements.reduce((sum, s) => sum + Number(s.totalExpenseAmount), 0);
  const { rootRef } = usePageAnimations({
    ready: !loading,
    selectors: ['.page-header', '.hero-kpi-row', '.fadv-form-panel', '.fwd-filter-pills', '.fadv-card-trip'],
  });
  const createAdvanceRequest = useCreateAdvanceRequest();
  const updateAdvanceRequest = useUpdateAdvanceRequest();
  const deleteAdvanceRequest = useDeleteAdvanceRequest();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { toast: showToast } = useToast();
  const requests = (data?.items ?? []) as AdvanceRequestWithRefs[];
  const counts = data?.counts ?? {};
  const { rootRef: listRef } = useListAnimations({ itemSelector: '.fadv-card-trip', mode: 'cards', deps: [requests] });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ amount: '', reason: '' });
  const isEditing = editingId !== null;
  const submitting = createAdvanceRequest.isPending || updateAdvanceRequest.isPending;
  const mutationError = (createAdvanceRequest.error ?? updateAdvanceRequest.error)
    ? ((createAdvanceRequest.error ?? updateAdvanceRequest.error) instanceof Error
      ? (createAdvanceRequest.error ?? updateAdvanceRequest.error)!.message
      : isEditing ? 'Lỗi sửa yêu cầu' : 'Lỗi tạo yêu cầu')
    : null;

  const error = queryError ? 'Không thể tải danh sách yêu cầu tạm ứng' : null;
  const totalRequests = Object.values(counts).reduce((sum: number, c) => sum + c, 0);
  const totalAmount = requests.reduce((sum, r) => sum + Number(r.amount), 0);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const outstanding = balanceData ? Number(balanceData.outstanding) : 0;

  const prefersReduced = usePrefersReducedMotion();
  const { animateCounters } = useCounterAnimation({ duration: 1200, delay: 400 });
  const heroAmountRef = useRef<HTMLSpanElement>(null);
  const heroTotalRef = useRef<HTMLSpanElement>(null);
  const heroPendingRef = useRef<HTMLSpanElement>(null);
  const heroOutstandingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (loading || totalRequests === 0 || prefersReduced) return;
    animateCounters([
      { el: heroAmountRef.current, value: totalAmount, format: (v: number) => Math.round(v).toLocaleString('vi-VN') },
      { el: heroTotalRef.current, value: totalRequests, suffix: ' yêu cầu' },
      { el: heroPendingRef.current, value: pendingCount, suffix: PENDING_VALUE_SUFFIX },
      { el: heroOutstandingRef.current, value: outstanding, format: (v: number) => Math.round(v).toLocaleString('vi-VN') },
    ]);
  }, [loading, totalRequests, totalAmount, pendingCount, outstanding, animateCounters, prefersReduced]);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ amount: '', reason: '' });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { amount: Number(form.amount), reason: form.reason };
    const onDone = () => {
      resetForm();
      showToast(isEditing
        ? { kind: 'success', message: 'Đã cập nhật yêu cầu tạm ứng' }
        : { kind: 'success', message: 'Đã gửi yêu cầu tạm ứng' });
    };

    if (isEditing) {
      updateAdvanceRequest.mutate({ id: editingId, ...payload }, { onSuccess: onDone });
      return;
    }
    createAdvanceRequest.mutate(payload, { onSuccess: onDone });
  }

  /** Load a row into the shared form panel and switch it into edit mode. */
  function startEdit(req: AdvanceRequestWithRefs) {
    setEditingId(req.id);
    setForm({ amount: String(Number(req.amount)), reason: req.reason });
    setShowForm(true);
  }

  /**
   * Deletion is irreversible and the row feeds "Tồn tạm ứng", so it goes
   * through the same danger-confirmation the admin reject path uses, naming
   * the amount so the forwarder signs off on the right row.
   */
  async function confirmDelete(req: AdvanceRequestWithRefs) {
    const ok = await confirm(
      `Xóa yêu cầu tạm ứng ${formatCurrency(Number(req.amount))}? Yêu cầu "${req.reason}" sẽ bị xóa vĩnh viễn.`,
      { variant: 'danger', confirmLabel: 'Xóa', cancelLabel: 'Huỷ' },
    );
    if (!ok) return;
    deleteAdvanceRequest.mutate(req.id, {
      onSuccess: () => showToast({ kind: 'success', message: 'Đã xóa yêu cầu tạm ứng' }),
      onError: (err: unknown) => showToast({ kind: 'error', message: err instanceof Error ? err.message : 'Lỗi khi xóa yêu cầu' }),
    });
  }

  if (loading) return (
    <div className="fadv-page">
      <PageHeader title="Tạm ứng" description="Yêu cầu tạm ứng và theo dõi trạng thái" iconName="advances" />
      <div className="fadv-loading">
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách tạm ứng…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fadv-page">
      <PageHeader title="Tạm ứng" description="Yêu cầu tạm ứng và theo dõi trạng thái" iconName="advances" />
      <div className="fadv-empty">
        <div className="fadv-empty__icon" style={{ width: 80, height: 80 }}>
          <AlertCircle size={48} />
        </div>
        <h3 className="fadv-empty__title">Không thể tải dữ liệu</h3>
        <p className="fadv-empty__desc">{error}</p>
        <button type="button" className="btn btn--secondary" onClick={() => void refetch()}>Thử lại</button>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="fadv-page">
      <PageHeader
        title="Tạm ứng"
        description="Yêu cầu tạm ứng và theo dõi trạng thái"
        iconName="advances"
        action={
          !showForm ? (
            <button className="btn btn--primary" onClick={() => { setEditingId(null); setForm({ amount: '', reason: '' }); setShowForm(true); }}>
              <Plus size={16} /> Tạo yêu cầu
            </button>
          ) : undefined
        }
      />

      {/* Hero KPI row */}
      {totalRequests > 0 && (
        <div className="hero-kpi-row">
          <div className="hero-kpi-card">
            <span className="hero-kpi-card__eyebrow">Tổng tạm ứng</span>
            <span className="hero-kpi-card__amount"><span ref={heroAmountRef}>{Math.round(totalAmount).toLocaleString('vi-VN')}</span><span className="hero-kpi-card__currency">₫</span></span>
            <span className="hero-kpi-card__subtitle">{totalRequests} yêu cầu tạm ứng</span>
            <Wallet size={72} className="hero-kpi-card__watermark" aria-hidden />
          </div>
          <div className="hero-kpi-stack">
            <div className="hero-kpi-mini hero-kpi-mini--accent">
              <div className="hero-kpi-mini__body">
                <span className="hero-kpi-mini__title">Tồn tạm ứng</span>
                <span className="hero-kpi-mini__value">
                  <span ref={heroOutstandingRef}>{Math.round(outstanding).toLocaleString('vi-VN')}</span>
                  <span className="hero-kpi-mini__currency">₫</span>
                </span>
                <span className="hero-kpi-mini__label">Đang tạm ứng thực tế</span>
              </div>
              <Wallet size={40} className="hero-kpi-mini__watermark" aria-hidden="true" />
            </div>
            <div className="hero-kpi-mini hero-kpi-mini--warn">
              <div className="hero-kpi-mini__body">
                <span className="hero-kpi-mini__title">Chờ duyệt</span>
                <span className="hero-kpi-mini__value hero-kpi-mini__value--sentence" ref={heroPendingRef}>
                  {Math.round(pendingCount).toLocaleString('vi-VN')}{PENDING_VALUE_SUFFIX}
                </span>
                <span className="hero-kpi-mini__label">yêu cầu · Đang chờ kế toán duyệt</span>
              </div>
              <Clock size={40} className="hero-kpi-mini__watermark" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* C2b/C2c — settlement (hoàn ứng) summary: requested vs paid */}
      {settlements.length > 0 && (
        <div className="fadv-settlement-summary fade-up">
          <div className="fadv-settlement-summary__card fadv-settlement-summary__card--info">
            <span className="fadv-settlement-summary__label">Chờ duyệt hoàn ứng</span>
            <span className="fadv-settlement-summary__value">{formatCurrency(requestedReimbursement)}</span>
            <span className="fadv-settlement-summary__meta">{pendingSettlements.length} phiếu chờ duyệt</span>
            <FileText size={40} className="fadv-settlement-summary__watermark" aria-hidden="true" />
          </div>
          <div className="fadv-settlement-summary__card fadv-settlement-summary__card--success">
            <span className="fadv-settlement-summary__label">Đã thanh toán</span>
            <span className="fadv-settlement-summary__value">{formatCurrency(settledPaid)}</span>
            <span className="fadv-settlement-summary__meta">{approvedSettlements.length} phiếu đã duyệt</span>
            <CheckCircle2 size={40} className="fadv-settlement-summary__watermark" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Create / edit form — one panel, two modes */}
      {showForm && (
        <div className="fadv-form-panel fade-up">
          <div className="fadv-form-panel__head">
            <span className="fadv-form-panel__title">
              {isEditing
                ? <Pencil size={16} style={{ verticalAlign: -2, marginRight: 6, opacity: 0.7 }} />
                : <Wallet size={16} style={{ verticalAlign: -2, marginRight: 6, opacity: 0.7 }} />}
              {isEditing ? 'Điều chỉnh yêu cầu tạm ứng' : 'Tạo yêu cầu tạm ứng'}
            </span>
            <button
              className="btn btn--ghost btn--sm"
              aria-label="Đóng yêu cầu tạm ứng"
              onClick={resetForm}
            >
              <X size={16} />
            </button>
          </div>

          {mutationError && (
            <div className="fadv-form-panel__error" role="alert">{mutationError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="fadv-form-panel__fields">
              <FormGroup label="Số tiền (₫)">
                <input
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="VD: 2.000.000"
                  required
                />
              </FormGroup>
              <FormGroup label="Lý do">
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Nhập lý do tạm ứng"
                  required
                />
              </FormGroup>
            </div>
            <div className="fadv-form-panel__actions">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={resetForm}
              >
                Hủy
              </button>
              <button className="btn btn--primary btn--sm" type="submit" disabled={submitting}>
                {submitting
                  ? <Loader2 size={14} className="spin" />
                  : isEditing ? <Pencil size={14} /> : <Wallet size={14} />}
                {isEditing ? 'Lưu thay đổi' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {totalRequests > 0 && (
        <ListFilterBar<AdvanceRequestStatus | ''>
          label="Lọc trạng thái"
          value={activeFilter}
          onChange={status => setActiveFilter(prev => prev === status ? '' : status)}
          options={[
            { value: '', label: 'Tất cả', count: totalRequests },
            ...(Object.entries(ADVANCE_REQUEST_STATUS_LABELS) as [AdvanceRequestStatus, string][])
              .filter(([status]) => (counts[status] ?? 0) > 0 || activeFilter === status)
              .map(([value, label]) => ({ value, label, count: counts[value] ?? 0 })),
          ]}
        />
      )}

      {/* Empty state */}
      {totalRequests === 0 && !showForm ? (
        <div className="fadv-empty fade-up">
          <div className="fadv-empty__icon">
            <Wallet size={64} />
          </div>
          <h3 className="fadv-empty__title">Chưa có yêu cầu tạm ứng</h3>
          <p className="fadv-empty__desc">
            Nhấn "Tạo yêu cầu" để gửi yêu cầu tạm ứng mới.
          </p>
        </div>
      ) : (
        <div ref={listRef} className="fadv-list">
          {requests.map((req, idx) => (
            <div
              key={req.id}
              className="fadv-card-trip fade-up"
              data-status={req.status}
              style={{
                animationDelay: `${idx * 50}ms`,
              }}
            >
              <div className="fadv-card-trip__body">
                <div className="fadv-card-trip__icon"><Wallet size={16} /></div>
                <div className="fadv-card-trip__main">
                  <div className="fadv-card-trip__head">
                    <span className="fadv-card-trip__amount">
                      {formatCurrency(Number(req.amount))}
                    </span>
                    <span className="fadv-card-trip__date">{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="fadv-card-trip__reason">{req.reason}</div>
                  <div className="fadv-card-trip__date">{ADVANCE_REQUEST_STATUS_LABELS[req.status]}</div>
                </div>
                {req.approverName && req.approvedAt && (
                  <div className="fadv-card-trip__approver">
                    <User size={12} />
                    <span>{req.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} bởi {req.approverName}</span>
                    <span className="fadv-card-trip__meta-sep">·</span>
                    <span>{formatDate(req.approvedAt)}</span>
                  </div>
                )}
                {canModify(req.status) && (
                  <div className="fadv-card-trip__actions">
                    <button
                      type="button"
                      className="fadv-card-trip__action"
                      title="Điều chỉnh yêu cầu"
                      aria-label={`Điều chỉnh yêu cầu tạm ứng ${formatCurrency(Number(req.amount))}`}
                      disabled={deleteAdvanceRequest.isPending}
                      onClick={() => startEdit(req)}
                    >
                      <Pencil size={14} /> Điều chỉnh
                    </button>
                    <button
                      type="button"
                      className="fadv-card-trip__action fadv-card-trip__action--danger"
                      title="Xóa yêu cầu"
                      aria-label={`Xóa yêu cầu tạm ứng ${formatCurrency(Number(req.amount))}`}
                      disabled={deleteAdvanceRequest.isPending}
                      onClick={() => void confirmDelete(req)}
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
