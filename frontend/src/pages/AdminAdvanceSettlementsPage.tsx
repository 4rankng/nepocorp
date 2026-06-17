import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, FileText, CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react';
import { usePageAnimations } from '../hooks/animations';
import { formatCompact, formatDate } from '../lib/format';
import {
  ADVANCE_SETTLEMENT_STATUS_LABELS,
  AdvanceSettlementStatus,
} from '@tingting/shared';
import type { AdvanceSettlementWithRefs } from '@tingting/shared';
import { PageHeader, StatusPill, Toolbar, FilterPill } from '../components/UI';
import { StatusStrip } from '../components/shared/StatusStrip';
import { Money } from '../components/shared/Money';
import {
  useAdminSettlements,
  useAdminAdvanceBalances,
  useCheckSettlement,
  useApproveSettlement,
  useRejectSettlement,
} from '../hooks/useForwarderQueries';
import { advanceSettlementStatusVariant } from '../lib/status-variants';
import { useFocusDeepLink } from '../hooks/useFocusDeepLink';
import './AdminAdvanceSettlementsPage.css';

/* ── Types ─────────────────────────────────────────────────────────────── */

type Settlement = AdvanceSettlementWithRefs;

type StatusFilter = '' | AdvanceSettlementStatus;

const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: AdvanceSettlementStatus.PENDING, label: 'Chờ xử lý' },
  { key: AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT, label: 'KT đã kiểm tra' },
  { key: AdvanceSettlementStatus.APPROVED, label: 'Đã duyệt' },
  { key: AdvanceSettlementStatus.REJECTED, label: 'Từ chối' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CHECKED_BY_ACCOUNTANT: '#2563EB',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
};

/* ── Compact KPI card — mirrors AdminAdvancesPage .adv-kpi proportions ── */

interface AsKPIProps {
  label: string;
  value: number;
  meta: string;
  variant: 'warn' | 'info' | 'success' | 'danger';
  active?: boolean;
  hasItems?: boolean;
  onClick: () => void;
}

