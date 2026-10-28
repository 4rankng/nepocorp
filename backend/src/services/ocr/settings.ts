// AI OCR model settings (ticket NEPO-28) — which provider/model reads the
// container & seal photos, and the API key that authenticates the call.
//
// Storage mirrors services/llm/settings.ts:
//   - the API key lives in an app_settings row under the `ocr_ai.*` prefix,
//     encrypted (services/crypto.ts) — the browser only ever sees a masked
//     preview + a `*KeySet` boolean;
//   - the provider + model live in plaintext rows (enum + slug).
//
// Boot fallback: when a DB row is absent the env `OPENROUTER_API_KEY` is used
// and the default model applies, so an existing deployment keeps working
// before an admin ever saves anything.
//
// Cache: the resolved settings are cached in memory and dropped by
// invalidateOcrAiSettings() after an admin save — the next OCR request picks
// the new model up immediately, no process restart.
import { db } from '../../db';
import * as s from '../../db/schema';
import { inArray, sql } from 'drizzle-orm';
import { config } from '../../config';
import { decryptSecret, encryptSecret, maskKey } from '../crypto';
import {
  OCR_AI_DEFAULT_MODEL,
  OCR_AI_MODELS,
  OCR_AI_PROVIDERS,
  type OcrAiProvider,
  type OcrAiSettingsResponse,
} from '@tingting/shared';

const KEY_PROVIDER = 'ocr_ai.provider';
const KEY_API_KEY = 'ocr_ai.openrouter_api_key';
const KEY_MODEL = 'ocr_ai.model';

export interface OcrAiSettings {
  provider: OcrAiProvider;
  /** Effective API key: the stored value, else the env key. */
  apiKey: string;
  /**
   * The key exactly as stored in the DB ('' when nothing is stored). Kept
   * separate from `apiKey` so a save that does not carry a key never promotes
   * the env key into the database — otherwise a later env rotation would be
   * silently ignored because the DB row would already hold the old key.
   */
  storedApiKey: string;
  /** Model slug used for OCR calls. */
  model: string;
}

let cached: OcrAiSettings | null = null;

/** Load the settings from the DB, falling back to env + the default model. */
async function loadSettings(): Promise<OcrAiSettings> {
  const rows = await db
    .select()
    .from(s.appSettings)
    .where(inArray(s.appSettings.key, [KEY_PROVIDER, KEY_API_KEY, KEY_MODEL]));

  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const dbProvider = byKey.get(KEY_PROVIDER);
  const provider: OcrAiProvider =
    dbProvider && (OCR_AI_PROVIDERS as readonly string[]).includes(dbProvider)
      ? (dbProvider as OcrAiProvider)
      : 'openrouter';

  // Absent row → env. A present row wins even when it is empty (an admin
  // explicitly cleared the key), except that an empty DB key falls back to
  // the env key so clearing never leaves OCR dead on a deployment that ships
  // OPENROUTER_API_KEY in the environment.
  const rawKey = byKey.get(KEY_API_KEY);
  const storedKey = rawKey === undefined ? '' : decryptSecret(rawKey);
  const apiKey = storedKey || config.openrouterApiKey;

  const dbModel = byKey.get(KEY_MODEL);
  const model = dbModel && dbModel.trim() !== '' ? dbModel.trim() : OCR_AI_DEFAULT_MODEL;

  return { provider, apiKey, storedApiKey: storedKey, model };
}

/** Get the current OCR AI settings (cached after the first load). */
export async function getOcrAiSettings(): Promise<OcrAiSettings> {
  if (!cached) cached = await loadSettings();
  return cached;
}

/** Drop the in-memory cache — called by the admin PUT after a save. */
export function invalidateOcrAiSettings(): void {
  cached = null;
}

/** Admin-facing snapshot: the key is masked, never returned in plaintext. */
export async function getOcrAiSettingsResponse(): Promise<OcrAiSettingsResponse> {
  const settings = await getOcrAiSettings();
  return {
    provider: settings.provider,
    apiKeySet: !!settings.apiKey,
    apiKeyMasked: maskKey(settings.apiKey),
    model: settings.model,
    models: [...OCR_AI_MODELS],
    defaultModel: OCR_AI_DEFAULT_MODEL,
  };
}

/**
 * Persist the settings (three upserts) and drop the cache.
 *
 * `apiKey` precedence mirrors the chatbot LLM settings:
 *   1. `clearApiKey` → wipe the stored key (the env key takes over again);
 *   2. a non-empty `apiKey` in the request → replace the stored key;
 *   3. otherwise → keep the stored key.
 */
export async function saveOcrAiSettings(next: {
  provider: OcrAiProvider;
  apiKey?: string;
  clearApiKey?: boolean;
  model: string;
}): Promise<OcrAiSettingsResponse> {
  const current = await getOcrAiSettings();

  const finalKey = next.clearApiKey
    ? ''
    : next.apiKey && next.apiKey.trim() !== ''
      ? next.apiKey.trim()
      : current.storedApiKey;

  const rows = [
    { key: KEY_PROVIDER, value: next.provider },
    { key: KEY_MODEL, value: next.model.trim() },
    { key: KEY_API_KEY, value: encryptSecret(finalKey) },
  ];

  await db
    .insert(s.appSettings)
    .values(rows)
    .onConflictDoUpdate({
      target: s.appSettings.key,
      set: { value: sql`excluded.setting_value`, updatedAt: new Date() },
    });

  invalidateOcrAiSettings();
  return getOcrAiSettingsResponse();
}
