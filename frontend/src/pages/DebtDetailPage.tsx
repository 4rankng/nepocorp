import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../lib/format';
import { downloadBlob, openBlobInNewTab } from '../lib/download';
import { TxnType, isFinancialRole } from '@tingting/shared';
import type { LedgerEntry } from '@tingting/shared';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCustomerStatement, useSupplierStatement } from '../hooks/useQueries';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { ConfirmDialog } from '../components/UI';
import BillingDocumentsPanel from '../components/billing/BillingDocumentsPanel';
import { useToast } from '../components/shared/Toast';
import { usePageAnimations } from '../hooks/animations';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { useAgentOpenable } from '../hooks/useAgentOpenable';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { qk } from '../api/keys';
import './DebtDetailPage.css';
import { money, FILTER_OPTIONS, type LedgerFilter, type WorkspaceTab } from './debtDetailLedger';
import { normalizeAging, oldestAgingBucketIdx } from '../lib/aging';
import { PeriodFilter } from '../components/debt/PeriodFilter';
import { resolvePeriodRange, initialPeriodState, applyModeSwitch, periodFromLatestActivity, type PeriodState } from '../components/debt/periodFilterRange';
import { buildStatementExportUrl, statementExportFilename } from '../lib/statementExport';
import { PeriodSummaryCards } from '../components/debt/PeriodSummaryCards';
import { matchLinkedSupplierStatement } from './linked-supplier-statement';
import { DebtDetailHeader } from '../features/debt/debtHeader';
import { DebtAccountStrip, DebtAgingSummary } from '../features/debt/debtSummary';
import { DebtPaymentModal } from '../features/debt/debtPaymentModal';
import { ReceivableLedgerRow, ReceivableLedgerCard } from '../features/debt/debtLedgerRows';
import { DualEntityLookupError, LinkedSupplierPayableLedger } from '../features/debt/debtLinkedSupplierLedger';

// Re-exported so existing imports from this page keep resolving after the
// split (tests + any future consumer).
export { ReceivableLedgerCard };
export { DualEntityLookupError, LinkedSupplierPayableLedger };

