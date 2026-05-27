import React from 'react';
import { CardSection } from './CardSection';
import { FuelModeToggle } from './FuelModeToggle';
import { InputWithPrefix } from './InputWithPrefix';
import { CheckboxCard } from './CheckboxCard';
import { SectionDivider } from './SectionDivider';
import type { FuelMode } from '../../hooks/useTripForm';

interface FuelTollsRevenueCardProps {
  fuelMode: FuelMode; onFuelModeChange: (v: FuelMode) => void;
  fuelLitersOverride: string; onFuelLitersOverrideChange: (v: string) => void;
  fuelSupplementLiters: string; onFuelSupplementLitersChange: (v: string) => void;
  fuelSupplementReason: string; onFuelSupplementReasonChange: (v: string) => void;
  tollsDiscount: string; onTollsDiscountChange: (v: string) => void;
  tollsAddition: string; onTollsAdditionChange: (v: string) => void;
  tollsStations: string; onTollsStationsChange: (v: string) => void;
  hasReturnCargo: boolean; onHasReturnCargoChange: (v: boolean) => void;
  driverSalary: string; onDriverSalaryChange: (v: string) => void;
  revenue: string; onRevenueChange: (v: string) => void;
  suggestedPrice: number | null;
}

export function FuelTollsRevenueCard(props: FuelTollsRevenueCardProps) {
  return (
    <CardSection number={3} title="Nhiên liệu, vé đường & doanh thu" subtitle="Định mức, chi phí đường bộ và doanh thu chuyến" badge="optional">
      <div className="field" style={{ marginBottom: 8 }}>
        <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg-2)' }}>Chế độ tính dầu</label>
      </div>
      <FuelModeToggle value={props.fuelMode} onChange={props.onFuelModeChange} />

      {props.fuelMode === 'FLAT_RATE' && (
        <div className="field">
          <label>Số lít dầu khoán</label>
          <InputWithPrefix value={props.fuelLitersOverride} onChange={props.onFuelLitersOverrideChange} placeholder="VD: 55" prefix="L" type="number" />
        </div>
      )}

      <div className="tc-form-row tc-form-row--three">
        <div className="field">
          <label>Số lít bổ sung</label>
          <InputWithPrefix value={props.fuelSupplementLiters} onChange={props.onFuelSupplementLitersChange} placeholder="0" prefix="L" type="number" />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Lý do bổ sung</label>
          <input className="input" type="text" placeholder="VD: Chạy máy lạnh kéo dài" value={props.fuelSupplementReason} onChange={(e) => props.onFuelSupplementReasonChange(e.target.value)} />
        </div>
      </div>

      <SectionDivider label="Vé đường bộ & doanh thu" />

      <div className="tc-form-row tc-form-row--three">
        <div className="field">
          <label>Tăng vé theo lệnh</label>
          <InputWithPrefix value={props.tollsAddition} onChange={props.onTollsAdditionChange} placeholder="150,000" prefix="VNĐ" mono type="number" />
        </div>
        <div className="field">
          <label>Giảm vé QL5</label>
          <InputWithPrefix value={props.tollsDiscount} onChange={props.onTollsDiscountChange} placeholder="40,000" prefix="VNĐ" mono type="number" />
        </div>
        <div className="field">
          <label>Số trạm thu phí</label>
          <input className="input mono" type="number" placeholder="4" value={props.tollsStations} onChange={(e) => props.onTollsStationsChange(e.target.value)} />
        </div>
      </div>

      <div className="tc-form-row tc-form-row--three" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Lương sản lượng tài xế</label>
          <InputWithPrefix value={props.driverSalary} onChange={props.onDriverSalaryChange} placeholder="850,000" prefix="VNĐ" mono type="number" />
        </div>
        <div className="field">
          <label>Doanh thu chuyến</label>
          <InputWithPrefix value={props.revenue} onChange={props.onRevenueChange} placeholder="4,200,000" prefix="VNĐ" mono type="number" />
          {props.suggestedPrice !== null && (
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
              Gợi ý từ bảng giá: {props.suggestedPrice.toLocaleString('vi-VN')} VNĐ
            </div>
          )}
        </div>
        <CheckboxCard
          checked={props.hasReturnCargo}
          onChange={props.onHasReturnCargoChange}
          label="Chuyến về có hàng"
          description="Áp dụng định mức chuyến đôi"
          id="cb-return"
        />
      </div>
    </CardSection>
  );
}
