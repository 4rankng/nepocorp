import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Customer, Route, Truck, Trailer, Driver, CargoType } from '@nepocorp/shared';
import { PageHeader, Panel } from '../components/UI';

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
        api.get<any>('/customers'),
        api.get<any>('/routes'),
        api.get<any>('/trucks'),
        api.get<any>('/trailers'),
        api.get<any>('/drivers'),
        api.get<any>('/cargo-types'),
      ]);

      const unwrap = (d: any) => Array.isArray(d) ? d : (d.items ?? []);
      setCustomers(unwrap(custRes).map((c: any) => ({ id: c.id, label: c.name })));
      setRoutes(unwrap(routeRes).map((r: any) => ({ id: r.id, label: `${r.name}${r.distance_km ? ` (${r.distance_km} km)` : ''}` })));
      setTrucks(unwrap(truckRes).map((t: any) => ({ id: t.id, label: t.license_plate })));
      setTrailers(unwrap(trailerRes).map((t: any) => ({ id: t.id, label: `${t.license_plate} (${t.type})` })));
      setDrivers(unwrap(driverRes).map((d: any) => ({ id: d.id, label: d.name })));
      setCargoTypes(unwrap(cargoRes).map((c: any) => ({ id: c.id, label: c.name })));
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
      <PageHeader
        title="Tạo lệnh vận chuyển mới"
        description="Nhập thông tin để tạo lệnh vận chuyển"
        onBack={() => navigate('/trips')}
      />

      <form onSubmit={handleSubmit}>
        <div className="row-2">
          {/* Left column */}
          <Panel title="Thông tin chính">
            {renderSelect('customer', 'Khách hàng', customerId, setCustomerId, customers, 'Chọn khách hàng')}
            {renderSelect('route', 'Tuyến đường', routeId, setRouteId, routes, 'Chọn tuyến đường')}
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
          </Panel>

          {/* Right column */}
          <Panel title="Phương tiện & tài xế">
            {renderSelect('truck', 'Xe đầu', truckId, setTruckId, trucks, 'Chọn xe đầu')}
            {renderSelect('trailer', 'Rơ moóc', trailerId, setTrailerId, trailers, 'Chọn rơ moóc')}
            {renderSelect('driver', 'Tài xế', driverId, setDriverId, drivers, 'Chọn tài xế')}

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
          </Panel>
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
            className="btn btn--primary"
            disabled={submitting || loadingOptions}
          >
            {submitting
              ? <><Loader2 size={16} className="spin" /> Đang tạo...</>
              : <><Save size={16} /> Tạo lệnh</>
            }
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate('/trips')}
            disabled={submitting}
          >
            Huỷ
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
