import { eq } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db';
import * as s from '../db/schema';
import type { AppSettings } from '@tingting/shared';

const BOT_KEY = 'app.bot_enabled';
let cached: AppSettings | null = null;
const listeners = new Set<(settings: AppSettings) => void>();

/** Subscribe to in-process runtime changes (used to stop active bot chats). */
export function onAppSettingsChanged(listener: (settings: AppSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyChanged(settings: AppSettings): void {
  for (const listener of listeners) listener(settings);
}

export async function getAppSettings(): Promise<AppSettings> {
  if (cached) return cached;
  const [row] = await db.select().from(s.appSettings).where(eq(s.appSettings.key, BOT_KEY));
  cached = {
    botEnabled: row ? row.value === 'true' : config.botEnabled,
  };
  return cached;
}

export async function saveAppSettings(next: AppSettings): Promise<AppSettings> {
  const previous = await getAppSettings();
  await db.insert(s.appSettings)
    .values({ key: BOT_KEY, value: next.botEnabled ? 'true' : 'false' })
    .onConflictDoUpdate({ target: s.appSettings.key, set: { value: next.botEnabled ? 'true' : 'false', updatedAt: new Date() } });
  cached = next;
  if (previous.botEnabled !== next.botEnabled) notifyChanged(next);
  return next;
}
