import React from "react";
import { FuelMode } from "@tingting/shared";
import type { Supplier } from "@tingting/shared";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { useFuelConfig } from '../../hooks/useQueries';
import { useCatalogs } from "../../hooks/useCatalogs";
import './FuelSection.css';

const selectStyle: React.CSSProperties = {
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--fg-2)",
  marginBottom: 6,
};

export function FuelSection() {
  const form = useTripFormContext();
  const { data: fuelConfig } = useFuelConfig();
  const { data: catalogData } = useCatalogs();
  const {
    fuelMode, setFuelMode,
    fuelLitersOverride, setFuelLitersOverride,
    fuelActualUnitPrice, setFuelActualUnitPrice,
    fuelSupplementLiters, setFuelSupplementLiters,
    fuelSupplementReason, setFuelSupplementReason,
    carrierType,
    fuelSupplierId, setFuelSupplierId,
  } = form;

  const isSupplementActive = Number(fuelSupplementLiters) > 0;
  // Guard against NaN: fuelConfig?.unitPrice may be null/undefined on the first
  // render before the query resolves (Number(undefined) === NaN, then
  // toLocaleString renders the literal "NaN" in the helper text).
  const configPrice = (
    fuelConfig && fuelConfig.unitPrice != null ? Number(fuelConfig.unitPrice) : 0
  ).toLocaleString('vi-VN');

  const supplierSelect = (
    <div className="field">
      <label style={labelStyle}>Nhà cung cấp nhiên liệu</label>
      <select
        className="input"
        value={fuelSupplierId || ''}
        onChange={(e) => setFuelSupplierId(e.target.value ? Number(e.target.value) : null)}
        style={selectStyle}
      >
        <option value="">-- Chọn nhà cung cấp nhiên liệu --</option>
        {catalogData?.suppliers?.filter(s => (s as Supplier).isFuelSupplier).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
        Lựa chọn nhà cung cấp nhiên liệu cho chuyến này để ghi nhận công nợ.
      </p>
    </div>
  );

  const unitPriceField = (
    <div className="field">
      <label style={labelStyle}>Đơn giá thực tế (đ/lít)</label>
      <input
        className="input"
        type="number"
        placeholder="Để trống = dùng giá cấu hình"
        value={fuelActualUnitPrice}
        onChange={(e) => setFuelActualUnitPrice(e.target.value)}
        style={{ width: "100%" }}
      />
      <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
        Giá cấu hình áp dụng: {configPrice} đ/lít
      </p>
    </div>
  );

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="typo-eyebrow">Định mức &amp; Bổ sung dầu</span>
      </div>

      {/* Row 1: Chế độ dầu + Số lít khoán (flat-rate) OR Đơn giá (auto) */}
      <div className="fs-row">
        <div className="field">
          <label style={labelStyle}>Chế độ dầu</label>
          <select
            className="input"
            style={selectStyle}
            value={fuelMode}
            onChange={(e) => setFuelMode(e.target.value as FuelMode)}
          >
            <option value={FuelMode.AUTO}>Tự động (Định mức × Km chặng)</option>
            <option value={FuelMode.FLAT_RATE}>Khoán (Nhập thủ công)</option>
          </select>
        </div>

        {fuelMode === FuelMode.FLAT_RATE ? (
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
        ) : unitPriceField}
      </div>

      {/* Row 2: Đơn giá (flat-rate only) + Nhà cung cấp (OWN only) */}
      {fuelMode === FuelMode.FLAT_RATE && (
        <div className="fs-row">
          {unitPriceField}
          {carrierType === 'OWN' ? supplierSelect : <div />}
        </div>
      )}

      {/* Row 2 (auto mode): Nhà cung cấp only — span half */}
      {fuelMode === FuelMode.AUTO && carrierType === 'OWN' && (
        <div className="fs-row">
          {supplierSelect}
          <div />
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
