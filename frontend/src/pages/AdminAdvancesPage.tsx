import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency, formatCompact, formatDate } from '../lib/format';
import {
  ADVANCE_REQUEST_STATUS_LABELS,
  AdvanceRequestStatus,
} from '@nepocorp/shared';
import { PageHeader, StatusPill, Toolbar, FilterPill } from '../components/UI';
import {
  useAdminAdvanceRequests,
  useApproveAdvanceRequest,
  useRejectAdvanceRequest,
} from '../hooks/useQueries';
import { advanceRequestStatusVariant } from '../lib/status-variants';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface AdvanceRequest {
  id: number;
  requesterName: string | null;
  requesterId: number;
  amount: number | string;
  createdAt: string;
  status: AdvanceRequestStatus;
  reason: string | null;
  approverName: string | null;
}

type StatusFilter = '' | AdvanceRequestStatus;

const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: AdvanceRequestStatus.PENDING, label: 'Chờ duyệt' },
  { key: AdvanceRequestStatus.APPROVED, label: 'Đã duyệt' },
  { key: AdvanceRequestStatus.REJECTED, label: 'Từ chối' },
];

/* ── Compact KPI card — matches dashboard .wf-kpi proportions ─────────── */

interface AdvKPIProps {
  label: string;
  value: number;
  meta: string;
  variant: 'warn' | 'success' | 'danger';
  active?: boolean;
  hasItems?: boolean;
  onClick: () => void;
}

