/**
 * TripListPage — refactored to use the design-system + features/trips
 * extraction. The page is now a thin orchestrator (~200 LOC instead of 942):
 *
 *   1. Read URL/month state.
 *   2. Drive the query state via `useTableQueryState`.
 *   3. Render the page chrome (hero, filters, table card).
 *   4. Pass column definitions + mobile card renderer from features/trips.
 *
 * All previously-inlined helpers (buildTripCode, calcConsumption, missing
 * indicators, data completeness, status pill class map, export-to-CSV)
 * now live in `features/trips/`. Column definitions live in
 * `features/trips/tripColumns.tsx`. The mobile card lives in
 * `features/trips/TripMobileCard.tsx`.
 *
 * This refactor is **behavior-preserving**: same data, same columns,
 * same mobile layout, same filter pills, same export.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable, getCoreRowModel, flexRender,
} from '@tanstack/react-table';
import { Download, Plus, MousePointerClick, Pencil, Save, X } from 'lucide-react';
import { tripClient } from '../api/tripClient';
import { qk } from '../api/keys';
import { formatCurrency } from '../lib/format';
import {
  FuelMode, parseThreshold, TripStatus,
  TRIP_STATUS_LABELS,
  type TripDetail, type UpdateTripFiguresRequest,
} from '@tingting/shared';
import { useFuelConfig, useSalaryPeriod } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';
import { ClickableCard } from '../components/shared/ClickableCard';
import { useDebouncedValue, useTableQueryState, EmptyState } from '../design-system';
import {
  buildTripColumns, tripRowStyle,
  TripMobileCard, TripFiltersBar, breakdownPctFromCounts, defaultStatusCounts,
  DEFAULT_WARN_THRESHOLD, PAGE_SIZE, formatMoney,
  STATUS_PILL_CLASS,
  type StatusFilter, type StatusCounts, type TripQuickEditDraft,
  buildTripCode, getTripDistance,
} from '../features/trips';
import { usePageAnimations, useListAnimations } from '../hooks/animations';
import './TripListPage.css';
import { resolveEmptyIllustration } from '../lib/emptyIllustrations';

function draftNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return String(n).replace(/\.00$/, '');
}

function parseDraftNumber(value: string): number | undefined {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!normalized) return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function quickDraftFromTrip(trip: TripDetail): TripQuickEditDraft {
  return {
    fuelLiters: draftNumber(trip.fuelLitersOverride ?? trip.fuelLiters),
    roadAllowance: draftNumber(trip.roadAllowanceOverride ?? trip.totalRoadAllowance),
    driverSalary: draftNumber(trip.driverSalary),
    revenue: draftNumber(trip.revenue),
  };
}

function isEditableInQuickMode(trip: TripDetail): boolean {
  return trip.status !== TripStatus.LOCKED && trip.status !== TripStatus.CANCELED;
}

function draftChanged(trip: TripDetail, draft?: TripQuickEditDraft): boolean {
  if (!draft) return false;
  const original = quickDraftFromTrip(trip);
  return draft.fuelLiters !== original.fuelLiters
    || draft.roadAllowance !== original.roadAllowance
    || draft.driverSalary !== original.driverSalary
    || draft.revenue !== original.revenue;
}

function figuresPayloadFromDraft(trip: TripDetail, draft: TripQuickEditDraft): UpdateTripFiguresRequest {
  const original = quickDraftFromTrip(trip);
  const fuelLiters = parseDraftNumber(draft.fuelLiters);
  const roadAllowance = parseDraftNumber(draft.roadAllowance);
  const driverSalary = parseDraftNumber(draft.driverSalary);
  const revenue = parseDraftNumber(draft.revenue);
  const fuelLitersChanged = draft.fuelLiters !== original.fuelLiters;

  return {
    legs: (trip.legs ?? []).map((leg) => ({
      sequence: leg.sequence,
      origin: leg.origin,
      destination: leg.destination,
      km: Number(leg.km),
      loadingType: leg.loadingType,
    })),
    version: trip.version,
    departureDate: trip.departureDate,
    routeId: trip.routeId,
    fuelMode: fuelLitersChanged ? FuelMode.FLAT_RATE : trip.fuelMode,
    fuelLitersOverride: fuelLitersChanged ? (fuelLiters ?? null) : (trip.fuelLitersOverride != null ? Number(trip.fuelLitersOverride) : null),
    fuelSupplementLiters: Number(trip.fuelSupplementLiters ?? 0),
    fuelSupplementReason: trip.fuelSupplementReason ?? undefined,
    fuelActualUnitPrice: trip.fuelActualUnitPrice != null ? Number(trip.fuelActualUnitPrice) : null,
    fuelSupplierId: trip.fuelSupplierId ?? null,
    tollsDiscount: Number(trip.tollsDiscount ?? 0),
    tollsAddition: Number(trip.tollsAddition ?? 0),
    tollsStations: trip.tollsStations ?? 0,
    hasReturnCargo: trip.hasReturnCargo ?? false,
    roadAllowanceOverride: roadAllowance ?? null,
    driverSalary: driverSalary ?? 0,
    revenue: revenue ?? 0,
    customerCommission: Number(trip.customerCommission ?? 0),
    tripWageDays: trip.tripWageDays ?? undefined,
    twoPointDeliveryBonus: Number(trip.twoPointDeliveryBonus ?? 0),
    vehicleShiftAllowance: Number(trip.vehicleShiftAllowance ?? 0),
    notes: trip.notes ?? undefined,
    carrierType: trip.carrierType,
    externalCarrierId: trip.externalCarrierId ?? null,
    externalFreightCost: trip.externalFreightCost != null ? Number(trip.externalFreightCost) : null,
    externalPlateNumber: trip.externalPlateNumber ?? null,
    externalDriverName: trip.externalDriverName ?? null,
    externalDriverPhone: trip.externalDriverPhone ?? null,
  };
}

function columnClass(columnId: string): string {
  if (columnId === 'select') return 'col-select center';
  if (columnId === 'route') return 'col-route';
  if (columnId === 'container') return 'col-container';
  if (columnId === 'consumption') return 'col-consumption';
  if (columnId === 'road') return 'col-road right';
  if (columnId === 'revenue') return 'col-revenue right';
  if (columnId === 'driverSalary') return 'col-driver-salary right';
  if (columnId === 'totalCost') return 'col-total-cost right';
  if (columnId === 'grossProfit') return 'col-gross-profit right';
  if (columnId === 'status') return 'col-status center';
  return '';
}

export default function TripListPage() {
  const { rootRef } = usePageAnimations({
    ready: true,
    selectors: ['.hero', '.status-tabs', '.filters-card', '.table-card', '.table-foot'],
    staggerDelay: 80,
  });
  // Animation hooks called for side effects (attach observers / register
  // animations). Their return values are not needed on this page.
  useListAnimations({
    itemSelector: '.table-row',
    mode: 'rows',
    deps: [],
  });
  useListAnimations({
    itemSelector: '.metric',
    mode: 'cards',
    staggerDelay: 60,
  });
  useListAnimations({
    itemSelector: '.filter-pill, .status-tab',
    mode: 'rows',
    staggerDelay: 40,
  });
  const navigate = useNavigate();
  const { month, year } = useMonth();
  const { data: fuelConfig } = useFuelConfig();
  const { data: salaryPeriod } = useSalaryPeriod(month, year);

  const warnThreshold = useMemo(
    () => (fuelConfig
      ? parseThreshold(fuelConfig.warningThreshold, DEFAULT_WARN_THRESHOLD)
      : DEFAULT_WARN_THRESHOLD),
    [fuelConfig],
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [truckFilter, setTruckFilter] = useState<number | ''>('');
  const [customerFilter, setCustomerFilter] = useState<number | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [quickEdit, setQuickEdit] = useState(false);
  const [quickDrafts, setQuickDrafts] = useState<Record<number, TripQuickEditDraft>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [quickErrors, setQuickErrors] = useState<Record<number, string>>({});
  const [quickMessage, setQuickMessage] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  // Date range from salary period
  const dateFrom = salaryPeriod?.start;
  const dateTo = salaryPeriod?.end;

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
    setSavingQuickEdit(true);
    setQuickMessage('');
    setQuickErrors({});
    try {
      const response = await tripClient.bulkUpdateTripFigures({
        updates: selectedDirtyTrips.map((trip) => ({
          tripId: trip.id,
          mode: trip.status === TripStatus.CREATED ? 'pre-departure' : 'actuals',
          figures: figuresPayloadFromDraft(trip, quickDrafts[trip.id] ?? quickDraftFromTrip(trip)),
        })),
      });
      const errors: Record<number, string> = {};
      for (const result of response.results) {
        if (!result.ok) errors[result.tripId] = result.error ?? 'Không thể lưu dòng này';
      }
      setQuickErrors(errors);
      setQuickMessage(response.failed > 0
        ? `Đã lưu ${response.updated} dòng, ${response.failed} dòng cần kiểm tra lại.`
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
  }, [quickDrafts, savingQuickEdit, selectedDirtyTrips, table.query]);

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
    const headers = ['Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM', 'Loại cont', 'Số cont', 'Dầu (L)', 'Nhà CC Dầu', 'Giá trị dầu', 'Tổng đi đường', 'Doanh thu', 'Tổng chi phí', 'LN gộp', 'Trạng thái'];
    const rows = allTrips.map((t) => {
      const containers = (t as unknown as { containers?: Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }> }).containers ?? [];
      const typeCodes = Array.from(new Set(containers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean))).join(', ');
      const numbers = containers.map((c) => c.containerNumber).join(', ');
      return [
        t.tripCode ?? '—',
        t.customer?.name ?? '',
        t.route?.name ?? '',
        t.carrierType === 'EXTERNAL' ? (t.externalPlateNumber ?? 'Xe ngoài') : (t.truck?.licensePlate ?? ''),
        t.departureDate ?? '',
        getTripDistance(t) || '',
        typeCodes, numbers,
        t.fuelLiters ?? '',
        t.fuelSupplier?.name ?? '',
        t.totalFuelCost ?? '',
        (Number(t.totalRoadAllowance ?? 0) + Number(t.tollCost ?? 0)) || '',
        t.revenue ?? '',
        t.totalCost ?? '',
        t.grossProfit ?? '',
        t.status,
      ];
    });
    const { downloadCSV } = await import('../lib/csv');
    const filterParts: string[] = [];
    if (listDateFrom && listDateTo) filterParts.push(`Từ ${listDateFrom} đến ${listDateTo}`);
    else if (listDateFrom) filterParts.push(`Từ ${listDateFrom}`);
    else if (listDateTo) filterParts.push(`Đến ${listDateTo}`);
    if (statusFilter) filterParts.push(`Trạng thái: ${statusFilter}`);
    if (truckFilter) filterParts.push(`Xe: #${truckFilter}`);
    if (customerFilter) filterParts.push(`Khách hàng: #${customerFilter}`);
    if (debouncedSearch) filterParts.push(`Tìm kiếm: "${debouncedSearch}"`);
    await downloadCSV(`so-chuyen-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows, {
      title: 'SỔ CHUYẾN ĐI',
      subtitle: filterParts.join(' · ') || 'Tất cả chuyến trong kỳ',
      columnTypes: ['text', 'text', 'text', 'text', 'date', 'km', 'text', 'text', 'liters', 'text', 'currency', 'currency', 'currency', 'currency', 'currency', 'text'],
      totalsColumns: [5, 8, 10, 11, 12, 13, 14],
      totalsLabel: 'TỔNG CỘNG',
    });
  }, [statusFilter, truckFilter, customerFilter, debouncedSearch, listDateFrom, listDateTo]);

  // ── Table instance ──
  const columns = useMemo(() => buildTripColumns(warnThreshold, {
    enabled: quickEdit,
    selectedIds,
    drafts: quickDrafts,
    errors: quickErrors,
    onToggleSelect: handleToggleSelect,
    onDraftChange: handleDraftChange,
  }), [handleDraftChange, handleToggleSelect, quickDrafts, quickEdit, quickErrors, selectedIds, warnThreshold]);
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
      <section className="hero hero--route-network">
        <div className="hero-top">
          <div className="hero-title-block">
            <div className="hero-eyebrow">Sổ chuyến · {todayLabel}</div>
            <h1 className="hero-h1" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/assets/icons/03-trip-log-so-chuyen-chuyen-xe.png" alt="" style={{ width: 32, height: 32, flexShrink: 0 }} />
              Sổ chuyến đi
            </h1>
            <div className="hero-sub">
              {statusCounts.all} chuyến đã ghi nhận
              {statusCounts[TripStatus.COMPLETED] > 0 && (
                <span title="Chờ khóa: chuyến đã hoàn thành, chờ kế toán xác nhận khóa sổ kế toán"> · {statusCounts[TripStatus.COMPLETED]} chờ khóa</span>
              )}
              {(summary?.missingFuel ?? 0) > 0 && <> · {summary?.missingFuel} chưa khai báo dầu</>}
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className={`btn ${quickEdit ? 'btn--primary' : 'btn--secondary'}`} onClick={toggleQuickEdit}>
              {quickEdit ? <X size={15} /> : <Pencil size={15} />}
              {quickEdit ? 'Thoát sửa nhanh' : 'Sửa nhanh'}
            </button>
            <button type="button" className="btn btn--secondary" onClick={handleExport}>
              <Download size={15} />
              Xuất Excel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/trips/new')}>
              <Plus size={15} strokeWidth={2.4} />
              Thêm chuyến
            </button>
          </div>
        </div>

        <div className="metrics">
          <div className="metric featured">
            <div className="metric-label">Tổng chuyến · phân loại</div>
            <div className="metric-value d-mono">{statusCounts.all}</div>
            <div className="breakdown-bar">
              <div className="bb-seg bb-chot" style={{ width: `${breakdownPct.chot}%` }} />
              <div className="bb-seg bb-htth" style={{ width: `${breakdownPct.htth}%` }} />
              <div className="bb-seg bb-dang" style={{ width: `${breakdownPct.dang}%` }} />
              <div className="bb-seg bb-moi"  style={{ width: `${breakdownPct.moi}%` }} />
              <div className="bb-seg bb-huy"  style={{ width: `${breakdownPct.huy}%` }} />
            </div>
            <div className="breakdown-legend">
              <span className="legend-item"><span className="legend-dot bb-chot" />Đã khóa {statusCounts[TripStatus.LOCKED]}</span>
              <span className="legend-item"><span className="legend-dot bb-htth" />Hoàn thành {statusCounts[TripStatus.COMPLETED]}</span>
              <span className="legend-item"><span className="legend-dot bb-dang" />Đang chạy {statusCounts[TripStatus.IN_TRANSIT]}</span>
              <span className="legend-item"><span className="legend-dot bb-moi"  />Mới tạo {statusCounts[TripStatus.CREATED]}</span>
              <span className="legend-item"><span className="legend-dot bb-huy"  />Đã hủy {statusCounts[TripStatus.CANCELED]}</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng KM tháng này</div>
            <div className="metric-value d-mono">
              {(summary?.totalKm ?? 0).toLocaleString('vi-VN')}
              <span className="metric-unit">km</span>
            </div>
            <div className="metric-delta delta-flat">{statusCounts.all} chuyến tháng này</div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng dầu tiêu thụ</div>
            <div className="metric-value d-mono">
              {(summary?.totalFuel ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
              <span className="metric-unit">L</span>
            </div>
            <div className={`metric-delta ${(summary?.totalKm ?? 0) > 0 && (summary?.avgPer100 ?? 0) > warnThreshold ? 'delta-warn' : 'delta-flat'}`}>
              {(summary?.totalKm ?? 0) > 0 ? (
                <>TB {(summary?.avgPer100 ?? 0).toFixed(1).replace('.', ',')} L/100km · ngưỡng {warnThreshold.toFixed(1).replace('.', ',')}</>
              ) : <>TB không khả dụng (0 km)</>}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Tiền đi đường</div>
            <div className="metric-value d-mono">
              {formatMoney(summary?.totalRoad ?? 0)}
              <span className="metric-unit">₫</span>
            </div>
            <div className="metric-delta delta-flat">
              {(summary?.missingFuel ?? 0) > 0
                ? `${summary?.missingFuel} chuyến chưa cập nhật`
                : 'Đã cập nhật đầy đủ'}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng giá trị lệnh <span style={{ fontWeight: 400, fontSize: '0.85em', opacity: 0.7 }}>(tất cả trạng thái)</span></div>
            <div className="metric-value d-mono">
              {formatMoney(summary?.totalRevenue ?? 0)}
              <span className="metric-unit">₫</span>
            </div>
            <div className="metric-delta delta-flat">Tháng {month} · bao gồm tất cả trạng thái chuyến</div>
          </div>
        </div>
      </section>

      <TripFiltersBar
        statusCounts={statusCounts}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        searchQuery={searchInput}
        onSearch={setSearchInput}
        searching={searching}
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
          <b>Mẹo:</b> nhấp vào một hàng để mở chi tiết chuyến, sửa hoặc duyệt phí
          &nbsp;·&nbsp; dùng ← → để cuộn ngang
        </span>
        <span className="table-legend">
          <span className="legend-item"><span className="legend-dot legend-dot--ok" />Đầy đủ số liệu</span>
          <span className="legend-item"><span className="legend-dot legend-dot--warn" />Chưa nhập đủ</span>
        </span>
      </div>
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
              <EmptyState illustration="/assets/illustrations/empty-trips.svg" title="Không tìm thấy chuyến đi nào." />
            ) : (
              tableInstance.getRowModel().rows.map((row) => (
                <ClickableCard
                  key={row.id}
                  to={quickEdit ? undefined : `/trips/${row.original.id}`}
                  onClick={quickEdit ? () => handleToggleSelect(row.original.id) : undefined}
                  className={`table-row${quickEdit ? ' quick-edit-row' : ''}${selectedIds.has(row.original.id) ? ' selected' : ''}${!isEditableInQuickMode(row.original) ? ' locked' : ''}`}
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
                  />
                );
              }

              const editable = isEditableInQuickMode(trip);
              const draft = quickDrafts[trip.id] ?? quickDraftFromTrip(trip);
              const selected = selectedIds.has(trip.id);
              const routeLabel = trip.route?.name ?? '—';
              const totalCost = Number(trip.totalCost ?? 0);
              const grossProfit = Number(trip.grossProfit ?? 0);
              const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';
              const quickFields: Array<{ key: keyof TripQuickEditDraft; label: string; unit?: string }> = [
                { key: 'fuelLiters', label: 'Dầu', unit: 'L' },
                { key: 'roadAllowance', label: 'Đi đường', unit: '₫' },
                { key: 'revenue', label: 'Doanh thu', unit: '₫' },
                { key: 'driverSalary', label: 'Lương chuyến', unit: '₫' },
              ];

              return (
                <div
                  key={trip.id}
                  className={`trip-mcard trip-mcard--quick${selected ? ' selected' : ''}${!editable ? ' locked' : ''}`}
                  style={tripRowStyle(trip) as CSSProperties}
                >
                  <div className="trip-mcard__top">
                    <label className="trip-mcard__check">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!editable}
                        onChange={() => handleToggleSelect(trip.id)}
                      />
                      <span>{editable ? 'Chọn' : 'Khóa'}</span>
                    </label>
                    <span className={`status-pill ${pillClass}`}>{TRIP_STATUS_LABELS[trip.status]}</span>
                  </div>
                  <div className="trip-mcard__name">{trip.customer?.name ?? '—'}</div>
                  <div className="trip-mcard__id">
                    {buildTripCode(trip)}
                    <span className="trip-meta-sep">·</span>
                    <span>{trip.departureDate ?? '—'}</span>
                  </div>
                  <div className="trip-mcard__route">{routeLabel}</div>

                  <div className="quick-card-grid">
                    {quickFields.map((field) => (
                      <label key={field.key} className="quick-card-field">
                        <span>{field.label}</span>
                        <div className="quick-edit-cell">
                          <input
                            className="quick-money-input"
                            inputMode="decimal"
                            value={draft[field.key]}
                            disabled={!editable}
                            onChange={(event) => handleDraftChange(trip.id, field.key, event.target.value)}
                          />
                          {field.unit && <span className="quick-unit">{field.unit}</span>}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="quick-card-summary">
                    <div>
                      <span>Tổng chi phí</span>
                      <b>{totalCost > 0 ? `${formatMoney(totalCost)} ₫` : '—'}</b>
                    </div>
                    <div>
                      <span>LN gộp</span>
                      <b className={grossProfit < 0 ? 'money-loss' : ''}>{grossProfit !== 0 ? `${formatMoney(grossProfit)} ₫` : '—'}</b>
                    </div>
                  </div>
                  {quickErrors[trip.id] && <div className="quick-card-error">{quickErrors[trip.id]}</div>}
                </div>
              );
            })
          )}
        </div>

        {table.rows.length > 0 && (
          <div className="table-foot">
            <div className="page-info">
              Hiển thị <b>{((table.page - 1) * table.pageSize) + 1}–{Math.min(table.page * table.pageSize, table.total)}</b> trên <b>{table.total}</b> chuyến
            </div>
            <div className="pagination">
              <button className="page-btn" disabled={table.page <= 1} onClick={() => table.setPage(table.page - 1)}>‹</button>
              {(() => {
                const pages: (number | string)[] = [];
                if (table.totalPages <= 7) {
                  for (let i = 1; i <= table.totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  const start = Math.max(2, table.page - 2);
                  const end = Math.min(table.totalPages - 1, table.page + 2);
                  if (start > 2) pages.push('…');
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < table.totalPages - 1) pages.push('…');
                  pages.push(table.totalPages);
                }
                return pages.map((p, i) =>
                  typeof p === 'string'
                    ? <span key={`e${i}`} className="page-ellipsis">…</span>
                    : <button key={p} className={`page-btn${p === table.page ? ' active' : ''}`} onClick={() => table.setPage(p)}>{p}</button>
                );
              })()}
              <button className="page-btn" disabled={table.page >= table.totalPages} onClick={() => table.setPage(table.page + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

void formatCurrency;
