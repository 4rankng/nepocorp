import React from "react";

interface AllowanceConfiguratorProps {
  tollsDiscount: string;
  onTollsDiscountChange: (v: string) => void;
  tollsAddition: string;
  onTollsAdditionChange: (v: string) => void;
  tollsStations: string;
  onTollsStationsChange: (v: string) => void;
  hasReturnCargo: boolean;
  onHasReturnCargoChange: (v: boolean) => void;
  driverSalary: string;
  onDriverSalaryChange: (v: string) => void;
  revenue: string;
  onRevenueChange: (v: string) => void;
  suggestedPrice: number | null;
}

export function AllowanceConfigurator({
  tollsDiscount,
  onTollsDiscountChange,
  tollsAddition,
  onTollsAdditionChange,
  tollsStations,
  onTollsStationsChange,
  hasReturnCargo,
  onHasReturnCargoChange,
  driverSalary,
  onDriverSalaryChange,
  revenue,
  onRevenueChange,
  suggestedPrice,
}: AllowanceConfiguratorProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <span className="typo-eyebrow">Chi phí đường bộ & Doanh thu</span>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Tăng vé theo lệnh (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 150000"
            value={tollsAddition}
            onChange={(e) => onTollsAdditionChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Giảm vé QL5 (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 40000"
            value={tollsDiscount}
            onChange={(e) => onTollsDiscountChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Số trạm thu phí (Trạm)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 4"
            value={tollsStations}
            onChange={(e) => onTollsStationsChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "center", height: "100%", paddingTop: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={hasReturnCargo}
              onChange={(e) => onHasReturnCargoChange(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--brand)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>Chuyến về có hàng (+300k)</span>
          </label>
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Lương sản lượng tài xế (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 850000"
            value={driverSalary}
            onChange={(e) => onDriverSalaryChange(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4 }}>Doanh thu chuyến (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 4200000"
            value={revenue}
            onChange={(e) => onRevenueChange(e.target.value)}
            style={{ width: "100%" }}
          />
          {suggestedPrice !== null && (
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              Giá gợi ý từ bảng giá: {Number(suggestedPrice).toLocaleString("vi-VN")} VNĐ
              {revenue && Number(revenue) !== suggestedPrice && (
                <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                  Giá đã điều chỉnh so với bảng giá
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
