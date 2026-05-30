import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Play, Pencil, Lock, XCircle,
  Truck, User, MapPin, Calendar, FileText, Fuel, Banknote,
  Route as RouteIcon, Image as ImageIcon, Shuffle, FilePen, X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { TripDetail } from '@nepocorp/shared';
import {
  TripStatus, TRIP_STATUS_LABELS,
  FUEL_MODE_LABELS, LOADING_TYPE_LABELS,
} from '@nepocorp/shared';
import { Panel, StatusPill, useConfirm, Drawer } from '../components/UI';
import { useTripDetail, useTripAdjustments, useTrucksAndDrivers } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '../components/shared';

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
  const { confirm, dialog: confirmDialog } = useConfirm();
  const queryClient = useQueryClient();

  const { data: trip, isLoading: loading, error: queryError, refetch: refetchTrip } = useTripDetail(id);
  const error = queryError ? 'Không thể tải thông tin lệnh vận chuyển.' : '';
  const { data: adjustments = [] } = useTripAdjustments(trip?.id ?? 0);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Reassign modal state
  const [showReassign, setShowReassign] = useState(false);
  const { data: trucksDriversData } = useTrucksAndDrivers();
  const reassignTrucks = trucksDriversData?.trucks ?? [];
  const reassignDrivers = trucksDriversData?.drivers ?? [];
  const [reassignTruckId, setReassignTruckId] = useState('');
  const [reassignDriverId, setReassignDriverId] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState('');

  // Adjustment drawer state
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustRef, setAdjustRef] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const openReassign = () => {
    setReassignError('');
    setReassignTruckId(String(trip?.truck_id ?? ''));
    setReassignDriverId(String(trip?.driver_id ?? ''));
    setShowReassign(true);
  };

  const handleReassign = async () => {
    if (!id || !reassignTruckId || !reassignDriverId) return;
    setReassignLoading(true);
    setReassignError('');
    try {
      await api.patch(`/trips/${id}/reassign`, {
        truck_id: Number(reassignTruckId),
        driver_id: Number(reassignDriverId),
      });
      setShowReassign(false);
      await refetchTrip();
    } catch (e: any) {
      setReassignError(e.message || 'Lỗi khi phân xe lại');
    } finally {
      setReassignLoading(false);
    }
  };

  const openAdjust = () => {
    setAdjustAmount('');
    setAdjustNote('');
    setAdjustRef('');
    setAdjustError('');
    setShowAdjust(true);
  };

  const handleAdjustSubmit = async () => {
    if (!id || !adjustNote.trim() || !adjustRef.trim() || adjustAmount === '') return;
    setAdjustSubmitting(true);
    setAdjustError('');
    try {
      await api.post(`/trips/${id}/adjustment`, {
        amount: Number(adjustAmount),
        note: adjustNote.trim(),
        signed_agreement_ref: adjustRef.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['trip-adjustments'] });
      await refetchTrip();
      setAdjustAmount('');
      setAdjustNote('');
      setAdjustRef('');
    } catch (e: any) {
      setAdjustError(e.message || 'Lỗi khi tạo điều chỉnh');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleAction = async (action: string, method: () => Promise<unknown>) => {
    setActionLoading(true);
    setActionError('');
    try {
      await method();
      await refetchTrip();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockClick = async () => {
    if (!trip) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/trips/${trip.id}/lock`, {});
      await refetchTrip();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 422) {
        const isConfirmed = await confirm('Doanh thu chuyến đi này bằng 0 VNĐ. Bạn có chắc chắn muốn chốt doanh thu bằng 0?', {
          variant: 'warning',
          confirmLabel: 'Xác nhận chốt',
          cancelLabel: 'Hủy bỏ'
        });
        if (isConfirmed) {
          setActionLoading(true);
          try {
            await api.post(`/trips/${trip.id}/lock`, { confirmZeroRevenue: true });
            await refetchTrip();
          } catch (retryErr: any) {
            setActionError(retryErr.message || 'Lỗi khi chốt chuyến đi.');
          } finally {
            setActionLoading(false);
          }
        }
      } else if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError(err.message || 'Có lỗi xảy ra khi chốt chuyến đi.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
        <Spinner size={20} />
        <span style={{ fontSize: 14 }}>Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="fade-up">
        <Panel>
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={() => refetchTrip()}>Thử lại</button>
        </Panel>
      </div>
    );
  }

  if (!trip) return null;

  const displayError = actionError || error;
  const canEdit = trip.status === TripStatus.CREATED || trip.status === TripStatus.COMPLETED;
  const canCancel = trip.status !== TripStatus.LOCKED && trip.status !== TripStatus.CANCELED;
  const canDispatch = trip.status === TripStatus.CREATED;
  const canLock = trip.status === TripStatus.COMPLETED;
  const canReassign = trip.status === TripStatus.CREATED;
  const canAdjust = trip.status === TripStatus.LOCKED;
  const needsPhotos = !trip.photo_urls || trip.photo_urls.length === 0;

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
            <>
              <button
                className="btn btn--primary btn--sm"
                disabled={actionLoading || needsPhotos}
                title={needsPhotos ? 'Chưa có ảnh chuyến đi. Vui lòng tải lên ít nhất 1 ảnh trước khi chốt.' : undefined}
                onClick={handleLockClick}
              >
                {actionLoading ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
                Chốt chuyến
              </button>
              {needsPhotos && (
                <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Chưa có ảnh — cần ít nhất 1 ảnh để chốt
                </span>
              )}
            </>
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
          {canReassign && (
            <button className="btn btn--secondary btn--sm" onClick={openReassign}>
              <Shuffle size={14} />
              Phân xe lại
            </button>
          )}
          {canAdjust && (
            <button className="btn btn--secondary btn--sm" onClick={openAdjust}>
              <FilePen size={14} />
              Điều chỉnh
            </button>
          )}
          {canCancel && (
            <button
              className="btn btn--danger btn--sm"
              disabled={actionLoading}
              onClick={async () => {
                if (await confirm('Bạn có chắc muốn hủy chuyến này?', { variant: 'danger', confirmLabel: 'Hủy chuyến' })) {
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
      {displayError && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--danger-soft)',
          color: 'var(--danger-text)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          marginBottom: 16,
          border: '1px solid rgba(220,38,38,0.12)',
        }}>
          {displayError}
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
          {trip.revenue_original && trip.revenue && Number(trip.revenue) !== Number(trip.revenue_original) && (
            infoRow(
              <Banknote size={16} />,
              'Giá gốc (trước điều chỉnh)',
              <span style={{ textDecoration: 'line-through', color: 'var(--fg-3)' }}>
                {formatCurrency(trip.revenue_original)}
              </span>,
            )
          )}
          {infoRow(<Banknote size={16} />, 'Tổng chi phí', formatCurrency(trip.total_cost))}
          {infoRow(
            <Banknote size={16} />,
            'Lợi nhuận gộp',
            <span style={{ color: trip.gross_profit && Number(trip.gross_profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {formatCurrency(trip.gross_profit)}
            </span>,
          )}
          {infoRow(<Fuel size={16} />, 'Chế độ nhiên liệu', FUEL_MODE_LABELS[trip.fuel_mode])}
          {infoRow(<Fuel size={16} />, 'Số lít nhiên liệu', trip.fuel_liters ? `${Number(trip.fuel_liters).toLocaleString('vi-VN')} lít` : '—')}
          {(() => {
            const totalKm = trip.legs?.reduce((s, l) => s + Number(l.km), 0) ?? 0;
            const totalLiters = Number(trip.fuel_liters) || 0;
            if (totalKm > 0 && totalLiters > 0) {
              const ttbq = (totalLiters / totalKm) * 100;
              return infoRow(<Fuel size={16} />, 'TTBQ (L/100km)', `${ttbq.toFixed(1)} L/100km`);
            }
            return null;
          })()}
          {infoRow(<MapPin size={16} />, 'Tiền đường', formatCurrency(trip.total_road_allowance))}
          {(Number(trip.tolls_discount) > 0 || Number(trip.tolls_addition) > 0 || Number(trip.tolls_stations) > 0 || trip.has_return_cargo) && (
            <div style={{ padding: '6px 0 10px', borderBottom: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Chi tiết tiền đường
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 12 }}>
                {Number(trip.tolls_discount) > 0 && (
                  <span>Giảm vé QL5: <strong style={{ color: 'var(--danger)' }}>-{formatCurrency(trip.tolls_discount)}</strong></span>
                )}
                {Number(trip.tolls_addition) > 0 && (
                  <span>Tăng vé theo lệnh: <strong style={{ color: 'var(--success)' }}>+{formatCurrency(trip.tolls_addition)}</strong></span>
                )}
                {Number(trip.tolls_stations) > 0 && (
                  <span>Số trạm: <strong>{trip.tolls_stations} trạm × 55.000 = -{formatCurrency(Number(trip.tolls_stations) * 55000)}</strong></span>
                )}
                {trip.has_return_cargo && (
                  <span>Chuyến về có hàng: <strong style={{ color: 'var(--success)' }}>+300.000 ₫</strong></span>
                )}
              </div>
            </div>
          )}
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

      {!trip.notes && (!trip.photo_urls || trip.photo_urls.length === 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 12, marginTop: 4 }}>
          <ImageIcon size={14} />
          Chưa có ảnh hoặc ghi chú
        </div>
      )}

      {/* Adjustments history */}
      {canAdjust && adjustments.length > 0 && (
        <Panel title="Lịch sử điều chỉnh" style={{ marginTop: 20 }} flush>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th className="num">Số tiền</th>
                  <th>Lý do</th>
                  <th>Biên bản</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</td>
                    <td className="num" style={{ color: Number(a.amount) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {Number(a.amount) > 0 ? '+' : ''}{formatCurrency(a.amount)}
                    </td>
                    <td>{a.note}</td>
                    <td style={{ color: 'var(--fg-3)', fontSize: 12 }}>{a.signed_agreement_ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Reassign Modal */}
      {showReassign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,11,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal)' as any, padding: 24 }}
          onClick={() => setShowReassign(false)}>
          <div style={{ width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <Panel title="Phân xe lại" action={
              <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setShowReassign(false)}><X size={16} /></button>
            }>
              {reassignError && <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 13 }}>{reassignError}</div>}
              <div className="field">
                <label>Xe đầu kéo</label>
                <select className="input" value={reassignTruckId} onChange={e => setReassignTruckId(e.target.value)}>
                  <option value="">-- Chọn xe --</option>
                  {reassignTrucks.map(t => <option key={t.id} value={t.id}>{t.license_plate}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tài xế</label>
                <select className="input" value={reassignDriverId} onChange={e => setReassignDriverId(e.target.value)}>
                  <option value="">-- Chọn tài xế --</option>
                  {reassignDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button
                className="btn btn--primary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={reassignLoading || !reassignTruckId || !reassignDriverId}
                onClick={handleReassign}
              >
                {reassignLoading ? <Loader2 size={14} className="spin" /> : <Shuffle size={14} />}
                Xác nhận phân xe lại
              </button>
            </Panel>
          </div>
        </div>
      )}

      {/* Adjustment Drawer */}
      <Drawer isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="Hóa đơn điều chỉnh">
        <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 16, lineHeight: 1.5 }}>
          Số âm = Giảm doanh thu (Credit Note) · Số dương = Tăng doanh thu (Debit Note)
        </p>
        {adjustError && <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 13 }}>{adjustError}</div>}
        <div className="field">
          <label>Số tiền điều chỉnh (VNĐ) *</label>
          <input className="input" type="number" placeholder="VD: -500000 hoặc 300000" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Lý do điều chỉnh *</label>
          <textarea className="input" rows={3} placeholder="Mô tả lý do..." value={adjustNote} onChange={e => setAdjustNote(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
        <div className="field">
          <label>Mã biên bản thỏa thuận *</label>
          <input className="input" placeholder="VD: BB-2026-001" value={adjustRef} onChange={e => setAdjustRef(e.target.value)} />
        </div>
        <button
          className="btn btn--primary"
          style={{ width: '100%', marginTop: 4 }}
          disabled={adjustSubmitting || !adjustNote.trim() || !adjustRef.trim() || adjustAmount === ''}
          onClick={handleAdjustSubmit}
        >
          {adjustSubmitting ? <Loader2 size={14} className="spin" /> : <FilePen size={14} />}
          Xác nhận phát hành
        </button>
        {adjustments.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đã phát hành</div>
            {adjustments.map((a: any, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-2)', fontSize: 13 }}>
                <span style={{ color: 'var(--fg-2)' }}>{a.note}</span>
                <span style={{ fontWeight: 600, color: Number(a.amount) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {Number(a.amount) > 0 ? '+' : ''}{formatCurrency(a.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {confirmDialog}
    </div>
  );
}
