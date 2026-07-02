import { Fragment, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType } from '@tingting/shared';
import type { LedgerEntry, AgingBucket } from '@tingting/shared';
import { AlertTriangle, Download, Phone, Building2, ArrowLeft, Plus, X, Loader2, Save, Truck } from 'lucide-react';
import { useCustomerStatement, useSupplierStatement } from '../hooks/useQueries';
import { api } from '../lib/api';
import { Modal } from '../components/UI';
import AssetIcon from '../components/AssetIcon';
import BillingDocumentsPanel from '../components/billing/BillingDocumentsPanel';
import { useToast } from '../components/shared/Toast';
import { usePageAnimations } from '../hooks/animations';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { useAgentOpenable } from '../hooks/useAgentOpenable';
import { qk } from '../api/keys';
import './DebtDetailPage.css';

// ── Txn type label + pill variant ──────────────────────────────────────────

const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.TRIP_REVENUE]:      { label: 'DOANH THU CHUYẾN', pill: 'dd-txn-pill dd-txn-pill--rev' },
  [TxnType.SERVICE_FEE]:       { label: 'PHÍ CHI HỘ',       pill: 'dd-txn-pill dd-txn-pill--fee' },
  [TxnType.PAYMENT_RECEIVED]:  { label: 'THU TIỀN',         pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.PENALTY]:           { label: 'PHẠT',             pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.MANAGEMENT_FEE]:    { label: 'PHÍ QUẢN LÝ',     pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.ADJUSTMENT]:        { label: 'ĐIỀU CHỈNH',      pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.DRIVER_SALARY]:     { label: 'LƯƠNG LÁI XE',    pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.UNLOCK_REVERSAL]:   { label: 'HOÀN TÁC',         pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.EXTERNAL_CARRIER_COST]: { label: 'CƯỚC THUÊ NGOÀI', pill: 'dd-txn-pill dd-txn-pill--other' },
};
const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

// ── Aging constants ────────────────────────────────────────────────────────

const AGING_RANGES = [
  { label: '0–30 NGÀY',  dotColor: 'var(--accent)',  index: 0 },
  { label: '31–60 NGÀY', dotColor: 'var(--warning)', index: 1 },
  { label: '61–90 NGÀY', dotColor: '#D97706',        index: 2 },
  { label: 'TRÊN 90 NGÀY', dotColor: 'var(--danger)', index: 3 },
] as const;

// ── Ledger filter type ─────────────────────────────────────────────────────

type LedgerFilter =
  | 'all'
  | typeof TxnType.PAYMENT_RECEIVED
  | typeof TxnType.ADJUSTMENT
  | typeof TxnType.TRIP_REVENUE
  | typeof TxnType.SERVICE_FEE;

