import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import { db, client } from '../db';
import * as s from '../db/schema';
import { Role } from '@tingting/shared';
import {
  countOcrRequests,
  countOcrRequestsByStatus,
  getOcrRequestStats,
  listOcrRequestModels,
  listOcrRequests,
  recordOcrRequestLog,
} from '../services/ocr-requests.service';

/**
 * Service-layer tests for the AI OCR request log (NEPO-33). Follows the
 * `ocr-persist.test.ts` idiom: node:test + the real (test) DB, a namespaced
 * caller, cleanup, no HTTP harness.
 *
 * Pinned behaviour:
 *   - a logged request stores the request time, the response time, the
 *     duration, the model, the status, the answer and the caller;
 *   - `created_at` is the REQUEST time (passed in explicitly), not the insert
 *     time, so the gap to `updated_at` is the user-perceived latency;
 *   - a failed request stores the reason in `error_msg` and still carries the
 *     result JSON in `response`;
 *   - a log write that fails is swallowed — the caller's promise resolves and
 *     nothing is written;
 *   - the listing is newest-first (id DESC) and paginates.
 */
const NS = 'ocrrequests';

/** A user id that cannot exist — used to prove the write never throws. */
const UNKNOWN_CALLER_ID = 2_147_483_647;

let callerId: number;

/** A real caller row, so the `user_id` FK holds for the writes under test. */
async function ensureUser(): Promise<number> {
  const existing = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(eq(s.users.username, `${NS}_caller`))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [u] = await db
    .insert(s.users)
    .values({
      username: `${NS}_caller`,
      fullName: `QA ${NS}`,
      email: `${NS}@ocrrequests.test`,
      phone: null,
      passwordHash: 'x',
      role: Role.ADMIN,
      status: 'ACTIVE',
    })
    .returning({ id: s.users.id });
  return u.id;
}

/** Rows this test owns, so the cleanup never touches real traffic. */
async function cleanup(): Promise<void> {
  await db.delete(s.ocrRequests).where(eq(s.ocrRequests.userId, callerId));
  await db.delete(s.ocrRequests).where(eq(s.ocrRequests.userId, UNKNOWN_CALLER_ID));
}

before(async () => {
  callerId = await ensureUser();
  await cleanup();
});

after(async () => {
  await cleanup();
  await client.end();
});

test('recordOcrRequestLog stores the request time, the response time, the duration and the answer', async () => {
  const requestStartedAt = new Date('2026-10-01T08:00:00.000Z');
  const respondedAt = new Date('2026-10-01T08:00:03.250Z');

  await recordOcrRequestLog({
    createdAt: requestStartedAt,
    updatedAt: respondedAt,
    durationMs: 3250,
    model: 'anthropic/claude-haiku-5.5',
    status: 'completed',
    response: JSON.stringify({ ok: true, containerNumbers: ['MSKU1234567'], sealNumber: null }),
    errorMsg: null,
    userId: callerId,
  });

  const [row] = await db
    .select()
    .from(s.ocrRequests)
    .where(eq(s.ocrRequests.userId, callerId));

  assert.ok(row, 'the request log row must exist');
  assert.equal(row.durationMs, 3250);
  assert.equal(row.model, 'anthropic/claude-haiku-5.5');
  assert.equal(row.status, 'completed');
  assert.equal(row.errorMsg, null);
  // The stored answer is the OCR result JSON, verbatim.
  assert.deepEqual(JSON.parse(row.response ?? '{}'), {
    ok: true,
    containerNumbers: ['MSKU1234567'],
    sealNumber: null,
  });
  // `created_at` is the REQUEST time, not the insert time — the row must not
  // claim the request started when it was written.
  assert.equal(row.createdAt.toISOString(), requestStartedAt.toISOString());
  assert.equal(row.updatedAt.toISOString(), respondedAt.toISOString());
});

