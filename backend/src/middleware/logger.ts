import type { Request, Response, NextFunction } from 'express';

const SKIP_PATHS = ['/api/health', '/uploads', '/favicon.ico'];

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`${req.method} ${req.path} ${status} ${duration}ms`);
  });

  next();
}
