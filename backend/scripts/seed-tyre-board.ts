/**
 * NEPO-49 — Seed the tyre tracking board (bảng theo dõi lốp) from the
 * accountant's Excel workbook.
 *
 * Reads docs/design/THEO-DOI-LOP.xlsx (one sheet per vehicle, 22 data rows
 * each: STT | Nhãn hiệu | Cỡ lốp | Loại gai | Số seri | Model | Ngày thay |
 * Ghi chú) and upserts the rows into tyre_positions for the matching truck
 * (plate parsed from the sheet's "Số xe: <biển số>" cell; the truck is
 * created when missing). Fully-empty rows are skipped — the slot stays empty.
 *
 * Idempotent: re-running overwrites the 22 slots of the workbook's vehicles
 * with the workbook's values. Replacement history (tyre_changes) is NOT
 * seeded — the workbook has none; history grows from real "Thay lốp" usage.
 *
 * Run: cd backend && npx tsx scripts/seed-tyre-board.ts
 */
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';
import type { TyreBoardSlotUpdateInput } from '@tingting/shared';

/** Sheet order = the workbook's vehicle order; drives nothing else. */
const WORKBOOK_PATH = fileURLToPath(new URL('../../docs/design/THEO-DOI-LOP.xlsx', import.meta.url));
const DATA_FIRST_ROW = 40; // A39 header, A40 = STT 1 … A61 = STT 22

/** Flatten any ExcelJS cell value (string/number/Date/formula/rich text) to trimmed text. */
function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('result' in record) return cellText(record.result); // formula → cached result
    if (Array.isArray(record.richText)) {
      return record.richText.map((part) => cellText((part as Record<string, unknown>).text)).join('');
    }
    if ('text' in record) return cellText(record.text); // hyperlink
  }
  return '';
}

/** Date cell → YYYY-MM-DD ('' when empty). */
function cellDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = cellText(value);
  // dd/MM/yyyy from hand-typed cells → YYYY-MM-DD.
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return text;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

interface SheetRow {
  position: number;
  brand: string;
  size: string;
  treadType: string;
  serial: string;
  model: string;
  lastChangedAt: string;
  note: string;
}

const main = async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_PATH);

  for (const sheet of workbook.worksheets) {
    const plate = cellText(sheet.getCell('H2').value).replace(/^Số xe:\s*/i, '').trim();
    if (!plate) {
      console.log(`! Sheet "${sheet.name}": không tìm thấy "Số xe" ở H2 — bỏ qua`);
      continue;
    }

    let [truck] = await db.select({ id: s.trucks.id })
      .from(s.trucks)
      .where(eq(s.trucks.licensePlate, plate))
      .limit(1);
    if (!truck) {
      [truck] = await db.insert(s.trucks).values({ licensePlate: plate }).returning({ id: s.trucks.id });
      console.log(`+ Tạo xe mới ${plate} (#${truck.id})`);
    }

    const rows: SheetRow[] = [];
    for (let row = DATA_FIRST_ROW; row <= DATA_FIRST_ROW + 21; row++) {
      const position = Number.parseInt(cellText(sheet.getCell(`A${row}`).value), 10);
      const entry: SheetRow = {
        position,
        brand: cellText(sheet.getCell(`B${row}`).value),
        size: cellText(sheet.getCell(`C${row}`).value),
        treadType: cellText(sheet.getCell(`D${row}`).value),
        serial: cellText(sheet.getCell(`E${row}`).value),
        model: cellText(sheet.getCell(`F${row}`).value),
        lastChangedAt: cellDate(sheet.getCell(`G${row}`).value),
        note: cellText(sheet.getCell(`J${row}`).value),
      };
      // Fully-empty row (e.g. ô 5 của 136.31) → the slot stays empty.
      if (!Number.isInteger(entry.position) || !entry.serial) continue;
      rows.push(entry);
    }

    for (const entry of rows) {
      const patch: TyreBoardSlotUpdateInput & { serial: string | null } = {
        serial: entry.serial || null,
        brand: entry.brand || null,
        size: entry.size || null,
        treadType: entry.treadType || null,
        model: entry.model || null,
        note: entry.note || null,
        lastChangedAt: entry.lastChangedAt || null,
      };
      const [existing] = await db.select({ id: s.tyrePositionsBoard.id })
        .from(s.tyrePositionsBoard)
        .where(and(
          eq(s.tyrePositionsBoard.truckId, truck.id),
          eq(s.tyrePositionsBoard.positionNumber, entry.position),
        ))
        .limit(1);
      if (existing) {
        await db.update(s.tyrePositionsBoard).set({ ...patch }).where(eq(s.tyrePositionsBoard.id, existing.id));
      } else {
        await db.insert(s.tyrePositionsBoard).values({ truckId: truck.id, positionNumber: entry.position, ...patch });
      }
    }
    console.log(`= ${plate}: ${rows.length}/22 ô có dữ liệu`);
  }

  await client.end();
};

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
