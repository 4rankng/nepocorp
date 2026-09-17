import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request } from 'express';
import { parsePagination } from '../routes/utils/pagination';

const request = (query: Request['query']) => ({ query }) as Request;

test('pagination preserves defaults, custom limits, and normal page offsets', () => {
  assert.deepEqual(parsePagination(request({})), { page: 1, limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(request({ page: '3', limit: '20' })), { page: 3, limit: 20, offset: 40 });
  assert.deepEqual(parsePagination(request({}), { limit: 200, maxLimit: 1000 }), { page: 1, limit: 200, offset: 0 });
  assert.deepEqual(parsePagination(request({ limit: '10001' }), { maxLimit: 10_000 }), { page: 1, limit: 10_000, offset: 0 });
});

test('pagination never passes negative limits or offsets to the database', () => {
  assert.deepEqual(parsePagination(request({ page: '-2', limit: '-5' })), { page: 1, limit: 1, offset: 0 });
  assert.deepEqual(parsePagination(request({ page: '2', limit: '-5' })), { page: 2, limit: 1, offset: 1 });
  assert.deepEqual(parsePagination(request({ page: '0', limit: '0' })), { page: 1, limit: 50, offset: 0 });
});

test('expense pagination preserves the pageSize query parameter and its defaults', () => {
  const options = { limit: 20, limitParam: 'pageSize' as const };
  assert.deepEqual(parsePagination(request({}), options), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(parsePagination(request({ page: '3', pageSize: '10' }), options), { page: 3, limit: 10, offset: 20 });
  assert.deepEqual(parsePagination(request({ pageSize: '-5' }), options), { page: 1, limit: 1, offset: 0 });
  assert.deepEqual(parsePagination(request({ pageSize: '1000' }), options), { page: 1, limit: 100, offset: 0 });
});

test('pagination falls back for malformed, repeated, or overflowing query values', () => {
  for (const value of ['invalid', '', '9'.repeat(400), ['2', '3'], { nested: '2' }]) {
    assert.deepEqual(parsePagination(request({ page: value, limit: value })), { page: 1, limit: 50, offset: 0 });
  }
});

test('large pagination inputs cannot produce an unsafe offset', () => {
  const result = parsePagination(request({ page: String(Number.MAX_SAFE_INTEGER), limit: '100' }));
  assert.ok(Number.isSafeInteger(result.page));
  assert.ok(Number.isSafeInteger(result.offset));
  assert.ok(result.offset >= 0);
});
