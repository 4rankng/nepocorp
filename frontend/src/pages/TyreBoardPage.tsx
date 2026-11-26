import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { TyreBoardSlot, TyreBoardSlotUpdateInput } from "@tingting/shared";

import { Modal } from "../components/UI";
import { Banner } from "../components/shared/Banner";
import { useToast } from "../components/shared/Toast";
import { formatErrorMessage } from "../lib/api";
import { routes } from "../lib/routes";
import { daysBetween, todayISO } from "../features/tires/tireUtils";
import { InlineCell } from "../features/tyre-board/TyreInlineCell";
import { TyreTruckDiagram } from "../features/tyre-board/TyreTruckDiagram";
import { tyreStatus, type TyreStatus } from "../features/tyre-board/tyreStatus";
import { SLOT_GROUP_BY_POSITION, SPARE_POSITIONS } from "../features/tyre-board/tyrePositions";
import { useTrucksAndDrivers } from "../hooks/useCatalogQueries";
import { useTyreBoard, useTyreBoardChanges, useUpdateTyreSlot, useChangeTyre } from "../hooks/useTyreBoardQueries";
import "./TyreBoardPage.css";

/**
 * NEPO-49 — Bảng theo dõi lốp (tyre tracking board), `/fleet/tyre-board`.
 *
 * Replicates the accountant's Excel sheet (docs/design/THEO-DOI-LOP.xlsx):
 * head with the "Số xe" badge, vehicle tabs, one annotated truck drawing
 * (decorative side view + top view carrying all 22 numbered positions with
 * their serials — compact portrait variant on ≤640px), and the full data
 * table with a "Thay lốp" button per row (≤640px: a data-dense 11/12px slot
 * list instead — no wide table on phones). Serials are editable in place on the drawing
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

// Tuổi lốp = whole days from ngày thay to today (Excel: DAYS(TODAY(), G)).

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

  const slots = board?.slots ?? [];
  const commitCell = (position: number, patch: TyreBoardSlotUpdateInput) => {
    if (truckId == null) return;
    // Báo trùng ngay khi nhập seri trên ô dòng (cùng xe); xe khác backend
    // chặn bằng 409 kèm biển xe + ô, toast hiển thị nguyên văn.
    if (patch.serial !== undefined && patch.serial.trim() !== "") {
      const incoming = patch.serial.trim().toLowerCase();
      const dup = slots.find((s) =>
        s.position !== position && (s.serial ?? "").trim().toLowerCase() === incoming,
      );
      if (dup) {
        toast({ kind: "error", message: `Số seri ${patch.serial.trim()} đã có ở ô ${dup.position} của xe này — một seri lốp chỉ gắn một vị trí` });
        return;
      }
    }
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

  // Báo trùng ngay khi nhập (yêu cầu kế toán 26/11): seri mới trùng một ô
  // khác trên bảng của xe này → chặn lưu. Xe khác do backend chặn (409 kèm
  // biển xe + ô) và toast hiển thị nguyên văn.
  const changeDupPosition = changeTarget
    ? slots.find((s) =>
        s.position !== changeTarget.position
        && newSerial.trim() !== ""
        && (s.serial ?? "").trim().toLowerCase() === newSerial.trim().toLowerCase(),
      )?.position ?? null
    : null;

  const submitChange = async () => {
    if (!changeTarget) return;
    const serial = newSerial.trim();
    if (!serial) {
      setChangeError("Nhập số seri lốp mới");
      return;
    }
    if (changeDupPosition != null) {
      setChangeError(`Số seri ${serial} đã có ở ô ${changeDupPosition} của xe này — một seri lốp chỉ gắn một vị trí`);
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

  const statusCounts = slots.reduce<Record<TyreStatus, number>>((acc, s) => {
    acc[tyreStatus(s)] += 1;
    return acc;
  }, { good: 0, warn: 0, bad: 0, empty: 0 });
  const badSlots = slots.filter((s) => tyreStatus(s) === "bad").map((s) => s.position);
  const warnSlots = slots.filter((s) => tyreStatus(s) === "warn").map((s) => s.position);

  return (
    <div className="tbp">
      <Link to={routes.fleet} className="tbp-back">
        <ArrowLeft size={14} />
        Quay lại đội xe
      </Link>

      <div className="tbp-wrap">
        <div className="tbp-head">
          <h1>🛞 Bảng theo dõi lốp</h1>
          <div className="tbp-plate">Số xe: {board?.truckPlate ?? "…"}</div>
        </div>

        {(badSlots.length > 0 || warnSlots.length > 0) && (
          <Banner variant="warning" dismissKey={`tyre-aged-${truckId}`}>
            {badSlots.length > 0 && (<>Lốp cần thay: ô <b>{badSlots.join(", ")}</b>.</>)}
            {badSlots.length > 0 && warnSlots.length > 0 && " "}
            {warnSlots.length > 0 && (<>Cần chú ý/bảo trì: ô <b>{warnSlots.join(", ")}</b>.</>)}
        </Banner>
        )}

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
              Màu lốp theo tuổi: <b>{statusCounts.good}</b> tốt · <b>{statusCounts.warn}</b> cần chú ý · <b>{statusCounts.bad}</b> cần thay · <b>{statusCounts.empty}</b> chưa lắp — ô nét đứt là dự phòng. Số seri sửa trực tiếp trên sơ đồ; nút "Thay lốp" lưu lịch sử (ngày, seri cũ → mới).
            </div>

            {isNarrow ? (
              /* Mobile: no wide table — dense cards for mounted tyres, and
                 one dashed strip of position chips for the empty slots (tap
                 a chip to install: Thay lốp sets serial + ngày). */
              <div className="tbp-slotlist">
                {slots.filter((s) => s.serial || s.brand || s.model || s.size || s.treadType || s.note || s.lastChangedAt).map((slot) => {
                  const age = daysBetween(slot.lastChangedAt, null);
                  const st = tyreStatus(slot);
                  const spare = SPARE_POSITIONS[slot.position] === true;
                  return (
                    <div key={slot.position} className={`tbp-slot st-${st}${spare ? " is-spare" : ""}`}>
                      <div className="tbp-slot-head">
                        <span className="tbp-slot-pos">{slot.position}</span>
                        <span className="tbp-slot-group">{SLOT_GROUP_BY_POSITION[slot.position]}</span>
                        <button type="button" className="tbp-btn" onClick={() => openChange(slot)}>
                          Thay lốp
                        </button>
                      </div>
                      <div className="tbp-slot-body">
                        <div className="tbp-slot-row">
                          <span className="tbp-slot-pair">
                            <InlineCell wrap value={slot.brand} onCommit={(v) => commitCell(slot.position, { brand: v })} ariaLabel={`Nhãn hiệu ô ${slot.position}`} />
                            <InlineCell wrap value={slot.model} onCommit={(v) => commitCell(slot.position, { model: v })} className="tbp-cell-sub" ariaLabel={`Model ô ${slot.position}`} />
                          </span>
                          <span className="tbp-slot-pair tbp-slot-pair--end">
                            <InlineCell wrap value={slot.size} onCommit={(v) => commitCell(slot.position, { size: v })} ariaLabel={`Cỡ lốp ô ${slot.position}`} />
                            <InlineCell wrap value={slot.treadType} onCommit={(v) => commitCell(slot.position, { treadType: v })} className="tbp-cell-sub" ariaLabel={`Loại gai ô ${slot.position}`} />
                          </span>
                        </div>
                        <div className="tbp-slot-row">
                          <InlineCell className="tbp-cell-bold" value={slot.serial} onCommit={(v) => commitCell(slot.position, { serial: v })} />
                          <span className="tbp-slot-when">
                            <InlineCell type="date" value={slot.lastChangedAt} onCommit={(v) => commitCell(slot.position, { lastChangedAt: v })} ariaLabel={`Ngày thay ô ${slot.position}`} />
                            {age != null && <span className="tbp-age">{age} ngày</span>}
                          </span>
                        </div>
                        {slot.note && (
                          <div className="tbp-slot-row">
                            <InlineCell wrap value={slot.note} onCommit={(v) => commitCell(slot.position, { note: v })} className="tbp-cell-sub" ariaLabel={`Ghi chú ô ${slot.position}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const empties = slots.filter((s) => !(s.serial || s.brand || s.model || s.size || s.treadType || s.note || s.lastChangedAt));
                  return empties.length > 0 && (
                    <div className="tbp-slot tbp-slot--empties">
                      <span className="tbp-slot-empties-label">Chưa lắp</span>
                      {empties.map((s) => (
                        <button
                          key={s.position}
                          type="button"
                          className="tbp-slot-chip"
                          aria-label={`Thay lốp ô ${s.position}`}
                          title={`Lắp lốp ô ${s.position}`}
                          onClick={() => openChange(s)}
                        >
                          {s.position}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="tbp-table-scroll tbp-table-scroll--main">
                <table className="tbp-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nhãn hiệu · Model</th>
                    <th>Cỡ lốp · Loại gai</th>
                    <th>Số seri</th>
                    <th>Ngày thay · Tuổi</th>
                    <th>Ghi chú</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => {
                    const age = daysBetween(slot.lastChangedAt, null);
                    return (
                      <tr key={slot.position}>
                        <td className="tbp-td-stt">{slot.position}</td>
                        <td>
                          <div className="tbp-td-stack">
                            <InlineCell wrap value={slot.brand} onCommit={(v) => commitCell(slot.position, { brand: v })} ariaLabel={`Nhãn hiệu ô ${slot.position}`} />
                            <InlineCell wrap value={slot.model} onCommit={(v) => commitCell(slot.position, { model: v })} className="tbp-cell-sub" ariaLabel={`Model ô ${slot.position}`} />
                          </div>
                        </td>
                        <td>
                          <div className="tbp-td-stack">
                            <InlineCell wrap value={slot.size} onCommit={(v) => commitCell(slot.position, { size: v })} ariaLabel={`Cỡ lốp ô ${slot.position}`} />
                            <InlineCell wrap value={slot.treadType} onCommit={(v) => commitCell(slot.position, { treadType: v })} className="tbp-cell-sub" ariaLabel={`Loại gai ô ${slot.position}`} />
                          </div>
                        </td>
                        <td className="tbp-td-serial"><InlineCell value={slot.serial} onCommit={(v) => commitCell(slot.position, { serial: v })} /></td>
                        <td>
                          <div className="tbp-td-stack">
                            <InlineCell type="date" value={slot.lastChangedAt} onCommit={(v) => commitCell(slot.position, { lastChangedAt: v })} ariaLabel={`Ngày thay ô ${slot.position}`} />
                            <span className="tbp-age">{age != null ? `${age} ngày` : ""}</span>
                          </div>
                        </td>
                        <td><InlineCell wrap value={slot.note} onCommit={(v) => commitCell(slot.position, { note: v })} ariaLabel={`Ghi chú ô ${slot.position}`} /></td>
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
              </div>
            )}

            {changes.length > 0 && (
              <section className="tbp-history">
                <h2>Lịch sử thay lốp</h2>
                <div className="tbp-table-scroll">
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
                </div>
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
            <button type="button" className="tbp-btn tbp-btn--primary" disabled={changeTyre.isPending || changeDupPosition != null} onClick={submitChange}>
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
          {changeDupPosition != null && (
            <div className="tbp-modal-error">Trùng số seri với ô {changeDupPosition} của xe này — nhập seri khác.</div>
          )}
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
          Các thông tin khác (nhãn hiệu, cỡ lốp…) sửa trực tiếp trên sơ đồ / danh sách.
        </div>
      </Modal>
    </div>
  );
}
