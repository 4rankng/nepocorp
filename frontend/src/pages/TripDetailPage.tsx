import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Play, Pencil, Lock, XCircle,
  Truck, User, MapPin, Calendar, FileText, Fuel, Banknote,
  Route as RouteIcon, Image as ImageIcon,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { TripDetail } from '@nepocorp/shared';
import {
  TripStatus, TRIP_STATUS_LABELS,
  FUEL_MODE_LABELS, LOADING_TYPE_LABELS,
} from '@nepocorp/shared';
import { Panel, StatusPill } from '../components/UI';

function infoRow(icon: React.ReactNode, label: string, value: React.ReactNode) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-2)' }}>
      <span style={{ color: 'var(--fg-3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTrip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<TripDetail>(`/trips/${id}`);
      setTrip(data);
    } catch {
      setError('Không thể tải thông tin lệnh vận chuyển.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  const handleAction = async (action: string, method: () => Promise<unknown>) => {
    setActionLoading(true);
    setError('');
    try {
      await method();
      await loadTrip();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
        <Loader2 size={20} className="spin" />
        <span style={{ fontSize: 14 }}>Đang tải dữ liệu...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="fade-up">
        <Panel>
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={loadTrip}>Thử lại</button>
        </Panel>
      </div>
    );
  }

  if (!trip) return null;

  const canEdit = trip.status === TripStatus.CREATED || trip.status === TripStatus.IN_TRANSIT || trip.status === TripStatus.COMPLETED;
  const canCancel = trip.status !== TripStatus.LOCKED && trip.status !== TripStatus.CANCELED;
  const canDispatch = trip.status === TripStatus.CREATED;
  const canLock = trip.status === TripStatus.COMPLETED;

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg-1)', margin: 0 }}>
            <button className="btn btn--ghost btn--icon btn--sm" onClick={() => navigate('/trips')} aria-label="Quay lại">
              <ArrowLeft size={16} />
            </button>
            Lệnh vận chuyển
            <StatusPill variant={
              trip.status === TripStatus.CANCELED ? 'danger' :
              trip.status === TripStatus.LOCKED ? 'success' :
              trip.status === TripStatus.COMPLETED ? 'warn' :
              trip.status === TripStatus.IN_TRANSIT ? 'info' : 'neutral'
            }>
              {TRIP_STATUS_LABELS[trip.status]}
            </StatusPill>
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-3)', marginLeft: 46 }}>
            {trip.customer?.name ?? '—'} &middot; {trip.route?.name ?? '—'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {canDispatch && (
            <button
              className="btn btn--primary btn--sm"
              disabled={actionLoading}
              onClick={() => handleAction('dispatch', () => api.post(`/trips/${trip.id}/dispatch`, {}))}
            >
              {actionLoading ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
              Xuất phát
            </button>
          )}
          {trip.status === TripStatus.IN_TRANSIT && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            >
              <Pencil size={14} />
              Nhập số liệu thực tế
            </button>
          )}
          {canLock && (
            <button
              className="btn btn--primary btn--sm"
              disabled={actionLoading}
              onClick={() => handleAction('lock', () => api.post(`/trips/${trip.id}/lock`, {}))}
            >
              {actionLoading ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
              Chốt chuyến
            </button>
          )}
          {canEdit && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            >
              <Pencil size={14} />
              Chỉnh sửa
            </button>
          )}
          {canCancel && (
            <button
              className="btn btn--danger btn--sm"
              disabled={actionLoading}
              onClick={() => {
                if (confirm('Bạn có chắc muốn hủy chuyến này?')) {
                  handleAction('cancel', () => api.post(`/trips/${trip.id}/cancel`, {}));
                }
              }}
            >
              <XCircle size={14} />
              Hủy chuyến
            </button>
          )}
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--danger-soft)',
          color: 'var(--danger-text)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          marginBottom: 16,
          border: '1px solid rgba(220,38,38,0.12)',
        }}>
          {error}
        </div>
      )}

      {/* Info grid */}
      <div className="row-2 section-gap">
        <Panel title="Thông tin cơ bản">
          {infoRow(<Truck size={16} />, 'Xe đầu', trip.truck?.license_plate)}
          {infoRow(<User size={16} />, 'Tài xế', trip.driver?.name)}
          {infoRow(<RouteIcon size={16} />, 'Rơ moóc', trip.trailer ? `${trip.trailer.license_plate} (${trip.trailer.type})` : null)}
          {infoRow(<Calendar size={16} />, 'Ngày khởi hành', formatDate(trip.departure_date))}
          {infoRow(<FileText size={16} />, 'Mã tham chiếu', trip.customer_reference)}
        </Panel>

        <Panel title="Tài chính">
          {infoRow(<Banknote size={16} />, 'Doanh thu', formatCurrency(trip.revenue))}
          {infoRow(<Banknote size={16} />, 'Tổng chi phí', formatCurrency(trip.total_cost))}
          {infoRow(
            <Banknote size={16} />,
            'Lợi nhuận gộp',
            <span style={{ color: trip.gross_profit && Number(trip.gross_profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {formatCurrency(trip.gross_profit)}
            </span>,
          )}
          {infoRow(<Fuel size={16} />, 'Chế độ nhiên liệu', FUEL_MODE_LABELS[trip.fuel_mode])}
          {infoRow(<Fuel size={16} />, 'Số lít nhiên liệu', trip.fuel_liters ? `${Number(trip.fuel_liters).toLocaleString('vi-VN')} lit` : '—')}
          {infoRow(<MapPin size={16} />, 'Tiền đường', formatCurrency(trip.total_road_allowance))}
          {infoRow(<User size={16} />, 'Lương tài xế', formatCurrency(trip.driver_salary))}
        </Panel>
      </div>

      {/* Trip legs */}
      {trip.legs && trip.legs.length > 0 && (
        <Panel
          title="Hành trình"
          subtitle={`${trip.legs.length} chặng đường`}
          style={{ marginTop: 20 }}
          flush
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Điểm đi</th>
                  <th>Điểm đến</th>
                  <th className="num">Km</th>
                  <th>Trạng thái</th>
                  <th className="num">Lít tính</th>
                </tr>
              </thead>
              <tbody>
                {trip.legs.map(leg => (
                  <tr key={leg.id}>
                    <td style={{ fontWeight: 600, color: 'var(--fg-1)', width: 40 }}>{leg.sequence}</td>
                    <td>{leg.origin}</td>
                    <td>{leg.destination}</td>
                    <td className="num">{leg.km.toLocaleString('vi-VN')}</td>
                    <td><span className="badge badge-outline" style={{ fontSize: 11 }}>{LOADING_TYPE_LABELS[leg.loading_type]}</span></td>
                    <td className="num">{leg.calculated_liters ? Number(leg.calculated_liters).toLocaleString('vi-VN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Notes */}
      {trip.notes && (
        <Panel title="Ghi chú" style={{ marginTop: 20 }}>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>{trip.notes}</p>
        </Panel>
      )}

      {/* Photos */}
      {trip.photo_urls && trip.photo_urls.length > 0 && (
        <div className="section-gap">
          <div style={{ marginBottom: 8 }}><span className="typo-eyebrow">Ảnh</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {trip.photo_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-1)',
                  aspectRatio: '4/3',
                  background: 'var(--bg-3)',
                }}
              >
                <img
                  src={url}
                  alt={`Ảnh ${i + 1}`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty photo placeholder when no content sections */}
      {!trip.notes && (!trip.photo_urls || trip.photo_urls.length === 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 12, marginTop: 4 }}>
          <ImageIcon size={14} />
          Chưa có ảnh hoặc ghi chú
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
