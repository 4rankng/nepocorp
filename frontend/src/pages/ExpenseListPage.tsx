import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, AlertTriangle, X, Loader2, Download, Printer, Search, SlidersHorizontal, MoreVertical } from 'lucide-react';
import { api } from '../lib/api';
import { configClient } from '../api/configClient';
import { formatCurrency, formatNumber, formatDate, formatDatePadded } from '../lib/format';
import { splitKpi } from '../features/dashboard/utils';
import { PageHeader } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { Alert } from '../components/shared/Alert';
import { EmptyState, Pagination, useDebouncedValue } from '../design-system';
import { ClickableCard } from '../components/shared/ClickableCard';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useCatalogs } from '../hooks/useCatalogs';
import { useMonth } from '../hooks/useMonth';
import { getCalendarMonthRange } from '../lib/calendar-month';
import { useQuery } from '@tanstack/react-query';
import { usePageAnimations, useListAnimations } from '../hooks/animations';
import { FINANCIAL } from '@tingting/shared';
import type { ExpenseWithRefs, PaginatedResponse } from '@tingting/shared';
import { qk } from '../api/keys';
import { resolveExpenseCatalogs } from '../features/expenses/expenseCatalogs';
import type { ExpenseCatalogs } from '../features/expenses/expenseCatalogs';
import { buildExpenseListSearchParams } from '../features/expenses/expense-list-query';
import { useExpensesSummary, fetchAllFilteredExpenses } from '../features/expenses/expenseTotals';
import { downloadCSV, type ColumnType } from '../lib/csv';
import { printSheet, PRINT_OUTCOME_TOAST } from '../lib/download';
import { buildPrintableSheetHtml } from '../lib/printSheet';
import { useToast } from '../components/shared/Toast';
// Density tokens (--table-row-min-h base) from the NEPO-16 primitive bundle.
import '../design-system/Density.css';
import './ExpenseListPage.css';

const PAGE_SIZE = 20;

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  PAID: '#059669',
  UNPAID: '#D97706',
};

const COMPONENT_LABELS: Record<'COMPANY' | 'TRUCK' | 'TRAILER', string> = {
  COMPANY: 'Công ty',
  TRUCK: 'Đầu kéo',
  TRAILER: 'Rơ-moóc',
};

// eslint-disable-next-line react-refresh/only-export-components -- page-scoped query hook co-located with its consumer page
export function useExpenses(params: {
  page: number;
  categoryId?: number;
  truckId?: number;
  vehicleComponent?: 'COMPANY' | 'TRUCK' | 'TRAILER';
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}) {
  const qs = buildExpenseListSearchParams({ ...params, pageSize: PAGE_SIZE });

  return useQuery<PaginatedResponse<ExpenseWithRefs>>({
    queryKey: qk.financial.expenses(params),
    queryFn: () => api.get(`${FINANCIAL.EXPENSES}?${qs}`),
  });
}

/**
 * NEPO-24: the toolbar changes SHAPE across breakpoints (which controls sit
 * inline vs. inside the "Bộ lọc" popover/bottom sheet), so the page needs the
 * matchMedia flags instead of CSS-only hiding — that keeps every control at
 * exactly one place in the DOM per width and the labels unique for a11y.
 * Without matchMedia (jsdom) it falls back to the mid-size layout.
 */
