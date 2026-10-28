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

const router = Router();

/**
 * A 1×1 PNG. The probe is about the CONNECTION (key accepted, model alive,
 * image input accepted), not about recognition quality — a real container
 * photo would make the button slow and expensive for a connectivity check.
 */
const PROBE_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const PROBE_PROMPT =
  'Reply with the single word: OK';

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

  const probe = await callOpenRouterVision(PROBE_PROMPT, PROBE_IMAGE, 'image/png', {
    apiKey: overrideKey,
    model: overrideModel,
  });
  const latencyMs = Date.now() - startedAt;

  const result: OcrAiTestResponse = probe.success
    ? {
        ok: true,
        model: probe.model ?? overrideModel,
        latencyMs,
        message: `Kết nối thành công — model phản hồi sau ${latencyMs} ms.`,
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
