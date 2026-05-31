import React, { useMemo } from "react";
import { DollarSign, Clock, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { computeTripTotals, FuelMode } from "@nepocorp/shared";
import type { FormLeg } from "./TripLegFields";

interface TotalsPanelProps {
  legs: FormLeg[];
  fuelMode: FuelMode;
  fuelLitersOverride: string;
  fuelSupplementLiters: string;
  tollsDiscount: string;
  tollsAddition: string;
  tollsStations: string;
  hasReturnCargo: boolean;
  driverSalary: string;
  revenue: string;
  // Rates fallbacks/snapshots
  fuelUnitPrice?: number;
  fuelLoadedNorm?: number;
  fuelEmptyNorm?: number;
  fuelPerTripSupplement?: number;
  tollPerStation?: number;
  returnCargoBonus?: number;
  roadAllowanceBase?: number;
  isMountainRoute?: boolean;
  mountainFixedAllowance?: number | null;
}

export function TotalsPanel({
  legs,
  fuelMode,
  fuelLitersOverride,
  fuelSupplementLiters,
  tollsDiscount,
  tollsAddition,
  tollsStations,
  hasReturnCargo,
  driverSalary,
  revenue,
  fuelUnitPrice = 25000,
  fuelLoadedNorm = 43,
  fuelEmptyNorm = 25,
  fuelPerTripSupplement = 3,
  tollPerStation = 55000,
  returnCargoBonus = 300000,
  roadAllowanceBase = 0,
  isMountainRoute = false,
  mountainFixedAllowance = null,
}: TotalsPanelProps) {
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
      fuelLoadedNorm,
      fuelEmptyNorm,
      fuelPerTripSupplement,
      fuelUnitPrice,
      isMountainRoute,
      mountainFixedAllowance,
      roadAllowanceBase,
      tollsDiscount: tollsDiscount ? Number(tollsDiscount) : 0,
      tollsAddition: tollsAddition ? Number(tollsAddition) : 0,
      tollsStations: tollsStations ? Number(tollsStations) : 0,
      tollPerStation,
      hasReturnCargo,
      returnCargoBonus,
      revenue: revenue ? Number(revenue) : 0,
      driverSalary: driverSalary ? Number(driverSalary) : 0,
    });
  }, [
    legs,
    fuelMode,
    fuelLitersOverride,
    fuelSupplementLiters,
    fuelLoadedNorm,
    fuelEmptyNorm,
    fuelPerTripSupplement,
    fuelUnitPrice,
    isMountainRoute,
    mountainFixedAllowance,
    roadAllowanceBase,
    tollsDiscount,
    tollsAddition,
    tollsStations,
    tollPerStation,
    hasReturnCargo,
    returnCargoBonus,
    revenue,
    driverSalary,
  ]);

  const fmt = (v: number) => Math.abs(Math.round(v)).toLocaleString("vi-VN");

  const revenueNum = Number(revenue) || 0;
  const isProfitPositive = totals.grossProfit >= 0;

  // Compute cost percentages for rendering a progress bar
  const totalCost = totals.totalFuelCost + totals.totalRoadAllowance + (Number(driverSalary) || 0);
  const fuelPct = totalCost > 0 ? (totals.totalFuelCost / totalCost) * 100 : 0;
  const roadPct = totalCost > 0 ? (totals.totalRoadAllowance / totalCost) * 100 : 0;
  const salaryPct = totalCost > 0 ? ((Number(driverSalary) || 0) / totalCost) * 100 : 0;

  return (
    <div className="tc-summary-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 className="tc-summary-card__label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Ước tính doanh thu & lợi nhuận live
        </h3>
        <div className="tc-summary-card__big mono" style={{ fontSize: 24, fontWeight: 800 }}>
          {fmt(revenueNum)}
          <span className="tc-summary-card__currency" style={{ fontSize: 13, marginLeft: 4 }}>VNĐ</span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
          <span>Phân bổ chi phí</span>
          <span>{fmt(totalCost)} VNĐ</span>
        </div>
        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.15)", marginBottom: 12 }}>
          <div style={{ width: `${fuelPct}%`, background: "#3B82F6" }} title={`Dầu: ${fuelPct.toFixed(0)}%`} />
          <div style={{ width: `${roadPct}%`, background: "#F59E0B" }} title={`Đường bộ: ${roadPct.toFixed(0)}%`} />
          <div style={{ width: `${salaryPct}%`, background: "#10B981" }} title={`Lương tài: ${salaryPct.toFixed(0)}%`} />
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
        <div className="tc-summary-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
          <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
            <DollarSign size={13} style={{ color: "#F59E0B" }} /> Tiền đi đường thực nhận
          </span>
          <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
            −{fmt(totals.totalRoadAllowance)}
          </span>
        </div>
        <div className="tc-summary-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
          <span className="tc-summary-row__lbl" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
            <Users size={13} style={{ color: "#10B981" }} /> Lương tài xế
          </span>
          <span className="tc-summary-row__val tc-summary-row__val--neg" style={{ fontWeight: 700, color: "#EF4444" }}>
            −{fmt(Number(driverSalary) || 0)}
          </span>
        </div>

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
            {fmt(totals.grossProfit)} VNĐ
          </span>
        </div>
      </div>
    </div>
  );
}