function AdvKPI({ label, value, meta, variant, active = false, hasItems = false, onClick }: AdvKPIProps) {
  return (
    <div
      className={`adv-kpi adv-kpi--${variant}${active ? ' is-active' : ''}${hasItems ? ' has-items' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="adv-kpi__label">{label}</div>
      <div className="adv-kpi__value">{value}</div>
      <div className="adv-kpi__meta">{meta}</div>
    </div>
  );
}

/* ── Desktop grid row ──────────────────────────────────────────────────── */

function AdvanceGridRow({
  req,
  approveMutation,
  rejectMutation,
  focusId,
}: {
  req: AdvanceRequest;
  approveMutation: ReturnType<typeof useApproveAdvanceRequest>;
  rejectMutation: ReturnType<typeof useRejectAdvanceRequest>;
  focusId?: string;
}) {
  const isApproving = approveMutation.isPending && approveMutation.variables === req.id;
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === req.id;
  const isPending = req.status === AdvanceRequestStatus.PENDING;

  return (
    <div className="adv-grid-row" id={focusId}>
      {/* Requester */}
      <div className="adv-requester">
        <div className="adv-avatar">
          <Wallet size={16} />
        </div>
        <span className="adv-requester-name">
          {req.requesterName || `Đối tác ${req.requesterId}`}
        </span>
      </div>

      {/* Amount */}
      <div className="adv-amount">
        {formatCurrency(Number(req.amount))}
      </div>

      {/* Date */}
      <div className="adv-date">
        {formatDate(req.createdAt)}
      </div>

      {/* Status */}
      <div>
        <StatusPill variant={advanceRequestStatusVariant(req.status)}>
          {ADVANCE_REQUEST_STATUS_LABELS[req.status]}
        </StatusPill>
      </div>

      {/* Reason */}
      <div className="adv-reason">{req.reason}</div>

      {/* Actions / Approver */}
      <div className="adv-actions">
        {isPending ? (
          <>
            <button
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => approveMutation.mutate(req.id)}
              disabled={isApproving || isRejecting}
              title="Duyệt yêu cầu"
              style={{ color: 'var(--success)' }}
            >
              {isApproving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            </button>
            <button
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => rejectMutation.mutate(req.id)}
              disabled={isApproving || isRejecting}
              title="Từ chối yêu cầu"
              style={{ color: 'var(--danger)' }}
            >
              {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
            </button>
          </>
        ) : req.approverName ? (
          <div className="adv-approver">
            bởi <strong>{req.approverName}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Mobile card ───────────────────────────────────────────────────────── */

function AdvanceMobileCard({
  req,
  approveMutation,
  rejectMutation,
  focusId,
}: {
  req: AdvanceRequest;
  approveMutation: ReturnType<typeof useApproveAdvanceRequest>;
  rejectMutation: ReturnType<typeof useRejectAdvanceRequest>;
  focusId?: string;
}) {
  const isApproving = approveMutation.isPending && approveMutation.variables === req.id;
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === req.id;
  const isPending = req.status === AdvanceRequestStatus.PENDING;

  return (
    <div className="adv-mcard" id={focusId}>
      {/* Top: avatar + name + status */}
      <div className="adv-mcard__top">
        <div className="adv-mcard__left">
          <div className="adv-mcard__avatar">
            <Wallet size={16} />
          </div>
          <span className="adv-mcard__name">
            {req.requesterName || `Đối tác ${req.requesterId}`}
          </span>
        </div>
        <StatusPill variant={advanceRequestStatusVariant(req.status)}>
          {ADVANCE_REQUEST_STATUS_LABELS[req.status]}
        </StatusPill>
      </div>

      {/* Amount — prominent */}
      <div className="adv-mcard__amount">
        {formatCurrency(Number(req.amount))}
      </div>

      {/* Meta: date + reason */}
      <div className="adv-mcard__meta">
        <div className="adv-mcard__meta-row">
          <span className="adv-mcard__meta-label">Ngày tạo</span>
          <span className="adv-mcard__meta-value">{formatDate(req.createdAt)}</span>
        </div>
        {req.reason && (
          <div className="adv-mcard__meta-row">
            <span className="adv-mcard__meta-label">Lý do</span>
            <span className="adv-mcard__meta-value">{req.reason}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending ? (
        <div className="adv-mcard__actions">
          <button
            className="btn btn--primary"
            onClick={() => approveMutation.mutate(req.id)}
            disabled={isApproving || isRejecting}
          >
            {isApproving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            Duyệt
          </button>
          <button
            className="btn btn--danger"
            onClick={() => rejectMutation.mutate(req.id)}
            disabled={isApproving || isRejecting}
          >
            {isRejecting ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
            Từ chối
          </button>
        </div>
      ) : req.approverName ? (
        <div className="adv-mcard__meta-row" style={{ marginTop: 4 }}>
          <span className="adv-mcard__meta-label">Duyệt bởi</span>
          <span className="adv-mcard__meta-value" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {req.approverName}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function AdminAdvancesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch ALL requests once — client-side filtering for accurate counts/totals
  const { data, isLoading } = useAdminAdvanceRequests();
  const approveMutation = useApproveAdvanceRequest();
  const rejectMutation = useRejectAdvanceRequest();

  const allRequests: AdvanceRequest[] = (data?.items ?? []) as AdvanceRequest[];

  /* ── Focus deep-link: scroll to item from ?focus=<id> ──────────────── */
  const focusId = searchParams.get('focus');
  useEffect(() => {
    if (!focusId || isLoading) return;
    const el = document.getElementById(`adv-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.animate?.([
      { boxShadow: 'inset 0 0 0 2px var(--accent), 0 0 0 2px rgba(59,130,246,0.25)' },
      { boxShadow: 'none' },
    ], { duration: 2000, easing: 'ease-out' });
    setSearchParams({}, { replace: true });
  }, [focusId, isLoading, setSearchParams]);

  /* ── Derived counts & totals ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const counts: Record<string, number> = { total: 0, [AdvanceRequestStatus.PENDING]: 0, [AdvanceRequestStatus.APPROVED]: 0, [AdvanceRequestStatus.REJECTED]: 0 };
    const totals: Record<string, number> = { [AdvanceRequestStatus.PENDING]: 0, [AdvanceRequestStatus.APPROVED]: 0, [AdvanceRequestStatus.REJECTED]: 0 };

    for (const req of allRequests) {
      counts.total++;
      const s = req.status as string;
      if (s in counts) counts[s]++;
      const amt = Number(req.amount) || 0;
      if (s in totals) totals[s] += amt;
    }
    return { counts, totals };
  }, [allRequests]);

  const filtered = useMemo(() => {
    if (!statusFilter) return allRequests;
    return allRequests.filter((r) => r.status === statusFilter);
  }, [allRequests, statusFilter]);

  /* ── Tab counts ──────────────────────────────────────────────────────── */
  const tabCounts = useMemo(() => ({
    '': stats.counts.total,
    [AdvanceRequestStatus.PENDING]: stats.counts.PENDING,
    [AdvanceRequestStatus.APPROVED]: stats.counts.APPROVED,
    [AdvanceRequestStatus.REJECTED]: stats.counts.REJECTED,
  }), [stats]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="adv-page fade-up">
      <PageHeader
        title="Quản lý tạm ứng"
        description="Duyệt hoặc từ chối yêu cầu tạm ứng"
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="adv-kpi-row">
        <AdvKPI
          label="Chờ duyệt"
          value={stats.counts.PENDING}
          meta={`${formatCompact(stats.totals.PENDING)} ₫`}
          variant="warn"
          active={statusFilter === AdvanceRequestStatus.PENDING}
          hasItems={stats.counts.PENDING > 0}
          onClick={() => setStatusFilter(statusFilter === AdvanceRequestStatus.PENDING ? '' : AdvanceRequestStatus.PENDING)}
        />
        <AdvKPI
          label="Đã duyệt"
          value={stats.counts.APPROVED}
          meta={`${formatCompact(stats.totals.APPROVED)} ₫`}
          variant="success"
          active={statusFilter === AdvanceRequestStatus.APPROVED}
          onClick={() => setStatusFilter(statusFilter === AdvanceRequestStatus.APPROVED ? '' : AdvanceRequestStatus.APPROVED)}
        />
        <AdvKPI
          label="Từ chối"
          value={stats.counts.REJECTED}
          meta={`${formatCompact(stats.totals.REJECTED)} ₫`}
          variant="danger"
          active={statusFilter === AdvanceRequestStatus.REJECTED}
          onClick={() => setStatusFilter(statusFilter === AdvanceRequestStatus.REJECTED ? '' : AdvanceRequestStatus.REJECTED)}
        />
      </div>

      {/* ── Card wrapper ──────────────────────────────────────────────── */}
      <div className="adv-panel">
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
          <div className="adv-loading">
            <Loader2 size={24} className="spin" style={{ color: 'var(--ink-3)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="adv-empty">
            <img src="/assets/illustrations/empty-advances.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain', marginBottom: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="adv-empty-text">Không có yêu cầu tạm ứng nào</div>
            <div className="adv-empty-hint">Giao nhận có thể gửi yêu cầu từ ứng dụng di động</div>
          </div>
        ) : (
          <>
            {/* Desktop: grid header + rows */}
            <div className="adv-grid-head">
              <div>Người yêu cầu</div>
              <div className="col-right">Số tiền</div>
              <div className="col-center">Ngày tạo</div>
              <div>Trạng thái</div>
              <div>Lý do</div>
              <div />
            </div>

            <div>
              {filtered.map((req) => (
                <AdvanceGridRow
                  key={req.id}
                  req={req}
                  approveMutation={approveMutation}
                  rejectMutation={rejectMutation}
                  focusId={`adv-${req.id}`}
                />
              ))}
            </div>

            {/* Mobile: stacked cards */}
            <div className="adv-cards">
              {filtered.map((req) => (
                <AdvanceMobileCard
                  key={req.id}
                  req={req}
                  approveMutation={approveMutation}
                  rejectMutation={rejectMutation}
                  focusId={`adv-${req.id}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div className="adv-footer">
          {filtered.length} yêu cầu tạm ứng
        </div>
      )}
    </div>
  );
}
