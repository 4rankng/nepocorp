import { useState, useRef, useEffect } from 'react';
import { Truck, Calendar, ArrowRight, Loader2, Package } from 'lucide-react';
import { formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, type TripStatus } from '@tingting/shared';
import { PageHeader, Panel } from '../components/UI';
import { ClickableCard } from '../components/shared/ClickableCard';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useForwarderTrips } from '../hooks/useQueries';
import { usePageAnimations, useListAnimations, useCounterAnimation } from '../hooks/animations';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import './ForwarderTripsPage.css';
import '../components/shared/HeroKpiRow.css';

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
}

type StatusFilter = '' | TripStatus;

export default function ForwarderTripsPage() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('');
  const { data, isLoading: loading, error: queryError } = useForwarderTrips(activeFilter || undefined);
  const trips = (data?.items ?? []) as TripSummary[];
  const counts = data?.counts ?? {};
  const error = queryError ? 'Không thể tải danh sách chuyến đi' : null;

  const totalTrips = Object.values(counts).reduce((sum: number, c) => sum + c, 0);
  const totalContainers = trips.reduce((sum, t) => sum + (t.containerCount ?? 0), 0);

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
        { el: heroContainersRef.current, value: totalContainers, suffix: ' cont' },
      ],
    );
  }, [loading, totalTrips, totalContainers, animateCounters, prefersReduced]);

  if (loading) return (
    <Panel>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách chuyến đi…</p>
      </div>
    </Panel>
  );

  if (error) return (
    <Panel><div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div></Panel>
  );

  if (totalTrips === 0) return (
    <div>
      <PageHeader title="Chuyến đi" description="Danh sách chuyến đi vận chuyển" />
      <div className="empty-state">
        <img src="/assets/illustrations/empty-trips.svg" alt="No trips" />
        <h3 className="empty-state-title">Chưa có chuyến đi nào</h3>
        <p className="empty-state-desc">
          Hiện chưa có chuyến đi nào trong hệ thống. Khi có chuyến đi mới, thông tin sẽ xuất hiện tại đây.
        </p>
      </div>
    </div>
  );

  return (
    <div ref={rootRef}>
      <PageHeader title="Chuyến đi" description="Danh sách chuyến đi vận chuyển" />

      {/* ── Hero KPI Row ── */}
      <div className="hero-kpi-row">
        <div className="hero-kpi-card">
          <span className="hero-kpi-card__eyebrow">Tổng chuyến đi</span>
          <span className="hero-kpi-card__amount" ref={heroTotalRef}>0 chuyến</span>
          <span className="hero-kpi-card__subtitle">Danh sách chuyến đi vận chuyển</span>
          <Truck size={72} className="hero-kpi-card__watermark" aria-hidden="true" />
        </div>
        <div className="hero-kpi-stack">
          <div className="hero-kpi-mini hero-kpi-mini--accent">
            <div className="hero-kpi-mini__icon">
              <Package size={16} />
            </div>
            <div className="hero-kpi-mini__body">
              <span className="hero-kpi-mini__value" ref={heroContainersRef}>0</span>
              <span className="hero-kpi-mini__label">container</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Clickable status filter pills ── */}
      <div className="fwd-filter-pills">
        <button
          className={`fwd-filter-pill ${activeFilter === '' ? 'fwd-filter-pill--active' : ''}`}
          onClick={() => setActiveFilter('')}
        >
          Tất cả
          <span className="fwd-filter-pill__count">{totalTrips}</span>
        </button>
        {(Object.entries(TRIP_STATUS_LABELS) as [TripStatus, string][]).map(([status, label]) => {
          const count = counts[status] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={status}
              className={`fwd-filter-pill ${activeFilter === status ? 'fwd-filter-pill--active' : ''}`}
              data-status={status}
              onClick={() => setActiveFilter(prev => prev === status ? '' : status)}
            >
              <span className="fwd-filter-pill__dot" style={{ background: TRIP_STATUS_COLORS[status] }} />
              {label}
              <span className="fwd-filter-pill__count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Trip card list ── */}
      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map((trip, idx) => (
          <ClickableCard
            key={trip.id}
            to={`/my-forwarder-trips/${trip.id}`}
            className="ftrip-card fade-up"
            style={{
              position: 'relative',
              overflow: 'hidden',
              animationDelay: `${idx * 40}ms`,
            }}
          >
            <StatusStrip color={TRIP_STATUS_COLORS[trip.status]} />
            <div className="driver-trip-card__body">
              <div className="ftrip-card__icon"><Truck size={16} /></div>
              <div className="driver-trip-card__main">
                <div className="driver-trip-card__head">
                  <span className="driver-trip-card__route">
                    {trip.routeName || 'Tuyến không xác định'}
                  </span>
                </div>
                <div className="driver-trip-card__meta">
                  <span className="driver-trip-card__plate-badge">
                    <Truck size={12} />
                    {trip.truckPlate || '—'}
                  </span>
                  {trip.containerNumbers && (
                    <span className="driver-trip-card__plate-badge">
                      <Package size={12} />
                      {trip.containerNumbers}
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
