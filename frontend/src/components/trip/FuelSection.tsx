import React from "react";
import { FuelMode } from "@tingting/shared";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { useFuelConfig } from '../../hooks/useQueries';
import { useCatalogs } from "../../hooks/useCatalogs";

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
          onChange={(e) => setFuelMode(e.target.value as FuelMode)}
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
            onChange={(e) => setFuelLitersOverride(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </div>
      )}

      <div className="field" style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
          Đơn giá thực tế (đ/lít)
        </label>
        <input
          className="input"
          type="number"
          placeholder="Để trống = dùng giá cấu hình"
          value={fuelActualUnitPrice}
          onChange={(e) => setFuelActualUnitPrice(e.target.value)}
          style={{ width: "100%" }}
        />
        <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
          Giá cấu hình áp dụng: {(fuelConfig ? Number(fuelConfig.unitPrice) : 0).toLocaleString('vi-VN')} đ/lít
        </p>
      </div>

      {carrierType === 'OWN' && (
        <div className="field" style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
            Nhà cung cấp nhiên liệu
          </label>
          <select
            className="input"
            value={fuelSupplierId || ''}
            onChange={(e) => setFuelSupplierId(e.target.value ? Number(e.target.value) : null)}
            style={{
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: 32,
              width: "100%",
            }}
          >
            <option value="">-- Chọn nhà cung cấp nhiên liệu --</option>
            {catalogData?.suppliers?.filter(s => (s as any).isFuelSupplier).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
            Lựa chọn nhà cung cấp nhiên liệu cho chuyến này để ghi nhận công nợ.
          </p>
        </div>
      )}

      <div className="row-2">
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Số lít bổ sung</label>
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
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
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