const FILTER_OPTIONS: { key: LedgerFilter; label: string }[] = [
  { key: 'all',              label: 'Tất cả' },
  { key: TxnType.PAYMENT_RECEIVED, label: 'Thu tiền' },
  { key: TxnType.ADJUSTMENT,       label: 'Điều chỉnh' },
  { key: TxnType.TRIP_REVENUE,     label: 'Doanh thu' },
  { key: TxnType.SERVICE_FEE,      label: 'Phí chi hộ' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

// Map backend agingBuckets (ordered 0→90+) to fixed 4-slot array
function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  buckets.forEach((b, i) => {
    if (i < 4) amounts[i] = b.amount;
  });
  return amounts;
}

type LedgerDisplayRow =
  | { kind: 'single'; key: string; row: LedgerEntry }
  | {
      kind: 'group';
      key: string;
      rows: LedgerEntry[];
      date: string;
      routeName: string | null;
      containerNumbers: string[];
      labels: string[];
      debit: number;
      credit: number;
      balance: number;
      note: string;
    };

type LedgerSectionKey = 'service-fees' | 'freight' | 'payments' | 'adjustments' | 'other';

interface LedgerSection {
  key: LedgerSectionKey;
  title: string;
  countLabel: string;
  items: LedgerDisplayRow[];
  debit: number;
  credit: number;
}

interface LedgerContainerGroup {
  key: string;
  label: string;
  items: LedgerDisplayRow[];
  itemCount: number;
  debit: number;
  credit: number;
}

interface LedgerAccountingLine {
  key: string;
  date: string;
  label: string;
  typeLabel: string;
  debit: number;
  credit: number;
}

interface LedgerRouteGroup {
  key: string;
  title: string;
  items: LedgerDisplayRow[];
  debit: number;
  credit: number;
}

function rowDisplayLabel(row: LedgerEntry): string {
  if (row.serviceFeeLabel?.trim()) {
    return row.serviceFeeLabel.trim();
  }
  return (TXN_META[row.txnType] ?? DEFAULT_META).label;
}

function rowGroupKey(row: LedgerEntry): string | null {
  if (row.txnType !== TxnType.TRIP_REVENUE && row.txnType !== TxnType.SERVICE_FEE) return null;
  const day = String(row.timestamp).slice(0, 10);
  const family = row.serviceFeeLabel || row.txnType === TxnType.SERVICE_FEE ? 'fees' : row.txnType;
  const tripKey = row.tripId ?? (row.txnType === TxnType.TRIP_REVENUE ? row.txnId : null);
  if (tripKey) return `${day}|${family}|trip:${tripKey}`;
  const routeKey = row.routeName?.trim() || '';
  const containerKey = (row.containerNumbers ?? []).join(',');
  if (!routeKey && !containerKey) return null;
  return `${day}|${family}|${routeKey}|${containerKey}`;
}

function groupLedgerRows(rows: LedgerEntry[]): LedgerDisplayRow[] {
  const displayRows: LedgerDisplayRow[] = [];
  const groups = new Map<string, Extract<LedgerDisplayRow, { kind: 'group' }>>();

  for (const row of rows) {
    const key = rowGroupKey(row);
    if (!key) {
      displayRows.push({ kind: 'single', key: `row:${row.id}`, row });
      continue;
    }

    let group = groups.get(key);
    if (!group) {
      group = {
        kind: 'group',
        key,
        rows: [],
        date: row.timestamp,
        routeName: row.routeName ?? null,
        containerNumbers: row.containerNumbers ?? [],
        labels: [],
        debit: 0,
        credit: 0,
        balance: parseFloat(row.balance) || 0,
        note: '',
      };
      groups.set(key, group);
      displayRows.push(group);
    }

    group.rows.push(row);
    group.debit += parseFloat(row.debit) || 0;
    group.credit += parseFloat(row.credit) || 0;
    if (!group.labels.includes(rowDisplayLabel(row))) {
      group.labels.push(rowDisplayLabel(row));
    }
    if (!group.routeName && row.routeName) group.routeName = row.routeName;
    if (group.containerNumbers.length === 0 && row.containerNumbers?.length) {
      group.containerNumbers = row.containerNumbers;
    }
  }

  for (const group of groups.values()) {
    const notes = Array.from(new Set(group.rows.map((row) => row.note?.trim()).filter(Boolean) as string[]));
    group.note = group.rows.length > 1
      ? `${group.rows.length} khoản${notes[0] ? ` - ${notes[0]}` : ''}`
      : notes[0] ?? '';
  }

  return displayRows.map((item) => {
    if (item.kind !== 'group' || item.rows.length > 1) return item;
    return { kind: 'single', key: `row:${item.rows[0].id}`, row: item.rows[0] };
  });
}

function displayRowAmounts(item: LedgerDisplayRow): { debit: number; credit: number } {
  if (item.kind === 'group') return { debit: item.debit, credit: item.credit };
  return {
    debit: parseFloat(item.row.debit) || 0,
    credit: parseFloat(item.row.credit) || 0,
  };
}

function displayRowRouteTitle(item: LedgerDisplayRow): string {
  if (item.kind === 'group') return item.routeName || 'Chưa có tuyến';
  return item.row.routeName || item.row.note || 'Chưa có tuyến';
}

function displayRowContainers(item: LedgerDisplayRow): string[] {
  return item.kind === 'group'
    ? item.containerNumbers
    : item.row.containerNumbers ?? [];
}

function displayRowFallbackLabel(item: LedgerDisplayRow): string {
  if (item.kind === 'group') return 'Không có container';
  return item.row.receiptId || 'Không có container';
}

function displayRowItemCount(item: LedgerDisplayRow): number {
  return item.kind === 'group' ? item.rows.length : 1;
}

function displayRowSectionKey(item: LedgerDisplayRow): LedgerSectionKey {
  const firstRow = item.kind === 'group' ? item.rows[0] : item.row;
  if (!firstRow) return 'other';
  if (item.kind === 'group' && item.rows.some(row => row.serviceFeeLabel || row.txnType === TxnType.SERVICE_FEE)) {
    return 'service-fees';
  }
  if (firstRow.serviceFeeLabel || firstRow.txnType === TxnType.SERVICE_FEE) return 'service-fees';
  if (firstRow.txnType === TxnType.TRIP_REVENUE) return 'freight';
  if (firstRow.txnType === TxnType.PAYMENT_RECEIVED) return 'payments';
  if (firstRow.txnType === TxnType.ADJUSTMENT || firstRow.txnType === TxnType.UNLOCK_REVERSAL) return 'adjustments';
  return 'other';
}

function ledgerSectionMeta(key: LedgerSectionKey): { title: string; countUnit: string } {
  switch (key) {
    case 'service-fees':
      return { title: 'Phí chi hộ theo container', countUnit: 'nhóm' };
    case 'freight':
      return { title: 'Doanh thu chuyến', countUnit: 'chuyến' };
    case 'payments':
      return { title: 'Thanh toán đã thu', countUnit: 'phiếu' };
    case 'adjustments':
      return { title: 'Điều chỉnh', countUnit: 'dòng' };
    default:
      return { title: 'Giao dịch khác', countUnit: 'dòng' };
  }
}

function groupLedgerSections(items: LedgerDisplayRow[]): LedgerSection[] {
  const order: LedgerSectionKey[] = ['service-fees', 'freight', 'payments', 'adjustments', 'other'];
  const sectionMap = new Map<LedgerSectionKey, LedgerSection>();

  for (const item of items) {
    const key = displayRowSectionKey(item);
    const meta = ledgerSectionMeta(key);
    let section = sectionMap.get(key);
    if (!section) {
      section = {
        key,
        title: meta.title,
        countLabel: '',
        items: [],
        debit: 0,
        credit: 0,
      };
      sectionMap.set(key, section);
    }
    const amounts = displayRowAmounts(item);
    section.items.push(item);
    section.debit += amounts.debit;
    section.credit += amounts.credit;
  }

  return order
    .map(key => {
      const section = sectionMap.get(key);
      if (!section) return null;
      const meta = ledgerSectionMeta(key);
      section.countLabel = `${section.items.length} ${meta.countUnit}`;
      return section;
    })
    .filter(Boolean) as LedgerSection[];
}

function groupDisplayRowsByRoute(items: LedgerDisplayRow[]): LedgerRouteGroup[] {
  const routeGroups: LedgerRouteGroup[] = [];
  const byRoute = new Map<string, LedgerRouteGroup>();

  for (const item of items) {
    const title = displayRowRouteTitle(item);
    const key = title.trim().toLowerCase();
    let group = byRoute.get(key);
    if (!group) {
      group = { key, title, items: [], debit: 0, credit: 0 };
      byRoute.set(key, group);
      routeGroups.push(group);
    }
    const amounts = displayRowAmounts(item);
    group.items.push(item);
    group.debit += amounts.debit;
    group.credit += amounts.credit;
  }

  return routeGroups;
}

function groupItemsByContainer(items: LedgerDisplayRow[]): LedgerContainerGroup[] {
  const groups: LedgerContainerGroup[] = [];
  const byContainer = new Map<string, LedgerContainerGroup>();

  for (const item of items) {
    const containers = displayRowContainers(item);
    const label = containers.length > 0 ? containers.join(', ') : displayRowFallbackLabel(item);
    const key = label.trim().toLowerCase();
    let group = byContainer.get(key);
    if (!group) {
      group = { key, label, items: [], itemCount: 0, debit: 0, credit: 0 };
      byContainer.set(key, group);
      groups.push(group);
    }

    const amounts = displayRowAmounts(item);
    group.items.push(item);
    group.itemCount += displayRowItemCount(item);
    group.debit += amounts.debit;
    group.credit += amounts.credit;
  }

  return groups;
}

function rowTypeLabel(row: LedgerEntry): string {
  if (row.serviceFeeLabel || row.txnType === TxnType.SERVICE_FEE) return 'Phí chi hộ';
  if (row.txnType === TxnType.TRIP_REVENUE) return 'Doanh thu';
  return (TXN_META[row.txnType] ?? DEFAULT_META).label;
}

function accountingLinesForItem(item: LedgerDisplayRow): LedgerAccountingLine[] {
  if (item.kind === 'group') {
    return item.rows.map(row => ({
      key: `row:${row.id}`,
      date: row.timestamp,
      label: rowDisplayLabel(row),
      typeLabel: rowTypeLabel(row),
      debit: parseFloat(row.debit) || 0,
      credit: parseFloat(row.credit) || 0,
    }));
  }

  return [{
    key: `row:${item.row.id}`,
    date: item.row.timestamp,
    label: rowDisplayLabel(item.row),
    typeLabel: rowTypeLabel(item.row),
    debit: parseFloat(item.row.debit) || 0,
    credit: parseFloat(item.row.credit) || 0,
  }];
}

function splitRouteTitle(title: string): { origin: string; destination: string } | null {
  const normalized = title.replace(/\s+/g, ' ').trim();
  const separator = normalized.match(/\s[-–—]\s/);
  if (!separator || separator.index === undefined) return null;
  const origin = normalized.slice(0, separator.index).trim();
  const destination = normalized.slice(separator.index + separator[0].length).trim();
  if (!origin || !destination) return null;
  return { origin, destination };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.pathname.startsWith('/customers/') ? '/customers' : '/debt';
  const detailPath = location.pathname.startsWith('/customers/') ? `/customers/${id}` : `/debt/${id}`;
  const billingCreatePath = `${detailPath}/billing/new`;
  const isCreatingBillingDocument = location.pathname === billingCreatePath;
  const { data: statement, isLoading: loading, error: queryError, refetch } = useCustomerStatement(id);
  const error = queryError ? (queryError as Error).message : null;
  const { rootRef } = usePageAnimations({ ready: !loading && !!statement });

  const handleBack = () => navigate(backPath);
  useBackShortcut(handleBack);

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');

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
      const blob = await api.getBlob(`/ledger/customers/${id}/statement/export?format=${format}`);
      const url = URL.createObjectURL(blob);
      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `sao-ke-${statement?.customer.name}-${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/\//g, '-')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
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
  const { data: dualEntities } = useQuery<Array<{
    customerId: number; supplierId: number; arBalance: number; apBalance: number;
  }>>({
    queryKey: qk.tripForm.dualEntities,
    queryFn: () => api.get('/finance/dual-entities'),
    staleTime: 2 * 60 * 1000,
  });
  const dualEntity = dualEntities?.find(e => e.customerId === customerId);
  const linkedSupplierId = dualEntity?.supplierId ?? null;

  // Fetch supplier statement only when this customer has a linked supplier
  const { data: supplierStatement } = useSupplierStatement(linkedSupplierId ?? undefined);
  const apBalance = supplierStatement?.totalOutstanding ?? dualEntity?.apBalance ?? 0;
  const arBalance = statement?.totalOutstanding ?? 0;

  // ── Derived data ────────────────────────────────────────────────────────

  const agingAmounts = useMemo(() =>
    normalizeAging(statement?.agingBuckets ?? []),
    [statement?.agingBuckets]
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

  const displayRows = useMemo(() => groupLedgerRows(filteredRows), [filteredRows]);
  const ledgerRouteGroups = useMemo(() => groupDisplayRowsByRoute(displayRows), [displayRows]);

  const activeAgingIdx = useMemo(() => {
    let max = -1, idx = 0;
    agingAmounts.forEach((a, i) => { if (a > max) { max = a; idx = i; } });
    return max > 0 ? idx : -1;
  }, [agingAmounts]);

  const totalOutstanding = statement?.totalOutstanding ?? 0;

  // ── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="debt-detail-page">
        <div className="dd-header">
          <button className="dd-back" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="dd-meta">
            <h1>Sổ kế toán</h1>
          </div>
        </div>
        <div className="dd-summary">
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </div>
      </div>
    );
  }

  const { customer, ledgerRows } = statement;
  const hasDebt = totalOutstanding > 0;
  const agingTotal = agingAmounts.reduce((s, a) => s + a, 0) || 1; // avoid /0
  const unpaidTrips = statement.unpaidTrips ?? [];

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

  const submitPayment = async () => {
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
    // Cap at total outstanding so we don't overpay.
    const capped = Math.min(amount, totalOutstanding);
    let remaining = capped;
    const payments: Array<{ tripId: number; amount: number }> = [];
    for (const t of unpaidTrips) {
      if (remaining <= 0) break;
      const apply = Math.min(t.outstanding, remaining);
      payments.push({ tripId: t.tripId, amount: apply });
      remaining -= apply;
    }
    setPaySubmitting(true);
    try {
      await api.post('/payments/receive', {
        customerId: Number(id),
        receiptId: payReceipt.trim(),
        payments,
      });
      await queryClient.invalidateQueries({ queryKey: qk.financial.customerStatement(undefined) });
      await queryClient.invalidateQueries({ queryKey: qk.financial.debt });
      // V1: a payment also changes AR aging + the Dashboard overdue KPI, which
      // live under separate query keys — without these the DebtListPage hero
      // cards and the Dashboard attention chip go stale until staleTime (2m).
      await queryClient.invalidateQueries({ queryKey: qk.financial.customerAgingAll });
      await queryClient.invalidateQueries({ queryKey: qk.dashboard.receivablesSummary });
      await refetch();
      setShowPay(false);
    } catch (e: unknown) {
      setPayError((e as Error)?.message || 'Lỗi khi ghi nhận thanh toán.');
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="debt-detail-page">
      {/* ── Customer Header ─────────────────────────────────────────────── */}
      <div className="dd-header">
        <button className="dd-back" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="dd-avatar">
          <AssetIcon
            name="customer"
            size={28}
            alt="Biểu tượng khách hàng"
            className="dd-avatar__icon"
          />
        </div>
        <div className="dd-meta">
          <div className="dd-name-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1>{customer.name}</h1>
            {customer.isCarrier && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Truck size={12} aria-hidden="true" /> Xe ngoài
              </span>
            )}
          </div>
          <div className="dd-sub">
            {customer.contactInfo && (
              <span>
                <Phone size={15} />
                <span className="dd-mono">{customer.contactInfo}</span>
              </span>
            )}
            <span>
              <Building2 size={15} />
              Khách hàng doanh nghiệp
            </span>
            {hasDebt ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Còn nợ trong hạn</span>
            ) : (
              <span className="dd-tag dd-tag--ok dd-tag--dot">Đã thanh toán đủ</span>
            )}
          </div>
        </div>
        <div className="dd-actions">
          {hasDebt && (
            <button
              className="btn btn--primary"
              onClick={openPaymentModal}
            >
              <Plus size={14} />
              Ghi nhận thanh toán
            </button>
          )}
          <button
            className="btn btn--secondary"
            onClick={() => downloadExport('xlsx')}
          >
            <Download size={14} />
            Xuất sao kê
          </button>
        </div>
      </div>

      {/* ── Customer billing document builders (AR snapshot documents) ────── */}
      {id && (
        <>
          <BillingDocumentsPanel
            type="PAYMENT_STATEMENT"
            entityType="CUSTOMER"
            entityId={Number(id)}
            entityName={statement?.customer.name ?? ''}
            buttonLabel="Tạo bảng kê"
          />
          <BillingDocumentsPanel
            type="DEBIT_NOTE"
            entityType="CUSTOMER"
            entityId={Number(id)}
            entityName={statement?.customer.name ?? ''}
            buttonLabel="Tạo giấy báo nợ"
            createBuilderOpen={isCreatingBillingDocument}
            onOpenCreate={() => navigate(billingCreatePath)}
            onBuilderClose={() => navigate(detailPath, { replace: true })}
          />
        </>
      )}

      {/* ── Summary Card ────────────────────────────────────────────────── */}
      <section className="dd-summary">
        <div className="dd-sum-top">
          <div>
            <div className="dd-sum-label">TỔNG CỘNG NỢ</div>
            <div className={`dd-sum-total ${hasDebt ? '' : ' dd-sum-total--clear'}`}>
              {hasDebt
                ? <>{formatCurrency(totalOutstanding).replace(' ₫', '')}<span className="dd-cur">đ</span></>
                : <>0<span className="dd-cur">đ</span></>
              }
            </div>
            {hasDebt && (
              <div className="dd-sum-note">
                <AlertTriangle size={17} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                {activeAgingIdx <= 0
                  ? 'Toàn bộ công nợ đang trong hạn 30 ngày — cần theo dõi thu hồi.'
                  : `Có công nợ quá hạn ${AGING_RANGES[activeAgingIdx].label.toLowerCase()} — cần ưu tiên thu hồi.`
                }
              </div>
            )}
          </div>
          <div className="dd-sum-update">
            Cập nhật lần cuối
            <b>{new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</b>
            {ledgerRows.length} giao dịch trong kỳ
          </div>
        </div>

        {/* Aging bar */}
        <div className="dd-aging-bar">
          {agingAmounts.map((amt, i) => {
            const pct = agingTotal > 0 ? (amt / agingTotal) * 100 : 0;
            return pct > 0
              ? <i key={i} className={`dd-seg-${i}`} style={{ width: `${pct}%` }} />
              : null;
          })}
        </div>

        {/* Aging grid */}
        <div className="dd-aging-grid">
          {AGING_RANGES.map((range, i) => {
            const amt = agingAmounts[i];
            const isActive = i === activeAgingIdx;
            const pct = agingTotal > 0 ? Math.round((amt / agingTotal) * 100) : 0;
            return (
              <div key={i} className={`dd-aging-cell${isActive ? ' dd-aging-cell--active' : ''}`}>
                <div className="dd-ac-head">
                  <span className="dd-ac-dot" style={{ background: range.dotColor }} />
                  {range.label}
                </div>
                <div className={`dd-ac-val${amt === 0 ? ' dd-ac-val--zero' : ''}`}>
                  {formatCurrency(amt).replace(' ₫', '')}đ
                </div>
                <div className="dd-ac-share">
                  {amt > 0 ? `${pct}% tổng công nợ` : 'Không phát sinh'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AP Card (dual-entity customers) ────────────────────────────── */}
      {linkedSupplierId != null && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* AP balance card */}
            <div style={{ flex: '1 1 220px', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 16px', background: '#fff7ed' }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#9a3412', marginBottom: 4 }}>
                Công nợ phải trả (NCC liên kết)
              </h3>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#c2410c', margin: 0 }}>
                {formatCurrency(apBalance)}
              </p>
              <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                Số ròng: {formatCurrency(arBalance - apBalance)}
              </p>
            </div>

          </div>
        </section>
      )}

      {/* ── Ledger Card ─────────────────────────────────────────────────── */}
      <section className="dd-ledger">
        <div className="dd-ledger-toolbar">
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
        <div className="dd-ledger-groups">
          {ledgerRouteGroups.map(routeGroup => (
            <LedgerRouteCard key={routeGroup.key} routeGroup={routeGroup} />
          ))}
          {ledgerRouteGroups.length === 0 && (
            <div className="dd-ledger-empty">
              Không có giao dịch
            </div>
          )}
        </div>
      </section>

      {/* Payment modal — FIFO across unpaid trips */}
      <Modal
        isOpen={showPay}
        title={`Ghi nhận thanh toán — ${customer.name}`}
        onClose={() => setShowPay(false)}
        onConfirm={submitPayment}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowPay(false)}>
              <X size={14} /> Hủy
            </button>
            <button
              className="btn btn--primary btn--sm"
              disabled={paySubmitting || !payAmount.trim() || !payReceipt.trim()}
              onClick={submitPayment}
            >
              {paySubmitting ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              Ghi nhận
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {payError && (
            <div style={{ padding: '10px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>
              {payError}
            </div>
          )}
          <div style={{
            padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8,
            fontSize: 13, color: 'var(--fg-2)',
          }}>
            Còn nợ: <strong style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(totalOutstanding)}
            </strong> ({unpaidTrips.length} chuyến chưa thu)
          </div>
          <div className="field">
            <label htmlFor="pay-amount" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Số tiền nhận (đ) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="pay-amount"
              className="input"
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="VD: 5000000"
              autoFocus
            />
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
              Sẽ phân bổ FIFO vào {unpaidTrips.length} chuyến chưa thu, bắt đầu từ chuyến cũ nhất.
            </p>
          </div>
          <div className="field">
            <label htmlFor="pay-receipt" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Mã biên lai / phiếu thu <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="pay-receipt"
              className="input"
              value={payReceipt}
              onChange={e => setPayReceipt(e.target.value)}
              placeholder="VD: PT-20260601-01"
            />
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
              Bắt buộc để đối chiếu với sao kê ngân hàng / sổ quỹ.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function money(value: number): string {
  return formatCurrency(value).replace(' ₫', '') + 'đ';
}

function routeContainers(items: LedgerDisplayRow[]): string[] {
  const containers = new Set<string>();
  for (const item of items) {
    const numbers = item.kind === 'group'
      ? item.containerNumbers
      : item.row.containerNumbers ?? [];
    numbers.forEach((number) => containers.add(number));
  }
  return Array.from(containers);
}

function LedgerRouteCard({ routeGroup }: { routeGroup: LedgerRouteGroup }) {
  const sections = groupLedgerSections(routeGroup.items);
  const freight = sections.find(section => section.key === 'freight');
  const serviceFees = sections.find(section => section.key === 'service-fees');
  const containers = routeContainers(routeGroup.items);
  const containerGroups = groupItemsByContainer(routeGroup.items);
  const routeParts = splitRouteTitle(routeGroup.title);

  return (
    <article className="dd-route-card">
      <div className="dd-route-card-head">
        <div className="dd-route-title">
          {routeParts ? (
            <div className="dd-route-endpoints" aria-label={routeGroup.title}>
              <div className="dd-route-endpoint">
                <span>Điểm đi</span>
                <strong>{routeParts.origin}</strong>
              </div>
              <div className="dd-route-endpoint">
                <span>Điểm đến</span>
                <strong>{routeParts.destination}</strong>
              </div>
            </div>
          ) : (
            <h3>{routeGroup.title}</h3>
          )}
          <div className="dd-route-metrics">
            <span>{routeGroup.items.length} mục</span>
            <span>{containers.length} container</span>
            {freight && <span>Doanh thu {money(freight.debit)}</span>}
            {serviceFees && <span>Phí chi hộ {money(serviceFees.debit)}</span>}
          </div>
        </div>
        <div className="dd-route-card-total">
          <span>Tổng phải thu</span>
          {routeGroup.debit > 0 && <b>{money(routeGroup.debit)}</b>}
          {routeGroup.credit > 0 && <em>{money(routeGroup.credit)} đã thu</em>}
        </div>
      </div>
      <div className="dd-route-containers">
        <LedgerAccountingLines groups={containerGroups} />
      </div>
    </article>
  );
}

function LedgerAccountingLines({ groups }: { groups: LedgerContainerGroup[] }) {
  return (
    <div className="dd-accounting-ledger">
      <div className="dd-accounting-row dd-accounting-row--head">
        <span>Ngày</span>
        <span>Container / khoản mục</span>
        <span>Loại</span>
        <span>Nợ</span>
        <span>Có</span>
      </div>
      {groups.map(group => {
        const lines = group.items.flatMap(accountingLinesForItem);
        return (
          <Fragment key={group.key}>
            <div className="dd-accounting-row dd-accounting-row--container">
              <span />
              <span>
                <b>{group.label}</b>
                <em>{group.itemCount} khoản</em>
              </span>
              <span>Tổng container</span>
              <strong>{group.debit > 0 ? money(group.debit) : '-'}</strong>
              <strong>{group.credit > 0 ? money(group.credit) : '-'}</strong>
            </div>
            {lines.map(line => (
              <div key={line.key} className="dd-accounting-row dd-accounting-row--entry">
                <span>{formatDate(line.date)}</span>
                <span>{line.label}</span>
                <span>{line.typeLabel}</span>
                <strong>{line.debit > 0 ? money(line.debit) : '-'}</strong>
                <strong>{line.credit > 0 ? money(line.credit) : '-'}</strong>
              </div>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
