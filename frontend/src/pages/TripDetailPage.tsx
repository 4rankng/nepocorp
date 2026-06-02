import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Play, Pencil, Lock, XCircle,
  Truck, User, MapPin, Calendar, FileText, Fuel, Banknote,
  Route as RouteIcon, Image as ImageIcon, Shuffle, FilePen, X, Clock,
  Package, Receipt, TrendingUp, AlertTriangle, Check,
  Minus, Plus, Hash, AlertCircle,
} from 'lucide-react';
import { api, ApiError, getAuthenticatedPhotoUrl } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import type { TripDetail } from '@nepocorp/shared';
import {
  TripStatus, TRIP_STATUS_LABELS,
  FUEL_MODE_LABELS, LOADING_TYPE_LABELS,
  parseThreshold, Role,
} from '@nepocorp/shared';
import { useAuth } from '../hooks/useAuth';
import { Panel, useConfirm, Drawer, Modal } from '../components/UI';
import { useTripDetail, useTripAdjustments, useTrucksAndDrivers, useFuelConfig } from '../hooks/useQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '../components/shared/Spinner';
import { LeafletMap } from '../components/shared/LeafletMap';
import { AncillaryFeesCard } from '../components/trip/AncillaryFeesCard';
import { tripClient } from '../api/tripClient';
import { useCatalogs } from '../hooks/useCatalogs';

type Tone = 'accent' | 'info' | 'warn' | 'danger' | 'neutral';