function AsKPI({ label, value, meta, variant, active = false, hasItems = false, onClick }: AsKPIProps) {
  return (
    <div
      className={`as-kpi as-kpi--${variant}${active ? ' is-active' : ''}${hasItems ? ' has-items' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="as-kpi__label">{label}</div>
      <div className="as-kpi__value">{value}</div>
      <div className="as-kpi__meta">{meta}</div>
    </div>
  );
}

/* ── Desktop grid row ──────────────────────────────────────────────────── */

function SettlementGridRow({
  s,
  checkMutation,
  approveMutation,
  rejectMutation,
  focusId,
}: {
  s: Settlement;
  checkMutation: ReturnType<typeof useCheckSettlement>;
  approveMutation: ReturnType<typeof useApproveSettlement>;
  rejectMutation: ReturnType<typeof useRejectSettlement>;
  focusId?: string;
}) {
  const isChecking = checkMutation.isPending && checkMutation.variables === s.id;
  const isApproving = approveMutation.isPending && approveMutation.variables === s.id;
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === s.id;
  const busy = isChecking || isApproving || isRejecting;

  const isPending = s.status === AdvanceSettlementStatus.PENDING;
  const isChecked = s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT;
  const canAct = isPending || isChecked;

  return (
    <div className="as-grid-row" id={focusId} style={{ position: 'relative', overflow: 'hidden' }}>
      <StatusStrip color={STATUS_COLORS[s.status]} />
      {/* Settlement code → links to print page */}
      <div className="as-code">
        <Link to={`/settlements/${s.id}`} className="as-code-link">{s.code}</Link>
      </div>

      {/* Forwarder */}
      <div className="as-forwarder">
        <div className="as-avatar">
          <FileText size={16} />
        </div>
        <span className="as-forwarder-name">
          {s.forwarderName || `Đối tác ${s.forwarderId}`}
        </span>
      </div>

      {/* Expense */}
      <div className="as-amount">
        <Money value={Number(s.totalExpenseAmount)} compact />
      </div>

      {/* Refund */}
      <div className="as-refund">
        {Number(s.refundAmount) > 0 ? <Money value={Number(s.refundAmount)} compact /> : '—'}
      </div>

      {/* Date */}
      <div className="as-date">
        {formatDate(s.createdAt)}
      </div>

      {/* Status */}
      <div>
        <StatusPill variant={advanceSettlementStatusVariant(s.status)}>
          {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status]}
        </StatusPill>
      </div>

      {/* Actions / Approver */}
      <div className="as-actions">
        {canAct ? (
          <>
            {isPending && (
              <button
                className="btn btn--ghost btn--icon btn--sm"
                onClick={() => checkMutation.mutate(s.id)}
                disabled={busy}
                title="Kế toán kiểm tra"
                style={{ color: 'var(--info, #2563EB)' }}
              >
                {isChecking ? <Loader2 size={16} className="spin" /> : <ClipboardCheck size={16} />}
              </button>
            )}
            {isChecked && (
              <button
                className="btn btn--ghost btn--icon btn--sm"
                onClick={() => approveMutation.mutate(s.id)}
                disabled={busy}
                title="Duyệt hoàn ứng"
                style={{ color: 'var(--success)' }}
              >
                {isApproving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              </button>
            )}
            <button
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => rejectMutation.mutate(s.id)}
              disabled={busy}
              title="Từ chối hoàn ứng"
              style={{ color: 'var(--danger)' }}
            >
              {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
            </button>
          </>
        ) : s.approverName || s.checkerName ? (
          <div className="as-approver">
            {s.approverName ? <>bởi <strong>{s.approverName}</strong></> : <>KT: <strong>{s.checkerName}</strong></>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Mobile card ───────────────────────────────────────────────────────── */

function SettlementMobileCard({
  s,
  checkMutation,
  approveMutation,
  rejectMutation,
  focusId,
}: {
  s: Settlement;
  checkMutation: ReturnType<typeof useCheckSettlement>;
  approveMutation: ReturnType<typeof useApproveSettlement>;
  rejectMutation: ReturnType<typeof useRejectSettlement>;
  focusId?: string;
}) {
  const isChecking = checkMutation.isPending && checkMutation.variables === s.id;
  const isApproving = approveMutation.isPending && approveMutation.variables === s.id;
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === s.id;
  const busy = isChecking || isApproving || isRejecting;

  const isPending = s.status === AdvanceSettlementStatus.PENDING;
  const isChecked = s.status === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT;
  const canAct = isPending || isChecked;

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
              {s.forwarderName || `Đối tác ${s.forwarderId}`}
            </span>
          </div>
        </div>
        <StatusPill variant={advanceSettlementStatusVariant(s.status)}>
          {ADVANCE_SETTLEMENT_STATUS_LABELS[s.status]}
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
          <span className="as-mcard__meta-label">Ngày lập</span>
          <span className="as-mcard__meta-value">{formatDate(s.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      {canAct ? (
        <div className="as-mcard__actions">
          {isPending && (
            <button
              className="btn btn--ghost"
              onClick={() => checkMutation.mutate(s.id)}
              disabled={busy}
            >
              {isChecking ? <Loader2 size={16} className="spin" /> : <ClipboardCheck size={16} />}
              Kiểm tra
            </button>
          )}
          {isChecked && (
            <button
              className="btn btn--primary"
              onClick={() => approveMutation.mutate(s.id)}
              disabled={busy}
            >
              {isApproving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              Duyệt
            </button>
          )}
          <button
            className="btn btn--danger"
            onClick={() => rejectMutation.mutate(s.id)}
            disabled={busy}
          >
            {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
            Từ chối
          </button>
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
  const checkMutation = useCheckSettlement();
  const approveMutation = useApproveSettlement();
  const rejectMutation = useRejectSettlement();

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
    return allSettlements.filter((s) => s.status === statusFilter);
  }, [allSettlements, statusFilter]);

  /* ── Tab counts ──────────────────────────────────────────────────────── */
  const tabCounts = useMemo(() => ({
    '': stats.counts.total,
    [AdvanceSettlementStatus.PENDING]: stats.counts.PENDING,
    [AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT]: stats.counts.CHECKED_BY_ACCOUNTANT,
    [AdvanceSettlementStatus.APPROVED]: stats.counts.APPROVED,
    [AdvanceSettlementStatus.REJECTED]: stats.counts.REJECTED,
  }), [stats]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div ref={rootRef} className="as-page">
      <PageHeader
        title="Duyệt hoàn ứng"
        description="Kiểm tra và duyệt phiếu thanh toán tạm ứng của giao nhận"
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="as-kpi-row">
        <AsKPI
          label="Chờ xử lý"
          value={stats.counts.PENDING}
          meta={`${formatCompact(stats.totals.PENDING)} ₫`}
          variant="warn"
          active={statusFilter === AdvanceSettlementStatus.PENDING}
          hasItems={stats.counts.PENDING > 0}
          onClick={() => setStatusFilter(statusFilter === AdvanceSettlementStatus.PENDING ? '' : AdvanceSettlementStatus.PENDING)}
        />
        <AsKPI
          label="KT đã kiểm tra"
          value={stats.counts.CHECKED_BY_ACCOUNTANT}
          meta={`${formatCompact(stats.totals.CHECKED_BY_ACCOUNTANT)} ₫`}
          variant="info"
          active={statusFilter === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT}
          hasItems={stats.counts.CHECKED_BY_ACCOUNTANT > 0}
          onClick={() => setStatusFilter(statusFilter === AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT ? '' : AdvanceSettlementStatus.CHECKED_BY_ACCOUNTANT)}
        />
        <AsKPI
          label="Đã duyệt"
          value={stats.counts.APPROVED}
          meta={`${formatCompact(stats.totals.APPROVED)} ₫`}
          variant="success"
          active={statusFilter === AdvanceSettlementStatus.APPROVED}
          onClick={() => setStatusFilter(statusFilter === AdvanceSettlementStatus.APPROVED ? '' : AdvanceSettlementStatus.APPROVED)}
        />
        <AsKPI
          label="Tồn tạm ứng"
          value={balancesData?.items.length ?? 0}
          meta={`${formatCompact(balancesData ? Number(balancesData.totalOutstanding) : 0)} ₫`}
          variant="warn"
          active={false}
          hasItems={(balancesData?.items.length ?? 0) > 0}
          onClick={() => { /* summary only — no filter */ }}
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
            {/* Desktop: grid header + rows */}
            <div className="as-grid-head">
              <div>Phiếu</div>
              <div>Giao nhận</div>
              <div className="col-right">Chi phí</div>
              <div className="col-right">Hoàn lại</div>
              <div className="col-center">Ngày lập</div>
              <div>Trạng thái</div>
              <div />
            </div>

            <div>
              {filtered.map((s) => (
                <SettlementGridRow
                  key={s.id}
                  s={s}
                  checkMutation={checkMutation}
                  approveMutation={approveMutation}
                  rejectMutation={rejectMutation}
                  focusId={`as-${s.id}`}
                />
              ))}
            </div>

            {/* Mobile: stacked cards */}
            <div className="as-cards">
              {filtered.map((s) => (
                <SettlementMobileCard
                  key={s.id}
                  s={s}
                  checkMutation={checkMutation}
                  approveMutation={approveMutation}
                  rejectMutation={rejectMutation}
                  focusId={`as-${s.id}`}
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
