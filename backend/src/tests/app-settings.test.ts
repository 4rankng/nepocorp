import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';
import type { AppSettings } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { getAppSettings, onAppSettingsChanged, saveAppSettings } from '../services/app-settings.service';

after(async () => client.end());

test('bot settings persist and notify only when the independent assistant switch changes', async (t) => {
  const key = 'app.bot_enabled';
  const [originalRow] = await db.select().from(s.appSettings).where(eq(s.appSettings.key, key));
  const originalSettings = await getAppSettings();
  const changes: AppSettings[] = [];
  const unsubscribe = onAppSettingsChanged((settings) => changes.push(settings));
  t.after(async () => {
    unsubscribe();
    await saveAppSettings(originalSettings);
    if (originalRow) {
      await db.update(s.appSettings).set(originalRow).where(eq(s.appSettings.key, key));
    } else {
      await db.delete(s.appSettings).where(eq(s.appSettings.key, key));
    }
  });

  const next = { botEnabled: !originalSettings.botEnabled };
  assert.deepEqual(await saveAppSettings(next), next);
  assert.deepEqual(await getAppSettings(), next);
  const [saved] = await db.select().from(s.appSettings).where(eq(s.appSettings.key, key));
  assert.equal(saved.value, String(next.botEnabled));
  assert.deepEqual(changes, [next]);

  await saveAppSettings(next);
  assert.deepEqual(changes, [next], 'saving an unchanged setting does not stop active chats again');
});
