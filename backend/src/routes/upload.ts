import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@nepocorp/shared';
import { storageService } from '../services/storage.service';
import { config } from '../config';
import type { Request, Response } from 'express';

// Maximum dimension for server-side downscale
const MAX_IMAGE_DIMENSION = 2048;

// Magic-bytes sniffer for secure validation Sniff file signatures
function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  // WebP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  // HEIC: ftypheic or ftypmsf1 at offset 4
  const brand = buffer.toString('ascii', 8, 12);
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70 &&
      (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1')) {
    return 'image/heic';
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

const uploadRouter = Router();
uploadRouter.use(authMiddleware);

uploadRouter.post('/', upload.single('file'), requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const tripId = parseInt(req.body.trip_id);
    const type = req.body.type as 'CONTAINER' | 'SEAL' | 'OTHER';

    if (!file) return res.status(400).json({ error: 'Không có file tải lên' });
    if (isNaN(tripId)) return res.status(400).json({ error: 'trip_id không hợp lệ' });
    if (!['CONTAINER', 'SEAL', 'OTHER'].includes(type)) {
      return res.status(400).json({ error: 'Loại ảnh không hợp lệ' });
    }

    // 1. Sniff magic bytes
    const mime = sniffMimeType(file.buffer);
    if (!mime) {
      return res.status(400).json({ error: 'Định dạng file không được hỗ trợ hoặc file bị hỏng' });
    }

    // 2. Process image with sharp: HEIC→JPEG transcode, EXIF strip, downscale
    let processedBuffer: Buffer;
    let ext: string;

    if (mime === 'image/heic') {
      // Transcode HEIC to JPEG
      processedBuffer = await sharp(file.buffer)
        .rotate() // auto-rotate based on EXIF orientation, then strip it
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      ext = '.jpg';
    } else {
      // For JPEG/PNG/WebP: strip EXIF + downscale if needed
      const pipeline = sharp(file.buffer)
        .rotate()
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .withMetadata(false); // strip all EXIF/metadata

      if (mime === 'image/jpeg') {
        processedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
        ext = '.jpg';
      } else if (mime === 'image/png') {
        processedBuffer = await pipeline.png().toBuffer();
        ext = '.png';
      } else {
        // WebP
        processedBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
        ext = '.webp';
      }
    }

    // 3. Generate UUID storage key
    const uuid = crypto.randomUUID();
    const key = `trips/${tripId}/${type.toLowerCase()}-${uuid}${ext}`;

    // 4. Upload buffer
    await storageService.upload(processedBuffer, key);

    // 5. Persist relation in DB
    const [photo] = await db.insert(s.tripPhotos).values({
      tripId,
      type,
      storageKey: key,
      uploadedBy: req.user!.userId,
    }).returning();

    res.status(201).json({
      ok: true,
      storageKey: key,
      url: `/api/photos/${encodeURIComponent(key)}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated Photos serving Router
const photosRouter = Router();
photosRouter.use(authMiddleware);

photosRouter.get('/*', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0];
    const key = decodeURIComponent(rawKey);

    // Parse trip ID
    const match = key.match(/^trips\/(\d+)\//);
    if (!match) {
      return res.status(400).json({ error: 'Đường dẫn ảnh không hợp lệ' });
    }
    const tripId = parseInt(match[1]);

    // Check permissions
    if (req.user!.role === Role.DRIVER) {
      const [driver] = await db.select({ id: s.drivers.id }).from(s.drivers)
        .where(eq(s.drivers.userId, req.user!.userId)).limit(1);
      
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { uploadRouter, photosRouter };
