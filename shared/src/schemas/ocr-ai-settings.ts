import { z } from 'zod';

/**
 * ADMIN settings for the AI model that reads container/seal photos (NEPO-28).
 *
 * OCR runs on OpenRouter (see backend/src/services/ocr.service.ts). The API key
 * and the model slug were previously hard-coded — the key came from
 * `OPENROUTER_API_KEY` in the environment and the model was a code constant —
 * so neither could be changed on a running deployment without a redeploy.
 *
 * Both are ADMIN-configurable now:
 *   - the key is stored encrypted (AES-256-GCM) and never returned in
 *     plaintext — the response carries only a masked preview + a `*KeySet`
 *     boolean, exactly like the chatbot LLM settings;
 *   - the model is picked from a curated list of vision-capable OpenRouter
 *     models, or typed by hand for anything the list does not carry yet.
 *
 * The provider is fixed to OpenRouter on purpose: Gemini stays a runtime
 * fallback for OCR, but the owner-facing provider choice is OpenRouter.
 */
export const OCR_AI_PROVIDERS = ['openrouter'] as const;
export type OcrAiProvider = (typeof OCR_AI_PROVIDERS)[number];

/** Vietnamese display labels for the provider radio group. */
export const OCR_AI_PROVIDER_LABELS: Record<OcrAiProvider, string> = {
  openrouter: 'OpenRouter',
};

/**
 * Model used when the admin has not chosen one (and the boot fallback).
 * Claude Haiku 5.5 measured as the best number-recognition model on
 * container/seal photos — the earlier Qwen3-VL slug missed seal numbers.
 */
export const OCR_AI_DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';

/**
 * Vision-capable OpenRouter models offered in the dropdown. Every slug here
 * was verified against `GET https://openrouter.ai/api/v1/models` to accept
 * `image` input.
 *
 * This is a convenience list, not a whitelist: the admin can type any slug,
 * so a model released after this list was written is still usable.
 */
export const OCR_AI_MODELS: readonly string[] = [
  'anthropic/claude-haiku-5.5',
  'anthropic/claude-sonnet-5.5',
  'google/gemini-3.5-flash',
  'openai/gpt-4o-mini',
  'qwen/qwen3-vl-30b-a3b-instruct',
];

/** GET /api/admin/ocr-ai-settings — the key is never sent to the client. */
export interface OcrAiSettingsResponse {
  provider: OcrAiProvider;
  /** True when a key is stored (encrypted) or inherited from the env. */
  apiKeySet: boolean;
  /** Masked preview (last 4 chars) or '' when unset. */
  apiKeyMasked: string;
  /** The model slug OCR calls. */
  model: string;
  /** Curated model list for the dropdown. */
  models: string[];
  /** The fallback model used when nothing is configured. */
  defaultModel: string;
}

/** PUT /api/admin/ocr-ai-settings request body.
 *  - `apiKey` is optional: omit/leave empty to keep the stored key.
 *  - `clearApiKey` explicitly wipes the stored key (falls back to env). */
export const ocrAiSettingsUpdateSchema = z.object({
  provider: z.enum(OCR_AI_PROVIDERS),
  apiKey: z.string().optional(),
  clearApiKey: z.boolean().optional(),
  model: z
    .string()
    .trim()
    .min(1, 'Chọn hoặc nhập model')
    .max(120, 'Tên model quá dài')
    .regex(/^[a-z0-9][a-z0-9._-]*\/[a-z0-9._:-]+$/i, 'Model phải có dạng vendor/model'),
});
export type OcrAiSettingsUpdate = z.infer<typeof ocrAiSettingsUpdateSchema>;

/** POST /api/admin/ocr-ai-settings/test — result of the live probe. */
export interface OcrAiTestResponse {
  ok: boolean;
  /** The model the probe actually called. */
  model: string;
  /** Round-trip time of the upstream call, in milliseconds. */
  latencyMs: number;
  /** Human-readable outcome — shown verbatim in the settings UI. */
  message: string;
}

export const OCR_AI_SETTINGS_PATHS = {
  /** ADMIN settings (GET/PUT) — mounted under /api/admin. */
  adminBase: '/admin/ocr-ai-settings',
  /** Live connection probe (POST) — same mount. */
  test: '/admin/ocr-ai-settings/test',
} as const;
