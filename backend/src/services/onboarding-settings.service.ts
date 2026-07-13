/**
 * Onboarding master-switch settings (DB-backed admin toggle).
 *
 * Stores a single boolean in `app_settings` under key
 * `onboarding.tutorial_enabled`. When false, the whole onboarding subsystem
 * (checklist panel + tour chrome + tour launch) is hidden app-wide — the admin
 * "turns off the onboarding tutorial".
 *
 * Read path is cached (mirrors services/llm/settings.ts): the first call loads
 * the DB row; `getOnboardingEnabled()` returns the cached value.
 * `invalidateOnboardingSettings()` is called after a settings write so the next
 * /auth/me (and any in-process reader) sees the new value immediately — no
 * restart.
 *
 * Default: enabled (true) when the row is absent, so existing deployments keep
 * onboarding on until an admin explicitly turns it off.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq } from 'drizzle-orm';

const KEY = 'onboarding.tutorial_enabled';

let cached: boolean | null = null;
let loadPromise: Promise<boolean> | null = null;

async function load(): Promise<boolean> {
  const rows = await db
    .select()
    .from(s.appSettings)
    .where(eq(s.appSettings.key, KEY));
  const raw = rows[0]?.value;
  // Only the literal "false" disables; anything else (absent, "true", garbage)
  // defaults to enabled so a missing row never silently hides onboarding.
  return raw !== 'false';
}

/** True when the onboarding tutorial is enabled (cached after first load). */
export async function getOnboardingEnabled(): Promise<boolean> {
  if (cached !== null) return cached;
  if (!loadPromise) loadPromise = load().then((v) => (cached = v));
  return loadPromise;
}

/** Drop the cache so the next read re-loads from the DB. Call after a write. */
export function invalidateOnboardingSettings(): void {
  cached = null;
  loadPromise = null;
}

/** Set the onboarding toggle. Persists + invalidates the cache. */
export async function setOnboardingEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(s.appSettings)
    .values({ key: KEY, value: enabled ? 'true' : 'false' })
    .onConflictDoUpdate({
      target: s.appSettings.key,
      set: { value: enabled ? 'true' : 'false', updatedAt: new Date() },
    });
  invalidateOnboardingSettings();
}
