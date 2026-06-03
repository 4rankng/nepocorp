import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, XCircle, Shuffle, FilePen, X } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Drawer } from '../components/UI';
import { Spinner } from '../components/shared/Spinner';

// Feature: logic (.ts) + UI (.tsx)
import { useTripDetailPage } from '../features/trip-detail';
import {
  TripHeader, KpiStrip, BasicInfoCard, FinancialCard,
  FuelCard, ServiceCostsCard, JourneyCard,
  ExternalCarrierCard, PhotosCard,
} from '../features/trip-detail';

import './TripDetailPage.css';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const page = useTripDetailPage(id);

  /* ── Loading / Error / Empty guards ────────────────────────────────── */
  if (page.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
        <Spinner size={20} />
        <span style={{ fontSize: 14 }}>Đang tải dữ liệu…</span>
      </div>
    );
  }

  if (page.error && !page.trip) {
    return (
      <div className="fade-up">
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{page.error}</p>
          <button className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={() => page.refetchTrip()}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!page.trip) return null;

  const { trip, derived, permissions, ui, fuelPriceConfig, adjustments } = page;
  const displayError = ui.actionError || page.error;

  /* ── Main render ───────────────────────────────────────────────────── */
  return (
    <div className="fade-up">
      <TripHeader
        trip={trip}
        permissions={permissions}
        actionLoading={ui.actionLoading}
        onBack={() => navigate('/trips')}
        onEdit={() => navigate(`/trips/${trip.id}/edit`)}
        onDispatch={() => page.handleAction('dispatch', () => api.post(`/trips/${trip.id}/dispatch`, {}))}
        onLock={page.handleLockClick}
        onCancel={async () => {
          if (window.confirm('Bạn có chắc muốn hủy chuyến này?')) {
            page.handleAction('cancel', () => api.post(`/trips/${trip.id}/cancel`, {}));
          }
        }}
        onReassign={page.openReassign}
        onAdjust={page.openAdjust}
        onUnlock={page.handleUnlock}
      />

      {displayError && (
        <div style={{
          padding: '10px 14px', background: 'var(--danger-soft)', color: 'var(--danger-text)',
          borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16,
          border: '1px solid rgba(220,38,38,0.12)',
        }}>
          {displayError}
        </div>
      )}

      <KpiStrip
        revenue={derived.revenue}
        totalCost={derived.totalCost}
        grossProfit={derived.grossProfit}
        marginPct={derived.marginPct}
      />

      <section className="detail-grid anim d3">
        <BasicInfoCard
          trip={trip}
          canChangeDate={permissions.canChangeDate}
          onChangeDepartureDate={page.handleChangeDepartureDate}
          actionLoading={ui.actionLoading}
        />
        <FinancialCard derived={derived} />
        <FuelCard trip={trip} derived={derived} fuelPriceConfig={fuelPriceConfig} />
      </section>

      <ServiceCostsCard tripId={trip.id} readOnly={permissions.readOnly} />

      {trip.legs && trip.legs.length > 0 && (
        <JourneyCard trip={trip} derived={derived} />
      )}

      {trip.carrierType === 'EXTERNAL' && (
        <ExternalCarrierCard
          derived={derived}
          carrierName={derived.externalCarrierName}
          plateNumber={trip.externalPlateNumber}
          driverName={trip.externalDriverName}
          driverPhone={trip.externalDriverPhone}
          freightCost={trip.externalFreightCost != null ? Number(trip.externalFreightCost) : null}
        />
      )}

      <PhotosCard photoUrls={trip.photoUrls} />

      {trip.notes && (
        <section className="card" style={{ marginTop: 20, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Ghi chú</h3>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>{trip.notes}</p>
        </section>
      )}

      {/* ── Reassign Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={ui.showReassign}
        title="Phân xe lại"
        onClose={() => page.setShowReassign(false)}
        onConfirm={page.handleReassign}
        maxWidth={440}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => page.setShowReassign(false)}>
              <X size={14} /> Hủy
            </button>
            <button
              className="btn btn--primary btn--sm"
              disabled={ui.reassignLoading || !ui.reassignTruckId || !ui.reassignDriverId}
              onClick={page.handleReassign}
            >
              {ui.reassignLoading ? <Loader2 size={14} className="spin" /> : <Shuffle size={14} />}
              Xác nhận phân xe lại
            </button>
          </>
        }
      >
        {ui.reassignError && (
          <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 13 }}>
            {ui.reassignError}
          </div>
        )}
        <div className="field">
          <label>Xe đầu kéo</label>
          <select className="input" value={ui.reassignTruckId} onChange={e => page.setReassignTruckId(e.target.value)}>
            <option value="">-- Chọn xe --</option>
            {page.reassignTrucks.map(t => <option key={t.id} value={t.id}>{t.licensePlate}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Tài xế</label>
          <select className="input" value={ui.reassignDriverId} onChange={e => page.setReassignDriverId(e.target.value)}>
            <option value="">-- Chọn tài xế --</option>
            {page.reassignDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </Modal>

      {/* ── Adjustment Drawer ───────────────────────────────────────────── */}
      <Drawer isOpen={ui.showAdjust} onClose={() => page.setShowAdjust(false)} title="Hóa đơn điều chỉnh">
        <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 16, lineHeight: 1.5 }}>
          Số âm = Giảm doanh thu (Credit Note) · Số dương = Tăng doanh thu (Debit Note)
        </p>
        {ui.adjustError && (
          <div style={{ padding: '8px 12px', marginBottom: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 13 }}>
            {ui.adjustError}
          </div>
        )}
        <div className="field">
          <label>Số tiền điều chỉnh (đ) *</label>
          <input className="input" type="number" placeholder="VD: -500000 hoặc 300000"
            value={ui.adjustAmount} onChange={e => page.setAdjustAmount(e.target.value)} />
        </div>
        <div className="field">
          <label>Lý do điều chỉnh *</label>
          <textarea className="input" rows={3} placeholder="Mô tả lý do…"
            value={ui.adjustNote} onChange={e => page.setAdjustNote(e.target.value)}
            style={{ resize: 'vertical' }} />
        </div>
        <div className="field">
          <label>Mã biên bản thỏa thuận *</label>
          <input className="input" placeholder="VD: BB-2026-001"
            value={ui.adjustRef} onChange={e => page.setAdjustRef(e.target.value)} />
        </div>
        <button
          className="btn btn--primary"
          style={{ width: '100%', marginTop: 4 }}
          disabled={ui.adjustSubmitting || !ui.adjustNote.trim() || !ui.adjustRef.trim() || ui.adjustAmount === ''}
          onClick={page.handleAdjustSubmit}
        >
          {ui.adjustSubmitting ? <Loader2 size={14} className="spin" /> : <FilePen size={14} />}
          Xác nhận phát hành
        </button>
        {adjustments.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Đã phát hành
            </div>
            {(adjustments as any[]).map((a, i) => (
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
