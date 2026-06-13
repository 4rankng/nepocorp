import { Router } from 'express';
import multer from 'multer';
import type { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { Role } from '@tingting/shared';
import { db } from '../db';
import * as s from '../db/schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { getUser } from '../middleware/auth';
import { sniffImageType } from '../lib/format';
import { saveTripPhoto } from './upload';
import { extractContainerAndSeal } from '../services/ocr.service';

// auth + Casbin ('ocr') applied at mount point in index.ts
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

/**
 * POST /api/ocr — recognize container & seal numbers from a photo.
 *
 * Body (multipart): file (image), type ∈ {CONTAINER, SEAL}, optional trip_id.
 *
 * - With trip_id (Edit): DRIVER ownership is enforced, the photo is persisted
 *   (OCR pipeline) and `photoUrl`/`storageKey` are returned.
 * - Without trip_id (Create preview): OCR only, nothing is persisted.
 *
 * Numbers are NEVER auto-committed here (spec Decision 1) — the caller must save
 * them through the existing container flow after visual confirmation.
 */
router.post('/', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const type = req.body.type as 'CONTAINER' | 'SEAL';
  const tripIdRaw = req.body.trip_id;

  if (!file) return res.status(400).json({ error: 'Không có file tải lên' });
  if (type !== 'CONTAINER' && type !== 'SEAL') {
    return res.status(400).json({ error: 'Loại ảnh không hợp lệ (CONTAINER hoặc SEAL)' });
  }

  const user = getUser(req);

  // Optional trip_id → ownership check + persist photo (Edit branch).
  let tripId: number | null = null;
  if (tripIdRaw !== undefined && tripIdRaw !== '') {
    tripId = parseInt(tripIdRaw, 10);
    if (isNaN(tripId)) return res.status(400).json({ error: 'trip_id không hợp lệ' });

    // DRIVER may only OCR photos of their own trips (mirrors photosRouter).
    if (user.role === Role.DRIVER) {
      const [driver] = await db.select({ id: s.drivers.id }).from(s.drivers)
        .where(eq(s.drivers.userId, user.userId)).limit(1);
      if (!driver) return res.status(403).json({ error: 'Không có quyền truy cập' });

      const [trip] = await db.select().from(s.trips)
        .where(and(eq(s.trips.id, tripId), eq(s.trips.driverId, driver.id)))
        .limit(1);
      if (!trip) return res.status(403).json({ error: 'Không có quyền quét ảnh của chuyến này' });
    }
  }

  let photoUrl: string | undefined;
  let storageKey: string | undefined;
  let ocrBuffer = file.buffer;
  let ocrMime = sniffImageType(file.buffer) ?? 'image/jpeg';

  if (tripId !== null) {
    // Persist (OCR pipeline) and reuse the processed buffer for recognition.
    const saved = await saveTripPhoto(file, tripId, type, user.userId, { forOcr: true });
    photoUrl = saved.url;
    storageKey = saved.storageKey;
    ocrBuffer = saved.buffer;
    ocrMime = saved.mimeType;
  }

  const result = await extractContainerAndSeal(ocrBuffer, type, ocrMime);

  res.status(200).json({
    ok: result.success,
    containerNumbers: result.containerNumbers,
    sealNumber: result.sealNumber,
    checkDigitWarnings: result.checkDigitWarnings,
    photoUrl,
    storageKey,
    model: result.model,
    error: result.error,
  });
}));

export default router;
