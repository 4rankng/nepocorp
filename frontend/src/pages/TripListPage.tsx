import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  ChevronLeft,
  ChevronRight,
  Pencil,
  Eye,
  AlertCircle,
  X as XIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { tripClient } from '../api/tripClient';
import { formatCurrency } from '../lib/format';
import { downloadCSV } from '../lib/csv';
import { TripStatus, TRIP_STATUS_LABELS, parseThreshold } from '@nepocorp/shared';
import type { TripDetail } from '@nepocorp/shared';
import { useFuelConfig } from '../hooks/useQueries';

// ─── Constants ────────────────────────────────────────────────────────────
type StatusFilter = '' | TripStatus;

const STATUS_PILL_CLASS: Record<TripStatus, string> = {
  [TripStatus.CREATED]: 'pill-moi',
  [TripStatus.IN_TRANSIT]: 'pill-dang',
  [TripStatus.COMPLETED]: 'pill-htth',
  [TripStatus.LOCKED]: 'pill-chot',
  [TripStatus.CANCELED]: 'pill-huy',
};

const VN_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// Default threshold for "warn" consumption (L/100km) — overridden by fuel config when loaded
const DEFAULT_WARN_THRESHOLD = 37;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Helpers ──────────────────────────────────────────────────────────────
function splitRoute(routeName: string | undefined | null): { from: string; to: string } | null {
  if (!routeName) return null;
  const separators = ['→', '⇒', '->', ' - ', ' – ', '>'];
  for (const sep of separators) {
    if (routeName.includes(sep)) {
      const [from, to] = routeName.split(sep).map((s) => s.trim());
      if (from && to) return { from, to };
    }
  }
  return null;
}

function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildTripCode(trip: TripDetail): string {
  const d = trip.departure_date ? new Date(trip.departure_date) : null;
  if (d && !Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `#CT-${dd}${mm}-${String(trip.id).padStart(3, '0')}`;
  }
  return `#CT-${String(trip.id).padStart(3, '0')}`;
}

function calcConsumption(trip: TripDetail): { liters: number; per100: number } | null {
  const fuel = trip.fuel_liters ? Number(trip.fuel_liters) : null;
  const distance = Number(trip.route?.distance_km ?? 0);
  if (!fuel || !distance) return null;
  return { liters: fuel, per100: (fuel / distance) * 100 };
}

function formatMoney(n: number): string {
  return formatCurrency(n).replace(' ₫', '').replace('₫', '').trim();
}

