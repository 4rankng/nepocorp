import React from "react";
import { computeRoadAllowance } from "@nepocorp/shared";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { InputWithPrefix } from "./InputWithPrefix";

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
    roadAllowanceOverride, setRoadAllowanceOverride,
    roadAllowanceBaseApplied,
    tollPerStationApplied,
    returnCargoBonusApplied,
  } = form;

  const computedRoadAllowanceHint = React.useMemo(() => {
    if (!roadAllowanceBaseApplied) return null;
    return computeRoadAllowance({
      base: Number(roadAllowanceBaseApplied) || 0,
      tollsDiscount: Number(tollsDiscount) || 0,
      tollsAddition: Number(tollsAddition) || 0,
      tollsStations: Number(tollsStations) || 0,
      tollPerStation: tollPerStationApplied ?? 0,
      returnCargoBonus: returnCargoBonusApplied ?? 0,
      hasReturnCargo,
    });
  }, [roadAllowanceBaseApplied, tollsDiscount, tollsAddition, tollsStations, hasReturnCargo, tollPerStationApplied, returnCargoBonusApplied]);

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="typo-eyebrow">Chi phí đường bộ & Doanh thu</span>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Tăng vé theo lệnh (đ)</label>
          <InputWithPrefix
            value={tollsAddition}
            onChange={setTollsAddition}
            placeholder="VD: 150.000"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Giảm vé QL5 (đ)</label>
          <InputWithPrefix
            value={tollsDiscount}
            onChange={setTollsDiscount}
            placeholder="VD: 40.000"
            prefix="đ"
            mono
            type="money"
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
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>
              Chuyến về có hàng{returnCargoBonusApplied != null ? ` (+${(returnCargoBonusApplied / 1000).toFixed(0)}k)` : ''}
            </span>
          </label>
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Điều chỉnh tiền đi đường (đ)</label>
          <InputWithPrefix
            value={roadAllowanceOverride}
            onChange={setRoadAllowanceOverride}
            placeholder="Để trống = tự tính"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
          {computedRoadAllowanceHint !== null && (
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              Tự tính: {computedRoadAllowanceHint.toLocaleString("vi-VN")} đ
              {roadAllowanceOverride && Number(roadAllowanceOverride) !== computedRoadAllowanceHint && (
                <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                  Đã điều chỉnh
                </span>
              )}
            </div>
          )}
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Lương sản lượng tài xế (đ)</label>
          <InputWithPrefix
            value={driverSalary}
            onChange={setDriverSalary}
            placeholder="VD: 850.000"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Doanh thu trả hàng (đ)</label>
          <InputWithPrefix
            value={revenueEmptyReturn}
            onChange={setRevenueEmptyReturn}
            placeholder="VD: 4.200.000"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
          {suggestedPrice !== null && (
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
              Giá gợi ý từ bảng giá: {Number(suggestedPrice).toLocaleString("vi-VN")} đ{Number(containerCount) > 1 ? ` × ${containerCount} cont = ${(suggestedPrice * Number(containerCount)).toLocaleString("vi-VN")} đ` : ''}
              {revenueEmptyReturn && Number(revenueEmptyReturn) !== suggestedPrice * Number(containerCount) && (
                <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                  Giá đã điều chỉnh
                </span>
              )}
            </div>
          )}
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Doanh thu kết hợp đóng hàng (đ)</label>
          <InputWithPrefix
            value={revenueCombine}
            onChange={setRevenueCombine}
            placeholder="VD: 2.000.000"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
