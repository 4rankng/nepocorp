/**
 * NEPO-49 — Tyre board (Bảng theo dõi lốp) service contract.
 *
 * The router is a thin HTTP shell (same shape as tire-bulk-import), so the
 * contract under test is the service: exactly 22 ordered slots for any truck,
 * inline cell edits (any subset of the data row; omitted = keep, '' = clear;
 * NO history row), the "Thay lốp" flow writing (ngày, seri cũ → seri mới)
 * atomically with the slot's serial + ngày thay, and the 1..22 /
 * truck-exists guards.
 *
 * Runs against the local DB and cleans up after itself; the truck plate is
 * TEST-prefixed per local testing convention.
 */
import { describe, test, after, before } from 'node:test';
import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import {
  getTyreBoard,
  updateTyreSlot,
  replaceTyreAtPosition,
  getTyreChanges,
} from '../services/tyre-board.service';
import { TYRE_BOARD_POSITION_COUNT } from '@tingting/shared';

const SUFFIX = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const truckPlate = `TEST-TYRE-${SUFFIX}`.slice(0, 15);
const truck2Plate = `TEST-TYRE2-${SUFFIX}`.slice(0, 15);
let truckId: number;
let truck2Id: number;

before(async () => {
  const [truck] = await db.insert(s.trucks).values({ licensePlate: truckPlate }).returning({ id: s.trucks.id });
  truckId = truck.id;
  const [truck2] = await db.insert(s.trucks).values({ licensePlate: truck2Plate }).returning({ id: s.trucks.id });
  truck2Id = truck2.id;
});

after(async () => {
  // Board rows + history cascade with the truck.
  await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  await db.delete(s.trucks).where(eq(s.trucks.id, truck2Id));
  await client.end();
});

