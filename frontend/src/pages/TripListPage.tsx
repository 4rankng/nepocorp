import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { MousePointerClick, Save, X } from 'lucide-react';
import { tripClient } from '../api/tripClient';
import { qk } from '../api/keys';
import { formatCurrency } from '../lib/format';
import { parseThreshold, Role, TripStatus, type TripDetail } from '@tingting/shared';
import { useFuelConfig } from '../hooks/useQueries';
import { useAuth } from '../hooks/useAuth';
import { useMonth } from '../hooks/useMonth';
import { getCalendarMonthRange } from '../lib/calendar-month';
import { ClickableCard } from '../components/shared/ClickableCard';
import { Breadcrumbs, Alert } from '../components/shared';
import { useDebouncedValue, useTableQueryState, EmptyState, Pagination } from '../design-system';
import { buildTripColumns, tripRowStyle, TripMobileCard, TripFiltersBar, breakdownPctFromCounts, defaultStatusCounts, DEFAULT_WARN_THRESHOLD, PAGE_SIZE, createTripListReturnState, readTripListReturnState, shouldSyncTripListReturnState, type StatusFilter, type StatusCounts, type TripQuickEditDraft, getMissingPlanFields, isTripToday } from '../features/trips';
import { TRIP_LIST_EXPORT_HEADERS, buildTripListExportRows } from '../features/trips/tripListExport';
import { TripQuickEditMobileCard } from '../features/trips/tripQuickEditCard';
import { columnClass, draftChanged, figuresPayloadFromDraft, invalidQuickField, isEditableInQuickMode, quickDraftFromTrip, QUICK_DRAFT_FIELD_LABELS } from './trip-list-helpers';
import { TripListHero } from './trip-list-hero';
import { useTripListAnimations } from './use-trip-list-animations';
import './TripListPage.css';
import { resolveEmptyIllustration } from '../lib/emptyIllustrations';

// The export helpers and the quick-edit summary now live in features/trips;
// they are re-exported here so the page keeps its public surface unchanged.
export { TRIP_LIST_EXPORT_HEADERS, buildTripListExportRows } from '../features/trips/tripListExport';
export { QuickEditTripSummary } from '../features/trips/tripQuickEditCard';

