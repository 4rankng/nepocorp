import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { PageHeader } from '../components/UI';
import { FuelMode, LoadingType, TripStatus } from '@nepocorp/shared';
import type { TripDetail, TripLeg, PricingTable, PaginatedResponse } from '@nepocorp/shared';
import { calculateDistanceKm } from '../lib/maps';
import { TripLegFields } from '../components/TripForm/TripLegFields';
import { FuelConfigurator } from '../components/TripForm/FuelConfigurator';
import { AllowanceConfigurator } from '../components/TripForm/AllowanceConfigurator';
import { TotalsPanel } from '../components/TripForm/TotalsPanel';
import { PhotoUploader } from '../components/TripForm/PhotoUploader';


interface FormLeg {
  id: string; // client-side unique id for React keys
  sequence: number;
  origin: string;
  destination: string;
  km: string;
  loading_type: LoadingType;
}

export default function TripEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Form states
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

  // Load existing trip details
  const loadTrip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<TripDetail>(`/trips/${id}`);
      setTrip(data);

      // Pre-fill form fields
      setFuelMode(data.fuel_mode);
      setFuelLitersOverride(data.fuel_liters_override ? String(data.fuel_liters_override) : '');
      setFuelSupplementLiters(data.fuel_supplement_liters ? String(data.fuel_supplement_liters) : '');
      setFuelSupplementReason(data.fuel_supplement_reason || '');
      setTollsDiscount(data.tolls_discount ? String(data.tolls_discount) : '');
      setTollsAddition(data.tolls_addition ? String(data.tolls_addition) : '');
      setTollsStations(data.tolls_stations ? String(data.tolls_stations) : '');
      setHasReturnCargo(!!data.has_return_cargo);
      setDriverSalary(data.driver_salary ? String(data.driver_salary) : '');
      setRevenue(data.revenue ? String(data.revenue) : '');
      setNotes(data.notes || '');
      setPhotoUrls(data.photo_urls || []);

      // Lookup suggested price from pricing table
      if (data.customer_id && data.route_id) {
        try {
          const ptRes = await api.get<PaginatedResponse<PricingTable>>('/pricing-tables');
          const match = (ptRes.items || []).find(
            (pt: PricingTable) => pt.customer_id === data.customer_id && pt.route_id === data.route_id
          );
          if (match) {
            setSuggestedPrice(Number(match.price));
            if (!data.revenue) setRevenue(String(match.price));
          }
        } catch { /* pricing table lookup is best-effort */ }
      }

      // If legs are present, map them; otherwise, start with a blank leg
      if (data.legs && data.legs.length > 0) {
        setLegs(data.legs.map(leg => ({
          id: String(leg.id || Math.random()),
          sequence: leg.sequence,
          origin: leg.origin,
          destination: leg.destination,
          km: String(leg.km),
          loading_type: leg.loading_type,
        })));
      } else {
        // Build initial blank leg using route names if possible
        setLegs([{
          id: Math.random().toString(),
          sequence: 1,
          origin: data.route?.name.split('→')[0]?.trim() || '',
          destination: data.route?.name.split('→')[1]?.trim() || '',
          km: '',
          loading_type: LoadingType.HANG,
        }]);
      }
    } catch {
      setError('Không thể tải thông tin lệnh vận chuyển.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  // Add a leg
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
          loading_type: LoadingType.HANG,
        },
      ];
    });
  };

  // Remove a leg
  const handleRemoveLeg = (idx: number) => {
    setLegs(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      // Re-index sequences
      return filtered.map((leg, i) => ({
        ...leg,
        sequence: i + 1,
      }));
    });
  };

  // Update a leg field
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

  // Helper to map flat photo URL strings to typed photo objects
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

  // Direct photo uploader supporting specific photo type
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
      // Result returns `{ url: string, storageKey: string }`
      setPhotoUrls(prev => [...prev, result.url]);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };


  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    setError('');

    // Check legs presence
    if (legs.length === 0) {
      setError('Cần có ít nhất 1 chặng đường.');
      return;
    }

    // Check leg fields
    for (const leg of legs) {
      if (!leg.origin.trim() || !leg.destination.trim() || !leg.km || isNaN(Number(leg.km)) || Number(leg.km) <= 0) {
        setError(`Chặng số ${leg.sequence} thông tin chưa hợp lệ (Km phải là số lớn hơn 0).`);
        return;
      }
    }

    // Check supplement reason
    const supplementNum = Number(fuelSupplementLiters);
    if (supplementNum > 0 && !fuelSupplementReason.trim()) {
      setError('Vui lòng điền lý do bổ sung dầu.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        legs: legs.map(l => ({
          sequence: l.sequence,
          origin: l.origin.trim(),
          destination: l.destination.trim(),
          km: Number(l.km),
          loading_type: l.loading_type,
        })),
        version: trip.version,
        fuel_mode: fuelMode,
        fuel_liters_override: fuelMode === FuelMode.FLAT_RATE ? (fuelLitersOverride ? Number(fuelLitersOverride) : 0) : undefined,
        fuel_supplement_liters: fuelSupplementLiters ? Number(fuelSupplementLiters) : 0,
        fuel_supplement_reason: fuelSupplementReason.trim() || undefined,
        tolls_discount: tollsDiscount ? Number(tollsDiscount) : 0,
        tolls_addition: tollsAddition ? Number(tollsAddition) : 0,
        tolls_stations: tollsStations ? Number(tollsStations) : 0,
        has_return_cargo: hasReturnCargo,
        driver_salary: driverSalary ? Number(driverSalary) : 0,
        revenue: revenue ? Number(revenue) : undefined,
        notes: notes.trim() || undefined,
      };

      // Determine endpoint based on trip status
      // If CREATED, we hit /pre-departure. Otherwise (IN_TRANSIT / COMPLETED), we hit /actuals
      const endpoint = trip.status === TripStatus.CREATED ? `/trips/${trip.id}/pre-departure` : `/trips/${trip.id}/actuals`;
      await api.put(endpoint, payload);

      navigate(`/trips/${trip.id}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        if (window.confirm("Có người khác đã cập nhật chuyến này. Tải lại?")) {
          loadTrip();
        } else {
          setError("Xung đột phiên bản: số liệu của bạn đã cũ so với hệ thống.");
        }
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Có lỗi xảy ra khi lưu số liệu. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
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

  if (!trip) return null;

  return (
    <div className="fade-up">
      <PageHeader
        title="Cập nhật số liệu lệnh vận chuyển"
        description={`${trip.customer?.name ?? ''} · ${trip.route?.name ?? ''}`}
        onBack={() => navigate(`/trips/${trip.id}`)}
      />

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-soft)',
          color: 'var(--danger-text)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          marginBottom: 20,
          border: '1px solid rgba(220,38,38,0.12)',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row-2" style={{ alignItems: 'stretch' }}>
          {/* Left panel - Legs list */}
          <TripLegFields
            legs={legs}
            addLeg={handleAddLeg}
            removeLeg={handleRemoveLeg}
            updateLeg={handleUpdateLeg}
          />

          {/* Right panel - Financials / Fuel / Photos */}
          <div className="panel" style={{ padding: '20px 24px' }}>
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

            <PhotoUploader
              photos={mapUrlsToPhotos(photoUrls)}
              onPhotosChange={(updatedPhotos) => setPhotoUrls(updatedPhotos.map(p => p.url))}
              requiresPhotos={!!trip.cargoType?.requires_photos}
              uploading={uploading}
              onUpload={handlePhotoUpload}
            />

            <div className="field" style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>Ghi chú chuyến đi</label>
              <textarea
                className="input"
                style={{ minHeight: 80, resize: 'vertical', width: '100%' }}
                placeholder="Ghi chú chi tiết chuyến đi, các sự cố phát sinh..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Live estimates and totals panel under the form */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
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
            isMountainRoute={trip.route?.is_mountain}
            mountainFixedAllowance={trip.route?.fixed_fuel_allowance ? Number(trip.route.fixed_fuel_allowance) : null}
            roadAllowanceBase={Number(trip.road_allowance_base_applied || 0)}
          />
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || uploading}
          >
            {submitting ? (
              <><Loader2 size={16} className="spin" /> Đang lưu...</>
            ) : (
              <><Save size={16} /> Lưu cập nhật</>
            )}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate(`/trips/${trip.id}`)}
            disabled={submitting}
          >
            Hủy bỏ
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
