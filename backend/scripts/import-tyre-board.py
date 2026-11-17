#!/usr/bin/env python3
"""NEPO-49 — import real tyre data from THEO_DOI_LOP.xlsx into the tyre board.

Parses the accountant's workbook (one sheet per vehicle) and prints idempotent
SQL on STDOUT for the tyre-board tables (trucks / tyre_positions /
tyre_changes, migration backend/drizzle/0130_tyre_board.sql). A human-readable
parse report goes to STDERR.

Sheet layout (verified against the workbook, mirrors
backend/scripts/seed-tyre-board.ts):
  H2     = "Số xe: <biển>"  → trucks.license_plate (kept verbatim)
  rows 40..61 = the 22 numbered slots (A39 header row):
    A=STT B=Nhãn hiệu C=Cỡ lốp D=Loại gai E=Số seri F=Model G=Ngày thay
    H=Tuổi lốp (computed, ignored)  J=Ghi chú
  rows 62+ with data but no STT = unnumbered loose-tyre / change-log rows
    (no position_number) → NOT imported (tyre_positions.position_number is
    NOT NULL and the sheet does not say which slot they belong to); they are
    listed on STDERR for the accountant to place manually.

Semantics:
  - Every numbered row with ANY data is upserted (ON CONFLICT truck+position
    DO UPDATE), so slots that carry brand/size/tread but no serial (168.73
    pos 5–22) keep that data. Fully-empty numbered rows are skipped — the
    slot stays empty (the service reads missing rows as empty slots).
  - Serial '' / '0' / 0 is the sheet's empty sentinel → NULL.
  - 'Ngày thay' (G) → tyre_positions.last_changed_at.
  - tyre_changes rows are written ONLY where the sheet states an explicit
    old → new pair at a known position (see DERIVED_CHANGES below); plain
    cell edits write no history row, matching the app's two write paths.

Usage (demo example — same command shape for PROD later):
  python3 import_tyre_board.py THEO_DOI_LOP.xlsx > import.sql   # report on stderr
  python3 import_tyre_board.py THEO_DOI_LOP.xlsx \
    | ssh root@demo.tingting.vip "docker exec -i demo-postgres-1 psql -U demo -d demo"

Idempotent: re-running upserts the same values and the guarded
tyre_changes inserts (WHERE NOT EXISTS) stay singletons.
"""

import datetime as dt
import re
import sys
from typing import Optional

import openpyxl

DATA_FIRST_ROW = 40
SLOT_COUNT = 22

# One explicit replacement event is derivable from the workbook:
# sheet '168.73', unnumbered row 66 (serial 295204002, note
# "gửi bảo hành ngày 03/6 thay bằng 525113013") — position 2 currently holds
# 525113013 with ngày thay 2026-06-03 (= 03/6), so the replaced serial at
# that position is 295204002. All other unnumbered rows lack a position or an
# old→new pair and are reported, not imported (no guessing).
DERIVED_CHANGES = [
    {"plate": "15H-168.73", "position": 2, "old": "295204002",
     "new": "525113013", "changed_at": "2026-06-03"},
]


def cell_text(value) -> str:
    """Flatten any cell value to trimmed text ('' when empty)."""
    if value is None:
        return ""
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, int):
        return str(value)
    return str(value).strip()


def cell_date(value) -> str:
    """Date cell → YYYY-MM-DD ('' when empty; dd/MM/yyyy text is normalized)."""
    if isinstance(value, (dt.datetime, dt.date)):
        return cell_text(value)
    text = cell_text(value)
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if not m:
        return text
    day, month, year = m.groups()
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def serial_or_null(value) -> Optional[str]:
    """Serial cell → text, '' / '0' sentinel → None."""
    text = cell_text(value)
    return text if text and text != "0" else None


def q(text: str) -> str:
    """SQL string literal (standard_conforming_strings=on)."""
    return "'" + text.replace("'", "''") + "'"


def qn(value: Optional[str]) -> str:
    # '' → NULL, matching the app/seed semantics (empty cell clears the field).
    return "NULL" if value is None or value == "" else q(value)


