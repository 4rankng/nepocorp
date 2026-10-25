// Pure merge/sort for the NEPO-25 "Việc cần xử lý" rail (consult verdict,
// deepseek 25/10): the decision board and the approval queue collapse into
// ONE list — two separate action surfaces for the same to-dos read as
// duplication and split the operator's attention.
//
// Sort contract (verdict §c/§d): severity first, then time. Decisions carry
// no timestamp, so inside a severity band they keep their backend priority;
// approvals sort oldest-pending first (money waiting the longest surfaces
// before the fresh requests).

import type { DashboardDecisionItem } from '@tingting/shared';
import type { ApprovalQueueItem } from '../hooks/useApprovalQueue';

export type AttentionSource = 'decision' | 'approval';

export interface MergedAttentionRow {
  key: string;
  source: AttentionSource;
  /** Higher sorts first: critical/urgent-approval 3 · warning/normal-approval 2 · info 1 · success 0. */
  rank: number;
  /** Tiebreak inside a rank for decisions (backend priority). */
  priority: number;
  /** Tiebreak inside a rank for approvals (epoch ms of requestedAt). */
  timeKey: number;
  decision?: DashboardDecisionItem;
  approval?: ApprovalQueueItem;
}

const DECISION_RANK: Record<DashboardDecisionItem['severity'], number> = {
  critical: 3,
  warning: 2,
  info: 1,
  success: 0,
};

export function mergeAttentionRows(
  decisions: DashboardDecisionItem[],
  approvals: ApprovalQueueItem[],
): MergedAttentionRow[] {
  const rows: MergedAttentionRow[] = [
    ...decisions.map((decision) => ({
      key: `decision:${decision.id}`,
      source: 'decision' as const,
      rank: DECISION_RANK[decision.severity] ?? 1,
      priority: decision.priority ?? 0,
      timeKey: 0,
      decision,
    })),
    ...approvals.map((approval) => ({
      key: `approval:${approval.id}`,
      source: 'approval' as const,
      // A pending approval is at least "Cần xử lý"; urgent money (over
      // threshold from the backend) jumps into the Gấp band.
      rank: approval.severity === 'urgent' ? 3 : 2,
      priority: 0,
      timeKey: Date.parse(approval.requestedAt) || 0,
      approval,
    })),
  ];
  return rows.sort((a, b) =>
    b.rank - a.rank
    || b.priority - a.priority
    // Everything else equal, decisions before approvals: the decision list
    // aggregates whole portfolios (nợ quá hạn tổng) over single requests.
    || (a.source === b.source ? 0 : a.source === 'decision' ? -1 : 1)
    || a.timeKey - b.timeKey
    || a.key.localeCompare(b.key),
  );
}