// ── Ledger filter type ─────────────────────────────────────────────────────

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isCompactLedger = useMediaQuery('(max-width: 1023px)');
  const backPath = location.pathname.startsWith('/customers/') ? '/customers' : '/debt';
  const isCustomerRoute = location.pathname.startsWith('/customers/');
  const parentCrumb = isCustomerRoute
    ? { label: 'Khách hàng', to: '/customers' }
    : { label: 'Công nợ phải thu', to: '/debt' };
  const detailPath = location.pathname.startsWith('/customers/') ? `/customers/${id}` : `/debt/${id}`;
  const billingCreatePath = `${detailPath}/billing/new`;
  const isCreatingBillingDocument = location.pathname === billingCreatePath;

  // The customer profile is a current-state view. Keep it independent from
  // the period-scoped statement used by the ledger below.
  const {
    data: profileStatement,
    isLoading: isProfileLoading,
    error: profileQueryError,
  } = useCustomerStatement(id);

  // ── Period filter (ledger tab only) ──────────────────────────────────────
  // The filter opens on the month that actually carries ledger activity,
  // resolved at render time from the profile's `latestActivityDate`. The old
  // two-phase init rendered the current month first (fetching it too) and only
  // then jumped the filter to the activity month, so every reload showed the
  // period tabs reset to default before the jump and the ledger flash the
  // default month's empty content before settling (kanban 091026235510).
  const latestActivityDate = profileStatement?.latestActivityDate;
  const fallbackPeriod = useMemo(() => initialPeriodState(), []);
  const alignedPeriod = useMemo(
    () => periodFromLatestActivity(latestActivityDate) ?? fallbackPeriod,
    [latestActivityDate, fallbackPeriod],
  );
  // Draft (`period`) and applied (`appliedPeriod`) start derived from the
  // aligned month; the first user interaction freezes both so a later profile
  // refresh can never move a filter that is being edited. `appliedPeriodRange`
  // feeds the period-scoped statement query below.
  const [periodOverride, setPeriodOverride] = useState<PeriodState | null>(null);
  const [appliedOverride, setAppliedOverride] = useState<PeriodState | null>(null);
  const period = periodOverride ?? alignedPeriod;
  const appliedPeriod = appliedOverride ?? alignedPeriod;
  const appliedPeriodRange = useMemo(
    () => resolvePeriodRange(appliedPeriod),
    [appliedPeriod],
  );
  const touchPeriod = (next: PeriodState) => {
    setAppliedOverride(prev => prev ?? appliedPeriod);
    setPeriodOverride(next);
  };

  const {
    data: statement,
    isFetching: isStatementFetching,
    refetch,
  } = useCustomerStatement(id, appliedPeriodRange, { enabled: !!profileStatement });
  const error = profileQueryError ? (profileQueryError as Error).message : null;
  const { rootRef } = usePageAnimations({ ready: !isProfileLoading && !!profileStatement });

  const handleBack = () => navigate(backPath);
  useBackShortcut(handleBack);

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() =>
    isCreatingBillingDocument ? 'debit-note' : 'ledger',
  );
  const isPeriodDirty = period.mode !== appliedPeriod.mode
    || period.month !== appliedPeriod.month
    || period.year !== appliedPeriod.year
    || period.dateFrom !== appliedPeriod.dateFrom
    || period.dateTo !== appliedPeriod.dateTo;

  useEffect(() => {
    if (isCreatingBillingDocument) setWorkspaceTab('debit-note');
  }, [isCreatingBillingDocument]);

  // Payment modal state — was missing entirely (BUG: no way to record
  // a payment from the debt detail page even though /api/payments/receive
  // exists on the backend).
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payReceipt, setPayReceipt] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const queryClient = useQueryClient();
  const { toast: showToast } = useToast();
  const { user } = useAuth();

  // Synchronous in-flight guard (kanban 141026163910). The disabled submit
  // button alone is NOT enough: the modal's Enter shortcut (useConfirmShortcuts)
  // fires onConfirm regardless of the button state, and two rapid events can
  // both observe paySubmitting=false before React re-renders. A ref makes the
  // guard immediate, so a frozen-looking form can never queue a second POST.
  const payInFlightRef = useRef(false);

  // Delete-payment flow (kanban 141026163920). Only financial roles get the
  // action; the backend re-checks permissions on DELETE /payments/:id.
  const canDeletePayments = isFinancialRole(user?.role);
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  // Before the early returns below — hooks must run unconditionally.
  const requestDeletePayment = useCallback((row: LedgerEntry) => {
    setDeleteTarget(row);
  }, []);

  // Agent "open/prefill" target: the bot can open this payment modal (and
  // prefill the amount) when the user is on this page — the "do it for you"
  // half of guidance. Read-only-safe: the user still reviews + submits.
  useAgentOpenable(
    'debt.record-payment',
    useCallback((d) => {
      const prefill = d.kind === 'prefill' ? d.values : d.prefill;
      const amount = prefill && typeof prefill.amount === 'number' ? prefill.amount : undefined;
      if (amount !== undefined) setPayAmount(String(amount));
      setShowPay(true);
    }, []),
  );

  const downloadExport = async (format: string) => {
    try {
      // Mirror the on-screen period into the export so the file matches the
      // ledger tab instead of pulling the whole history.
      const url = buildStatementExportUrl(
        `/ledger/customers/${id}/statement/export`,
        format,
        appliedPeriodRange,
      );
      const blob = await api.getBlob(url);
      if (format === 'pdf') {
        openBlobInNewTab(blob);
      } else {
        downloadBlob(blob, statementExportFilename(
          'sao-ke-kh',
          profileStatement?.customer.name ?? String(id),
          appliedPeriodRange,
        ));
      }
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất sao kê' });
    }
  };

  // Debit-note export now lives in <BillingDocumentsPanel> below (saved-snapshot
  // Giấy báo nợ). The old stateless /finance/debit-note/export button was removed
  // when the export menu here was collapsed to a single statement-xlsx button.

  // ── Linked supplier data (dual-entity customers) ─────────────────────────
  // The customer statement doesn't expose linkedSupplierId directly, so we
  // carry it via the /finance/dual-entities call. However, to keep this
  // page self-contained we instead read it from the customer-aging cache,
  // or fall back to fetching the supplier statement once we know the id.
  // We derive linkedSupplierId from a lightweight dual-entity check.
  const customerId = id ? Number(id) : undefined;
  const {
    data: dualEntities,
    isError: isDualEntityLookupError,
    refetch: refetchDualEntities,
  } = useQuery<Array<{
    customerId: number; supplierId: number; arBalance: number; apBalance: number;
  }>>({
    queryKey: qk.tripForm.dualEntities,
    queryFn: () => api.get('/finance/dual-entities'),
    staleTime: 2 * 60 * 1000,
  });
  const dualEntity = dualEntities?.find(e => e.customerId === customerId);
  const linkedSupplierId = dualEntity?.supplierId ?? null;

  // Fetch supplier statement only when this customer has a linked supplier
  const {
    data: supplierStatement,
    isLoading: isSupplierStatementLoading,
    isPlaceholderData: isSupplierStatementPlaceholder,
    isError: isSupplierStatementError,
    refetch: refetchSupplierStatement,
  } = useSupplierStatement(linkedSupplierId ?? undefined);
  const matchedSupplierStatement = matchLinkedSupplierStatement(supplierStatement, linkedSupplierId);
  const isLinkedSupplierLoading = isSupplierStatementLoading
    || isSupplierStatementPlaceholder
    || (!!supplierStatement && !matchedSupplierStatement);
  const apBalance = matchedSupplierStatement?.totalOutstanding ?? dualEntity?.apBalance ?? 0;
  const arBalance = profileStatement?.totalOutstanding ?? 0;

  // ── Derived data ────────────────────────────────────────────────────────

  const agingAmounts = useMemo(() =>
    normalizeAging(profileStatement?.agingBuckets ?? []),
    [profileStatement?.agingBuckets]
  );

  const filteredRows = useMemo(() => {
    if (!statement) return [];
    if (ledgerFilter === 'all') return statement.ledgerRows;
    if (ledgerFilter === TxnType.SERVICE_FEE) {
      return statement.ledgerRows.filter(r => r.txnType === TxnType.SERVICE_FEE || Boolean(r.serviceFeeLabel));
    }
    if (ledgerFilter === TxnType.TRIP_REVENUE) {
      return statement.ledgerRows.filter(r => r.txnType === TxnType.TRIP_REVENUE && !r.serviceFeeLabel);
    }
    return statement.ledgerRows.filter(r => r.txnType === ledgerFilter);
  }, [statement, ledgerFilter]);

  const activeAgingIdx = useMemo(() => {
    let max = -1, idx = 0;
    agingAmounts.forEach((a, i) => { if (a > max) { max = a; idx = i; } });
    return max > 0 ? idx : -1;
  }, [agingAmounts]);

  // The overdue rule the list, the header badge and the aging note all read
  // (> 0 = money past the current 0–30 bucket). The note used to follow the
  // LARGEST bucket instead, so a customer with a big current balance and real
  // overdue debt read "trong hạn" here while the list said "Nợ quá hạn"
  // (kanban 101026203130).
  const oldestOverdueIdx = useMemo(() => oldestAgingBucketIdx(agingAmounts), [agingAmounts]);

  const lastPayment = useMemo(() => {
    if (!profileStatement) return null;
    return [...profileStatement.ledgerRows]
      .filter((row) => row.txnType === TxnType.PAYMENT_RECEIVED)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;
  }, [profileStatement]);

  const totalOutstanding = profileStatement?.totalOutstanding ?? 0;

  // ── Loading / Error ─────────────────────────────────────────────────────

  if (isProfileLoading && !profileStatement) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!profileStatement) {
    return (
      <div className="debt-detail-page">
        <div className="dd-header">
          <button className="dd-back" aria-label="Quay lại" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="dd-meta">
            {/* "Sổ kế toán" named nothing else on this screen (kanban 091026010110). */}
            <h1>Chi tiết công nợ</h1>
          </div>
        </div>
        <div className="dd-summary">
          <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-body)' }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </div>
      </div>
    );
  }

  const { customer, ledgerRows } = profileStatement;
  // Before the first period statement lands the ledger must read as "loading",
  // not as "Không có giao dịch" — the empty flash on every reload is what QA
  // logged as the tab content flickering (kanban 091026235510). Same wording
  // pattern as the linked AP ledger below.
  const ledgerStatusMessage = statement ? 'Không có giao dịch' : 'Đang tải giao dịch…';
  const hasDebt = totalOutstanding > 0;
  const unpaidTrips = profileStatement.unpaidTrips ?? [];
  const oldestUnpaidTrip = unpaidTrips[0] ?? null;
  const activeAgingAmount = activeAgingIdx >= 0 ? agingAmounts[activeAgingIdx] : 0;
  const workspaceTabs: Array<{ key: WorkspaceTab; label: string; meta: string }> = [
    // No "0 khoản phát sinh" before the statement exists — a tab claiming zero
    // transactions and then jumping to the real count is the tab flicker QA
    // logged (kanban 091026235510).
    { key: 'ledger', label: 'Chi tiết công nợ', meta: statement ? `${statement.ledgerRows.length} khoản phát sinh` : 'Đang tải…' },
    { key: 'payments', label: 'Thanh toán', meta: hasDebt ? `${unpaidTrips.length} chuyến chưa thu` : 'Không còn nợ' },
    { key: 'statement', label: 'Bảng kê', meta: 'Lập chứng từ thanh toán' },
    { key: 'debit-note', label: 'Giấy báo nợ', meta: 'Nhắc nợ theo mẫu' },
  ];

  // FIFO-distribute the entered amount across the oldest unpaid trips,
  // then POST. The backend also re-applies FIFO inside the transaction
  // for safety; this just gives the user a clear preview of how their
  // payment will land.
  const openPaymentModal = () => {
    setPayAmount('');
    setPayReceipt('');
    setPayError('');
    setShowPay(true);
  };

  // Every surface a payment (or its deletion) touches. Both flows funnel
  // through this so the debt list, AR aging and Dashboard KPIs refresh the
  // same way (kanban 141026163920 requires the delete path to reuse it).
  const invalidatePaymentCaches = async () => {
    // Broad prefix — invalidates every customer-statement query regardless
    // of period range, so the AR detail page's month/range-scoped statement
    // refetches alongside any other cached variant.
    await queryClient.invalidateQueries({ queryKey: qk.financial.customerStatementAll });
    await queryClient.invalidateQueries({ queryKey: qk.financial.debt });
    // V1: a payment also changes AR aging + the Dashboard overdue KPI, which
    // live under separate query keys — without these the DebtListPage hero
    // cards and the Dashboard attention chip go stale until staleTime (2m).
    await queryClient.invalidateQueries({ queryKey: qk.financial.customerAgingAll });
    await queryClient.invalidateQueries({ queryKey: qk.dashboard.receivablesSummary });
    await refetch();
  };

  const submitPayment = async () => {
    // Double-submit guard — see payInFlightRef above.
    if (payInFlightRef.current) return;
    setPayError('');
    const amount = parseFloat(payAmount.replace(/[.,\s]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError('Số tiền không hợp lệ.');
      return;
    }
    if (!payReceipt.trim()) {
      setPayError('Mã biên lai là bắt buộc.');
      return;
    }
    if (unpaidTrips.length === 0) {
      setPayError('Khách hàng không có công nợ để thanh toán.');
      return;
    }
    // No silent client-side cap: the server is the authority on what is still
    // collectible and rejects an over-total with the exact figure
    // ("Tổng còn có thể thu: X ₫"), which the user needs to see. This split is
    // only a preview — the server reallocates the total FIFO over its own
    // per-trip remaining balances, skipping already-paid trips (NITODA fix).
    let remaining = amount;
    const payments: Array<{ tripId: number; amount: number }> = [];
    for (const t of unpaidTrips) {
      if (remaining <= 0) break;
      const apply = Math.min(t.outstanding, remaining);
      payments.push({ tripId: t.tripId, amount: apply });
      remaining -= apply;
    }
    if (remaining > 0) {
      // The aging preview could not absorb the amount — let the server say
      // precisely how much is collectible instead of posting a short payment.
      setPayError(`Số tiền vượt quá tổng công nợ còn lại (${money(totalOutstanding)}).`);
      return;
    }
    payInFlightRef.current = true;
    setPaySubmitting(true);
    try {
      const res = await api.post<{ ok: boolean; duplicate?: boolean; message?: string }>('/payments/receive', {
        customerId: Number(id),
        receiptId: payReceipt.trim(),
        payments,
      });
      await invalidatePaymentCaches();
      setShowPay(false);
      if (res?.duplicate) {
        // The backend recognized a re-submission of an already-recorded
        // payment — nothing new was posted (kanban 141026163910).
        showToast({ kind: 'info', message: res.message || 'Bản ghi thanh toán đã tồn tại — không ghi nhận trùng lặp.' });
      }
    } catch (e: unknown) {
      setPayError((e as Error)?.message || 'Lỗi khi ghi nhận thanh toán.');
    } finally {
      payInFlightRef.current = false;
      setPaySubmitting(false);
    }
  };

  const confirmDeletePayment = async () => {
    if (!deleteTarget || deleteSubmitting) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/payments/${deleteTarget.id}`);
      setDeleteTarget(null);
      await invalidatePaymentCaches();
      showToast({ kind: 'success', message: 'Đã xóa bản ghi thanh toán. Số dư công nợ đã được tính lại.' });
    } catch (e: unknown) {
      showToast({ kind: 'error', message: (e as Error)?.message || 'Lỗi khi xóa bản ghi thanh toán.' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="debt-detail-page">
      <Breadcrumbs
        className="debt-detail__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: parentCrumb.label, to: parentCrumb.to },
          { label: customer.name },
        ]}
        renderLink={(to, children) => (
          <a onClick={() => navigate(to)} style={{ cursor: 'pointer' }}>{children}</a>
        )}
      />
      {/* ── Customer Header ─────────────────────────────────────────────── */}
      <DebtDetailHeader
        customer={customer}
        hasDebt={hasDebt}
        isOverdue={oldestOverdueIdx > 0}
        onBack={handleBack}
        onRecordPayment={openPaymentModal}
        onExport={() => { void downloadExport('xlsx'); }}
      />

      <DebtAccountStrip
        hasDebt={hasDebt}
        totalOutstanding={totalOutstanding}
        unpaidTripCount={unpaidTrips.length}
        oldestUnpaidTripDate={oldestUnpaidTrip?.date ?? null}
        lastPayment={lastPayment}
        activeAgingIdx={activeAgingIdx}
        activeAgingAmount={activeAgingAmount}
      />

      {/* ── Aging Summary ───────────────────────────────────────────────── */}
      <DebtAgingSummary
        hasDebt={hasDebt}
        activeAgingIdx={activeAgingIdx}
        oldestOverdueIdx={oldestOverdueIdx}
        agingAmounts={agingAmounts}
        ledgerRowCount={ledgerRows.length}
      />

      {isDualEntityLookupError && (
        <DualEntityLookupError onRetry={() => { void refetchDualEntities(); }} />
      )}

      {/* ── AP ledger (dual-entity customers) ──────────────────────────── */}
      {linkedSupplierId != null && (
        <LinkedSupplierPayableLedger
          supplierId={linkedSupplierId}
          supplierName={matchedSupplierStatement?.supplier.name ?? 'nhà cung cấp liên kết'}
          rows={matchedSupplierStatement?.ledgerRows ?? []}
          isCompact={isCompactLedger}
          isLoading={isLinkedSupplierLoading}
          isError={isSupplierStatementError}
          onRetry={() => { void refetchSupplierStatement(); }}
          arBalance={arBalance}
          apBalance={apBalance}
        />
      )}

      <section className="dd-workspace" aria-label="Không gian làm việc công nợ">
        <div className="dd-workspace-head">
          <div>
            <span className="dd-panel-eyebrow">Hồ sơ khách hàng</span>
            <h2>Chi tiết & chứng từ công nợ</h2>
          </div>
          <div className="dd-workspace-tabs" role="tablist" aria-label="Chọn nghiệp vụ công nợ">
            {workspaceTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={workspaceTab === tab.key}
                className={`dd-workspace-tab${workspaceTab === tab.key ? ' dd-workspace-tab--active' : ''}`}
                onClick={() => setWorkspaceTab(tab.key)}
              >
                <span>{tab.label}</span>
                <small>{tab.meta}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="dd-workspace-body">
          {workspaceTab === 'statement' && id && (
            <BillingDocumentsPanel
              type="PAYMENT_STATEMENT"
              entityType="CUSTOMER"
              entityId={Number(id)}
              entityName={profileStatement.customer.name}
              buttonLabel="Tạo bảng kê"
            />
          )}

          {workspaceTab === 'debit-note' && id && (
            <BillingDocumentsPanel
              type="DEBIT_NOTE"
              entityType="CUSTOMER"
              entityId={Number(id)}
              entityName={profileStatement.customer.name}
              buttonLabel="Tạo giấy báo nợ"
              createBuilderOpen={isCreatingBillingDocument}
              onOpenCreate={() => navigate(billingCreatePath)}
              onBuilderClose={() => navigate(detailPath, { replace: true })}
            />
          )}

          {workspaceTab === 'payments' && (
            <section className="dd-payment-panel">
              <div className="dd-payment-panel__main">
                <span className="dd-panel-eyebrow">Phiếu thu</span>
                <h2>{hasDebt ? 'Ghi nhận thanh toán khách hàng' : 'Khách hàng đã thanh toán đủ'}</h2>
                <p>
                  {hasDebt
                    ? 'Khoản thu sẽ được phân bổ FIFO vào các chuyến còn nợ, bắt đầu từ chuyến cũ nhất.'
                    : 'Không có chuyến nào đang mở công nợ để ghi nhận thêm thanh toán.'}
                </p>
                <button
                  className="btn btn--primary"
                  data-tour-id="debt-record-payment"
                  type="button"
                  onClick={openPaymentModal}
                  disabled={!hasDebt}
                >
                  <Plus size={14} />
                  Ghi nhận thanh toán
                </button>
              </div>
              <div className="dd-payment-panel__side" aria-label="Tóm tắt thanh toán">
                <div>
                  <span>Còn nợ</span>
                  <strong>{money(totalOutstanding)}</strong>
                </div>
                <div>
                  <span>Chuyến chưa thu</span>
                  <strong>{unpaidTrips.length}</strong>
                </div>
                {oldestUnpaidTrip && (
                  <div>
                    <span>Chuyến cũ nhất</span>
                    <strong>{formatDate(oldestUnpaidTrip.date)}</strong>
                    <small>{money(oldestUnpaidTrip.outstanding)}</small>
                  </div>
                )}
              </div>
            </section>
          )}

          {workspaceTab === 'ledger' && (
            <section className="dd-ledger">
              <div className="dd-ledger-head dd-ledger-head--workspace">
                <div className="dd-ledger-heading">
                  <h2>Chi tiết công nợ phải thu</h2>
                  <p>Toàn bộ cước, phí chi hộ, khoản đã thu và điều chỉnh của khách hàng.</p>
                </div>
                <span className="dd-cnt">{filteredRows.length} giao dịch</span>
                <div className="dd-filters">
                  {FILTER_OPTIONS.map(f => (
                    <button
                      key={f.key}
                      className={`dd-filter-chip${ledgerFilter === f.key ? ' dd-filter-chip--on' : ''}`}
                      onClick={() => setLedgerFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period filter + period summary (số dư đầu kỳ / phát sinh / cuối kỳ) */}
              <PeriodFilter
                mode={period.mode}
                onModeChange={(m) => touchPeriod(applyModeSwitch(period, m))}
                month={period.month}
                year={period.year}
                onMonthYearChange={({ month, year }) => touchPeriod({ ...period, month, year })}
                dateFrom={period.dateFrom}
                dateTo={period.dateTo}
                onRangeChange={(next) => touchPeriod({ ...period, ...next })}
                onApply={() => setAppliedOverride(period)}
                isApplying={isStatementFetching}
                isApplyDisabled={!isPeriodDirty || isStatementFetching}
              />
              <PeriodSummaryCards
                summary={statement?.periodSummary}
                // Skeletons only before the first statement lands — on refetch
                // the loaded summary stays put instead of flashing back to
                // skeletons (kanban 091026010100).
                isLoading={isStatementFetching && !statement}
                entityType="CUSTOMER"
              />

              {isCompactLedger ? (
                <ul className="dd-ledger-mobile d-list" aria-label="Danh sách giao dịch công nợ phải thu">
                  {filteredRows.map(row => (
                    <ReceivableLedgerCard
                      key={row.id}
                      row={row}
                      onDelete={canDeletePayments ? requestDeletePayment : undefined}
                    />
                  ))}
                  {filteredRows.length === 0 && (
                    <li className="dd-ledger-mobile-empty">{ledgerStatusMessage}</li>
                  )}
                </ul>
              ) : (
                <div className="table-scroll">
                  <table className="dd-table dd-detail-table">
                    <thead>
                      <tr>
                        <th>NGÀY</th>
                        <th>CHUYẾN / ĐỐI CHIẾU</th>
                        <th>NỘI DUNG</th>
                        <th>LOẠI</th>
                        <th className="dd-r">PHÁT SINH PHẢI THU</th>
                        <th className="dd-r">ĐÃ THU</th>
                        <th className="dd-r">SỐ DƯ</th>
                        {canDeletePayments && <th aria-label="Thao tác" />}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(row => (
                        <ReceivableLedgerRow
                          key={row.id}
                          row={row}
                          onDelete={canDeletePayments ? requestDeletePayment : undefined}
                        />
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={canDeletePayments ? 8 : 7} className="dd-table-empty">{ledgerStatusMessage}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      {/* Payment modal — FIFO across unpaid trips */}
      <DebtPaymentModal
        isOpen={showPay}
        customerName={customer.name}
        totalOutstanding={totalOutstanding}
        unpaidTripCount={unpaidTrips.length}
        payAmount={payAmount}
        payReceipt={payReceipt}
        payError={payError}
        paySubmitting={paySubmitting}
        onAmountChange={setPayAmount}
        onReceiptChange={setPayReceipt}
        onSubmit={() => { void submitPayment(); }}
        onClose={() => setShowPay(false)}
      />

      {/* Delete-payment confirmation (kanban 141026163920) */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        variant="danger"
        message={`Xóa bản ghi thanh toán này? Số dư công nợ sẽ được tính lại. (${money(parseFloat(deleteTarget?.credit || '0'))}${deleteTarget?.receiptId ? ` — ${deleteTarget.receiptId}` : ''})`}
        confirmLabel={deleteSubmitting ? 'Đang xóa…' : 'Xóa'}
        cancelLabel="Hủy"
        onConfirm={() => { void confirmDeletePayment(); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
