import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, FileText, Pencil, XCircle } from 'lucide-react';
import { usePageAnimations } from '../hooks/animations';
import { formatNumber, formatDate } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import {
  ADVANCE_SETTLEMENT_STATUS_LABELS,
  AdvanceSettlementStatus,
  Role,
} from '@tingting/shared';
import type { AdvanceSettlementWithRefs } from '@tingting/shared';
import { PageHeader, StatusPill, Toolbar, FilterPill } from '../components/UI';
import { AssetIcon, type AssetIconName } from '../components/AssetIcon';
import { StatusStrip } from '../components/shared/StatusStrip';
import { Money } from '../components/shared/Money';
import {
  useAdminSettlements,
  useAdminSettlementOpsCompletion,
  useAdminAdvanceBalances,
  useRejectSettlement,
} from '../hooks/useForwarderQueries';
import { advanceSettlementStatusVariant } from '../lib/status-variants';
import { useFocusDeepLink } from '../hooks/useFocusDeepLink';
import { summarizeSettlementExpenses } from './admin-advance-settlement-summary';
import './AdminAdvanceSettlementsPage.css';

/* ── Types ─────────────────────────────────────────────────────────────── */

type Settlement = AdvanceSettlementWithRefs;
type OpsCompletion = NonNullable<AdvanceSettlementWithRefs['opsCompletion']>;

type StatusFilter = '' | AdvanceSettlementStatus;

const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: AdvanceSettlementStatus.PENDING, label: 'Chờ xử lý' },
  { key: AdvanceSettlementStatus.APPROVED, label: 'Đã duyệt' },
  { key: AdvanceSettlementStatus.REJECTED, label: 'Từ chối' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CHECKED_BY_ACCOUNTANT: '#2563EB',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
};

function settlementStatusLabel(status: AdvanceSettlementStatus): string {
  return status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT
    ? 'Chờ xử lý'
    : ADVANCE_SETTLEMENT_STATUS_LABELS[status];
}

