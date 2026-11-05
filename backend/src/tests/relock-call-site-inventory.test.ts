/**
 * NEPO-43 r3 wiring census — the unlock→re-lock cycle may only be orchestrated
 * by LedgerService.relockTripIfChanged. This test scans the backend source for
 * raw postTripUnlock / postTripLock CALL sites and asserts the exact allowlist:
 *
 *   services/ledger.service.ts        1 unlock + 1 lock   (inside relockTripIfChanged)
 *   services/trip-mutations.service.ts 0 + 0               (routed through the choke point)
 *   services/trip-status-machine.service.ts 1 unlock + 1 lock:
 *       - the unlock is the unlock-ONLY reversal (reverseCompletedPostings on
 *         re-dispatch / cancel — deliberately NOT guarded, NEPO-43 r3 §4);
 *       - the lock is the initial IN_TRANSIT→COMPLETED posting (no unlock
 *         precedes it in the same transaction).
 *
 * Any new raw pair anywhere else — or a regression that re-pairs the status
 * machine / bypasses the choke point in trip-mutations — changes these counts
 * and fails this test, forcing the author to route through relockTripIfChanged.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir: string, base: string = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'tests' || entry.startsWith('.') || entry === 'node_modules') continue;
    const rel = base ? `${base}/${entry}` : entry;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) out.push(rel);
  }
  return out;
}

const UNLOCK_CALL = /(?:this|LedgerService)\.postTripUnlock\(/g;
const LOCK_CALL = /(?:this|LedgerService)\.postTripLock\(/g;

/** relPath → expected [unlockCalls, lockCalls]; every raw call must be listed. */
const ALLOWED_CALL_SITES: Record<string, [number, number]> = {
  'services/ledger.service.ts': [1, 1],
  'services/trip-mutations.service.ts': [0, 0],
  'services/trip-status-machine.service.ts': [1, 1],
};

describe('unlock→re-lock call-site census (NEPO-43 r3)', () => {
  it('routes the only same-transaction unlock→re-lock pair through relockTripIfChanged', () => {
    const source = readFileSync(join(srcDir, 'services/trip-mutations.service.ts'), 'utf8');
    assert.ok(
      source.includes('LedgerService.relockTripIfChanged('),
      'updateTripFigures must run its unlock→re-lock cycle via the LedgerService choke point',
    );
  });

  it('keeps every raw postTripUnlock/postTripLock call on the allowlist', () => {
    const files = walk(srcDir);
    const offenders: string[] = [];

    for (const rel of files) {
      const source = readFileSync(join(srcDir, rel), 'utf8');
      const unlocks = (source.match(UNLOCK_CALL) ?? []).length;
      const locks = (source.match(LOCK_CALL) ?? []).length;
      if (unlocks === 0 && locks === 0) continue;

      const allowed = ALLOWED_CALL_SITES[rel];
      if (!allowed) {
        offenders.push(`${rel}: raw unlock/lock calls are banned (${unlocks} unlock, ${locks} lock) — route the cycle through LedgerService.relockTripIfChanged`);
        continue;
      }
      if (allowed[0] !== unlocks || allowed[1] !== locks) {
        offenders.push(
          `${rel}: expected ${allowed[0]} unlock / ${allowed[1]} lock calls, found ${unlocks} / ${locks}` +
          (rel === 'services/trip-mutations.service.ts'
            ? ' — any paired cycle must go through LedgerService.relockTripIfChanged'
            : ' — update the allowlist in relock-call-site-inventory.test.ts only if the new call is not an unlock→re-lock pair'),
        );
      }
    }

    assert.deepEqual(offenders, [], 'raw unlock/lock call sites drifted from the NEPO-43 r3 inventory');
  });

  it('documents the full inventory in one place (report cross-check)', () => {
    const expected = Object.keys(ALLOWED_CALL_SITES).sort();
    assert.deepEqual(expected, [
      'services/ledger.service.ts',
      'services/trip-mutations.service.ts',
      'services/trip-status-machine.service.ts',
    ]);
  });
});
