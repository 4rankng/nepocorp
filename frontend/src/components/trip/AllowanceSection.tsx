import React from "react";
import { useTripFormContext } from "../../hooks/useTripFormContext";

export function AllowanceSection() {
  const form = useTripFormContext();
  const {
    tollsDiscount, setTollsDiscount,
    tollsAddition, setTollsAddition,
    tollsStations, setTollsStations,
    hasReturnCargo, setHasReturnCargo,
    driverSalary, setDriverSalary,
    revenueEmptyReturn, setRevenueEmptyReturn,
    revenueCombine, setRevenueCombine,
    suggestedPrice,
    containerCount,
  } = form;

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="typo-eyebrow">Chi phí đường bộ & Doanh thu</span>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Tăng vé theo lệnh (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 150000"
            value={tollsAddition}
            onChange={(e) => setTollsAddition(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Giảm vé QL5 (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 40000"
            value={tollsDiscount}
            onChange={(e) => setTollsDiscount(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Số trạm thu phí (Trạm)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 4"
            value={tollsStations}
            onChange={(e) => setTollsStations(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "center", height: "100%", paddingTop: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={hasReturnCargo}
              onChange={(e) => setHasReturnCargo(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--brand)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>Chuyến về có hàng (+300k)</span>
          </label>
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Lương sản lượng tài xế (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 850000"
            value={driverSalary}
            onChange={(e) => setDriverSalary(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Doanh thu trả hàng (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 4200000"
            value={revenueEmptyReturn}
            onChange={(e) => setRevenueEmptyReturn(e.target.value)}
            style={{ width: "100%" }}
          />
          {suggestedPrice !== null && (
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              Giá gợi ý từ bảng giá: {Number(suggestedPrice).toLocaleString("vi-VN")} VNĐ{Number(containerCount) > 1 ? ` × ${containerCount} cont = ${(suggestedPrice * Number(containerCount)).toLocaleString("vi-VN")} VNĐ` : ''}
              {revenueEmptyReturn && Number(revenueEmptyReturn) !== suggestedPrice * Number(containerCount) && (
                <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                  Giá đã điều chỉnh
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Doanh thu kết hợp đóng hàng (VNĐ)</label>
          <input
            className="input"
            type="number"
            placeholder="VD: 2000000"
            value={revenueCombine}
            onChange={(e) => setRevenueCombine(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div className="field" />
      </div>
    </div>
  );
}
