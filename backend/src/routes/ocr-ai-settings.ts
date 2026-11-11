/**
 * Admin AI OCR settings (ticket NEPO-28) — which model reads the container &
 * seal photos, and the OpenRouter API key that authenticates the call.
 *
 * RBAC: mounted with `requireRoles(Role.ADMIN)` in index.ts (same gate
 * pattern as /api/admin/app-settings and /api/admin/ocr-usage) — provider
 * credentials are an owner-level control, so no separate Casbin resource is
 * introduced.
 *
 * Storage: three app_settings rows under the `ocr_ai.*` prefix
 * (services/ocr/settings.ts). The key is AES-256-GCM encrypted at rest and
 * never returned in plaintext — the GET response carries only a masked
 * preview + an `apiKeySet` boolean.
 *
 * POST /test makes ONE real vision call with the configured model so the
 * admin learns the truth (bad key, retired model, quota exhausted) instead of
 * discovering it on the next container photo.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { ocrAiSettingsUpdateSchema, type OcrAiTestResponse } from '@tingting/shared';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  getOcrAiSettings,
  getOcrAiSettingsResponse,
  saveOcrAiSettings,
} from '../services/ocr/settings';
import { callOpenRouterVision } from '../services/ocr.service';
import { PROBE_IMAGE_BASE64 } from '../services/ocr/probe-image';

const router = Router();

/**
 * A REAL container photo (TIIU6746012, from the vantaiphucloc OCR benchmark
 * set) — the probe must exercise actual recognition, not just key/model
 * acceptance: a 1×1 dummy PNG made every Claude probe fail with
 * "Could not process image" even with a valid key. The model should read
 * TIIU6746012 back.
 */
const PROBE_IMAGE = Buffer.from(PROBE_IMAGE_BASE64, 'base64');
const PROBE_IMAGE_MIME = 'image/jpeg';
const PROBE_CONTAINER = 'TIIU6746012';

const PROBE_PROMPT =
  'Đọc số container trong ảnh. Chỉ trả về đúng số container, không thêm gì khác.';

/** GET /api/admin/ocr-ai-settings — the configured provider/model + masked key. */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getOcrAiSettingsResponse());
}));

/** PUT /api/admin/ocr-ai-settings — save the provider, key and model. */
router.put('/', asyncHandler(async (req: Request, res: Response) => {
  const data = ocrAiSettingsUpdateSchema.parse(req.body);
  res.json(await saveOcrAiSettings(data));
}));

/**
 * POST /api/admin/ocr-ai-settings/test — one live call against the configured
 * model. Always answers 200 with `ok: false` + the reason when the upstream
 * call fails: a failed probe is a normal outcome the admin must read, not a
 * server error.
 *
 * The body may carry UNSAVED values (`model`, `apiKey`) so the admin can
 * probe what they just typed instead of having to save first. An omitted or
 * blank field falls back to the stored setting.
 */
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOcrAiSettings();
  const startedAt = Date.now();

  const body = (req.body ?? {}) as { model?: unknown; apiKey?: unknown };
  const overrideModel = typeof body.model === 'string' && body.model.trim() !== ''
    ? body.model.trim()
    : settings.model;
  const overrideKey = typeof body.apiKey === 'string' && body.apiKey.trim() !== ''
    ? body.apiKey.trim()
    : settings.apiKey;

  if (!overrideKey) {
    const result: OcrAiTestResponse = {
      ok: false,
      model: overrideModel,
      latencyMs: 0,
      message: 'Chưa có API key cho OCR. Hãy nhập key rồi lưu trước khi kiểm tra.',
    };
    res.json(result);
    return;
  }

  const probe = await callOpenRouterVision(PROBE_PROMPT, PROBE_IMAGE, PROBE_IMAGE_MIME, {
    apiKey: overrideKey,
    model: overrideModel,
  });
  const latencyMs = Date.now() - startedAt;

  // A successful HTTP round-trip is only half the truth: report WHAT the
  // model read on the known photo so the admin sees recognition quality too.
  // Comparison is separator-tolerant: grouped printing like "TIIU 674601 2"
  // is a CORRECT read (the prompt allows separators), not a reason to change
  // the model. The nag shows the raw text so the admin still sees exactly
  // what the model printed.
  const readRaw = (probe.text ?? '').toUpperCase();
  const read = readRaw.replace(/[\s-]/g, '');
  const result: OcrAiTestResponse = probe.success
    ? {
        ok: true,
        model: probe.model ?? overrideModel,
        latencyMs,
        message: read.includes(PROBE_CONTAINER)
          ? `Kết nối thành công — model đọc đúng ${PROBE_CONTAINER} sau ${latencyMs} ms.`
          : `Kết nối thành công sau ${latencyMs} ms, nhưng model đọc được "${readRaw.trim().slice(0, 60)}" (ảnh thật chứa ${PROBE_CONTAINER}) — cân nhắc đổi model.`,
      }
    : {
        ok: false,
        model: probe.model ?? overrideModel,
        latencyMs,
        message: `Không kết nối được: ${probe.error ?? 'không rõ nguyên nhân'}`,
      };
  res.json(result);
}));

export default router;
