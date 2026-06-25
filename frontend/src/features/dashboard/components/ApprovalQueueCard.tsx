import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NavigateFunction } from 'react-router-dom';
import { Receipt, Wallet, CheckCircle2, FileCheck2, ChevronRight, Check, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { tripClient } from '../../../api/tripClient';
import { forwarderClient } from '../../../api/forwarderClient';
import type { ApprovalItemType, ApprovalQueueItem, ApprovalQueueResponse } from '../hooks/useApprovalQueue';
import { qk } from '../../../api/keys';
import { resolveEmptyIllustration } from '../../../lib/emptyIllustrations';

const TYPE_LABEL: Partial<Record<ApprovalItemType, string>> = {
  ancillaryFees: 'Phí phụ trợ',
  advances: 'Tạm ứng',
  advanceSettlementsCheck: 'Phiếu thanh toán — kiểm tra',
  advanceSettlementsApprove: 'Phiếu thanh toán — duyệt',
};

const TYPE_ICON: Partial<Record<ApprovalItemType, React.ReactNode>> = {
  ancillaryFees: <Receipt size={14} strokeWidth={2.2} />,
  advances: <Wallet size={14} strokeWidth={2.2} />,
  advanceSettlementsCheck: <FileCheck2 size={14} strokeWidth={2.2} />,
  advanceSettlementsApprove: <CheckCircle2 size={14} strokeWidth={2.2} />,
};

const TYPE_ICON_CLASS: Partial<Record<ApprovalItemType, string>> = {
  ancillaryFees: 'approval-queue__ic--amber',
  advances: 'approval-queue__ic--green',
  advanceSettlementsCheck: 'approval-queue__ic--blue',
  advanceSettlementsApprove: 'approval-queue__ic--green',
};

const fmtVN = (n: number) => Math.round(n).toLocaleString('vi-VN');

const GROUP_ORDER: ApprovalItemType[] = [
  'ancillaryFees',
  'advances',
  'advanceSettlementsCheck',
  'advanceSettlementsApprove',
];

// Tooltip text per type — explains what the tick button does.
const QUICK_ACTION_LABEL: Partial<Record<ApprovalItemType, string>> = {
  ancillaryFees: 'Duyệt phụ phí',
  advances: 'Duyệt tạm ứng',
  advanceSettlementsCheck: 'Kiểm tra phiếu',
  advanceSettlementsApprove: 'Duyệt phiếu thanh toán',
};

interface Props {
  data: ApprovalQueueResponse | undefined;
  loading: boolean;
  navigate: NavigateFunction;
}

export function ApprovalQueueCard({ data, loading, navigate }: Props) {
  const items = useMemo(
    () => (data?.items ?? []).filter(item => item.type !== 'debtOffsets'),
    [data?.items],
  );
  const total = items.length;
  const groupedView = items.length > 5;

  // Single-pass groupBy instead of O(n*k) filter per type
  const grouped = useMemo(() => {
    const map = new Map<ApprovalItemType, ApprovalQueueItem[]>();
    for (const item of items) {
      const group = map.get(item.type) ?? [];
      group.push(item);
      map.set(item.type, group);
    }
    return map;
  }, [items]);

  return (
    <div className="wf-card approval-queue">
      <div className="wf-card-h">
        <div>
          <div className="ttl">Cần duyệt</div>
          <div className="sub">
            {loading ? 'Đang tải…' : total > 0 ? `${total} mục đang chờ` : 'Đã xử lý hết'}
          </div>
        </div>
        {total > 0 && <span className="approval-queue__count">{total}</span>}
      </div>

      {total === 0 ? (
        <div className="approval-queue__empty">
          <img
            src={resolveEmptyIllustration('empty-audit')}
            alt=""
            className="approval-queue__empty-art"
            aria-hidden
          />
          <div className="approval-queue__empty-title">Không có gì cần duyệt</div>
          <div className="approval-queue__empty-sub">Bạn đã xử lý hết.</div>
        </div>
      ) : groupedView ? (
        <div className="approval-queue__body">
          {GROUP_ORDER.map(type => {
            const rows = grouped.get(type);
            if (!rows || rows.length === 0) return null;
            return (
              <React.Fragment key={type}>
                <div className="approval-queue__group-head">{TYPE_LABEL[type]}</div>
                {rows.map(item => (
                  <Row key={item.id} item={item} navigate={navigate} showTypeLabel={false} />
                ))}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div className="approval-queue__body">
          {items.map(item => (
            <Row key={item.id} item={item} navigate={navigate} showTypeLabel />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  navigate,
  showTypeLabel,
}: {
  item: ApprovalQueueItem;
  navigate: NavigateFunction;
  showTypeLabel: boolean;
}) {
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRowClick = () => {
    if (!approving) navigate(item.href);
  };

  const handleRowKey = (e: React.KeyboardEvent) => {
    if (approving) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(item.href);
    }
  };

  // Quick-approve / quick-check the item. The id format is "type:numericId"
  // (e.g. "ancillaryFees:42"). For ancillaryFees we also need tripId, which
  // is encoded in the href as "/trips/{tripId}#fees".
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
      switch (item.type) {
        case 'ancillaryFees': {
          // href: /trips/{tripId}#fees
          const m = item.href.match(/\/trips\/(\d+)/);
          const tripId = m ? Number(m[1]) : NaN;
          if (!tripId) throw new Error('Không tìm thấy tripId');
          await tripClient.approveTripExpense(tripId, numericId);
          break;
        }
        case 'advances': {
          await forwarderClient.approveAdvanceRequest(numericId);
          break;
        }
        case 'advanceSettlementsCheck': {
          await forwarderClient.checkAdvanceSettlement(numericId);
          break;
        }
        case 'advanceSettlementsApprove': {
          await forwarderClient.approveAdvanceSettlement(numericId);
          break;
        }
        default:
          throw new Error('Loại mục chưa hỗ trợ quick-approve');
      }
      // Refresh the queue so the approved item disappears / moves.
      await queryClient.invalidateQueries({ queryKey: qk.dashboard.approvalQueue(undefined, undefined) });
      // Also refresh the underlying data sources that the approve just changed.
      queryClient.invalidateQueries({ queryKey: qk.tripForm.tripExpensesAll });
      queryClient.invalidateQueries({ queryKey: qk.forwarder.forwarderAdvanceRequestsAll });
      queryClient.invalidateQueries({ queryKey: qk.forwarder.settlements });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi duyệt');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`approval-queue__row${item.severity === 'urgent' ? ' is-urgent' : ''}${approving ? ' is-approving' : ''}`}
      onClick={handleRowClick}
      onKeyDown={handleRowKey}
      aria-label={item.title}
    >
      <span className={`approval-queue__ic ${TYPE_ICON_CLASS[item.type]}`}>
        {TYPE_ICON[item.type]}
      </span>
      <span className="approval-queue__tx">
        <span className="approval-queue__t" title={item.title}>{item.title}</span>
        <span className="approval-queue__s">
          {showTypeLabel && <span className="approval-queue__tag">{TYPE_LABEL[item.type]}</span>}
          <span>{item.subtitle}</span>
        </span>
      </span>
      <span className="approval-queue__amt">{fmtVN(item.amount)}<i>₫</i></span>
      {/* Quick-approve tick — does NOT navigate. The user clicks the row body
          to view the detail page. Disabled while in-flight to prevent double
          clicks. title attr shows the action label and any error. */}
      <button
        type="button"
        className="approval-queue__quick"
        onClick={handleQuickApprove}
        disabled={approving}
        title={error ? `Lỗi: ${error}` : QUICK_ACTION_LABEL[item.type]}
        aria-label={QUICK_ACTION_LABEL[item.type]}
      >
        {approving ? <Loader2 size={14} className="spin" /> : <Check size={14} strokeWidth={2.6} />}
      </button>
      <ChevronRight size={14} strokeWidth={2.2} className="approval-queue__caret" />
    </div>
  );
}
