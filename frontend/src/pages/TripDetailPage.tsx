import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Shuffle, FilePen, X } from 'lucide-react';
import { api } from '../lib/api';
import { Modal, Drawer } from '../components/UI';
import { Spinner } from '../components/shared/Spinner';
import { Money } from '../components/shared/Money';
import { usePageAnimations } from '../hooks/animations';

// Feature: logic (.ts) + UI (.tsx)
import { useTripDetailPage } from '../features/trip-detail';
import {
  TripHeader, KpiStrip, BasicInfoCard, ContainersCard, FinancialCard,
  FuelCard, ServiceCostsCard, JourneyCard,
  ExternalCarrierCard, PhotosCard,
} from '../features/trip-detail';

import './TripDetailPage.css';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const page = useTripDetailPage(id);
  const { rootRef } = usePageAnimations({ ready: !page.loading });

  /* ── Loading / Error / Empty guards ────────────────────────────────── */
  if (page.loading) {
    return (
      <div className="tdp-loading">
        <Spinner size={20} />
        <span>Đang tải dữ liệu…</span>
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
    <div ref={rootRef}>
      <TripHeader
        trip={trip}
        permissions={permissions}
        actionLoading={ui.actionLoading}
        onBack={() => navigate('/trips')}
        onEdit={() => navigate(`/trips/${trip.id}/edit`)}
        onDispatch={() => page.handleAction('dispatch', () => api.post(`/trips/${trip.id}/dispatch`, {}))}
        onComplete={() => page.handleAction('complete', () => api.post(`/trips/${trip.id}/complete`, {}))}
        onLock={page.handleLockClick}
        onCancel={async () => {
          if (await page.confirm('Bạn có chắc muốn hủy chuyến này?', { variant: 'danger', confirmLabel: 'Hủy chuyến' })) {
            page.handleAction('cancel', () => api.post(`/trips/${trip.id}/cancel`, {}));
          }
        }}
        onReassign={page.openReassign}
        onAdjust={page.openAdjust}
        onUnlock={page.handleUnlock}
      />

      {displayError && (
        <div className="tdp-error-banner">
          {displayError}
        </div>
      )}

      {/* ── 2-column body: main (operational) | rail (financial) ────────── */}
      <div className="trip-body anim d2">
        {/* ── Main column — operational story ─────────────────────────── */}
        <div className="trip-col trip-col--main">
          {trip.legs && trip.legs.length > 0 && (
            <div className="anim d3 tdp-card tdp-m1">
              <JourneyCard trip={trip} derived={derived} />
            </div>
          )}

          <div className="anim d3 tdp-card tdp-m2">
            <ServiceCostsCard tripId={trip.id} readOnly={permissions.readOnly} />
          </div>

          <div className="anim d3 tdp-card tdp-m3">
            <BasicInfoCard
              trip={trip}
              canChangeDate={permissions.canChangeDate}
              onChangeDepartureDate={page.handleChangeDepartureDate}
              actionLoading={ui.actionLoading}
            />
          </div>

          <div className="anim d4 tdp-card tdp-m4">
            <ContainersCard tripId={trip.id} />
          </div>

          {trip.notes && (
            <section className="tdp-notes-card anim d4 tdp-card tdp-m6">
              <h3 className="tdp-notes-title">Ghi chú</h3>
              <p className="tdp-notes-body">{trip.notes}</p>
            </section>
          )}
        </div>

        {/* ── Right rail — financial summary (sticky on desktop) ──────── */}
        <div className="trip-col trip-col--rail trip-rail-bg">
          <div className="anim d3 tdp-card tdp-r1">
            <KpiStrip
              variant="rail"
              revenue={derived.revenue}
              totalCost={derived.totalCost}
              grossProfit={derived.grossProfit}
              marginPct={derived.marginPct}
            />
          </div>

          <div className="anim d3 tdp-card tdp-r2">
            <FinancialCard derived={derived} customerCommission={Number(trip.customerCommission) || 0} />
          </div>

          <div className="anim d4 tdp-card tdp-r3">
            <FuelCard trip={trip} derived={derived} fuelPriceConfig={fuelPriceConfig} />
          </div>

          {trip.carrierType === 'EXTERNAL' && (
            <div className="anim d4 tdp-card tdp-r4">
              <ExternalCarrierCard
                derived={derived}
                carrierName={derived.externalCarrierName}
                plateNumber={trip.externalPlateNumber}
                driverName={trip.externalDriverName}
                driverPhone={trip.externalDriverPhone}
                freightCost={trip.externalFreightCost != null ? Number(trip.externalFreightCost) : null}
              />
            </div>
          )}

          {(trip.photoUrls?.length ?? 0) > 0 && (
            <div className="anim d4 tdp-card tdp-r5">
              <PhotosCard photoUrls={trip.photoUrls} />
            </div>
          )}
        </div>
      </div>

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
          <div className="tdp-modal-error">
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
          <label>Lái xe</label>
          <select className="input" value={ui.reassignDriverId} onChange={e => page.setReassignDriverId(e.target.value)}>
            <option value="">-- Chọn lái xe --</option>
            {page.reassignDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </Modal>

      {/* ── Adjustment Drawer ───────────────────────────────────────────── */}
      <Drawer isOpen={ui.showAdjust} onClose={() => page.setShowAdjust(false)} title="Hóa đơn điều chỉnh">
        <p className="tdp-drawer-hint">
          Số âm = Giảm doanh thu (Credit Note) · Số dương = Tăng doanh thu (Debit Note)
        </p>
        {ui.adjustError && (
          <div className="tdp-modal-error">
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
          <textarea className="input tdp-drawer-textarea" rows={3} placeholder="Mô tả lý do…"
            value={ui.adjustNote} onChange={e => page.setAdjustNote(e.target.value)} />
        </div>
        <div className="field">
          <label>Mã biên bản thỏa thuận *</label>
          <input className="input" placeholder="VD: BB-2026-001"
            value={ui.adjustRef} onChange={e => page.setAdjustRef(e.target.value)} />
        </div>
        <button
          className="btn btn--primary tdp-drawer-submit"
          disabled={ui.adjustSubmitting || !ui.adjustNote.trim() || !ui.adjustRef.trim() || ui.adjustAmount === ''}
          onClick={page.handleAdjustSubmit}
        >
          {ui.adjustSubmitting ? <Loader2 size={14} className="spin" /> : <FilePen size={14} />}
          Xác nhận phát hành
        </button>
        {adjustments.length > 0 && (
          <div>
            <div className="tdp-adjustments-title">
              Đã phát hành
            </div>
            {(adjustments as Array<{ note: string; amount: string | number }>).map((a, i) => {
              const amount = Number(a.amount);
              const isPos = amount >= 0;
              return (
                <div key={i} className="tdp-adjustment-row">
                  <span className="tdp-adjustment-note">{a.note}</span>
                  <span className={`tdp-adjustment-amount ${isPos ? 'tdp-adjustment-amount--pos' : 'tdp-adjustment-amount--neg'}`}>
                    <Money value={Math.abs(amount)} sign={isPos && amount > 0 ? '+' : '−'} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
      {page.confirmDialog}
    </div>
  );
}
