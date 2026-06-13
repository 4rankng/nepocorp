import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Calendar, ArrowRight, Loader2, Package } from 'lucide-react';
import { formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, type TripStatus } from '@tingting/shared';
import { PageHeader, Panel } from '../components/UI';
import { ClickableCard } from '../components/shared/ClickableCard';
import { useForwarderTrips } from '../hooks/useQueries';
import { usePageAnimations, useListAnimations } from '../hooks/animations';

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
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('');
  const { data, isLoading: loading, error: queryError } = useForwarderTrips(activeFilter || undefined);
  const trips = (data?.items ?? []) as TripSummary[];
  const counts = data?.counts ?? {};
  const error = queryError ? 'Không thể tải danh sách chuyến đi' : null;
  const { rootRef } = usePageAnimations({ ready: !loading });
  const { rootRef: listRef } = useListAnimations({ itemSelector: '.driver-trip-card', mode: 'cards', deps: [trips] });

  const totalTrips = Object.values(counts).reduce((sum: number, c) => sum + c, 0);
  const totalContainers = trips.reduce((sum, t) => sum + (t.containerCount ?? 0), 0);

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
      <PageHeader title="Chuyến đi" description={`Danh sách chuyến đi vận chuyển (${totalTrips} chuyến · ${totalContainers} cont)`} />

      {/* Clickable status filter pills */}
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

      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map((trip, idx) => (
          <ClickableCard
            key={trip.id}
            to={`/my-forwarder-trips/${trip.id}`}
            className="panel fade-up driver-trip-card"
            style={{
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 180ms var(--ease), border-color 180ms var(--ease)',
              animationDelay: `${idx * 40}ms`,
              '--strip-top': TRIP_STATUS_COLORS[trip.status],
              '--strip-bottom': TRIP_STATUS_COLORS[trip.status],
            } as React.CSSProperties}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px -8px rgba(9,9,11,0.08)';
              (e.currentTarget as HTMLDivElement).style.borderColor = '#D4D4D8';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              (e.currentTarget as HTMLDivElement).style.borderColor = '';
            }}
          >
            <div className="driver-trip-card__body">
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
