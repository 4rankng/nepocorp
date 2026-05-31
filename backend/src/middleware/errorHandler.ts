import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors';
import { config } from '../config';

export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Zod validation errors → 400
  if (err.name === 'ZodError') {
    res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: (err as any).errors });
    return;
  }

  // Canonical API errors
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.details) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  // PostgreSQL unique constraint violation
  if ('code' in err && (err as any).code === '23505') {
    res.status(409).json({ error: 'Dữ liệu đã tồn tại' });
    return;
  }

  // Generic server error
  const isDev = config.nodeEnv === 'development';
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack || err.message);
  res.status(500).json({
    error: 'Lỗi máy chủ',
    ...(isDev && { details: err.message, stack: err.stack }),
  });
}
