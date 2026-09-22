import { ListFilterBar } from '../components/shared/ListFilterBar';
import { useState, useRef, useEffect } from 'react';
import { Truck, Calendar, ArrowRight, Loader2, Package, Search } from 'lucide-react';
import { formatDate } from '../lib/format';
import { TripStatus, TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '@tingting/shared';
import { PageHeader } from '../components/UI';
import { ClickableCard } from '../components/shared/ClickableCard';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useForwarderTrips } from '../hooks/useQueries';
import { usePageAnimations, useListAnimations, useCounterAnimation } from '../hooks/animations';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useMonth } from '../hooks/useMonth';
import { useDebouncedValue } from '../design-system';
import { getCalendarMonthRange } from '../lib/calendar-month';
import './ForwarderTripsPage.css';
import '../components/shared/HeroKpiRow.css';
import { resolveEmptyIllustration } from '../lib/emptyIllustrations';

interface TripSummary {
  id: number;
  tripCode: string | null;
  departureDate: string;
  status: TripStatus;
  routeName: string | null;
  truckPlate: string | null;
  customerName: string | null;
  containerCount: number | null;
  containerNumbers: string | null;
  /** N4: derived payment/approval state for row coloring. */
  statusColor: 'paid' | 'pending' | 'none';
}

type StatusFilter = '' | TripStatus;

const FORWARDER_STATUS_COLORS: Record<TripStatus, string> = {
  ...TRIP_STATUS_COLORS,
  [TripStatus.CREATED]: '#0284C7',
  [TripStatus.LOCKED]: '#7C3AED',
};

/** Build the className suffix for a row from its derived statusColor. */
function rowColorClass(statusColor: TripSummary['statusColor']): string {
  if (statusColor === 'paid') return 'fwd-row--paid';
  if (statusColor === 'pending') return 'fwd-row--pending';
  return '';
}

