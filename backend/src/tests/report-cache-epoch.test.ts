import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { cacheGet, cacheInvalidate, cacheInvalidatePattern, getRedis, disconnectRedis } from '../lib/redis';
import { client } from '../db';

after(async () => {
  await disconnectRedis();
  await client.end();
});

/**
 * The reported "TỔNG CÔNG NỢ PHẢI TRẢ flips between reloads" (kanban 091026010100)
 * is a report-cache publish race: a PATTERN invalidation (every ledger write
 * calls one) deletes the Redis keys it can enumerate, but a fetch already in
 * flight for a key that is not in Redis yet carries no version to compare — so
 * it re-published the pre-write snapshot and the aggregate flapped until the TTL
 * expired. The epoch guard must stop that write.
 */
test('a pattern invalidation stops an in-flight fetch from re-publishing a stale snapshot', async () => {
  const key = `reports:test-epoch:${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const signals = new EventEmitter();

  const inflight = cacheGet(key, 300, async () => {
    // fetchFn runs only after cacheGet has captured the epoch.
    signals.emit('started');
    await once(signals, 'release');
    return { value: 'stale-snapshot' };
  });
  await once(signals, 'started');

  await cacheInvalidatePattern('reports:test-epoch:*');
  signals.emit('release');
  const returned = await inflight;
  assert.deepEqual(returned, { value: 'stale-snapshot' }, 'the caller still gets its result');

  assert.equal(await getRedis().get(key), null, 'the stale snapshot must not be published to the cache');

  // The next call recomputes and publishes normally.
  const fresh = await cacheGet(key, 300, async () => ({ value: 'fresh' }));
  assert.deepEqual(fresh, { value: 'fresh' });
  assert.equal(await getRedis().get(key), JSON.stringify({ value: 'fresh' }));

  await cacheInvalidate(key);
});

test('an exact-key invalidation also blocks the in-flight publish', async () => {
  const key = `reports:test-epoch-exact:${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const signals = new EventEmitter();

  const inflight = cacheGet(key, 300, async () => {
    signals.emit('started');
    await once(signals, 'release');
    return { value: 'stale' };
  });
  await once(signals, 'started');
  await cacheInvalidate(key);
  signals.emit('release');
  await inflight;

  assert.equal(await getRedis().get(key), null);
});
