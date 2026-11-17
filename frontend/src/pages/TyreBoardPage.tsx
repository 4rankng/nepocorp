import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { TyreBoardSlot, TyreBoardSlotUpdateInput } from "@tingting/shared";

import { Modal } from "../components/UI";
import { useToast } from "../components/shared/Toast";
import { formatErrorMessage } from "../lib/api";
import { routes } from "../lib/routes";
import { todayISO } from "../features/tires/tireUtils";
import { InlineCell } from "../features/tyre-board/TyreInlineCell";
import { TyreTruckDiagram } from "../features/tyre-board/TyreTruckDiagram";
import { SLOT_GROUP_BY_POSITION } from "../features/tyre-board/tyrePositions";
import { useTrucksAndDrivers } from "../hooks/useCatalogQueries";
import { useTyreBoard, useTyreBoardChanges, useUpdateTyreSlot, useChangeTyre } from "../hooks/useTyreBoardQueries";
import "./TyreBoardPage.css";

/**
 * NEPO-49 — Bảng theo dõi lốp (tyre tracking board), `/fleet/tyre-board`.
 *
 * Replicates the accountant's Excel sheet (docs/design/THEO-DOI-LOP.xlsx):
 * head with the "Số xe" badge, vehicle tabs, one annotated truck drawing
 * (decorative side view + top view carrying all 22 numbered positions with
 * their serials — portrait variant on ≤640px), and the full data table with a
 * "Thay lốp" button per row. Serials are editable in place on the drawing
 * (plain slot patch, no history row) and in the table; "Thay lốp" swaps the
 * serial on a given day and records history (ngày, seri cũ → seri mới) shown
 * in the section below the table.
 */

/** YYYY-MM-DD → dd/MM/yyyy ('' stays ''). */
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
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

/** Matches the CSS mobile breakpoint (≤640px) that flips the diagram portrait. */
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
            <div className={`tbp-diagram${isNarrow ? " tbp-diagram--portrait" : ""}`}>
              <TyreTruckDiagram slots={slots} vertical={isNarrow} onSerialCommit={(position, raw) => commitCell(position, { serial: raw })} />
            </div>
            <div className="tbp-legend">
              Số seri sửa trực tiếp trên sơ đồ · Ô vàng đứt = dự phòng · Nút "Thay lốp" ở bảng dưới lưu lịch sử (ngày, seri cũ → mới)
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
