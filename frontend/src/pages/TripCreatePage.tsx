import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Customer, Route, Truck, Trailer, Driver, CargoType } from '@nepocorp/shared';

interface SelectOption {
  id: number;
  label: string;
}

export default function TripCreatePage() {
  const navigate = useNavigate();

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [cargoTypeId, setCargoTypeId] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [customerReference, setCustomerReference] = useState('');

  // Dropdown options
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [routes, setRoutes] = useState<SelectOption[]>([]);
  const [trucks, setTrucks] = useState<SelectOption[]>([]);
  const [trailers, setTrailers] = useState<SelectOption[]>([]);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [cargoTypes, setCargoTypes] = useState<SelectOption[]>([]);

  // Loading / error state
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [custRes, routeRes, truckRes, trailerRes, driverRes, cargoRes] = await Promise.all([
        api.get<Customer[]>('/customers'),
        api.get<Route[]>('/routes'),
        api.get<Truck[]>('/trucks'),
        api.get<Trailer[]>('/trailers'),
        api.get<Driver[]>('/drivers'),
        api.get<CargoType[]>('/cargo-types'),
      ]);

      setCustomers(custRes.map(c => ({ id: c.id, label: c.name })));
      setRoutes(routeRes.map(r => ({ id: r.id, label: `${r.name}${r.distance_km ? ` (${r.distance_km} km)` : ''}` })));
      setTrucks(truckRes.map(t => ({ id: t.id, label: t.license_plate })));
      setTrailers(trailerRes.map(t => ({ id: t.id, label: `${t.license_plate} (${t.type})` })));
      setDrivers(driverRes.map(d => ({ id: d.id, label: d.name })));
      setCargoTypes(cargoRes.map(c => ({ id: c.id, label: c.name })));
    } catch {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId || !routeId || !truckId || !trailerId || !driverId || !cargoTypeId || !departureDate) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        customer_id: Number(customerId),
        route_id: Number(routeId),
        truck_id: Number(truckId),
        trailer_id: Number(trailerId),
        driver_id: Number(driverId),
        cargo_type_id: Number(cargoTypeId),
        departure_date: departureDate,
      };
      if (customerReference.trim()) {
        body.customer_reference = customerReference.trim();
      }
      const trip = await api.post<{ id: number }>('/trips', body);
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectCls: React.CSSProperties = {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 32,
  };

  const renderSelect = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: SelectOption[],
    placeholder: string,
    required = true,
  ) => (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      <select
        id={id}
        className="input"
        style={selectCls}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={loadingOptions}
      >
        <option value="">{loadingOptions ? 'Đang tải...' : placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => navigate('/trips')}
              aria-label="Quay lại"
            >
              <ArrowLeft size={16} />
            </button>
            Tạo lệnh vận chuyển mới
          </h1>
          <p style={{ marginLeft: 46 }}>Nhập thông tin để tạo lệnh vận chuyển</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row-2">
          {/* Left column */}
          <div className="card-shell" style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <span className="typo-eyebrow">Thông tin chính</span>
            </div>
            {renderSelect('customer', 'Khach hang', customerId, setCustomerId, customers, 'Chọn khách hàng')}
            {renderSelect('route', 'Tuyen duong', routeId, setRouteId, routes, 'Chọn tuyến đường')}
            {renderSelect('cargo-type', 'Loại hàng', cargoTypeId, setCargoTypeId, cargoTypes, 'Chọn loại hàng')}

            <div className="field">
              <label htmlFor="customer-ref">
                Mã tham chiếu khách hàng
                <span style={{ color: 'var(--fg-3)', fontWeight: 400, marginLeft: 6 }}>(không bắt buộc)</span>
              </label>
              <input
                id="customer-ref"
                className="input"
                value={customerReference}
                onChange={e => setCustomerReference(e.target.value)}
                placeholder="VD: PO-12345"
                maxLength={50}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="card-shell" style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <span className="typo-eyebrow">Phương tiện & tài xế</span>
            </div>
            {renderSelect('truck', 'Xe đầu', truckId, setTruckId, trucks, 'Chọn xe đầu')}
            {renderSelect('trailer', 'Rơ moóc', trailerId, setTrailerId, trailers, 'Chọn rơ moóc')}
            {renderSelect('driver', 'Tai xe', driverId, setDriverId, drivers, 'Chọn tài xế')}

            <div className="field">
              <label htmlFor="departure-date">
                Ngày khởi hành
                <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>
              </label>
              <input
                id="departure-date"
                type="date"
                className="input"
                value={departureDate}
                onChange={e => setDepartureDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--danger-soft)',
            color: 'var(--danger-text)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            marginBottom: 16,
            border: '1px solid rgba(220,38,38,0.12)',
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting || loadingOptions}
          >
            {submitting
              ? <><Loader2 size={16} className="spin" /> Đang tạo...</>
              : <><Save size={16} /> Tao lenh</>
            }
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/trips')}
            disabled={submitting}
          >
            Huy
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