test('a failed request keeps the reason in error_msg and still carries the result JSON', async () => {
  await recordOcrRequestLog({
    createdAt: new Date('2026-10-02T08:00:00.000Z'),
    updatedAt: new Date('2026-10-02T08:00:01.000Z'),
    durationMs: 1000,
    model: 'anthropic/claude-haiku-5.5',
    status: 'failed',
    response: JSON.stringify({ ok: false, containerNumbers: [], error: 'HTTP 429' }),
    errorMsg: 'HTTP 429',
    userId: callerId,
  });

  const rows = await db
    .select()
    .from(s.ocrRequests)
    .where(eq(s.ocrRequests.userId, callerId));
  const failed = rows.find((r) => r.status === 'failed');

  assert.ok(failed, 'a failed request must be logged');
  assert.equal(failed.errorMsg, 'HTTP 429');
  assert.equal(failed.model, 'anthropic/claude-haiku-5.5');
  assert.equal(JSON.parse(failed.response ?? '{}').ok, false);
});

test('a log write that fails never throws and writes nothing', async () => {
  // A user id that violates the users FK makes the INSERT fail. The service
  // must swallow it: a driver standing in front of the phone cannot be blocked
  // by the logging.
  await assert.doesNotReject(() =>
    recordOcrRequestLog({
      createdAt: new Date(),
      updatedAt: new Date(),
      durationMs: 10,
      model: null,
      status: 'completed',
      response: null,
      errorMsg: null,
      userId: UNKNOWN_CALLER_ID,
    }),
  );

  const rows = await db
    .select()
    .from(s.ocrRequests)
    .where(eq(s.ocrRequests.userId, UNKNOWN_CALLER_ID));
  assert.equal(rows.length, 0, 'a failed write must leave no row behind');
});

test('the listing is newest-first and paginates', async () => {
  const totalBefore = await countOcrRequests();

  await recordOcrRequestLog({
    createdAt: new Date('2026-10-03T08:00:00.000Z'),
    updatedAt: new Date('2026-10-03T08:00:01.000Z'),
    durationMs: 1000,
    model: 'first',
    status: 'completed',
    response: null,
    errorMsg: null,
    userId: callerId,
  });
  await recordOcrRequestLog({
    createdAt: new Date('2026-10-04T08:00:00.000Z'),
    updatedAt: new Date('2026-10-04T08:00:01.000Z'),
    durationMs: 2000,
    model: 'second',
    status: 'completed',
    response: null,
    errorMsg: null,
    userId: callerId,
  });

  const page = await listOcrRequests(200, 0);
  const ids = page.map((r) => r.id);
  assert.deepEqual(
    [...ids].sort((a, b) => b - a),
    ids,
    'the rows are ordered by id DESC',
  );

  // The two rows written above, in insertion order (newest first).
  const mine = page.filter((r) => r.model === 'first' || r.model === 'second');
  assert.equal(mine.length, 2);
  assert.equal(mine[0].model, 'second', 'the newer row comes first');
  assert.equal(mine[1].model, 'first');

  // Paging skips the rows before it: the second page starts after the first.
  const secondPage = await listOcrRequests(1, 1);
  assert.equal(secondPage.length, 1);
  assert.equal(secondPage[0].id, ids[1], 'offset skips exactly one row');

  assert.equal(await countOcrRequests(), totalBefore + 2);
});

test('the stats report the count, the failures and the durations', async () => {
  await recordOcrRequestLog({
    createdAt: new Date(),
    updatedAt: new Date(),
    durationMs: 500,
    model: 'stats',
    status: 'completed',
    response: null,
    errorMsg: null,
    userId: callerId,
  });

  const stats = await getOcrRequestStats(30);
  assert.ok(stats.count >= 1);
  assert.ok(stats.failed >= 1, 'the failed request above is counted');
  assert.ok(stats.avgDurationMs !== null && stats.avgDurationMs >= 0);
  assert.ok(stats.p95DurationMs !== null && stats.p95DurationMs >= 0);
});

