import { useMemo, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { usePageAnimations } from '../hooks/animations';
import { formatNumber } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { canApproveSettlement, canDeleteSettlement } from '../features/advances/settlementPermissions';
import { AdvanceBalanceNote } from '../features/advances/AdvanceBalanceNote';
import { AdvanceSettlementStatus } from '@tingting/shared';
import { PageHeader, Toolbar, FilterPill } from '../components/UI';
import {
  useAdminSettlements,
  useAdminAdvanceBalances,
  useRejectSettlement,
  useApproveSettlement,
  useDeleteSettlement,
  pendingAction,
} from '../hooks/useForwarderQueries';
import { useFocusDeepLink } from '../hooks/useFocusDeepLink';
import { useMonth } from '../hooks/useMonth';
import { getCalendarMonthRange } from '../lib/calendar-month';
import { TABS, type StatusFilter } from '../features/advances/settlementLedgerView';
import { AsKPI } from '../features/advances/settlementKpi';
import {
  SettlementGridRow,
  SettlementMobileCard,
  type Settlement,
  type SettlementActions,
} from './admin-advance-settlement-rows';
import './AdminAdvanceSettlementsPage.css';

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function AdminAdvanceSettlementsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const { month, year } = useMonth();
  const monthRange = getCalendarMonthRange(year, month);
  const periodFilters = { dateFrom: monthRange.start, dateTo: monthRange.end };

  // Fetch ALL settlements once — client-side filtering for accurate counts/totals
  const { data, isLoading, error: queryError, refetch } = useAdminSettlements(periodFilters);
  const { data: balancesData } = useAdminAdvanceBalances();
  const { rootRef } = usePageAnimations({ ready: !isLoading });
  const rejectMutation = useRejectSettlement();
  const approveMutation = useApproveSettlement();
  const deleteMutation = useDeleteSettlement();
  // Same guard as the advance-request ledger: a hook that returns nothing must
  // not blank the route (kanban 101026101500). Approval still wins.
  const { pendingId, pendingKind } = pendingAction([
    { kind: 'approve', mutation: approveMutation },
    { kind: 'reject', mutation: rejectMutation },
    { kind: 'delete', mutation: deleteMutation },
  ]);
  const settlementActions: SettlementActions = {
    pendingId,
    pendingKind,
    onApprove: (id: number) => approveMutation.mutate(id),
    onReject: (id: number) => rejectMutation.mutate(id),
    onDelete: (id: number) => deleteMutation.mutate(id),
  };
  const { user } = useAuth();
  const canApproveReject = canApproveSettlement(user?.role);
  // Removal is a separate right from approval: a MANAGER signs a phiếu off but
  // cannot rewrite it — and must still be able to throw one away
  // (kanban 101026154020). The row folds in the PENDING-only status rule.
  const canDelete = canDeleteSettlement(user?.role);

  const allSettlements: Settlement[] = useMemo(
    () => (data?.items ?? []) as Settlement[],
    [data],
  );
  /* ── Focus deep-link: scroll to item from ?focus=<id> ──────────────── */
  // Called for its side effect (scrolling to the focused item); return value unused.
  useFocusDeepLink('as');

  /* ── Derived counts & totals ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      total: 0,
      [AdvanceSettlementStatus.PENDING]: 0,
      [AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT]: 0,
      [AdvanceSettlementStatus.APPROVED]: 0,
      [AdvanceSettlementStatus.REJECTED]: 0,
    };
    const totals: Record<string, number> = {
      [AdvanceSettlementStatus.PENDING]: 0,
      [AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT]: 0,
      [AdvanceSettlementStatus.APPROVED]: 0,
    };

    for (const s of allSettlements) {
      counts.total++;
      const st = s.status as string;
      if (st in counts) counts[st]++;
      const amt = Number(s.totalExpenseAmount) || 0;
      if (st in totals) totals[st] += amt;
    }
    return { counts, totals };
  }, [allSettlements]);

  const filtered = useMemo(() => {
    if (!statusFilter) return allSettlements;
    if (statusFilter === AdvanceSettlementStatus.PENDING) {
      return allSettlements.filter((s) =>
        s.status === AdvanceSettlementStatus.PENDING ||
        s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT,
      );
    }
    return allSettlements.filter((s) => s.status === statusFilter);
  }, [allSettlements, statusFilter]);

  /* ── Tab counts ──────────────────────────────────────────────────────── */
  const tabCounts = useMemo(() => ({
    '': stats.counts.total,
    [AdvanceSettlementStatus.PENDING]: stats.counts.PENDING + stats.counts.CHECKED_BY_ACCOUNTANT,
    [AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT]: stats.counts.CHECKED_BY_ACCOUNTANT,
    [AdvanceSettlementStatus.APPROVED]: stats.counts.APPROVED,
    [AdvanceSettlementStatus.REJECTED]: stats.counts.REJECTED,
  }), [stats]);

  if (queryError) {
    return (
      <div className="as-page">
        <PageHeader title="Duyệt hoàn ứng" />
        <div className="empty-state" role="alert">
          <h3>Không thể tải danh sách</h3>
          <p>Vui lòng thử lại để xem đúng dữ liệu tạm ứng và hoàn ứng.</p>
          <button type="button" className="btn btn--secondary" onClick={() => void refetch()}>Thử lại</button>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div ref={rootRef} className="as-page">
      <PageHeader
        title="Duyệt hoàn ứng"
        iconName="settlement"
        description="Kiểm tra và duyệt phiếu thanh toán tạm ứng của giao nhận"
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="as-kpi-row">
        <AsKPI
          label="Chờ xử lý"
          value={stats.counts.PENDING + stats.counts.CHECKED_BY_ACCOUNTANT}
          meta={`${formatNumber(stats.totals.PENDING + stats.totals.CHECKED_BY_ACCOUNTANT)} ₫`}
          variant="warn"
          iconName="settlement"
          active={statusFilter === AdvanceSettlementStatus.PENDING}
          hasItems={stats.counts.PENDING + stats.counts.CHECKED_BY_ACCOUNTANT > 0}
          onClick={() => setStatusFilter(statusFilter === AdvanceSettlementStatus.PENDING ? '' : AdvanceSettlementStatus.PENDING)}
        />
        <AsKPI
          label="Đã duyệt"
          value={stats.counts.APPROVED}
          meta={`${formatNumber(stats.totals.APPROVED)} ₫`}
          variant="success"
          iconName="paid"
          active={statusFilter === AdvanceSettlementStatus.APPROVED}
          onClick={() => setStatusFilter(statusFilter === AdvanceSettlementStatus.APPROVED ? '' : AdvanceSettlementStatus.APPROVED)}
        />
        <AsKPI
          label="Tồn tạm ứng"
          value={balancesData?.items.length ?? 0}
          meta={`${formatNumber(balancesData ? Number(balancesData.totalOutstanding) : 0)} ₫`}
          variant="warn"
          iconName="advances"
          hasItems={(balancesData?.items.length ?? 0) > 0}
        />
      </div>
      <AdvanceBalanceNote figures={balancesData} />

      {/* ── Card wrapper ──────────────────────────────────────────────── */}
      <div className="as-panel">
        {/* Filter tabs */}
        <Toolbar>
          {TABS.map((tab) => (
            <FilterPill
              key={tab.key}
              active={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
              count={tabCounts[tab.key]}
            >
              {tab.label}
            </FilterPill>
          ))}
        </Toolbar>

        {isLoading ? (
          <div className="as-loading">
            <Loader2 size={24} className="spin" style={{ color: 'var(--ink-3)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="as-empty">
            <FileText size={40} style={{ color: 'var(--ink-4)', marginBottom: 8 }} />
            <div className="as-empty-text">Không có phiếu hoàn ứng nào</div>
            <div className="as-empty-hint">Giao nhận có thể lập phiếu thanh toán từ ứng dụng</div>
          </div>
        ) : (
          <>
            {/* Desktop: one scroll region keeps every column reachable. */}
            <div
              className="as-ledger-scroll"
              role="region"
              aria-label="Danh sách phiếu hoàn ứng"
              tabIndex={0}
            >
              <div className="as-ledger">
                <div className="as-grid-head">
                  <div>Ngày / Khách hàng</div>
                  <div>Kế hoạch / Phiếu</div>
                  <div className="col-center">Số cont</div>
                  <div>Tuyến đường</div>
                  <div>Chi phí theo hạng mục</div>
                  <div className="col-right">Tổng chi</div>
                  <div>Trạng thái</div>
                </div>

                <div>
                  {filtered.map((s) => (
                    <SettlementGridRow
                      key={s.id}
                      s={s}
                      actions={settlementActions}
                      focusId={`as-${s.id}`}
                      canApproveReject={canApproveReject}
                      canDelete={canDelete}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: stacked cards */}
            <div className="as-cards">
              {filtered.map((s) => (
                <SettlementMobileCard
                  key={s.id}
                  s={s}
                  actions={settlementActions}
                  focusId={`as-${s.id}`}
                  canApproveReject={canApproveReject}
                  canDelete={canDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="as-footer">
          {`${filtered.length} phiếu hoàn ứng`}
        </div>
      )}
    </div>
  );
}
