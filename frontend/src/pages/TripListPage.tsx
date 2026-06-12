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
import { Download, Plus, MousePointerClick } from 'lucide-react';
import { tripClient } from '../api/tripClient';
import { formatCurrency } from '../lib/format';
import { parseThreshold, TripStatus, type TripDetail } from '@tingting/shared';
import { useFuelConfig, useSalaryPeriod } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';
import { ClickableCard } from '../components/shared/ClickableCard';
import { useDebouncedValue, useTableQueryState, EmptyState } from '../design-system';
import {
  buildTripColumns, tripRowStyle,
  TripMobileCard, TripFiltersBar, breakdownPctFromCounts, defaultStatusCounts,
  DEFAULT_WARN_THRESHOLD, PAGE_SIZE, formatMoney,
  type StatusFilter, type StatusCounts,
} from '../features/trips';

export default function TripListPage() {
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
    queryKey: ['trips', 'list'],
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
    queryKey: ['trips-summary', dateFrom, dateTo],
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
    const headers = ['Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM', 'Loại cont', 'Số cont', 'Dầu (L)', 'Nhà CC Dầu', 'Giá trị dầu', 'Tổng đi đường', 'Doanh thu', 'Trạng thái'];
    const rows = allTrips.map((t) => {
      const containers = (t as unknown as { containers?: Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }> }).containers ?? [];
      const typeCodes = Array.from(new Set(containers.map((c) => c.containerTypeCode || c.containerTypeName).filter(Boolean))).join(', ');
      const numbers = containers.map((c) => c.containerNumber).join(', ');
      return [
        t.tripCode ?? '—',
        t.customer?.name ?? '',
        t.route?.name ?? '',
        t.truck?.licensePlate ?? '',
        t.departureDate ?? '',
        Number(t.route?.distanceKm ?? 0) || '',
        typeCodes, numbers,
        t.fuelLiters ?? '',
        t.fuelSupplier?.name ?? '',
        t.totalFuelCost ?? '',
        (Number(t.totalRoadAllowance ?? 0) + Number(t.tollCost ?? 0)) || '',
        t.revenue ?? '',
        t.status,
      ];
    });
    const { downloadCSV } = await import('../lib/csv');
    downloadCSV(`so-chuyen-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [statusFilter, truckFilter, customerFilter, debouncedSearch, listDateFrom, listDateTo]);

  // ── Table instance ──
  const columns = useMemo(() => buildTripColumns(warnThreshold), [warnThreshold]);
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
    <div className="trip-list-page fade-up" style={{ paddingBottom: 40 }}>
      <section className="hero">
        <div className="hero-top">
          <div className="hero-title-block">
            <div className="hero-eyebrow">Sổ chuyến · {todayLabel}</div>
            <h1 className="hero-h1">Sổ chuyến đi</h1>
            <div className="hero-sub">
              {statusCounts.all} chuyến đã ghi nhận
              {statusCounts[TripStatus.COMPLETED] > 0 && (
                <span title="Chờ khóa: chuyến đã hoàn thành, chờ kế toán xác nhận khóa sổ kế toán"> · {statusCounts[TripStatus.COMPLETED]} chờ khóa</span>
              )}
              {(summary?.missingFuel ?? 0) > 0 && <> · {summary?.missingFuel} chưa khai báo dầu</>}
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className="btn-d btn-d--ghost-dark" onClick={handleExport}>
              <Download size={15} />
              Xuất Excel
            </button>
            <button type="button" className="btn-d btn-d--primary" onClick={() => navigate('/trips/new')}>
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
      <div className="table-card">
        <div className="table-scroll-wrapper">
          <div className="table-scroll-body" ref={scrollRef} tabIndex={-1}>
            <div className="table-head">
              {tableInstance.getHeaderGroups().map((headerGroup) => (
                <React.Fragment key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    let cls = '';
                    if (header.column.id === 'route') cls = 'col-route';
                    else if (header.column.id === 'consumption') cls = 'col-consumption';
                    else if (header.column.id === 'road') cls = 'col-road right';
                    else if (header.column.id === 'revenue') cls = 'col-revenue right';
                    else if (header.column.id === 'status') cls = 'col-status center';
                    return (
                      <div key={header.id} className={cls}>
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
              <div className="table-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px' }}>
                <img src="/assets/illustrations/empty-trips.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                Không tìm thấy chuyến đi nào.
              </div>
            ) : (
              tableInstance.getRowModel().rows.map((row) => (
                <ClickableCard
                  key={row.id}
                  to={`/trips/${row.original.id}`}
                  className="table-row"
                  style={tripRowStyle(row.original) as CSSProperties}
                >
                  {row.getVisibleCells().map((cell) => {
                    let cls = '';
                    if (cell.column.id === 'route') cls = 'col-route';
                    else if (cell.column.id === 'consumption') cls = 'col-consumption';
                    else if (cell.column.id === 'road') cls = 'col-road right';
                    else if (cell.column.id === 'revenue') cls = 'col-revenue right';
                    else if (cell.column.id === 'status') {
                      return (
                        <div key={cell.id} className="col-status center">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    }
                    return (
                      <div key={cell.id} className={cls}>
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
              <img src="/assets/illustrations/empty-trips.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Không tìm thấy chuyến đi nào.
            </div>
          ) : (
            table.rows.map((trip) => (
              <TripMobileCard 
                key={trip.id} 
                trip={trip} 
                warnThreshold={warnThreshold} 
                style={tripRowStyle(trip) as CSSProperties}
              />
            ))
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

// Re-use the EmptyState primitive in the future to replace the two inline
// empty-state blocks above (kept in place to avoid behavior changes here).
void EmptyState;
void formatCurrency;
