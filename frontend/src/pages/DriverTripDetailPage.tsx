import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Calendar, MapPin, Fuel, DollarSign, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, type TripStatus } from '@nepocorp/shared';
import { StatusPill } from '../components/UI';

interface TripLeg {
  id: number;
  sequence: number;
  origin: string;
  destination: string;
  km: number;
  loadingType: string;
}

interface DriverTripDetail {
  id: number;
  status: TripStatus;
  departureDate: string;
  routeName: string | null;
  truckPlate: string | null;
  trailerPlate: string | null;
  trailerType: string | null;
  customerName: string | null;
  cargoTypeName: string | null;
  fuelLiters: string | null;
  fuelMode: string | null;
  totalRoadAllowance: string | null;
  driverSalary: string | null;
  hasReturnCargo: boolean | null;
  legs: TripLeg[];
  notes: string | null;
  customerReference: string | null;
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

function loadingTypeLabel(t: string) {
  if (t === 'HANG') return 'Có hàng';
  if (t === 'VO') return 'Vỏ rỗng';
  return t;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border-1)' }}>
      <div style={{ color: 'var(--brand)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function DriverTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<DriverTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<DriverTripDetail>(`/driver/me/trips/${id}`)
      .then(setTrip)
      .catch(() => setError('Không thể tải thông tin lệnh vận chuyển'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
      <Loader2 size={24} className="spin" style={{ display: 'inline-block' }} />
      <p style={{ marginTop: 12 }}>Đang tải...</p>
    </div>
  );

  if (error || !trip) return (
    <div style={{ padding: 24 }}>
      <button className="btn btn--ghost" onClick={() => navigate('/my-trips')} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ArrowLeft size={16} /> Quay lại
      </button>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>
        <AlertCircle size={32} style={{ marginBottom: 12 }} />
        <p>{error || 'Không tìm thấy lệnh vận chuyển'}</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      {/* Back button + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 8px' }}>
        <button
          className="btn btn--ghost btn--icon"
          onClick={() => navigate('/my-trips')}
          aria-label="Quay lại"
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              {trip.routeName || 'Lệnh vận chuyển'}
            </h1>
            <StatusPill variant={tripStatusVariant(trip.status)}>
              {TRIP_STATUS_LABELS[trip.status] || trip.status}
            </StatusPill>
          </div>
          {trip.customerName && (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>{trip.customerName}</p>
          )}
        </div>
      </div>

      {/* Trip Info Card */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ padding: '4px 20px 4px', borderBottom: '1px solid var(--border-1)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Thông tin chuyến
          </span>
        </div>
        <div style={{ padding: '0 20px' }}>
          <InfoRow icon={<Truck size={16} />} label="Xe đầu kéo" value={trip.truckPlate} />
          <InfoRow icon={<Truck size={16} />} label="Rơ moóc" value={
            trip.trailerPlate ? `${trip.trailerPlate}${trip.trailerType ? ` (${trip.trailerType})` : ''}` : null
          } />
          <InfoRow icon={<Calendar size={16} />} label="Ngày khởi hành" value={formatDate(trip.departureDate)} />
          {trip.cargoTypeName && (
            <InfoRow icon={<Navigation size={16} />} label="Loại hàng" value={trip.cargoTypeName} />
          )}
          {trip.customerReference && (
            <InfoRow icon={<Navigation size={16} />} label="Mã tham chiếu" value={trip.customerReference} />
          )}
        </div>
      </div>

      {/* Fuel Allocation Card — prominent for drivers */}
      <div className="panel" style={{ marginBottom: 16, border: '2px solid var(--brand-soft)' }}>
        <div style={{
          padding: '12px 20px',
          background: 'var(--brand-soft)',
          display: 'flex', alignItems: 'center', gap: 12,
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        }}>
          <Fuel size={20} style={{ color: 'var(--brand)' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Số dầu được cấp
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {trip.fuelLiters ? `${parseFloat(trip.fuelLiters).toFixed(0)} lít` : '— lít'}
            </div>
          </div>
        </div>
        {trip.fuelMode && (
          <div style={{ padding: '10px 20px', fontSize: 12, color: 'var(--fg-3)' }}>
            Chế độ: <strong>{trip.fuelMode === 'AUTO' ? 'Tự động (định mức × km)' : trip.fuelMode === 'FLAT_RATE' ? 'Khoán' : trip.fuelMode}</strong>
          </div>
        )}
      </div>

      {/* Earnings Card */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ padding: '4px 20px 4px', borderBottom: '1px solid var(--border-1)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Thu nhập & chi phí
          </span>
        </div>
        <div style={{ padding: '0 20px' }}>
          <InfoRow
            icon={<DollarSign size={16} />}
            label="Lương sản lượng"
            value={
              <span style={{ color: 'var(--brand)', fontSize: 17 }}>
                {trip.driverSalary ? formatCurrency(trip.driverSalary) : '—'}
              </span>
            }
          />
          <InfoRow
            icon={<MapPin size={16} />}
            label="Tiền đi đường"
            value={trip.totalRoadAllowance ? formatCurrency(trip.totalRoadAllowance) : '—'}
          />
          {trip.hasReturnCargo && (
            <div style={{ padding: '8px 0', fontSize: 13, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> Chuyến về có hàng (+300.000 đ)
            </div>
          )}
        </div>
      </div>

      {/* Route Legs */}
      {trip.legs && trip.legs.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Hành trình ({trip.legs.length} chặng)
            </span>
          </div>
          <div style={{ padding: '8px 20px' }}>
            {trip.legs.map((leg, idx) => (
              <div key={leg.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0',
                borderBottom: idx < trip.legs.length - 1 ? '1px solid var(--border-1)' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--brand-soft)', color: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                }}>
                  {leg.sequence}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>
                    {leg.origin} → {leg.destination}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 3, display: 'flex', gap: 12 }}>
                    <span>{leg.km} km</span>
                    <span style={{
                      padding: '1px 8px', borderRadius: 20,
                      background: leg.loadingType === 'HANG' ? 'var(--brand-soft)' : 'var(--bg-2)',
                      color: leg.loadingType === 'HANG' ? 'var(--brand)' : 'var(--fg-3)',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {loadingTypeLabel(leg.loadingType)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {trip.notes && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Ghi chú
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: 0, lineHeight: 1.6 }}>{trip.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
