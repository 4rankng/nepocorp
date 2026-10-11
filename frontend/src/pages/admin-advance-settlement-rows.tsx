import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, XCircle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { formatNumber, formatDate } from '../lib/format';
import { AdvanceSettlementStatus } from '@tingting/shared';
import type { AdvanceSettlementWithRefs } from '@tingting/shared';
import { StatusPill, ConfirmDialog } from '../components/UI';
import { StatusStrip } from '../components/shared/StatusStrip';
import { Money } from '../components/shared/Money';
import { advanceSettlementStatusVariant } from '../lib/status-variants';
import {
  groupSettlementExpensesByTrip,
  summarizeSettlementExpenses,
} from './admin-advance-settlement-summary';
import { STATUS_COLORS, settlementStatusLabel } from '../features/advances/settlementLedgerView';

/**
 * Settlement rows for the audit list: one desktop grid row and one mobile card,
 * lifted out of the page so it stays under the file-size budget. Pure
 * presentation — the page owns every mutation through `SettlementActions`.
 */

export type Settlement = AdvanceSettlementWithRefs;

/* ── Desktop grid row ──────────────────────────────────────────────────── */

/**
 * Settlement-level approve/reject handles shared by the desktop row and the
 * mobile card. Plain callbacks plus the in-flight id — so the row components
 * stay decoupled from the react-query layer.
 */
export interface SettlementActions {
  /** Settlement id with an in-flight mutation, if any. */
  pendingId?: number;
  /** Which mutation is in flight for `pendingId`. */
  pendingKind?: 'approve' | 'reject' | 'delete';
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  /** Removes a PENDING phiếu; the caller re-checks the status before wiring it. */
  onDelete: (id: number) => void;
}

