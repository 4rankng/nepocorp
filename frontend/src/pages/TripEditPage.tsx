import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useConfirm } from '../components/UI';
import { Spinner } from '../components/shared/Spinner';
import { useTripDetail } from '../hooks/useQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { FuelMode, LoadingType, TripStatus } from '@nepocorp/shared';
import type { TripDetail, PricingTable, PaginatedResponse } from '@nepocorp/shared';
import { calculateDistanceKm } from '../lib/maps';
import { TripLegFields } from '../components/TripForm/TripLegFields';
import { FuelConfigurator } from '../components/TripForm/FuelConfigurator';
import { AllowanceConfigurator } from '../components/TripForm/AllowanceConfigurator';
import { TotalsPanel } from '../components/TripForm/TotalsPanel';
import { PhotoUploader } from '../components/TripForm/PhotoUploader';
import type { FormLeg } from '../hooks/useTripForm';


export default function TripEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { data: trip, isLoading: loading, refetch: refetchTrip } = useTripDetail(id);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const { data: catalogData } = useCatalogs();
  const [routeId, setRouteId] = useState('');
  const [legs, setLegs] = useState<FormLeg[]>([]);
  const [fuelMode, setFuelMode] = useState<FuelMode>(FuelMode.AUTO);
  const [fuelLitersOverride, setFuelLitersOverride] = useState('');
  const [fuelSupplementLiters, setFuelSupplementLiters] = useState('');
  const [fuelSupplementReason, setFuelSupplementReason] = useState('');
  const [tollsDiscount, setTollsDiscount] = useState('');
  const [tollsAddition, setTollsAddition] = useState('');
  const [tollsStations, setTollsStations] = useState('');
  const [hasReturnCargo, setHasReturnCargo] = useState(false);
  const [driverSalary, setDriverSalary] = useState('');
  const [revenue, setRevenue] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

  const lastTripId = useRef<number | null>(null);

  useEffect(() => {
    if (!trip) return;
    if (lastTripId.current === trip.id) return;
    lastTripId.current = trip.id;

    setRouteId(trip.routeId ? String(trip.routeId) : '');
    setFuelMode(trip.fuelMode);
    setFuelLitersOverride(trip.fuelLitersOverride ? String(trip.fuelLitersOverride) : '');
    setFuelSupplementLiters(trip.fuelSupplementLiters ? String(trip.fuelSupplementLiters) : '');
    setFuelSupplementReason(trip.fuelSupplementReason || '');
    setTollsDiscount(trip.tollsDiscount ? String(trip.tollsDiscount) : '');
    setTollsAddition(trip.tollsAddition ? String(trip.tollsAddition) : '');
    setTollsStations(trip.tollsStations ? String(trip.tollsStations) : '');
    setHasReturnCargo(!!trip.hasReturnCargo);
    setDriverSalary(trip.driverSalary ? String(trip.driverSalary) : '');
    setRevenue(trip.revenue ? String(trip.revenue) : '');
    setNotes(trip.notes || '');
    setPhotoUrls(trip.photoUrls || []);

    if (trip.customerId && trip.routeId) {
      (async () => {
        try {
          const ptRes = await api.get<PaginatedResponse<PricingTable>>('/pricing-tables');
          const match = (ptRes.items || []).find(
            (pt: PricingTable) => pt.customerId === trip.customerId && pt.routeId === trip.routeId
          );
          if (match) {
            setSuggestedPrice(Number(match.price));
            if (!trip.revenue) setRevenue(String(match.price));
          }
        } catch { /* pricing table lookup is best-effort */ }
      })();
    }

    if (trip.legs && trip.legs.length > 0) {
      setLegs(trip.legs.map((leg: any) => ({
        id: String(leg.id || Math.random()),
        sequence: leg.sequence,
        origin: leg.origin,
        destination: leg.destination,
        km: String(leg.km),
        loadingType: leg.loadingType,
      })));
    } else {
      // Route names come in two flavours from the seed:
      //   "Hà Nội → Hải Phòng" (canonical arrow) and
      //   "Hà Nội - Hải Phòng" (dash). Earlier we only split on "→", which
      //   meant the dash variant collapsed the whole name into `origin` and
      //   left `destination` empty — see BUG-T11 in QA notes. Try the arrow
      //   first, then fall back to a generous dash split.
      const parts = (trip.route?.name || '').split(/\s*[-→]\s*/).filter(Boolean);
      const originGuess = parts[0]?.trim() || '';
      const destGuess = parts.length > 1 ? parts[parts.length - 1].trim() : '';
      setLegs([{
        id: Math.random().toString(),
        sequence: 1,
        origin: originGuess,
        destination: destGuess,
        km: '',
        loadingType: LoadingType.HANG,
      }]);
    }
  }, [trip]);

  const handleAddLeg = () => {
    setLegs(prev => {
      const nextSequence = prev.length + 1;
      const lastLeg = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: Math.random().toString(),
          sequence: nextSequence,
          origin: lastLeg ? lastLeg.destination : '',
          destination: '',
          km: '',
          loadingType: LoadingType.HANG,
        },
      ];
    });
  };

  const handleRemoveLeg = (idx: number) => {
    setLegs(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((leg, i) => ({
        ...leg,
        sequence: i + 1,
      }));
    });
  };

  const handleUpdateLeg = async (idx: number, field: keyof FormLeg, value: string) => {
    setLegs(prev => prev.map((leg, i) => {
      if (i === idx) {
        return { ...leg, [field]: value };
      }
      return leg;
    }));

    if (field === 'origin' || field === 'destination') {
      const currentLeg = legs[idx];
      const origin = field === 'origin' ? value : currentLeg.origin;
      const destination = field === 'destination' ? value : currentLeg.destination;

      if (origin && destination) {
        const km = await calculateDistanceKm(origin, destination);
        if (km !== null) {
          setLegs(prev => prev.map((leg, i) => {
            if (i === idx) {
              return { ...leg, km: String(km) };
            }
            return leg;
          }));
        }
      }
    }
  };

  const mapUrlsToPhotos = (urls: string[]) => {
    return urls.map(url => {
      let type: 'CONTAINER' | 'SEAL' | 'OTHER' = 'OTHER';
      const decoded = decodeURIComponent(url.toLowerCase());
      if (decoded.includes('/container-') || decoded.includes('%2fcontainer-')) {
        type = 'CONTAINER';
      } else if (decoded.includes('/seal-') || decoded.includes('%2fseal-')) {
        type = 'SEAL';
      }
      return { url, type };
    });
  };

  const handlePhotoUpload = async (files: FileList, type: 'CONTAINER' | 'SEAL' | 'OTHER') => {
    if (!files || files.length === 0 || !trip) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('trip_id', String(trip.id));
    formData.append('type', type);

    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lỗi tải ảnh lên');
      }

      const result = await response.json();
      setPhotoUrls(prev => [...prev, result.url]);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    setError('');

    if (legs.length === 0) {
      setError('Cần có ít nhất 1 chặng đường.');
      return;
    }

    for (const leg of legs) {
      if (!leg.origin.trim() || !leg.destination.trim() || !leg.km || isNaN(Number(leg.km)) || Number(leg.km) <= 0) {
        setError(`Chặng số ${leg.sequence} thông tin chưa hợp lệ (Km phải là số lớn hơn 0).`);
        return;
      }
    }

    const supplementNum = Number(fuelSupplementLiters);
    if (supplementNum > 0 && !fuelSupplementReason.trim()) {
      setError('Vui lòng điền lý do bổ sung dầu.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        routeId: routeId ? Number(routeId) : undefined,
        legs: legs.map(l => ({
          sequence: l.sequence,
          origin: l.origin.trim(),
          destination: l.destination.trim(),
          km: Number(l.km),
          loadingType: l.loadingType,
        })),
        version: trip.version,
        fuelMode: fuelMode,
        fuelLitersOverride: fuelMode === FuelMode.FLAT_RATE ? (fuelLitersOverride ? Number(fuelLitersOverride) : 0) : undefined,
        fuelSupplementLiters: fuelSupplementLiters ? Number(fuelSupplementLiters) : 0,
        fuelSupplementReason: fuelSupplementReason.trim() || undefined,
        tollsDiscount: tollsDiscount ? Number(tollsDiscount) : 0,
        tollsAddition: tollsAddition ? Number(tollsAddition) : 0,
        tollsStations: tollsStations ? Number(tollsStations) : 0,
        hasReturnCargo: hasReturnCargo,
        driverSalary: driverSalary ? Number(driverSalary) : 0,
        revenue: revenue ? Number(revenue) : undefined,
        notes: notes.trim() || undefined,
      };

      const endpoint = trip.status === TripStatus.CREATED ? `/trips/${trip.id}/pre-departure` : `/trips/${trip.id}/actuals`;
      await api.put(endpoint, payload);

      navigate(`/trips/${trip.id}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        if (await confirm("Có người khác đã cập nhật chuyến này. Tải lại?")) {
          refetchTrip();
        } else {
          setError("Xung đột phiên bản: số liệu của bạn đã cũ so với hệ thống.");
        }
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra khi lưu số liệu. Vui lòng thử lại.");
      }
      // Page is long enough that the error banner above the form is
      // easy to miss after scrolling. Pop the user back to the top so
      // the banner is visible (previously the form just looked dead).
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
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

  if (!trip) return null;

  return (
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

      {error && (
        <div style={{
          margin: '0 28px 8px',
          padding: '12px 16px',
          background: 'var(--danger-soft)',
          color: 'var(--danger-text)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          border: '1px solid rgba(220,38,38,0.12)',
        }}>
          {error}
        </div>
      )}

      <form id="trip-edit-form" onSubmit={handleSubmit}>
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

                <TripLegFields
                  legs={legs}
                  addLeg={handleAddLeg}
                  removeLeg={handleRemoveLeg}
                  updateLeg={handleUpdateLeg}
                />
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
                <FuelConfigurator
                  fuelMode={fuelMode}
                  onFuelModeChange={setFuelMode}
                  fuelLitersOverride={fuelLitersOverride}
                  onFuelLitersOverrideChange={setFuelLitersOverride}
                  fuelSupplementLiters={fuelSupplementLiters}
                  onFuelSupplementLitersChange={setFuelSupplementLiters}
                  fuelSupplementReason={fuelSupplementReason}
                  onFuelSupplementReasonChange={setFuelSupplementReason}
                />
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
                <AllowanceConfigurator
                  tollsDiscount={tollsDiscount}
                  onTollsDiscountChange={setTollsDiscount}
                  tollsAddition={tollsAddition}
                  onTollsAdditionChange={setTollsAddition}
                  tollsStations={tollsStations}
                  onTollsStationsChange={setTollsStations}
                  hasReturnCargo={hasReturnCargo}
                  onHasReturnCargoChange={setHasReturnCargo}
                  driverSalary={driverSalary}
                  onDriverSalaryChange={setDriverSalary}
                  revenue={revenue}
                  onRevenueChange={setRevenue}
                  suggestedPrice={suggestedPrice}
                />
              </div>
            </div>

            <div className="tc-card">
              <div className="tc-card-head">
                <div className="tc-card-num">4</div>
                <div className="tc-card-text">
                  <div className="tc-card-title">Ảnh & Ghi chú</div>
                  <div className="tc-card-sub">Ảnh cont, seal và ghi chú</div>
                </div>
              </div>
              <div className="tc-card-body">
                <PhotoUploader
                  photos={mapUrlsToPhotos(photoUrls)}
                  onPhotosChange={(updatedPhotos) => setPhotoUrls(updatedPhotos.map(p => p.url))}
                  requiresPhotos={!!trip.cargoType?.requiresPhotos}
                  uploading={uploading}
                  onUpload={handlePhotoUpload}
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
          </div>

          <aside className="tc-rail">
            <TotalsPanel
              legs={legs}
              fuelMode={fuelMode}
              fuelLitersOverride={fuelLitersOverride}
              fuelSupplementLiters={fuelSupplementLiters}
              tollsDiscount={tollsDiscount}
              tollsAddition={tollsAddition}
              tollsStations={tollsStations}
              hasReturnCargo={hasReturnCargo}
              driverSalary={driverSalary}
              revenue={revenue}
              isMountainRoute={trip.route?.isMountain}
              mountainFixedAllowance={trip.route?.fixedFuelAllowance ? Number(trip.route.fixedFuelAllowance) : null}
              roadAllowanceBase={Number(trip.roadAllowanceBaseApplied || 0)}
            />
          </aside>
        </div>
      </form>

      <div className="tc-action-bar">
        <div className="tc-action-bar__status">
          <div className="tc-action-bar__status-icon">
            <Save size={16} />
          </div>
          <div>
            <div className="tc-action-bar__status-main">Cập nhật số liệu</div>
            <div className="tc-action-bar__status-sub">Lệnh vận chuyển #{trip.id}</div>
          </div>
        </div>
        <div className="tc-action-bar__spacer" />
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => navigate(`/trips/${trip.id}`)}
          disabled={submitting}
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          form="trip-edit-form"
          className="btn btn--primary"
          disabled={submitting || uploading}
        >
          {submitting ? (
            <><Loader2 size={16} className="spin" /> Đang lưu…</>
          ) : (
            <><Save size={16} /> Lưu cập nhật</>
          )}
        </button>
      </div>

      {confirmDialog}
    </div>
  );
}