export default function ForwarderTripsPage() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('');
  const { month, year } = useMonth();
  const monthRange = getCalendarMonthRange(year, month);
  const monthKey = `${year}-${month}`;
  // N4: search + date-range filters. Passed into the trips query so the
  // backend filters (ilike on container/customer + departure_date range).
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(() => ({
    monthKey,
    dateFrom: monthRange.start,
    dateTo: monthRange.end,
  }));
  const dateFrom = dateRange.monthKey === monthKey ? dateRange.dateFrom : monthRange.start;
  const dateTo = dateRange.monthKey === monthKey ? dateRange.dateTo : monthRange.end;

  // Debounce the free-text search so we don't fire a backend query per keystroke
  // (matches the TripListPage pattern). Date pickers are discrete — no debounce.
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading: loading, error: queryError, refetch } = useForwarderTrips(
    activeFilter || undefined,
    {
      search: debouncedSearch || undefined,
      dateFrom,
      dateTo,
    },
  );
  const trips = (data?.items ?? []) as TripSummary[];
  const counts = data?.counts ?? {};
  const error = queryError ? 'Không thể tải danh sách chuyến đi' : null;
  const hasFilters = Boolean(search || activeFilter || dateFrom !== monthRange.start || dateTo !== monthRange.end);
  function clearFilters() {
    setSearch('');
    setActiveFilter('');
    setDateRange({ monthKey, dateFrom: monthRange.start, dateTo: monthRange.end });
  }

  const totalTrips = Object.values(counts).reduce((sum: number, c) => sum + c, 0);
  const totalContainers = trips.reduce((sum, t) => sum + (t.containerCount ?? 0), 0);
  const hasPaymentHighlights = trips.some((trip) => trip.statusColor === 'paid' || trip.statusColor === 'pending');

  /* ── Page entrance animation ── */
  const { rootRef } = usePageAnimations({
    ready: !loading,
    selectors: ['.page-header', '.hero-kpi-row', '.fwd-filter-pills', '.ftrip-card'],
  });

  /* ── List stagger animation ── */
  const { rootRef: listRef } = useListAnimations({
    itemSelector: '.ftrip-card',
    mode: 'cards',
    deps: [trips],
  });

  /* ── Counter animation ── */
  const prefersReduced = usePrefersReducedMotion();
  const { animateCounters } = useCounterAnimation({ duration: 1200, delay: 400 });
  const heroTotalRef = useRef<HTMLSpanElement>(null);
  const heroContainersRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (loading || totalTrips === 0 || prefersReduced) return;
    animateCounters(
      [
        { el: heroTotalRef.current, value: totalTrips, suffix: ' chuyến' },
        { el: heroContainersRef.current, value: totalContainers },
      ],
    );
  }, [loading, totalTrips, totalContainers, animateCounters, prefersReduced]);

  return (
    <div ref={rootRef}>
      <PageHeader title="Chuyến đi" description="Danh sách chuyến đi vận chuyển" />

      {/* ── Hero KPI Row ── */}
      {!loading && !error && <div className="hero-kpi-row">
        <div className="hero-kpi-card">
          <span className="hero-kpi-card__eyebrow">Tổng chuyến đi</span>
          <span className="hero-kpi-card__amount" ref={heroTotalRef}>{totalTrips} chuyến</span>
          <span className="hero-kpi-card__subtitle">Danh sách chuyến đi vận chuyển</span>
          <Truck size={72} className="hero-kpi-card__watermark" aria-hidden="true" />
        </div>
        <div className="hero-kpi-stack">
          <div className="hero-kpi-mini hero-kpi-mini--accent">
            <div className="hero-kpi-mini__body">
              <span className="hero-kpi-mini__value" ref={heroContainersRef}>{totalContainers}</span>
              <span className="hero-kpi-mini__label">container</span>
            </div>
            <Package size={40} className="hero-kpi-mini__watermark" aria-hidden="true" />
          </div>
        </div>
      </div>}

      {/* ── Search + date-range filter (N4) ── */}
      <div className="fwd-trip-filters">
        <div className="fwd-trip-filters__search">
          <Search size={14} />
          <input
            type="text"
            aria-label="Tìm chuyến đi theo container hoặc khách hàng"
            placeholder="Tìm theo container, khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="fwd-trip-filters__dates">
          <label className="fwd-trip-filters__date">
            <span>Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              min={monthRange.start}
              max={monthRange.end}
              onChange={e => setDateRange({ monthKey, dateFrom: e.target.value, dateTo })}
            />
          </label>
          <label className="fwd-trip-filters__date">
            <span>Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              min={monthRange.start}
              max={monthRange.end}
              onChange={e => setDateRange({ monthKey, dateFrom, dateTo: e.target.value })}
            />
          </label>
        </div>
      </div>

      <ListFilterBar<TripStatus | ''>
        label="Lọc trạng thái chuyến đi"
        value={activeFilter}
        onChange={status => setActiveFilter(prev => prev === status ? '' : status)}
        options={[
          { value: '', label: 'Tất cả', count: loading ? undefined : totalTrips },
          ...(Object.entries(TRIP_STATUS_LABELS) as [TripStatus, string][])
            .filter(([status]) => (counts[status] ?? 0) > 0 || activeFilter === status)
            .map(([value, label]) => ({ value, label, count: counts[value] ?? 0 })),
        ]}
      />

      {loading ? (
        <div className="empty-state" role="status">
          <Loader2 size={20} className="spin" />
          <p>Đang tải danh sách chuyến đi…</p>
        </div>
      ) : error ? (
        <div className="empty-state" role="alert">
          <h3 className="empty-state-title">{error}</h3>
          <button type="button" className="btn btn--secondary" onClick={() => void refetch()}>Thử lại</button>
        </div>
      ) : trips.length === 0 ? (
        <div className="empty-state" role="status">
          <img src={resolveEmptyIllustration('empty-forwarder')} alt="" />
          <h3 className="empty-state-title">{hasFilters ? 'Không tìm thấy chuyến đi' : 'Chưa có chuyến đi trong tháng này'}</h3>
          <p className="empty-state-desc">{hasFilters ? 'Thử thay đổi tìm kiếm, ngày hoặc trạng thái để xem các chuyến đi khác.' : 'Chọn tháng khác để xem lịch sử chuyến đi.'}</p>
          {hasFilters && <button type="button" className="btn btn--secondary" onClick={clearFilters}>Xóa bộ lọc</button>}
        </div>
      ) : null}

      {hasPaymentHighlights && (
        <div className="fwd-row-legend" aria-label="Giải thích màu thẻ chuyến đi">
          <span className="fwd-row-legend__label">Màu thẻ</span>
          <span className="fwd-row-legend__item">
            <span className="fwd-row-legend__swatch fwd-row-legend__swatch--pending" />
            Chờ duyệt chi phí / phiếu thanh toán
          </span>
          <span className="fwd-row-legend__item">
            <span className="fwd-row-legend__swatch fwd-row-legend__swatch--paid" />
            Đã duyệt thanh toán
          </span>
        </div>
      )}

      {/* ── Trip card list ── */}
      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map((trip, idx) => (
          <ClickableCard
            key={trip.id}
            to={`/my-forwarder-trips/${trip.id}`}
            className={`ftrip-card fade-up ${rowColorClass(trip.statusColor)}`}
            style={{
              position: 'relative',
              overflow: 'hidden',
              animationDelay: `${idx * 40}ms`,
            }}
          >
            <StatusStrip color={FORWARDER_STATUS_COLORS[trip.status]} />
            <div className="driver-trip-card__body">
              <div className="ftrip-card__icon"><Truck size={16} /></div>
              <div className="driver-trip-card__main">
                <div className="driver-trip-card__head">
                  <span className="driver-trip-card__route">
                    {trip.routeName || 'Tuyến không xác định'}
                  </span>
                </div>
                <div className="driver-trip-card__meta">
                  <span className="driver-trip-card__meta-item">{TRIP_STATUS_LABELS[trip.status]}</span>
                  <span className="driver-trip-card__plate-badge">
                    <Truck size={12} />
                    <span className="driver-trip-card__badge-text">{trip.truckPlate || '—'}</span>
                  </span>
                  {trip.containerNumbers && (
                    <span className="driver-trip-card__plate-badge">
                      <Package size={12} />
                      <span className="driver-trip-card__badge-text">{trip.containerNumbers}</span>
                    </span>
                  )}
                  <span className="driver-trip-card__meta-item">
                    <Calendar size={12} />
                    {formatDate(trip.departureDate)}
                  </span>
                  {trip.customerName && (
                    <span className="driver-trip-card__meta-item">
                      {trip.customerName}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight size={16} className="driver-trip-card__arrow" />
            </div>
          </ClickableCard>
        ))}
      </div>
    </div>
  );
}
