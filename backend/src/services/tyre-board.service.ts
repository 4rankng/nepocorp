import { db } from '../db';
import * as s from '../db/schema';
import { and, desc, eq, ne, or, sql } from 'drizzle-orm';
import { TYRE_BOARD_POSITION_COUNT } from '@tingting/shared';
import type { TyreBoard, TyreBoardSlot, TyreBoardSlotUpdateInput, TyreChangeRecord } from '@tingting/shared';
import { ApiError } from '../errors';

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * NEPO-49 — Tyre board (Bảng theo dõi lốp) service.
 *
 * A per-truck tracking sheet mirroring the accountant's Excel
 * (docs/design/THEO-DOI-LOP.xlsx): 22 numbered slots — 1–2 trục trước,
 * 3–6 trục động, 7–10 dự phòng thân, 11–22 rơ-moóc (3 trục × 4 ô). Each slot
 * is one data row of the sheet (nhãn hiệu, cỡ lốp, loại gai, số seri, model,
 * ngày thay, ghi chú); tuổi lốp is derived client-side from lastChangedAt.
 * The board is position-centric state, deliberately separate from the
 * inventory-oriented `tires` lifecycle.
 *
 * Two write paths, matching the accountant's workflow:
 *   - updateTyreSlot → inline cell edit / initial data entry. Writes NO
 *     history row; omitted fields keep their value, '' clears.
 *   - replaceTyreAtPosition → "Thay lốp": swap in a new serial on a given day,
 *     set ngày thay, and record (ngày, seri cũ → seri mới) in tyre_changes —
 *     atomically with the slot update.
 */

export function assertValidTyrePosition(position: number): void {
  if (!Number.isInteger(position) || position < 1 || position > TYRE_BOARD_POSITION_COUNT) {
    throw new ApiError(400, `Vị trí lốp phải từ 1 đến ${TYRE_BOARD_POSITION_COUNT}`);
  }
}

/** The board lives on a truck (đầu kéo); the plate is the sheet's "Số xe". */
async function assertTruckExists(truckId: number): Promise<{ id: number; licensePlate: string }> {
  if (!Number.isInteger(truckId) || truckId < 1) {
    throw new ApiError(400, 'ID xe không hợp lệ');
  }
  const [truck] = await db.select({ id: s.trucks.id, licensePlate: s.trucks.licensePlate })
    .from(s.trucks)
    .where(eq(s.trucks.id, truckId))
    .limit(1);
  if (!truck) throw new ApiError(404, 'Không tìm thấy xe');
  return truck;
}

/** Missing rows read as empty slots — rows materialize on first write only. */
function emptySlots(): TyreBoardSlot[] {
  return Array.from({ length: TYRE_BOARD_POSITION_COUNT }, (_, i) => ({
    position: i + 1,
    brand: null,
    size: null,
    treadType: null,
    serial: null,
    model: null,
    lastChangedAt: null,
    note: null,
  }));
}

/**
 * The full sheet for one truck: always exactly 22 ordered slots.
 */
export async function getTyreBoard(truckId: number): Promise<TyreBoard> {
  const truck = await assertTruckExists(truckId);

  const rows = await db.select()
    .from(s.tyrePositionsBoard)
    .where(eq(s.tyrePositionsBoard.truckId, truckId));

  const byPosition = new Map(rows.map((r) => [r.positionNumber, r]));
  const slots = emptySlots();
  for (const slot of slots) {
    const row = byPosition.get(slot.position);
    if (!row) continue;
    slot.brand = row.brand;
    slot.size = row.size;
    slot.treadType = row.treadType;
    slot.serial = row.serial;
    slot.model = row.model;
    slot.lastChangedAt = row.lastChangedAt;
    slot.note = row.note;
  }
  return { truckId: truck.id, truckPlate: truck.licensePlate, slots };
}

