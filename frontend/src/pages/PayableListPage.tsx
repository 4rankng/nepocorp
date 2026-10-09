import { useState, useMemo, useRef, useEffect } from 'react';
import { formatCurrency, moneyParts } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import type { PayablesCategory } from '@tingting/shared';
import { Search, Gift } from 'lucide-react';
import { PageHeader, Modal } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { usePayablesSummary, usePostCommission } from '../hooks/useQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { useAuth } from '../hooks/useAuth';
import { usePageAnimations } from '../hooks/animations';
import './PayableListPage.css';
import '../components/shared/HeroKpiRow.css';
import {
  CATEGORY_CHIPS,
  computeAgingTotals,
  payableDetailHref,
  type PayablesResponse,
} from '../features/payables/payableListUtils';
import { PayableAgingGrid, PayableHeroKpiRow } from '../features/payables/payableListPanels';
import { PayableDesktopTable, PayableMobileCardList } from '../features/payables/payableListRows';

// Re-exported for modules/tests that import it from the page.
export { payableDetailHref };

/* ─── Commission modal ────────────────────────────────────────────────────── */

interface CommissionForm {
  supplierId: number | '';
  amount: string;
  tripId: string;
  note: string;
}

function CommissionModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { supplierId: number; amount: number; tripId?: number; note?: string }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const { data: catalogData } = useCatalogs();
  const suppliers = useMemo(
    () => (catalogData?.suppliers ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [catalogData?.suppliers],
  );
  const [form, setForm] = useState<CommissionForm>({ supplierId: '', amount: '', tripId: '', note: '' });

  useEffect(() => {
    if (isOpen) setForm({ supplierId: '', amount: '', tripId: '', note: '' });
  }, [isOpen]);

  // Mirror the commissionSchema upper bound (≤ 1 tỷ VND) client-side so a typo
  // like 2,000,000,000 is caught here instead of surfacing as a generic 422.
  const amountNum = Number(form.amount);
  const overLimit = Number.isFinite(amountNum) && amountNum > 1_000_000_000;
  const canSubmit =
    !isPending &&
    form.supplierId !== '' &&
    form.amount.trim() !== '' &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    !overLimit;

  const handleSubmit = () => {
    if (!canSubmit || form.supplierId === '') return;
    const tripIdRaw = form.tripId.trim();
    onSubmit({
      supplierId: Number(form.supplierId),
      amount: Number(form.amount),
      tripId: tripIdRaw && Number.isFinite(Number(tripIdRaw)) ? Number(tripIdRaw) : undefined,
      note: form.note.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Ghi hoa hồng"
      onClose={onClose}
      onConfirm={handleSubmit}
      maxWidth={480}
      footer={
        <>
          <button className="btn btn--secondary btn--sm" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </button>
          <button className="btn btn--primary btn--sm" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Đang ghi...' : 'Ghi nhận'}
          </button>
        </>
      }
    >
      <div className="commission-form">
        {error && (
          <div className="commission-form__error" role="alert">{error}</div>
        )}
        <div className="field">
          <label htmlFor="commission-supplier">Nhà cung cấp <span className="req" aria-hidden="true">*</span></label>
          <select
            id="commission-supplier"
            className="input"
            value={form.supplierId}
            onChange={e => setForm(f => ({ ...f, supplierId: e.target.value === '' ? '' : Number(e.target.value) }))}
          >
            <option value="">— Chọn nhà cung cấp —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="commission-amount">Số tiền hoa hồng <span className="req" aria-hidden="true">*</span></label>
          <input
            id="commission-amount"
            className="input"
            type="number"
            min="0"
            max="1000000000"
            step="1000"
            placeholder="VD: 500000"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
          {overLimit && (
            <div className="commission-form__error" role="note">Số tiền vượt quá giới hạn tối đa 1 tỷ VND.</div>
          )}
        </div>
        <div className="field">
          <label htmlFor="commission-trip">Mã chuyến (tuỳ chọn)</label>
          <input
            id="commission-trip"
            className="input"
            type="number"
            min="1"
            placeholder="VD: 1234"
            value={form.tripId}
            onChange={e => setForm(f => ({ ...f, tripId: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="commission-note">Ghi chú (tuỳ chọn)</label>
          <input
            id="commission-note"
            className="input"
            type="text"
            maxLength={500}
            placeholder="VD: Hoa hồng giới thiệu khách"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function PayableListPage() {
  const [category, setCategory] = useState<PayablesCategory | undefined>(undefined);
  const { data, isLoading: loading, error: queryError } = usePayablesSummary(category);
  // Per-category counts live on the unfiltered response; keep it subscribed so
  // the chip row stays stable while a category is active, and hide any chip
  // that would open an empty table (kanban 091026135140). When `category` is
  // undefined this is the same query as `data`, so it costs no extra request.
  const { data: countsData } = usePayablesSummary(undefined);
  const categoryCounts = (countsData as unknown as PayablesResponse | undefined)?.categoryCounts;
  // Every chip is always rendered, in a fixed order. The chip row used to hide a
  // category whose count had not arrived yet, so the same data showed five tabs on
  // one reload and two on the next, and a chip could vanish the moment it was
  // clicked (kanban 091026235510). A chip that is genuinely empty now says so —
  // as a "0" badge plus an empty-state row — instead of disappearing, which also
  // settles the "does this tab actually filter?" doubt.
  const chipCount = (value: PayablesCategory | undefined): number | null => {
    if (value === undefined) return null;
    return categoryCounts ? categoryCounts[value] ?? 0 : null;
  };
  const payables = useMemo(
    () => (data as unknown as PayablesResponse | undefined)?.items ?? [],
    [data],
  );
  const apiTotal = (data as unknown as PayablesResponse | undefined)?.totalOutstanding;
  const apiSupplierCount = (data as unknown as PayablesResponse | undefined)?.totalSuppliers ?? 0;
  const apiOverdueCount = (data as unknown as PayablesResponse | undefined)?.overdueSuppliers ?? 0;
  const error = queryError ? (queryError as Error).message : null;
  const [search, setSearch] = useState('');
  const compact = false; // full VND everywhere — no short form (e.g. "12,5 tr")

  /* ── Commission modal ── */
  const [commissionOpen, setCommissionOpen] = useState(false);
  const postCommission = usePostCommission();
  const commissionError = postCommission.error
    ? (postCommission.error as Error).message
    : null;

  /* ── Role gate: commission posting is ADMIN/MANAGER/ACCOUNTANT (matches the
     backend requireRoles). Hide the button for other roles so they don't fill
     the form only to hit a 403. (defense in depth, code-review HIGH) ── */
  const { user } = useAuth();
  const canPostCommission =
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'ACCOUNTANT';

  /* ── Page entrance animation (custom selectors for bento zones) ── */
  const { rootRef } = usePageAnimations({
    ready: !loading,
    selectors: [
      '.hero-kpi-card',
      '.hero-kpi-mini',
      '.aging-card',
      '.payables-data-card',
    ],
  });

  /* ── Derived data ── */
  const totals = useMemo(
    () => computeAgingTotals(payables, apiTotal, apiSupplierCount, apiOverdueCount),
    [payables, apiTotal, apiSupplierCount, apiOverdueCount],
  );

  const filteredPayables = useMemo(() => {
    let result = payables;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.supplier.name.toLowerCase().includes(q) ||
        (d.supplier.phone && d.supplier.phone.toLowerCase().includes(q))
      );
    }
    return result;
  }, [payables, search]);

  // No count-up animation on this page: the header ("Tổng nợ: …") and the hero
  // card render from the same `totals.total`, but the card used to be filled in
  // by an anime.js counter over ~1.6s, so staff reading the page during the
  // count saw two different totals for the same number — QA logged an 8.244.831đ
  // gap (kanban 081026232530). Money figures are now rendered authoritatively by
  // React and there is no window in which they disagree with each other.
  // `computeAgingTotals` also guarantees they agree: `total` is the server's
  // aggregate, which equals the sum of the per-supplier rows and of the four
  // aging buckets.

  /* ── Money display parts (hero always full; aging compact on narrow cards) ── */
  const heroMoney = moneyParts(totals.total, false);
  const currentMoney = moneyParts(totals.current, compact);
  const d30Money = moneyParts(totals.d30, compact);
  const d60Money = moneyParts(totals.d60, compact);
  const over90Money = moneyParts(totals.over90, compact);

  /* ── CSV export ── */
  const handleExport = async () => {
    const headers = ['Nhà cung cấp', 'Tổng nợ', '0-30 ngày', '31-60 ngày', '61-90 ngày', '>90 ngày'];
    const rows = filteredPayables.map(d => [
      d.supplier.name,
      d.totalOutstanding,
      d.aging.current,
      d.aging.d30,
      d.aging.d60,
      d.aging.over90,
    ]);
    const filterLabel = category ? `Loại: ${category}` : 'Tất cả nhà cung cấp';
    await downloadCSV(`cong-no-phai-tra-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows, {
      title: 'SỔ CÔNG NỢ PHẢI TRẢ',
      subtitle: filterLabel + (search.trim() ? ` · Tìm: "${search.trim()}"` : ''),
      columnTypes: ['text', 'currency', 'currency', 'currency', 'currency', 'currency'],
      totalsColumns: [1, 2, 3, 4, 5],
      totalsLabel: 'TỔNG CỘNG',
    });
  };

  return (
    <div ref={rootRef} className="payables-page">
      <Breadcrumbs
        className="payables-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Công nợ phải trả' },
        ]}
      />
      <PageHeader
        title="Công nợ phải trả"
        iconName="payables"
        description={`Tổng nợ: ${formatCurrency(totals.total)} · ${totals.supplierCount} NCC · cập nhật vừa xong`}
        action={
          <div className="page-actions">
            {canPostCommission && (
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setCommissionOpen(true)}
                title="Ghi nhận khoản hoa hồng cho nhà cung cấp"
              >
                <Gift size={14} style={{ marginRight: 6 }} aria-hidden="true" />
                Ghi hoa hồng
              </button>
            )}
            <button className="btn btn--secondary btn--sm" onClick={handleExport}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Xuất báo cáo
            </button>
          </div>
        }
      />

      {/* ── Zone 1: Hero KPI Row ────────────────────────────────────────── */}
      <PayableHeroKpiRow
        totals={totals}
        heroMoney={heroMoney}
      />

      {/* ── Zone 2: Aging Distribution ──────────────────────────────────── */}
      <PayableAgingGrid
        totals={totals}
        currentMoney={currentMoney}
        d30Money={d30Money}
        d60Money={d60Money}
        over90Money={over90Money}
      />

      {/* ── Zone 3: Data Card ───────────────────────────────────────────── */}
      <div className="payables-data-card">
        {/* Category chips */}
        <div className="payables-category-chips" role="tablist" aria-label="Lọc theo loại công nợ">
          {CATEGORY_CHIPS.map(chip => {
            const isActive = chip.value === category;
            const count = chipCount(chip.value);
            return (
              <button
                key={chip.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`payables-category-chip${isActive ? ' is-active' : ''}${count === 0 ? ' is-empty' : ''}`}
                onClick={() => setCategory(chip.value)}
              >
                {chip.label}
                {count !== null && <span className="payables-category-chip__count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Toolbar row */}
        <div className="payables-toolbar">
          <div className="payables-toolbar__spacer" />
          <div className="payables-toolbar__search">
            <Search size={14} style={{ color: 'var(--ink-3)' }} />
            <input
              type="text"
              name="supplierPayableSearch"
              aria-label="Tìm công nợ theo nhà cung cấp"
              placeholder="Tìm nhà cung cấp..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="panel" style={{ padding: 16, color: 'var(--danger)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
            Đang tải dữ liệu công nợ phải trả...
          </div>
        ) : filteredPayables.length === 0 ? (
          <div className="payables-empty" role="status">
            <p className="payables-empty__title">
              {search.trim()
                ? `Không tìm thấy nhà cung cấp nào khớp "${search.trim()}"`
                : `Không có công nợ nhà cung cấp nào ở mục “${CATEGORY_CHIPS.find(c => c.value === category)?.label ?? 'Tất cả'}”`}
            </p>
            {!search.trim() && category && (
              <button type="button" className="payables-empty__reset" onClick={() => setCategory(undefined)}>
                Xem tất cả công nợ
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile card list (<=640px) ── */}
            <PayableMobileCardList payables={filteredPayables} />

            {/* ── Desktop table (>640px) ── */}
            <PayableDesktopTable payables={filteredPayables} />
          </>
        )}
      </div>

      {/* ── Commission posting modal ── */}
      <CommissionModal
        isOpen={commissionOpen}
        onClose={() => {
          if (!postCommission.isPending) setCommissionOpen(false);
        }}
        onSubmit={(data) => {
          postCommission.mutate(data, {
            onSuccess: () => setCommissionOpen(false),
          });
        }}
        isPending={postCommission.isPending}
        error={commissionError}
      />
    </div>
  );
}
