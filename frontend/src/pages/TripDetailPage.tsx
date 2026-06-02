import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, XCircle, Shuffle, FilePen, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { TripDetail } from '@nepocorp/shared';
import { TripStatus, Role } from '@nepocorp/shared';
import { useAuth } from '../hooks/useAuth';
import { Drawer, Modal } from '../components/UI';
import { useTripDetail, useTripAdjustments, useTrucksAndDrivers, useFuelConfig } from '../hooks/useQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '../components/shared/Spinner';
import { AncillaryFeesCard } from '../components/trip/AncillaryFeesCard';
import { useCatalogs } from '../hooks/useCatalogs';

import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailKPIStrip } from '../components/trip/TripDetailKPIStrip';
import { TripDetailInfoCard } from '../components/trip/TripDetailInfoCard';
import { TripDetailPLCard } from '../components/trip/TripDetailPLCard';
import { TripDetailFuelCard } from '../components/trip/TripDetailFuelCard';
import { TripDetailServiceCostsCard } from '../components/trip/TripDetailServiceCostsCard';
import { TripDetailJourneyCard } from '../components/trip/TripDetailJourneyCard';

import './TripDetailPage.css';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustRef, setAdjustRef] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const isManagerOrAdmin = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
  const canEdit = (trip?.status === TripStatus.CREATED || trip?.status === TripStatus.COMPLETED) && isManagerOrAdmin;
  const canCancel = trip?.status !== TripStatus.LOCKED && trip?.status !== TripStatus.CANCELED && isManagerOrAdmin;
  const canDispatch = trip?.status === TripStatus.CREATED && isManagerOrAdmin;
  const canLock = trip?.status === TripStatus.COMPLETED && isManagerOrAdmin;
  const canReassign = trip?.status === TripStatus.CREATED && isManagerOrAdmin;
  const canAdjust = trip?.status === TripStatus.LOCKED && isManagerOrAdmin;
  const needsPhotos = !trip?.photoUrls || trip.photoUrls.length === 0;
  const readOnly = trip?.status === 'LOCKED' || trip?.status === 'CANCELED';

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
        const isConfirmed = window.confirm('Doanh thu chuyến đi này bằng 0 đ. Bạn có chắc chắn muốn khóa chuyến với doanh thu bằng 0?');
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
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={() => refetchTrip()}>Thử lại</button>
        </div>
      </div>
    );
  }

  if (!trip) return null;

  const displayError = actionError || error;
  const revenue = Number(trip.revenue || 0);
  const totalCost = Number(trip.totalCost || 0);
  const grossProfit = Number(trip.grossProfit || 0);
  const marginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : null;
  const fuelCost = Number(trip.totalFuelCost || 0);
  const roadAllowance = Number(trip.totalRoadAllowance || 0);
  const driverSalary = Number(trip.driverSalary || 0);
  const serviceCost = 0;
  const totalKm = trip.legs?.reduce((s, l) => s + Number(l.km), 0) ?? 0;
  const fuelPriceConfig = fuelConfig?.unitPrice ? Number(fuelConfig.unitPrice) : null;

  return (
    <div className="fade-up">
      <TripDetailHeader
        trip={trip}
        onBack={() => navigate('/trips')}
        canEdit={canEdit}
        canCancel={canCancel}
        canDispatch={canDispatch}
        canLock={canLock}
        canReassign={canReassign}
        canAdjust={canAdjust}
        needsPhotos={needsPhotos}
        actionLoading={actionLoading}
        onDispatch={() => handleAction('dispatch', () => api.post(`/trips/${trip.id}/dispatch`, {}))}
        onEdit={() => navigate(`/trips/${trip.id}/edit`)}
        onLock={handleLockClick}
        onCancel={async () => {
          if (window.confirm('Bạn có chắc muốn hủy chuyến này?')) {
            handleAction('cancel', () => api.post(`/trips/${trip.id}/cancel`, {}));
          }
        }}
        onReassign={openReassign}
        onAdjust={openAdjust}
      />

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

      <TripDetailKPIStrip
        revenue={revenue}
        totalCost={totalCost}
        grossProfit={grossProfit}
        marginPct={marginPct}
      />

      <section className="detail-grid anim d3">
        <TripDetailInfoCard trip={trip} />
        <TripDetailPLCard
          revenue={revenue}
          fuelCost={fuelCost}
          roadAllowance={roadAllowance}
          driverSalary={driverSalary}
          serviceCost={serviceCost}
          totalCost={totalCost}
          grossProfit={grossProfit}
        />
        <TripDetailFuelCard trip={trip} fuelPriceConfig={fuelPriceConfig} />
      </section>

      <TripDetailServiceCostsCard tripId={trip.id} readOnly={readOnly} />

      {trip.legs && trip.legs.length > 0 && (
        <TripDetailJourneyCard trip={trip} totalKm={totalKm} />
      )}

      {trip.carrierType === 'EXTERNAL' && (
        <section className="card" style={{ marginTop: 20, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Xe ngoài</h3>
          <div className="info-list">
            <div className="info-row">
              <span className="ri">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <div className="info-meta">
                <div className="lbl">Đối tác vận chuyển</div>
                <div className="val">{externalCarrierName}</div>
              </div>
            </div>
            <div className="info-row">
              <span className="ri">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1M14 17h1"/>
                </svg>
              </span>
              <div className="info-meta">
                <div className="lbl">Biển số xe</div>
                <div className="val mono">{trip.externalPlateNumber ?? '—'}</div>
              </div>
            </div>
            <div className="info-row">
              <span className="ri">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <div className="info-meta">
                <div className="lbl">Lái xe</div>
                <div className="val">
                  {trip.externalDriverName ?? '—'}
                  {trip.externalDriverPhone ? ` (${trip.externalDriverPhone})` : ''}
                </div>
              </div>
            </div>
            <div className="info-row">
              <span className="ri">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
                </svg>
              </span>
              <div className="info-meta">
                <div className="lbl">Cước thuê ngoài</div>
                <div className="val mono">
                  {trip.externalFreightCost != null
                    ? `${Number(trip.externalFreightCost).toLocaleString('vi-VN')} đ`
                    : '—'}
                </div>
              </div>
            </div>
            {externalMargin !== null && (
              <div className="info-row">
                <span className="ri">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                  </svg>
                </span>
                <div className="info-meta">
                  <div className="lbl">Lãi điều xe ngoài</div>
                  <div className="val" style={{ color: externalMargin >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>
                    {externalMargin >= 0 ? '+' : ''}{externalMargin.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {trip.notes && (
        <section className="card" style={{ marginTop: 20, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Ghi chú</h3>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>{trip.notes}</p>
        </section>
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
                  {Number(a.amount) > 0 ? '+' : ''}{Number(a.amount).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
