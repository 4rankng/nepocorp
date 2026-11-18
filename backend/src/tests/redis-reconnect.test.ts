// NEPO-53 regression: a single Redis outage must not leave the ioredis
// client in terminal 'end' status. The client must keep reconnecting on its
// own — without being recreated — so auth recovers once Redis returns,
// while isTokenBlacklisted stays fail-closed while Redis is down.
//
// Uses a real Redis (the same image the dev stack runs) started on a port
// that is deliberately dead at first use, then brought up mid-test.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { execFileSync, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const hasDocker =
  spawnSync('docker', ['info', '--format', 'ok'], { encoding: 'utf8' }).status === 0;
const skipReason = hasDocker ? false : 'docker unavailable';

// Executor form, not Promise.withResolvers(): the backend tsconfig lib predates ES2024.
function reserveFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// Point config at a port with no Redis before importing lib/redis, so the
// singleton is built against a dead endpoint (first use fails).
// Static import cannot work here: config reads REDIS_URL at module load, so
// the env override must be applied before lib/redis (and transitively config)
// is imported — static imports would hoist above the assignment.
const port = await reserveFreePort();
process.env.REDIS_URL = `redis://127.0.0.1:${port}`;
const { getRedis, disconnectRedis, isTokenBlacklisted, blacklistToken } = await import(
  '../lib/redis'
);

let containerId: string | null = null;

after(async () => {
  try {
    await Promise.race([disconnectRedis(), delay(2000)]);
  } catch {
    // Client may be mid-reconnect if the test failed early — don't hang the suite.
  }
  if (containerId) {
    spawnSync('docker', ['stop', '-t', '1', containerId], { encoding: 'utf8' });
  }
});

test('redis client recovers after outage without being recreated', { skip: skipReason }, async () => {
  const client = getRedis();

  // Phase 1 — Redis dead at first use: command must fail fast (fail-closed
  // path, not a hang), and the blacklist check must keep its reject-on-down
  // semantics.
  await assert.rejects(client.ping());
  assert.equal(await isTokenBlacklisted('nepo53-down-phase'), true);

  // Phase 2 — Redis comes back: the SAME client object must reconnect on its
  // own within ~10s (retryStrategy backoff caps at 5s).
  const out = execFileSync(
    'docker',
    ['run', '--rm', '-d', '-p', `127.0.0.1:${port}:6379`, 'redis:7-alpine'],
    { encoding: 'utf8' },
  );
  containerId = out.trim();

  const deadline = Date.now() + 10_000;
  let recovered = false;
  while (Date.now() < deadline) {
    try {
      await client.ping();
      recovered = true;
      break;
    } catch {
      await delay(200);
    }
  }
  assert.equal(recovered, true, 'client did not reconnect within 10s of Redis returning');
  assert.equal(client.status !== 'end', true, 'client fell into terminal end status');
  assert.equal(getRedis(), client, 'client object must not be recreated');

  // Phase 3 — end-to-end: auth-path blacklist roundtrip works against the
  // recovered client.
  await blacklistToken('nepo53-recovered', 60);
  assert.equal(await isTokenBlacklisted('nepo53-recovered'), true);
  assert.equal(await isTokenBlacklisted('nepo53-never-set'), false);
});
