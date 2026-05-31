import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { LocationAutocomplete } from "../LocationAutocomplete";
import { LoadingType } from "@nepocorp/shared";

export interface FormLeg {
  id: string;
  sequence: number;
  origin: string;
  destination: string;
  km: string;
  loadingType: LoadingType;
}

interface TripLegFieldsProps {
  legs: FormLeg[];
  addLeg: () => void;
  removeLeg: (idx: number) => void;
  updateLeg: (idx: number, field: keyof FormLeg, value: string) => void;
}

export function TripLegFields({ legs, addLeg, removeLeg, updateLeg }: TripLegFieldsProps) {
  const totalKm = legs.reduce((sum, leg) => sum + (Number(leg.km) || 0), 0);

  return (
    <div className="panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="typo-eyebrow">Hành trình chi tiết (Chặng đường)</span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={addLeg}
          style={{ color: "var(--brand)", fontWeight: 600 }}
        >
          <Plus size={14} /> Thêm chặng
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {legs.map((leg, idx) => (
          <div
            key={leg.id}
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--brand)",
              }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--brand-soft)",
                  color: "var(--brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>{leg.sequence}</span>
                Chặng {leg.sequence}
              </div>
              {legs.length > 1 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  onClick={() => removeLeg(idx)}
                  aria-label="Xóa chặng"
                >
                  <Trash2 size={15} style={{ color: "var(--danger)" }} />
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <LocationAutocomplete
                className="input"
                style={{ padding: "7px 10px", fontSize: 13 }}
                placeholder="Điểm đi"
                value={leg.origin}
                onChange={val => updateLeg(idx, "origin", val)}
                required
              />
              <span style={{ color: "var(--fg-3)", fontSize: 14, fontWeight: 600, textAlign: "center" }}>→</span>
              <LocationAutocomplete
                className="input"
                style={{ padding: "7px 10px", fontSize: 13 }}
                placeholder="Điểm đến"
                value={leg.destination}
                onChange={val => updateLeg(idx, "destination", val)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Cự ly (Km)</div>
                <input
                  className="input"
                  type="number"
                  style={{ padding: "7px 10px", fontSize: 13 }}
                  placeholder="Km"
                  value={leg.km}
                  onChange={e => updateLeg(idx, "km", e.target.value)}
                  required
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Tải trọng</div>
                <select
                  className="input"
                  style={{ padding: "7px 10px", fontSize: 13 }}
                  value={leg.loadingType}
                  onChange={e => updateLeg(idx, "loadingType", e.target.value as LoadingType)}
                >
                  <option value={LoadingType.HANG}>Có hàng</option>
                  <option value={LoadingType.VO}>Vỏ rỗng</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: "var(--bg-1)",
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        fontSize: 13,
        display: "flex",
        justifyContent: "space-between",
        color: "var(--fg-2)",
        border: "1px solid var(--border-2)",
      }}>
        <span>Tổng số chặng: <strong>{legs.length}</strong></span>
        <span>Tổng cự ly: <strong>{totalKm.toLocaleString("vi-VN")} Km</strong></span>
      </div>
    </div>
  );
}
