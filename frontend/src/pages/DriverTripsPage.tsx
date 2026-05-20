import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Calendar, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, type TripStatus } from '@nepocorp/shared';
import { PageHeader, Panel, StatusPill } from '../components/UI';

interface TripSummary {
  id: number;
  departureDate: string;
  status: TripStatus;
  revenue: string | null;
  driverSalary: string | null;
  routeName: string | null;
  truckPlate: string | null;
}

function tripStatusVariant(status: TripStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'IN_TRANSIT': return 'info';
    case 'COMPLETED': return 'warn';
    case 'LOCKED': return 'success';
    case 'CANCELED': return 'danger';
    default: return 'neutral';
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
    <Panel>
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: 8 }}>Đang tải danh sách lệnh...</p>
      </div>
    </Panel>
  );

  if (error) return (
    <Panel><div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>{error}</div></Panel>
  );

  if (trips.length === 0) return (
    <div>
      <PageHeader title="Lệnh của tôi" description="Danh sách lệnh vận chuyển đã nhận" />
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
      <PageHeader title="Lệnh của tôi" description={`Danh sách lệnh vận chuyển đã nhận (${trips.length} lệnh)`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map((trip, idx) => (
          <div
            key={trip.id}
            className="panel fade-up"
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
                  <StatusPill variant={tripStatusVariant(trip.status)}>
                    {TRIP_STATUS_LABELS[trip.status] || trip.status}
                  </StatusPill>
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
