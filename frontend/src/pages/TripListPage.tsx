import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Download,
  Plus,
  Search,
  ArrowRight,
  AlertCircle,
  X as XIcon,
  Loader2,
} from 'lucide-react';
import { tripClient } from '../api/tripClient';
import { formatCurrency } from '../lib/format';
import { splitRoute } from '../lib/route';
import { formatDayMonth } from '../lib/date';
import { downloadCSV } from '../lib/csv';
import { TripStatus, TRIP_STATUS_LABELS, parseThreshold } from '@nepocorp/shared';
import type { TripDetail } from '@nepocorp/shared';
import { useFuelConfig, useSalaryPeriod } from '../hooks/useQueries';
import { useMonth } from '../hooks/useMonth';

// ─── Constants ────────────────────────────────────────────────────────────
type StatusFilter = '' | TripStatus;

const STATUS_PILL_CLASS: Record<TripStatus, string> = {
  [TripStatus.CREATED]: 'pill-moi',
  [TripStatus.IN_TRANSIT]: 'pill-dang',
  [TripStatus.COMPLETED]: 'pill-htth',
  [TripStatus.LOCKED]: 'pill-chot',
  [TripStatus.CANCELED]: 'pill-huy',
};

// Default threshold for "warn" consumption (L/100km) — overridden by fuel config when loaded
const DEFAULT_WARN_THRESHOLD = 37;
const PAGE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildTripCode(trip: TripDetail): string {
  const t = trip as any;
  if (t.tripCode) return t.tripCode;
  return '—';
}

function calcConsumption(trip: TripDetail): { liters: number; per100: number } | null {
  const fuel = trip.fuelLiters ? Number(trip.fuelLiters) : null;
  const distance = Number(trip.route?.distanceKm ?? 0);
  if (!fuel || !distance) return null;
  return { liters: fuel, per100: (fuel / distance) * 100 };
}

function formatMoney(n: number): string {
  return formatCurrency(n).replace(' ₫', '').replace('₫', '').trim();
}

