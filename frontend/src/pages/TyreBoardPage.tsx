import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { TyreBoardSlot, TyreBoardSlotUpdateInput } from "@tingting/shared";

import { Modal } from "../components/UI";
import { useToast } from "../components/shared/Toast";
import { formatErrorMessage } from "../lib/api";
import { routes } from "../lib/routes";
import { todayISO } from "../features/tires/tireUtils";
import { useTrucksAndDrivers } from "../hooks/useCatalogQueries";
import { useTyreBoard, useTyreBoardChanges, useUpdateTyreSlot, useChangeTyre } from "../hooks/useTyreBoardQueries";
import "./TyreBoardPage.css";

/**
 * NEPO-49 — Bảng theo dõi lốp (tyre tracking board), `/fleet/tyre-board`.
 *
 * Replicates the accountant's Excel sheet (docs/design/THEO-DOI-LOP.xlsx) per
 * the approved mockup (docs/design/tyre-board-mockup-APPROVED.html): head with
 * the "Số xe" badge, vehicle tabs, side-view truck diagram, the 22-slot grid
 * (ô số + seri + meta, dashed = dự phòng), and the full data table with a
 * "Thay lốp" button per row. Slot cells and table cells are inline-editable;
 * "Thay lốp" swaps the serial on a given day and records history
 * (ngày, seri cũ → seri mới) shown in the section below the table.
 */

// Ô 7–10 = dự phòng thân xe (per the Excel's G group) — dashed slots.
const SPARE_SLOTS: Record<number, true> = { 7: true, 8: true, 9: true, 10: true };

// Static label per slot for the hover tooltip (the Excel only shows numbers).
const SLOT_GROUP_BY_POSITION: Record<number, string> = {
  1: "Trục trước", 2: "Trục trước",
  3: "Trục động", 4: "Trục động", 5: "Trục động", 6: "Trục động",
  7: "Dự phòng thân", 8: "Dự phòng thân", 9: "Dự phòng thân", 10: "Dự phòng thân",
  11: "Rơ-moóc trục 1", 12: "Rơ-moóc trục 1", 13: "Rơ-moóc trục 1", 14: "Rơ-moóc trục 1",
  15: "Rơ-moóc trục 2", 16: "Rơ-moóc trục 2", 17: "Rơ-moóc trục 2", 18: "Rơ-moóc trục 2",
  19: "Rơ-moóc trục 3", 20: "Rơ-moóc trục 3", 21: "Rơ-moóc trục 3", 22: "Rơ-moóc trục 3",
};

/** YYYY-MM-DD → dd/MM/yyyy ('' stays ''). */
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** YYYY-MM-DD → dd/MM/yy (slot meta line, like the mockup). */
function fmtDateShort(iso: string | null): string {
  const full = fmtDate(iso);
  return full.length === 10 ? full.slice(0, 6) + full.slice(8) : full;
}

/** Tuổi lốp = whole days from ngày thay to today (Excel: DAYS(TODAY(), G)). */
function tyreAgeDays(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const changed = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - changed.getTime()) / 86_400_000);
}

/**
 * Inline-editable cell. Saves on blur/Enter only when the draft differs from
 * the server value; Esc reverts. Data entry only — writes no history row.
 */