def parse_sheet(ws):
    """→ (plate, slots, unmapped_rows, warnings)."""
    plate = cell_text(ws["H2"].value)
    plate = re.sub(r"^Số xe:\s*", "", plate, flags=re.IGNORECASE).strip()
    if not plate:
        raise SystemExit(f"sheet {ws.title!r}: no 'Số xe' in H2")

    slots, warnings = [], []
    for row in range(DATA_FIRST_ROW, DATA_FIRST_ROW + SLOT_COUNT):
        raw_pos = cell_text(ws.cell(row=row, column=1).value)
        if not raw_pos.isdigit():
            raise SystemExit(f"sheet {ws.title!r} row {row}: STT {raw_pos!r} is not a position 1-22")
        slot = {
            "position": int(raw_pos),
            "brand": cell_text(ws.cell(row=row, column=2).value),
            "size": cell_text(ws.cell(row=row, column=3).value),
            "tread": cell_text(ws.cell(row=row, column=4).value),
            "serial": serial_or_null(ws.cell(row=row, column=5).value),
            "model": cell_text(ws.cell(row=row, column=6).value),
            "changed_at": cell_date(ws.cell(row=row, column=7).value),
            "note": cell_text(ws.cell(row=row, column=10).value),
        }
        slots.append(slot)

    by_serial = {}
    for slot in slots:
        if slot["serial"]:
            by_serial.setdefault(slot["serial"], []).append(slot["position"])
    for serial, positions in by_serial.items():
        if len(positions) > 1:
            warnings.append(f"{plate}: serial {serial} appears at positions {positions}")

    unmapped = []
    for row in range(DATA_FIRST_ROW + SLOT_COUNT, ws.max_row + 1):
        values = {col: cell_text(ws.cell(row=row, column=col).value)
                  for col in range(1, 11)}
        if not any(values[col] for col in (2, 3, 4, 5, 6, 7, 10)):
            continue  # blank row
        unmapped.append({
            "row": row,
            "brand": values[2], "size": values[3], "tread": values[4],
            "serial": serial_or_null(ws.cell(row=row, column=5).value),
            "model": values[6], "changed_at": values[7], "note": values[10],
        })

    return plate, slots, unmapped, warnings


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: import_tyre_board.py THEO_DOI_LOP.xlsx")
    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)

    out = []
    out.append("-- generated by import_tyre_board.py — NEPO-49 real tyre data import")
    out.append("BEGIN;")
    all_warnings = []
    report = []

    for ws in wb.worksheets:
        plate, slots, unmapped, warnings = parse_sheet(ws)
        all_warnings += warnings

        out.append(f"-- ===== {plate} (sheet {ws.title!r}) =====")
        out.append(
            "INSERT INTO trucks (license_plate) VALUES (%s) "
            "ON CONFLICT (license_plate) DO NOTHING;" % q(plate)
        )

        imported = 0
        empty_positions = []
        no_serial_positions = []
        for slot in slots:
            if not slot["serial"]:
                no_serial_positions.append(slot["position"])
            has_data = any((slot["serial"], slot["brand"], slot["size"],
                            slot["tread"], slot["model"], slot["changed_at"], slot["note"]))
            if not has_data:
                empty_positions.append(slot["position"])
                continue
            imported += 1
            out.append(
                "INSERT INTO tyre_positions "
                "(truck_id, position_number, serial, brand, size, tread_type, model, last_changed_at, note) "
                "VALUES ((SELECT id FROM trucks WHERE license_plate = %s), %d, %s, %s, %s, %s, %s, %s::date, %s) "
                "ON CONFLICT (truck_id, position_number) DO UPDATE SET "
                "serial = EXCLUDED.serial, brand = EXCLUDED.brand, size = EXCLUDED.size, "
                "tread_type = EXCLUDED.tread_type, model = EXCLUDED.model, "
                "last_changed_at = EXCLUDED.last_changed_at, note = EXCLUDED.note, "
                "updated_at = now();"
                % (q(plate), slot["position"], qn(slot["serial"]), qn(slot["brand"]),
                   qn(slot["size"]), qn(slot["tread"]), qn(slot["model"]),
                   qn(slot["changed_at"]), qn(slot["note"]))
            )

        for change in DERIVED_CHANGES:
            if change["plate"] != plate:
                continue
            out.append(
                "INSERT INTO tyre_changes (truck_id, position_number, old_serial, new_serial, changed_at) "
                "SELECT (SELECT id FROM trucks WHERE license_plate = %s), %d, %s, %s, %s::date "
                "WHERE NOT EXISTS (SELECT 1 FROM tyre_changes WHERE truck_id = "
                "(SELECT id FROM trucks WHERE license_plate = %s) AND position_number = %d "
                "AND old_serial IS NOT DISTINCT FROM %s AND new_serial = %s AND changed_at = %s::date);"
                % (q(plate), change["position"], qn(change["old"]), qn(change["new"]),
                   q(change["changed_at"]), q(plate), change["position"],
                   qn(change["old"]), qn(change["new"]), q(change["changed_at"]))
            )

        report.append((plate, ws.title, imported, empty_positions, no_serial_positions, unmapped))

    out.append("COMMIT;")
    print("\n".join(out))

    for plate, title, imported, empty_positions, no_serial_positions, unmapped in report:
        print(f"[report] {plate} (sheet {title!r}): {imported}/{SLOT_COUNT} slot rows imported"
              f"{'; fully-empty slots (skipped): ' + ','.join(map(str, empty_positions)) if empty_positions else ''}"
              f"{'; slots without serial: ' + ','.join(map(str, no_serial_positions)) if no_serial_positions else ''}",
              file=sys.stderr)
        for row in unmapped:
            print(f"[unmapped] {plate} sheet row {row['row']}: serial={row['serial']!r} "
                  f"model={row['model']!r} date={row['changed_at']!r} note={row['note']!r} "
                  "(no STT — not imported)", file=sys.stderr)
    for warning in all_warnings:
        print(f"[warning] {warning}", file=sys.stderr)


if __name__ == "__main__":
    main()