// ─── Component ────────────────────────────────────────────────────────────
export default function TripListPage() {
  const navigate = useNavigate();
  const { month, year } = useMonth();
  const { data: fuelConfig } = useFuelConfig();
  const { data: salaryPeriod } = useSalaryPeriod(month, year);

  // Dynamic threshold from fuel config — NaN-safe fallback to default
  const warnThreshold = fuelConfig
    ? parseThreshold(fuelConfig.warningThreshold, DEFAULT_WARN_THRESHOLD)
    : DEFAULT_WARN_THRESHOLD;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [truckFilter, setTruckFilter] = useState<number | ''>('');
  const [customerFilter, setCustomerFilter] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Debounced search to avoid excessive API calls while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Date range from salary period
  const dateFrom = salaryPeriod?.start;
  const dateTo = salaryPeriod?.end;

  // Search intent is "find this specific trip regardless of when" — bypass the
  // month chip when the user has typed something. Without this, a search for
  // e.g. TRP-202605-0003 from the June chip yields the empty state.
  const searching = debouncedSearch.length > 0;
  const listDateFrom = searching ? undefined : dateFrom;
  const listDateTo = searching ? undefined : dateTo;

  // ── Summary query (status counts + aggregate metrics for the month) ──
  const { data: summary } = useQuery({
    queryKey: ['trips-summary', dateFrom, dateTo],
    queryFn: () => tripClient.getTripsSummary({ dateFrom, dateTo }),
    enabled: !!dateFrom && !!dateTo,
    staleTime: 30 * 1000,
  });

  // ── Infinite query for paginated trip list ──
  const {
    data: infiniteData,
    isLoading: loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['trips', listDateFrom, listDateTo, statusFilter, truckFilter, customerFilter, debouncedSearch],
    queryFn: ({ pageParam }) => tripClient.listTrips({
      page: pageParam,
      limit: PAGE_SIZE,
      status: statusFilter || undefined,
      truckId: truckFilter || undefined,
      customerId: customerFilter || undefined,
      search: debouncedSearch || undefined,
      dateFrom: listDateFrom,
      dateTo: listDateTo,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      if (lastPage.page < totalPages) return lastPage.page + 1;
      return undefined;
    },
    enabled: searching || (!!dateFrom && !!dateTo),
    staleTime: 30 * 1000,
  });

  // Flatten all loaded pages into a single array
  const trips = useMemo(
    () => infiniteData?.pages.flatMap(p => p.items) ?? [],
    [infiniteData]
  );

  // Total from the last page (server-side count)
  const totalCount = infiniteData?.pages?.[0]?.total ?? 0;

  // ── Sentinel ref for IntersectionObserver ──
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Derived data from summary ──────────────────────────────────────
  const statusCounts = summary?.statusCounts ?? { all: 0, [TripStatus.CREATED]: 0, [TripStatus.IN_TRANSIT]: 0, [TripStatus.COMPLETED]: 0, [TripStatus.LOCKED]: 0, [TripStatus.CANCELED]: 0 };

  const breakdownPct = (statusCounts.all || 0) === 0
    ? { chot: 0, htth: 0, dang: 0, moi: 0, huy: 0 }
    : {
        chot: (statusCounts[TripStatus.LOCKED] / statusCounts.all) * 100,
        htth: (statusCounts[TripStatus.COMPLETED] / statusCounts.all) * 100,
        dang: (statusCounts[TripStatus.IN_TRANSIT] / statusCounts.all) * 100,
        moi: (statusCounts[TripStatus.CREATED] / statusCounts.all) * 100,
        huy: (statusCounts[TripStatus.CANCELED] / statusCounts.all) * 100,
      };

  const truckOptions = summary?.truckOptions ?? [];
  const customerOptions = summary?.customerOptions ?? [];

  // ── Actions ───────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    // Fetch all matching trips by paginating through all pages
    const commonParams = {
      status: statusFilter || undefined,
      truckId: truckFilter || undefined,
      customerId: customerFilter || undefined,
      search: debouncedSearch || undefined,
      dateFrom: listDateFrom,
      dateTo: listDateTo,
    };

    const first = await tripClient.listTrips({ ...commonParams, limit: 100, page: 1 });
    const allTrips = [...first.items];

    const totalPages = Math.ceil(first.total / first.pageSize);
    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          tripClient.listTrips({ ...commonParams, limit: 100, page: i + 2 })
        )
      );
      for (const res of remaining) allTrips.push(...res.items);
    }

    const headers = ['Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM', 'Loại cont', 'Số cont', 'Dầu (L)', 'Tiền đi đường', 'Doanh thu', 'Trạng thái'];
    const rows = allTrips.map((t) => {
      const containers = ((t as any).containers ?? []) as Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }>;
      const typeCodes = Array.from(new Set(containers.map(c => c.containerTypeCode || c.containerTypeName).filter(Boolean))).join(', ');
      const numbers = containers.map(c => c.containerNumber).join(', ');
      return [
        buildTripCode(t),
        t.customer?.name ?? '',
        t.route?.name ?? '',
        t.truck?.licensePlate ?? '',
        t.departureDate ?? '',
        Number(t.route?.distanceKm ?? 0) || '',
        typeCodes,
        numbers,
        t.fuelLiters ?? '',
        t.totalRoadAllowance ?? '',
        t.revenue ?? '',
        TRIP_STATUS_LABELS[t.status],
      ];
    });
    downloadCSV(`so-chuyen-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [statusFilter, truckFilter, customerFilter, debouncedSearch, listDateFrom, listDateTo]);

  const columnHelper = createColumnHelper<TripDetail>();

  const columns = useMemo(() => [
    columnHelper.accessor((row) => row.customer?.name ?? '', {
      id: 'trip',
      header: 'Chuyến · Mã',
      cell: ({ row }) => {
        const trip = row.original;
        const customerName = trip.customer?.name ?? '—';
        const tripCode = buildTripCode(trip);
        return (
          <Link to={`/trips/${trip.id}`} className="trip-col" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }} onClick={(e) => e.stopPropagation()}>
            <div className="trip-name">
              <span style={{ fontFamily: 'var(--font-mono)' }}>{tripCode}</span>
              <span className="trip-meta-sep">·</span>
              <span className="trip-date">{formatDayMonth(trip.departureDate)}</span>
            </div>
            <div className="trip-customer" title={customerName}>{customerName}</div>
          </Link>
        );
      }
    }),
    columnHelper.accessor((row) => row.truck?.licensePlate ?? '', {
      id: 'truck',
      header: 'Xe',
      cell: ({ row }) => {
        const trip = row.original;
        const isCreated = trip.status === TripStatus.CREATED;
        const isCanceled = trip.status === TripStatus.CANCELED;
        return (
          <span className={`plate${isCreated || isCanceled ? ' idle' : ''}`}>
            {trip.truck?.licensePlate ?? '—'}
          </span>
        );
      }
    }),
    columnHelper.accessor((row) => row.route?.name ?? '', {
      id: 'route',
      header: 'Tuyến',
      cell: ({ row }) => {
        const trip = row.original;
        const route = splitRoute(trip.route?.name);
        const fullRoute = trip.route?.name ?? '';
        const km = Number(trip.route?.distanceKm ?? 0);
        return (
          <div className="route-cell-flex" title={fullRoute}>
            {route ? (
              <>
                <div className="route-origin-row">
                  <span className="route-origin">{route.from}</span>
                  <span className="route-arrow-right"><ArrowRight size={11} /></span>
                </div>
                <div className="route-destination">
                  {route.to}
                  {km > 0 && <span className="route-km-inline"> · {km.toLocaleString('vi-VN')}km</span>}
                </div>
              </>
            ) : (
              <div className="route-destination">{fullRoute || '—'}</div>
            )}
            {(trip.containerCount ?? 1) > 1 && (
              <div className="route-tags-row">
                <span className="container-tag multiplier">×{trip.containerCount ?? 1} cont</span>
              </div>
            )}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'container',
      header: 'Container',
      cell: ({ row }) => {
        const trip = row.original;
        const containers: Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }>
          = (trip as any).containers ?? [];
        const codes = Array.from(new Set(containers.map(c => c.containerTypeCode || c.containerTypeName).filter(Boolean)));
        const allNumbers = containers.map(c => c.containerNumber).join(', ');

        if (codes.length === 0 && !trip.trailerType) {
          return <div className="km-empty">—</div>;
        }
        return (
          <div className="container-merged-cell" title={allNumbers || undefined}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {codes.map((code, i) => (
                <span key={i} className="container-tag">{code}</span>
              ))}
              {codes.length === 0 && trip.trailerType && (
                <span className="container-tag">{trip.trailerType}</span>
              )}
            </div>
            {containers.length > 0 && (
              <div className="container-numbers-list">
                {containers.slice(0, 2).map((c, i) => (
                  <span key={i}>{c.containerNumber}</span>
                ))}
                {containers.length > 2 && (
                  <span className="container-numbers-more">+{containers.length - 2}</span>
                )}
              </div>
            )}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'consumption',
      header: 'Tiêu hao',
      cell: ({ row }) => {
        const trip = row.original;
        const cons = calcConsumption(trip);
        const isCanceled = trip.status === TripStatus.CANCELED;
        return (
          <div className="cons-cell">
            {isCanceled ? (
              <div className="cons-empty">
                <span className="empty-icon">
                  <XIcon size={12} />
                  Hủy trước khởi hành
                </span>
              </div>
            ) : cons ? (
              <>
                <div className="cons-main">{cons.liters.toFixed(0)} L</div>
                <div className={`cons-rate ${cons.per100 > warnThreshold ? 'warn' : 'ok'}`}>
                  {cons.per100.toFixed(1).replace('.', ',')} L/100km
                  {cons.per100 > warnThreshold && (
                    <> · vượt {Math.round(((cons.per100 - warnThreshold) / warnThreshold) * 100)}%</>
                  )}
                </div>
              </>
            ) : (
              <div className="cons-empty">
                <span className="empty-icon">
                  <AlertCircle size={12} />
                  Chờ khai báo
                </span>
              </div>
            )}
          </div>
        );
      }
    }),
    columnHelper.accessor((row) => Number(row.totalRoadAllowance ?? 0), {
      id: 'road',
      header: 'Tiền đường',
      cell: ({ row }) => {
        const trip = row.original;
        const road = Number(trip.totalRoadAllowance ?? 0);
        return (
          <div className={road > 0 ? 'money' : 'money-empty'}>
            {road > 0 ? (
              <>
                {formatMoney(road)}
                <span className="money-unit"> ₫</span>
              </>
            ) : (
              '—'
            )}
          </div>
        );
      }
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const trip = row.original;
        const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';
        return (
          <div className="status-cell">
            <span className={`status-pill ${pillClass}`}>
              {TRIP_STATUS_LABELS[trip.status]}
            </span>
          </div>
        );
      }
    })
  ], [navigate, warnThreshold]);

  const tableInstance = useReactTable({
    data: trips,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Month label for hero section
  const todayLabel = `Tháng ${month}/${year}`;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="trip-list-page fade-up" style={{ paddingBottom: 40 }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
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
              {(summary?.missingFuel ?? 0) > 0 && (
                <> · {summary?.missingFuel} chưa khai báo dầu</>
              )}
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className="btn-d btn-d--ghost-dark" onClick={handleExport}>
              <Download size={15} />
              Xuất Excel
            </button>
            <button
              type="button"
              className="btn-d btn-d--primary"
              onClick={() => navigate('/trips/new')} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate('/trips/new'); } }}
            >
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
              ) : (
                <>TB không khả dụng (0 km)</>
              )}
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

      {/* ── FILTERS ──────────────────────────────────────────────────── */}
      <div className="filters-card">
        <div className="filters-row-top">
          <div className="status-tabs">
            <button
              className={`stab-pill${statusFilter === '' ? ' active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              <span className="stab-dot" style={{ '--dot': '#0F1A14' } as React.CSSProperties} />
              Tất cả
              <span className="stab-count">{statusCounts.all}</span>
            </button>
            <button
              className={`stab-pill${statusFilter === TripStatus.CREATED ? ' active' : ''}${statusCounts[TripStatus.CREATED] === 0 ? ' zero' : ''}`}
              onClick={() => setStatusFilter(TripStatus.CREATED)}
            >
              <span className="stab-dot" style={{ '--dot': '#9AA4AD' } as React.CSSProperties} />
              Mới tạo
              <span className="stab-count">{statusCounts[TripStatus.CREATED]}</span>
            </button>
            <button
              className={`stab-pill${statusFilter === TripStatus.IN_TRANSIT ? ' active' : ''}${statusCounts[TripStatus.IN_TRANSIT] === 0 ? ' zero' : ''}`}
              onClick={() => setStatusFilter(TripStatus.IN_TRANSIT)}
            >
              <span className="stab-dot" style={{ '--dot': '#1D9F5B' } as React.CSSProperties} />
              Đang chạy
              <span className="stab-count">{statusCounts[TripStatus.IN_TRANSIT]}</span>
            </button>
            <button
              className={`stab-pill${statusFilter === TripStatus.COMPLETED ? ' active' : ''}${statusCounts[TripStatus.COMPLETED] === 0 ? ' zero' : ''}`}
              onClick={() => setStatusFilter(TripStatus.COMPLETED)}
            >
              <span className="stab-dot" style={{ '--dot': '#2D7FF9' } as React.CSSProperties} />
              Hoàn thành
              <span className="stab-count">{statusCounts[TripStatus.COMPLETED]}</span>
            </button>
            <button
              className={`stab-pill${statusFilter === TripStatus.LOCKED ? ' active' : ''}${statusCounts[TripStatus.LOCKED] === 0 ? ' zero' : ''}`}
              onClick={() => setStatusFilter(TripStatus.LOCKED)}
            >
              <span className="stab-dot" style={{ '--dot': '#E0A106' } as React.CSSProperties} />
              Đã khóa
              <span className="stab-count">{statusCounts[TripStatus.LOCKED]}</span>
            </button>
            <button
              className={`stab-pill${statusFilter === TripStatus.CANCELED ? ' active' : ''}${statusCounts[TripStatus.CANCELED] === 0 ? ' zero' : ''}`}
              onClick={() => setStatusFilter(TripStatus.CANCELED)}
            >
              <span className="stab-dot" style={{ '--dot': '#E0533D' } as React.CSSProperties} />
              Đã hủy
              <span className="stab-count">{statusCounts[TripStatus.CANCELED]}</span>
            </button>
          </div>
        </div>

        <div className="filters-divider" />

        <div className="filters-row-bottom">
          <div className="filters-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Tìm theo mã chuyến, KH, biển số, số cont"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searching && (
            <span
              className="filters-search-hint"
              title="Khi tìm kiếm, hệ thống bỏ qua bộ lọc tháng để tìm trên tất cả các tháng."
            >
              Đang tìm trên tất cả tháng
            </span>
          )}
          <label className={`filter-pill${truckFilter ? ' has-value' : ''}`}>
            <div className="filter-lbl-wrap">
              <span className="filter-lbl-cap">Phương tiện</span>
              <select value={truckFilter} onChange={(e) => setTruckFilter(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Tất cả xe</option>
                {truckOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.licensePlate}</option>
                ))}
              </select>
            </div>
            <svg className="filter-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </label>

          <label className={`filter-pill${customerFilter ? ' has-value' : ''}`}>
            <div className="filter-lbl-wrap">
              <span className="filter-lbl-cap">Khách hàng</span>
              <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Tất cả khách hàng</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <svg className="filter-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </label>
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-scroll-body">
          <div className="table-head">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <React.Fragment key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  let cls = '';
                  if (header.column.id === 'route') cls = 'col-route';
                  else if (header.column.id === 'consumption') cls = 'col-consumption';
                  else if (header.column.id === 'road') cls = 'col-road right';
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

          {loading ? (
            <div className="table-empty">Đang tải danh sách chuyến đi…</div>
          ) : trips.length === 0 ? (
            <div className="table-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px' }}>
              <img src="/assets/illustrations/empty-trips.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Không tìm thấy chuyến đi nào.
            </div>
          ) : (
            tableInstance.getRowModel().rows.map(row => (
              <div
                key={row.id}
                className="table-row"
                onClick={() => navigate(`/trips/${row.original.id}`)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/trips/${row.original.id}`); } }}
              >
                {row.getVisibleCells().map(cell => {
                  let cls = '';
                  if (cell.column.id === 'route') cls = 'col-route';
                  else if (cell.column.id === 'consumption') cls = 'col-consumption';
                  else if (cell.column.id === 'road') cls = 'col-road right';
                  else if (cell.column.id === 'status') cls = 'col-status center';
                  return (
                    <div key={cell.id} className={cls}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── MOBILE CARDS ─────────────────────────────────────────── */}
        <div className="trip-mobile-list">
          {loading ? (
            <div className="table-empty">Đang tải…</div>
          ) : trips.length === 0 ? (
            <div className="table-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px' }}>
              <img src="/assets/illustrations/empty-trips.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              Không tìm thấy chuyến đi nào.
            </div>
          ) : (
            trips.map((trip) => {
              const cons = calcConsumption(trip);
              const route = splitRoute(trip.route?.name);
              const isCanceled = trip.status === TripStatus.CANCELED;
              const isCreated = trip.status === TripStatus.CREATED;
              const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';
              const km = Number(trip.route?.distanceKm ?? 0);
              const road = Number(trip.totalRoadAllowance ?? 0);

              const tripContainers: Array<{ containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null }>
                = (trip as any).containers ?? [];
              const typeCodes = Array.from(new Set(tripContainers.map(c => c.containerTypeCode || c.containerTypeName).filter(Boolean)));

              return (
                <div
                  key={trip.id}
                  className="trip-mcard"
                  onClick={() => navigate(`/trips/${trip.id}`)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/trips/${trip.id}`); } }}
                >
                  <div className="trip-mcard__top">
                    <div className="left">
                      <div className="trip-mcard__name">{trip.customer?.name ?? '—'}</div>
                      <div className="trip-mcard__id">
                        {buildTripCode(trip)}
                        <span className="trip-meta-sep">·</span>
                        <span>{formatDayMonth(trip.departureDate)}</span>
                        <span className="trip-meta-sep">·</span>
                        <span className={`plate${isCreated || isCanceled ? ' idle' : ''}`} style={{ fontSize: 10, padding: '2px 7px' }}>
                          {trip.truck?.licensePlate ?? '—'}
                        </span>
                      </div>
                    </div>
                    <span className={`status-pill ${pillClass}`}>
                      {TRIP_STATUS_LABELS[trip.status]}
                    </span>
                  </div>

                  <div className="trip-mcard__route">
                    {route ? (
                      <>
                        {route.from}
                        <span className="arr"><ArrowRight size={12} /></span>
                        {route.to}
                      </>
                    ) : (
                      trip.route?.name ?? '—'
                    )}
                  </div>

                  {tripContainers.length > 0 && (
                    <div className="trip-mcard__containers" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {typeCodes.map((code, i) => (
                          <span key={i} className="container-tag" style={{ fontSize: 10 }}>{code}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
                        {tripContainers.slice(0, 4).map((c, i) => (
                          <span key={i}>{c.containerNumber}</span>
                        ))}
                        {tripContainers.length > 4 && (
                          <span style={{ color: 'var(--ink-3)' }}>+{tripContainers.length - 4}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="trip-mcard__meta">
                    <div className="mm">
                      <span className="lab">KM</span>
                      <span className={km > 0 ? 'val' : 'val empty'}>
                        {km > 0 ? `${km.toLocaleString('vi-VN')} km` : '—'}
                      </span>
                    </div>
                    <div className="mm">
                      <span className="lab">Tiêu hao</span>
                      {isCanceled ? (
                        <span className="val empty">—</span>
                      ) : cons ? (
                        <span className={`val${cons.per100 > warnThreshold ? ' warn' : ''}`}>
                          {cons.per100.toFixed(1).replace('.', ',')} L/100km
                        </span>
                      ) : (
                        <span className="val empty">Chờ khai báo</span>
                      )}
                    </div>
                    <div className="mm">
                      <span className="lab">Tiền đi đường</span>
                      <span className={road > 0 ? 'val' : 'val empty'}>
                        {road > 0 ? `${formatMoney(road)} ₫` : '—'}
                      </span>
                    </div>
                    <div className="mm">
                      <span className="lab">Dầu</span>
                      <span className={cons ? 'val' : 'val empty'}>
                        {cons ? `${cons.liters.toFixed(0)} L` : 'Chờ khai báo'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Infinite scroll sentinel (shared by desktop + mobile) ─── */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {isFetchingNextPage && (
          <div className="table-empty" style={{ padding: '16px 0' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
            Đang tải thêm…
          </div>
        )}

        {/* ── Footer info ──────────────────────────────────────────── */}
        {trips.length > 0 && (
          <div className="table-foot">
            <div className="page-info">
              Hiển thị <b>{trips.length}</b> trong <b>{totalCount}</b> chuyến
              {!hasNextPage && ' · Đã tải tất cả'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