function useToolbarBreakpoints(): { isCompact: boolean; isWide: boolean } {
  const [flags, setFlags] = useState({ isCompact: false, isWide: false });
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mqCompact = window.matchMedia('(max-width: 640px)');
    const mqWide = window.matchMedia('(min-width: 1280px)');
    const sync = () => setFlags({ isCompact: mqCompact.matches, isWide: mqWide.matches });
    sync();
    mqCompact.addEventListener('change', sync);
    mqWide.addEventListener('change', sync);
    return () => {
      mqCompact.removeEventListener('change', sync);
      mqWide.removeEventListener('change', sync);
    };
  }, []);
  return flags;
}

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const { month, year } = useMonth();
  const monthRange = useMemo(() => getCalendarMonthRange(year, month), [month, year]);
  const monthKey = `${year}-${month}`;
  const { isCompact, isWide } = useToolbarBreakpoints();

  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [truckId, setTruckId] = useState<number | ''>('');
  const [vehicleComponent, setVehicleComponent] = useState<'' | 'COMPANY' | 'TRUCK' | 'TRAILER'>('');
  const [isExporting, setIsExporting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => ({
    monthKey,
    dateFrom: monthRange.start,
    dateTo: monthRange.end,
  }));
  // A stale local date selection must never survive a topbar month change.
  const dateFrom = dateRange.monthKey === monthKey ? dateRange.dateFrom : monthRange.start;
  const dateTo = dateRange.monthKey === monthKey ? dateRange.dateTo : monthRange.end;
  // NEPO-24: one search box for "NCC, mã phiếu" replaces the old supplier
  // dropdown; debounced so typing does not fire a request per keystroke.
  const searchQ = useDebouncedValue(searchText.trim(), 300);

  // A page that exists in one month may not exist in the next. Reset before
  // querying so a smaller month cannot look falsely empty.
  useEffect(() => {
    setPage(1);
  }, [monthKey]);

  // Esc closes the "Bộ lọc" popover / bottom sheet and the mobile actions menu.
  useEffect(() => {
    if (!overflowOpen && !actionsMenuOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { setOverflowOpen(false); setActionsMenuOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overflowOpen, actionsMenuOpen]);

  const { data: expenseData, isLoading, error: queryError, refetch } = useExpenses({
    page,
    categoryId: categoryId || undefined,
    truckId: truckId || undefined,
    vehicleComponent: vehicleComponent || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    q: searchQ || undefined,
  });

  // NEPO-17: the KPI figures aggregate EVERY filtered row, not just the
  // visible page. The summary query is keyed on filters only, so paging never
  // changes (or refetches) it.
  const filters = useMemo(() => ({
    categoryId: categoryId || undefined,
    truckId: truckId || undefined,
    vehicleComponent: vehicleComponent || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    q: searchQ || undefined,
  }), [categoryId, truckId, vehicleComponent, dateFrom, dateTo, searchQ]);
  const { data: summary, isLoading: summaryLoading } = useExpensesSummary({ page: 1, pageSize: PAGE_SIZE, ...filters });

  const { rootRef } = usePageAnimations({ ready: !isLoading });

  const { data: catalogData } = useCatalogs();
  const trucks = catalogData?.trucks ?? [];

  const { data: expenseCatalogs, isLoading: loadingExpenseCatalogs } = useQuery({
    queryKey: qk.tripForm.expenseFormCatalogs,
    queryFn: async (): Promise<ExpenseCatalogs> => {
      const [suppliers, categories] = await Promise.all([
        configClient.getAllSuppliers(),
        configClient.getAllExpenseCategories(),
      ]);
      return { suppliers, categories };
    },
    staleTime: 60 * 1000,
  });
  const { categories } = resolveExpenseCatalogs(expenseCatalogs);

  const expenses = expenseData?.items ?? [];
  const total = expenseData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const error = queryError ? 'Không thể tải dữ liệu' : null;

  useListAnimations({
    itemSelector: '.expense-table tbody tr',
    mode: 'rows',
    deps: [expenses, isLoading],
  });
  useListAnimations({
    itemSelector: '.m-card',
    mode: 'cards',
    deps: [expenses, isLoading],
  });

  const dateRangeActive = dateFrom !== monthRange.start || dateTo !== monthRange.end;
  const hasFilters = !!searchQ || !!categoryId || !!truckId || !!vehicleComponent || dateRangeActive;

  const resetFilters = () => {
    setSearchText('');
    setCategoryId('');
    setTruckId('');
    setVehicleComponent('');
    setDateRange({ monthKey, dateFrom: monthRange.start, dateTo: monthRange.end });
    setPage(1);
  };

  /** Active filter chips under the toolbar (NEPO-24: remove-one affordance). */
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (searchQ) activeChips.push({ key: 'q', label: `Tìm: ${searchText.trim()}`, onRemove: () => setSearchText('') });
  if (categoryId) {
    const name = categories.find(c => c.id === categoryId)?.name ?? `#${categoryId}`;
    activeChips.push({ key: 'cat', label: `Hạng mục: ${name}`, onRemove: () => { setCategoryId(''); setPage(1); } });
  }
  if (truckId) {
    const plate = trucks.find(t => t.id === truckId)?.licensePlate ?? `#${truckId}`;
    activeChips.push({ key: 'truck', label: `Xe: ${plate}`, onRemove: () => { setTruckId(''); setPage(1); } });
  }
  if (vehicleComponent) {
    activeChips.push({ key: 'comp', label: `Loại: ${COMPONENT_LABELS[vehicleComponent]}`, onRemove: () => { setVehicleComponent(''); setPage(1); } });
  }
  if (dateRangeActive) {
    activeChips.push({
      key: 'dates',
      label: `Kỳ ${formatDate(dateFrom)} – ${formatDate(dateTo)}`,
      onRemove: () => { setDateRange({ monthKey, dateFrom: monthRange.start, dateTo: monthRange.end }); setPage(1); },
    });
  }
  // The "Bộ lọc" button counts the filters that LIVE inside its popover:
  // on compact screens that is everything except search, on tablet just the
  // two selects that collapse there.
  const overflowCount = (isCompact
    ? [categoryId, truckId, vehicleComponent, dateRangeActive]
    : [truckId, vehicleComponent]
  ).filter(Boolean).length;

  /**
   * Exports walk every filtered page via the shared bounded walker in
   * `expenseTotals.ts` — the same one the metric header uses, so the sheet
   * and the header can never disagree about what the filters matched.
   */
  const EXPENSE_SHEET_HEADERS = ['Ngày phát sinh', 'Nhà cung cấp', 'Hạng mục', 'Xe', 'Thành phần', 'Số tiền', 'Trạng thái', 'Ghi chú'];
  const EXPENSE_SHEET_TYPES: ColumnType[] = ['date', 'text', 'text', 'text', 'text', 'currency', 'text', 'text'];

  const expenseToSheetRow = (expense: ExpenseWithRefs) => [
    formatDate(expense.expenseDate),
    expense.supplier?.name ?? '—',
    expense.category?.name ?? '—',
    expense.vehicleComponent === 'TRAILER' ? expense.trailer?.licensePlate ?? '—' : expense.truck?.licensePlate ?? '—',
    expense.vehicleComponent === 'TRAILER' ? 'Rơ-moóc' : expense.vehicleComponent === 'TRUCK' ? 'Đầu kéo' : '—',
    formatCurrency(Number(expense.amount)),
    expense.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Ghi nợ',
    expense.note ?? '',
  ];

  const expenseSheetSubtitle = (count: number) =>
    `Kỳ ${formatDate(dateFrom)} – ${formatDate(dateTo)} · ${count} khoản chi phí`;

  const downloadMonthlySummary = async () => {
    setIsExporting(true);
    try {
      const expenses = await fetchAllFilteredExpenses({ page: 1, pageSize: PAGE_SIZE, ...filters });
      await downloadCSV(
        `tong-ket-chi-phi-${dateFrom}-${dateTo}.xlsx`,
        EXPENSE_SHEET_HEADERS,
        expenses.map(expenseToSheetRow),
        {
          title: 'Tổng kết chi phí phát sinh',
          subtitle: expenseSheetSubtitle(expenses.length),
          columnTypes: EXPENSE_SHEET_TYPES,
          totalsColumns: [5],
        },
      );
    } catch (err: unknown) {
      // Previously a rejected fetch fell straight through to `finally`: both
      // buttons re-enabled, nothing downloaded, and NO error was ever shown —
      // which is exactly the silent failure reported as a button "kẹt" at
      // "Đang chuẩn bị…" (kanban 101026003010).
      showToast({ kind: 'error', message: `Không tải được chi phí để xuất: ${(err as Error).message}` });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Print the same sheet straight from the browser.
   *
   * The expense pages had no print control at all, only the .xlsx export
   * (kanban 091026235500). Printing goes through `printSheet` so the sheet is
   * printed from a tab of its own: `window.print()` is modal, so printing from
   * this page froze the app (buttons stayed disabled at "Đang chuẩn bị…", no
   * dialog, no download — kanban 101026102000).
   */
  const printExpenseSheet = async () => {
    setIsExporting(true);
    try {
      const expenses = await fetchAllFilteredExpenses({ page: 1, pageSize: PAGE_SIZE, ...filters });
      const html = buildPrintableSheetHtml(
        EXPENSE_SHEET_HEADERS,
        expenses.map(expenseToSheetRow),
        {
          title: 'Tổng kết chi phí phát sinh',
          subtitle: expenseSheetSubtitle(expenses.length),
          columnTypes: EXPENSE_SHEET_TYPES,
          totalsColumns: [5],
        },
      );
      showToast(PRINT_OUTCOME_TOAST[printSheet(html, () => showToast(PRINT_OUTCOME_TOAST.blocked))]);
    } catch (err: unknown) {
      // Same silent-failure hole as the .xlsx export above: without this the
      // buttons simply re-enabled and the accountant got no explanation
      // (kanban 101026003010).
      showToast({ kind: 'error', message: `Không in được: ${(err as Error).message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // NEPO-17: while the full walk is in flight the metric shows "no value yet"
  // — a page-1-only 0 ₫ that later jumps was exactly the wrong-number defect.
  const kpiTotal = splitKpi(summary?.totalAmount ?? 0);
  // NEPO-17 AC3: the Thành phần/Xe columns auto-hide when the filtered set
  // (all pages, not just the visible one) has no component/vehicle on any
  // row. The predicate comes from the shared AutoHideColumn primitive, fed by
  // the same walk that feeds the header metric. Columns stay visible until
  // the data lands.
  const showVehicleColumn = summary ? summary.hasVehicleData : true;
  const showComponentColumn = summary ? summary.hasComponentData : true;
  const columnCount = 6 + (showVehicleColumn ? 1 : 0) + (showComponentColumn ? 1 : 0);

  const renderStatusBadge = (status: string) => status === 'PAID' ? (
    <span className="expense-status expense-status--paid">
      <span className="expense-status__dot" /> Đã trả
    </span>
  ) : (
    <span className="expense-status expense-status--unpaid">
      <span className="expense-status__dot" /> Ghi nợ
    </span>
  );

  const renderEmptyState = () => (
    <EmptyState
      illustration="/assets/illustrations/empty-expenses.svg"
      title="Chưa có khoản chi phí nào."
      action={<button className="btn btn--primary" onClick={() => navigate('/expenses/new')}><Plus size={15} /> Thêm phiếu chi</button>}
    />
  );

  const renderLoadingState = () => (
    <div className="expense-loading">
      <Loader2 size={22} className="spin" style={{ display: 'inline-block', marginBottom: 8 }} />
      <p>Đang tải…</p>
    </div>
  );

  /* ── Toolbar controls ──────────────────────────────────────────────────
     Each control is a const so the inline toolbar and the "Bộ lọc"
     popover/bottom sheet can render the SAME controlled select at most once
     per breakpoint (labels stay unique for a11y and tests). */
  const categorySelect = (
    <select
      className="expense-toolbar__select"
      aria-label="Hạng mục"
      value={categoryId}
      disabled={loadingExpenseCatalogs}
      onChange={e => { setCategoryId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
    >
      <option value="">{loadingExpenseCatalogs ? 'Đang tải hạng mục…' : 'Tất cả hạng mục'}</option>
      {categories.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );

  const truckSelect = (
    <select
      className="expense-toolbar__select"
      aria-label="Xe"
      value={truckId}
      onChange={e => { setTruckId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
    >
      <option value="">Tất cả xe</option>
      {trucks.map(t => (
        <option key={t.id} value={t.id}>{t.licensePlate}</option>
      ))}
    </select>
  );

  // Loại chi phí — company-level rows store vehicle_component = NULL,
  // so 'Chi phí công ty' maps to a dedicated backend filter branch.
  const componentSelect = (
    <select
      className="expense-toolbar__select"
      aria-label="Loại chi phí"
      value={vehicleComponent}
      onChange={e => { setVehicleComponent(e.target.value as '' | 'COMPANY' | 'TRUCK' | 'TRAILER'); setPage(1); }}
    >
      <option value="">Tất cả loại chi phí</option>
      <option value="COMPANY">Chi phí công ty</option>
      <option value="TRUCK">Xe (Đầu kéo)</option>
      <option value="TRAILER">Rơ-moóc</option>
    </select>
  );

  const dateRangeControl = (
    <div className="expense-toolbar__dates" role="group" aria-label="Khoảng ngày phát sinh">
      <input
        type="date"
        name="expenseDateFrom"
        aria-label="Từ ngày phát sinh"
        className="expense-toolbar__date"
        value={dateFrom}
        min={monthRange.start}
        max={monthRange.end}
        onChange={e => { setDateRange(current => ({ ...current, monthKey, dateFrom: e.target.value })); setPage(1); }}
        placeholder="Từ ngày"
      />
      <span className="expense-toolbar__dates-sep" aria-hidden="true">–</span>
      <input
        type="date"
        name="expenseDateTo"
        aria-label="Đến ngày phát sinh"
        className="expense-toolbar__date"
        value={dateTo}
        min={monthRange.start}
        max={monthRange.end}
        onChange={e => { setDateRange(current => ({ ...current, monthKey, dateTo: e.target.value })); setPage(1); }}
        placeholder="Đến ngày"
      />
    </div>
  );

  // Wide (≥1280): every control inline, no popover. Mid (641–1279): hạng mục
  // + khoảng ngày stay inline, xe + loại chi collapse into the popover.
  // Compact (≤640): only search + the "Bộ lọc" bottom-sheet trigger stay up.
  const inlineControls = isWide
    ? [categorySelect, truckSelect, componentSelect, dateRangeControl]
    : isCompact
      ? []
      : [categorySelect, dateRangeControl];
  const panelControls = isCompact
    ? [categorySelect, truckSelect, componentSelect, dateRangeControl]
    : [truckSelect, componentSelect];

  return (
    <div ref={rootRef} className="expense-list-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <Breadcrumbs
        className="expense-list-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Chi phí phát sinh' },
        ]}
      />
      <PageHeader
        title="Chi phí phát sinh"
        iconName="expense"
        metrics={
          <div className="expense-metric">
            <div className="expense-metric__item">
              <span className="expense-metric__label">Tổng chi tiêu tháng</span>
              <span className="expense-metric__value">
                {summaryLoading ? '—' : kpiTotal.num}
                {!summaryLoading && (
                  <span className="expense-metric__unit">{kpiTotal.suffix ? ` ${kpiTotal.suffix}` : ''} ₫</span>
                )}
              </span>
              <span className="expense-metric__sub">
                {summaryLoading ? '—' : `${total} phiếu · đã trả ${formatNumber(summary?.paidAmount ?? 0)}`}
              </span>
            </div>
            {/* NEPO-24: the unpaid chip renders ONLY when there is something
                unpaid — a "0 ₫ chưa trả" badge is noise (consult verdict). */}
            {!summaryLoading && (summary?.unpaidCount ?? 0) > 0 && (
              <span className="expense-metric__chip">
                Chưa trả {summary?.unpaidCount} phiếu · {formatNumber(summary?.unpaidAmount ?? 0)} ₫
              </span>
            )}
          </div>
        }
        action={
          isCompact ? (
            /* NEPO-24 (d): compact header — icon "+ Thêm phiếu" 40px + an
               overflow 40px holding "PDF (In)" / "Tải tổng kết". */
            <div className="expense-actions-compact">
              <button
                className="btn btn--primary"
                aria-label="Thêm phiếu chi"
                onClick={() => navigate('/expenses/new')}
              >
                <Plus size={18} />
              </button>
              <div className="expense-actions-compact__wrap">
                <button
                  className="btn btn--secondary"
                  aria-label="Xuất và in"
                  aria-expanded={actionsMenuOpen}
                  onClick={() => setActionsMenuOpen(open => !open)}
                >
                  {isExporting ? <Loader2 size={16} className="spin" /> : <MoreVertical size={16} />}
                </button>
                {actionsMenuOpen && (
                  <>
                    <div className="expense-actions-compact__overlay" onClick={() => setActionsMenuOpen(false)} />
                    <div className="expense-actions-compact__menu" role="menu" aria-label="Xuất và in">
                      <button role="menuitem" disabled={isExporting} onClick={() => { setActionsMenuOpen(false); void printExpenseSheet(); }}>
                        <Printer size={15} /> PDF (In)
                      </button>
                      <button role="menuitem" disabled={isExporting} onClick={() => { setActionsMenuOpen(false); void downloadMonthlySummary(); }}>
                        <Download size={15} /> {isExporting ? 'Đang chuẩn bị…' : 'Tải tổng kết'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--secondary" onClick={() => void printExpenseSheet()} disabled={isExporting}>
                {isExporting ? <Loader2 size={15} className="spin" /> : <Printer size={15} />}
                PDF (In)
              </button>
              <button className="btn btn--secondary" onClick={() => void downloadMonthlySummary()} disabled={isExporting}>
                {isExporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                {isExporting ? 'Đang chuẩn bị…' : 'Tải tổng kết'}
              </button>
              <button className="btn btn--primary" onClick={() => navigate('/expenses/new')}>
                <Plus size={15} /> Thêm phiếu chi
              </button>
            </div>
          )
        }
      />

      {/* ── Toolbar (1 hàng desktop · popover tablet · bottom sheet mobile) ── */}
      <div className="expense-toolbar">
        <div className="expense-toolbar__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Tìm NCC, mã phiếu"
            placeholder="Tìm NCC, mã phiếu…"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setPage(1); }}
          />
          {searchText && (
            <button
              type="button"
              className="expense-toolbar__search-clear"
              aria-label="Xóa tìm kiếm"
              onClick={() => { setSearchText(''); setPage(1); }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {inlineControls}

        {!isWide && (
          <button
            type="button"
            className="expense-toolbar__more"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(open => !open)}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Bộ lọc{overflowCount > 0 ? ` (${overflowCount})` : ''}
          </button>
        )}

        {isWide && hasFilters && (
          <button type="button" className="expense-toolbar__reset" onClick={resetFilters}>
            <X size={12} /> Xóa bộ lọc
          </button>
        )}

        {overflowOpen && !isWide && (
          <>
            <div className="expense-toolbar__overlay" onClick={() => setOverflowOpen(false)} />
            <div
              className={`expense-toolbar__panel${isCompact ? ' expense-toolbar__panel--sheet' : ''}`}
              role="dialog"
              aria-label="Bộ lọc bổ sung"
            >
              <div className="expense-toolbar__panel-head">
                <span>Bộ lọc</span>
                <button type="button" aria-label="Đóng bộ lọc" onClick={() => setOverflowOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              {panelControls}
            </div>
          </>
        )}
      </div>

      {/* Active-filter chips — tablet/mobile only (the wide toolbar already
          shows every control inline). Horizontal scroll, 24px tall. */}
      {!isWide && activeChips.length > 0 && (
        <div className="expense-chips" role="list" aria-label="Bộ lọc đang áp dụng">
          {activeChips.map(chip => (
            <span key={chip.key} className="expense-chip" role="listitem">
              {chip.label}
              <button type="button" aria-label={`Bỏ lọc ${chip.label}`} onClick={chip.onRemove}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" className="expense-chip expense-chip--reset" onClick={resetFilters}>
            <X size={12} /> Xóa bộ lọc
          </button>
        </div>
      )}

      {error && (
        <Alert
          variant="error"
          style="soft"
          icon={<AlertTriangle size={16} />}
          className="mb-5"
          action={<button className="btn btn--secondary btn--sm" onClick={() => refetch()}>Thử lại</button>}
        >
          {error}
        </Alert>
      )}

      {/* Mobile card view — NEPO-24 (d): ngày + pill / NCC / hạng mục · xe ·
          bộ phận, số tiền 16/600 căn phải + chevron 16. */}
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {isLoading ? (
            renderLoadingState()
          ) : expenses.length === 0 ? (
            renderEmptyState()
          ) : (
            expenses.map(e => {
              const plate = e.vehicleComponent === 'TRAILER'
                ? e.trailer?.licensePlate
                : e.truck?.licensePlate;
              const subParts = [
                e.category?.name,
                plate,
                e.vehicleComponent ? COMPONENT_LABELS[e.vehicleComponent] : null,
              ].filter(Boolean);
              const backfilled = e.createdAt?.slice(0, 10) && e.createdAt.slice(0, 10) !== e.expenseDate.slice(0, 10);
              return (
                <ClickableCard
                  key={e.id}
                  to={`/expenses/${e.id}/edit`}
                  className="m-card m-card--strip expense-mcard"
                  style={{ cursor: 'pointer' }}
                >
                  <StatusStrip color={EXPENSE_STATUS_COLORS[e.paymentStatus] ?? '#999'} />
                  <div className="expense-mcard__top">
                    <span className="expense-mcard__date">
                      {formatDatePadded(e.expenseDate)}
                      {backfilled && (
                        <span className="expense-mcard__date-meta" title="Ngày nhập dữ liệu (khác ngày phát sinh = nhập luồng)">
                          · Nhập {formatDatePadded(e.createdAt)}
                        </span>
                      )}
                    </span>
                    {renderStatusBadge(e.paymentStatus)}
                  </div>
                  <div className="expense-mcard__main">
                    <span className="expense-mcard__lines">
                      <span className="expense-mcard__supplier">{e.supplier?.name || '—'}</span>
                      <span className="expense-mcard__sub">{subParts.length > 0 ? subParts.join(' · ') : 'Không gắn xe'}</span>
                    </span>
                    <span className={`expense-amount expense-amount--${e.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>
                      {formatCurrency(e.amount)}
                    </span>
                    <ChevronRight size={16} className="expense-mcard__chevron" aria-hidden="true" />
                  </div>
                </ClickableCard>
              );
            })
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="desktop-only expense-table-wrap">
        <div className="expense-table-scroll">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Ngày phát sinh</th>
                <th>Nhà cung cấp</th>
                <th>Hạng mục</th>
                {showVehicleColumn && <th>Xe</th>}
                {showComponentColumn && <th>Thành phần</th>}
                <th className="num">Số tiền</th>
                <th>Trạng thái</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columnCount}>{renderLoadingState()}</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={columnCount}>{renderEmptyState()}</td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id} role="button" tabIndex={0}
                    className="expense-row--strip"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/expenses/${e.id}/edit`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/expenses/${e.id}/edit`); } }}
                  >
                    <td className="expense-date">
                      <StatusStrip color={EXPENSE_STATUS_COLORS[e.paymentStatus] ?? '#999'} />
                      <span className="expense-date__primary">{formatDatePadded(e.expenseDate)}</span>
                      {e.createdAt?.slice(0, 10) && e.createdAt.slice(0, 10) !== e.expenseDate.slice(0, 10) && (
                        <span
                          className="expense-date__meta"
                          title="Ngày nhập dữ liệu (khác ngày phát sinh = nhập luồng)"
                        >
                          <span className="expense-date__label">Nhập</span>
                          {formatDatePadded(e.createdAt)}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.supplier?.name || '—'}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{e.category?.name || '—'}</td>
                    {showVehicleColumn && (
                      <td>
                        {e.vehicleComponent === 'TRAILER'
                          ? (e.trailer?.licensePlate ? <span className="expense-plate">{e.trailer.licensePlate}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>)
                          : (e.truck?.licensePlate ? <span className="expense-plate">{e.truck.licensePlate}</span> : <span style={{ color: 'var(--ink-4)' }}>—</span>)
                        }
                      </td>
                    )}
                    {showComponentColumn && (
                      <td style={{ color: 'var(--ink-2)' }}>{e.vehicleComponent === 'TRAILER' ? 'Rơ-mooc' : e.vehicleComponent === 'TRUCK' ? 'Đầu kéo' : ''}</td>
                    )}
                    <td className={`num expense-amount expense-amount--${e.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>
                      {formatCurrency(e.amount)}
                    </td>
                    <td>
                      {renderStatusBadge(e.paymentStatus)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ChevronRight size={16} style={{ color: 'var(--ink-4)' }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — shared design-system primitive (NEPO-16/17): with a
            single page only the count line renders, no dead buttons. No total
            row here — the header metric already owns the totals (NEPO-24). */}
        <div className="expense-table-foot">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            summary={(
              <span>
                Đang hiển thị{' '}
                <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                  {total === 0 ? 0 : `${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)}`}
                </strong>{' '}
                trên <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{total}</strong> phiếu
              </span>
            )}
          />
        </div>
      </div>
    </div>
  );
}
