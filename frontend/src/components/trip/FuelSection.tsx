import React from "react";
import { FuelMode } from "@tingting/shared";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { useFuelConfig } from '../../hooks/useQueries';
import { InputWithPrefix } from "./InputWithPrefix";
import { FuelAllocationEditor } from './FuelAllocationEditor';
import './FuelSection.css';
import { selectStyleFullWidth, labelStyle } from '../../utils/formStyles';

export function FuelSection() {
  const form = useTripFormContext();
  const { data: fuelConfig } = useFuelConfig();
  const {
    fuelMode, setFuelMode,
    fuelLitersOverride, setFuelLitersOverride,
    fuelActualUnitPrice, setFuelActualUnitPrice,
    fuelSupplementLiters, setFuelSupplementLiters,
    fuelSupplementReason, setFuelSupplementReason,
    carrierType,
  } = form;

  const isSupplementActive = Number(fuelSupplementLiters) > 0;
  // Guard against NaN: fuelConfig?.unitPrice may be null/undefined on the first
  // render before the query resolves (Number(undefined) === NaN, then
  // toLocaleString renders the literal "NaN" in the helper text).
  const configPrice = (
    fuelConfig && fuelConfig.unitPrice != null ? Number(fuelConfig.unitPrice) : 0
  ).toLocaleString('vi-VN');

  const unitPriceField = (
    <div className="field">
      <label style={labelStyle}>Đơn giá thực tế (₫/lít)</label>
      <InputWithPrefix
        id="fuelActualUnitPrice"
        placeholder="Để trống = dùng giá cấu hình"
        value={fuelActualUnitPrice}
        onChange={setFuelActualUnitPrice}
        prefix="₫"
        type="money"
        mono
        style={{ width: "100%" }}
      />
      <p className="tc-field-hint">
        Giá cấu hình áp dụng: {configPrice} ₫/lít
      </p>
    </div>
  );

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="typo-eyebrow">Định mức &amp; Bổ sung dầu</span>
      </div>

      {/* Chế độ dầu — full width: it decides the shape of the rows below. */}
      <div className="fs-row">
        <div className="field">
          <label style={labelStyle}>Chế độ dầu</label>
          <select
            className="input"
            style={selectStyleFullWidth}
            value={fuelMode}
            onChange={(e) => setFuelMode(e.target.value as FuelMode)}
          >
            <option value={FuelMode.AUTO}>Tự động (Định mức × Km chặng)</option>
            <option value={FuelMode.FLAT_RATE}>Khoán (Nhập thủ công)</option>
          </select>
        </div>
      </div>

      {/* Định mức: khoán pairs the liters with the pump price; auto shows the
          price alone, and a single-child .fs-row spans the full width so no
          half-empty row is left behind (kanban 20260926_1 / 20260926_2). */}
      <div className="fs-row">
        {fuelMode === FuelMode.FLAT_RATE && (
          <div className="field">
            <label style={labelStyle}>Số lít dầu khoán (Thực tế áp dụng)</label>
            <input
              className="input"
              type="number"
              placeholder="VD: 55"
              value={fuelLitersOverride}
              onChange={(e) => setFuelLitersOverride(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>
        )}
        {unitPriceField}
      </div>

      {carrierType === 'OWN' && (
        <div>
          <FuelAllocationEditor />
          <p className="tc-field-hint" style={{ marginTop: 6 }}>
            Đổ cùng nơi nhiều lần, mỗi lần một giá? Bấm (+) để thêm lần đổ — đơn giá để trống = dùng giá chuyến.
          </p>
        </div>
      )}

      {/* Row last: Bổ sung dầu */}
      <div className="fs-row" style={{ marginBottom: 0 }}>
        <div className="field">
          <label style={labelStyle}>Số lít bổ sung</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 3"
            value={fuelSupplementLiters}
            onChange={(e) => setFuelSupplementLiters(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={labelStyle}>
            Lý do bổ sung {isSupplementActive && <span style={{ color: "var(--danger)" }}>*</span>}
          </label>
          <input
            className="input"
            placeholder="VD: Chạy máy lạnh kéo dài"
            value={fuelSupplementReason}
            onChange={(e) => setFuelSupplementReason(e.target.value)}
            required={isSupplementActive}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
