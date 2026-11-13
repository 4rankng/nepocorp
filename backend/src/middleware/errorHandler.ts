import type { Request, Response, NextFunction } from 'express';
import type { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../errors';
import { config } from '../config';

/** First Zod issue + field path → user-readable message ("msg (a.b)"). */
function zodTopMessage(zodErr: ZodError): string {
  const first = zodErr.issues[0];
  if (!first?.message) return 'Dữ liệu không hợp lệ';
  const pathLabel = first.path.length > 0 ? ` (${first.path.join('.')})` : '';
  return `${first.message}${pathLabel}`;
}

export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Multipart limits fail before the route handler can validate the upload.
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge
        ? 'Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn.'
        : 'Tệp tải lên không hợp lệ. Vui lòng kiểm tra và thử lại.',
    });
    return;
  }

  // Zod validation errors → 400
  if (err.name === 'ZodError') {
    // Name check (not instanceof) is the discriminator — survives duplicate zod copies.
    const zodErr = err as ZodError;
    // Surface a user-readable top-level message including field path so the UI doesn't
    // have to inspect `details`. Fall back to the generic message if no issues.
    res.status(400).json({ error: zodTopMessage(zodErr), details: zodErr.issues });
    return;
  }

  // Canonical API errors
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.details) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  // Custom errors with numeric status property (e.g., NoForwarderProfileError)
  if ('status' in err && typeof (err as { status?: unknown }).status === 'number' && (err as { status: number }).status >= 400 && (err as { status: number }).status < 600) {
    res.status((err as { status: number }).status).json({ error: err.message });
    return;
  }

  // Drizzle wraps postgres.js errors in `cause`; handle both forms so all
  // write endpoints return the same actionable conflict response.
  const cause = err.cause;
  const pgCode = ('code' in err ? err.code : undefined)
    ?? (cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined);
  if (pgCode === '23505') {
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
