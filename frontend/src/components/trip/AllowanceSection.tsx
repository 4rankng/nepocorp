import React from "react";
import { computeDriverRoadAllowance, computeRoadAllowance, computeTripDriverSalary } from "@tingting/shared";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { InputWithPrefix } from "./InputWithPrefix";
import "./AllowanceSection.css";

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
    driverBaseSalary,
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
    <div className="as-section">
      <div className="as-section-heading">
        <span className="typo-eyebrow">Chi phí đường bộ & Doanh thu</span>
      </div>

      <div className="as-row">
        <div className="field">
          <label className="as-field-label">Tổng tiền đi đường (₫)</label>
          <InputWithPrefix
            value={tollsAddition}
            onChange={setTollsAddition}
            placeholder="VD: 2.700.000"
            prefix="₫"
            mono
            type="money"
          />
        </div>
        <div className="field">
          <label className="as-field-label">Tiền vé (công ty) đã thanh toán (₫)</label>
          <InputWithPrefix
            value={tollsDiscount}
            onChange={setTollsDiscount}
            placeholder="VD: 400.000"
            prefix="₫"
            mono
            type="money"
          />
        </div>
      </div>

      <div className="as-take-home">
        <span>Lái xe thực lĩnh:</span>
        <span className="as-take-home__amount">
          {(() => {
            const roadAllowance = computeDriverRoadAllowance({
              base: Number(roadAllowanceBaseApplied) || 0,
              tollsDiscount: Number(tollsDiscount) || 0,
              tollsAddition: Number(tollsAddition) || 0,
              tollsStations: Number(tollsStations) || 0,
              tollPerStation: tollPerStationApplied ?? 55000,
              returnCargoBonus: returnCargoBonusApplied ?? 300000,
              hasReturnCargo,
              roadAllowanceOverride: roadAllowanceOverride === '' ? null : Number(roadAllowanceOverride),
              twoPointDeliveryBonus: Number(twoPointDeliveryBonus) || 0,
            });
            const salary = Number(driverSalary) || 0;
            const shift = Number(vehicleShiftAllowance) || 0;
            return Math.max(0, roadAllowance + salary + shift).toLocaleString("vi-VN");
          })()} ₫
        </span>
      </div>

      <div className="as-row">
        <div className="field">
          <label className="as-field-label">Số trạm thu phí (Trạm)</label>
          <input
            className="input mono"
            type="number"
            placeholder="VD: 4"
            value={tollsStations}
            onChange={(e) => setTollsStations(e.target.value)}
          />
        </div>
        <div className="field as-return-cargo-field">
          <div className="as-input-wrapper">
            <label className={`as-return-cargo${hasReturnCargo ? ' is-checked' : ''}`} htmlFor="has-return-cargo">
              <input
                id="has-return-cargo"
                className="as-return-cargo__input"
                type="checkbox"
                checked={hasReturnCargo}
                onChange={(e) => setHasReturnCargo(e.target.checked)}
              />
              <span className="as-return-cargo__indicator" aria-hidden="true" />
              <span className="as-return-cargo__label">
                Chuyến về có hàng{returnCargoBonusApplied != null ? ` (+${(returnCargoBonusApplied / 1000).toFixed(0)}k)` : ''}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="as-row">
        <div className="field">
          <label className="as-field-label">Điều chỉnh tiền đi đường (₫)</label>
          <div className="as-input-wrapper">
            <InputWithPrefix
              value={roadAllowanceOverride}
              onChange={setRoadAllowanceOverride}
              placeholder="Để trống = tự tính"
              prefix="₫"
              mono
              type="money"
            />
            {computedRoadAllowanceHint !== null && (
              <div className="as-helper">
                Tự tính: {computedRoadAllowanceHint.toLocaleString("vi-VN")} ₫
                {roadAllowanceOverride && Number(roadAllowanceOverride) !== computedRoadAllowanceHint && (
                  <span className="as-inline-warning">
                    Đã điều chỉnh
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="field">
          <label className="as-field-label">Tiền lương lái xe (₫)</label>
          <InputWithPrefix
            value={driverSalary}
            onChange={setDriverSalary}
            placeholder="VD: 850.000"
            prefix="₫"
            mono
            type="money"
          />
        </div>
      </div>

      <div className="as-row">
        <div className="field">
          <label className="as-field-label">Trả hàng 2 điểm (₫)</label>
          <div className="as-input-wrapper">
            <InputWithPrefix
              value={twoPointDeliveryBonus}
              onChange={setTwoPointDeliveryBonus}
              placeholder={twoPointDeliveryDefault ? twoPointDeliveryDefault.toLocaleString("vi-VN") : "VD: 200.000"}
              prefix="₫"
              mono
              type="money"
            />
            <div className="as-helper">Để trống = không có</div>
          </div>
        </div>
        <div className="field">
          <label className="as-field-label">Lưu ca xe (₫)</label>
          <div className="as-input-wrapper">
            <InputWithPrefix
              value={vehicleShiftAllowance}
              onChange={setVehicleShiftAllowance}
              placeholder={vehicleShiftDefault ? vehicleShiftDefault.toLocaleString("vi-VN") : "VD: 200.000"}
              prefix="₫"
              mono
              type="money"
            />
            <div className="as-helper">Chi phí lưu xe qua đêm (200k-400k/ngày)</div>
          </div>
        </div>
      </div>

      <div className="as-row">
        <div className="field">
          <label className="as-field-label">Doanh thu đóng/ trả hàng (₫)</label>
          <div className="as-input-wrapper">
            <InputWithPrefix
              value={revenueEmptyReturn}
              onChange={setRevenueEmptyReturn}
              placeholder="VD: 4.200.000"
              prefix="₫"
              mono
              type="money"
            />
            {suggestedPrice !== null && (
              <div className="as-helper">
                Giá gợi ý từ bảng giá: {Number(suggestedPrice).toLocaleString("vi-VN")} ₫{Number(containerCount) > 1 ? ` × ${containerCount} cont = ${(suggestedPrice * Number(containerCount)).toLocaleString("vi-VN")} ₫` : ''}
                {revenueEmptyReturn && Number(revenueEmptyReturn) !== suggestedPrice * Number(containerCount) && (
                  <span className="as-inline-warning">
                    Giá đã điều chỉnh
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="field">
          <label className="as-field-label">Doanh thu kết hợp (₫)</label>
          <InputWithPrefix
            value={revenueCombine}
            onChange={setRevenueCombine}
            placeholder="VD: 2.000.000"
            prefix="₫"
            mono
            type="money"
          />
        </div>
      </div>

      <div className="as-row">
        <div className="field">
          <label className="as-field-label">Hoa hồng chi KH (₫)</label>
          <InputWithPrefix
            value={customerCommission}
            onChange={setCustomerCommission}
            placeholder="0"
            prefix="₫"
            mono
            type="money"
          />
        </div>
        <div className="field">
          <label className="as-field-label">Số ngày tính lương</label>
          <div className="as-input-wrapper">
            <div className="as-day-picker">
              <input
                type="number"
                min="1"
                max="31"
                className="input mono"
                value={tripWageDays}
                placeholder="VD: 2"
                onChange={(e) => {
                  const days = e.target.value;
                  setTripWageDays(days);
                  if (days && driverBaseSalary > 0) {
                    setDriverSalary(String(computeTripDriverSalary(driverBaseSalary, Number(days))));
                  }
                }}
              />
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn as-day-shortcut${tripWageDays === String(d) ? ' is-active' : ''}`}
                  onClick={() => {
                    setTripWageDays(String(d));
                    if (driverBaseSalary > 0) {
                      setDriverSalary(String(computeTripDriverSalary(driverBaseSalary, d)));
                    }
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="as-helper">
              {driverBaseSalary > 0
                ? tripWageDays && Number(tripWageDays) > 0
                  ? `${tripWageDays} ngày = ${computeTripDriverSalary(driverBaseSalary, Number(tripWageDays)).toLocaleString('vi-VN')} ₫`
                  : `1 ngày = ${computeTripDriverSalary(driverBaseSalary, 1).toLocaleString('vi-VN')} ₫`
                : 'Chưa cấu hình lương cơ bản cho lái xe'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
