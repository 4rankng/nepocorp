import React from "react";
import { FuelMode } from "@nepocorp/shared";

interface FuelConfiguratorProps {
  fuelMode: FuelMode;
  onFuelModeChange: (v: FuelMode) => void;
  fuelLitersOverride: string;
  onFuelLitersOverrideChange: (v: string) => void;
  fuelSupplementLiters: string;
  onFuelSupplementLitersChange: (v: string) => void;
  fuelSupplementReason: string;
  onFuelSupplementReasonChange: (v: string) => void;
}

export function FuelConfigurator({
  fuelMode,
  onFuelModeChange,
  fuelLitersOverride,
  onFuelLitersOverrideChange,
  fuelSupplementLiters,
  onFuelSupplementLitersChange,
  fuelSupplementReason,
  onFuelSupplementReasonChange,
}: FuelConfiguratorProps) {
  const isSupplementActive = Number(fuelSupplementLiters) > 0;

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="typo-eyebrow">Định mức & Bổ sung dầu</span>
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Chế độ dầu</label>
        <select
          className="input"
          style={{
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 32,
            width: "100%",
          }}
          value={fuelMode}
          onChange={(e) => onFuelModeChange(e.target.value as FuelMode)}
        >
          <option value={FuelMode.AUTO}>Tự động (Định mức × Km chặng)</option>
          <option value={FuelMode.FLAT_RATE}>Khoán (Nhập thủ công)</option>
        </select>
      </div>

      {fuelMode === FuelMode.FLAT_RATE && (
        <div className="field" style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Số lít dầu khoán (Thực tế áp dụng)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 55"
            value={fuelLitersOverride}
            onChange={(e) => onFuelLitersOverrideChange(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>
      )}

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Số lít bổ sung</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 3"
            value={fuelSupplementLiters}
            onChange={(e) => onFuelSupplementLitersChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
            Lý do bổ sung {isSupplementActive && <span style={{ color: "var(--danger)" }}>*</span>}
          </label>
          <input
            className="input"
            placeholder="VD: Chạy máy lạnh kéo dài"
            value={fuelSupplementReason}
            onChange={(e) => onFuelSupplementReasonChange(e.target.value)}
            required={isSupplementActive}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
