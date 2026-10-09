/**
 * Bulk tire import (kanban 081026215220).
 *
 * The endpoint is a thin HTTP shell over `importTiresFromRows`, so the contract
 * under test is the per-row outcome report: a plate resolves against both
 * catalogs, a blank plate means a spare, a bad row never takes its neighbours
 * down with it, and an existing serial is skipped rather than aborting the batch.
 */
import { describe, test, after, before } from 'node:test';
import assert from 'node:assert';
import { eq, inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { importTiresFromRows } from '../services/tire.service';

const SUFFIX = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const createdTireIds: number[] = [];
let truckId: number;
let trailerId: number;
const truckPlate = `IMPT-${SUFFIX}`.slice(0, 15);
const trailerPlate = `IMPR-${SUFFIX}`.slice(0, 15);

before(async () => {
  const [truck] = await db.insert(s.trucks).values({ licensePlate: truckPlate }).returning({ id: s.trucks.id });
  const [trailer] = await db.insert(s.trailers).values({ licensePlate: trailerPlate, type: '40FT' }).returning({ id: s.trailers.id });
  truckId = truck.id;
  trailerId = trailer.id;
});

after(async () => {
  if (createdTireIds.length > 0) {
    await db.delete(s.tires).where(inArray(s.tires.id, createdTireIds));
  }
  await db.delete(s.trucks).where(eq(s.trucks.id, truckId));
  await db.delete(s.trailers).where(eq(s.trailers.id, trailerId));
  await client.end();
});

describe('bulk tire import', () => {
  test('resolves plates, keeps good rows, and reports every bad row separately', async () => {
    const serialOnTruck = `IMPT-T-${SUFFIX}`;
    const serialOnTrailer = `IMPT-R-${SUFFIX}`;
    const spareSerial = `IMPT-S-${SUFFIX}`;
    const badDateSerial = `IMPT-D-${SUFFIX}`;

    const summary = await importTiresFromRows([
      { serial: serialOnTruck, plate: truckPlate, size: '295/75', position: 'Lốp lái' },
      { serial: serialOnTrailer, plate: trailerPlate, size: '11R22.5' },
      { serial: spareSerial, size: '295/75' },
      { serial: badDateSerial, plate: truckPlate, installedAt: 'không-phải-ngày' },
      { serial: '', plate: truckPlate },
      { serial: `IMPT-X-${SUFFIX}`, plate: 'KHONG-CO-BIEN-SO' },
    ]);

    assert.strictEqual(summary.total, 6);
    assert.strictEqual(summary.created, 3);
    assert.strictEqual(summary.errors, 3);

    // The three good rows landed with the right vehicle + status.
    const rows = await db.select().from(s.tires)
      .where(inArray(s.tires.serial, [serialOnTruck, serialOnTrailer, spareSerial]));
    createdTireIds.push(...rows.map(r => r.id));

    const bySerial = new Map(rows.map(r => [r.serial, r]));
    assert.strictEqual(bySerial.get(serialOnTruck)!.truckId, truckId);
    assert.strictEqual(bySerial.get(serialOnTruck)!.status, 'IN_USE');
    assert.strictEqual(bySerial.get(serialOnTrailer)!.trailerId, trailerId);
    assert.strictEqual(bySerial.get(spareSerial)!.truckId, null);
    assert.strictEqual(bySerial.get(spareSerial)!.trailerId, null);
    assert.strictEqual(bySerial.get(spareSerial)!.status, 'IN_STOCK');

    // Errors name the row and the reason.
    const badDate = summary.results.find(r => r.serial === badDateSerial);
    assert.strictEqual(badDate?.status, 'error');
    assert.match(badDate!.message!, /Ngày lắp không hợp lệ/);
    assert.match(summary.results.find(r => r.serial === '')!.message!, /Thiếu số serial/);
    assert.match(
      summary.results.find(r => r.serial === `IMPT-X-${SUFFIX}`)!.message!,
      /Không tìm thấy biển số/,
    );
  });

  test('an existing serial is skipped without failing the rest of the batch', async () => {
    const existing = `IMPT-DUP-${SUFFIX}`;
    const [row] = await db.insert(s.tires).values({ serial: existing, status: 'IN_STOCK' }).returning();
    createdTireIds.push(row.id);

    const fresh = `IMPT-NEW-${SUFFIX}`;
    const summary = await importTiresFromRows([
      { serial: existing },
      { serial: fresh },
    ]);

    assert.strictEqual(summary.created, 1);
    assert.strictEqual(summary.skipped, 1);
    const skipped = summary.results.find(r => r.serial === existing);
    assert.strictEqual(skipped?.status, 'skipped');
    assert.match(skipped!.message!, /đã tồn tại/);

    const [inserted] = await db.select().from(s.tires).where(eq(s.tires.serial, fresh));
    createdTireIds.push(inserted.id);
    assert.ok(inserted, 'the good row of a mixed batch must still be inserted');
  });
});
