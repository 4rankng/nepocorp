/**
 * Restore trip 375's photo evidence (kanban 101026101540).
 *
 * Mechanism (prod, 2026-10-08, audit_logs 11116–11141): user 3 saved the
 * container row (TXGU5555273 + seal VNHPH2526138 → row 614) at 10:15:12 and
 * flushed the container + seal photos bound to it (trip_photos 1688/1689). At
 * 10:15:17 user 4's STALE editor saved its container list without row ids (one
 * empty padded row), and the full-list reconcile replaced the container row
 * (614 → 615). trip_photos.trip_container_id is ON DELETE SET NULL, so the two
 * photos lost their binding and — because every read path either filters to
 * type OTHER (trip-level photoUrls) or to live bindings (the "Container & Seal"
 * card) — disappeared from the UI. The rows and files were never deleted: on
 * 2026-10-13 prod holds all 5 rows (1686–1689, 1695) and all 5 files under
 * uploads/trips/375/, exactly matching.
 *
 * Repair: re-bind the orphaned photos to container 615 (the trip's surviving
 * container row), and re-create a row for any expected photo whose row is
 * missing while its storage file still exists (failed-insert class — zero such
 * rows on prod today, so that branch is a no-op). Every action is conditional
 * on the storage file still existing, so the script never invents evidence.
 *
 * Idempotent: a re-run finds every key already bound/inserted and does
 * nothing. Dry-run by default; writes only with --apply.
 *
 * Usage (from backend/):
 *   npx tsx scripts/repair-trip-375-photos.ts            # dry-run
 *   npx tsx scripts/repair-trip-375-photos.ts --apply
 */
import { sql, eq, and } from 'drizzle-orm';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';
import { storageService } from '../src/services/storage.service';

const APPLY = process.argv.includes('--apply');

const TRIP_ID = 375;
/** The trip's surviving container row (created 2026-10-08 10:15:17, number
 *  TXGU5555273 filled in by the 10:20:50 save). */
const CONTAINER_ID = 615;
/** Original uploader of every photo below (prod trip_photos.uploaded_by). */
const UPLOADED_BY = 3;

/** The trip's expected photo evidence: storage key → row shape. Values are the
 *  prod trip_photos rows as of 2026-10-13 (uploaded_at straight from the rows,
 *  restored verbatim on insert so the timeline is preserved). */
const EXPECTED: Array<{
  key: string;
  type: 'CONTAINER' | 'SEAL' | 'OTHER';
  uploadedAt: string;
  containerId: number | null;
}> = [
  { key: 'trips/375/other-b2137dfd-8c65-4eee-ba51-eadc898d243c.jpg', type: 'OTHER', uploadedAt: '2026-10-08 10:15:10.228005', containerId: null },
  { key: 'trips/375/other-4e88b858-16bb-49b5-91ff-1f143c0e5ac4.jpg', type: 'OTHER', uploadedAt: '2026-10-08 10:15:10.533395', containerId: null },
  { key: 'trips/375/container-c093ebcc-1ff8-4e3a-b2a3-261a9a5cdb79.jpg', type: 'CONTAINER', uploadedAt: '2026-10-08 10:15:12.577947', containerId: CONTAINER_ID },
  { key: 'trips/375/seal-270ceac9-dd9d-4d11-bcf8-3ccd29cdc189.jpg', type: 'SEAL', uploadedAt: '2026-10-08 10:15:13.391801', containerId: CONTAINER_ID },
  { key: 'trips/375/container-248e071b-bcc8-416a-9ff0-83209a1a35a9.jpg', type: 'CONTAINER', uploadedAt: '2026-10-08 10:20:45.024958', containerId: CONTAINER_ID },
];

async function main() {
  console.log(`Chế độ: ${APPLY ? 'APPLY (ghi)' : 'DRY-RUN (chỉ đọc)'}`);

  const [trip] = await db.select({ id: s.trips.id }).from(s.trips).where(eq(s.trips.id, TRIP_ID)).limit(1);
  if (!trip) {
    console.error(`Không tìm thấy chuyến ${TRIP_ID} — dừng.`);
    process.exit(1);
  }
  const [container] = await db.select({ id: s.tripContainers.id })
    .from(s.tripContainers)
    .where(and(eq(s.tripContainers.id, CONTAINER_ID), eq(s.tripContainers.tripId, TRIP_ID)))
    .limit(1);
  if (!container) {
    console.error(`Cont ${CONTAINER_ID} không thuộc chuyến ${TRIP_ID} — dừng (không có gì để gán).`);
    process.exit(1);
  }

  let rebound = 0;
  let inserted = 0;
  let ok = 0;
  let skipped = 0;

  for (const e of EXPECTED) {
    // Only ever repair evidence whose bytes are still on disk.
    if (!(await storageService.exists(e.key))) {
      console.warn(`BỎ QUA ${e.key}: file không còn trong uploads — không có gì để sửa.`);
      skipped++;
      continue;
    }

    const [row] = await db.select({ id: s.tripPhotos.id, tripContainerId: s.tripPhotos.tripContainerId })
      .from(s.tripPhotos)
      .where(and(eq(s.tripPhotos.storageKey, e.key), eq(s.tripPhotos.tripId, TRIP_ID)))
      .limit(1);

    if (row) {
      if ((row.tripContainerId ?? null) === e.containerId) {
        ok++;
        continue;
      }
      console.log(`${APPLY ? 'GÁN LẠI' : 'CẦN GÁN LẠI'} ${e.key}: trip_container_id ${row.tripContainerId ?? 'NULL'} → ${e.containerId ?? 'NULL'}`);
      if (APPLY) {
        await db.update(s.tripPhotos).set({ tripContainerId: e.containerId }).where(eq(s.tripPhotos.id, row.id));
      }
      rebound++;
      continue;
    }

    console.log(`${APPLY ? 'TẠO LẠI ROW' : 'CẦN TẠO ROW'} ${e.key} (${e.type}, uploaded_by ${UPLOADED_BY}, ${e.uploadedAt})`);
    if (APPLY) {
      // Raw insert keeps the original uploaded_at verbatim (timestamp without
      // time zone — a JS Date round-trip would shift it by the session TZ).
      await db.execute(sql`
        INSERT INTO trip_photos (trip_id, type, storage_key, uploaded_by, uploaded_at, trip_container_id)
        VALUES (${TRIP_ID}, ${e.type}::trip_photo_type, ${e.key}, ${UPLOADED_BY}, ${e.uploadedAt}::timestamp, ${e.containerId})
      `);
    }
    inserted++;
  }

  console.log(`Tổng: ${ok} đúng sẵn, ${rebound} cần gán lại, ${inserted} cần tạo lại row, ${skipped} bỏ qua (mất file).`);
  if (!APPLY) console.log('Chạy lại với --apply để ghi.');
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
