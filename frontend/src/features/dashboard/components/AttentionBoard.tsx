import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NavigateFunction } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, ChevronRight, ChevronUp,
  ClipboardCheck, FileWarning, Fuel, HandCoins, Loader2, Lock, PieChart, Truck,
} from 'lucide-react';
import type { DashboardDecisionKind } from '@tingting/shared';
import { forwarderClient } from '../../../api/forwarderClient';
import { qk } from '../../../api/keys';
import type { ApprovalItemType, ApprovalQueueItem } from '../hooks/useApprovalQueue';
import { fmtVN } from './dashboardFormatters';
import type { MergedAttentionRow } from './attentionRows';

/**
 * "Việc cần xử lý" — the single action rail (NEPO-25, consult verdict
 * deepseek 25/10). Merges the old decision board AND the "Cần duyệt" panel:
 * rows are 44–48px, severity-tinted icon 16, hairline dividers, whole row is
 * the tap target, chevron right. Approval items keep their blue "Duyệt"
 * identity and their quick-approve tick for advance requests.
 */

const APPROVAL_TYPE_LABEL: Partial<Record<ApprovalItemType, string>> = {
  ancillaryFees: 'Phí phụ trợ',
  advances: 'Tạm ứng',
  advanceSettlementsCheck: 'Phiếu thanh toán — kiểm tra',
  advanceSettlementsApprove: 'Phiếu thanh toán — duyệt',
};

