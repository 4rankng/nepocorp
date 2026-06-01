import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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
  const { data, isLoading: loading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripClient.listTrips({ limit: 500 }),
  });
  const trips = data?.items || [];
  const { data: fuelConfig } = useFuelConfig();

  // Dynamic threshold from fuel_config — NaN-safe fallback to default
  const warnThreshold = fuelConfig
    ? parseThreshold(fuelConfig.warningThreshold, DEFAULT_WARN_THRESHOLD)
    : DEFAULT_WARN_THRESHOLD;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [truckFilter, setTruckFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { month, year } = useMonth();

  // Resolve salary period for the global month
  const { data: salaryPeriod } = useSalaryPeriod(month, year);
  const selectedRef = useRef<Set<number>>(new Set());
  const [selectedVersion, setSelectedVersion] = useState(0);
  const selected = selectedRef.current;

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);


  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, month, year, truckFilter, customerFilter, searchQuery]);

  // ── Derived data ──────────────────────────────────────────────────────
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  
  const baseTrips = useMemo(() => {
    return trips.filter((trip) => {
      const dep = trip.departureDate;
      if (salaryPeriod) {
        if (!dep || dep < salaryPeriod.start || dep > salaryPeriod.end) return false;
      } else {
        if (!dep?.startsWith(monthKey)) return false;
      }
      return true;
    });
  }, [trips, salaryPeriod, monthKey]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: baseTrips.length,
      [TripStatus.CREATED]: 0,
      [TripStatus.IN_TRANSIT]: 0,
      [TripStatus.COMPLETED]: 0,
      [TripStatus.LOCKED]: 0,
      [TripStatus.CANCELED]: 0,
    };
    for (const t of baseTrips) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [baseTrips]);

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseTrips.filter((trip) => {
      if (statusFilter && trip.status !== statusFilter) return false;
      if (truckFilter && trip.truck?.licensePlate !== truckFilter) return false;
      if (customerFilter && String(trip.customerId) !== customerFilter) return false;
      if (q) {
        const matchId = String(trip.id).includes(q);
        const matchCode = buildTripCode(trip).toLowerCase().includes(q);
        const matchCustomer = trip.customer?.name?.toLowerCase().includes(q) ?? false;
        const matchRoute = trip.route?.name?.toLowerCase().includes(q) ?? false;
        const matchPlate = trip.truck?.licensePlate?.toLowerCase().includes(q) ?? false;
        if (!matchId && !matchCode && !matchCustomer && !matchRoute && !matchPlate) return false;
      }
      return true;
    });
  }, [baseTrips, statusFilter, truckFilter, customerFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRange = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, safePage, pageSize]);
  const pageRangeRef = useRef<TripDetail[]>([]);
  pageRangeRef.current = pageRange;

  // ── Hero metrics (selected month) ──────────────────────────────────────
  const heroSummary = useMemo(() => {
    let km = 0;
    let fuel = 0;
    let road = 0;
    let revenue = 0;
    let missingFuel = 0;
    for (const t of baseTrips) {
      km += Number(t.route?.distanceKm ?? 0);
      const f = t.fuelLiters ? Number(t.fuelLiters) : 0;
      if (f) fuel += f;
      else missingFuel++;
      road += Number(t.totalRoadAllowance ?? 0);
      revenue += Number(t.revenue ?? 0);
    }
    const avgPer100 = km > 0 && fuel > 0 ? (fuel / km) * 100 : 0;
    return { km, fuel, road, revenue, missingFuel, avgPer100 };
  }, [baseTrips]);

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
    for (const t of baseTrips) {
      if (t.truck?.licensePlate) set.add(t.truck.licensePlate);
    }
    return Array.from(set).sort();
  }, [baseTrips]);

  const customerOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of baseTrips) {
      if (t.customer?.name) map.set(t.customerId, t.customer.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  }, [baseTrips]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['Mã', 'Khách hàng', 'Tuyến', 'Xe', 'Ngày khởi hành', 'KM', 'Loại cont', 'Số cont', 'Dầu (L)', 'Tiền đi đường', 'Doanh thu', 'Trạng thái'];
    const rows = filteredTrips.map((t) => {
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
    columnHelper.accessor((row) => row.customer?.name ?? '', {
      id: 'trip',
      header: 'Chuyến · Mã',
      cell: ({ row }) => {
        const trip = row.original;
        const customerName = trip.customer?.name ?? '—';
        const tripCode = buildTripCode(trip);
        return (
          <Link to={`/trips/${trip.id}`} className="trip-col" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }} onClick={(e) => e.stopPropagation()}>
            <div className="trip-name" title={tripCode}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{tripCode}</span>
            </div>
            <div className="trip-meta" title={customerName}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName}</span>
              <span className="trip-meta-sep">·</span>
              <span>{formatDayMonth(trip.departureDate)}</span>
            </div>
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
        return (
          <div className="route-cell-flex" title={fullRoute}>
            {route ? (
              <>
                <div className="route-origin-row">
                  <span className="route-origin">{route.from}</span>
                  <span className="route-arrow-right"><ArrowRight size={11} /></span>
                </div>
                <div className="route-destination">{route.to}</div>
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
    columnHelper.accessor((row) => Number(row.route?.distanceKm ?? 0), {
      id: 'km',
      header: 'KM',
      cell: ({ row }) => {
        const trip = row.original;
        const km = Number(trip.route?.distanceKm ?? 0);
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
      id: 'containerType',
      header: 'Loại cont',
      cell: ({ row }) => {
        const trip = row.original;
        const containers: Array<{ containerTypeCode: string | null; containerTypeName: string | null }>
          = (trip as any).containers ?? [];
        const codes = Array.from(new Set(containers.map(c => c.containerTypeCode || c.containerTypeName).filter(Boolean)));
        if (codes.length > 0) {
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {codes.map((code, i) => (
                <span key={i} className="container-tag">{code}</span>
              ))}
            </div>
          );
        }
        if (trip.trailerType) {
          return <span className="container-tag">{trip.trailerType}</span>;
        }
        return <div className="km-empty">—</div>;
      }
    }),
    columnHelper.display({
      id: 'containerNumbers',
      header: 'Số cont',
      cell: ({ row }) => {
        const containers: Array<{ containerNumber: string }> = (row.original as any).containers ?? [];
        if (containers.length === 0) {
          return <div className="km-empty">—</div>;
        }
        const allNumbers = containers.map(c => c.containerNumber).join(', ');
        return (
          <div
            title={allNumbers}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              fontSize: 11.5,
              fontFamily: 'var(--font-mono)',
              minWidth: 0,
            }}
          >
            {containers.slice(0, 2).map((c, i) => (
              <span key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.containerNumber}
              </span>
            ))}
            {containers.length > 2 && (
              <span style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>+{containers.length - 2} nữa</span>
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
  ], [selectedVersion, navigate, warnThreshold]);

  const tableInstance = useReactTable({
    data: pageRange,
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
              {baseTrips.length} chuyến đã ghi nhận
              {statusCounts[TripStatus.COMPLETED] > 0 && (
                <span title="Chờ khóa: chuyến đã hoàn thành, chờ kế toán xác nhận khóa sổ kế toán"> · {statusCounts[TripStatus.COMPLETED]} chờ khóa</span>
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
              {heroSummary.km.toLocaleString('vi-VN')}
              <span className="metric-unit">km</span>
            </div>
            <div className="metric-delta delta-flat">{baseTrips.length} chuyến tháng này</div>
          </div>
          <div className="metric">
            <div className="metric-label">Tổng dầu tiêu thụ</div>
            <div className="metric-value d-mono">
              {heroSummary.fuel.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
              <span className="metric-unit">L</span>
            </div>
            <div className={`metric-delta ${heroSummary.km > 0 && heroSummary.avgPer100 > warnThreshold ? 'delta-warn' : 'delta-flat'}`}>
              {heroSummary.km > 0 ? (
                <>TB {heroSummary.avgPer100.toFixed(1).replace('.', ',')} L/100km · ngưỡng {warnThreshold.toFixed(1).replace('.', ',')}</>
              ) : (
                <>TB không khả dụng (0 km)</>
              )}
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
            <div className="metric-label">Tổng giá trị lệnh <span style={{ fontWeight: 400, fontSize: '0.85em', opacity: 0.7 }}>(tất cả trạng thái)</span></div>
            <div className="metric-value d-mono">
              {formatMoney(heroSummary.revenue)}
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
              placeholder="Tìm theo mã chuyến, KH, biển số"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <label className={`filter-pill${truckFilter ? ' has-value' : ''}`}>
            <div className="filter-lbl-wrap">
              <span className="filter-lbl-cap">Phương tiện</span>
              <select value={truckFilter} onChange={(e) => setTruckFilter(e.target.value)}>
                <option value="">Tất cả xe</option>
                {truckOptions.map((plate) => (
                  <option key={plate} value={plate}>{plate}</option>
                ))}
              </select>
            </div>
            <svg className="filter-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </label>

          <label className={`filter-pill${customerFilter ? ' has-value' : ''}`}>
            <div className="filter-lbl-wrap">
              <span className="filter-lbl-cap">Khách hàng</span>
              <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                <option value="">Tất cả khách hàng</option>
                {customerOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
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
                  const rightCols = new Set(['km']);
                  const centerCols = new Set(['status']);
                  let cls = '';
                  if (header.column.id === 'actions') cls = 'col-act right';
                  else if (header.column.id === 'route') cls = 'col-route';
                  else if (header.column.id === 'containerNumbers') cls = 'col-numbers';
                  else if (header.column.id === 'road') cls = 'col-road right';
                  else if (rightCols.has(header.column.id)) cls = 'right';
                  else if (centerCols.has(header.column.id)) cls = 'center';
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
          ) : filteredTrips.length === 0 ? (
            <div className="table-empty">Không tìm thấy chuyến đi nào.</div>
          ) : (
            tableInstance.getRowModel().rows.map(row => (
              <div
                key={row.id}
                className="table-row"
                onClick={() => navigate(`/trips/${row.original.id}`)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/trips/${row.original.id}`); } }}
              >
                {row.getVisibleCells().map(cell => {
                  const rightCols = new Set(['km']);
                  const centerCols = new Set(['status']);
                  let cls = '';
                  if (cell.column.id === 'actions') cls = 'col-act right';
                  else if (cell.column.id === 'route') cls = 'col-route';
                  else if (cell.column.id === 'containerNumbers') cls = 'col-numbers';
                  else if (cell.column.id === 'road') cls = 'col-road right';
                  else if (rightCols.has(cell.column.id)) cls = 'right';
                  else if (centerCols.has(cell.column.id)) cls = 'center';
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
          ) : filteredTrips.length === 0 ? (
            <div className="table-empty">Không tìm thấy chuyến đi nào.</div>
          ) : (
            pageRange.map((trip) => {
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
