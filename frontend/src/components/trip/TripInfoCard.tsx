import React from 'react';
import { CardSection } from './CardSection';
import { RouteChips } from './RouteChips';
import type { SelectOption, RouteOption } from '../../hooks/useTripOptions';

interface TripInfoCardProps {
  customerId: string; onCustomerIdChange: (v: string) => void;
  routeId: string; onRouteIdChange: (v: string) => void;
  truckId: string; onTruckIdChange: (v: string) => void;
  trailerId: string; onTrailerIdChange: (v: string) => void;
  driverId: string; onDriverIdChange: (v: string) => void;
  cargoTypeId: string; onCargoTypeIdChange: (v: string) => void;
  departureDate: string; onDepartureDateChange: (v: string) => void;
  customerReference: string; onCustomerReferenceChange: (v: string) => void;
  customers: SelectOption[];
  routes: RouteOption[];
  trucks: SelectOption[];
  trailers: SelectOption[];
  drivers: SelectOption[];
  cargoTypes: SelectOption[];
  loading: boolean;
}

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function TripInfoCard(props: TripInfoCardProps) {
  const sel = (value: string, onChange: (v: string) => void, options: SelectOption[], placeholder: string) => (
    <select className="input" style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)} disabled={props.loading}>
      <option value="">{props.loading ? 'Đang tải...' : placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );

  return (
    <CardSection number={1} title="Thông tin chuyến đi" subtitle="Khách hàng, tuyến, hàng hóa và phương tiện" badge="required">
      <div className="tc-form-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Khách hàng" required>
            {sel(props.customerId, props.onCustomerIdChange, props.customers, 'Chọn khách hàng')}
          </Field>
          <Field label="Tuyến đường" required>
            {sel(props.routeId, props.onRouteIdChange, props.routes, 'Chọn tuyến đường')}
            <RouteChips routes={props.routes} onSelect={(id) => props.onRouteIdChange(String(id))} />
          </Field>
          <Field label="Loại hàng" required>
            {sel(props.cargoTypeId, props.onCargoTypeIdChange, props.cargoTypes, 'Chọn loại hàng')}
          </Field>
          <Field label="Mã tham chiếu khách hàng">
            <input className="input mono" type="text" placeholder="VD: PO-12345" value={props.customerReference} onChange={(e) => props.onCustomerReferenceChange(e.target.value)} maxLength={50} />
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>(không bắt buộc)</span>
          </Field>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Xe đầu" required>
            {sel(props.truckId, props.onTruckIdChange, props.trucks, 'Chọn xe đầu')}
          </Field>
          <Field label="Rơ moóc" required>
            {sel(props.trailerId, props.onTrailerIdChange, props.trailers, 'Chọn rơ moóc')}
          </Field>
          <Field label="Tài xế" required>
            {sel(props.driverId, props.onDriverIdChange, props.drivers, 'Chọn tài xế')}
          </Field>
          <Field label="Ngày khởi hành" required>
            <input className="input mono" type="date" value={props.departureDate} onChange={(e) => props.onDepartureDateChange(e.target.value)} required />
          </Field>
        </div>
      </div>
    </CardSection>
  );
}