export function OpsCompletionSummary({
  summary,
  loading,
  failed,
}: {
  summary?: OpsCompletion;
  loading: boolean;
  failed: boolean;
}) {
  if (loading) return <span className="as-ops-state">Đang tải tiến độ Ops…</span>;
  if (failed) return <span className="as-ops-state as-ops-state--error">Không tải được tiến độ Ops</span>;
  if (!summary || summary.tripCount === 0) return <span className="as-ops-state">Chưa có phạm vi Ops liên kết</span>;
  return (
    <div className="as-ops">
      <strong>{summary.completedGroupCount}/{summary.totalGroupCount} nhóm đã kê xong</strong>
      {summary.trips.map((trip) => (
        <div className="as-ops__trip" key={trip.tripId}>
          <span className="as-ops__trip-label">{trip.tripCode || `Chuyến ${trip.tripId}`} · {trip.completedGroupCount}/{trip.totalGroupCount}</span>
          <div className="as-ops__groups">
            {trip.groups.map((group) => (
              <span
                key={group.tripContainerId ?? 'general'}
                className={`as-ops__group as-ops__group--${group.status === 'COMPLETED' ? 'done' : 'pending'}`}
                title={`${group.expenseCount} khoản chi`}
              >
                {group.containerNumber || 'Chi phí chung'} · {group.status === 'COMPLETED' ? 'Đã kê xong' : 'Đang kê'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Compact KPI card — mirrors AdminAdvancesPage .adv-kpi proportions ── */

interface AsKPIProps {
  label: string;
  value: number;
  meta: string;
  variant: 'warn' | 'info' | 'success' | 'danger';
  iconName: AssetIconName;
  active?: boolean;
  hasItems?: boolean;
  // Omit onClick for a summary-only stat (no filter to toggle). Renders as a
  // non-interactive element instead of a dead role="button" in the tab order.
  onClick?: () => void;
}

function AsKPI({ label, value, meta, variant, iconName, active = false, hasItems = false, onClick }: AsKPIProps) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      className={`as-kpi as-kpi--${variant}${active ? ' is-active' : ''}${hasItems ? ' has-items' : ''}${interactive ? '' : ' as-kpi--static'}`}
      {...(interactive
        ? { onClick, role: 'button', tabIndex: 0, onKeyDown: (e: import('react').KeyboardEvent) => e.key === 'Enter' && onClick() }
        : {})}
    >
      <div className="as-kpi__label">{label}</div>
      <div className="as-kpi__value">{value}</div>
      <div className="as-kpi__meta">{meta}</div>
      <AssetIcon name={iconName} size={58} className="as-kpi__asset" />
    </div>
  );
}

/* ── Desktop grid row ──────────────────────────────────────────────────── */

function SettlementGridRow({
  s,
  rejectMutation,
  focusId,
  canApproveReject,
  opsLoading,
  opsFailed,
}: {
  s: Settlement;
  rejectMutation: ReturnType<typeof useRejectSettlement>;
  focusId?: string;
  canApproveReject: boolean;
  opsLoading: boolean;
  opsFailed: boolean;
}) {
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === s.id;
  const canAct = s.status === AdvanceSettlementStatus.PENDING || s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT;
  const scope = summarizeSettlementExpenses(s.linkedExpenses);

  return (
    <div className="as-grid-row" id={focusId} style={{ position: 'relative', overflow: 'hidden' }}>
      <StatusStrip color={STATUS_COLORS[s.status]} />
      {/* Settlement identity */}
      <div className="as-record">
        <Link to={`/settlements/${s.id}`} className="as-code-link">{s.code}</Link>
        <span className="as-record__forwarder">
          {s.forwarderName || 'Chưa có tên giao nhận'}
        </span>
      </div>

      {/* Linked payment scope */}
      <div className="as-scope">
        <span className="as-scope__primary">
          {scope.expenseCount} khoản chi liên kết
        </span>
        <span className="as-scope__secondary">
          {scope.expenseCount === 0
            ? 'Chưa có chuyến / container'
            : `${scope.tripCount} chuyến · ${scope.containerCount} container`}
        </span>
        <OpsCompletionSummary summary={s.opsCompletion} loading={opsLoading} failed={opsFailed} />
      </div>

      {/* Expense */}
      <div className="as-amount">
        <Money value={Number(s.totalExpenseAmount)} />
      </div>

      {/* Refund */}
      <div className="as-refund">
        {Number(s.refundAmount) > 0 ? <Money value={Number(s.refundAmount)} /> : '—'}
      </div>

      {/* Date */}
      <div className="as-date">
        {formatDate(s.createdAt)}
      </div>

      {/* Status */}
      <div>
        <StatusPill variant={advanceSettlementStatusVariant(s.status)}>
          {settlementStatusLabel(s.status)}
        </StatusPill>
      </div>

      {/* Actions / Approver */}
      <div className={`as-actions${canAct ? '' : ' as-actions--history'}`}>
        {canAct ? (
          <>
            <Link
              className="as-row-action"
              to={`/settlements/${s.id}`}
              aria-label={`${canApproveReject ? 'Kiểm tra' : 'Xem'} ${s.code}`}
            >
              {canApproveReject && <Pencil size={15} aria-hidden="true" />}
              {canApproveReject ? 'Kiểm tra' : 'Xem phiếu'}
            </Link>
            {canApproveReject && (
              <button
                className="as-reject-action"
                onClick={() => rejectMutation.mutate(s.id)}
                disabled={isRejecting}
                title="Từ chối hoàn ứng"
                aria-label={`Từ chối hoàn ứng ${s.code}`}
              >
                {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
              </button>
            )}
          </>
        ) : (
          <>
            <Link className="as-row-action as-row-action--quiet" to={`/settlements/${s.id}`}>
              Xem phiếu
            </Link>
            {(s.approverName || s.checkerName) && (
              <div className="as-approver">
                {s.approverName ? <>Duyệt bởi <strong>{s.approverName}</strong></> : <>KT <strong>{s.checkerName}</strong></>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Mobile card ───────────────────────────────────────────────────────── */

function SettlementMobileCard({
  s,
  rejectMutation,
  focusId,
  canApproveReject,
  opsLoading,
  opsFailed,
}: {
  s: Settlement;
  rejectMutation: ReturnType<typeof useRejectSettlement>;
  focusId?: string;
  canApproveReject: boolean;
  opsLoading: boolean;
  opsFailed: boolean;
}) {
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === s.id;
  const canAct = s.status === AdvanceSettlementStatus.PENDING || s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT;
  const scope = summarizeSettlementExpenses(s.linkedExpenses);

  return (
    <div className="as-mcard" id={focusId} style={{ position: 'relative', overflow: 'hidden' }}>
      <StatusStrip color={STATUS_COLORS[s.status]} />
      {/* Top: code + forwarder + status */}
      <div className="as-mcard__top">
        <div className="as-mcard__left">
          <div className="as-mcard__avatar">
            <FileText size={16} />
          </div>
          <div className="as-mcard__head">
            <Link to={`/settlements/${s.id}`} className="as-mcard__code">{s.code}</Link>
            <span className="as-mcard__name">
              {s.forwarderName || 'Chưa có tên giao nhận'}
            </span>
          </div>
        </div>
        <StatusPill variant={advanceSettlementStatusVariant(s.status)}>
          {settlementStatusLabel(s.status)}
        </StatusPill>
      </div>

      {/* Amounts */}
      <div className="as-mcard__amounts">
        <div className="as-mcard__amount-row">
          <span className="as-mcard__meta-label">Chi phí</span>
          <span className="as-mcard__amount-value"><Money value={Number(s.totalExpenseAmount)} /></span>
        </div>
        {Number(s.refundAmount) > 0 && (
          <div className="as-mcard__amount-row">
            <span className="as-mcard__meta-label">Hoàn lại</span>
            <span className="as-mcard__amount-value"><Money value={Number(s.refundAmount)} /></span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="as-mcard__meta">
        <div className="as-mcard__meta-row">
          <span className="as-mcard__meta-label">Phạm vi</span>
          <span className="as-mcard__meta-value">{scope.label}</span>
        </div>
        <div className="as-mcard__meta-row">
          <span className="as-mcard__meta-label">Ngày lập</span>
          <span className="as-mcard__meta-value">{formatDate(s.createdAt)}</span>
        </div>
      </div>
      <OpsCompletionSummary summary={s.opsCompletion} loading={opsLoading} failed={opsFailed} />
      {/* Actions */}
      {canAct ? (
        <div className="as-mcard__actions">
          {canApproveReject && (
            <Link className="btn btn--primary" to={`/settlements/${s.id}`}>
              <Pencil size={16} /> Sửa và hoàn tất
            </Link>
          )}
          {canApproveReject && (
            <button
              className="btn btn--danger"
              onClick={() => rejectMutation.mutate(s.id)}
              disabled={isRejecting}
            >
              {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
              Từ chối
            </button>
          )}
        </div>
      ) : (s.approverName || s.checkerName) ? (
        <div className="as-mcard__meta-row" style={{ marginTop: 4 }}>
          <span className="as-mcard__meta-label">{s.approverName ? 'Duyệt bởi' : 'KT kiểm tra'}</span>
          <span className="as-mcard__meta-value" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {s.approverName ?? s.checkerName}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function AdminAdvanceSettlementsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // Fetch ALL settlements once — client-side filtering for accurate counts/totals
  const { data, isLoading } = useAdminSettlements();
  const { data: balancesData } = useAdminAdvanceBalances();
  const { rootRef } = usePageAnimations({ ready: !isLoading });
  const rejectMutation = useRejectSettlement();
  const { user } = useAuth();
  const canApproveReject = user?.role === Role.ADMIN || user?.role === Role.ACCOUNTANT;

  const allSettlements: Settlement[] = useMemo(
    () => (data?.items ?? []) as Settlement[],
    [data],
  );
  const settlementIds = useMemo(
    () => allSettlements.map((settlement) => settlement.id).sort((left, right) => left - right),
    [allSettlements],
  );
  const {
    data: opsCompletionData,
    isLoading: opsCompletionLoading,
    isError: opsCompletionFailed,
  } = useAdminSettlementOpsCompletion(settlementIds);
  const settlementsWithOps = useMemo(() => {
    const bySettlementId = new Map(
      (opsCompletionData?.items ?? []).map((item) => [item.settlementId, item.opsCompletion]),
    );
    return allSettlements.map((settlement) => ({
      ...settlement,
      opsCompletion: bySettlementId.get(settlement.id),
    }));
  }, [allSettlements, opsCompletionData]);
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
    if (!statusFilter) return settlementsWithOps;
    if (statusFilter === AdvanceSettlementStatus.PENDING) {
      return settlementsWithOps.filter((s) =>
        s.status === AdvanceSettlementStatus.PENDING ||
        s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT,
      );
    }
    return settlementsWithOps.filter((s) => s.status === statusFilter);
  }, [settlementsWithOps, statusFilter]);

  /* ── Tab counts ──────────────────────────────────────────────────────── */
  const tabCounts = useMemo(() => ({
    '': stats.counts.total,
    [AdvanceSettlementStatus.PENDING]: stats.counts.PENDING + stats.counts.CHECKED_BY_ACCOUNTANT,
    [AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT]: stats.counts.CHECKED_BY_ACCOUNTANT,
    [AdvanceSettlementStatus.APPROVED]: stats.counts.APPROVED,
    [AdvanceSettlementStatus.REJECTED]: stats.counts.REJECTED,
  }), [stats]);

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
                  <div>Phiếu / Giao nhận</div>
                  <div>Phạm vi liên kết</div>
                  <div className="col-right">Chi phí</div>
                  <div className="col-right">Hoàn lại</div>
                  <div className="col-center">Ngày lập</div>
                  <div>Trạng thái</div>
                  <div className="col-right">Thao tác</div>
                </div>

                <div>
                  {filtered.map((s) => (
                    <SettlementGridRow
                      key={s.id}
                      s={s}
                      rejectMutation={rejectMutation}
                      focusId={`as-${s.id}`}
                      canApproveReject={canApproveReject}
                      opsLoading={opsCompletionLoading}
                      opsFailed={opsCompletionFailed}
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
                  rejectMutation={rejectMutation}
                  focusId={`as-${s.id}`}
                  canApproveReject={canApproveReject}
                  opsLoading={opsCompletionLoading}
                  opsFailed={opsCompletionFailed}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="as-footer">
          {filtered.length} phiếu hoàn ứng
        </div>
      )}
    </div>
  );
}
