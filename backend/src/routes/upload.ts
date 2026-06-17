import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
// auth + Casbin applied at mount point in index.ts
import { Role } from '@tingting/shared';
import { storageService } from '../services/storage.service';
import { config } from '../config';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { getUser } from '../middleware/auth';
import { sniffImageType } from '../lib/format';
import { ApiError } from '../errors';

// Maximum dimension for server-side downscale
const MAX_IMAGE_DIMENSION = 2048;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

export type TripPhotoType = 'CONTAINER' | 'SEAL' | 'OTHER';

export interface SaveTripPhotoOptions {
  /** Use the OCR-optimised pipeline (auto-contrast + JPEG q95) instead of the
   * default q85 pipeline. The processed buffer is returned so the OCR route can
   * reuse it for recognition instead of re-running sharp. */
  forOcr?: boolean;
  /** Phase 2: optional container row to link this photo to. The container
   *  must belong to `tripId`. Null/undefined leaves the photo at trip level
   *  (legacy behaviour), which is also the fallback for older callers. */
  containerId?: number | null;
}

export interface SavedTripPhoto {
  storageKey: string;
  url: string;
  buffer: Buffer;
  mimeType: string;
}

/**
 * Sniff → sharp preprocess → storage → insert trip_photos row.
 *
 * Storage key keeps the `container-` / `seal-` prefix so the frontend's
 * `mapUrlsToPhotos` heuristic can categorise the photo by URL.
 *
 * Scoped to trip photos only (the expense-photo pipeline in forwarder.ts uses a
 * different table/key shape and is intentionally not merged here).
 */
export async function saveTripPhoto(
  file: { buffer: Buffer },
  tripId: number,
  type: TripPhotoType,
  userId: number,
  opts: SaveTripPhotoOptions = {},
): Promise<SavedTripPhoto> {
  const mime = sniffImageType(file.buffer);
  if (!mime) {
    throw new ApiError(400, 'Định dạng file không được hỗ trợ hoặc file bị hỏng');
  }

  let processedBuffer: Buffer;
  let ext: string;

  if (opts.forOcr) {
    // OCR pipeline: downscale + auto-contrast so text stands out for the VLM.
    processedBuffer = await sharp(file.buffer)
      .rotate() // auto-orient from EXIF, then strip
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .normalise() // auto-contrast (helps faded/night/shadowed paint)
      .jpeg({ quality: 95 })
      .toBuffer();
    ext = '.jpg';
  } else if (mime === 'image/heic') {
    // Transcode HEIC to JPEG
    processedBuffer = await sharp(file.buffer)
      .rotate()
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    ext = '.jpg';
  } else {
    // JPEG/PNG/WebP: strip EXIF + downscale, keep format
    const pipeline = sharp(file.buffer)
      .rotate()
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .withMetadata({ orientation: undefined });

    if (mime === 'image/jpeg') {
      processedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
      ext = '.jpg';
    } else if (mime === 'image/png') {
      processedBuffer = await pipeline.png().toBuffer();
      ext = '.png';
    } else {
      processedBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
      ext = '.webp';
    }
  }

  const uuid = crypto.randomUUID();
  const key = `trips/${tripId}/${type.toLowerCase()}-${uuid}${ext}`;

  await storageService.upload(processedBuffer, key);
  await db.insert(s.tripPhotos).values({
    tripId,
    type,
    storageKey: key,
    uploadedBy: userId,
    // Phase 2: link to a specific container when provided. Caller is
    // responsible for ownership validation; we only set the FK if present.
    tripContainerId: opts.containerId ?? null,
  });

  return {
    storageKey: key,
    url: `/api/photos/${encodeURIComponent(key)}`,
    buffer: processedBuffer,
    mimeType: opts.forOcr ? 'image/jpeg' : mime,
  };
}

/**
 * Remove every `trip_photos` row of a given (tripId, type) — the driver Sửa
 * flow's "remove photo" affordance. Storage files are deleted best-effort (a
 * missing/unreadable file is logged, not fatal) and the rows are removed via
 * Drizzle. Returns the count removed.
 *
 * `contPhotoKey`/`sealPhotoKey` resolve to the LATEST photo of a type, so
 * clearing ALL rows of that type is what actually makes the thumbnail
 * disappear — deleting only the latest would just resurface the previous one.
 */
export async function deleteTripPhotosByType(
  tripId: number,
  type: TripPhotoType,
  /**
   * Phase 2: when provided, scope the delete to only photos linked to this
   * specific container row (via trip_photos.trip_container_id). When omitted,
   * deletes ALL photos of this type for the trip — the legacy "remove all"
   * behaviour, which is what the editor's "Xoá ảnh" affordance expects.
   */
  containerId?: number,
): Promise<number> {
  // Capture the row ids up front and scope BOTH the file delete and the row
  // delete to this exact snapshot. A row inserted concurrently (e.g. a capture
  // landing mid-operation) is in neither `rows` nor `ids`, so it survives — its
  // file is not orphaned on disk and the driver's fresh upload is not silently
  // wiped. Scoping the DELETE to ids (rather than tripId+type) also makes the
  // returned count match what was actually removed.
  const conditions = [eq(s.tripPhotos.tripId, tripId), eq(s.tripPhotos.type, type)];
  if (containerId !== undefined) {
    conditions.push(eq(s.tripPhotos.tripContainerId, containerId));
  }
  const rows = await db.select({ id: s.tripPhotos.id, storageKey: s.tripPhotos.storageKey })
    .from(s.tripPhotos)
    .where(and(...conditions));

  // Best-effort file deletion: never let one bad file abort the row delete.
  await Promise.all(rows.map(row =>
    storageService.delete(row.storageKey).catch(err => {
      console.warn(
        `[deleteTripPhotosByType] failed to delete ${row.storageKey}:`,
        err instanceof Error ? err.message : err,
      );
    }),
  ));

  const ids = rows.map(r => r.id);
  if (ids.length > 0) {
    await db.delete(s.tripPhotos)
      .where(inArray(s.tripPhotos.id, ids));
  }

  return ids.length;
}

