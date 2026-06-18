import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { ApiError } from '../lib/api';
import { TripStatus, TRIP_STATUS_LABELS } from '@tingting/shared';
import { useConfirm } from '../components/UI';
import { Spinner } from '../components/shared/Spinner';
import { useTripDetail } from '../hooks/useQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { useTripForm } from '../hooks/useTripForm';
import { isAnyUploading } from '../hooks/useTripFormPhotos';
import { TripFormProvider } from '../hooks/useTripFormContext';
import { FuelSection } from '../components/trip/FuelSection';
import { AllowanceSection } from '../components/trip/AllowanceSection';
import { TotalsPanel } from '../components/trip/TotalsPanel';
import { PhotoUploader } from '../components/trip/PhotoUploader';
import { JourneyLegsCard } from '../components/trip/JourneyLegsCard';
import { ContainerInstancesCard } from '../components/trip/ContainerInstancesCard';
import { AncillaryFeesCard } from '../components/trip/AncillaryFeesCard';
import { TripInstructionsCard } from '../components/trip/TripInstructionsCard';
import { usePageAnimations } from '../hooks/animations';
import type { TripOptions } from '../hooks/useTripOptions';
import './TripForm.css';
import './TripEditPage.css';

export default function TripEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data: trip, isLoading: loading, refetch: refetchTrip } = useTripDetail(id);
  const { data: catalogData } = useCatalogs();
  const { rootRef } = usePageAnimations({ ready: !loading });

  const editOptions: TripOptions = useMemo(() => ({
    customers: [],
    carrierCustomers: [],
    routes: catalogData?.routes.map(r => ({
      id: r.id,
      label: `${r.name}${r.distanceKm ? ` (${r.distanceKm} km)` : ''}`,
      name: r.name,
      distanceKm: r.distanceKm ?? undefined,
      isMountain: r.isMountain,
      fixedFuelAllowance: r.fixedFuelAllowance,
    })) ?? [],
    trucks: [],
    trailerTypes: [],
    drivers: [],
    trailers: [],
    cargoTypes: [],
    pricingTables: [],
    loading: false,
  }), [catalogData]);

  const form = useTripForm({ options: editOptions, mode: 'edit', existingTrip: trip });
  const { error, submitting, uploading, handleSubmit, routeId, setRouteId, notes, setNotes, departureDate, setDepartureDate, completedAt, setCompletedAt } = form;

  const onSubmit = async (e: React.FormEvent) => {
    try {
      const result = await handleSubmit(e);
      if (result !== undefined) {
        navigate(`/trips/${result}`);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        if (await confirm("Có người khác đã cập nhật chuyến này. Tải lại?")) {
          await refetchTrip();
          form.resetForm?.();
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Bounce the user off the edit page if the trip can't actually be edited
  // (LOCKED or CANCELED). Without this guard the form lets you fill in
  // everything and only fails at submit time with "Chuyến đi đã chốt hoặc đã
  // hủy, không thể sửa" — confusing because the page looked editable.
  useEffect(() => {
    if (trip && (trip.status === TripStatus.LOCKED || trip.status === TripStatus.CANCELED)) {
      navigate(`/trips/${trip.id}`, { replace: true });
    }
  }, [trip, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
        <Spinner size={20} />
        <span style={{ fontSize: 14 }}>Đang tải dữ liệu…</span>
      </div>
    );
  }

  if (!trip) return null;
  if (trip.status === TripStatus.LOCKED || trip.status === TripStatus.CANCELED) {
    // useEffect above will redirect; render nothing in the meantime to avoid a flash.
    return null;
  }

  return (
    <TripFormProvider form={form}>
      <div ref={rootRef}>
        <header className="tc-page-head">
          <button className="tc-back-btn" onClick={() => navigate(`/trips/${trip.id}`)} aria-label="Quay lại">
            <ArrowLeft size={18} />
          </button>
          <div className="tc-title-wrap">
            <h1 className="tc-page-title">
              {trip.tripCode || 'Cập nhật số liệu'}
              <span
                className={`tc-status-pill tc-status-pill--${trip.status === TripStatus.IN_TRANSIT ? 'in-transit' : trip.status === TripStatus.COMPLETED ? 'completed' : 'draft'}`}
                aria-label={`Trạng thái: ${trip.status}`}
              >
                {TRIP_STATUS_LABELS[trip.status]}
              </span>
            </h1>
            <p className="tc-page-sub">{trip.customer?.name ?? ''} · {trip.route?.name ?? ''}</p>
          </div>
        </header>

        <form id="trip-edit-form" onSubmit={onSubmit}>
          <div className="tc-content">
            <div className="tc-bento">
              <section className="tc-card tc-card--span-1">
                <div className="tc-card-head">
                  <div className="tc-card-num">1</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Tuyến đường &amp; ngày</div>
                    <div className="tc-card-sub">Thời gian và tuyến vận chuyển</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <div className="tc-field-row tc-field-row--2">
                    <div className="tc-field">
                      <label className="tc-field-label">Ngày khởi hành</label>
                      <input
                        className="input"
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        required
                      />
                    </div>
                    {(trip.status === TripStatus.IN_TRANSIT || trip.status === TripStatus.COMPLETED) && (
                      <div className="tc-field">
                        <label className="tc-field-label">Ngày hoàn thành</label>
                        <input
                          className="input"
                          type="date"
                          value={completedAt}
                          onChange={(e) => setCompletedAt(e.target.value)}
                          max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                        />
                        <div className="tc-field-hint">Để trống nếu chưa hoàn thành</div>
                      </div>
                    )}
                  </div>
                  <div className="tc-field">
                    <label className="tc-field-label">Tuyến đường</label>
                    <select
                      className="input"
                      value={routeId}
                      onChange={(e) => setRouteId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn tuyến đường --</option>
                      {catalogData?.routes.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <JourneyLegsCard number={2} />

              <section className="tc-card tc-card--span-1">
                <div className="tc-card-head">
                  <div className="tc-card-num">3</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Nhiên liệu</div>
                    <div className="tc-card-sub">Chế độ tính và bổ sung</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <FuelSection />
                </div>
              </section>

              <section className="tc-card tc-card--span-1">
                <div className="tc-card-head">
                  <div className="tc-card-num">4</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Chi phí &amp; Doanh thu</div>
                    <div className="tc-card-sub">VéBOT, phụ cấp, lương lái xe</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <AllowanceSection />
                </div>
              </section>

              <section className="tc-card tc-card--span-2">
                <div className="tc-card-head">
                  <div className="tc-card-num">5</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Chi tiết container</div>
                    <div className="tc-card-sub">Số container, số seal, loại cont, trọng lượng — nhập tay từng cont</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <ContainerInstancesCard
                    tripId={trip.id}
                    expectedCount={trip.containerCount ?? 1}
                    requiresPhotos={!!trip.cargoType?.requiresPhotos}
                  />
                </div>
              </section>

              <section className="tc-card tc-card--span-1">
                <div className="tc-card-head">
                  <div className="tc-card-num">6</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Ảnh &amp; Ghi chú</div>
                    <div className="tc-card-sub">Ảnh đính kèm &amp; ghi chú chuyến</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <PhotoUploader tripId={trip.id} />
                  <div className="tc-field">
                    <label className="tc-field-label">Ghi chú chuyến đi</label>
                    <textarea
                      className="input tc-textarea"
                      placeholder="Ghi chú chi tiết chuyến đi, các sự cố phát sinh…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="tc-card tc-card--span-2">
                <div className="tc-card-head">
                  <div className="tc-card-num">7</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Chi phí dịch vụ đi kèm</div>
                    <div className="tc-card-sub">Phí nâng/hạ, hải quan, cân hàng, kiểm hóa…</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <AncillaryFeesCard tripId={trip.id} />
                </div>
              </section>

              <section className="tc-card tc-card--span-2">
                <div className="tc-card-head">
                  <div className="tc-card-num">8</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Liên hệ &amp; hướng dẫn</div>
                    <div className="tc-card-sub">Thông tin liên hệ và dặn dò cho lái xe (N2)</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <TripInstructionsCard />
                </div>
              </section>
            </div>

            <aside className="tc-rail">
              <TotalsPanel />

              <div className="tc-rail-actions desktop-only">
                {error ? (
                  <div role="alert" className="tc-rail-error">
                    <div className="tc-rail-error-title">Không lưu được</div>
                    <div>{error}</div>
                  </div>
                ) : (
                  <div className="tc-rail-notice">
                    <div className="tc-rail-notice-title">Cập nhật số liệu</div>
                    <div>Lệnh vận chuyển {trip.tripCode || 'Lệnh vận chuyển'}</div>
                  </div>
                )}

                <button
                  type="submit"
                  form="trip-edit-form"
                  className="btn btn--primary tc-rail-btn tc-rail-btn--primary"
                  disabled={submitting || isAnyUploading(uploading)}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="spin" /> Đang lưu…</>
                  ) : (
                    <><Save size={16} /> Lưu cập nhật</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary tc-rail-btn tc-rail-btn--secondary"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
              </div>
            </aside>
          </div>
        </form>

        {confirmDialog}

        <div className="tc-edit-mobile-bar">
          <button
            type="button"
            className="btn btn--secondary tc-mobile-btn"
            onClick={() => navigate(`/trips/${trip.id}`)}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="trip-edit-form"
            className="btn btn--primary tc-mobile-btn tc-mobile-btn--primary"
            disabled={submitting || isAnyUploading(uploading)}
          >
            {submitting ? <><Loader2 size={16} className="spin" /> Đang lưu…</> : <><Save size={16} /> Lưu</>}
          </button>
        </div>
      </div>
    </TripFormProvider>
  );
}