function InlineCell({ value, onCommit, type = "text", placeholder, className }: {
  value: string | null;
  onCommit: (raw: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  const escRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  return (
    <input
      type={type}
      className={className ? `tbp-cell-input ${className}` : "tbp-cell-input"}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={() => {
        if (escRef.current) {
          escRef.current = false;
          setDraft(value ?? "");
          setEditing(false);
          return;
        }
        setEditing(false);
        if (draft !== (value ?? "")) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        else if (e.key === "Escape") {
          escRef.current = true;
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/** Slot box of the 22-ô grid: ô số badge + seri input + meta line. */
function SlotCell({ slot, onSerialCommit }: {
  slot: TyreBoardSlot;
  onSerialCommit: (raw: string) => void;
}) {
  const spare = SPARE_SLOTS[slot.position] === true;
  const empty = !slot.serial;
  const meta = empty
    ? (spare ? "Dự phòng" : "—")
    : [slot.brand, slot.treadType, fmtDateShort(slot.lastChangedAt)].filter(Boolean).join(" · ");
  const title = [`Ô ${slot.position} — ${SLOT_GROUP_BY_POSITION[slot.position]}`, slot.size, slot.model, slot.note]
    .filter(Boolean).join(" · ");

  return (
    <div className={`tbp-slot${spare ? " tbp-slot--spare" : ""}`} title={title}>
      <div className="tbp-slot-num">{slot.position}</div>
      <InlineCell
        value={slot.serial}
        onCommit={onSerialCommit}
        placeholder="—"
        className="tbp-slot-seri-input"
      />
      <div className="tbp-slot-meta">{meta}</div>
    </div>
  );
}

/**
 * Side-view line drawing (approved mockup geometry). Two orientations:
 * horizontal (tablet/desktop, mockup layout) and vertical — mũi xe hướng LÊN,
 * cabin trên cùng, rơ-moóc phía dưới (mobile ~390px, owner update).
 * Text labels stay horizontal in both.
 */
function TruckDiagram({ vertical }: { vertical: boolean }) {
  if (vertical) {
    return (
      <svg viewBox="0 0 130 560" width="100%" role="img" aria-label="Sơ đồ xe xoay dọc: cabin trên, thân xe kéo 2 trục động, rơ-moóc 3 trục phía dưới, lốp dự phòng">
        <rect x="25" y="14" width="80" height="78" rx="8" fill="none" stroke="#9fb3cc" strokeWidth="2" />
        <text x="65" y="56" fontSize="11" fill="#9fb3cc" textAnchor="middle">CABIN</text>
        <rect x="15" y="102" width="100" height="58" rx="6" fill="none" stroke="#9fb3cc" strokeWidth="2" />
        <text x="65" y="135" fontSize="9" fill="#9fb3cc" textAnchor="middle">THÂN XE KÉO</text>
        {/* Lốp dự phòng */}
        <rect x="57" y="170" width="16" height="10" rx="2" fill="#e8d97a" stroke="#b5a13a" />
        <g fill="#dfe7f1" stroke="#9fb3cc">
          {/* Trục trước */}
          <circle cx="30" cy="196" r="14" /><circle cx="100" cy="196" r="14" />
          {/* Trục động kép */}
          <circle cx="30" cy="244" r="14" /><circle cx="44" cy="244" r="14" />
          <circle cx="86" cy="244" r="14" /><circle cx="100" cy="244" r="14" />
        </g>
        <rect x="12" y="272" width="106" height="252" rx="6" fill="none" stroke="#9fb3cc" strokeWidth="2" />
        <text x="65" y="400" fontSize="10" fill="#9fb3cc" textAnchor="middle">RƠ-MOOC</text>
        <g fill="#dfe7f1" stroke="#9fb3cc">
          {/* 3 trục rơ-moóc, kép */}
          <circle cx="26" cy="508" r="12" /><circle cx="38" cy="508" r="12" />
          <circle cx="92" cy="508" r="12" /><circle cx="104" cy="508" r="12" />
          <circle cx="26" cy="538" r="12" /><circle cx="38" cy="538" r="12" />
          <circle cx="92" cy="538" r="12" /><circle cx="104" cy="538" r="12" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 1100 130" width="100%" role="img" aria-label="Sơ đồ xe: cabin, thân xe kéo 2 trục động, rơ-moóc 3 trục, lốp dự phòng">
      <rect x="30" y="30" width="150" height="55" rx="8" fill="none" stroke="#9fb3cc" strokeWidth="2" />
      <text x="105" y="62" fontSize="13" fill="#9fb3cc" textAnchor="middle">CABIN</text>
      <rect x="185" y="42" width="330" height="42" rx="6" fill="none" stroke="#9fb3cc" strokeWidth="2" />
      <text x="350" y="68" fontSize="12" fill="#9fb3cc" textAnchor="middle">THÂN XE KÉO</text>
      <rect x="545" y="34" width="510" height="55" rx="6" fill="none" stroke="#9fb3cc" strokeWidth="2" />
      <text x="800" y="66" fontSize="12" fill="#9fb3cc" textAnchor="middle">RƠ-MOOC</text>
      <g fill="#dfe7f1" stroke="#9fb3cc">
        <circle cx="70" cy="100" r="17" /><circle cx="235" cy="100" r="17" /><circle cx="272" cy="100" r="17" />
        <circle cx="330" cy="100" r="17" /><circle cx="367" cy="100" r="17" />
        <circle cx="700" cy="100" r="17" /><circle cx="737" cy="100" r="17" /><circle cx="820" cy="100" r="17" />
        <circle cx="857" cy="100" r="17" /><circle cx="940" cy="100" r="17" /><circle cx="977" cy="100" r="17" />
      </g>
      <rect x="420" y="88" width="34" height="12" rx="3" fill="#e8d97a" stroke="#b5a13a" />
      <text x="437" y="98" fontSize="9" textAnchor="middle" fill="#7a6b16">spare</text>
    </svg>
  );
}

/** Matches the CSS mobile breakpoint (≤640px) that flips the diagram vertical. */
function useIsNarrowViewport() {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function TyreBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: trucksDrivers } = useTrucksAndDrivers();
  const trucks = trucksDrivers?.trucks ?? [];

  const truckParam = Number(searchParams.get("truck"));
  const truckId = trucks.some((t) => t.id === truckParam) ? truckParam : (trucks[0]?.id ?? null);

  const { data: board, isLoading } = useTyreBoard(truckId);
  const { data: changes = [] } = useTyreBoardChanges(truckId);
  const updateSlot = useUpdateTyreSlot(truckId);
  const changeTyre = useChangeTyre(truckId);
  const { toast } = useToast();
  const isNarrow = useIsNarrowViewport();

  const commitCell = (position: number, patch: TyreBoardSlotUpdateInput) => {
    if (truckId == null) return;
    updateSlot.mutate(
      { position, patch },
      { onError: (err) => toast({ kind: "error", message: formatErrorMessage(err) }) },
    );
  };

  // ── "Thay lốp" dialog state ────────────────────────────────────────────
  const [changeTarget, setChangeTarget] = useState<TyreBoardSlot | null>(null);
  const [newSerial, setNewSerial] = useState("");
  const [changedAt, setChangedAt] = useState(todayISO());
  const [changeError, setChangeError] = useState<string | null>(null);

  const openChange = (slot: TyreBoardSlot) => {
    setChangeTarget(slot);
    setNewSerial(slot.serial ?? "");
    setChangedAt(todayISO());
    setChangeError(null);
  };

  const submitChange = async () => {
    if (!changeTarget) return;
    const serial = newSerial.trim();
    if (!serial) {
      setChangeError("Nhập số seri lốp mới");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(changedAt)) {
      setChangeError("Chọn ngày thay");
      return;
    }
    try {
      const result = await changeTyre.mutateAsync({ position: changeTarget.position, newSerial: serial, changedAt });
      toast({ kind: "success", message: `Đã thay lốp ô ${result.position}: ${result.oldSerial ?? "—"} → ${result.newSerial}` });
      setChangeTarget(null);
    } catch (err) {
      toast({ kind: "error", message: formatErrorMessage(err) });
    }
  };

  const slots = board?.slots ?? [];

  return (
    <div className="tbp">
      <Link to={routes.fleet} className="tbp-back">
        <ArrowLeft size={14} />
        Quay lại đội xe
      </Link>

      <div className="tbp-wrap">
        <div className="tbp-head">
          <h1>🛞 Bảng theo dõi lốp — Quản lý đội xe</h1>
          <div className="tbp-plate">Số xe: {board?.truckPlate ?? "…"}</div>
        </div>

        <div className="tbp-tabs" role="tablist" aria-label="Chọn xe">
          {trucks.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === truckId}
              className={`tbp-tab${t.id === truckId ? " active" : ""}`}
              onClick={() => setSearchParams({ truck: String(t.id) })}
            >
              {t.licensePlate}
            </button>
          ))}
          {trucks.length === 0 && <span className="tbp-tabs-empty">Chưa có đầu kéo trong đội xe.</span>}
        </div>

        {isLoading && <div className="tbp-loading">Đang tải bảng theo dõi lốp…</div>}

        {!isLoading && truckId != null && (
          <>
            <div className={`tbp-diagram${isNarrow ? " tbp-diagram--vertical" : ""}`}>
              <TruckDiagram vertical={isNarrow} />
            </div>

            <div className="tbp-map">
              {slots.map((slot) => (
                <SlotCell
                  key={slot.position}
                  slot={slot}
                  onSerialCommit={(raw) => commitCell(slot.position, { serial: raw })}
                />
              ))}
            </div>
            <div className="tbp-legend">
              Ô viền đứt = lốp dự phòng · Bấm vào ô để sửa trực tiếp · Nút "Thay lốp" lưu lịch sử (ngày, seri cũ → mới)
            </div>

            <table className="tbp-table">
              <thead>
                <tr>
                  <th>STT</th><th>Nhãn hiệu</th><th>Cỡ lốp</th><th>Loại gai</th><th>Số seri</th>
                  <th>Model</th><th>Ngày thay</th><th>Tuổi lốp</th><th>Ghi chú</th><th></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const age = tyreAgeDays(slot.lastChangedAt);
                  return (
                    <tr key={slot.position}>
                      <td className="tbp-td-stt">{slot.position}</td>
                      <td><InlineCell value={slot.brand} onCommit={(v) => commitCell(slot.position, { brand: v })} /></td>
                      <td><InlineCell value={slot.size} onCommit={(v) => commitCell(slot.position, { size: v })} /></td>
                      <td><InlineCell value={slot.treadType} onCommit={(v) => commitCell(slot.position, { treadType: v })} /></td>
                      <td className="tbp-td-serial"><InlineCell value={slot.serial} onCommit={(v) => commitCell(slot.position, { serial: v })} /></td>
                      <td><InlineCell value={slot.model} onCommit={(v) => commitCell(slot.position, { model: v })} /></td>
                      <td><InlineCell type="date" value={slot.lastChangedAt} onCommit={(v) => commitCell(slot.position, { lastChangedAt: v })} /></td>
                      <td className="tbp-age">{age != null ? `${age} ngày` : ""}</td>
                      <td><InlineCell value={slot.note} onCommit={(v) => commitCell(slot.position, { note: v })} /></td>
                      <td>
                        <button type="button" className="tbp-btn" onClick={() => openChange(slot)}>
                          Thay lốp
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {changes.length > 0 && (
              <section className="tbp-history">
                <h2>Lịch sử thay lốp</h2>
                <table className="tbp-table">
                  <thead>
                    <tr><th>Ngày thay</th><th>Ô</th><th>Vị trí</th><th>Seri cũ</th><th>Seri mới</th></tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.id}>
                        <td>{fmtDate(c.changedAt)}</td>
                        <td>{c.position}</td>
                        <td>{SLOT_GROUP_BY_POSITION[c.position]}</td>
                        <td>{c.oldSerial ?? "—"}</td>
                        <td className="tbp-td-serial">{c.newSerial}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        {!isLoading && truckId == null && (
          <div className="tbp-loading">Chưa có xe đầu kéo nào trong đội xe.</div>
        )}
      </div>

      <Modal
        isOpen={changeTarget != null}
        title={`Thay lốp — Ô ${changeTarget?.position ?? ""} (${changeTarget ? SLOT_GROUP_BY_POSITION[changeTarget.position] : ""})`}
        onClose={() => setChangeTarget(null)}
        onConfirm={submitChange}
        footer={(
          <>
            <button type="button" className="tbp-btn" onClick={() => setChangeTarget(null)}>Hủy</button>
            <button type="button" className="tbp-btn tbp-btn--primary" disabled={changeTyre.isPending} onClick={submitChange}>
              {changeTyre.isPending ? "Đang lưu…" : "Lưu thay lốp"}
            </button>
          </>
        )}
      >
        <div className="tbp-modal-field">
          <label htmlFor="tbp-new-serial">Số seri lốp mới</label>
          <input
            id="tbp-new-serial"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
            placeholder="VD: 32422059514"
            autoFocus
          />
        </div>
        <div className="tbp-modal-field">
          <label htmlFor="tbp-changed-at">Ngày thay</label>
          <input
            id="tbp-changed-at"
            type="date"
            value={changedAt}
            onChange={(e) => setChangedAt(e.target.value)}
          />
        </div>
        {changeError && <div className="tbp-modal-error">{changeError}</div>}
        <div className="tbp-modal-hint">
          Lưu lại sẽ ghi lịch sử: {changeTarget?.serial ?? "—"} → {newSerial.trim() || "…"} ngày {fmtDate(changedAt)}.
          Các cột khác (nhãn hiệu, model…) sửa trực tiếp trên bảng bên dưới.
        </div>
      </Modal>
    </div>
  );
}