export default function TripListPage() {
  const rootRef = useTripListAnimations();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { month, year, setMonthYear } = useMonth();
  const { data: fuelConfig } = useFuelConfig();
  const canCopyPlan = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  const warnThreshold = useMemo(
    () => (fuelConfig
      ? parseThreshold(fuelConfig.warningThreshold, DEFAULT_WARN_THRESHOLD)
      : DEFAULT_WARN_THRESHOLD),
    [fuelConfig],
  );

  const restoredList = readTripListReturnState(location.state)?.tripList;
  const restoredFilters = restoredList;
  const hasAppliedReturnPeriod = useRef(false);

  // A list can remount after the user has opened a detail page (for example
  // after a refresh). Restore the period alongside the saved filters so the
  // list never silently falls back to the latest month.
  useLayoutEffect(() => {
    if (hasAppliedReturnPeriod.current) return;
    hasAppliedReturnPeriod.current = true;

    if (
      restoredList?.month !== undefined
      && restoredList.year !== undefined
      && (month !== restoredList.month || year !== restoredList.year)
    ) {
      setMonthYear(restoredList.month, restoredList.year);
    }
  }, [month, restoredList?.month, restoredList?.year, setMonthYear, year]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => restoredFilters?.statusFilter ?? '');
  const [truckFilter, setTruckFilter] = useState<number | ''>(() => restoredFilters?.truckFilter ?? '');
  const [customerFilter, setCustomerFilter] = useState<number | ''>(() => restoredFilters?.customerFilter ?? '');
  const [searchInput, setSearchInput] = useState(() => restoredFilters?.searchInput ?? '');
  const [quickEdit, setQuickEdit] = useState(false);
  const [quickDrafts, setQuickDrafts] = useState<Record<number, TripQuickEditDraft>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [quickErrors, setQuickErrors] = useState<Record<number, string>>({});
  const [quickMessage, setQuickMessage] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [copyingPlanId, setCopyingPlanId] = useState<number | null>(null);
  const [copyPlanMessage, setCopyPlanMessage] = useState('');
  const [copyPlanError, setCopyPlanError] = useState(false);
  const detailState = useMemo(() => createTripListReturnState({
    month,
    year,
    statusFilter,
    truckFilter,
    customerFilter,
    searchInput,
  }), [customerFilter, month, searchInput, statusFilter, truckFilter, year]);

  // Store the active filters on the list's existing history entry. Browser
  // Back from a detail page can then restore the same list instead of a fresh,
  // unfiltered page.
  useEffect(() => {
    if (shouldSyncTripListReturnState(location.state, detailState)) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: detailState });
    }
  }, [detailState, location.pathname, location.search, location.state, navigate]);

  // Trips are operational records, so a topbar month means the calendar month
  // (not the configured payroll cycle, which can start in the previous month).
  const { start: dateFrom, end: dateTo } = useMemo(
    () => getCalendarMonthRange(year, month),
    [month, year],
  );

  // Search intent: bypass the month chip when typing a specific trip code.
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const searching = debouncedSearch.length > 0;
  const listDateFrom = searching ? undefined : dateFrom;
  const listDateTo = searching ? undefined : dateTo;

  // The list query state. Replaces ~80 lines of useState/useEffect/useMemo.
  const table = useTableQueryState<TripDetail, {
    status?: string;
    truckId?: number;
    customerId?: number;
    dateFrom?: string;
    dateTo?: string;
  }>({
    endpoint: (params) => tripClient.listTrips({
      page: params.page,
      limit: params.limit,
      status: params.status,
      truckId: params.truckId,
      customerId: params.customerId,
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    queryKey: qk.trips.all,
    defaultPageSize: PAGE_SIZE,
    initialSearch: '',
    accumulate: true,
  });
  // Apply the form-state filters and search into the table hook. We do
  // this via a one-way assignment so the table hook stays the source of
  // truth for query execution.
  useEffect(() => {
    table.setSearch(debouncedSearch);
  // table omitted from deps: setSearch is a stable useCallback ref inside useTableQueryState
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  useEffect(() => {
    table.setFilters({
      status: statusFilter || undefined,
      truckId: truckFilter || undefined,
      customerId: customerFilter || undefined,
      dateFrom: listDateFrom,
      dateTo: listDateTo,
    });
  // table omitted from deps: setFilters is a stable useCallback ref inside useTableQueryState
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, truckFilter, customerFilter, listDateFrom, listDateTo]);

  // ── Summary query ──
  const { data: summary } = useQuery({
    queryKey: qk.trips.summary(dateFrom, dateTo),
    queryFn: () => tripClient.getTripsSummary({ dateFrom, dateTo }),
    enabled: !!dateFrom && !!dateTo,
    staleTime: 30 * 1000,
  });

  const statusCounts: StatusCounts = useMemo(() => {
    const raw = summary?.statusCounts as Partial<StatusCounts> | undefined;
    if (!raw) return defaultStatusCounts();
    return {
      all: raw.all ?? 0,
      [TripStatus.CREATED]: raw[TripStatus.CREATED] ?? 0,
      [TripStatus.IN_TRANSIT]: raw[TripStatus.IN_TRANSIT] ?? 0,
      [TripStatus.COMPLETED]: raw[TripStatus.COMPLETED] ?? 0,
      [TripStatus.LOCKED]: raw[TripStatus.LOCKED] ?? 0,
      [TripStatus.CANCELED]: raw[TripStatus.CANCELED] ?? 0,
    };
  }, [summary]);
  const breakdownPct = useMemo(() => breakdownPctFromCounts(statusCounts), [statusCounts]);
  const truckOptions = summary?.truckOptions ?? [];
  const customerOptions = summary?.customerOptions ?? [];

  useEffect(() => {
    if (!quickEdit) return;
    setQuickDrafts((prev) => {
      const next = { ...prev };
      for (const trip of table.rows) {
        if (!next[trip.id]) next[trip.id] = quickDraftFromTrip(trip);
      }
      return next;
    });
  }, [quickEdit, table.rows]);

  const toggleQuickEdit = useCallback(() => {
    setQuickEdit((current) => {
      const next = !current;
      setQuickErrors({});
      setQuickMessage('');
      setSelectedIds(new Set());
      setQuickDrafts(next
        ? Object.fromEntries(table.rows.map((trip) => [trip.id, quickDraftFromTrip(trip)]))
        : {});
      return next;
    });
  }, [table.rows]);

  const handleToggleSelect = useCallback((tripId: number) => {
    const trip = table.rows.find((item) => item.id === tripId);
    if (!trip || !isEditableInQuickMode(trip)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  }, [table.rows]);

  const handleSelectVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const editableIds = table.rows.filter(isEditableInQuickMode).map((trip) => trip.id);
      const allVisibleSelected = editableIds.length > 0 && editableIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of editableIds) {
        if (allVisibleSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [table.rows]);

  const handleDraftChange = useCallback((tripId: number, field: keyof TripQuickEditDraft, value: string) => {
    const trip = table.rows.find((item) => item.id === tripId);
    if (!trip || !isEditableInQuickMode(trip)) return;
    setQuickDrafts((prev) => ({
      ...prev,
      [tripId]: {
        ...(prev[tripId] ?? quickDraftFromTrip(trip)),
        [field]: value,
      },
    }));
    setSelectedIds((prev) => new Set(prev).add(tripId));
    setQuickErrors((prev) => {
      if (!prev[tripId]) return prev;
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
  }, [table.rows]);

  const selectedDirtyTrips = useMemo(
    () => table.rows.filter((trip) => selectedIds.has(trip.id) && isEditableInQuickMode(trip) && draftChanged(trip, quickDrafts[trip.id])),
    [quickDrafts, selectedIds, table.rows],
  );

  const saveQuickEdit = useCallback(async () => {
    if (selectedDirtyTrips.length === 0 || savingQuickEdit) {
      setQuickMessage('Chưa có dòng đã chọn nào thay đổi.');
      return;
    }
    // A typed amount that is not a number must never be saved as 0 — flag the row
    // and leave it for the user (kanban 20260921_3).
    const errors: Record<number, string> = {};
    for (const trip of selectedDirtyTrips) {
      const field = invalidQuickField(quickDrafts[trip.id]);
      if (field) errors[trip.id] = `${QUICK_DRAFT_FIELD_LABELS[field]} không phải là số hợp lệ.`;
    }
    const savableTrips = selectedDirtyTrips.filter((trip) => !errors[trip.id]);
    if (savableTrips.length === 0) {
      setQuickErrors(errors);
      setQuickMessage('Số liệu không hợp lệ — sửa các dòng được đánh dấu rồi lưu lại.');
      return;
    }
    setSavingQuickEdit(true);
    setQuickMessage('');
    setQuickErrors(errors);
    try {
      const response = await tripClient.bulkUpdateTripFigures({
        updates: savableTrips.map((trip) => ({
          tripId: trip.id,
          mode: trip.status === TripStatus.CREATED ? 'pre-departure' : 'actuals',
          figures: figuresPayloadFromDraft(trip, quickDrafts[trip.id] ?? quickDraftFromTrip(trip)),
        })),
      });
      const responseErrors: Record<number, string> = {};
      for (const result of response.results) {
        if (!result.ok) responseErrors[result.tripId] = result.error ?? 'Không thể lưu dòng này';
      }
      const allErrors = { ...errors, ...responseErrors };
      const rejected = Object.keys(allErrors).length;
      setQuickErrors(allErrors);
      setQuickMessage(rejected > 0
        ? `Đã lưu ${response.updated} dòng, ${rejected} dòng cần kiểm tra lại.`
        : `Đã lưu ${response.updated} dòng.`);
      if (response.updated > 0) {
        await table.query.refetch();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const result of response.results) {
            if (result.ok) next.delete(result.tripId);
          }
          return next;
        });
      }
    } catch (err) {
      setQuickMessage(err instanceof Error ? err.message : 'Không thể lưu thay đổi.');
    } finally {
      setSavingQuickEdit(false);
    }
  }, [quickDrafts, savingQuickEdit, selectedDirtyTrips, table.query.refetch]);

  const handleCopyPlan = useCallback(async (tripId: number) => {
    if (copyingPlanId) return;

    setCopyingPlanId(tripId);
    setCopyPlanMessage('');
    setCopyPlanError(false);
    try {
      const created = await tripClient.copyTrip(tripId);
      await Promise.all([
        table.query.refetch(),
        queryClient.invalidateQueries({ queryKey: qk.trips.summary(dateFrom, dateTo) }),
        queryClient.invalidateQueries({ queryKey: qk.trips.all }),
      ]);
      setCopyPlanMessage(`Đã copy kế hoạch thành ${created.tripCode ?? 'chuyến mới'}.`);
    } catch (err) {
      setCopyPlanError(true);
      setCopyPlanMessage(err instanceof Error ? err.message : 'Không thể copy kế hoạch vận chuyển.');
    } finally {
      setCopyingPlanId(null);
    }
  }, [copyingPlanId, dateFrom, dateTo, queryClient, table.query.refetch]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    const first = await tripClient.listTrips({
      status: statusFilter || undefined,
      truckId: truckFilter || undefined,
      customerId: customerFilter || undefined,
      search: debouncedSearch || undefined,
      dateFrom: listDateFrom,
      dateTo: listDateTo,
      limit: 100,
      page: 1,
    });
    const allTrips = [...first.items];
    const totalPages = Math.ceil(first.total / first.pageSize);
    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          tripClient.listTrips({
            status: statusFilter || undefined,
            truckId: truckFilter || undefined,
            customerId: customerFilter || undefined,
            search: debouncedSearch || undefined,
            dateFrom: listDateFrom,
            dateTo: listDateTo,
            limit: 100,
            page: i + 2,
          }),
        ),
      );
      for (const res of remaining) allTrips.push(...res.items);
    }
    const rows = buildTripListExportRows(allTrips);
    const { downloadCSV } = await import('../lib/csv');
    const filterParts: string[] = [];
    if (listDateFrom && listDateTo) filterParts.push(`Từ ${listDateFrom} đến ${listDateTo}`);
    else if (listDateFrom) filterParts.push(`Từ ${listDateFrom}`);
    else if (listDateTo) filterParts.push(`Đến ${listDateTo}`);
    if (statusFilter) filterParts.push(`Trạng thái: ${statusFilter}`);
    if (truckFilter) filterParts.push(`Xe: #${truckFilter}`);
    if (customerFilter) filterParts.push(`Khách hàng: #${customerFilter}`);
    if (debouncedSearch) filterParts.push(`Tìm kiếm: "${debouncedSearch}"`);
    await downloadCSV(`so-chuyen-${new Date().toISOString().slice(0, 10)}.csv`, TRIP_LIST_EXPORT_HEADERS, rows, {
      title: 'SỔ CHUYẾN ĐI',
      subtitle: filterParts.join(' · ') || 'Tất cả chuyến trong kỳ',
      columnTypes: ['text', 'text', 'text', 'text', 'date', 'km', 'text', 'text', 'liters', 'text', 'currency', 'currency', 'currency', 'currency', 'currency', 'currency', 'currency', 'text'],
      // "Trả hàng 2 điểm" remains an audit column, but is already included in
      // "Tổng tiền đi đường lái xe nhận" and must not be summed twice.
      totalsColumns: [5, 8, 10, 11, 12, 13, 15, 16],
      totalsLabel: 'TỔNG CỘNG',
    });
  }, [statusFilter, truckFilter, customerFilter, debouncedSearch, listDateFrom, listDateTo]);

  // ── Table instance ──
  const quickEditState = useRef({ selectedIds, drafts: quickDrafts, errors: quickErrors }).current;
  quickEditState.selectedIds = selectedIds;
  quickEditState.drafts = quickDrafts;
  quickEditState.errors = quickErrors;

  const columns = useMemo(() => buildTripColumns(warnThreshold, {
    enabled: quickEdit,
    state: quickEditState,
    onToggleSelect: handleToggleSelect,
    onDraftChange: handleDraftChange,
  }, {
    copyingPlanId,
    onCopyPlan: canCopyPlan ? handleCopyPlan : undefined,
    detailState,
  }), [canCopyPlan, copyingPlanId, detailState, handleCopyPlan, handleDraftChange, handleToggleSelect, quickEdit, quickEditState, warnThreshold]);
  const tableInstance = useReactTable({
    data: table.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Keyboard scroll ──
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const el = scrollRef.current;
      if (!el) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        el.scrollLeft = Math.max(0, el.scrollLeft - 200);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        el.scrollLeft = Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + 200);
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  const todayLabel = `Tháng ${month}/${year}`;

  return (
    <div ref={rootRef} className={`trip-list-page${quickEdit ? ' quick-edit-mode' : ''}`} style={{ paddingBottom: 40 }}>
      <Breadcrumbs
        className="trip-list-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Sổ chuyến đi' },
        ]}
        renderLink={(to, children) => <a onClick={() => navigate(to)} style={{ cursor: 'pointer' }}>{children}</a>}
      />
      <TripListHero todayLabel={todayLabel} statusCounts={statusCounts} summary={summary} quickEdit={quickEdit} toggleQuickEdit={toggleQuickEdit} handleExport={handleExport} onAdd={() => navigate('/trips/new')} breakdownPct={breakdownPct} warnThreshold={warnThreshold} month={month} />

      <TripFiltersBar
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        searchQuery={searchInput}
        onSearch={setSearchInput}
        truckOptions={truckOptions}
        truckFilter={truckFilter}
        onTruckFilter={setTruckFilter}
        customerOptions={customerOptions}
        customerFilter={customerFilter}
        onCustomerFilter={setCustomerFilter}
      />

      <div className="table-hint">
        <MousePointerClick size={13} strokeWidth={2.2} />
        <span>
          <b>Mẹo:</b> nhấp vào một hàng để mở chi tiết chuyến
          {canCopyPlan && ', bấm Copy để tạo dòng kế hoạch tương tự'}
          &nbsp;·&nbsp; dùng ← → để cuộn ngang
        </span>
        <span className="table-legend">
          <span className="legend-item"><span className="legend-dot legend-dot--ok" />Đầy đủ số liệu</span>
          <span className="legend-item"><span className="legend-dot legend-dot--warn" />Chưa nhập đủ</span>
        </span>
      </div>
      {copyPlanMessage && (
        <div className={`copy-plan-message${copyPlanError ? ' has-error' : ''}`}>
          {copyPlanMessage}
        </div>
      )}
      {quickEdit && (
        <div className="quick-edit-toolbar">
          <div className="quick-edit-toolbar__main">
            <button type="button" className="btn btn--secondary" onClick={handleSelectVisible}>
              Chọn trang này
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={savingQuickEdit || selectedDirtyTrips.length === 0}
              onClick={saveQuickEdit}
            >
              <Save size={15} />
              {savingQuickEdit ? 'Đang lưu…' : `Lưu ${selectedDirtyTrips.length} dòng`}
            </button>
            <button type="button" className="btn btn--secondary" onClick={toggleQuickEdit}>
              <X size={15} />
              Hủy
            </button>
          </div>
          <div className={`quick-edit-message${Object.keys(quickErrors).length > 0 ? ' has-error' : ''}`}>
            {quickMessage || 'Chỉ các chuyến chưa chốt/chưa hủy được sửa nhanh.'}
          </div>
        </div>
      )}
      <div className="table-card">
        <div className="table-scroll-wrapper">
          <div className="table-scroll-body" ref={scrollRef} tabIndex={-1}>
            <div className="table-head">
              {tableInstance.getHeaderGroups().map((headerGroup) => (
                <React.Fragment key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <div key={header.id} className={columnClass(header.column.id)}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {table.isLoading ? (
              <div className="table-empty">Đang tải danh sách chuyến đi…</div>
            ) : table.rows.length === 0 ? (
              <>
                {(searching || statusFilter || truckFilter || customerFilter) && (
                  <div style={{ margin: '12px 16px 0' }}>
                    <Alert
                      variant="warning"
                      style="soft"
                      icon={<MousePointerClick size={16} />}
                    >
                      Không có chuyến đi khớp với bộ lọc hiện tại. Thử bỏ lọc trạng thái/tuyến/xe hoặc xóa từ khóa tìm kiếm.
                    </Alert>
                  </div>
                )}
                <EmptyState illustration="/assets/illustrations/empty-trips.svg" title="Không tìm thấy chuyến đi nào." />
              </>
            ) : (
              tableInstance.getRowModel().rows.map((row) => (
                <ClickableCard
                  key={row.id}
                  to={quickEdit ? undefined : `/trips/${row.original.id}`}
                  state={detailState}
                  onClick={quickEdit ? () => handleToggleSelect(row.original.id) : undefined}
                  className={`table-row${quickEdit ? ' quick-edit-row' : ''}${selectedIds.has(row.original.id) ? ' selected' : ''}${!isEditableInQuickMode(row.original) ? ' locked' : ''}${isTripToday(row.original.departureDate) ? ' table-row--today' : ''}${getMissingPlanFields(row.original).length > 0 ? ' table-row--missing' : ''}`}
                  style={tripRowStyle(row.original) as CSSProperties}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <div key={cell.id} className={columnClass(cell.column.id)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </ClickableCard>
              ))
            )}
          </div>
        </div>

        <div className="trip-mobile-list">
          {table.isLoading ? (
            <div className="table-empty">Đang tải…</div>
          ) : table.rows.length === 0 ? (
            <div className="table-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px' }}>
              <img src={resolveEmptyIllustration('empty-trips')} alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Không tìm thấy chuyến đi nào.
            </div>
          ) : (
            table.rows.map((trip) => {
              if (!quickEdit) {
                return (
                  <TripMobileCard
                    key={trip.id}
                    trip={trip}
                    warnThreshold={warnThreshold}
                    style={tripRowStyle(trip) as CSSProperties}
                    copyingPlan={copyingPlanId === trip.id}
                    onCopyPlan={canCopyPlan ? handleCopyPlan : undefined}
                    detailState={detailState}
                  />
                );
              }

              return (
                <TripQuickEditMobileCard
                  key={trip.id}
                  trip={trip}
                  draft={quickDrafts[trip.id] ?? quickDraftFromTrip(trip)}
                  selected={selectedIds.has(trip.id)}
                  editable={isEditableInQuickMode(trip)}
                  error={quickErrors[trip.id]}
                  style={tripRowStyle(trip) as CSSProperties}
                  onToggleSelect={handleToggleSelect}
                  onDraftChange={handleDraftChange}
                />
              );
            })
          )}
        </div>

        {table.rows.length > 0 && (
          <div className="table-foot">
            <Pagination
              mode="infinite"
              page={table.page}
              totalPages={table.totalPages}
              totalItems={table.total}
              pageSize={table.pageSize}
              onPageSizeChange={table.setPageSize}
              onChange={table.setPage}
              hasMore={table.hasMore}
              isLoadingMore={table.isFetching}
              onLoadMore={table.loadMore}
            />
          </div>
        )}
      </div>
    </div>
  );
}

void formatCurrency;
