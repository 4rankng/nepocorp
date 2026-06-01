import React from 'react';
import { CardSection } from './CardSection';
import { FuelModeToggle } from './FuelModeToggle';
import { InputWithPrefix } from './InputWithPrefix';
import { CheckboxCard } from './CheckboxCard';
import { SectionDivider } from './SectionDivider';
import { useTripFormContext } from '../../hooks/useTripFormContext';

interface FuelTollsRevenueCardProps {
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function FuelTollsRevenueCard({ collapsible, defaultCollapsed }: FuelTollsRevenueCardProps) {
  const form = useTripFormContext();

  return (
    <CardSection
      number={3}
      title="Nhiên liệu, vé đường & doanh thu"
      subtitle="Định mức, chi phí đường bộ và doanh thu chuyến"
      badge="optional"
      collapsible={collapsible}
      defaultCollapsed={defaultCollapsed}
    >
      <div className="field" style={{ marginBottom: 8 }}>
        <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg-2)' }}>Chế độ tính dầu</label>
      </div>
      <FuelModeToggle value={form.fuelMode} onChange={form.setFuelMode} />

      {form.fuelMode === 'FLAT_RATE' && (
        <div className="field">
          <label>Số lít dầu khoán</label>
          <InputWithPrefix value={form.fuelLitersOverride} onChange={form.setFuelLitersOverride} placeholder="VD: 55" prefix="L" type="number" />
        </div>
      )}

      <div className="tc-form-row tc-form-row--three">
        <div className="field">
          <label>Số lít bổ sung</label>
          <InputWithPrefix value={form.fuelSupplementLiters} onChange={form.setFuelSupplementLiters} placeholder="0" prefix="L" type="number" />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Lý do bổ sung</label>
          <input className="input" type="text" placeholder="VD: Chạy máy lạnh kéo dài" value={form.fuelSupplementReason} onChange={(e) => form.setFuelSupplementReason(e.target.value)} />
        </div>
      </div>

      <SectionDivider label="Vé đường bộ & doanh thu" />

      <div className="tc-form-row tc-form-row--three">
        <div className="field">
          <label>Tăng vé theo lệnh</label>
          <InputWithPrefix value={form.tollsAddition} onChange={form.setTollsAddition} placeholder="150,000" prefix="VNĐ" mono type="number" />
        </div>
        <div className="field">
          <label>Giảm vé QL5</label>
          <InputWithPrefix value={form.tollsDiscount} onChange={form.setTollsDiscount} placeholder="40,000" prefix="VNĐ" mono type="number" />
        </div>
        <div className="field">
          <label>Số trạm thu phí</label>
          <input className="input mono" type="number" placeholder="4" value={form.tollsStations} onChange={(e) => form.setTollsStations(e.target.value)} />
        </div>
      </div>

      <div className="tc-form-row tc-form-row--two" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Lương sản lượng tài xế</label>
          <InputWithPrefix value={form.driverSalary} onChange={form.setDriverSalary} placeholder="850,000" prefix="VNĐ" mono type="number" />
        </div>
        <CheckboxCard
          checked={form.hasReturnCargo}
          onChange={form.setHasReturnCargo}
          label="Chuyến về có hàng"
          description="Áp dụng định mức chuyến đôi"
          id="cb-return"
        />
      </div>

      <div className="tc-form-row tc-form-row--two" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Doanh thu trả hàng</label>
          <InputWithPrefix value={form.revenueEmptyReturn} onChange={form.setRevenueEmptyReturn} placeholder="4,200,000" prefix="VNĐ" mono type="number" />
          {form.suggestedPrice !== null && (
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
              Gợi ý từ bảng giá: {form.suggestedPrice.toLocaleString('vi-VN')} VNĐ{Number(form.containerCount) > 1 ? ` × ${form.containerCount} cont = ${(form.suggestedPrice * Number(form.containerCount)).toLocaleString('vi-VN')} VNĐ` : ''}
            </div>
          )}
        </div>
        <div className="field">
          <label>Doanh thu kết hợp đóng hàng</label>
          <InputWithPrefix value={form.revenueCombine} onChange={form.setRevenueCombine} placeholder="2,000,000" prefix="VNĐ" mono type="number" />
        </div>
      </div>
    </CardSection>
  );
}
