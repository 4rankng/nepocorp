import React, { useMemo, useState } from "react";
import { DollarSign, Clock, Users, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { computeTripTotals } from "@nepocorp/shared";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { useFuelConfig } from '../../hooks/useQueries';

export function TotalsPanel() {
  const form = useTripFormContext();
  const { data: fuelConfig } = useFuelConfig();
  const {
    legs, fuelMode, fuelLitersOverride, fuelSupplementLiters,
    tollsDiscount, tollsAddition, tollsStations,
    hasReturnCargo, driverSalary, revenue,
    revenueEmptyReturn, revenueCombine,
    selectedRouteData, roadAllowanceBaseApplied, fuelActualUnitPrice,
    roadAllowanceOverride, tollPerStationApplied, returnCargoBonusApplied,
  } = form;
  const [showRoadBreakdown, setShowRoadBreakdown] = useState(true);

  const isMountainRoute = selectedRouteData?.isMountain ?? false;
  const mountainFixedAllowance = selectedRouteData?.fixedFuelAllowance ? Number(selectedRouteData.fixedFuelAllowance) : null;

  const totals = useMemo(() => {
    const formattedLegs = legs.map((leg) => ({
      sequence: leg.sequence,
      km: Number(leg.km) || 0,
      loadingType: leg.loadingType,
    }));

    return computeTripTotals({
      legs: formattedLegs,
      fuelMode: fuelMode,
      fuelLitersOverride: fuelLitersOverride ? Number(fuelLitersOverride) : null,
      fuelSupplementLiters: fuelSupplementLiters ? Number(fuelSupplementLiters) : 0,
      fuelLoadedNorm: 43,
      fuelEmptyNorm: 25,
      fuelPerTripSupplement: 3,
      fuelUnitPrice: fuelConfig ? Number(fuelConfig.unitPrice) : 25000,
      fuelActualUnitPrice: fuelActualUnitPrice !== '' ? Number(fuelActualUnitPrice) : null,
      isMountainRoute,
      mountainFixedAllowance,
      roadAllowanceBase: roadAllowanceBaseApplied ?? 0,
      tollsDiscount: tollsDiscount ? Number(tollsDiscount) : 0,
      tollsAddition: tollsAddition ? Number(tollsAddition) : 0,
      tollsStations: tollsStations ? Number(tollsStations) : 0,
      tollPerStation: tollPerStationApplied ?? 0,
      hasReturnCargo,
      returnCargoBonus: returnCargoBonusApplied ?? 0,
      revenue: revenue ? Number(revenue) : 0,
      driverSalary: driverSalary ? Number(driverSalary) : 0,
      twoPointDeliveryBonus: Number(form.twoPointDeliveryBonus) || 0,
      vehicleShiftAllowance: Number(form.vehicleShiftAllowance) || 0,
    });
  }, [
    legs, fuelMode, fuelLitersOverride, fuelSupplementLiters,
    isMountainRoute, mountainFixedAllowance, roadAllowanceBaseApplied,
    tollsDiscount, tollsAddition, tollsStations, tollPerStationApplied, returnCargoBonusApplied,
    hasReturnCargo, revenue, driverSalary, fuelConfig, fuelActualUnitPrice,
    form.twoPointDeliveryBonus, form.vehicleShiftAllowance,
  ]);

  const fmt = (v: number) => Math.abs(Math.round(v)).toLocaleString("vi-VN");
  const fmtSigned = (v: number) => (v >= 0 ? '+' : '−') + fmt(v);

  // Road-allowance breakdown — what makes up "Tiền đi đường thực nhận"
  const roadBreakdown = useMemo(() => {
    const base = Number(roadAllowanceBaseApplied) || 0;
    const discount = Number(tollsDiscount) || 0;
    const addition = Number(tollsAddition) || 0;
    const stations = Number(tollsStations) || 0;
    const perStation = Number(tollPerStationApplied) || 0;
    const stationCost = stations * perStation;
    const returnBonus = hasReturnCargo ? (Number(returnCargoBonusApplied) || 0) : 0;
    const overrideRaw = roadAllowanceOverride !== '' && roadAllowanceOverride != null
      ? Number(roadAllowanceOverride)
      : null;
    const overridden = overrideRaw != null && Number.isFinite(overrideRaw);
    return { base, discount, addition, stations, perStation, stationCost, returnBonus, overrideRaw, overridden };
  }, [roadAllowanceBaseApplied, tollsDiscount, tollsAddition, tollsStations, tollPerStationApplied, returnCargoBonusApplied, hasReturnCargo, roadAllowanceOverride]);

  // Revenue split — used by accountant when reviewing combined trips.
  const revenueEmpty = Number(revenueEmptyReturn) || 0;
  const revenueComb = Number(revenueCombine) || 0;
  const revenueNum = Number(revenue) || (revenueEmpty + revenueComb);
  const isProfitPositive = totals.grossProfit >= 0;

  const twoPointAmount = Number(form.twoPointDeliveryBonus) || 0;
  const vehicleShiftAmount = Number(form.vehicleShiftAllowance) || 0;
  const totalCost = totals.totalCost;
  const fuelPct = totalCost > 0 ? (totals.totalFuelCost / totalCost) * 100 : 0;
  const roadPct = totalCost > 0 ? (totals.totalRoadAllowance / totalCost) * 100 : 0;
  const salaryPct = totalCost > 0 ? ((Number(driverSalary) || 0) / totalCost) * 100 : 0;
  const otherPct = totalCost > 0 ? ((twoPointAmount + vehicleShiftAmount) / totalCost) * 100 : 0;

  return (
    <div className="tc-summary-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 className="tc-summary-card__label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Ước tính doanh thu & lợi nhuận live
        </h3>
        <div className="tc-summary-card__big mono" style={{ fontSize: 24, fontWeight: 800 }}>
          {fmt(revenueNum)}
          <span className="tc-summary-card__currency" style={{ fontSize: 13, marginLeft: 4 }}>đ</span>
        </div>
        {(revenueEmpty > 0 || revenueComb > 0) && (
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>DT trả hàng</span>
              <span className="mono">{fmt(revenueEmpty)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>+ DT kết hợp đóng hàng</span>
              <span className="mono" style={{ color: revenueComb > 0 ? "#10B981" : undefined }}>
                {revenueComb > 0 ? "+" : ""}{fmt(revenueComb)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
          <span>Phân bổ chi phí</span>
          <span>{fmt(totalCost)} đ</span>
        </div>
        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.15)", marginBottom: 12 }}>
          <div style={{ width: `${fuelPct}%`, background: "#3B82F6" }} title={`Dầu: ${fuelPct.toFixed(0)}%`} />
          <div style={{ width: `${roadPct}%`, background: "#F59E0B" }} title={`Đường bộ: ${roadPct.toFixed(0)}%`} />
          <div style={{ width: `${salaryPct}%`, background: "#10B981" }} title={`Lương tài: ${salaryPct.toFixed(0)}%`} />
          {otherPct > 0 && <div style={{ width: `${otherPct}%`, background: "#8B5CF6" }} title={`Khác: ${otherPct.toFixed(0)}%`} />}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6" }} /> Dầu ({totals.totalFuelLiters.toFixed(0)}L)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} /> Đường
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} /> Lương tài
          </span>
          {otherPct > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6" }} /> Khác
            </span>
          )}
        </div>
      </div>

      <div className="tc-summary-rows" style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 16 }}>
        <div className="tc-summary-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
          <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
            <Clock size={13} style={{ color: "#3B82F6" }} /> Chi phí nhiên liệu (Lớp dầu)
          </span>
          <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
            −{fmt(totals.totalFuelCost)}
          </span>
        </div>
        <div
          className="tc-summary-row"
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13, cursor: "pointer", userSelect: "none" }}
          onClick={() => setShowRoadBreakdown(v => !v)}
          role="button"
          aria-expanded={showRoadBreakdown}
          title="Bấm để xem chi tiết"
        >
          <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
            <DollarSign size={13} style={{ color: "#F59E0B" }} /> Tiền đi đường thực nhận
            {showRoadBreakdown ? <ChevronUp size={12} style={{ opacity: 0.6 }} /> : <ChevronDown size={12} style={{ opacity: 0.6 }} />}
            {roadBreakdown.overridden && (
              <span style={{
                fontSize: 9,
                padding: '1px 6px',
                borderRadius: 999,
                background: 'rgba(245,158,11,0.18)',
                color: '#FBBF24',
                fontWeight: 600,
                letterSpacing: 0.3,
              }}>
                ĐÃ ĐIỀU CHỈNH
              </span>
            )}
          </span>
          <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
            −{fmt(totals.totalRoadAllowance)}
          </span>
        </div>

        {showRoadBreakdown && (
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.62)",
              paddingLeft: 22,
              marginBottom: 8,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              borderLeft: "1px dashed rgba(255,255,255,0.18)",
              marginLeft: 6,
              paddingTop: 2,
              paddingBottom: 2,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Định mức tuyến</span>
              <span className="mono">{fmt(roadBreakdown.base)}</span>
            </div>
            {roadBreakdown.addition > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>+ Vé tăng theo lệnh</span>
                <span className="mono" style={{ color: "#10B981" }}>+{fmt(roadBreakdown.addition)}</span>
              </div>
            )}
            {roadBreakdown.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>− Giảm vé QL5</span>
                <span className="mono" style={{ color: "#EF4444" }}>−{fmt(roadBreakdown.discount)}</span>
              </div>
            )}
            {roadBreakdown.stations > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>− Trạm BOT ({roadBreakdown.stations} × {fmt(roadBreakdown.perStation)})</span>
                <span className="mono" style={{ color: "#EF4444" }}>−{fmt(roadBreakdown.stationCost)}</span>
              </div>
            )}
            {roadBreakdown.returnBonus > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>+ Chuyển về có hàng</span>
                <span className="mono" style={{ color: "#10B981" }}>+{fmt(roadBreakdown.returnBonus)}</span>
              </div>
            )}
            {roadBreakdown.overridden && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px dashed rgba(255,255,255,0.18)", marginTop: 2 }}>
                <span style={{ color: "#FBBF24" }}>Đã điều chỉnh tay</span>
                <span className="mono" style={{ color: "#FBBF24", fontWeight: 700 }}>{fmt(roadBreakdown.overrideRaw!)}</span>
              </div>
            )}
          </div>
        )}
        <div className="tc-summary-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
          <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
            <Users size={13} style={{ color: "#10B981" }} /> Lương tài xế
          </span>
          <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
            −{fmt(Number(driverSalary) || 0)}
          </span>
        </div>
        {twoPointAmount > 0 && (
          <div className="tc-summary-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
              <MapPin size={13} style={{ color: "#8B5CF6" }} /> Trả hàng 2 điểm
            </span>
            <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
              −{fmt(twoPointAmount)}
            </span>
          </div>
        )}
        {vehicleShiftAmount > 0 && (
          <div className="tc-summary-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
              <Clock size={13} style={{ color: "#F97316" }} /> Lưu ca xe
            </span>
            <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
              −{fmt(vehicleShiftAmount)}
            </span>
          </div>
        )}

        <div
          className="tc-summary-row tc-summary-row--total"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px dashed rgba(255,255,255,0.2)",
            alignItems: "center",
          }}
        >
          <span className="tc-summary-row__lbl" style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700, fontSize: 14 }}>
            Lợi nhuận dự kiến
          </span>
          <span
            className={`tc-summary-row__val ${isProfitPositive ? "tc-summary-row__val--pos" : "tc-summary-row__val--neg"}`}
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: isProfitPositive ? "#10B981" : "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isProfitPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {isProfitPositive ? "+" : "−"}
            {fmt(totals.grossProfit)} đ
          </span>
        </div>
      </div>
    </div>
  );
}
