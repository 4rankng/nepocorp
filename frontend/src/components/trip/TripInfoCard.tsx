import React from 'react';
import { CardSection } from './CardSection';
import { RouteChips } from './RouteChips';
import type { SelectOption, RouteOption, TrailerTypeOption } from '../../hooks/useTripOptions';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { formatCurrency } from '../../lib/format';
import { selectStyle } from '../../utils/formStyles';
import './TripInfoCard.css';

interface TripInfoCardProps {
  customers: SelectOption[];
  carrierCustomers: SelectOption[];
  routes: RouteOption[];
  trucks: SelectOption[];
  trailerTypes: TrailerTypeOption[];
  drivers: SelectOption[];
  cargoTypes: SelectOption[];
  containerTypes: SelectOption[];
  loading: boolean;
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
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
  const filledContainerTypeIds = form.containerRows
    .map(row => row.containerTypeId)
    .filter(Boolean)
    .map(String);
  const commonContainerTypeId = filledContainerTypeIds.length > 0 &&
    filledContainerTypeIds.every(id => id === filledContainerTypeIds[0])
      ? filledContainerTypeIds[0]
      : '';
  const plannedContainerTypeId = form.plannedContainerTypeId || commonContainerTypeId;

  const setPlannedContainerTypeId = (value: string) => {
    form.setPlannedContainerTypeId(value);
    form.setContainerRows(prev => prev.map(row => ({
      ...row,
      containerTypeId: value ? Number(value) : '',
    })));
  };

  const sel = (value: string, onChange: (v: string) => void, options: SelectOption[], placeholder: string, id?: string) => (
    <select id={id} className="input" style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)} disabled={props.loading}>
      <option value="">{props.loading ? 'Đang tải…' : placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );

  const selStatic = (value: string, onChange: (v: string) => void, options: TrailerTypeOption[], placeholder: string, id?: string) => (
    <select id={id} className="input" style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)} disabled={props.loading}>
      <option value="">{props.loading ? 'Đang tải…' : placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const marginPreview = form.carrierType === 'EXTERNAL' && form.externalFreightCost && form.revenue
    ? Math.round(Number(form.revenue) / (1 + form.vatRate)) - Math.round(Number(form.externalFreightCost) / (1 + form.vatRate))
    : null;

  return (
    <CardSection number={1} title="Thông tin chuyến đi" subtitle="Khách hàng, tuyến, hàng hóa và phương tiện" badge="required">
      <div className="tc-form-row trip-info-card__layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Khách hàng" required>
            {sel(form.customerId, form.setCustomerId, props.customers, 'Chọn khách hàng', 'customerId')}
          </Field>
          <Field label="Tuyến đường" required>
            {sel(form.routeId, form.setRouteId, props.routes, 'Chọn tuyến đường', 'routeId')}
            <RouteChips routes={props.routes} onSelect={(id) => form.setRouteId(String(id))} />
          </Field>
          <Field label="Loại hàng" required>
            {sel(form.cargoTypeId, form.setCargoTypeId, props.cargoTypes, 'Chọn loại hàng', 'cargoTypeId')}
          </Field>
          <Field label="Mã tham chiếu khách hàng">
            <input id="customerReference" className="input mono" type="text" placeholder="VD: PO-12345" value={form.customerReference} onChange={(e) => form.setCustomerReference(e.target.value)} maxLength={50} />
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>(không bắt buộc)</span>
          </Field>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Carrier type toggle */}
          <Field label="Loại xe" required>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => form.setCarrierType('OWN')}
                className={`btn btn--sm${form.carrierType === 'OWN' ? ' btn--primary' : ' btn--secondary'}`}
              >
                Xe nhà
              </button>
              <button
                type="button"
                onClick={() => form.setCarrierType('EXTERNAL')}
                className={`btn btn--sm${form.carrierType === 'EXTERNAL' ? ' btn--primary' : ' btn--secondary'}`}
              >
                Xe ngoài
              </button>
            </div>
          </Field>

          {form.carrierType === 'OWN' && (
            <>
              <Field label="Xe đầu kéo" required>
                {sel(form.truckId, form.setTruckId, props.trucks, 'Chọn xe đầu kéo', 'truckId')}
              </Field>
              <Field label="Loại rơ moóc" required>
                {selStatic(form.trailerType, form.setTrailerType, props.trailerTypes, 'Chọn loại rơ moóc', 'trailerType')}
              </Field>
              <Field label="Lái xe" required>
                {sel(form.driverId, form.setDriverId, props.drivers, 'Chọn lái xe', 'driverId')}
              </Field>
            </>
          )}

          {form.carrierType === 'EXTERNAL' && (
            <>
              <Field label="Đối tác vận chuyển">
                <select
                  id="externalCarrierId"
                  className="input"
                  style={selectStyle}
                  value={form.externalCarrierId ?? ''}
                  onChange={(e) => form.setExternalCarrierId(e.target.value ? Number(e.target.value) : null)}
                  disabled={props.loading}
                >
                  <option value="">-- Chọn đối tác --</option>
                  {props.carrierCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Giá cước thuê ngoài (gồm VAT)">
                <input
                  id="externalFreightCost"
                  className="input mono"
                  type="number"
                  min={0}
                  placeholder="VD: 5000000"
                  value={form.externalFreightCost}
                  onChange={(e) => form.setExternalFreightCost(e.target.value)}
                />
              </Field>
              <Field label="Biển số xe">
                <input
                  id="externalPlateNumber"
                  className="input mono"
                  type="text"
                  placeholder="VD: 29A-12345"
                  value={form.externalPlateNumber}
                  onChange={(e) => form.setExternalPlateNumber(e.target.value)}
                />
              </Field>
              <Field label="Tên lái xe">
                <input
                  id="externalDriverName"
                  className="input"
                  type="text"
                  placeholder="Tên lái xe thuê ngoài"
                  value={form.externalDriverName}
                  onChange={(e) => form.setExternalDriverName(e.target.value)}
                />
              </Field>
              <Field label="SĐT lái xe">
                <input
                  id="externalDriverPhone"
                  className="input mono"
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={form.externalDriverPhone}
                  onChange={(e) => form.setExternalDriverPhone(e.target.value)}
                />
              </Field>
              {marginPreview !== null && (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--bg-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  color: marginPreview >= 0 ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 600,
                }}>
                  Lãi điều xe ngoài (dự kiến): {formatCurrency(marginPreview)}
                </div>
              )}
            </>
          )}

          <Field label="Ngày khởi hành" required>
            <input id="departureDate" className="input mono" type="date" value={form.departureDate} onChange={(e) => form.setDepartureDate(e.target.value)} required />
          </Field>
        </div>

        <div className="trip-info-card__container-grid">
          <Field label="Số cont" required>
            <input id="containerCount" className="input mono" type="number" min={1} max={10} value={form.containerCount} onChange={(e) => form.setContainerCount(e.target.value)} />
            <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Mặc định: 1</span>
          </Field>
          <Field label="Loại container" className="trip-info-card__container-type">
            {sel(plannedContainerTypeId, setPlannedContainerTypeId, props.containerTypes, 'Chọn loại container', 'plannedContainerTypeId')}
          </Field>

          {/* VAT rate */}
          <Field label="Thuế VAT">
            <select
              id="vatRate"
              className="input"
              style={selectStyle}
              value={form.vatRate}
              onChange={(e) => form.setVatRate(Number(e.target.value))}
            >
              <option value={0.08}>8%</option>
              <option value={0.10}>10%</option>
              <option value={0}>Không VAT</option>
            </select>
          </Field>
        </div>
      </div>
    </CardSection>
  );
}
