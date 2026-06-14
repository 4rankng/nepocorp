import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Calendar, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, type TripStatus } from '@tingting/shared';
import { PageHeader, Panel } from '../components/UI';
import { useDriverTrips } from '../hooks/useQueries';
import { usePageAnimations, useListAnimations } from '../hooks/animations';
import './DriverTripsPage.css';

interface TripSummary {
  id: number;
  departureDate: string;
  status: TripStatus;
  driverSalary: string | null;
  routeName: string | null;
  truckPlate: string | null;
}

export default function DriverTripsPage() {
  const { data, isLoading: loading, error: queryError } = useDriverTrips();
  const trips = useMemo(() => (data?.items ?? []) as TripSummary[], [data?.items]);
  const error = queryError ? 'Không thể tải danh sách lệnh' : null;
  const { rootRef } = usePageAnimations({ ready: !loading });

  const [activeFilter, setActiveFilter] = useState<TripStatus | ''>('');
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<TripStatus, number>> = {};
    trips.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [trips]);
  const filteredTrips = activeFilter ? trips.filter(t => t.status === activeFilter) : trips;

  const { rootRef: listRef } = useListAnimations({ itemSelector: '.driver-trip-card', mode: 'cards', deps: [filteredTrips] });

  if (loading) return (
    <Panel>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách lệnh…</p>
      </div>
    </Panel>
  );

  if (error) return (
    <div>
      <PageHeader title="Hành trình" description="Danh sách lệnh vận chuyển đã nhận" />
      <div className="empty-state">
        <AlertTriangle size={36} style={{ color: 'var(--danger)', opacity: 0.7 }} />
        <h3 className="empty-state-title">{error}</h3>
        <p className="empty-state-desc">
          Hệ thống tạm thời không phản hồi. Vui lòng kéo xuống để làm mới, hoặc thử lại sau ít phút.
        </p>
      </div>
    </div>
  );

  if (trips.length === 0) return (
    <div>
      <PageHeader title="Hành trình" description="Danh sách lệnh vận chuyển đã nhận" />
      <div className="empty-state">
        <img src="/assets/illustrations/empty-trips.svg" alt="No trips" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <h3 className="empty-state-title">Chưa có lệnh vận chuyển nào</h3>
        <p className="empty-state-desc">
          Bạn chưa được phân công lệnh vận chuyển nào. Khi có chuyến đi mới, thông tin chi tiết sẽ xuất hiện tại đây.
        </p>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="driver-trips-page">
      <PageHeader title="Hành trình" description={`Danh sách lệnh vận chuyển đã nhận (${trips.length} lệnh)`} />

      <div className="driver-trips-filter-bar">
        <div className="fwd-filter-pills fade-up">
          <button
            className={`fwd-filter-pill ${activeFilter === '' ? 'fwd-filter-pill--active' : ''}`}
            onClick={() => setActiveFilter('')}
          >
            Tất cả
            <span className="fwd-filter-pill__count">{trips.length}</span>
          </button>
          {(Object.entries(TRIP_STATUS_LABELS) as [TripStatus, string][]).map(([status, label]) => {
            const count = statusCounts[status] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={status}
                className={`fwd-filter-pill ${activeFilter === status ? 'fwd-filter-pill--active' : ''}`}
                onClick={() => setActiveFilter(prev => prev === status ? '' : status)}
              >
                <span className="fwd-filter-pill__dot" style={{ background: TRIP_STATUS_COLORS[status] }} />
                {label}
                <span className="fwd-filter-pill__count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={listRef} className="driver-trips-list">
        {filteredTrips.map((trip, idx) => (
          <Link
            key={trip.id}
            to={`/my-trips/${trip.id}`}
            className="panel fade-up driver-trip-card"
            style={{ '--strip': TRIP_STATUS_COLORS[trip.status], animationDelay: `${idx * 40}ms` } as React.CSSProperties}
          >
            <div className="dt-card">
              <span className="dt-card__route">
                {trip.routeName || 'Tuyến không xác định'}
              </span>
              <div className="dt-card__salary">
                {trip.driverSalary ? formatCurrency(trip.driverSalary) : '—'}
              </div>
              <div className="dt-card__meta">
                <span className="dt-card__meta-item">
                  <Truck size={12} />
                  {trip.truckPlate || '—'}
                </span>
                <span className="dt-card__meta-item">
                  <Calendar size={12} />
                  {formatDate(trip.departureDate)}
                </span>
              </div>
              <div className="dt-card__arrow">
                <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
