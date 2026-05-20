import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Truck, Calendar, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, type TripStatus } from '@nepocorp/shared';

interface TripSummary {
  id: number;
  departureDate: string;
  status: TripStatus;
  revenue: string | null;
  driverSalary: string | null;
  routeName: string | null;
  truckPlate: string | null;
}

function statusBadgeClass(status: TripStatus): string {
  switch (status) {
    case 'CREATED': return 'badge-info';
    case 'IN_TRANSIT': return 'badge-brand';
    case 'COMPLETED': return 'badge-success';
    case 'LOCKED': return 'badge-neutral';
    case 'CANCELED': return 'badge-danger';
    default: return 'badge-neutral';
  }
}

export default function DriverTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<{ items: TripSummary[] }>('/driver/me/trips')
      .then(r => setTrips(r.items))
      .catch(() => setError('Không thể tải danh sách lệnh'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="card-shell" style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
      <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
      <p style={{ marginTop: 8 }}>Đang tải danh sách lệnh...</p>
    </div>
  );

  if (error) return (
    <div className="card-shell" style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
  );

  if (trips.length === 0) return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lệnh của tôi</h1>
          <p>Danh sách lệnh vận chuyển đã nhận</p>
        </div>
      </div>
      <div className="empty-state">
        <img src="/assets/illustrations/empty-trips.svg" alt="No trips" />
        <h3 className="empty-state-title">Chưa có lệnh vận chuyển nào</h3>
        <p className="empty-state-desc">
          Bạn chưa được phân công lệnh vận chuyển nào. Khi có chuyến đi mới, thông tin chi tiết sẽ xuất hiện tại đây.
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lệnh của tôi</h1>
          <p>Danh sách lệnh vận chuyển đã nhận ({trips.length} lệnh)</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map((trip, idx) => (
          <div
            key={trip.id}
            className="card-shell fade-up"
            style={{
              cursor: 'pointer',
              transition: 'box-shadow 180ms var(--ease), border-color 180ms var(--ease)',
              animationDelay: `${idx * 40}ms`,
            }}
            onClick={() => navigate(`/my-trips/${trip.id}`)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px -8px rgba(9,9,11,0.08)';
              (e.currentTarget as HTMLDivElement).style.borderColor = '#D4D4D8';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              (e.currentTarget as HTMLDivElement).style.borderColor = '';
            }}
          >
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Route icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 'var(--radius-md)',
                background: 'var(--brand-soft)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <MapPin size={20} style={{ color: 'var(--brand)' }} />
              </div>

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-1)' }}>
                    {trip.routeName || 'Tuyến không xác định'}
                  </span>
                  <span className={`badge ${statusBadgeClass(trip.status)}`}>
                    {TRIP_STATUS_LABELS[trip.status] || trip.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--fg-3)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Truck size={12} />
                    {trip.truckPlate || '—'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} />
                    {formatDate(trip.departureDate)}
                  </span>
                </div>
              </div>

              {/* Revenue */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {trip.driverSalary && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(trip.driverSalary)}
                  </div>
                )}
                {trip.revenue && (
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                    Doanh thu: {formatCurrency(trip.revenue)}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight size={16} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
