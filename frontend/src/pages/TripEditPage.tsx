import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Save, Trash2, Plus, Image as ImageIcon, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { PageHeader } from '../components/UI';
import { FuelMode, LoadingType, TripStatus } from '@nepocorp/shared';
import type { TripDetail, TripLeg, PricingTable, PaginatedResponse } from '@nepocorp/shared';

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
  const handleUpdateLeg = (idx: number, field: keyof FormLeg, value: string) => {
    setLegs(prev => prev.map((leg, i) => {
      if (i === idx) {
        return { ...leg, [field]: value };
      }
      return leg;
    }));
  };

  // Direct photo uploader
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('files', file);
    });

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
      setPhotoUrls(prev => [...prev, ...result.urls]);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  // Remove a photo url
  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== idx));
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
        photo_urls: photoUrls,
      };

      // Determine endpoint based on trip status
      // If CREATED, we hit /pre-departure. Otherwise (IN_TRANSIT / COMPLETED), we hit /actuals
      const endpoint = trip.status === TripStatus.CREATED ? `/trips/${trip.id}/pre-departure` : `/trips/${trip.id}/actuals`;
      await api.put(endpoint, payload);

      navigate(`/trips/${trip.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Có lỗi xảy ra khi lưu số liệu. Vui lòng thử lại.');
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
          <div className="panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="typo-eyebrow">Hành trình chi tiết (Chặng đường)</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleAddLeg}
                style={{ color: 'var(--brand)', fontWeight: 600 }}
              >
                <Plus size={14} /> Thêm chặng
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {legs.map((leg, idx) => (
                <div
                  key={leg.id}
                  style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                  }}
                >
                  {/* Row header: sequence badge + delete */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, color: 'var(--brand)',
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--brand-soft)', color: 'var(--brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>{leg.sequence}</span>
                      Chặng {leg.sequence}
                    </div>
                    {legs.length > 1 && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={() => handleRemoveLeg(idx)}
                        aria-label="Xóa chặng"
                      >
                        <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                      </button>
                    )}
                  </div>

                  {/* Origin → Destination row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      className="input"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      placeholder="Điểm đi"
                      value={leg.origin}
                      onChange={e => handleUpdateLeg(idx, 'origin', e.target.value)}
                      required
                    />
                    <span style={{ color: 'var(--fg-3)', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>→</span>
                    <input
                      className="input"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      placeholder="Điểm đến"
                      value={leg.destination}
                      onChange={e => handleUpdateLeg(idx, 'destination', e.target.value)}
                      required
                    />
                  </div>

                  {/* Km + Loading type row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cự ly (Km)</div>
                      <input
                        className="input"
                        type="number"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                        placeholder="Km"
                        value={leg.km}
                        onChange={e => handleUpdateLeg(idx, 'km', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tải trọng</div>
                      <select
                        className="input"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                        value={leg.loading_type}
                        onChange={e => handleUpdateLeg(idx, 'loading_type', e.target.value as LoadingType)}
                      >
                        <option value={LoadingType.HANG}>Có hàng</option>
                        <option value={LoadingType.VO}>Vỏ rỗng</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'var(--bg-1)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--fg-2)',
              border: '1px solid var(--border-2)',
            }}>
              <span>Tổng số chặng: <strong>{legs.length}</strong></span>
              <span>Tổng cự ly: <strong>{legs.reduce((acc, curr) => acc + (Number(curr.km) || 0), 0).toLocaleString('vi-VN')} Km</strong></span>
            </div>
          </div>

          {/* Right panel - Financials / Fuel / Photos */}
          <div className="panel" style={{ padding: '20px 24px' }}>
            {/* Fuel section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}><span className="typo-eyebrow">Định mức & Bổ sung dầu</span></div>

              <div className="field">
                <label>Chế độ dầu</label>
                <select
                  className="input"
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: 32,
                  }}
                  value={fuelMode}
                  onChange={e => setFuelMode(e.target.value as FuelMode)}
                >
                  <option value={FuelMode.AUTO}>Tự động (Định mức × Km chặng)</option>
                  <option value={FuelMode.FLAT_RATE}>Khoán (Nhập thủ công)</option>
                </select>
              </div>

              {fuelMode === FuelMode.FLAT_RATE && (
                <div className="field">
                  <label>Số lít dầu khoán (Thực tế áp dụng)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 55"
                    value={fuelLitersOverride}
                    onChange={e => setFuelLitersOverride(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="row-2">
                <div className="field">
                  <label>Số lít bổ sung (Bổ sung dầu)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 3"
                    value={fuelSupplementLiters}
                    onChange={e => setFuelSupplementLiters(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Lý do bổ sung {Number(fuelSupplementLiters) > 0 && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                  <input
                    className="input"
                    placeholder="VD: Chạy máy lạnh kéo dài"
                    value={fuelSupplementReason}
                    onChange={e => setFuelSupplementReason(e.target.value)}
                    required={Number(fuelSupplementLiters) > 0}
                  />
                </div>
              </div>
            </div>

            {/* Toll modifiers */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}><span className="typo-eyebrow">Chi phí đường bộ & Doanh thu</span></div>
              <div className="row-2">
                <div className="field">
                  <label>Tăng vé theo lệnh (VNĐ)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 150000"
                    value={tollsAddition}
                    onChange={e => setTollsAddition(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Giảm vé QL5 (VNĐ)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 40000"
                    value={tollsDiscount}
                    onChange={e => setTollsDiscount(e.target.value)}
                  />
                </div>
              </div>

              <div className="row-2" style={{ alignItems: 'center' }}>
                <div className="field">
                  <label>Số trạm thu phí (Trạm)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 4"
                    value={tollsStations}
                    onChange={e => setTollsStations(e.target.value)}
                  />
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={hasReturnCargo}
                      onChange={e => setHasReturnCargo(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--brand)', cursor: 'pointer' }}
                    />
                    <span>Chuyến về có hàng (+300k)</span>
                  </label>
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label>Lương sản lượng tài xế (VNĐ)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 850000"
                    value={driverSalary}
                    onChange={e => setDriverSalary(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Doanh thu chuyến (VNĐ)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="VD: 4200000"
                    value={revenue}
                    onChange={e => setRevenue(e.target.value)}
                  />
                  {suggestedPrice !== null && (
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                      Giá gợi ý từ bảng giá: {Number(suggestedPrice).toLocaleString('vi-VN')} VNĐ
                      {revenue && Number(revenue) !== suggestedPrice && (
                        <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                          Giá đã điều chỉnh so với bảng giá
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photos & Notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}><span className="typo-eyebrow">Xác thực chè & Ảnh đính kèm</span></div>

              {trip.cargoType?.requires_photos ? (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--warning-soft)',
                  color: 'var(--warning-text)',
                  border: '1px solid rgba(217,119,6,0.15)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  marginBottom: 12,
                  fontWeight: 500,
                }}>
                  ⚠️ Hàng chè yêu cầu đính kèm ảnh container và niêm phong (seal) để hoàn thành.
                </div>
              ) : null}

              {/* Upload button wrapper */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {photoUrls.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-1)',
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'var(--bg-3)',
                    }}
                  >
                    <img src={url} alt={`Preview ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 18,
                        height: 18,
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                <label
                  style={{
                    width: 72,
                    height: 72,
                    border: '1px dashed var(--fg-3)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploading ? 'default' : 'pointer',
                    color: 'var(--fg-3)',
                    transition: 'all 0.2s',
                    background: 'var(--bg-2)',
                  }}
                >
                  {uploading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <>
                      <ImageIcon size={18} />
                      <span style={{ fontSize: 9, marginTop: 4 }}>Tải ảnh</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="field">
                <label>Ghi chú chuyến đi</label>
                <textarea
                  className="input"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="Ghi chú chi tiết chuyến đi, các sự cố phát sinh..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
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
