import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import multer from 'multer';
import type { AddressInfo } from 'node:net';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../errors';
import { globalErrorHandler } from '../middleware/errorHandler';

function handle(error: Error) {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as Response;
  globalErrorHandler(error, { method: 'POST', path: '/test' } as Request, response, () => {});
  return { statusCode, body };
}

test('duplicate records return a conflict for both postgres and Drizzle errors', () => {
  const postgresError = Object.assign(new Error('duplicate key'), { code: '23505' });
  const drizzleError = new Error('Failed query: insert into users', { cause: postgresError });
  for (const error of [postgresError, drizzleError]) {
    assert.deepEqual(handle(error), { statusCode: 409, body: { error: 'Dữ liệu đã tồn tại' } });
  }
});

test('explicit API errors retain their status, message, and details', () => {
  assert.deepEqual(handle(new ApiError(409, 'Không thể thực hiện', 'Vui lòng tải lại')), {
    statusCode: 409,
    body: { error: 'Không thể thực hiện', details: 'Vui lòng tải lại' },
  });
});

test('validation errors retain the field path and details for form feedback', () => {
  const parsed = z.object({ name: z.string().min(1, 'Vui lòng nhập tên') }).safeParse({ name: '' });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.deepEqual(handle(parsed.error), {
    statusCode: 400,
    body: { error: 'Vui lòng nhập tên (name)', details: parsed.error.errors },
  });
});

test('unrelated wrapped database errors remain server errors', (t) => {
  t.mock.method(console, 'error', () => {});
  const error = new Error('Failed query', { cause: Object.assign(new Error('database unavailable'), { code: '08006' }) });
  const response = handle(error);
  assert.equal(response.statusCode, 500);
  assert.equal((response.body as { error: string }).error, 'Lỗi máy chủ');
});

test('oversized multipart files return useful feedback before the upload handler runs', async (t) => {
  let accepted = false;
  const app = express();
  app.post('/upload', multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 } }).single('file'), (_req, res) => {
    accepted = true;
    res.json({ ok: true });
  });
  app.use(globalErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const body = new FormData();
  body.append('file', new Blob(['too-large-photo']), 'photo.jpg');
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/upload`, { method: 'POST', body });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn.' });
  assert.equal(accepted, false);
});

test('unexpected multipart fields return validation feedback instead of a server error', () => {
  assert.deepEqual(handle(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo')), {
    statusCode: 400,
    body: { error: 'Tệp tải lên không hợp lệ. Vui lòng kiểm tra và thử lại.' },
  });
});