type DecisionIconComponent = React.ComponentType<{
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

const DECISION_ICON: Record<DashboardDecisionKind, DecisionIconComponent> = {
  receivables: HandCoins,
  dispatch: Truck,
  renewal: CalendarClock,
  fuel: Fuel,
  'trip-lock': Lock,
  'trip-data': FileWarning,
  'profit-close': PieChart,
  'all-clear': CheckCircle2,
};

/** Rows visible before "Xem tất cả" — sized so the rail height tracks the
 * 280px hero chart (6 × 45px rows + header + footer ≈ chart card height). */
export const ATTENTION_RAIL_LIMIT = 6;

export interface AttentionBoardProps {
  rows: MergedAttentionRow[];
  approvalCount: number;
  loadingApprovals: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
  onNavigate: NavigateFunction;
}

export function AttentionBoard({
  rows, approvalCount, loadingApprovals, showAll, onToggleShowAll, onNavigate,
}: AttentionBoardProps) {
  const [approvalOnly, setApprovalOnly] = useState(false);
  const filtered = approvalOnly ? rows.filter(r => r.source === 'approval') : rows;
  const visible = showAll ? filtered : filtered.slice(0, ATTENTION_RAIL_LIMIT);
  const canToggle = filtered.length > ATTENTION_RAIL_LIMIT;
  // Verdict §c: at 1024 (stacked, full-width) the list breaks into 2 columns
  // once it holds more than 5 items. The CSS only applies that below 1280,
  // where the rail spans the full page width.
  const twoCol = filtered.length > 5;

  return (
    <section
      className="d-card d-card-border bg-base-100 wf-card wf-priority-board wf-bento-third wf-rail"
      data-tour-id="dashboard-attention"
      aria-labelledby="dashboard-priority-title"
    >
      <div className="wf-card-h">
        <div className="wf-todo-head">
          <h2 className="ttl" id="dashboard-priority-title">Việc cần xử lý</h2>
          {rows.length > 0 && (
            <span className="wf-todo-count" title={`${rows.length} mục đang chờ`}>{rows.length}</span>
          )}
          {approvalCount > 0 && (
            <button
              type="button"
              className={`wf-todo-chip${approvalOnly ? ' is-on' : ''}`}
              aria-pressed={approvalOnly}
              title="Chỉ hiện mục cần duyệt"
              onClick={() => setApprovalOnly(value => !value)}
            >
              Duyệt · {approvalCount}
            </button>
          )}
        </div>
        {loadingApprovals && rows.length === 0 ? (
          <span className="wf-todo-loading">Đang tải…</span>
        ) : canToggle && (
          <button
            type="button"
            className="d-btn d-btn-link d-btn-sm wf-link"
            aria-expanded={showAll}
            aria-controls="dashboard-priority-list"
            onClick={onToggleShowAll}
          >
            {showAll ? (
              <>Thu gọn <ChevronUp aria-hidden="true" /></>
            ) : (
              <>Xem tất cả <ChevronRight aria-hidden="true" /></>
            )}
          </button>
        )}
      </div>
      <div className={`body wf-todo-list${twoCol ? ' is-two-col' : ''}`} id="dashboard-priority-list">
        {visible.map(row => (
          <TodoRow key={row.key} row={row} onNavigate={onNavigate} />
        ))}
        {visible.length === 0 && (
          <div className="wf-todo-empty">Không có việc nào trong nhóm này.</div>
        )}
        {canToggle && showAll && (
          <div className="wf-todo-more">
            <button
              type="button"
              className="d-btn d-btn-link d-btn-sm wf-link"
              aria-expanded
              aria-controls="dashboard-priority-list"
              onClick={onToggleShowAll}
            >
              Thu gọn <ChevronUp aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function TodoRow({ row, onNavigate }: { row: MergedAttentionRow; onNavigate: NavigateFunction }) {
  const isApproval = row.source === 'approval';
  const decision = row.decision;
  const approval = row.approval;
  const title = isApproval ? approval!.title : decision!.title;
  const meta = isApproval
    ? [
        APPROVAL_TYPE_LABEL[approval!.type],
        approval!.subtitle,
        `${fmtVN(approval!.amount)} ₫`,
      ].filter(Boolean).join(' · ')
    : (decision!.subtitle || '');
  // Approvals keep their blue "Duyệt" identity (verdict §d); decisions tint
  // by severity: đỏ / amber / blue / green.
  const tone = isApproval ? 'approval' : decision!.severity;
  const Icon = isApproval ? ClipboardCheck : (DECISION_ICON[decision!.kind] ?? AlertTriangle);
  const route = isApproval ? approval!.href : decision!.route;

  const open = () => {
    if (route) onNavigate(route);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`wf-todo wf-todo--${tone}`}
      onClick={open}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && route) {
          e.preventDefault();
          open();
        }
      }}
      aria-label={meta ? `${title}. ${meta}` : title}
    >
      <span className="wf-todo__ic" aria-hidden="true"><Icon size={16} strokeWidth={2.2} /></span>
      <span className="wf-todo__tx">
        <span className="wf-todo__t" title={title}>{title}</span>
        {meta && <span className="wf-todo__m" title={meta}>{meta}</span>}
      </span>
      {isApproval && approval!.type === 'advances' && <QuickApproveTick item={approval!} />}
      <ChevronRight size={16} strokeWidth={2.2} className="wf-todo__chev" aria-hidden="true" />
    </div>
  );
}

/** One-tick approval for advance requests — the only approval type the
 *  backend lets you action without opening the detail (settlements need the
 *  accountant's container review first). Carried over from the old
 *  ApprovalQueueCard when the two lists merged (NEPO-25). */
function QuickApproveTick({ item }: { item: ApprovalQueueItem }) {
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickApprove = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();   // don't trigger row navigation
    e.preventDefault();
    if (approving) return;

    const [, numericIdStr] = item.id.split(':');
    const numericId = Number(numericIdStr);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError('ID không hợp lệ');
      return;
    }

    setApproving(true);
    setError(null);
    try {
      await forwarderClient.approveAdvanceRequest(numericId);
      // Refresh the queue so the approved item disappears / moves.
      await queryClient.invalidateQueries({ queryKey: qk.dashboard.approvalQueue(undefined, undefined) });
      // Also refresh the underlying data sources that the approve just changed.
      queryClient.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi duyệt');
    } finally {
      setApproving(false);
    }
  };

  return (
    <button
      type="button"
      className="wf-todo__tick"
      onClick={handleQuickApprove}
      disabled={approving}
      title={error ? `Lỗi: ${error}` : 'Duyệt tạm ứng'}
      aria-label="Duyệt tạm ứng"
    >
      {approving ? <Loader2 size={14} className="spin" /> : <Check size={14} strokeWidth={2.6} />}
    </button>
  );
}
