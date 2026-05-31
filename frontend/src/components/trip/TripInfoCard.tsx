import React from 'react';
import { CardSection } from './CardSection';
import { RouteChips } from './RouteChips';
import type { SelectOption, RouteOption, TrailerTypeOption } from '../../hooks/useTripOptions';
import { useTripFormContext } from '../../hooks/useTripFormContext';

interface TripInfoCardProps {
  customers: SelectOption[];
  routes: RouteOption[];
  trucks: SelectOption[];
  trailerTypes: TrailerTypeOption[];
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
  const form = useTripFormContext();

  const sel = (value: string, onChange: (v: string) => void, options: SelectOption[], placeholder: string) => (
    <select className="input" style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)} disabled={props.loading}>
      <option value="">{props.loading ? 'Đang tải...' : placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );

  const selStatic = (value: string, onChange: (v: string) => void, options: TrailerTypeOption[], placeholder: string) => (
    <select className="input" style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)} disabled={props.loading}>
      <option value="">{props.loading ? 'Đang tải...' : placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <CardSection number={1} title="Thông tin chuyến đi" subtitle="Khách hàng, tuyến, hàng hóa và phương tiện" badge="required">
      <div className="tc-form-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Khách hàng" required>
            {sel(form.customerId, form.setCustomerId, props.customers, 'Chọn khách hàng')}
          </Field>
          <Field label="Tuyến đường" required>
            {sel(form.routeId, form.setRouteId, props.routes, 'Chọn tuyến đường')}
            <RouteChips routes={props.routes} onSelect={(id) => form.setRouteId(String(id))} />
          </Field>
          <Field label="Loại hàng" required>
            {sel(form.cargoTypeId, form.setCargoTypeId, props.cargoTypes, 'Chọn loại hàng')}
          </Field>
          <Field label="Mã tham chiếu khách hàng">
            <input className="input mono" type="text" placeholder="VD: PO-12345" value={form.customerReference} onChange={(e) => form.setCustomerReference(e.target.value)} maxLength={50} />
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>(không bắt buộc)</span>
          </Field>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Xe đầu" required>
            {sel(form.truckId, form.setTruckId, props.trucks, 'Chọn xe đầu')}
          </Field>
          <Field label="Loại rơ moóc" required>
            {selStatic(form.trailerType, form.setTrailerType, props.trailerTypes, 'Chọn loại rơ moóc')}
          </Field>
          <Field label="Tài xế" required>
            {sel(form.driverId, form.setDriverId, props.drivers, 'Chọn tài xế')}
          </Field>
          <Field label="Ngày khởi hành" required>
            <input className="input mono" type="date" value={form.departureDate} onChange={(e) => form.setDepartureDate(e.target.value)} required />
          </Field>
        </div>
      </div>
    </CardSection>
  );
}
