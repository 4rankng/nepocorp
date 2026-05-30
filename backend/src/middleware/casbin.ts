import type { Request, Response, NextFunction } from 'express';
import { getEnforcer } from '../casbin/enforcer';

const ACTION_MAP: Record<string, string> = {
  GET: 'read',
  POST: 'write',
  PUT: 'write',
  PATCH: 'write',
  DELETE: 'delete',
};

/**
 * Casbin authorization middleware factory.
 * Pass the resource name explicitly at the route mount point.
 *
 * Usage: app.use('/api/trips', authMiddleware, casbinAuthz('trips'), tripRoutes);
 */
export function casbinAuthz(resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const sub = req.user.role;
    const act = ACTION_MAP[req.method] || 'read';

    try {
      const enforcer = getEnforcer();
      const allowed = await enforcer.enforce(sub, resource, act);
      if (allowed) {
        next();
      } else {
        res.status(403).json({ error: 'Không có quyền truy cập' });
      }
    } catch (err) {
      console.error('[casbin] Authorization check failed:', err);
      res.status(500).json({ error: 'Lỗi kiểm tra quyền' });
    }
  };
}
