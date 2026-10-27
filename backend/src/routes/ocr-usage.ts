/**
 * Admin AI OCR usage settings (ticket NEPO-27) — the monthly request allowance
 * and the per-call price charged beyond it.
 *
 * RBAC: mounted with `requireRoles(Role.ADMIN)` in index.ts (same gate pattern
 * as /api/admin/app-settings) — usage billing is an owner-level control, so no
 * separate Casbin resource is introduced.
 *
 * Storage: two app_settings rows under the `ocr_usage.*` prefix
 * (services/ocr-usage.service.ts). The PUT invalidates the in-memory cache so
 * counting/billing picks the new values up on the very next OCR request.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { ocrUsageSettingsUpdateSchema } from '@tingting/shared';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  getOcrUsageSettingsResponse,
  saveOcrUsageSettings,
} from '../services/ocr-usage.service';

const router = Router();

/** GET /api/admin/ocr-usage — the configured allowance + per-call price. */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getOcrUsageSettingsResponse());
}));

/** PUT /api/admin/ocr-usage — replace both values; takes effect immediately. */
router.put('/', asyncHandler(async (req: Request, res: Response) => {
  const data = ocrUsageSettingsUpdateSchema.parse(req.body);
  res.json(await saveOcrUsageSettings(data));
}));

export default router;
