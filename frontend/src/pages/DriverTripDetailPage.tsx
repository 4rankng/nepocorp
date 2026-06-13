import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Calendar, MapPin, Fuel, DollarSign, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { TRIP_STATUS_LABELS, type TripStatus } from '@tingting/shared';
import { StatusPill } from '../components/UI';
import TripLegsPanel from '../components/trip/TripLegsPanel';
import { usePageAnimations } from '../hooks/animations';

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
  fuelSupplierName: string | null;
  totalRoadAllowance: string | null;
  driverSalary: string | null;
  hasReturnCargo: boolean | null;
  legs: TripLeg[];
  notes: string | null;
  customerReference: string | null;
}

function tripStatusVariant(status: TripStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'IN_TRANSIT': return 'info';      // blue
    case 'COMPLETED': return 'success';    // green
    case 'LOCKED': return 'neutral';       // slate gray
    case 'CANCELED': return 'danger';      // red
    default: return 'neutral';             // CREATED — slate gray
  }
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="info-row">
      <span className="info-row__icon">{icon}</span>
      <div className="info-row__body">
        <div className="info-row__label">{label}</div>
        <div className="info-row__value">{value || '—'}</div>
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
  const { rootRef } = usePageAnimations({ ready: !loading });

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
      <p style={{ marginTop: 12 }}>Đang tải…</p>
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
    <div ref={rootRef} style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
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
            <span style={{ flexShrink: 0 }}><StatusPill variant={tripStatusVariant(trip.status)}>
              {TRIP_STATUS_LABELS[trip.status] || trip.status}
            </StatusPill></span>
          </div>
          {trip.customerName && (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>{trip.customerName}</p>
          )}
        </div>
      </div>

      {/* Trip Info Card */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel__head">
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Thông tin chuyến
          </span>
        </div>
        <div className="panel__body">
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
      <div className="panel fuel-alloc-card" style={{ marginBottom: 16 }}>
        <div className="fuel-alloc-card__header">
          <Fuel size={20} className="fuel-alloc-card__icon" />
          <div className="fuel-alloc-card__title-wrap">
            <div className="fuel-alloc-card__label">
              Số dầu được cấp
            </div>
            <div className="fuel-alloc-card__value">
              {trip.fuelLiters ? `${parseFloat(trip.fuelLiters).toFixed(0)} lít` : '— lít'}
            </div>
          </div>
        </div>
        <div className="fuel-alloc-card__body">
          {trip.fuelMode && (
            <div>
              Chế độ: <strong>{trip.fuelMode === 'AUTO' ? 'Tự động (định mức × km)' : trip.fuelMode === 'FLAT_RATE' ? 'Khoán' : trip.fuelMode}</strong>
            </div>
          )}
          {trip.fuelSupplierName && (
            <div>
              Nhà cung cấp: <strong style={{ color: 'var(--brand)' }}>{trip.fuelSupplierName}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Earnings Card */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel__head">
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Thu nhập & chi phí
          </span>
        </div>
        <div className="panel__body">
          <InfoRow
            icon={<DollarSign size={16} />}
            label="Tiền kết hợp"
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
            <div style={{ padding: '8px 0 0', fontSize: 13, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> Chuyến về có hàng (+300.000 đ)
            </div>
          )}
        </div>
      </div>

      <TripLegsPanel legs={trip.legs || []} />

      {/* Notes */}
      {trip.notes && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel__body">
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
