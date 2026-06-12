import React from "react";
import { computeRoadAllowance } from "@tingting/shared";
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
    twoPointDeliveryBonus, setTwoPointDeliveryBonus,
    vehicleShiftAllowance, setVehicleShiftAllowance,
    twoPointDeliveryDefault, vehicleShiftDefault,
    revenueEmptyReturn, setRevenueEmptyReturn,
    revenueCombine, setRevenueCombine,
    customerCommission, setCustomerCommission,
    tripWageDays, setTripWageDays,
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

      <div className="row-2">
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Tổng tiền đi đường (đ)</label>
          <InputWithPrefix
            value={tollsAddition}
            onChange={setTollsAddition}
            placeholder="VD: 2.700.000"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Tiền vé (công ty) đã thanh toán (đ)</label>
          <InputWithPrefix
            value={tollsDiscount}
            onChange={setTollsDiscount}
            placeholder="VD: 400.000"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: -6, marginBottom: 14, fontWeight: 600, display: "flex", gap: 6 }}>
        <span>Lái xe thực lĩnh:</span>
        <span style={{ color: "var(--brand, #10B981)", fontFamily: "monospace" }}>
          {(() => {
            const base = Number(roadAllowanceBaseApplied) || 0;
            const discount = Number(tollsDiscount) || 0;
            const addition = Number(tollsAddition) || 0;
            const stations = Number(tollsStations) || 0;
            const perStation = tollPerStationApplied ?? 55000;
            const returnBonus = hasReturnCargo ? (returnCargoBonusApplied ?? 300000) : 0;
            const tongTien = addition > 0 ? (addition + returnBonus) : (base - (stations * perStation) + returnBonus);
            const salary = Number(driverSalary) || 0;
            const twoPoint = Number(twoPointDeliveryBonus) || 0;
            const shift = Number(vehicleShiftAllowance) || 0;
            return Math.max(0, tongTien + salary + twoPoint + shift - discount).toLocaleString("vi-VN");
          })()} đ
        </span>
      </div>

      <div className="row-2" style={{ alignItems: "center" }}>
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

      <div className="row-2">
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
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Tiền lương tài xế (đ)</label>
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

      <div className="row-2">
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Trả hàng 2 điểm (đ)</label>
          <InputWithPrefix
            value={twoPointDeliveryBonus}
            onChange={setTwoPointDeliveryBonus}
            placeholder={twoPointDeliveryDefault ? twoPointDeliveryDefault.toLocaleString("vi-VN") : "VD: 200.000"}
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>Để trống = không có</div>
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Lưu ca xe (đ)</label>
          <InputWithPrefix
            value={vehicleShiftAllowance}
            onChange={setVehicleShiftAllowance}
            placeholder={vehicleShiftDefault ? vehicleShiftDefault.toLocaleString("vi-VN") : "VD: 200.000"}
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>Chi phí lưu xe qua đêm (200k-400k/ngày)</div>
        </div>
      </div>

      <div className="row-2">
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Doanh thu đóng/ trả hàng (đ)</label>
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
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Doanh thu kết hợp (đ)</label>
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

      <div className="row-2">
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Hoa hồng chi KH (đ)</label>
          <InputWithPrefix
            value={customerCommission}
            onChange={setCustomerCommission}
            placeholder="0"
            prefix="đ"
            mono
            type="money"
            style={{ width: "100%" }}
          />
        </div>
        <div className="field">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>Số ngày tính lương</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="number"
              min="1"
              max="31"
              className="input"
              value={tripWageDays}
              placeholder="VD: 2"
              onChange={(e) => {
                const days = e.target.value;
                setTripWageDays(days);
                if (days) {
                  const dailyRate = Math.round(10000000 / 26);
                  setDriverSalary(String(dailyRate * Number(days)));
                }
              }}
              style={{ width: "100%" }}
            />
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                type="button"
                className="btn"
                style={{
                  padding: 0,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: tripWageDays === String(d) ? "var(--brand)" : "var(--bg-3)",
                  color: tripWageDays === String(d) ? "#fff" : "var(--fg-2)",
                  border: "none",
                  fontWeight: 600
                }}
                onClick={() => {
                  setTripWageDays(String(d));
                  const dailyRate = Math.round(10000000 / 26);
                  setDriverSalary(String(dailyRate * d));
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
            {tripWageDays && Number(tripWageDays) > 0 
              ? `${tripWageDays} ngày = ${(Math.round(10000000 / 26) * Number(tripWageDays)).toLocaleString('vi-VN')} đ`
              : '1 ngày = 384.615 đ'}
          </div>
        </div>
      </div>
    </div>
  );
}