// ─── Component ────────────────────────────────────────────────────────────
export default function TripListPage() {
  const navigate = useNavigate();
  const { data, isLoading: loading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripClient.listTrips({ limit: 500 }),
  });
  const trips = data?.items || [];
  const { data: fuelConfig } = useFuelConfig();

  // Dynamic threshold from fuel_config — NaN-safe fallback to default
  const warnThreshold = fuelConfig
    ? parseThreshold(fuelConfig.warning_threshold, DEFAULT_WARN_THRESHOLD)
    : DEFAULT_WARN_THRESHOLD;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('');
  const [truckFilter, setTruckFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const selectedRef = useRef<Set<number>>(new Set());
  const [selectedVersion, setSelectedVersion] = useState(0);
  const selected = selectedRef.current;

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);


  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, monthYearFilter, truckFilter, customerFilter, searchQuery]);

  // ── Derived data ──────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: trips.length,
      [TripStatus.CREATED]: 0,
      [TripStatus.IN_TRANSIT]: 0,
      [TripStatus.COMPLETED]: 0,
      [TripStatus.LOCKED]: 0,
      [TripStatus.CANCELED]: 0,
    };
    for (const t of trips) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips.filter((trip) => {
      if (statusFilter && trip.status !== statusFilter) return false;
      if (monthYearFilter) {
        if (!trip.departure_date?.startsWith(monthYearFilter)) return false;
      }
      if (truckFilter && trip.truck?.license_plate !== truckFilter) return false;
      if (customerFilter && String(trip.customer_id) !== customerFilter) return false;
      if (q) {
        const matchId = String(trip.id).includes(q);
        const matchCode = buildTripCode(trip).toLowerCase().includes(q);
        const matchCustomer = trip.customer?.name?.toLowerCase().includes(q) ?? false;
        const matchRoute = trip.route?.name?.toLowerCase().includes(q) ?? false;
        const matchPlate = trip.truck?.license_plate?.toLowerCase().includes(q) ?? false;
        if (!matchId && !matchCode && !matchCustomer && !matchRoute && !matchPlate) return false;
      }
      return true;
    });
  }, [trips, statusFilter, monthYearFilter, truckFilter, customerFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRange = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, safePage, pageSize]);
  const pageRangeRef = useRef<TripDetail[]>([]);
  pageRangeRef.current = pageRange;

  // ── Hero metrics (current month) ──────────────────────────────────────
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTrips = useMemo(
    () => trips.filter((t) => t.departure_date?.startsWith(monthKey)),
    [trips, monthKey],
  );

  const heroSummary = useMemo(() => {
    let km = 0;
    let fuel = 0;
    let road = 0;
    let revenue = 0;
    let missingFuel = 0;
    for (const t of monthTrips) {
      km += Number(t.route?.distance_km ?? 0);
      const f = t.fuel_liters ? Number(t.fuel_liters) : 0;
      if (f) fuel += f;
      else missingFuel++;
      road += Number(t.total_road_allowance ?? 0);
      revenue += Number(t.revenue ?? 0);
    }
    const avgPer100 = km > 0 && fuel > 0 ? (fuel / km) * 100 : 0;
    return { km, fuel, road, revenue, missingFuel, avgPer100 };
  }, [monthTrips]);

  // Status breakdown for breakdown bar (all trips, not just this month)
  const breakdownPct = (statusCounts.all || 0) === 0
    ? { chot: 0, htth: 0, dang: 0, moi: 0, huy: 0 }
    : {
        chot: (statusCounts[TripStatus.LOCKED] / statusCounts.all) * 100,
        htth: (statusCounts[TripStatus.COMPLETED] / statusCounts.all) * 100,
        dang: (statusCounts[TripStatus.IN_TRANSIT] / statusCounts.all) * 100,
        moi: (statusCounts[TripStatus.CREATED] / statusCounts.all) * 100,
        huy: (statusCounts[TripStatus.CANCELED] / statusCounts.all) * 100,
      };

  // Distinct trucks + customers for dropdowns
  const truckOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of trips) {
      if (t.truck?.license_plate) set.add(t.truck.license_plate);
    }
    return Array.from(set).sort();
  }, [trips]);

  const customerOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of trips) {
      if (t.customer?.name) map.set(t.customer_id, t.customer.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  }, [trips]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${VN_MONTHS[d.getMonth()]}/${d.getFullYear()}`,
      };
    });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM', 'Dầu (L)', 'Tiền đường', 'Doanh thu', 'Trạng thái'];
    const rows = filteredTrips.map((t) => [
      buildTripCode(t),
      t.customer?.name ?? '',
      t.route?.name ?? '',
      t.truck?.license_plate ?? '',
      t.departure_date ?? '',
      Number(t.route?.distance_km ?? 0) || '',
      t.fuel_liters ?? '',
      t.total_road_allowance ?? '',
      t.revenue ?? '',
      TRIP_STATUS_LABELS[t.status],
    ]);
    downloadCSV(`so-chuyen-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const toggleSelected = useCallback((id: number) => {
    const next = selectedRef.current;
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedVersion(v => v + 1);
  }, []);

  const toggleSelectAll = useCallback(() => {
    const visibleIds = pageRangeRef.current.map((t) => t.id);
    const allSelected = visibleIds.every((id) => selectedRef.current.has(id));
    const next = selectedRef.current;
    if (allSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    setSelectedVersion(v => v + 1);
  }, []);

  const allVisibleSelected =
    pageRange.length > 0 && pageRange.every((t) => selectedRef.current.has(t.id));

  const columnHelper = createColumnHelper<TripDetail>();

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => (
        <div
          className={`cb${allVisibleSelected ? ' checked' : ''}`}
          onClick={toggleSelectAll}
          role="checkbox"
          aria-checked={allVisibleSelected}
          tabIndex={0}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <div
            className={`cb${selected.has(row.original.id) ? ' checked' : ''}`}
            onClick={() => toggleSelected(row.original.id)}
            role="checkbox"
            aria-checked={selected.has(row.original.id)}
          />
        </div>
      )
    }),
    columnHelper.accessor((row) => row.customer?.name ?? '', {
      id: 'trip',
      header: 'Chuyến · Mã',
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="trip-col">
            <div className="trip-name">{trip.customer?.name ?? '—'}</div>
            <div className="trip-meta">
              <span className="trip-id">{buildTripCode(trip)}</span>
              <span className="trip-meta-sep">·</span>
              <span>{formatDayMonth(trip.departure_date)}</span>
            </div>
          </div>
        );
      }
    }),
    columnHelper.accessor((row) => row.truck?.license_plate ?? '', {
      id: 'truck',
      header: 'Xe',
      cell: ({ row }) => {
        const trip = row.original;
        const isCreated = trip.status === TripStatus.CREATED;
        const isCanceled = trip.status === TripStatus.CANCELED;
        return (
          <span className={`plate${isCreated || isCanceled ? ' idle' : ''}`}>
            {trip.truck?.license_plate ?? '—'}
          </span>
        );
      }
    }),
    columnHelper.accessor((row) => row.route?.name ?? '', {
      id: 'route',
      header: 'Tuyến · Khách hàng',
      cell: ({ row }) => {
        const trip = row.original;
        const route = splitRoute(trip.route?.name);
        const containerTag = trip.trailer?.type ?? '40FT';
        return (
          <div className="route-cust">
            <div className="route-line">
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
            <div className="cust-line">
              {trip.customer?.name ?? '—'}
              <span className="container-tag">{containerTag}</span>
            </div>
          </div>
        );
      }
    }),
    columnHelper.accessor((row) => Number(row.route?.distance_km ?? 0), {
      id: 'km',
      header: 'KM',
      cell: ({ row }) => {
        const trip = row.original;
        const km = Number(trip.route?.distance_km ?? 0);
        return (
          <div className={km > 0 ? 'km-val' : 'km-empty'}>
            {km > 0 ? (
              <>
                {km.toLocaleString('vi-VN')}
                <span className="km-unit"> km</span>
              </>
            ) : (
              '—'
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
    columnHelper.accessor((row) => Number(row.total_road_allowance ?? 0), {
      id: 'road',
      header: 'Tiền đường',
      cell: ({ row }) => {
        const trip = row.original;
        const road = Number(trip.total_road_allowance ?? 0);
        const isCanceled = trip.status === TripStatus.CANCELED;
        return (
          <div className={road > 0 ? 'money' : 'money-empty'}>
            {road > 0 ? (
              <>
                {formatMoney(road)}
                <span className="money-unit"> ₫</span>
              </>
            ) : isCanceled ? (
              '— hủy'
            ) : (
              '— chưa có'
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
              <span className="sd" />
              {TRIP_STATUS_LABELS[trip.status]}
            </span>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="action-btn"
              title="Sửa"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="action-btn"
              title="Chi tiết"
              onClick={() => navigate(`/trips/${trip.id}`)}
            >
              <Eye size={14} />
            </button>
          </div>
        );
      }
    })
  ], [selectedVersion, navigate]);

  const tableInstance = useReactTable({
    data: pageRange,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Today human-friendly
  const todayLabel = `${VN_MONTHS[now.getMonth()]}/${now.getFullYear()}`;

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
              {trips.length} chuyến đã ghi nhận
              {statusCounts[TripStatus.COMPLETED] > 0 && (
                <> · {statusCounts[TripStatus.COMPLETED]} chờ chốt</>
              )}
              {heroSummary.missingFuel > 0 && (
                <> · {heroSummary.missingFuel} chưa khai báo dầu</>
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
              onClick={() => navigate('/trips/new')}
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
              <span className="legend-item"><span className="legend-dot bb-chot" />Đã chốt {statusCounts[TripStatus.LOCKED]}</span>
              <span className="legend-item"><span className="legend-dot bb-htth" />Hoàn thành {statusCounts[TripStatus.COMPLETED]}</span>
              <span className="legend-item"><span className="legend-dot bb-dang" />Đang chạy {statusCounts[TripStatus.IN_TRANSIT]}</span>
              <span className="legend-item"><span className="legend-dot bb-moi"  />Mới tạo {statusCounts[TripStatus.CREATED]}</span>
              <span className="legend-item"><span className="legend-dot bb-huy"  />Đã hủy {statusCounts[TripStatus.CANCELED]}</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng KM tháng này</div>
            <div className="metric-value d-mono">
              {heroSummary.km.toLocaleString('vi-VN')}
              <span className="metric-unit">km</span>
            </div>
            <div className="metric-delta delta-flat">{monthTrips.length} chuyến tháng này</div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng dầu tiêu thụ</div>
            <div className="metric-value d-mono">
              {heroSummary.fuel.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
              <span className="metric-unit">L</span>
            </div>
            <div className={`metric-delta ${heroSummary.avgPer100 > warnThreshold ? 'delta-warn' : 'delta-flat'}`}>
              TB {heroSummary.avgPer100.toFixed(1).replace('.', ',')} L/100km · ngưỡng {warnThreshold.toFixed(1).replace('.', ',')}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Tiền đi đường</div>
            <div className="metric-value d-mono">
              {formatMoney(heroSummary.road)}
              <span className="metric-unit">₫</span>
            </div>
            <div className="metric-delta delta-flat">
              {heroSummary.missingFuel > 0
                ? `${heroSummary.missingFuel} chuyến chưa cập nhật`
                : 'Đã cập nhật đầy đủ'}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Doanh thu vận chuyển</div>
            <div className="metric-value d-mono">
              {formatMoney(heroSummary.revenue)}
              <span className="metric-unit">₫</span>
            </div>
            <div className="metric-delta delta-flat">Tháng {now.getMonth() + 1}</div>
          </div>
        </div>
      </section>

      {/* ── FILTERS ──────────────────────────────────────────────────── */}
      <div className="filters-bar">
        <div className="seg-tabs">
          <button
            type="button"
            className={`stab${statusFilter === '' ? ' active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            Tất cả <span className="stc">{statusCounts.all}</span>
          </button>
          <button
            type="button"
            className={`stab${statusFilter === TripStatus.CREATED ? ' active' : ''}`}
            onClick={() => setStatusFilter(TripStatus.CREATED)}
          >
            Mới tạo <span className="stc">{statusCounts[TripStatus.CREATED]}</span>
          </button>
          <button
            type="button"
            className={`stab${statusFilter === TripStatus.IN_TRANSIT ? ' active' : ''}`}
            onClick={() => setStatusFilter(TripStatus.IN_TRANSIT)}
          >
            Đang chạy <span className="stc">{statusCounts[TripStatus.IN_TRANSIT]}</span>
          </button>
          <button
            type="button"
            className={`stab warn${statusFilter === TripStatus.COMPLETED ? ' active' : ''}`}
            onClick={() => setStatusFilter(TripStatus.COMPLETED)}
          >
            Hoàn thành <span className="stc">{statusCounts[TripStatus.COMPLETED]}</span>
          </button>
          <button
            type="button"
            className={`stab${statusFilter === TripStatus.LOCKED ? ' active' : ''}`}
            onClick={() => setStatusFilter(TripStatus.LOCKED)}
          >
            Đã chốt <span className="stc">{statusCounts[TripStatus.LOCKED]}</span>
          </button>
          <button
            type="button"
            className={`stab alert${statusFilter === TripStatus.CANCELED ? ' active' : ''}`}
            onClick={() => setStatusFilter(TripStatus.CANCELED)}
          >
            Đã hủy <span className="stc">{statusCounts[TripStatus.CANCELED]}</span>
          </button>
        </div>

        <div className="divider-v" />

        <label className="dropdown">
          <select value={monthYearFilter} onChange={(e) => setMonthYearFilter(e.target.value)}>
            <option value="">Tất cả thời gian</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        <label className="dropdown">
          <select value={truckFilter} onChange={(e) => setTruckFilter(e.target.value)}>
            <option value="">Tất cả xe</option>
            {truckOptions.map((plate) => (
              <option key={plate} value={plate}>{plate}</option>
            ))}
          </select>
        </label>

        <label className="dropdown">
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option value="">Tất cả khách hàng</option>
            {customerOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>

        <div className="table-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Tìm theo mã chuyến, KH, biển số…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-head">
          {tableInstance.getHeaderGroups().map(headerGroup => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <div key={header.id} className={header.column.id === 'route' ? 'col-route' : header.column.id === 'km' || header.column.id === 'road' || header.column.id === 'actions' ? 'right' : ''}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {loading ? (
          <div className="table-empty">Đang tải danh sách chuyến đi…</div>
        ) : filteredTrips.length === 0 ? (
          <div className="table-empty">Không tìm thấy chuyến đi nào.</div>
        ) : (
          tableInstance.getRowModel().rows.map(row => (
            <div
              key={row.id}
              className="table-row"
              onClick={() => navigate(`/trips/${row.original.id}`)}
            >
              {row.getVisibleCells().map(cell => (
                <div key={cell.id} className={cell.column.id === 'route' ? 'col-route' : cell.column.id === 'km' || cell.column.id === 'road' || cell.column.id === 'actions' ? 'right' : ''}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))
        )}

        {/* ── MOBILE CARDS ─────────────────────────────────────────── */}
        <div className="trip-mobile-list">
          {loading ? (
            <div className="table-empty">Đang tải…</div>
          ) : filteredTrips.length === 0 ? (
            <div className="table-empty">Không tìm thấy chuyến đi nào.</div>
          ) : (
            pageRange.map((trip) => {
              const cons = calcConsumption(trip);
              const route = splitRoute(trip.route?.name);
              const isCanceled = trip.status === TripStatus.CANCELED;
              const isCreated = trip.status === TripStatus.CREATED;
              const pillClass = STATUS_PILL_CLASS[trip.status] ?? 'pill-moi';
              const km = Number(trip.route?.distance_km ?? 0);
              const road = Number(trip.total_road_allowance ?? 0);

              return (
                <div
                  key={trip.id}
                  className="trip-mcard"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  <div className="trip-mcard__top">
                    <div className="left">
                      <div className="trip-mcard__name">{trip.customer?.name ?? '—'}</div>
                      <div className="trip-mcard__id">
                        {buildTripCode(trip)}
                        <span className="trip-meta-sep">·</span>
                        <span>{formatDayMonth(trip.departure_date)}</span>
                        <span className="trip-meta-sep">·</span>
                        <span className={`plate${isCreated || isCanceled ? ' idle' : ''}`} style={{ fontSize: 10, padding: '2px 7px' }}>
                          {trip.truck?.license_plate ?? '—'}
                        </span>
                      </div>
                    </div>
                    <span className={`status-pill ${pillClass}`}>
                      <span className="sd" />
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
                      <span className="lab">Tiền đường</span>
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

        {/* ── Pagination footer ──────────────────────────────────── */}
        {filteredTrips.length > 0 && (
          <div className="table-foot">
            <div className="page-info">
              Hiển thị{' '}
              <b>
                {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredTrips.length)}
              </b>{' '}
              trong <b>{filteredTrips.length}</b> chuyến
              {selected.size > 0 && <span> · {selected.size} đã chọn</span>}
            </div>
            <div className="pagination">
              <button
                type="button"
                className="page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft size={12} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Show first, last, current ±1
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - safePage) <= 1) return true;
                  return false;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const gap = prev && p - prev > 1;
                  return (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {gap && <span style={{ color: 'var(--ink-3)', padding: '0 4px' }}>…</span>}
                      <button
                        type="button"
                        className={`page-btn${p === safePage ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
              <button
                type="button"
                className="page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
              >
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="ps-select">
              Hiển thị
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              chuyến / trang
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
