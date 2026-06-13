import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and } from 'drizzle-orm';
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
  });

  return {
    storageKey: key,
    url: `/api/photos/${encodeURIComponent(key)}`,
    buffer: processedBuffer,
    mimeType: opts.forOcr ? 'image/jpeg' : mime,
  };
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

  // Parse trip ID
  const match = key.match(/^trips\/(\d+)\//);
  if (!match) {
    return res.status(400).json({ error: 'Đường dẫn ảnh không hợp lệ' });
  }
  const tripId = parseInt(match[1]);

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