// ─── NEPO-34 — the screen's filters, pill counts, model options, user names ──

/** Seed three rows: model A on two days (completed + failed), model B on day 2. */
async function seedFilterRows(): Promise<void> {
  await recordOcrRequestLog({
    createdAt: new Date('2026-09-15T08:00:00.000Z'),
    updatedAt: new Date('2026-09-15T08:00:01.000Z'),
    durationMs: 1000,
    model: 'nepo34-model-a',
    status: 'completed',
    response: null,
    errorMsg: null,
    userId: callerId,
  });
  await recordOcrRequestLog({
    createdAt: new Date('2026-09-15T09:00:00.000Z'),
    updatedAt: new Date('2026-09-15T09:00:02.000Z'),
    durationMs: 2000,
    model: 'nepo34-model-a',
    status: 'failed',
    response: null,
    errorMsg: 'seeded failure',
    userId: callerId,
  });
  await recordOcrRequestLog({
    createdAt: new Date('2026-09-16T08:00:00.000Z'),
    updatedAt: new Date('2026-09-16T08:00:01.500Z'),
    durationMs: 1500,
    model: 'nepo34-model-b',
    status: 'completed',
    response: null,
    errorMsg: null,
    userId: callerId,
  });
}

test('the listing filters by status, model and local calendar day (NEPO-34)', async () => {
  await seedFilterRows();

  const failedOnly = await listOcrRequests(200, 0, { model: 'nepo34-model-a', status: 'failed' });
  assert.equal(failedOnly.length, 1, 'the status filter keeps only the failed row');
  assert.equal(failedOnly[0].error_msg, 'seeded failure');

  const modelB = await listOcrRequests(200, 0, { model: 'nepo34-model-b' });
  assert.equal(modelB.length, 1, 'the model filter keeps only model B');
  assert.equal(modelB[0].status, 'completed');

  // dateTo is inclusive of that whole day: only the two 2026-09-15 rows.
  const oneDay = await listOcrRequests(200, 0, {
    model: 'nepo34-model-a',
    dateFrom: '2026-09-15',
    dateTo: '2026-09-15',
  });
  assert.equal(oneDay.length, 2, 'the day window keeps both rows of that day');

  const twoDays = await listOcrRequests(200, 0, {
    dateFrom: '2026-09-15',
    dateTo: '2026-09-16',
  });
  assert.equal(twoDays.length, 3, 'widening dateTo by one day adds the next day');

  assert.equal(await countOcrRequests({ model: 'nepo34-model-a' }), 2);
  assert.equal(await countOcrRequests({ dateFrom: '2026-09-16', dateTo: '2026-09-16' }), 1);
});

test('the pill counts follow model+date scope but ignore the status filter (NEPO-34)', async () => {
  const counts = await countOcrRequestsByStatus({ model: 'nepo34-model-a' });
  assert.deepEqual(counts, { all: 2, completed: 1, failed: 1 });

  // Passing a status must not narrow the pills — each pill shows its own count.
  const withStatus = await countOcrRequestsByStatus({
    model: 'nepo34-model-a',
    status: 'failed',
  });
  assert.deepEqual(withStatus, { all: 2, completed: 1, failed: 1 });
});

test('the model options are the distinct slugs in the log (NEPO-34)', async () => {
  const models = await listOcrRequestModels();
  assert.ok(models.includes('nepo34-model-a'), 'seeded model A is offered');
  assert.ok(models.includes('nepo34-model-b'), 'seeded model B is offered');
  assert.equal(new Set(models).size, models.length, 'the options are distinct');
});

test('the listing resolves the caller display name instead of a raw id (NEPO-34)', async () => {
  const rows = await listOcrRequests(200, 0, { model: 'nepo34-model-a' });
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.user_name, `QA ${NS}`, 'the row carries the caller full name');
    assert.equal(row.user_id, callerId);
  }
});