export function SettlementGridRow({
  s,
  actions,
  focusId,
  canApproveReject,
  canDelete,
}: {
  s: Settlement;
  actions: SettlementActions;
  focusId?: string;
  canApproveReject: boolean;
  canDelete: boolean;
}) {
  const isRejecting = actions.pendingId === s.id && actions.pendingKind === 'reject';
  const isApproving = actions.pendingId === s.id && actions.pendingKind === 'approve';
  const isDeleting = actions.pendingId === s.id && actions.pendingKind === 'delete';
  const canAct = s.status === AdvanceSettlementStatus.PENDING || s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT;
  // Only PENDING is deletable server-side; CHECKED_BY_ACCOUNTANT already sits on
  // the approval path and is refused (kanban 101026154020).
  const mayDelete = canDelete && s.status === AdvanceSettlementStatus.PENDING;
  const plans = groupSettlementExpensesByTrip(s.linkedExpenses ?? []);
  const rows = plans.length > 0 ? plans : [null];
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'delete' | null>(null);
  // Money the accountant is signing off on — shown in the confirm step so a
  // batch action is never a blind tap (kanban 20260922_34).
  const payout = Number(s.reimbursementAmount || 0) > 0
    ? { label: 'Công ty hoàn thêm', value: Number(s.reimbursementAmount || 0) }
    : { label: 'Ops tạm ứng', value: Number(s.refundAmount) };

  return (
    <>
      <div className="as-settlement-summary">
        <div>
          <span>Phiếu quyết toán</span>
          <Link to={`/settlements/${s.id}`}>{s.code}</Link>
        </div>
        <div>
          <span>Tạm ứng quyết toán</span>
          <strong>
            <Money
              value={
                Number(s.totalExpenseAmount)
                + Number(s.refundAmount)
                - Number(s.reimbursementAmount || 0)
              }
            />
          </strong>
        </div>
        <div>
          <span>Tổng chi phí</span>
          <strong><Money value={Number(s.totalExpenseAmount)} /></strong>
        </div>
        {Number(s.reimbursementAmount || 0) > 0 ? (
          <div>
            <span>Công ty hoàn thêm</span>
            <strong><Money value={Number(s.reimbursementAmount || 0)} /></strong>
          </div>
        ) : (
          <div>
            <span>Ops tạm ứng</span>
            <strong><Money value={Number(s.refundAmount)} /></strong>
          </div>
        )}
        {canAct && (canApproveReject || mayDelete) && (
          <div className="as-settlement-actions">
            {canApproveReject && (
              <>
                <button
                  type="button"
                  className="as-batch-action as-batch-action--approve"
                  onClick={() => setPendingAction('approve')}
                  disabled={isApproving || isRejecting}
                  aria-label={`Duyệt cả phiếu ${s.code}`}
                >
                  {isApproving ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                  <span className="as-batch-action__label">Duyệt</span>
                </button>
                <button
                  type="button"
                  className="as-batch-action as-batch-action--reject"
                  onClick={() => setPendingAction('reject')}
                  disabled={isApproving || isRejecting}
                  aria-label={`Từ chối cả phiếu ${s.code}`}
                >
                  {isRejecting ? <Loader2 size={15} className="spin" /> : <XCircle size={15} aria-hidden="true" />}
                  <span className="as-batch-action__label">Từ chối</span>
                </button>
              </>
            )}
            {/* Removing the phiếu is the settlement's own action — rendered once,
                here, never per child row: the repeated-per-row reject button was
                the defect of kanban 20260922_34 and delete must not reintroduce
                it (kanban 101026154020). MANAGER may delete but not rewrite the
                sheet, so this is gated separately from approve/reject. */}
            {mayDelete && (
              <button
                type="button"
                className="as-batch-action as-batch-action--danger"
                onClick={() => setPendingAction('delete')}
                disabled={isDeleting}
                aria-label={`Xóa phiếu ${s.code}`}
              >
                {isDeleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} aria-hidden="true" />}
                <span className="as-batch-action__label">Xóa</span>
              </button>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={pendingAction !== null}
        variant={pendingAction === 'approve' ? 'primary' : 'danger'}
        confirmLabel={
          pendingAction === 'reject' ? 'Từ chối cả phiếu' : pendingAction === 'delete' ? 'Xóa phiếu' : 'Duyệt cả phiếu'
        }
        message={
          pendingAction === 'reject'
            ? `Từ chối cả phiếu ${s.code}? Toàn bộ chi phí trong phiếu sẽ không được hoàn ứng.`
            : pendingAction === 'delete'
              ? `Xóa phiếu hoàn ứng ${s.code}? Thao tác không thể hoàn tác.`
              : `Duyệt cả phiếu ${s.code}? ${payout.label}: ${formatNumber(payout.value)} ₫ sẽ được ghi nhận.`
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action === 'approve') actions.onApprove(s.id);
          else if (action === 'reject') actions.onReject(s.id);
          else if (action === 'delete') actions.onDelete(s.id);
        }}
      />
      {rows.map((plan, index) => (
        <div
          className="as-grid-row"
          id={index === 0 ? focusId : undefined}
          key={plan?.tripId ?? `empty-${s.id}`}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <StatusStrip color={STATUS_COLORS[s.status]} />

          <div className="as-date-customer">
            <span className="as-date">{plan?.departureDate ? formatDate(plan.departureDate) : formatDate(s.createdAt)}</span>
            <strong>{plan?.customerName || 'Chưa có khách hàng'}</strong>
          </div>

          <div className="as-record">
            {plan ? (
              <Link to={`/trips/${plan.tripId}`} className="as-code-link">
                {plan.tripCode || `Chuyến #${plan.tripId}`}
              </Link>
            ) : (
              <Link to={`/settlements/${s.id}`} className="as-code-link">{s.code}</Link>
            )}
            <span className="as-record__forwarder">
              {s.code} · {s.forwarderName || 'Chưa có tên giao nhận'}
            </span>
          </div>

          <div className="as-container-count">{plan?.containerCount ?? 0}</div>
          <div className="as-route">{plan?.routeName || 'Chưa có tuyến đường'}</div>

          <div className="as-expense-breakdown">
            {plan && plan.expenseBreakdown.length > 0 ? plan.expenseBreakdown.map(item => (
              <span className="as-expense-chip" key={item.code}>
                <span>{item.label}</span>
                <strong><Money value={item.amount} /></strong>
              </span>
            )) : <span className="as-expense-empty">Chưa có khoản chi liên kết</span>}
          </div>

          <div className="as-amount">
            <Money value={plan?.totalExpense ?? Number(s.totalExpenseAmount)} />
          </div>

          {/* One vertical rhythm, one left edge: status, then who decided it as a
              label+name pair (not a right-aligned sentence), then the row's
              action. The block used to stagger a pill, a right-aligned link and
              a right-aligned "Duyệt bởi …" line, which read like a message rather
              than a data column (kanban 111026094000). */}
          <div className="as-status-actions">
            <StatusPill variant={advanceSettlementStatusVariant(s.status)}>
              {settlementStatusLabel(s.status)}
            </StatusPill>

            {(s.approverName || s.checkerName) && (
              <div className="as-decider">
                <span className="as-decider__label">{s.approverName ? 'Duyệt' : 'KT kiểm tra'}</span>
                <strong className="as-decider__name">{s.approverName || s.checkerName}</strong>
              </div>
            )}

            <Link
              className={`as-row-action${canAct ? '' : ' as-row-action--quiet'}`}
              to={`/settlements/${s.id}`}
              aria-label={`${canApproveReject ? 'Kiểm tra' : 'Xem'} ${s.code}`}
            >
              {canApproveReject && <Pencil size={15} aria-hidden="true" />}
              {canApproveReject ? 'Kiểm tra' : 'Xem phiếu'}
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Mobile card ───────────────────────────────────────────────────────── */

export function SettlementMobileCard({
  s,
  actions,
  focusId,
  canApproveReject,
  canDelete,
}: {
  s: Settlement;
  actions: SettlementActions;
  focusId?: string;
  canApproveReject: boolean;
  canDelete: boolean;
}) {
  const isRejecting = actions.pendingId === s.id && actions.pendingKind === 'reject';
  const isApproving = actions.pendingId === s.id && actions.pendingKind === 'approve';
  const isDeleting = actions.pendingId === s.id && actions.pendingKind === 'delete';
  const canAct = s.status === AdvanceSettlementStatus.PENDING || s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT;
  // Same rule as the desktop row and the service: PENDING only.
  const mayDelete = canDelete && s.status === AdvanceSettlementStatus.PENDING;
  // Destructive and irreversible, so the card confirms it just like the desktop row.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const scope = summarizeSettlementExpenses(s.linkedExpenses);
  const plans = groupSettlementExpensesByTrip(s.linkedExpenses ?? []);

  return (
    <article className="as-mcard" id={focusId}>
      <StatusStrip color={STATUS_COLORS[s.status]} />

      {/* Identity and review state */}
      <div className="as-mcard__top">
        <div className="as-mcard__identity">
          <span className="as-mcard__kind">
            <FileText size={14} aria-hidden="true" />
            Phiếu hoàn ứng
          </span>
          <Link to={`/settlements/${s.id}`} className="as-mcard__code">{s.code}</Link>
          <span className="as-mcard__name">
            {s.forwarderName || 'Chưa có tên giao nhận'}
          </span>
        </div>
        <span className="as-mcard__status">
          {settlementStatusLabel(s.status)}
        </span>
      </div>

      {/* Decision amount */}
      <div className="as-mcard__amounts">
        <div className="as-mcard__amount-row">
          <span className="as-mcard__amount-label">Tổng chi phí</span>
          <span className="as-mcard__amount-value"><Money value={Number(s.totalExpenseAmount)} /></span>
        </div>
        {Number(s.refundAmount) > 0 && (
          <div className="as-mcard__refund">
            <span>Ops tạm ứng</span>
            <strong><Money value={Number(s.refundAmount)} /></strong>
          </div>
        )}
        {Number(s.reimbursementAmount || 0) > 0 && (
          <div className="as-mcard__refund">
            <span>Công ty hoàn thêm</span>
            <strong><Money value={Number(s.reimbursementAmount || 0)} /></strong>
          </div>
        )}
      </div>

      {/* Compact linked scope */}
      <div className="as-mcard__scope">
        <div className="as-mcard__scope-head">
          <span>Phạm vi quyết toán</span>
          <time dateTime={s.createdAt}>{formatDate(s.createdAt)}</time>
        </div>
        <div className="as-mcard__scope-grid">
          <div>
            <strong>{scope.expenseCount}</strong>
            <span>Khoản chi</span>
          </div>
          <div>
            <strong>{scope.tripCount}</strong>
            <span>Chuyến</span>
          </div>
          <div>
            <strong>{scope.containerCount}</strong>
            <span>Container</span>
          </div>
        </div>
      </div>

      {plans.length > 0 && (
        <div className="as-mcard__plans">
          <span className="as-mcard__plans-title">Kế hoạch vận chuyển</span>
          {plans.map(plan => (
            <div className="as-mcard__plan" key={plan.tripId}>
              <div className="as-mcard__plan-head">
                <Link to={`/trips/${plan.tripId}`}>{plan.tripCode || `Chuyến #${plan.tripId}`}</Link>
                <strong>{plan.containerCount} cont</strong>
              </div>
              <div className="as-mcard__plan-meta">
                {plan.departureDate ? formatDate(plan.departureDate) : 'Chưa có ngày'}
                {' · '}
                {plan.customerName || 'Chưa có khách hàng'}
                {' · '}
                {plan.routeName || 'Chưa có tuyến'}
              </div>
              <div className="as-mcard__plan-costs">
                {plan.expenseBreakdown.map(item => (
                  <span key={item.code}>{item.label}: <Money value={item.amount} /></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {canAct ? (
        <div className="as-mcard__actions">
          {canApproveReject && (
            <Link className="btn btn--primary" to={`/settlements/${s.id}`}>
              <Pencil size={16} aria-hidden="true" /> Kiểm tra &amp; hoàn tất
            </Link>
          )}
          {canApproveReject && (
            <button
              type="button"
              className="btn btn--primary as-mcard__approve"
              onClick={() => actions.onApprove(s.id)}
              disabled={isApproving || isRejecting}
              aria-label={`Duyệt cả phiếu ${s.code}`}
            >
              {isApproving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              Duyệt
            </button>
          )}
          {canApproveReject && (
            <button
              type="button"
              className="btn as-mcard__reject"
              onClick={() => actions.onReject(s.id)}
              disabled={isApproving || isRejecting}
              aria-label={`Từ chối cả phiếu ${s.code}`}
            >
              {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
              Từ chối
            </button>
          )}
          {mayDelete && (
            <button
              type="button"
              className="btn as-mcard__reject"
              onClick={() => setConfirmingDelete(true)}
              disabled={isDeleting}
              aria-label={`Xóa phiếu ${s.code}`}
            >
              {isDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} aria-hidden="true" />}
              Xóa phiếu
            </button>
          )}
        </div>
      ) : (s.approverName || s.checkerName) ? (
        <div className="as-mcard__reviewer">
          <span>{s.approverName ? 'Duyệt bởi' : 'KT kiểm tra'}</span>
          <strong>{s.approverName ?? s.checkerName}</strong>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={confirmingDelete}
        variant="danger"
        confirmLabel="Xóa phiếu"
        message={`Xóa phiếu hoàn ứng ${s.code}? Thao tác không thể hoàn tác.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          actions.onDelete(s.id);
        }}
      />
    </article>
  );
}
