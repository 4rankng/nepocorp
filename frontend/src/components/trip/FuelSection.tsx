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
    legs, fuelAllocations, totals, fuelFrozenLegacy,
  } = form;

  const isSupplementActive = Number(fuelSupplementLiters) > 0;
  // Guard against NaN: fuelConfig?.unitPrice may be null/undefined on the first
  // render before the query resolves (Number(undefined) === NaN, then
  // toLocaleString renders the literal "NaN" in the helper text).
  const configPrice = (
    fuelConfig && fuelConfig.unitPrice != null ? Number(fuelConfig.unitPrice) : 0
  ).toLocaleString('vi-VN');

  // Σ allocation liters vs the trip's computed fuel total: the backend no
  // longer rejects a mismatch on save (equality check removed), so surface
  // the divergence here as an advisory hint. 0-km legs are the common cause
  // (and block the save upstream), so the primary remedy is entering the
  // distance; khoán is the one-click alternative.
  const allocatedLiters = fuelAllocations.reduce((t, r) => t + (Number(r.liters) || 0), 0);
  const hasAllocationRows = fuelAllocations.some(r => r.liters.trim() !== '');
  const targetLiters = totals.totalFuelLiters;
  const allocationMismatch = carrierType === 'OWN' && hasAllocationRows
    && Math.round(allocatedLiters * 100) !== Math.round(targetLiters * 100);
  const allLegsZeroKm = legs.length > 0 && legs.every(l => !(Number(l.km) > 0));
  const showDistanceAction = allocationMismatch && fuelMode === FuelMode.AUTO && allLegsZeroKm;
  // fuelLitersOverride is integer-only server-side (roundInt), so a decimal
  // allocation total cannot be reconciled with one click.
  const canKhoan = Number.isInteger(allocatedLiters) && allocatedLiters > 0 && !fuelFrozenLegacy;

  const focusLegDistance = () => {
    const input = document.querySelector<HTMLInputElement>('.leg-card__fields input[placeholder="Km"]');
    input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input?.focus({ preventScroll: true });
  };

  const khoanToAllocation = () => {
    // FLAT_RATE server fuel = fuelLitersOverride + fuelSupplementLiters, so
    // the override is the allocation total minus the supplement — the
    // recomputed trip total then equals the allocation exactly.
    setFuelMode(FuelMode.FLAT_RATE);
    setFuelLitersOverride(String(Math.max(0, Math.round(allocatedLiters) - Math.round(Number(fuelSupplementLiters) || 0))));
  };

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
          {allocationMismatch && (
            <p role="alert" className="tc-field-hint" style={{ color: 'var(--warning, #b45309)', marginTop: 6 }}>
              Đã phân bổ {allocatedLiters.toLocaleString('vi-VN')} lít, chuyến tính {targetLiters.toLocaleString('vi-VN')} lít
              {fuelMode === FuelMode.AUTO && allLegsZeroKm ? ' (cự ly 0 km)' : ''}.
              {showDistanceAction && (
                <button type="button" className="fs-textbtn" onClick={focusLegDistance}>Nhập cự ly</button>
              )}
              {canKhoan && (
                <button type="button" className="fs-textbtn" onClick={khoanToAllocation}>
                  Khoán {Math.round(allocatedLiters).toLocaleString('vi-VN')} lít
                </button>
              )}
              {!canKhoan && allocatedLiters > 0 && !Number.isInteger(allocatedLiters) && <> Làm tròn số lẻ để khoán.</>}
              {fuelFrozenLegacy && <> Chuyến legacy khóa tổng dầu.</>}
            </p>
          )}
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
