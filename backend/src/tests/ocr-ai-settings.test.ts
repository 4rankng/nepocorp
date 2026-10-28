import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { inArray } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { config } from '../config';
import { OCR_AI_DEFAULT_MODEL } from '@tingting/shared';
import {
  getOcrAiSettings,
  getOcrAiSettingsResponse,
  invalidateOcrAiSettings,
  saveOcrAiSettings,
} from '../services/ocr/settings';

/**
 * Service-layer tests for the AI OCR settings (NEPO-28). Follows the
 * `ocr-usage.test.ts` idiom: node:test + the real (test) DB, namespaced
 * cleanup, no HTTP harness.
 *
 * Pinned behaviour:
 *   - with nothing stored, the env key + the default model apply (an existing
 *     deployment keeps working before an admin ever saves);
 *   - the admin's provider/key/model are what the runtime sees afterwards;
 *   - the API key is encrypted AT REST and never handed back in plaintext —
 *     the response only carries a masked preview + an `apiKeySet` boolean;
 *   - clearing the key wipes the stored value and falls back to the env key.
 */
const SETTINGS_KEYS = ['ocr_ai.provider', 'ocr_ai.openrouter_api_key', 'ocr_ai.model'];

async function cleanup(): Promise<void> {
  await db.delete(s.appSettings).where(inArray(s.appSettings.key, SETTINGS_KEYS));
  invalidateOcrAiSettings();
}

before(async () => {
  await cleanup();
});

after(async () => {
  await cleanup();
  await client.end();
});

test('without stored settings the env key and the default model apply', async () => {
  const settings = await getOcrAiSettings();
  assert.strictEqual(settings.provider, 'openrouter');
  assert.strictEqual(settings.apiKey, config.openrouterApiKey);
  assert.strictEqual(settings.model, OCR_AI_DEFAULT_MODEL);
});

test('the admin provider / key / model become the runtime settings', async () => {
  await saveOcrAiSettings({
    provider: 'openrouter',
    apiKey: 'sk-or-test-key',
    model: 'google/gemini-3.5-flash',
  });

  const settings = await getOcrAiSettings();
  assert.strictEqual(settings.provider, 'openrouter');
  assert.strictEqual(settings.apiKey, 'sk-or-test-key');
  assert.strictEqual(settings.model, 'google/gemini-3.5-flash');
});

test('the API key is encrypted at rest and masked in the response', async () => {
  const rows = await db
    .select()
    .from(s.appSettings)
    .where(inArray(s.appSettings.key, SETTINGS_KEYS));
  assert.strictEqual(rows.length, 3, 'all three settings rows must be persisted');

  const stored = rows.find((r) => r.key === 'ocr_ai.openrouter_api_key');
  assert.ok(stored, 'the API key row must exist');
  assert.ok(
    String(stored.value).startsWith('enc:v1:'),
    'the API key must be encrypted at rest',
  );
  assert.ok(
    !String(stored.value).includes('sk-or-test-key'),
    'the plaintext key must not appear in the stored row',
  );

  const response = await getOcrAiSettingsResponse();
  assert.strictEqual(response.apiKeySet, true);
  assert.ok(response.apiKeyMasked.length > 0);
  assert.ok(
    !response.apiKeyMasked.includes('sk-or-test-key'),
    'the response must not leak the plaintext key',
  );
  assert.strictEqual(response.model, 'google/gemini-3.5-flash');
});

test('an empty key field keeps the stored key (no accidental wipe)', async () => {
  await saveOcrAiSettings({ provider: 'openrouter', apiKey: '  ', model: 'openai/gpt-4o-mini' });
  const settings = await getOcrAiSettings();
  assert.strictEqual(settings.apiKey, 'sk-or-test-key');
  assert.strictEqual(settings.model, 'openai/gpt-4o-mini');
});

test('clearing the key wipes the stored value and falls back to the env key', async () => {
  await saveOcrAiSettings({ provider: 'openrouter', clearApiKey: true, model: 'openai/gpt-4o-mini' });

  const rows = await db
    .select()
    .from(s.appSettings)
    .where(inArray(s.appSettings.key, ['ocr_ai.openrouter_api_key']));
  assert.ok(rows.length === 1);
  assert.strictEqual(rows[0].value, '', 'the stored key must be wiped');

  const settings = await getOcrAiSettings();
  assert.strictEqual(settings.apiKey, config.openrouterApiKey);
});
