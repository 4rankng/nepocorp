import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { ApiError } from '../lib/api';
import { TripStatus } from '@nepocorp/shared';
import { useConfirm } from '../components/UI';
import { Spinner } from '../components/shared/Spinner';
import { useTripDetail } from '../hooks/useQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { useTripForm } from '../hooks/useTripForm';
import { TripFormProvider } from '../hooks/useTripFormContext';
import { FuelSection } from '../components/trip/FuelSection';
import { AllowanceSection } from '../components/trip/AllowanceSection';
import { TotalsPanel } from '../components/trip/TotalsPanel';
import { PhotoUploader } from '../components/trip/PhotoUploader';
import { JourneyLegsCard } from '../components/trip/JourneyLegsCard';
import { ContainerInstancesCard } from '../components/trip/ContainerInstancesCard';
import { AncillaryFeesCard } from '../components/trip/AncillaryFeesCard';
import type { TripOptions } from '../hooks/useTripOptions';

export default function TripEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { data: trip, isLoading: loading, refetch: refetchTrip } = useTripDetail(id);
  const { data: catalogData } = useCatalogs();

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
  const { error, setError, submitting, uploading, handleSubmit, routeId, setRouteId, notes, setNotes, tripId: formTripId, isEditMode } = form;

  const onSubmit = async (e: React.FormEvent) => {
    try {
      const result = await handleSubmit(e);
      if (result !== undefined) {
        navigate(`/trips/${result}`);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        if (await confirm("Có người khác đã cập nhật chuyến này. Tải lại?")) {
          refetchTrip();
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
      <div className="fade-up">
        <header className="tc-page-head">
          <button className="tc-back-btn" onClick={() => navigate(`/trips/${trip.id}`)} aria-label="Quay lại">
            <ArrowLeft size={18} />
          </button>
          <div className="tc-title-wrap">
            <h1 className="tc-page-title">Cập nhật số liệu</h1>
            <p className="tc-page-sub">{trip.customer?.name ?? ''} · {trip.route?.name ?? ''}</p>
          </div>
        </header>

        <form id="trip-edit-form" onSubmit={onSubmit}>
          <div className="tc-content">
            <div className="tc-form-col">
              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-num">1</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Hành trình</div>
                    <div className="tc-card-sub">Thông tin chặng đường</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Số cont:</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{trip.containerCount ?? 1}</span>
                    {(trip.containerCount ?? 1) > 1 && (
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>({trip.containerCount ?? 1} cont × đơn giá)</span>
                    )}
                  </div>

                  <div className="field" style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Tuyến đường</label>
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

                  {/*
                    Embedded as a sub-card inside section 1 "Hành trình".
                    Pass number={null} so the JourneyLegsCard doesn't render
                    its own "2" badge — the outer card already owns the
                    section number for this page (and the next sibling card
                    is also "2", which was confusing users).
                  */}
                  <JourneyLegsCard number={null} />
                </div>
              </div>

              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-num">2</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Nhiên liệu</div>
                    <div className="tc-card-sub">Chế độ tính và bổ sung</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <FuelSection />
                </div>
              </div>

              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-num">3</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Chi phí & Doanh thu</div>
                    <div className="tc-card-sub">VéBOT, phụ cấp, lương tài xế</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <AllowanceSection />
                </div>
              </div>

              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-num">4</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Chi tiết container</div>
                    <div className="tc-card-sub">Số container, số seal, loại cont, trọng lượng — nhập tay từng cont</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <ContainerInstancesCard
                    tripId={trip.id}
                    expectedCount={trip.containerCount ?? 1}
                  />
                </div>
              </div>

              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-num">5</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Ảnh & Ghi chú</div>
                    <div className="tc-card-sub">Ảnh cont, seal và ghi chú</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <PhotoUploader
                    requiresPhotos={!!trip.cargoType?.requiresPhotos}
                    tripId={trip.id}
                  />
                  <div className="field" style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>Ghi chú chuyến đi</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 80, resize: 'vertical', width: '100%' }}
                      placeholder="Ghi chú chi tiết chuyến đi, các sự cố phát sinh…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="tc-card">
                <div className="tc-card-head">
                  <div className="tc-card-num">6</div>
                  <div className="tc-card-text">
                    <div className="tc-card-title">Chi phí dịch vụ đi kèm</div>
                    <div className="tc-card-sub">Phí nâng/hạ, hải quan, cân hàng, kiểm hóa…</div>
                  </div>
                </div>
                <div className="tc-card-body">
                  <AncillaryFeesCard tripId={trip.id} />
                </div>
              </div>
            </div>

            <aside className="tc-rail">
              <TotalsPanel />

              <div
                className="tc-rail-actions desktop-only"
                style={{
                  marginTop: 12,
                  padding: 14,
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {error ? (
                  <div
                    role="alert"
                    style={{
                      padding: '10px 12px',
                      background: 'var(--danger-soft)',
                      borderRadius: 8,
                      color: 'var(--danger)',
                      fontSize: 12.5,
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Không lưu được</div>
                    <div>{error}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg-2)' }}>Cập nhật số liệu</div>
                    <div>Lệnh vận chuyển {trip.tripCode || 'Lệnh vận chuyển'}</div>
                  </div>
                )}

                <button
                  type="submit"
                  form="trip-edit-form"
                  className="btn btn--primary"
                  disabled={submitting || uploading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="spin" /> Đang lưu…</>
                  ) : (
                    <><Save size={16} /> Lưu cập nhật</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  disabled={submitting}
                  style={{ width: '100%', justifyContent: 'center' }}
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
            className="btn btn--secondary"
            onClick={() => navigate(`/trips/${trip.id}`)}
            disabled={submitting}
            style={{ flex: 1, justifyContent: 'center', minHeight: 44 }}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="trip-edit-form"
            className="btn btn--primary"
            disabled={submitting || uploading}
            style={{ flex: 2, justifyContent: 'center', minHeight: 44 }}
          >
            {submitting ? <><Loader2 size={16} className="spin" /> Đang lưu…</> : <><Save size={16} /> Lưu</>}
          </button>
        </div>
      </div>
    </TripFormProvider>
  );
}