const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const tripId = parseInt(req.body.trip_id);
  const type = req.body.type as TripPhotoType;

  if (!file) return res.status(400).json({ error: 'Không có file tải lên' });
  if (isNaN(tripId)) return res.status(400).json({ error: 'trip_id không hợp lệ' });
  if (!['CONTAINER', 'SEAL', 'OTHER'].includes(type)) {
    return res.status(400).json({ error: 'Loại ảnh không hợp lệ' });
  }

  const saved = await saveTripPhoto(file, tripId, type, getUser(req).userId);

  res.status(201).json({
    ok: true,
    storageKey: saved.storageKey,
    url: saved.url,
  });
}));

// Authenticated Photos serving Router
const photosRouter = Router();

photosRouter.get('/{*path}', asyncHandler(async (req: Request, res: Response) => {
  const rawKey = typeof req.params.path === 'string' ? req.params.path : Array.isArray(req.params.path) ? req.params.path.join('/') : '';
  const key = decodeURIComponent(rawKey);

  // Defense-in-depth: no storage key ever contains a path segment; reject
  // traversal attempts up front (the resolved-path guard below also covers it).
  if (key.includes('..')) {
    return res.status(400).json({ error: 'Đường dẫn ảnh không hợp lệ' });
  }

  // Two valid key shapes: trip photos (trips/<id>/…) and expense receipt
  // photos (expense-photos/<id>/…, B1). Trip photos get a driver ownership
  // check; expense photos are readable by any authenticated staff member
  // (this router is mounted behind assetAuthMiddleware).
  const tripMatch = key.match(/^trips\/(\d+)\//);
  const expenseMatch = key.match(/^expense-photos\/(\d+)\//);
  if (!tripMatch && !expenseMatch) {
    return res.status(400).json({ error: 'Đường dẫn ảnh không hợp lệ' });
  }

  if (tripMatch) {
    const tripId = parseInt(tripMatch[1]);

    // Check permissions
    if (getUser(req).role === Role.DRIVER) {
      const [driver] = await db.select({ id: s.drivers.id }).from(s.drivers)
        .where(eq(s.drivers.userId, getUser(req).userId)).limit(1);

      if (!driver) {
        return res.status(403).json({ error: 'Không có quyền truy cập ảnh này' });
      }

      const [trip] = await db.select()
        .from(s.trips)
        .where(and(eq(s.trips.id, tripId), eq(s.trips.driverId, driver.id)))
        .limit(1);

      if (!trip) {
        return res.status(403).json({ error: 'Không có quyền truy cập ảnh của chuyến đi này' });
      }
    }
  } else if (expenseMatch) {
    // Expense receipt photos are financial evidence. The `expense-photos/<id>/`
    // prefix is SHARED by two pipelines: company receipts (expense.ts:159, FK→
    // expenses.id, stored in expense_photos) and forwarder receipts (forwarder.ts:246,
    // FK→trip_expenses.id, stored in trip_expense_photos). So <id> alone is
    // ambiguous — distinguish by ownership, not by the key.
    const role = getUser(req).role;

    // Drivers never read expense receipts.
    if (role === Role.DRIVER) {
      return res.status(403).json({ error: 'Không có quyền truy cập ảnh chi phí' });
    }

    // A forwarder may read ONLY the exact receipt key that belongs to a
    // trip_expense they own (tripExpenses.forwarderId = their users.id).
    // Company receipts are not in trip_expense_photos, so they stay blocked.
    //
    // ACTIVE is folded into the join (N5, per docs/plans/forwarder-photo-ownership-plan.md):
    // /api/photos sits behind assetAuthMiddleware (JWT sig + jti only — NOT
    // resolveForwarder), so a disabled forwarder with an unexpired JWT would
    // otherwise bypass the status gate. Joining users on the owner and requiring
    // status='ACTIVE' denies a disabled forwarder in the same round-trip.
    if (role === Role.FORWARDER) {
      const [owned] = await db.select({ id: s.tripExpensePhotos.id })
        .from(s.tripExpensePhotos)
        .innerJoin(s.tripExpenses, eq(s.tripExpensePhotos.tripExpenseId, s.tripExpenses.id))
        .innerJoin(s.users, eq(s.tripExpenses.forwarderId, s.users.id))
        .where(and(
          eq(s.tripExpensePhotos.storageKey, key),
          eq(s.tripExpenses.forwarderId, getUser(req).userId),
          eq(s.users.status, 'ACTIVE'),
        ))
        .limit(1);
      if (!owned) {
        return res.status(403).json({ error: 'Không có quyền truy cập ảnh chi phí' });
      }
    }
    // MANAGER / ACCOUNTANT / ADMIN: any authenticated staff — fall through to serve.
  }

  const uploadDir = path.resolve(config.uploadDir || path.join(process.cwd(), 'uploads'));
  const filePath = path.resolve(uploadDir, key);

  // Path traversal guard: resolved path must stay within uploadDir
  if (!filePath.startsWith(uploadDir + path.sep)) {
    return res.status(400).json({ error: 'Đường dẫn ảnh không hợp lệ' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Không tìm thấy ảnh' });
  }

  res.sendFile(filePath);
}));

export { uploadRouter, photosRouter };