/** Trimmed; '' clears, undefined keeps the current value. */
function mergeField(patchValue: string | undefined, current: string | null): string | null {
  if (patchValue === undefined) return current ?? null;
  const trimmed = patchValue.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Một seri lốp chỉ gắn một vị trí — fleet-wide duplicate check (yêu cầu kế
 * toán 26/11: "báo trùng khi nhập số seri giống nhau"). So sánh không phân
 * biệt hoa/thường và khoảng trắng; ô đang sửa không tự trùng với chính nó.
 * '' (xóa trắng) luôn hợp lệ. Chạy trong transaction của caller khi có.
 */
async function assertSlotSerialAvailable(
  executor: DbOrTx,
  serial: string,
  own: { truckId: number; position: number },
): Promise<void> {
  const normalized = serial.trim().toLowerCase();
  if (!normalized) return;
  const [conflict] = await executor
    .select({
      truckId: s.tyrePositionsBoard.truckId,
      positionNumber: s.tyrePositionsBoard.positionNumber,
    })
    .from(s.tyrePositionsBoard)
    .where(and(
      sql`lower(btrim(coalesce(${s.tyrePositionsBoard.serial}, ''))) = ${normalized}`,
      // NOT (same truck AND same position) — the slot's own row never self-conflicts.
      or(
        ne(s.tyrePositionsBoard.truckId, own.truckId),
        ne(s.tyrePositionsBoard.positionNumber, own.position),
      ),
    ))
    .limit(1);
  if (!conflict) return;
  const [truck] = await executor
    .select({ licensePlate: s.trucks.licensePlate })
    .from(s.trucks)
    .where(eq(s.trucks.id, conflict.truckId))
    .limit(1);
  throw new ApiError(
    409,
    `Số seri ${serial.trim()} đã có ở xe ${truck?.licensePlate ?? conflict.truckId} ô ${conflict.positionNumber} — một seri lốp chỉ gắn một vị trí`,
  );
}

/**
 * Inline cell edit (initial data entry / correction) on any subset of the
 * slot's data row. Intentionally records NO history row — history belongs to
 * the "Thay lốp" flow, which carries its own date. Upsert keeps the API
 * idempotent and avoids seeding rows for slots never touched.
 */
export async function updateTyreSlot(
  truckId: number,
  position: number,
  patch: TyreBoardSlotUpdateInput,
): Promise<TyreBoardSlot> {
  assertValidTyrePosition(position);
  await assertTruckExists(truckId);

  const [existing] = await db.select()
    .from(s.tyrePositionsBoard)
    .where(and(
      eq(s.tyrePositionsBoard.truckId, truckId),
      eq(s.tyrePositionsBoard.positionNumber, position),
    ))
    .limit(1);

  const merged = {
    serial: mergeField(patch.serial, existing?.serial ?? null),
    brand: mergeField(patch.brand, existing?.brand ?? null),
    size: mergeField(patch.size, existing?.size ?? null),
    treadType: mergeField(patch.treadType, existing?.treadType ?? null),
    model: mergeField(patch.model, existing?.model ?? null),
    note: mergeField(patch.note, existing?.note ?? null),
    lastChangedAt: patch.lastChangedAt !== undefined
      ? (patch.lastChangedAt === '' ? null : patch.lastChangedAt)
      : (existing?.lastChangedAt ?? null),
  };

  if (merged.serial) {
    await assertSlotSerialAvailable(db, merged.serial, { truckId, position });
  }

  const [row] = await db.insert(s.tyrePositionsBoard)
    .values({ truckId, positionNumber: position, ...merged })
    .onConflictDoUpdate({
      target: [s.tyrePositionsBoard.truckId, s.tyrePositionsBoard.positionNumber],
      set: { ...merged, updatedAt: new Date() },
    })
    .returning();

  return {
    position,
    brand: row.brand,
    size: row.size,
    treadType: row.treadType,
    serial: row.serial,
    model: row.model,
    lastChangedAt: row.lastChangedAt,
    note: row.note,
  };
}

/**
 * "Thay lốp" at one slot: record (ngày, seri cũ → seri mới) then update the
 * slot's serial + ngày thay, in one transaction so history and state can't
 * drift apart. Other slot fields stay — the accountant corrects them inline
 * if the replacement tyre differs.
 */
export async function replaceTyreAtPosition(
  truckId: number,
  position: number,
  input: { newSerial: string; changedAt: string },
): Promise<{ position: number; oldSerial: string | null; newSerial: string; changedAt: string }> {
  assertValidTyrePosition(position);
  await assertTruckExists(truckId);
  const newSerial = input.newSerial.trim();

  return db.transaction(async (tx) => {
    // Fleet-wide duplicate guard before any write — a rejected replacement
    // must not leave a history row behind.
    if (newSerial) {
      await assertSlotSerialAvailable(tx, newSerial, { truckId, position });
    }
    const [current] = await tx.select()
      .from(s.tyrePositionsBoard)
      .where(and(
        eq(s.tyrePositionsBoard.truckId, truckId),
        eq(s.tyrePositionsBoard.positionNumber, position),
      ))
      .limit(1);
    const oldSerial = current?.serial ?? null;

    await tx.insert(s.tyreChanges).values({
      truckId,
      positionNumber: position,
      oldSerial,
      newSerial,
      changedAt: input.changedAt,
    });

    await tx.insert(s.tyrePositionsBoard)
      .values({ truckId, positionNumber: position, serial: newSerial, lastChangedAt: input.changedAt })
      .onConflictDoUpdate({
        target: [s.tyrePositionsBoard.truckId, s.tyrePositionsBoard.positionNumber],
        set: { serial: newSerial, lastChangedAt: input.changedAt, updatedAt: new Date() },
      });

    return { position, oldSerial, newSerial, changedAt: input.changedAt };
  });
}

/**
 * Replacement history for the truck, newest first (optionally one slot).
 * Bounded at 500 rows — one truck's sheet history; the UI pages don't need
 * more and this keeps the endpoint flat.
 */
export async function getTyreChanges(truckId: number, position?: number): Promise<TyreChangeRecord[]> {
  await assertTruckExists(truckId);
  if (position != null) assertValidTyrePosition(position);

  const where = position != null
    ? and(eq(s.tyreChanges.truckId, truckId), eq(s.tyreChanges.positionNumber, position))
    : eq(s.tyreChanges.truckId, truckId);

  const rows = await db.select()
    .from(s.tyreChanges)
    .where(where)
    .orderBy(desc(s.tyreChanges.changedAt), desc(s.tyreChanges.id))
    .limit(500);

  return rows.map((r) => ({
    id: r.id,
    truckId: r.truckId,
    position: r.positionNumber,
    oldSerial: r.oldSerial,
    newSerial: r.newSerial,
    changedAt: r.changedAt,
    createdAt: r.createdAt.toISOString(),
  }));
}