function infoRow(icon: React.ReactNode, label: string, value: React.ReactNode, tone: Tone = 'neutral') {
  return (
    <div className="info-row info-row--feature">
      <span className={`info-row__icon info-row__icon--${tone}`}>{icon}</span>
      <div className="info-row__body">
        <div className="info-row__label">{label}</div>
        <div className="info-row__value">{value || '—'}</div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: trip, isLoading: loading, error: queryError, refetch: refetchTrip } = useTripDetail(id);
  const error = queryError ? 'Không thể tải thông tin lệnh vận chuyển.' : '';
  const { data: adjustments = [] } = useTripAdjustments(trip?.id ?? 0);
  const { data: fuelConfig } = useFuelConfig();
  const { data: catalogData } = useCatalogs();
  const externalCarrierName = trip?.externalCarrierId
    ? (catalogData?.customers.find(c => c.id === trip.externalCarrierId)?.name ?? `ID ${trip.externalCarrierId}`)
    : '—';
  const externalMargin = trip?.carrierType === 'EXTERNAL' && trip.revenue && trip.externalFreightCost
    ? Math.round(Number(trip.revenue) / (1 + Number(trip.vatRate ?? 0.08))) - Math.round(Number(trip.externalFreightCost) / (1 + Number(trip.vatRate ?? 0.08)))
    : null;

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Reassign modal state
  const [showReassign, setShowReassign] = useState(false);
  const { data: trucksDriversData } = useTrucksAndDrivers({
    enabled: showReassign || trip?.status === TripStatus.CREATED,
  });
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
    setReassignTruckId(String(trip?.truckId ?? ''));
    setReassignDriverId(String(trip?.driverId ?? ''));
    setShowReassign(true);
  };

  const handleReassign = async () => {
    if (!id || !reassignTruckId || !reassignDriverId) return;
    setReassignLoading(true);
    setReassignError('');
    try {
      await api.patch(`/trips/${id}/reassign`, {
        truckId: Number(reassignTruckId),
        driverId: Number(reassignDriverId),
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
        signedAgreementRef: adjustRef.trim(),
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
        const isConfirmed = await confirm('Doanh thu chuyến đi này bằng 0 đ. Bạn có chắc chắn muốn khóa chuyến với doanh thu bằng 0?', {
          variant: 'warning',
          confirmLabel: 'Xác nhận khóa',
          cancelLabel: 'Hủy bỏ'
        });
        if (isConfirmed) {
          setActionLoading(true);
          try {
            await api.post(`/trips/${trip.id}/lock`, { confirmZeroRevenue: true });
            await refetchTrip();
          } catch (retryErr: any) {
            setActionError(retryErr.message || 'Lỗi khi khóa chuyến đi.');
          } finally {
            setActionLoading(false);
          }
        }
      } else if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError(err.message || 'Có lỗi xảy ra khi khóa chuyến đi.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
        <Spinner size={20} />
        <span style={{ fontSize: 14 }}>Đang tải dữ liệu…</span>
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
  const isManagerOrAdmin = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
  const canEdit = (trip.status === TripStatus.CREATED || trip.status === TripStatus.COMPLETED) && isManagerOrAdmin;
  const canCancel = trip.status !== TripStatus.LOCKED && trip.status !== TripStatus.CANCELED && isManagerOrAdmin;
  const canDispatch = trip.status === TripStatus.CREATED && isManagerOrAdmin;
  const canLock = trip.status === TripStatus.COMPLETED && isManagerOrAdmin;
  const canReassign = trip.status === TripStatus.CREATED && isManagerOrAdmin;
  const canAdjust = trip.status === TripStatus.LOCKED && isManagerOrAdmin;
  const needsPhotos = !trip.photoUrls || trip.photoUrls.length === 0;

  return (
    <div className="fade-up">
      <div className="trip-hero">
        <div className="trip-hero__top">
          <button className="trip-hero__back" onClick={() => navigate('/trips')} aria-label="Quay lại">
            <ArrowLeft size={16} />
          </button>
          <div className="trip-hero__crumb">
            <span>LỆNH VẬN CHUYỂN</span>
            <span className="trip-hero__crumb-sep">·</span>
            <span className="trip-hero__crumb-id">#{trip.id}</span>
          </div>
        </div>

        <div className="trip-hero__title-row">
          <h1 className="trip-hero__title">Lệnh vận chuyển</h1>
          <span className={`pill pill--${
            trip.status === TripStatus.CANCELED ? 'danger' :
            trip.status === TripStatus.LOCKED ? 'success' :
            trip.status === TripStatus.COMPLETED ? 'warn' :
            trip.status === TripStatus.IN_TRANSIT ? 'info' : 'neutral'
          } pill--md pill--solid`}>
            <span className="dot" />
            {TRIP_STATUS_LABELS[trip.status]}
          </span>
        </div>

        <div className="trip-hero__meta">
          {trip.customer?.name && (
            <span className="trip-hero__chip">
              <User size={14} />
              <span>{trip.customer.name}</span>
            </span>
          )}
          {trip.route?.name && (
            <span className="trip-hero__chip trip-hero__chip--route">
              <RouteIcon size={14} />
              <span>{trip.route.name}</span>
            </span>
          )}
          {trip.truck?.licensePlate && (
            <span className="trip-hero__chip">
              <Truck size={14} />
              <strong>{trip.truck.licensePlate}</strong>
            </span>
          )}
          {trip.driver?.name && (
            <span className="trip-hero__chip">
              <User size={14} />
              <span>{trip.driver.name}</span>
            </span>
          )}
          {trip.departureDate && (
            <span className="trip-hero__chip">
              <Calendar size={14} />
              <span>{formatDate(trip.departureDate)}</span>
            </span>
          )}
          {(trip.containerCount ?? 1) > 1 && (
            <span className="trip-hero__chip">
              <Package size={14} />
              <span>{trip.containerCount} cont</span>
            </span>
          )}
        </div>

        <div className="trip-hero__actions">
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
              disabled={actionLoading || needsPhotos}
              title={needsPhotos ? 'Chưa có ảnh chuyến đi. Vui lòng tải lên ít nhất 1 ảnh trước khi khóa.' : undefined}
              onClick={handleLockClick}
            >
              {actionLoading ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
              Khóa chuyến
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
          {needsPhotos && canLock && (
            <span className="trip-hero__warn">
              <AlertCircle size={13} />
              Cần ít nhất 1 ảnh để khóa
            </span>
          )}
          <span className="trip-hero__actions-spacer" />
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

      <div className="row-2 section-gap">
        <Panel title="Thông tin cơ bản">
          <div className="detail-grid">
            {infoRow(<Truck size={16} />, 'Xe đầu', trip.truck?.licensePlate, 'accent')}
            {infoRow(<User size={16} />, 'Tài xế', trip.driver?.name, 'info')}
            {infoRow(<RouteIcon size={16} />, 'Rơ moóc', trip.trailer ? `${trip.trailer.licensePlate} (${trip.trailer.type || trip.trailerType})` : trip.trailerType, 'neutral')}
            {infoRow(<Calendar size={16} />, 'Ngày khởi hành', formatDate(trip.departureDate), 'neutral')}
            {infoRow(<FileText size={16} />, 'Số cont', String(trip.containerCount ?? 1), 'neutral')}
            {infoRow(<FileText size={16} />, 'Mã tham chiếu', trip.customerReference, 'neutral')}
          </div>
        </Panel>

        <Panel title="Tài chính" subtitle="Tổng quan doanh thu, chi phí và lợi nhuận">
          {(() => {
            const rev = Number(trip.revenue || 0);
            const cost = Number(trip.totalCost || 0);
            const profit = Number(trip.grossProfit || 0);
            const profitClass = profit >= 0 ? 'metric-strip__value--success' : 'metric-strip__value--danger';
            const marginPct = rev > 0 ? `${((profit / rev) * 100).toFixed(1)}%` : null;
            const showRevOriginal = trip.revenueOriginal
              && Number(trip.revenueOriginal) > 0
              && Number(trip.revenue) !== Number(trip.revenueOriginal);
            return (
              <>
                <div className="metric-strip">
                  <div className="metric-strip__cell">
                    <div className="metric-strip__label"><Banknote size={13} /> Doanh thu</div>
                    <div className="metric-strip__value">{formatCurrency(trip.revenue)}</div>
                    {(trip.containerCount ?? 1) > 1 && rev > 0 && (() => {
                      const count = trip.containerCount ?? 1;
                      const unitPrice = Math.floor(rev / count);
                      const remainder = rev - unitPrice * count;
                      return (
                        <div className="metric-strip__sub">
                          Đơn giá <strong>{formatCurrency(String(unitPrice))}</strong> × {count} cont
                          {remainder > 0 && <> · dư <strong>{formatCurrency(String(remainder))}</strong></>}
                        </div>
                      );
                    })()}
                    {showRevOriginal && (
                      <div className="metric-strip__sub">
                        Giá gốc: <span style={{ textDecoration: 'line-through' }}>{formatCurrency(trip.revenueOriginal)}</span>
                      </div>
                    )}
                  </div>
                  <div className="metric-strip__cell">
                    <div className="metric-strip__label"><Receipt size={13} /> Tổng chi phí</div>
                    <div className="metric-strip__value metric-strip__value--muted">{formatCurrency(trip.totalCost)}</div>
                    {cost > 0 && rev > 0 && (
                      <div className="metric-strip__sub">
                        Chiếm <strong>{((cost / rev) * 100).toFixed(1)}%</strong> doanh thu
                      </div>
                    )}
                  </div>
                  <div className="metric-strip__cell">
                    <div className="metric-strip__label"><TrendingUp size={13} /> Lợi nhuận gộp</div>
                    <div className={`metric-strip__value ${profitClass}`}>{formatCurrency(trip.grossProfit)}</div>
                    {marginPct && (
                      <div className="metric-strip__sub">
                        Biên lợi nhuận: <strong>{marginPct}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {(Number(trip.totalRoadAllowance) > 0
                  || Number(trip.driverSalary) > 0
                  || Number(trip.twoPointDeliveryBonus) > 0
                  || Number(trip.vehicleShiftAllowance) > 0) && (
                  <div className="subsection-card">
                    <div className="subsection-card__title"><User size={13} /> Phụ cấp tài xế & tiền đường</div>
                    <div className="detail-grid">
                      {Number(trip.totalRoadAllowance) > 0 && infoRow(<MapPin size={16} />, 'Tiền đi đường', formatCurrency(trip.totalRoadAllowance), 'accent')}
                      {Number(trip.driverSalary) > 0 && infoRow(<User size={16} />, 'Tiền kết hợp', formatCurrency(trip.driverSalary), 'info')}
                      {Number(trip.twoPointDeliveryBonus) > 0 && infoRow(<MapPin size={16} />, 'Trả hàng 2 điểm', formatCurrency(trip.twoPointDeliveryBonus), 'info')}
                      {Number(trip.vehicleShiftAllowance) > 0 && infoRow(<Clock size={16} />, 'Lưu ca xe', formatCurrency(trip.vehicleShiftAllowance), 'info')}
                    </div>
                  </div>
                )}

                {(Number(trip.tollsDiscount) > 0 || Number(trip.tollsAddition) > 0 || Number(trip.tollsStations) > 0 || trip.hasReturnCargo) && (
                  <div className="subsection-card subsection-card--accent" style={{ marginTop: 10 }}>
                    <div className="subsection-card__title"><MapPin size={13} /> Chi tiết tiền đường</div>
                    <div className="detail-grid">
                      {Number(trip.tollsDiscount) > 0 && infoRow(<Minus size={16} />, 'Giảm vé QL5', `-${formatCurrency(trip.tollsDiscount)}`, 'danger')}
                      {Number(trip.tollsAddition) > 0 && infoRow(<Plus size={16} />, 'Tăng vé theo lệnh', `+${formatCurrency(trip.tollsAddition)}`, 'accent')}
                      {Number(trip.tollsStations) > 0 && (() => {
                        const rate = Number(trip.tollPerStationApplied || 0);
                        const total = Number(trip.tollsStations) * rate;
                        return infoRow(<Hash size={16} />, 'Số trạm (trừ)', `${trip.tollsStations} × ${rate.toLocaleString('vi-VN')} = ${formatCurrency(total)}`, 'warn');
                      })()}
                      {trip.hasReturnCargo && infoRow(<Package size={16} />, 'Chuyến về có hàng', '+300.000 ₫', 'accent')}
                    </div>
                  </div>
                )}

                <div className="subsection-card subsection-card--info" style={{ marginTop: 10 }}>
                  <div className="subsection-card__title"><Fuel size={13} /> Nhiên liệu</div>
                  <div className="detail-grid">
                    {infoRow(<Fuel size={16} />, 'Chế độ', FUEL_MODE_LABELS[trip.fuelMode], 'info')}
                    {infoRow(<Fuel size={16} />, 'Số lít', trip.fuelLiters ? `${Number(trip.fuelLiters).toLocaleString('vi-VN')} lít` : '—', 'info')}
                    {(() => {
                      const totalKm = trip.legs?.reduce((s, l) => s + Number(l.km), 0) ?? 0;
                      const totalLiters = Number(trip.fuelLiters) || 0;
                      if (totalKm > 0 && totalLiters > 0) {
                        const ttbq = (totalLiters / totalKm) * 100;
                        const warnThreshold = fuelConfig ? parseThreshold(fuelConfig.warningThreshold, 0) : 0;
                        const critThreshold = fuelConfig ? parseThreshold(fuelConfig.criticalThreshold, 0) : 0;
                        let alert: React.ReactNode = null;
                        if (critThreshold > 0 && ttbq > critThreshold) {
                          alert = <span className="fuel-alert fuel-alert--danger"><AlertTriangle size={12} /> Vượt nghiêm trọng ({critThreshold.toFixed(1)})</span>;
                        } else if (warnThreshold > 0 && ttbq > warnThreshold) {
                          const overPct = Math.round(((ttbq - warnThreshold) / warnThreshold) * 100);
                          alert = <span className="fuel-alert fuel-alert--warn"><AlertTriangle size={12} /> Vượt {overPct}%</span>;
                        } else if (warnThreshold > 0) {
                          alert = <span className="fuel-alert fuel-alert--ok"><Check size={12} /> Ổn</span>;
                        }
                        return infoRow(
                          <Fuel size={16} />,
                          'TTBQ (L/100km)',
                          <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                            <span>{ttbq.toFixed(1).replace('.', ',')} L/100km</span>
                            {alert}
                          </span>,
                          'info',
                        );
                      }
                      return null;
                    })()}
                    {infoRow(<Fuel size={16} />, 'Đơn giá cấu hình', trip.fuelPriceApplied ? `${Number(trip.fuelPriceApplied).toLocaleString('vi-VN')} ₫/lít` : '—', 'info')}
                    {trip.fuelActualUnitPrice != null && Number(trip.fuelActualUnitPrice) > 0 && (() => {
                      const actualPrice = Number(trip.fuelActualUnitPrice);
                      const liters = Number(trip.fuelLiters || 0);
                      const variance = Math.round(liters * actualPrice) - Math.round(liters * Number(trip.fuelPriceApplied || 0));
                      return (
                        <>
                          {infoRow(<Fuel size={16} />, 'Đơn giá thực tế', `${actualPrice.toLocaleString('vi-VN')} ₫/lít`, 'info')}
                          {variance !== 0 && infoRow(
                            <Fuel size={16} />,
                            'Chênh lệch',
                            <span className={variance < 0 ? 'ms-pos' : 'ms-neg'}>
                              {variance > 0 ? '+' : ''}{variance.toLocaleString('vi-VN')} ₫ ({variance < 0 ? 'tiết kiệm' : 'thêm chi phí'})
                            </span>,
                            variance < 0 ? 'accent' : 'danger',
                          )}
                        </>
                      );
                    })()}
                    {(() => {
                      const computedLiters = trip.legs?.reduce((s, l) => s + Number(l.calculatedLiters || 0), 0) ?? 0;
                      const issuedLiters = Number(trip.fuelLiters) || 0;
                      if (computedLiters > 0 && issuedLiters > 0 && Math.abs(issuedLiters - computedLiters) > 0.5) {
                        const diff = issuedLiters - computedLiters;
                        const isOver = diff > 0;
                        return infoRow(
                          <Fuel size={16} />,
                          'So sánh',
                          <span className="metric-strip__sub" style={{ marginTop: 0 }}>
                            <span>Phát hành <strong>{issuedLiters.toLocaleString('vi-VN')}L</strong></span>
                            <span>Định mức <strong>{computedLiters.toLocaleString('vi-VN')}L</strong></span>
                            <span className={isOver ? 'ms-neg' : 'ms-pos'}>
                              {isOver ? '+' : ''}{diff.toLocaleString('vi-VN')}L ({isOver ? 'vượt' : 'tiết kiệm'})
                            </span>
                          </span>,
                          isOver ? 'warn' : 'accent',
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </>
            );
          })()}
        </Panel>
      </div>

      {trip.carrierType === 'EXTERNAL' && (
        <Panel title="Xe ngoài" subtitle="Chuyến xe sử dụng đối tác vận chuyển bên ngoài" style={{ marginTop: 20 }}>
          <div className="detail-grid">
            {infoRow(<User size={16} />, 'Đối tác vận chuyển', externalCarrierName, 'accent')}
            {infoRow(<Truck size={16} />, 'Biển số xe', trip.externalPlateNumber, 'neutral')}
            {infoRow(<User size={16} />, 'Lái xe', (
              <>
                {trip.externalDriverName ?? '—'}
                {trip.externalDriverPhone ? ` (${trip.externalDriverPhone})` : ''}
              </>
            ), 'neutral')}
            {infoRow(<Banknote size={16} />, 'Cước thuê ngoài', formatCurrency(Number(trip.externalFreightCost ?? 0)), 'neutral')}
            {externalMargin !== null && infoRow(
              <TrendingUp size={16} />,
              'Lãi điều xe ngoài',
              <strong style={{ color: externalMargin >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {formatCurrency(externalMargin)}
              </strong>,
              externalMargin >= 0 ? 'accent' : 'danger',
            )}
          </div>
        </Panel>
      )}

      <Panel
        title="Chi phí dịch vụ đi kèm"
        subtitle="Phí nâng/hạ, hải quan, cân hàng…"
        style={{ marginTop: 20 }}
      >
        <AncillaryFeesCard tripId={trip.id} readOnly={trip.status === 'LOCKED' || trip.status === 'CANCELED'} />
      </Panel>

      {trip.legs && trip.legs.length > 0 && (
        <Panel
          title="Hành trình"
          subtitle={`${trip.legs.length} chặng đường`}
          style={{ marginTop: 20 }}
          flush
        >
          {trip.legs.some(leg => leg.polylinePath) && (
            <div style={{ padding: '16px 20px 0' }}>
              <LeafletMap legs={trip.legs} height="280px" />
            </div>
          )}

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
                    <td><span className="badge badge-outline" style={{ fontSize: 11 }}>{LOADING_TYPE_LABELS[leg.loadingType]}</span></td>
                    <td className="num">{leg.calculatedLiters ? Number(leg.calculatedLiters).toLocaleString('vi-VN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {trip.notes && (
        <Panel title="Ghi chú" style={{ marginTop: 20 }}>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>{trip.notes}</p>
        </Panel>
      )}

      {(() => {
        const validPhotos = (trip.photoUrls ?? []).filter(
          (u): u is string => typeof u === 'string' && u.trim().length > 0 && u.trim() !== '#'
        );
        if (validPhotos.length === 0) return null;
        return (
          <Panel
            title="Hình ảnh"
            subtitle={`${validPhotos.length} ảnh đính kèm`}
            style={{ marginTop: 20 }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {validPhotos.map((url, i) => (
                <a
                  key={i}
                  href={getAuthenticatedPhotoUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Ảnh ${i + 1} — bấm để xem lớn`}
                  style={{
                    display: 'block',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-1)',
                    aspectRatio: '4/3',
                    background: 'var(--bg-3)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    cursor: 'zoom-in',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <img
                    src={getAuthenticatedPhotoUrl(url)}
                    alt={`Ảnh ${i + 1}`}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.25s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </a>
              ))}
            </div>
          </Panel>
        );
      })()}

      {!trip.notes && (!trip.photoUrls || trip.photoUrls.length === 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 12, marginTop: 4 }}>
          <ImageIcon size={14} />
          Chưa có ảnh hoặc ghi chú
        </div>
      )}

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
                {adjustments.map((a: any) => {
                  const debitVal = Number(a.debit ?? a.debit_amount ?? 0);
                  const creditVal = Number(a.credit ?? a.credit_amount ?? 0);
                  const amt = debitVal - creditVal;
                  const isZero = amt === 0;
                  const display = isZero
                    ? '0 ₫'
                    : `${amt > 0 ? '+' : ''}${formatCurrency(amt)}`;
                  return (
                    <tr key={a.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.createdAt ?? a.created_at)}</td>
                      <td className="num" style={{
                        color: isZero ? 'var(--fg-3)' : (amt > 0 ? 'var(--success)' : 'var(--danger)'),
                        fontWeight: isZero ? 500 : 600,
                      }}>
                        {display}
                      </td>
                      <td>{a.note}</td>
                      <td style={{ color: 'var(--fg-3)', fontSize: 12 }}>{a.signedAgreementRef ?? a.signed_agreement_ref ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Modal
        isOpen={showReassign}
        title="Phân xe lại"
        onClose={() => setShowReassign(false)}
        onConfirm={handleReassign}
        maxWidth={440}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowReassign(false)}>
              <X size={14} /> Hủy
            </button>
            <button
              className="btn btn--primary btn--sm"
              disabled={reassignLoading || !reassignTruckId || !reassignDriverId}
              onClick={handleReassign}
            >
              {reassignLoading ? <Loader2 size={14} className="spin" /> : <Shuffle size={14} />}
              Xác nhận phân xe lại
            </button>
          </>
        }
      >
        {reassignError && (
          <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 13 }}>
            {reassignError}
          </div>
        )}
        <div className="field">
          <label>Xe đầu kéo</label>
          <select className="input" value={reassignTruckId} onChange={e => setReassignTruckId(e.target.value)}>
            <option value="">-- Chọn xe --</option>
            {reassignTrucks.map(t => <option key={t.id} value={t.id}>{t.licensePlate}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Tài xế</label>
          <select className="input" value={reassignDriverId} onChange={e => setReassignDriverId(e.target.value)}>
            <option value="">-- Chọn tài xế --</option>
            {reassignDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </Modal>

      <Drawer isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="Hóa đơn điều chỉnh">
        <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 16, lineHeight: 1.5 }}>
          Số âm = Giảm doanh thu (Credit Note) · Số dương = Tăng doanh thu (Debit Note)
        </p>
        {adjustError && <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 13 }}>{adjustError}</div>}
        <div className="field">
          <label>Số tiền điều chỉnh (đ) *</label>
          <input className="input" type="number" placeholder="VD: -500000 hoặc 300000" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Lý do điều chỉnh *</label>
          <textarea className="input" rows={3} placeholder="Mô tả lý do…" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} style={{ resize: 'vertical' }} />
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