describe('tyre board', () => {
  test('a fresh truck reads as exactly 22 ordered empty slots', async () => {
    const board = await getTyreBoard(truckId);
    assert.strictEqual(board.truckId, truckId);
    assert.strictEqual(board.truckPlate, truckPlate);
    assert.strictEqual(board.slots.length, TYRE_BOARD_POSITION_COUNT);
    assert.deepEqual(board.slots.map((slot) => slot.position), Array.from({ length: 22 }, (_, i) => i + 1));
    for (const slot of board.slots) {
      assert.strictEqual(slot.serial, null);
      assert.strictEqual(slot.brand, null);
      assert.strictEqual(slot.lastChangedAt, null);
    }
  });

  test('inline cell edit patches a subset; omitted fields keep, \'\' clears — no history row', async () => {
    // Initial data entry of one full row (the accountant transcribing the sheet).
    const saved = await updateTyreSlot(truckId, 1, {
      serial: ' 095202021 ',
      brand: 'Casumina',
      size: '295/75',
      treadType: 'Lái',
      model: 'BS881',
      lastChangedAt: '2025-06-25',
    });
    assert.strictEqual(saved.serial, '095202021'); // trimmed on write
    assert.strictEqual(saved.brand, 'Casumina');
    assert.strictEqual(saved.lastChangedAt, '2025-06-25');

    // Patch one field; the rest of the row survives.
    const patched = await updateTyreSlot(truckId, 1, { note: 'Lốp cũ của 180.99' });
    assert.strictEqual(patched.serial, '095202021');
    assert.strictEqual(patched.model, 'BS881');
    assert.strictEqual(patched.note, 'Lốp cũ của 180.99');

    // One row per slot — patching upserted, not duplicated.
    const rows = await db.select().from(s.tyrePositionsBoard)
      .where(eq(s.tyrePositionsBoard.truckId, truckId));
    assert.strictEqual(rows.length, 1);

    // '' clears exactly the targeted field.
    const cleared = await updateTyreSlot(truckId, 1, { note: '', serial: '' });
    assert.strictEqual(cleared.note, null);
    assert.strictEqual(cleared.serial, null);
    assert.strictEqual(cleared.brand, 'Casumina');

    // Data entry writes no history.
    assert.strictEqual((await getTyreChanges(truckId)).length, 0);
  });

  test('invalid positions and unknown trucks are rejected', async () => {
    await assert.rejects(updateTyreSlot(truckId, 0, { serial: 'X' }), /Vị trí lốp phải từ 1 đến 22/);
    await assert.rejects(updateTyreSlot(truckId, 23, { serial: 'X' }), /Vị trí lốp phải từ 1 đến 22/);
    await assert.rejects(updateTyreSlot(truckId, 2.5, { serial: 'X' }), /Vị trí lốp phải từ 1 đến 22/);
    await assert.rejects(replaceTyreAtPosition(truckId, 99, { newSerial: 'X', changedAt: '2026-11-17' }), /Vị trí lốp/);
    await assert.rejects(getTyreBoard(99999999), /Không tìm thấy xe/);
  });

  test('"Thay lốp" records (ngày, seri cũ → seri mới) and updates serial + ngày thay atomically', async () => {
    await updateTyreSlot(truckId, 3, { serial: '32422059514', lastChangedAt: '2024-09-16' });

    const result = await replaceTyreAtPosition(truckId, 3, { newSerial: 'NEW-32422059514', changedAt: '2026-11-10' });
    assert.deepEqual(result, { position: 3, oldSerial: '32422059514', newSerial: 'NEW-32422059514', changedAt: '2026-11-10' });

    const board = await getTyreBoard(truckId);
    const slot3 = board.slots.find((slot) => slot.position === 3);
    assert.strictEqual(slot3?.serial, 'NEW-32422059514');
    assert.strictEqual(slot3?.lastChangedAt, '2026-11-10'); // ngày thay moved with the replacement
    assert.strictEqual(slot3?.brand, null); // untouched fields stay

    // An empty slot replaced straight away records oldSerial null.
    const fromEmpty = await replaceTyreAtPosition(truckId, 11, { newSerial: '015201066', changedAt: '2026-11-15' });
    assert.strictEqual(fromEmpty.oldSerial, null);

    const history = await getTyreChanges(truckId);
    assert.strictEqual(history.length, 2);
    // Newest first: 11-15 above 11-10.
    assert.strictEqual(history[0].position, 11);
    assert.strictEqual(history[0].newSerial, '015201066');
    assert.strictEqual(history[1].position, 3);
    assert.strictEqual(history[1].oldSerial, '32422059514');
    assert.strictEqual(history[1].newSerial, 'NEW-32422059514');

    // Per-slot filter returns only that slot's rows.
    const slot3History = await getTyreChanges(truckId, 3);
    assert.strictEqual(slot3History.length, 1);
    assert.strictEqual(slot3History[0].oldSerial, '32422059514');
  });

  test('a serial already mounted on another slot is rejected with 409 (báo trùng)', async () => {
    const dupSerial = `DUP-${SUFFIX}`;
    await updateTyreSlot(truck2Id, 1, { serial: dupSerial });

    // Same serial, different case + stray spaces — still a duplicate.
    await assert.rejects(
      updateTyreSlot(truckId, 7, { serial: `  ${dupSerial.toLowerCase()}  ` }),
      (err: { statusCode?: number; message: string }) => {
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /đã có/);
        assert.match(err.message, new RegExp(truck2Plate));
        assert.match(err.message, /ô 1/);
        return true;
      },
    );

    // "Thay lốp" with a serial mounted elsewhere is rejected the same way,
    // before any history row is written.
    await assert.rejects(
      replaceTyreAtPosition(truckId, 5, { newSerial: dupSerial, changedAt: '2026-11-20' }),
      (err: { statusCode?: number; message: string }) => {
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /đã có/);
        return true;
      },
    );
    assert.strictEqual((await getTyreChanges(truckId, 5)).length, 0);
  });

  test('re-saving a slot\'s own serial stays allowed (sửa ngày / sửa chữ)', async () => {
    const ownSerial = `OWN-${SUFFIX}`;
    await updateTyreSlot(truck2Id, 2, { serial: ownSerial });
    // Same slot, same serial (trimmed on save, case kept) — not a duplicate.
    const slot = await updateTyreSlot(truck2Id, 2, { serial: ` ${ownSerial.toLowerCase()} `, note: 'sửa trực tiếp' });
    assert.strictEqual(slot.serial, ownSerial.toLowerCase());

    // "Thay lốp" re-entering the same serial (correcting ngày thay) is fine.
    const result = await replaceTyreAtPosition(truck2Id, 2, { newSerial: ownSerial, changedAt: '2026-11-21' });
    assert.strictEqual(result.oldSerial, ownSerial.toLowerCase());
    assert.strictEqual(result.newSerial, ownSerial);
  });
});
